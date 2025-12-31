
/* KARs Garage — Air Ride subpage */

/* ===== CSV URLs =====
   Speedrider must use **two CSVs** (published per tab):
   - SR_TA_CSV = first tab (Time Attack)
   - SR_FR_CSV = second tab (Free Run)
   Replace SR_FR_CSV with your published second-tab CSV URL (with its gid).
*/
const SRC_CSV  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?output=csv";
const SR_TA_CSV= "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?output=csv";
/* TODO: Replace this with your published Free Run CSV (second tab) */
const SR_FR_CSV= "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?output=csv";

/* Detect TA / FR from Column A: Category */
const TA_LABEL = /air\s*ride\s*time\s*attack/i;
const FR_LABEL = /air\s*ride\s*free\s*run/i;

/* Ruleset from Column C: Subcategory */
const RESTRICTED = /restricted/i;
const UNRESTRICTED = /unrestricted/i;

/* Course banners */
const BANNERS = {
  "Airtopia Ruins": "/images/airtopia_banner.webp",
  "Mount Amberfalls": "/images/Amberfalls_banner.webp",
  "Beanstalk Park": "/images/beanstalk_banner.webp",
  "Cavernous Corners": "/images/cavernous_banner.webp",
  "Checker Knights": "/images/checker_banner.webp",
  "Crystalline Fissure": "/images/Crystalline_banner.webp",
  "Cyberion Highway": "/images/Cyberion_Banner.webp",
  "Fantasy Meadows": "/images/Fantasy_banner.webp",
  "Floria Fields": "/images/Floria_banner.webp",
  "Frozen Hillside": "/images/Frozen_banner.webp",
  "Machine Passage": "/images/Machine_Banner.webp",
  "Magma Flows": "/images/Magma_Banner.webp",
  "Nebula Belt": "/images/Nebula_Banner.webp",
  "Galactic Nova": "/images/Nova_Banner.webp",
  "Sky Sands": "/images/Sky_Banner.webp",
  "Steamgust Forge": "/images/Steamgust_Banner.webp",
  "Waveflow Waters": "/images/Waveflow_Banner.webp"
};

/* Explicit course order */
const COURSE_ORDER = [
  "Floria Fields","Waveflow Waters","Airtopia Ruins","Crystalline Fissure","Steamgust Forge",
  "Cavernous Corners","Cyberion Highway","Mount Amberfalls","Galactic Nova","Fantasy Meadows",
  "Celestial Valley","Sky Sands","Frozen Hillside","Magma Flows","Beanstalk Park",
  "Machine Passage","Checker Knights","Nebula Belt"
];

/* SRC columns */
const SRC_COLS = ["Player","Time","Machine","Rider","SRC Link","Video"];

/* ===== CSV parser (quoted cells) ===== */
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

