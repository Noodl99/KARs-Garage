
/* KARs Garage — Air Ride subpage
   - SRC: Category (A) -> TA/FR; Subcategory (C) -> "Course + Restricted/Unrestricted"
     * ignores the " + " and dedupes course names (no "Course +" vs "Course").
   - Left sidebar: underlined text links; active course gets red underline (scroll‑spy).
   - Speedrider: single horizontal strip, sorted fastest (Time sec asc) to the left.
     * Each column shows: Time (top), Machine, Rider, Player, Player Link (no Node, no Time sec displayed).
*/

const SRC_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?output=csv";
const SR_CSV  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?output=csv";

/* Mode detection from Category */
const TA_LABEL = /air\s*ride\s*time\s*attack/i;
const FR_LABEL = /air\s*ride\s*free\s*run/i;

/* Ruleset detection from Subcategory */
const RESTRICTED = /restricted/i;
const UNRESTRICTED = /unrestricted/i;

/* Display columns for SRC detail tables */
const SRC_COLS = ["Player","Time","Machine","Rider","SRC Link","Video"];

/* Parse CSV with quotes */
function parseCSV(text){
  const rows = [];
  let row = [], cur = '', inQuotes = false;
  for (let i=0; i<text.length; i++){
    const ch = text[i], next = text[i+1];
    if (inQuotes){
      if (ch === '"' && next === '"'){ cur += '"'; i++; }
      else if (ch === '"'){ inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"'){ inQuotes = true; }
      else if (ch === ','){ row.push(cur); cur = ''; }
      else if (ch === '\n'){ row.push(cur); rows.push(row); row = []; cur = ''; }
      else { cur += ch; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length && r.some(v => String(v).trim().length));
}

/* Helpers */
function idxOf(header, colName){
  const i = header.findIndex(h => String(h).trim().toLowerCase() === String(colName).toLowerCase());
  return i < 0 ? null : i;
}
function makeAnchorId(name){
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function linkCell(url){
  const u = String(url||'').trim();
  if (!u) return '';
  const label = u.replace(/^https?:\/\/(www\.)?/,'').slice(0,36) + (u.length>36?'…':'');
  return `<a href="${u}" target="_blank" rel="noopener">${label}</a>`;
}

/* Extract {course, ruleset} from Subcategory "Course + Restricted/Unrestricted" */
function parseCourseAndRules(subcatRaw){
  const s = String(subcatRaw||'').trim();
  if (!s) return {course:"", ruleset:""};
  // Split on " + " first, but also support cases without plus
  const parts = s.split(/\s*\+\s*/);
  let course = parts[0].trim();
  let ruleset = (parts[1] || "").trim();

  // Normalize ruleset by regex too (handles variations)
  if (!ruleset){
    if (RESTRICTED.test(s)) ruleset = "Restricted";
    else if (UNRESTRICTED.test(s)) ruleset = "Unrestricted";
  } else {
    if (RESTRICTED.test(ruleset)) ruleset = "Restricted";
    else if (UNRESTRICTED.test(ruleset)) ruleset = "Unrestricted";
  }

  // Remove any trailing mode words from course if present
  course = course.replace(/time\s*attack|free\s*run/ig,'').trim();

  return {course, ruleset};
}

/* Render an SRC detail table (top-3 list) */
function renderSrcTable(mountId, rows){
  const mount = document.getElementById(mountId);
  if (!mount) return;
  if (!rows || rows.length === 0){
    mount.innerHTML = '<p class="muted">No data</p>';
    return;
  }
  let html = '<table class="table"><thead><tr>';
  SRC_COLS.forEach(c => html += `<th>${c}</th>`);
  html += '</tr></thead><tbody>';

  rows.forEach(r => {
    html += '<tr>';
    SRC_COLS.forEach(col => {
      let val = r[col] ?? '';
      if (/link/i.test(col)) val = linkCell(val);
      html += `<td>${val ?? ''}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  mount.innerHTML = html;
}

/* Render Speedrider horizontal strip */
function renderSpeedriderStrip(mountId, entries){
  const mount = document.getElementById(mountId);
  if (!mount) return;
  if (!entries || entries.length === 0){
    mount.innerHTML = '<p class="muted">No data</p>';
    return;
  }
  let html = '<div class="sr-strip">';
  entries.forEach(e => {
    html += `
      <div class="sr-col">
        <div class="sr-time">${e.Time || ''}</div>
        <div class="sr-item"><span class="label">Machine</span> ${e.Machine || ''}</div>
        <div class="sr-item"><span class="label">Rider</span> ${e.Rider || ''}</div>
        <div class="sr-item"><span class="label">Player</span> ${e.Player || ''}</div>
        <div class="sr-item"><span class="label">Link</span> ${linkCell(e["Player Link"] || '')}</div>
      </div>
    `;
  });
  html += '</div>';
  mount.innerHTML = html;
}

/* Scroll‑spy: highlight current course in left nav */
function setupScrollSpy(sectionIds){
  const links = sectionIds.map(id => ({ id, el: document.querySelector(`#course-nav a[href="#${id}"]`) }))
                         .filter(x => x.el);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = links.find(l => l.id === id)?.el;
      if (!link) return;
      if (entry.isIntersecting){
        links.forEach(l => l.el.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { root: null, rootMargin: '0px 0px -60% 0px', threshold: 0.1 });

  sectionIds.forEach(id => {
    const sec = document.getElementById(id);
    if (sec) observer.observe(sec);
  });
}

/* === Main build === */
async function loadAll(){
  document.getElementById('year').textContent = new Date().getFullYear();

  // Fetch both CSVs
  const [srcRes, srRes] = await Promise.all([
    fetch(SRC_CSV, {cache:'no-cache'}),
    fetch(SR_CSV,  {cache:'no-cache'}),
  ]);
  const [srcText, srText] = await Promise.all([srcRes.text(), srRes.text()]);
  const srcRows = parseCSV(srcText);
  const srRows  = parseCSV(srText);

  /* Build SRC indices */
  const srcHeader = srcRows[0].map(h => String(h).trim());
  const SRC_IDX = {
    Category: idxOf(srcHeader,"Category"),
    Subcategory: idxOf(srcHeader,"Subcategory"),
    Machine: idxOf(srcHeader,"Machine"),
    Rider: idxOf(srcHeader,"Rider"),
    Player: idxOf(srcHeader,"Player"),
    Time: idxOf(srcHeader,"Time"),
    Link: idxOf(srcHeader,"Link"),
    Video: idxOf(srcHeader,"Video"),
  };

  /* Group SRC by course and mode/rules */
  const srcByCourse = new Map(); // course -> { TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]} }
  srcRows.slice(1).forEach(r => {
    const category = r[SRC_IDX.Category] ?? '';
    const subcat   = r[SRC_IDX.Subcategory] ?? '';
    if (!category || !subcat) return;

    // Only use TA and FR rows; ignore "Air Ride" (neither)
    const mode = TA_LABEL.test(category) ? 'TA'
               : FR_LABEL.test(category) ? 'FR' : 'OTHER';
    if (mode === 'OTHER') return;

    const {course, ruleset} = parseCourseAndRules(subcat);
    if (!course || !(ruleset === "Restricted" || ruleset === "Unrestricted")) return;

    const rowObj = {
      Player: r[SRC_IDX.Player],
      Time:   r[SRC_IDX.Time],
      Machine:r[SRC_IDX.Machine],
      Rider:  r[SRC_IDX.Rider],
      "SRC Link": r[SRC_IDX.Link],
      "Video":    r[SRC_IDX.Video]
    };

    if (!srcByCourse.has(course)){
      srcByCourse.set(course, {TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]}});
    }
    const bucket = srcByCourse.get(course);
    bucket[mode][ruleset].push(rowObj);
  });

  /* Build Speedrider indices */
  const srHeader = srRows[0].map(h => String(h).trim());
  const SR_IDX = {
    Course: idxOf(srHeader,"Course"),
    Machine: idxOf(srHeader,"Machine"),
    Rider: idxOf(srHeader,"Rider"),
    Player: idxOf(srHeader,"Player"),
    Time: idxOf(srHeader,"Time"),
    TimeSec: idxOf(srHeader,"Time (sec)"),
    PlayerLink: idxOf(srHeader,"Player Link"),
    // Node Link exists but is not used for display
  };

  /* Group Speedrider by course; sort by Time (sec) asc for strip */
  const srByCourse = new Map(); // course -> { TA:[], FR:[] } (same data for both if no mode info)
  srRows.slice(1).forEach(r => {
    const course  = r[SR_IDX.Course] ?? '';
    if (!course) return;

    const entry = {
      "Time": r[SR_IDX.Time],
      "Machine": r[SR_IDX.Machine],
      "Rider": r[SR_IDX.Rider],
      "Player": r[SR_IDX.Player],
      "Player Link": r[SR_IDX.PlayerLink],
      _sec: Number(r[SR_IDX.TimeSec] || NaN)
    };

    if (!srByCourse.has(course)) srByCourse.set(course, {TA:[], FR:[]});
    const buckets = srByCourse.get(course);
    buckets.TA.push(entry);
    buckets.FR.push(entry);
  });

  // Sort TA and FR arrays by Time (sec) ascending
  srByCourse.forEach(courseObj => {
    ["TA","FR"].forEach(mode => {
      courseObj[mode].sort((a,b) => {
        const ax = (typeof a._sec === 'number' && !isNaN(a._sec)) ? a._sec : Infinity;
        const bx = (typeof b._sec === 'number' && !isNaN(b._sec)) ? b._sec : Infinity;
        return ax - bx;
      });
    });
  });

  /* Build LEFT NAV and SECTIONS */
  const content = document.getElementById('content');
  const nav = document.getElementById('course-nav');

  // De-duplicated union of course names
  const courseNames = Array.from(new Set([
    ...srcByCourse.keys(),
    ...srByCourse.keys()
  ])).sort((a,b) => a.localeCompare(b));

  // Left nav links
  nav.innerHTML = courseNames.map(course => {
    const id = makeAnchorId(course);
    return `<a href="#${id}" id="link-${id}">${course}</a>`;
  }).join("");

  // Sections
  const sectionIds = [];
  courseNames.forEach(courseName => {
    const id = makeAnchorId(courseName);
    sectionIds.push(id);

    const srcCourse = srcByCourse.get(courseName) || {TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]}};
    const srCourse  = srByCourse.get(courseName) || {TA:[], FR:[]};

    const sec = document.createElement('section');
    sec.className = 'course';
    sec.innerHTML = `
      <span id="${id}" class="anchor"></span>
      <h2 class="course-title">${courseName}</h2>
      <p class="course-subtitle">SRC Top‑3 & Speedrider WRs</p>

      <div class="tables-grid">
        <article class="table-card">
          <h3>Time Attack — Restricted</h3>
          <div id="${id}-ta-r"></div>
        </article>
        <article class="table-card">
          <h3>Time Attack — Unrestricted</h3>
          <div id="${id}-ta-u"></div>
        </article>
        <article class="table-card">
          <h3>Free Run — Restricted</h3>
          <div id="${id}-fr-r"></div>
        </article>
        <article class="table-card">
          <h3>Free Run — Unrestricted</h3>
          <div id="${id}-fr-u"></div>
        </article>

        <article class="table-card wide">
          <h3>Speedrider — Time Attack Records by Machine</h3>
          <div id="${id}-sr-ta"></div>
        </article>
        <article class="table-card wide">
          <h3>Speedrider — Free Run Records by Machine</h3>
          <div id="${id}-sr-fr"></div>
        </article>
      </div>

      <hr class="section-divider" />
    `;
    content.appendChild(sec);

    // Fill SRC tables
    renderSrcTable(`${id}-ta-r`, srcCourse.TA.Restricted);
    renderSrcTable(`${id}-ta-u`, srcCourse.TA.Unrestricted);
    renderSrcTable(`${id}-fr-r`, srcCourse.FR.Restricted);
    renderSrcTable(`${id}-fr-u`, srcCourse.FR.Unrestricted);

    // Fill Speedrider strips
    renderSpeedriderStrip(`${id}-sr-ta`, srCourse.TA);
    renderSpeedriderStrip(`${id}-sr-fr`, srCourse.FR);
  });

  // Scroll‑spy
  setupScrollSpy(sectionIds);

  // Left nav click: smooth scroll + set active
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const hash = a.getAttribute('href');
      const target = document.querySelector(hash);
      if (target){
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* Boot */
document.getElementById('year').textContent = new Date().getFullYear();
loadAll().catch(err => {
  console.error(err);
  const content = document.getElementById('content');
  content.innerHTML = `<p class="muted">Failed to load data.</p>`;
});
