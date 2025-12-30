
/* KARs Garage — Air Ride subpage
   - FIX: SRC parsing now uses:
        Category (col A) -> Mode: Time Attack / Free Run
        Subcategory (col C) -> Course + Ruleset (Restricted / Unrestricted)
   - Speedrider layout: horizontal "machine cards" grid per course & mode.
*/

/* === Published CSV URLs === */
const SRC_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?output=csv";
const SR_CSV  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?output=csv";

/* Mode detection from Category */
const TA_LABEL = /time\s*attack/i;
const FR_LABEL = /free\s*run/i;

/* Ruleset detection from Subcategory */
const RESTRICTED = /restricted/i;
const UNRESTRICTED = /unrestricted/i;

/* Display column order for SRC detail tables */
const SRC_COLS = ["Player","Time","Machine","Rider","SRC Link","Video"];

/* Speedrider "mini table" column order inside machine cards */
const SR_MINI_COLS = ["Time","Rider","Player","Node Link","Player Link"];

/* === CSV parsing (handles quoted fields) === */
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

/* === Helpers === */
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

/* Extract {course, ruleset} from Subcategory text */
function parseCourseAndRules(subcatRaw){
  const s = String(subcatRaw||'').trim();
  if (!s) return {course:"", ruleset:""};
  let ruleset = "";
  if (RESTRICTED.test(s)) ruleset = "Restricted";
  else if (UNRESTRICTED.test(s)) ruleset = "Unrestricted";

  // Remove ruleset token and common punctuation/text to get course name
  let course = s.replace(/restricted|unrestricted/ig,'');
  course = course.replace(/[-–—|•]/g,' ');
  course = course.replace(/\s+/g,' ').trim();
  course = course.replace(/^air\s*ride\s*[:-]\s*/i,'').trim();
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

/* Render Speedrider horizontal "machine cards" grid */
function renderSpeedriderGrid(mountId, byMachine){
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const machineNames = Object.keys(byMachine);
  if (machineNames.length === 0){
    mount.innerHTML = '<p class="muted">No data</p>';
    return;
  }
  let html = '<div class="sr-grid">';
  machineNames.forEach(machine => {
    const entries = byMachine[machine] || [];
    html += `<div class="sr-card"><h4 class="sr-machine">${machine}</h4>`;
    html += '<table class="sr-mini"><thead><tr>';
    SR_MINI_COLS.forEach(c => html += `<th>${c}</th>`);
    html += '</tr></thead><tbody>';
    entries.forEach(e => {
      html += '<tr>';
      SR_MINI_COLS.forEach(col => {
        let val = e[col] ?? '';
        if (/link/i.test(col)) val = linkCell(val);
        html += `<td>${val ?? ''}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  });
  html += '</div>';
  mount.innerHTML = html;
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

    const mode = TA_LABEL.test(category) ? 'TA'
               : FR_LABEL.test(category) ? 'FR' : 'OTHER';

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
    if (mode === 'TA') bucket.TA[ruleset].push(rowObj);
    else if (mode === 'FR') bucket.FR[ruleset].push(rowObj);
  });

  /* Build Speedrider indices */
  const srHeader = srRows[0].map(h => String(h).trim());
  const SR_IDX = {
    Course: idxOf(srHeader,"Course"),
    Machine: idxOf(srHeader,"Machine"),
    Rider: idxOf(srHeader,"Rider"),
    Player: idxOf(srHeader,"Player"),
    Time: idxOf(srHeader,"Time"),
    Node: idxOf(srHeader,"Node Link"),
    PlayerLink: idxOf(srHeader,"Player Link"),
  };

  /* Group Speedrider by course -> mode buckets -> machine arrays */
  const srByCourse = new Map();
  srRows.slice(1).forEach(r => {
    const course  = r[SR_IDX.Course] ?? '';
    const machine = r[SR_IDX.Machine] ?? '';
    if (!course || !machine) return;

    const entry = {
      "Time": r[SR_IDX.Time],
      "Rider": r[SR_IDX.Rider],
      "Player": r[SR_IDX.Player],
      "Node Link": r[SR_IDX.Node],
      "Player Link": r[SR_IDX.PlayerLink]
    };

    if (!srByCourse.has(course)){
      srByCourse.set(course, {TA:{}, FR:{}});
    }
    const courseObj = srByCourse.get(course);
    // Until we get separate SR feeds for TA/FR, include entries in both
    if (!courseObj.TA[machine]) courseObj.TA[machine] = [];
    if (!courseObj.FR[machine]) courseObj.FR[machine] = [];
    courseObj.TA[machine].push(entry);
    courseObj.FR[machine].push(entry);
  });

  /* Build navigation + sections using union of courses from SRC and SR */
  const allCourses = new Set([...srcByCourse.keys(), ...srByCourse.keys()]);
  const content = document.getElementById('content');
  const navList = document.getElementById('nav-list');

  allCourses.forEach(courseName => {
    const anchorId = makeAnchorId(courseName);
    // Nav item
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${anchorId}">${courseName}</a>`;
    navList.appendChild(li);

    // Section scaffold
    const sec = document.createElement('section');
    sec.className = 'course';
    sec.innerHTML = `
      <span id="${anchorId}" class="anchor"></span>
      <h2 class="course-title">${courseName}</h2>
      <p class="course-subtitle">SRC Top‑3 & Speedrider WRs</p>
      <div class="tables-grid">
        <article class="table-card"><h3>Time Attack — Restricted</h3><div id="${anchorId}-ta-r" class="table-container"></div></article>
        <article class="table-card"><h3>Time Attack — Unrestricted</h3><div id="${anchorId}-ta-u" class="table-container"></div></article>
        <article class="table-card"><h3>Free Run — Restricted</h3><div id="${anchorId}-fr-r" class="table-container"></div></article>
        <article class="table-card"><h3>Free Run — Unrestricted</h3><div id="${anchorId}-fr-u" class="table-container"></div></article>

        <article class="table-card wide">
          <h3>Speedrider — Time Attack Records by Machine</h3>
          <div id="${anchorId}-sr-ta" class="table-container"></div>
        </article>
        <article class="table-card wide">
          <h3>Speedrider — Free Run Records by Machine</h3>
          <div id="${anchorId}-sr-fr" class="table-container"></div>
        </article>
      </div>
      <hr class="section-divider" />
    `;
    content.appendChild(sec);

    // SRC tables
    const srcCourse = srcByCourse.get(courseName) || {TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]}};
    renderSrcTable(`${anchorId}-ta-r`, srcCourse.TA.Restricted);
    renderSrcTable(`${anchorId}-ta-u`, srcCourse.TA.Unrestricted);
    renderSrcTable(`${anchorId}-fr-r`, srcCourse.FR.Restricted);
    renderSrcTable(`${anchorId}-fr-u`, srcCourse.FR.Unrestricted);

    // Speedrider grids (horizontal)
    const srCourse = srByCourse.get(courseName) || {TA:{}, FR:{}};
    renderSpeedriderGrid(`${anchorId}-sr-ta`, srCourse.TA);
    renderSpeedriderGrid(`${anchorId}-sr-fr`, srCourse.FR);
  });
}

/* Boot */
document.getElementById('year').textContent = new Date().getFullYear();
loadAll().catch(err => {
  console.error(err);
  const content = document.getElementById('content');
  content.innerHTML = `<p class="muted">Failed to load data.</p>`;
});