/* ===== Helpers ===== */
function idxOf(header, colName){
  const i = header.findIndex(h => String(h).trim().toLowerCase() === String(colName).toLowerCase());
  return i < 0 ? null : i;
}
function makeAnchorId(name){
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function stripPrefix(u){
  return String(u||'').replace(/^https?:\/\/(www\.)?/i,'');
}
function linkCell(url){
  const u = String(url||'').trim();
  if (!u) return '';
  const label = stripPrefix(u);
  return `<a href="${u}" target="_blank" rel="noopener">${label}</a>`;
}
function parseCourseAndRules(subcatRaw){
  const s = String(subcatRaw||'').trim();
  if (!s) return {course:"", ruleset:""};
  const parts = s.split(/\s*\+\s*/);
  let course = (parts[0] || "").trim();
  let ruleset = (parts[1] || "").trim();

  if (!ruleset){
    if (RESTRICTED.test(s)) ruleset = "Restricted";
    else if (UNRESTRICTED.test(s)) ruleset = "Unrestricted";
  } else {
    if (RESTRICTED.test(ruleset)) ruleset = "Restricted";
    else if (UNRESTRICTED.test(ruleset)) ruleset = "Unrestricted";
  }

  course = course.replace(/time\s*attack|free\s*run/ig,'').trim();
  course = course.replace(/\s*\+\s*$/,'').trim();
  return {course, ruleset};
}

/* Time parser for sorting */
function toSecondsFlexible(raw){
  const s = String(raw||'').trim();
  if (!s) return NaN;
  let m;
  m = s.match(/^(\d+)'(\d{2})"(\d{2})$/);              if (m) return (+m[1])*60 + (+m[2]) + (+m[3])/100;
  m = s.match(/^(\d+)'(\d{2})"(\d{3})$/);              if (m) return (+m[1])*60 + (+m[2]) + (+m[3])/1000;
  m = s.match(/^(\d+):(\d{2})\.(\d{3})$/);             if (m) return (+m[1])*60 + (+m[2]) + (+m[3])/1000;
  m = s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/);     if (m) return (+m[1])*3600 + (+m[2])*60 + (+m[3]) + (+m[4])/1000;
  m = s.match(/^(\d+):(\d{2}):(\d{2})$/);              if (m) return (+m[1])*3600 + (+m[2])*60 + (+m[3]);
  m = s.match(/^(\d+):(\d{2})$/);                      if (m) return (+m[1])*60 + (+m[2]);
  m = s.match(/^(\d+(?:\.\d+)?)$/);                    if (m) return +m[1];
  return NaN;
}

/* ===== Render SRC tables (sortable) ===== */
function renderSrcTableSortable(mountId, rows){
  const mount = document.getElementById(mountId);
  if (!mount) return;
  if (!rows || rows.length === 0){
    mount.innerHTML = '<p class="muted">No data</p>';
    return;
  }

  // Default sort: Time ascending (fastest first)
  rows = rows.slice().sort((a,b)=>{
    const ax = toSecondsFlexible(a.Time), bx = toSecondsFlexible(b.Time);
    return (isNaN(ax)?Infinity:ax) - (isNaN(bx)?Infinity:bx);
  });

  // Build table header
  let html = '<table class="table"><thead><tr>';
  SRC_COLS.forEach(c => {
    const label = c; // no em-dash here
    html += `<th data-col="${c}">${label}<span class="sort-ind"></span></th>`;
  });
  html += '</tr></thead><tbody>';

  // Body
  rows.forEach(r => {
    html += '<tr>';
    SRC_COLS.forEach(col => {
      let val = r[col] ?? '';
      if (col === "SRC Link" || col === "Video") val = linkCell(val);
      html += `<td>${val ?? ''}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  mount.innerHTML = html;

  // Sorting handlers
  const ths = mount.querySelectorAll('th');
  let sortState = {}; // {col, dir}
  ths.forEach(th=>{
    th.addEventListener('click', ()=>{
      const col = th.getAttribute('data-col');
      const dir = (sortState.col===col && sortState.dir==='asc') ? 'desc' : 'asc';
      sortState = {col, dir};

      const tbody = mount.querySelector('tbody');
      const rowsEl = Array.from(tbody.querySelectorAll('tr'));
      rowsEl.sort((rA,rB)=>{
        const a = rA.querySelector(`td:nth-child(${SRC_COLS.indexOf(col)+1})`).textContent.trim();
        const b = rB.querySelector(`td:nth-child(${SRC_COLS.indexOf(col)+1})`).textContent.trim();
        let cmp;
        if (col === "Time"){
          const ax = toSecondsFlexible(a), bx = toSecondsFlexible(b);
          cmp = (isNaN(ax)?Infinity:ax) - (isNaN(bx)?Infinity:bx);
        } else {
          cmp = a.localeCompare(b, undefined, {numeric:true, sensitivity:'base'});
        }
        return dir==='asc' ? cmp : -cmp;
      });
      rowsEl.forEach(el=>tbody.appendChild(el));

      // Update indicators
      mount.querySelectorAll('.sort-ind').forEach(i=>i.textContent='');
      th.querySelector('.sort-ind').textContent = dir==='asc' ? '▲' : '▼';
    });
  });
}

/* ===== Speedrider horizontal strip ===== */
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

/* ===== Scroll‑spy ===== */
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
  }, { root: null, rootMargin: '0px 0px -60% 0px', threshold: 0.25 });

  sectionIds.forEach(id => {
    const sec = document.getElementById(id);
    if (sec) observer.observe(sec);
  });
}

/* ===== Main ===== */
async function loadAll(){
  // Fetch SRC + Speedrider TA/FR
  const [srcRes, srTaRes, srFrRes] = await Promise.all([
    fetch(SRC_CSV,  {cache:'no-cache'}),
    fetch(SR_TA_CSV,{cache:'no-cache'}),
    fetch(SR_FR_CSV,{cache:'no-cache'})
  ]);
  const [srcText, srTaText, srFrText] = await Promise.all([srcRes.text(), srTaRes.text(), srFrRes.text()]);
  const srcRows  = parseCSV(srcText);
  const srTaRows = parseCSV(srTaText);
  const srFrRows = parseCSV(srFrText);

  /* Build SRC indices */
  const srcHeader = srcRows[0].map(h => String(h).trim());
  const SRC_IDX = {
    Category:   idxOf(srcHeader,"Category"),
    Subcategory:idxOf(srcHeader,"Subcategory"),
    Machine:    idxOf(srcHeader,"Machine"),
    Rider:      idxOf(srcHeader,"Rider"),
    Player:     idxOf(srcHeader,"Player"),
    Time:       idxOf(srcHeader,"Time"),
    Link:       idxOf(srcHeader,"Link"),
    Video:      idxOf(srcHeader,"Video"),
  };

  /* Group SRC by course & mode/rules */
  const srcByCourse = new Map(); // course -> { TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]} }
  srcRows.slice(1).forEach(r => {
    const category = r[SRC_IDX.Category] ?? '';
    const subcat   = r[SRC_IDX.Subcategory] ?? '';
    if (!category || !subcat) return;

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

  /* Speedrider indices */
  function buildSrIndex(rows){
    const header = rows[0].map(h => String(h).trim());
    const IDX = {
      Course:     idxOf(header,"Course"),
      Machine:    idxOf(header,"Machine"),
      Rider:      idxOf(header,"Rider"),
      Player:     idxOf(header,"Player"),
      Time:       idxOf(header,"Time"),
      TimeSec:    idxOf(header,"Time (sec)"),
      PlayerLink: idxOf(header,"Player Link"),
    };
    const byCourse = new Map();
    rows.slice(1).forEach(r => {
      const course  = r[IDX.Course] ?? '';
      if (!course) return;
      const entry = {
        "Time": r[IDX.Time],
        "Machine": r[IDX.Machine],
        "Rider": r[IDX.Rider],
        "Player": r[IDX.Player],
        "Player Link": r[IDX.PlayerLink],
        _sec: Number(r[IDX.TimeSec] || NaN)
      };
      if (!byCourse.has(course)) byCourse.set(course, []);
      byCourse.get(course).push(entry);
    });
    // sort each course by time asc
    byCourse.forEach(arr=>{
      arr.sort((a,b)=>{
        const ax = (typeof a._sec==='number' && !isNaN(a._sec)) ? a._sec : Infinity;
        const bx = (typeof b._sec==='number' && !isNaN(b._sec)) ? b._sec : Infinity;
        return ax - bx;
      });
    });
    return byCourse;
  }

  const srTaByCourse = buildSrIndex(srTaRows);
  const srFrByCourse = buildSrIndex(srFrRows);

  /* Build left nav + sections in requested order */
  const content = document.getElementById('content');
  const nav = document.getElementById('course-nav');

  const courseSet = new Set([...srcByCourse.keys(), ...srTaByCourse.keys(), ...srFrByCourse.keys()]);
  const orderedCourses = COURSE_ORDER.filter(c => courseSet.has(c));

  // Left nav links
  nav.innerHTML = orderedCourses.map(course => {
    const id = makeAnchorId(course);
    return `<a href="#${id}">${course}</a>`;
  }).join("");

  // Sections
  const sectionIds = [];
  orderedCourses.forEach(courseName => {
    const id = makeAnchorId(courseName);
    sectionIds.push(id);

    const srcCourse = srcByCourse.get(courseName) || {TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]}};
    const srTaCourse = srTaByCourse.get(courseName) || [];
    const srFrCourse = srFrByCourse.get(courseName) || [];

    const sec = document.createElement('section');
    sec.className = 'course';
    sec.innerHTML = `
      <span id="${id}" class="anchor"></span>
      <h2 class="course-title">${courseName}</h2>

      <figure class="banner-wrap">
        <img class="course-banner" src="${BANNERS[courseName]||''}" alt="${courseName} banner">
        <figcaption class="banner-title">${courseName}</figcaption>
      </figure>

      <div class="tables-grid">
        <article class="table-card">
          <h3>Time Attack - Restricted</h3>
          <div id="${id}-ta-r"></div>
        </article>
        <article class="table-card">
          <h3>Time Attack - Unrestricted</h3>
          <div id="${id}-ta-u"></div>
        </article>
        <article class="table-card">
          <h3>Free Run - Restricted</h3>
          <div id="${id}-fr-r"></div>
        </article>
        <article class="table-card">
          <h3>Free Run - Unrestricted</h3>
          <div id="${id}-fr-u"></div>
        </article>

        <article class="table-card wide">
          <h3>Speedrider - Time Attack Records by Machine</h3>
          <div id="${id}-sr-ta"></div>
        </article>
        <article class="table-card wide">
          <h3>Speedrider - Free Run Records by Machine</h3>
          <div id="${id}-sr-fr"></div>
        </article>
      </div>

      <hr class="section-divider" />
    `;
    content.appendChild(sec);

    // Fill SRC tables (sortable)
    renderSrcTableSortable(`${id}-ta-r`, srcCourse.TA.Restricted);
    renderSrcTableSortable(`${id}-ta-u`, srcCourse.TA.Unrestricted);
    renderSrcTableSortable(`${id}-fr-r`, srcCourse.FR.Restricted);
    renderSrcTableSortable(`${id}-fr-u`, srcCourse.FR.Unrestricted);

    // Fill Speedrider strips (TA / FR properly separated)
    renderSpeedriderStrip(`${id}-sr-ta`, srTaCourse);
    renderSpeedriderStrip(`${id}-sr-fr`, srFrCourse);
  });

  // Scroll‑spy & smooth scroll
  setupScrollSpy(sectionIds);
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
document.addEventListener('DOMContentLoaded', loadAll);
