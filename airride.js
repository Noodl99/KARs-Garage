
/* KARs Garage — Air Ride subpage
   - SRC: Category (A) -> TA/FR; Subcategory (C) -> "Course + Restricted/Unrestricted"
     * ignores the " + " and dedupes course names.
   - Left sidebar: underlined course links; active course gets red underline (scroll‑spy).
   - Speedrider: single horizontal strip, sorted fastest (Time sec asc) to the left.
     * Displays: Time (top), Machine, Rider, Player, Player Link (no Node, no Time sec shown).
   - Course banners: maps course names to your provided .webp images.
*/

const SRC_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?output=csv";
const SR_CSV  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?output=csv";

/* Mode detection from Category */
const TA_LABEL = /air\s*ride\s*time\s*attack/i;
const FR_LABEL = /air\s*ride\s*free\s*run/i;

/* Ruleset detection from Subcategory */
const RESTRICTED = /restricted/i;
const UNRESTRICTED = /unrestricted/i;

/* Banners: course name → filename (from your attachments) */
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
  let course = (parts[0] || "").trim();
  let ruleset = (parts[1] || "").trim();

  // Normalize ruleset via regex
  if (!ruleset){
    if (RESTRICTED.test(s)) ruleset = "Restricted";
    else if (UNRESTRICTED.test(s)) ruleset = "Unrestricted";
  } else {
    if (RESTRICTED.test(ruleset)) ruleset = "Restricted";
    else if (UNRESTRICTED.test(ruleset)) ruleset = "Unrestricted";
  }

  // Strip mode words from the course if present
  course = course.replace(/time\s*attack|free\s*run/ig,'').trim();

  // Final normalization (avoid duplicates like "Floria Fields +")
  course = course.replace(/\s*\+\s*$/,'').trim();

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

/* Render Speedrider horizontal strip (single row; scrollable) */
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
  }, { root: null, rootMargin: '0px 0px -60% 0px', threshold: 0.25 });

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
