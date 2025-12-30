
/* KARs Garage — data loader (no iframes; native HTML tables)
   - Reads your SRC Top‑3 CSV (all subcategories)
   - Reads your Speedrider WRs CSV
   - Builds course sections and renders six tables per course:
     1) SRC TA Restricted
     2) SRC TA Unrestricted
     3) SRC FR Restricted
     4) SRC FR Unrestricted
     5) Speedrider — Time Attack (by Machine)
     6) Speedrider — Free Run (by Machine)
   Notes:
   - We preserve the order from each CSV (ties follow source order).
   - Speedrider TA/FR split: if your WR CSV merges modes, we render the same list for both,
     or we can wire separate CSVs later for true TA/FR separation.
*/

/* === CONFIG: paste your CSV URLs === */
const SRC_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?output=csv";
const SR_CSV  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?output=csv";

/* Detect modes/subcategories in SRC */
const TA_LABEL = /time attack/i;
const FR_LABEL = /free run/i;
const RESTRICTED = /restricted/i;
const UNRESTRICTED = /unrestricted/i;

/* Display columns */
const SRC_COLS = ["Player","Time","Machine","Rider","Link","Video"]; // display order
const SR_COLS  = ["Time","Machine","Rider","Player","Node Link","Player Link"];

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
function renderTable(mountId, columns, rows){
  const mount = document.getElementById(mountId);
  if (!mount) return;
  if (!rows || rows.length === 0){
    mount.innerHTML = '<p class="muted">No data</p>';
    return;
  }
  // Build table preserving source order
  let html = '<table class="table"><thead><tr>';
  columns.forEach(c => html += `<th>${c}</th>`);
  html += '</tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr>';
    columns.forEach((col) => {
      let val = r[col] ?? '';
      if (/link/i.test(col)) val = linkCell(val);
      html += `<td>${val ?? ''}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
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

  // Prepare SRC indexes
  const srcHeader = srcRows[0].map(h => String(h).trim());
  const SRC_IDX = {
    Category: idxOf(srcHeader,"Category"),
    Level: idxOf(srcHeader,"Level"),
    Subcategory: idxOf(srcHeader,"Subcategory"),
    Machine: idxOf(srcHeader,"Machine"),
    Rider: idxOf(srcHeader,"Rider"),
    Place: idxOf(srcHeader,"Place"),
    Player: idxOf(srcHeader,"Player"),
    TimeSec: idxOf(srcHeader,"Time (sec)"),
    Time: idxOf(srcHeader,"Time"),
    Date: idxOf(srcHeader,"Date"),
    Link: idxOf(srcHeader,"Link"),
    Video: idxOf(srcHeader,"Video"),
    RunID: idxOf(srcHeader,"Run ID"),
  };

  // Prepare Speedrider indexes
  const srHeader = srRows[0].map(h => String(h).trim());
  const SR_IDX = {
    Course: idxOf(srHeader,"Course"),
    Machine: idxOf(srHeader,"Machine"),
    Rider: idxOf(srHeader,"Rider"),
    Player: idxOf(srHeader,"Player"),
    Time: idxOf(srHeader,"Time"),
    TimeSec: idxOf(srHeader,"Time (sec)"),
    Node: idxOf(srHeader,"Node Link"),
    PlayerLink: idxOf(srHeader,"Player Link"),
  };

  // Group SRC by course Level
  const srcDataByCourse = new Map();
  srcRows.slice(1).forEach(r => {
    const level = r[SRC_IDX.Level] ?? '';
    if (!level) return;
    const cat = r[SRC_IDX.Category] ?? '';
    const subcat = String(r[SRC_IDX.Subcategory] ?? '');
    const mode = TA_LABEL.test(cat) ? 'TA' : (FR_LABEL.test(cat) ? 'FR' : 'OTHER');
    const sub = RESTRICTED.test(subcat) ? 'Restricted'
              : (UNRESTRICTED.test(subcat) ? 'Unrestricted' : subcat || '');
    const rowObj = {
      Player: r[SRC_IDX.Player],
      Time:   r[SRC_IDX.Time],     // keep as text (hh:mm:ss.mmm)
      Machine:r[SRC_IDX.Machine],
      Rider:  r[SRC_IDX.Rider],
      "Link": r[SRC_IDX.Link],
      "Video":r[SRC_IDX.Video],
      _mode: mode,
      _sub: sub,
    };
    if (!srcDataByCourse.has(level)) {
      srcDataByCourse.set(level, {TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]}});
    }
    const courseObj = srcDataByCourse.get(level);
    if (mode === 'TA' && (sub === 'Restricted' || sub === 'Unrestricted')) courseObj.TA[sub].push(rowObj);
    if (mode === 'FR' && (sub === 'Restricted' || sub === 'Unrestricted')) courseObj.FR[sub].push(rowObj);
  });

  // Group Speedrider by Course
  const srDataByCourse = new Map();
  srRows.slice(1).forEach(r => {
    const course = r[SR_IDX.Course] ?? '';
    if (!course) return;
    const rowObj = {
      "Time": r[SR_IDX.Time],
      "Machine": r[SR_IDX.Machine],
      "Rider": r[SR_IDX.Rider],
      "Player": r[SR_IDX.Player],
      "Node Link": r[SR_IDX.Node],
      "Player Link": r[SR_IDX.PlayerLink]
      // _timeSec intentionally ignored to preserve source order
    };
    if (!srDataByCourse.has(course)) srDataByCourse.set(course, {TA:[], FR:[]});
    // If your SR CSV combines TA & FR, we render both the same for now.
    srDataByCourse.get(course).TA.push(rowObj);
    srDataByCourse.get(course).FR.push(rowObj);
  });

  // Build navigation + sections (courses present in either dataset)
  const allCourses = new Set([...srcDataByCourse.keys(), ...srDataByCourse.keys()]);
  const content = document.getElementById('content');
  const navList = document.getElementById('nav-list');

  allCourses.forEach(courseName => {
    const anchorId = makeAnchorId(courseName);
    // Nav item
    const li = document.createElement('li');
    li.innerHTML = `<a href="#${anchorId}">${courseName}</a>`;
    navList.appendChild(li);

    // Section
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
        <article class="table-card wide"><h3>Speedrider — Time Attack Records by Machine</h3><div id="${anchorId}-sr-ta" class="table-container"></div></article>
        <article class="table-card wide"><h3>Speedrider — Free Run Records by Machine</h3><div id="${anchorId}-sr-fr" class="table-container"></div></article>
      </div>
      <hr class="section-divider" />
    `;
    content.appendChild(sec);

    // SRC tables
    const srcCourse = srcDataByCourse.get(courseName) || {TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]}};
    renderTable(`${anchorId}-ta-r`, SRC_COLS, srcCourse.TA.Restricted);
    renderTable(`${anchorId}-ta-u`, SRC_COLS, srcCourse.TA.Unrestricted);
    renderTable(`${anchorId}-fr-r`, SRC_COLS, srcCourse.FR.Restricted);
    renderTable(`${anchorId}-fr-u`, SRC_COLS, srcCourse.FR.Unrestricted);

    // Speedrider tables (preserve source order)
    const srCourse = srDataByCourse.get(courseName) || {TA:[], FR:[]};
    renderTable(`${anchorId}-sr-ta`, SR_COLS, srCourse.TA);
    renderTable(`${anchorId}-sr-fr`, SR_COLS, srCourse.FR);
  });
}

loadAll().catch(err => {
  console.error(err);
  const content = document.getElementById('content');
  content.innerHTML = `<p class="muted">Failed to load data.</p>`;
});
