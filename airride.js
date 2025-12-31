
/* KARs Garage — Air Ride (native HTML/CSS/JS; no iframes)
   - Parses SRC Top-3 CSV → Column C Subcategory "Course + Ruleset"
   - Parses Speedrider TA and FR CSVs (separate published tabs)
   - Renders per-course sections in explicit order:
     TA (Restricted/Unrestricted) side-by-side; FR (Restricted/Unrestricted) beneath;
     then Speedrider strips (TA above FR).
   - Only current WRs; ties follow source order (we keep source order per CSV).
   - Link text strips https:// and www.; ellipsis handled via CSS; table is not scrollable.
*/

/* === DATA SOURCES === */
const SRC_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?output=csv";                           /* from your attachment */ /* [3](https://jrdunn-my.sharepoint.com/personal/victor_jrdunn_com/Documents/Microsoft%20Copilot%20Chat%20Files/airride.js) */
const SR_TA_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=1618721256&single=true&output=csv"; /* TA tab */        /* [3](https://jrdunn-my.sharepoint.com/personal/victor_jrdunn_com/Documents/Microsoft%20Copilot%20Chat%20Files/airride.js) */
const SR_FR_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=109124482&single=true&output=csv";  /* FR tab */        /* [3](https://jrdunn-my.sharepoint.com/personal/victor_jrdunn_com/Documents/Microsoft%20Copilot%20Chat%20Files/airride.js) */

/* === LABELS === */
const TA_LABEL = /time\s*attack/i;
const FR_LABEL = /free\s*run/i;
const RESTRICTED = /restricted/i;
const UNRESTRICTED = /unrestricted/i;

/* === COURSE BANNER MAP (includes Celestial Valley) === */
const BANNERS = {
  "Airtopia Ruins": "/images/Airtopia_banner.webp",
  "Beanstalk Park": "/images/beanstalk_banner.webp",
  "Cavernous Corners": "/images/cavernous_banner.webp",
  "Checker Knights": "/images/checker_banner.webp",
  "Celestial Valley": "/images/Celestial_banner.webp",   // ← added per your note
  "Crystalline Fissure": "/images/Crystalline_banner.webp",
  "Cyberion Highway": "/images/Cyberion_Banner.webp",
  "Fantasy Meadows": "/images/Fantasy_banner.webp",
  "Floria Fields": "/images/Floria_banner.webp",
  "Frozen Hillside": "/images/Frozen_banner.webp",
  "Galactic Nova": "/images/Nova_Banner.webp",
  "Machine Passage": "/images/Machine_Banner.webp",
  "Magma Flows": "/images/Magma_Banner.webp",
  "Mount Amberfalls": "/images/Amberfalls_banner.webp",
  "Nebula Belt": "/images/Nebula_Banner.webp",
  "Sky Sands": "/images/Sky_Banner.webp",
  "Steamgust Forge": "/images/Steamgust_Banner.webp",
  "Waveflow Waters": "/images/Waveflow_Banner.webp"
};

/* === Explicit course order === */
const COURSE_ORDER = [
  "Floria Fields","Waveflow Waters","Airtopia Ruins","Crystalline Fissure","Steamgust Forge",
  "Cavernous Corners","Cyberion Highway","Mount Amberfalls","Galactic Nova","Fantasy Meadows",
  "Celestial Valley","Sky Sands","Frozen Hillside","Magma Flows","Beanstalk Park",
  "Machine Passage","Checker Knights","Nebula Belt"
];

/* === Display columns === */
const SRC_COLS = ["Player","Time","Machine","Rider","Link","Video"]; /* matches your current column names */ /* [3](https://jrdunn-my.sharepoint.com/personal/victor_jrdunn_com/Documents/Microsoft%20Copilot%20Chat%20Files/airride.js) */

/* === CSV parsing (quoted fields) === */
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
  if (cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r => r.length && r.some(v => String(v).trim().length));
}

/* === Helpers === */
function idxOf(header, colName){
  const i = header.findIndex(h => String(h).trim().toLowerCase() === String(colName).toLowerCase());
  return i < 0 ? null : i;
}
function makeAnchorId(name){
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function stripPrefix(u){ return String(u ?? '').replace(/^https?:\/\/(www\.)?/i,''); }
function linkCell(url){
  const u = String(url ?? '').trim(); if (!u) return '';
  const label = stripPrefix(u); // CSS will ellipsize within fixed column width
  return `<a href="${u}" target="_blank" rel="noopener">${label}</a>`;
}

/* === Parse Column C Subcategory: "Course + Ruleset" === */
function parseCourseAndRules(subRaw){
  const s = String(subRaw ?? '').trim().replace(/\s*\+$/, ''); // drop trailing '+'
  if (!s) return { course:"", rules:"" };
  const [courseRaw, rulesRaw = ''] = s.split(/\s*\+\s*/);
  const course = (courseRaw || '').trim();
  let rules = (rulesRaw || '').trim();
  if (RESTRICTED.test(rules)) rules = 'Restricted';
  else if (UNRESTRICTED.test(rules)) rules = 'Unrestricted';
  else {
    // fallback: infer from whole string if not present after '+'
    if (RESTRICTED.test(s)) rules = 'Restricted';
    else if (UNRESTRICTED.test(s)) rules = 'Unrestricted';
    else rules = '';
  }
  return { course, rules };
}

/* === Flexible time parsing for sorting (fastest first) === */
function toMillis(t){
  const s = String(t || '').trim();
  let m;
  // 00'39"89  (hundredths or thousandths)
  if ((m = s.match(/^(\d+)'(\d{2})"(\d{2,3})$/))) {
    const mm = +m[1], ss = +m[2], frac = +m[3];
    const ms = m[3].length === 2 ? frac * 10 : frac; // 2-digit → hundredths; 3-digit → ms
    return (mm*60 + ss) * 1000 + ms;
  }
  // mm:ss.mmm
  if ((m = s.match(/^(\d+):(\d{2})\.(\d{3})$/))) {
    const mm = +m[1], ss = +m[2], ms = +m[3];
    return (mm*60 + ss) * 1000 + ms;
  }
  // hh:mm:ss.mmm
  if ((m = s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/))) {
    const hh = +m[1], mm = +m[2], ss = +m[3], ms = +m[4];
    return ((hh*3600)+(mm*60)+ss)*1000 + ms;
  }
  return Number.POSITIVE_INFINITY; // unknown format sinks to end
}

/* === Render SRC table (click-sort headers, non-scroll) === */
function renderSrcTable(mountId, rows){
  const mount = document.getElementById(mountId); if (!mount) return;
  if (!rows || rows.length === 0){ mount.innerHTML = '<p class="muted">No data</p>'; return; }

  // default sort fastest → slowest; ties preserve CSV order via stable sort approach
  const sorted = rows.slice().sort((a,b) => (a._ms - b._ms));

  let html = '<table class="table"><thead><tr>';
  const COLS = ["Player","Time","Machine","Rider","Link","Video"];
  COLS.forEach(c => { html += `<th data-col="${c}">${c}<span class="sort-ind"></span></th>`; });
  html += '</tr></thead><tbody>';
  sorted.forEach(r => {
    html += '<tr>';
    COLS.forEach(col => {
      let val = r[col] ?? '';
      if (col === 'Link' || col === 'Video') val = linkCell(val);
      html += `<td>${val ?? ''}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  mount.innerHTML = html;

  // click-sort handlers (toggle asc/desc)
  const ths = mount.querySelectorAll('th'); let sortState = {};
  ths.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-col');
      const dir = (sortState.col === col && sortState.dir === 'asc') ? 'desc' : 'asc';
      sortState = { col, dir };

      const tbody = mount.querySelector('tbody');
      const rowsEl = Array.from(tbody.querySelectorAll('tr'));
      rowsEl.sort((rA, rB) => {
        const a = rA.querySelector(`td:nth-child(${COLS.indexOf(col)+1})`).textContent.trim();
        const b = rB.querySelector(`td:nth-child(${COLS.indexOf(col)+1})`).textContent.trim();
        let cmp;
        if (col === 'Time'){ const ax = toMillis(a), bx = toMillis(b); cmp = (ax - bx); }
        else { cmp = a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }); }
        return dir === 'asc' ? cmp : -cmp;
      });
      rowsEl.forEach(el => tbody.appendChild(el));
      mount.querySelectorAll('.sort-ind').forEach(i => i.textContent = '');
      th.querySelector('.sort-ind').textContent = dir === 'asc' ? '▲' : '▼';
    });
  });
}

/* === Speedrider strip (TA above FR); show only Time, Machine, Rider, Player, Player Link === */
function renderSpeedriderStrip(mountId, entries){
  const mount = document.getElementById(mountId); if (!mount) return;
  if (!entries || entries.length === 0){ mount.innerHTML = '<p class="muted">No data</p>'; return; }
  let html = '<div class="sr-strip">';
  entries.forEach(e => {
    html += `
      <div class="sr-col">
        <div class="sr-time">${e.Time ?? ''}</div>
        <div class="sr-item"><span class="label">Machine</span> ${e.Machine ?? ''}</div>
        <div class="sr-item"><span class="label">Rider</span> ${e.Rider ?? ''}</div>
        <div class="sr-item"><span class="label">Player</span> ${e.Player ?? ''}</div>
        <div class="sr-item"><span class="label">Link</span> ${linkCell(e["Player Link"] ?? '')}</div>
      </div>`;
  });
  html += '</div>';
  mount.innerHTML = html;
}

/* === Scroll‑spy for left TOC === */
function setupScrollSpy(sectionIds){
  const links = sectionIds.map(id => ({ id, el: document.querySelector(`#course-nav a[href="#${id}"]`) })).filter(x => x.el);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = links.find(l => l.id === id)?.el; if (!link) return;
      if (entry.isIntersecting){
        links.forEach(l => l.el.classList.remove('active'));
        link.classList.add('active');
      }
    });
  },{root:null, rootMargin:'0px 0px -60% 0px', threshold:0.25});
  sectionIds.forEach(id => { const sec = document.getElementById(id); if (sec) observer.observe(sec); });
}

/* === Build Speedrider index (sorted fastest → slowest by Time (sec)) === */
function buildSrIndex(rows){
  const header = rows[0].map(h => String(h).trim());
  const IDX = {
    Course: idxOf(header,"Course"),
    Machine: idxOf(header,"Machine"),
    Rider: idxOf(header,"Rider"),
    Player: idxOf(header,"Player"),
    Time: idxOf(header,"Time"),
    TimeSec: idxOf(header,"Time (sec)"),
    PlayerLink: idxOf(header,"Player Link")
  };
  const byCourse = new Map();
  rows.slice(1).forEach(r => {
    const course = r[IDX.Course] ?? ''; if (!course) return;
    const entry = {
      "Time": r[IDX.Time],
      "Machine": r[IDX.Machine],
      "Rider": r[IDX.Rider],
      "Player": r[IDX.Player],
      "Player Link": r[IDX.PlayerLink],
      _sec: Number(r[IDX.TimeSec] ?? NaN)
    };
    if (!byCourse.has(course)) byCourse.set(course, []);
    byCourse.get(course).push(entry);
  });
  // sort fastest first; ties preserve source order (stable enough for our use)
  byCourse.forEach(arr => {
    arr.sort((a,b) => {
      const ax = (typeof a._sec === 'number' && !isNaN(a._sec)) ? a._sec : Infinity;
      const bx = (typeof b._sec === 'number' && !isNaN(b._sec)) ? b._sec : Infinity;
      return ax - bx;
    });
  });
  return byCourse;
}

/* === Main build === */
async function loadAll(){
  // footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Fetch all CSVs
  const [srcRes, srTaRes, srFrRes] = await Promise.all([
    fetch(SRC_CSV, { cache:'no-cache' }),
    fetch(SR_TA_CSV, { cache:'no-cache' }),
    fetch(SR_FR_CSV, { cache:'no-cache' })
  ]);
  const [srcText, srTaText, srFrText] = await Promise.all([srcRes.text(), srTaRes.text(), srFrRes.text()]);
  const srcRows = parseCSV(srcText);
  const srTaRows = parseCSV(srTaText);
  const srFrRows = parseCSV(srFrText);

  /* Indexes for SRC */
  const srcHeader = srcRows[0].map(h => String(h).trim());
  const SRC_IDX = {
    Category: idxOf(srcHeader,"Category"),
    Subcategory: idxOf(srcHeader,"Subcategory"),
    Machine: idxOf(srcHeader,"Machine"),
    Rider: idxOf(srcHeader,"Rider"),
    Player: idxOf(srcHeader,"Player"),
    Time: idxOf(srcHeader,"Time"),
    Link: idxOf(srcHeader,"Link"),
    Video: idxOf(srcHeader,"Video")
  }; /* [3](https://jrdunn-my.sharepoint.com/personal/victor_jrdunn_com/Documents/Microsoft%20Copilot%20Chat%20Files/airride.js) */

  /* Group SRC by course parsed from Column C Subcategory, and by mode/ruleset */
  const srcByCourse = new Map();
  srcRows.slice(1).forEach(r => {
    const category = r[SRC_IDX.Category] ?? '';
    const subcat = r[SRC_IDX.Subcategory] ?? '';
    if (!category || !subcat) return;

    // ignore plain “Air Ride”; only TA/FR categories
    const mode = TA_LABEL.test(category) ? 'TA' : (FR_LABEL.test(category) ? 'FR' : 'OTHER');
    if (mode === 'OTHER') return;

    const { course, rules } = parseCourseAndRules(subcat);
    if (!course || !(rules === 'Restricted' || rules === 'Unrestricted')) return;

    const rowObj = {
      Player: r[SRC_IDX.Player],
      Time: r[SRC_IDX.Time],
      Machine: r[SRC_IDX.Machine],
      Rider: r[SRC_IDX.Rider],
      Link: r[SRC_IDX.Link],
      Video: r[SRC_IDX.Video],
      _ms: toMillis(r[SRC_IDX.Time])
    };
    if (!srcByCourse.has(course)) {
      srcByCourse.set(course, { TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]} });
    }
    srcByCourse.get(course)[mode][rules].push(rowObj);
  });

  // Sort SRC buckets fastest → slowest
  for (const course of srcByCourse.keys()){
    ['TA','FR'].forEach(m => ['Restricted','Unrestricted'].forEach(rule => {
      srcByCourse.get(course)[m][rule].sort((a,b) => a._ms - b._ms);
    }));
  }

  /* Speedrider TA/FR by course */
  const srTaByCourse = buildSrIndex(srTaRows); /* [3](https://jrdunn-my.sharepoint.com/personal/victor_jrdunn_com/Documents/Microsoft%20Copilot%20Chat%20Files/airride.js) */
  const srFrByCourse = buildSrIndex(srFrRows); /* [3](https://jrdunn-my.sharepoint.com/personal/victor_jrdunn_com/Documents/Microsoft%20Copilot%20Chat%20Files/airride.js) */

  /* Build left nav + sections in explicit order; skip courses with no data */
  const content = document.getElementById('content');
  const nav = document.getElementById('course-nav');

  const courseSet = new Set([...srcByCourse.keys(), ...srTaByCourse.keys(), ...srFrByCourse.keys()]);
  const orderedCourses = COURSE_ORDER.filter(c => courseSet.has(c));
  nav.innerHTML = orderedCourses.map(course => `<a href="#${makeAnchorId(course)}">${course}</a>`).join("");

  const sectionIds = [];
  orderedCourses.forEach(courseName => {
    const id = makeAnchorId(courseName);
    sectionIds.push(id);

    const srcCourse = srcByCourse.get(courseName) || { TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]} };
    const srTaCourse = srTaByCourse.get(courseName) || [];
    const srFrCourse = srFrByCourse.get(courseName) || [];

    const sec = document.createElement('section');
    sec.className = 'course';

    const bannerImg = BANNERS[courseName] ? `<img class="course-banner" src="${BANNERS[courseName]}" alt="${courseName} banner">` : '';
    sec.innerHTML = `
      <span id="${id}" class="anchor"></span>
      <figure class="banner-wrap">
        ${bannerImg}
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

    // SRC tables
    renderSrcTable(`${id}-ta-r`, srcCourse.TA.Restricted);
    renderSrcTable(`${id}-ta-u`, srcCourse.TA.Unrestricted);
    renderSrcTable(`${id}-fr-r`, srcCourse.FR.Restricted);
    renderSrcTable(`${id}-fr-u`, srcCourse.FR.Unrestricted);

    // Speedrider strips
    renderSpeedriderStrip(`${id}-sr-ta`, srTaCourse);
    renderSpeedriderStrip(`${id}-sr-fr`, srFrCourse);
  });

  setupScrollSpy(sectionIds);

  // Smooth scroll on left nav
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
}

document.addEventListener('DOMContentLoaded', loadAll);
