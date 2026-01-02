
/* KARs Garage — Air Ride
 * - Valid <a> tags for SRC/Video cells and "Be the first!" links
 * - URL normalization and readable labels
 * - Speedrider sort triangles hidden until user clicks (like SRC tables)
 * - Red accent before times removed
 * - Correct rules parsing from column C "Subcategory" (check UNRESTRICTED first)
 */

const SRC_CSV   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?output=csv";
const SR_TA_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=1618721256&single=true&output=csv";
const SR_FR_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=109124482&single=true&output=csv";

const TA_LABEL = /time\s*attack/i;
const FR_LABEL = /free\s*run/i;
const RESTRICTED   = /\brestricted\b/i;
const UNRESTRICTED = /\bunrestricted\b/i;

/* Course order for TOC */
const COURSE_ORDER = [
  "Floria Fields","Waveflow Waters","Airtopia Ruins","Crystalline Fissure","Steamgust Forge",
  "Cavernous Corners","Cyberion Highway","Mount Amberfalls","Galactic Nova","Fantasy Meadows",
  "Celestial Valley","Sky Sands","Frozen Hillside","Magma Flows","Beanstalk Park",
  "Machine Passage","Checker Knights","Nebula Belt"
];

/* Banners */
const BANNERS = {
  "Airtopia Ruins": "images/airtopia_banner.webp",
  "Beanstalk Park": "images/beanstalk_banner.webp",
  "Cavernous Corners": "images/Cavernous_banner.webp",
  "Checker Knights": "images/checker_banner.webp",
  "Celestial Valley": "images/Celestial_banner.webp",
  "Crystalline Fissure":"images/Crystalline_banner.webp",
  "Cyberion Highway": "images/Cyberion_Banner.webp",
  "Fantasy Meadows": "images/Fantasy_banner.webp",
  "Floria Fields": "images/Floria_banner.webp",
  "Frozen Hillside": "images/Frozen_banner.webp",
  "Galactic Nova": "images/Nova_Banner.webp",
  "Machine Passage": "images/Machine_Banner.webp",
  "Magma Flows": "images/Magma_Banner.webp",
  "Mount Amberfalls": "images/Amberfalls_banner.webp",
  "Nebula Belt": "images/Nebula_Banner.webp",
  "Sky Sands": "images/Sky_Banner.webp",
  "Steamgust Forge": "images/Steamgust_Banner.webp",
  "Waveflow Waters": "images/Waveflow_Banner.webp"
};

/* --- "Be the first!" exact URLs (from SRC URLs.txt) --- */
const SRC_EMPTY_LINKS = {
  /* ... your existing TA/FR Restricted/Unrestricted maps ... left unchanged ... */
  TA: { /* omitted for brevity: same values you uploaded */ },
  FR: { /* omitted for brevity: same values you uploaded */ }
};

/* --- CSV parsing (minimal) --- */
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

/* --- Helpers --- */
function idxOf(header, colName){
  const i = header.findIndex(h => String(h).trim().toLowerCase() === String(colName).toLowerCase());
  return i < 0 ? null : i;
}
function makeAnchorId(name){
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

/* Normalize arbitrary URL-ish values to a safe, clickable URL */
function normalizeUrl(u){
  if (!u) return '';
  const raw = String(u).trim();

  // Already has protocol
  if (/^https?:\/\//i.test(raw)) return raw;

  // Missing colon after http/https (e.g., "https//youtu.be/..."): fix it
  if (/^https?\/\/(?=\w)/i.test(raw)) return raw.replace(/^https?/i, m => m + ':');

  // Starts with "www." or domain only: assume https
  if (/^www\./i.test(raw)) return 'https://' + raw;
  if (/^[a-z0-9\-_.]+\.[a-z]{2,}(?:\/|$)/i.test(raw)) return 'https://' + raw;

  // Fallback: leave as-is (will fail validation and render as plain text)
  return raw;
}

/* Create a human-friendly label for a URL */
function labelForUrl(u){
  try {
    const url = new URL(u);
    const path = url.pathname.replace(/\/+$/,'');
    const host = url.hostname.replace(/^www\./i,'');
    return host + (path && path !== '/' ? path : '');
  } catch {
    // Non-URL input: show trimmed raw value
    return String(u).replace(/^https?:\/\/(?:www\.)?/i,'');
  }
}

/* Build an anchor cell */
function linkCell(url){
  const href = normalizeUrl(url);
  if (!href) return '';
  const label = labelForUrl(href);
  return `${href}${label}</a>`;
}

/* Build empty-table link from exact map */
function buildSrcCategoryUrl(course, mode, rules){
  const byMode = SRC_EMPTY_LINKS[mode] || {};
  const byRule = byMode[rules] || {};
  return byRule[course] || '';
}

/* Parse time to ms for sorting */
function toMillis(t){
  const s = String(t ?? '').trim();
  let m;
  if ((m = s.match(/^(\d+)'(\d{2})"(\d{2,3})$/))){
    const mm = +m[1], ss = +m[2], frac = +m[3];
    const ms = m[3].length === 2 ? frac * 10 : frac;
    return (mm*60 + ss) * 1000 + ms;
  }
  if ((m = s.match(/^(\d+):(\d{2})\.(\d{3})$/))){
    const mm = +m[1], ss = +m[2], ms = +m[3];
    return (mm*60 + ss) * 1000 + ms;
  }
  if ((m = s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/))){
    const hh = +m[1], mm = +m[2], ss = +m[3], ms = +m[4];
    return ((hh*3600)+(mm*60)+ss)*1000 + ms;
  }
  return Number.POSITIVE_INFINITY;
}

/* --- SRC tables --- */
function renderSrcTable(mountId, rows, ctx){
  const mount = document.getElementById(mountId); if (!mount) return;
  const COLS = ["Player","Time","Machine","Rider","SRC Link","Video"];
  const colgroup = `
    <colgroup>
      <col style="width:18%">
      <col style="width:16%"><!-- Time -->
      <col style="width:18%">
      <col style="width:18%">
      <col style="width:15%">
      <col style="width:15%">
    </colgroup>
  `;
  let html = `<table class="table">${colgroup}<thead><tr>`;
  COLS.forEach(c => { html += `<th data-col="${c}">${c}<span class="sort-ind"></span></th>`; });
  html += '</tr></thead><tbody>';

  if (rows && rows.length){
    const sorted = rows.slice().sort((a,b) => (a._ms - b._ms));
    sorted.forEach(r => {
      html += '<tr>';
      html += `<td>${r.Player ?? ''}</td>`;
      html += `<td class="td--time">${r.Time ?? ''}</td>`;
      html += `<td>${r.Machine ?? ''}</td>`;
      html += `<td>${r.Rider ?? ''}</td>`;
      html += `<td>${linkCell(r.Link)}</td>`;
      html += `<td>${linkCell(r.Video)}</td>`;
      html += '</tr>';
    });
  } else {
    const url = buildSrcCategoryUrl(ctx.course, ctx.mode, ctx.rules);
    const linkHtml = url ? `${url}Be the first!</a>` : '';
    html += `<tr><td class="empty" colspan="${COLS.length}">
      <span class="empty-msg">
        <span>No runs submitted for this category.</span>
        ${linkHtml}
      </span>
    </td></tr>`;
  }
  html += '</tbody></table>';
  mount.innerHTML = html;

  // Click-sort
  const ths = mount.querySelectorAll('th'); let sortState = {};
  ths.forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-col');
      const dir = (sortState.col === col && sortState.dir === 'asc') ? 'desc' : 'asc';
      sortState = { col, dir };
      const tbody = mount.querySelector('tbody');
      const rowsEl = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.querySelector('.empty'));
      const idx = COLS.indexOf(col) + 1;
      rowsEl.sort((rA, rB) => {
        const a = rA.querySelector(`td:nth-child(${idx})`).textContent.trim();
        const b = rB.querySelector(`td:nth-child(${idx})`).textContent.trim();
        let cmp;
        if (col === 'Time'){ cmp = toMillis(a) - toMillis(b); }
        else { cmp = a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }); }
        return dir === 'asc' ? cmp : -cmp;
      });
      rowsEl.forEach(el => tbody.appendChild(el));
      mount.querySelectorAll('.sort-ind').forEach(i => i.textContent = '');
      th.querySelector('.sort-ind').textContent = dir === 'asc' ? '▲' : '▼';
    });
  });
}

/* --- Speedrider strips (aligned, compact, sortable) --- */
const SR_STATE = new Map(); // mountId -> { entries:[], sortKey:'time'|'machine'|'rider'|'player', dir:'asc'|'desc' }

function renderSpeedriderStrip(mountId, entries){
  const mount = document.getElementById(mountId); if (!mount) return;
  if (!entries || entries.length === 0){ mount.innerHTML = '<p class="muted">No data</p>'; return; }

  // Default sort: fastest time to the left (no arrow shown until user clicks)
  const sorted = entries.slice().sort((a,b) => {
    const ax = (typeof a._sec === 'number' && !isNaN(a._sec)) ? a._sec : Infinity;
    const bx = (typeof b._sec === 'number' && !isNaN(b._sec)) ? b._sec : Infinity;
    return ax - bx;
  });
  SR_STATE.set(mountId, { entries: sorted, sortKey:'time', dir:'asc' });

  mount.innerHTML = `
    <div class="sr-strip" data-mount="${mountId}">
      <div class="sr-left">
        <div class="sr-left-row" data-sort="time">Time <span class="sr-sort-ind"></span></div>
        <div class="sr-left-row" data-sort="machine">Machine <span class="sr-sort-ind"></span></div>
        <div class="sr-left-row" data-sort="rider">Rider <span class="sr-sort-ind"></span></div>
        <div class="sr-left-row" data-sort="player">Player <span class="sr-sort-ind"></span></div>
        <div class="sr-left-row" data-sort="link" aria-disabled="true">Link</div>
      </div>
      <div class="sr-records"></div>
    </div>
  `;
  paintSrRecords(mountId);

  // Sorting handlers (horizontal sort with ◀ ▶ arrows)
  const strip = mount.querySelector('.sr-strip');
  strip.querySelectorAll('.sr-left-row').forEach(row => {
    const key = row.getAttribute('data-sort');
    if (key === 'link') return; // non-sortable
    row.addEventListener('click', () => {
      const state = SR_STATE.get(mountId);
      let dir = 'asc';
      if (state.sortKey === key) dir = (state.dir === 'asc') ? 'desc' : 'asc';
      sortSr(mountId, key, dir);
      updateSrSortIndicators(strip, key, dir);
    });
  });
}

function updateSrSortIndicators(strip, activeKey, dir){
  strip.querySelectorAll('.sr-left-row .sr-sort-ind').forEach(ind => ind.textContent = '');
  const row = strip.querySelector(`.sr-left-row[data-sort="${activeKey}"] .sr-sort-ind`);
  if (row) row.textContent = dir === 'asc' ? '◀' : '▶';
}

function sortSr(mountId, key, dir){
  const state = SR_STATE.get(mountId);
  const entries = state.entries.slice();
  const cmpStr = (a,b) => a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' });
  let cmp;
  switch (key){
    case 'machine': cmp = (a,b) => cmpStr(a.Machine ?? '', b.Machine ?? ''); break;
    case 'rider':   cmp = (a,b) => cmpStr(a.Rider ?? '',   b.Rider ?? '');   break;
    case 'player':  cmp = (a,b) => cmpStr(a.Player ?? '',  b.Player ?? '');  break;
    case 'time':    cmp = (a,b) => {
      const ax = (typeof a._sec === 'number' && !isNaN(a._sec)) ? a._sec : Infinity;
      const bx = (typeof b._sec === 'number' && !isNaN(b._sec)) ? b._sec : Infinity;
      return ax - bx;
    }; break;
    default:        cmp = () => 0;
  }
  entries.sort((a,b) => (dir === 'asc' ? cmp(a,b) : -cmp(a,b)));
  SR_STATE.set(mountId, { entries, sortKey:key, dir });
  paintSrRecords(mountId);
}

function paintSrRecords(mountId){
  const strip = document.querySelector(`[data-mount="${mountId}"]`);
  const list = strip.querySelector('.sr-records');
  const { entries } = SR_STATE.get(mountId);
  list.innerHTML = entries.map((e, i) => {
    const cls = (i === 0) ? 'sr-col first' : (i === entries.length - 1 ? 'sr-col last' : 'sr-col');
    const playerHref = normalizeUrl(e["Player Link"] ?? '');
    const playerLink = playerHref ? `${playerHref}${labelForUrl(playerHref)}</a>` : '';
    return `
      <div class="${cls}">
        <div class="sr-time">${e.Time ?? ''}</div>
        <div class="sr-row">${e.Machine ?? ''}</div>
        <div class="sr-row">${e.Rider ?? ''}</div>
        <div class="sr-row">${e.Player ?? ''}</div>
        <div class="sr-row">${playerLink}</div>
      </div>
    `;
  }).join('');
}

/* --- Build Speedrider index from CSV --- */
function buildSrIndex(rows){
  const header = rows[0].map(h => String(h).trim());
  const IDX = {
    Course:     idxOf(header,"Course"),
    Machine:    idxOf(header,"Machine"),
    Rider:      idxOf(header,"Rider"),
    Player:     idxOf(header,"Player"),
    Time:       idxOf(header,"Time"),
    TimeSec:    idxOf(header,"Time (sec)"),
    PlayerLink: idxOf(header,"Player Link")
  };
  const byCourse = new Map();
  rows.slice(1).forEach(r => {
    const course = r[IDX.Course] ?? ''; if (!course) return;
    const entry = {
      "Time":       r[IDX.Time],
      "Machine":    r[IDX.Machine],
      "Rider":      r[IDX.Rider],
      "Player":     r[IDX.Player],
      "Player Link":r[IDX.PlayerLink],
      _sec: Number(r[IDX.TimeSec] ?? NaN)
    };
    if (!byCourse.has(course)) byCourse.set(course, []);
    byCourse.get(course).push(entry);
  });
  byCourse.forEach(arr => {
    arr.sort((a,b) => {
      const ax = (typeof a._sec === 'number' && !isNaN(a._sec)) ? a._sec : Infinity;
      const bx = (typeof b._sec === 'number' && !isNaN(b._sec)) ? b._sec : Infinity;
      return ax - bx;
    });
  });
  return byCourse;
}

/* --- MAIN --- */
async function loadAll(){
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  const [srcRes, srTaRes, srFrRes] = await Promise.all([
    fetch(SRC_CSV,   { cache:'no-cache' }),
    fetch(SR_TA_CSV, { cache:'no-cache' }),
    fetch(SR_FR_CSV, { cache:'no-cache' })
  ]);
  const [srcText, srTaText, srFrText] = await Promise.all([srcRes.text(), srTaRes.text(), srFrRes.text()]);
  const srcRows  = parseCSV(srcText);
  const srTaRows = parseCSV(srTaText);
  const srFrRows = parseCSV(srFrText);

  // Parse headers
  const srcHeader = srcRows[0].map(h => String(h).trim());
  const SRC_IDX = {
    Category:   idxOf(srcHeader,"Category"),
    Subcategory:idxOf(srcHeader,"Subcategory"), // Column C (course + rules)
    Machine:    idxOf(srcHeader,"Machine"),
    Rider:      idxOf(srcHeader,"Rider"),
    Player:     idxOf(srcHeader,"Player"),
    Time:       idxOf(srcHeader,"Time"),
    Link:       idxOf(srcHeader,"Link"),
    Video:      idxOf(srcHeader,"Video")
  };

  // Bucket SRC by course + mode + rules
  const srcByCourse = new Map();
  srcRows.slice(1).forEach(r => {
    const category = r[SRC_IDX.Category] ?? '';
    const subcat   = r[SRC_IDX.Subcategory] ?? '';
    if (!category || !subcat) return;

    const mode = TA_LABEL.test(category) ? 'TA' : (FR_LABEL.test(category) ? 'FR' : 'OTHER');
    if (mode === 'OTHER') return;

    // "Course + Rules" split by '+'
    const parts     = String(subcat).trim().replace(/\s*\+$/, '').split(/\s*\+\s*/);
    const course    = (parts[0] ?? '').trim();
    const rulesText = (parts[1] ?? '').trim() || subcat;

    // IMPORTANT: check UNRESTRICTED first (contains "restricted")
    let rules = '';
    if (UNRESTRICTED.test(rulesText))      rules = 'Unrestricted';
    else if (RESTRICTED.test(rulesText))   rules = 'Restricted';
    if (!course || !rules) return;

    const rowObj = {
      Player: r[SRC_IDX.Player],
      Time:   r[SRC_IDX.Time],
      Machine:r[SRC_IDX.Machine],
      Rider:  r[SRC_IDX.Rider],
      Link:   normalizeUrl(r[SRC_IDX.Link]),
      Video:  normalizeUrl(r[SRC_IDX.Video]),
      _ms:    toMillis(r[SRC_IDX.Time])
    };
    if (!srcByCourse.has(course)) {
      srcByCourse.set(course, { TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]} });
    }
    srcByCourse.get(course)[mode][rules].push(rowObj);
  });

  // Sort SRC lists
  for (const course of srcByCourse.keys()){
    ['TA','FR'].forEach(m => ['Restricted','Unrestricted'].forEach(rule => {
      srcByCourse.get(course)[m][rule].sort((a,b) => a._ms - b._ms);
    }));
  }

  // Speedrider indices
  const srTaByCourse = buildSrIndex(srTaRows);
  const srFrByCourse = buildSrIndex(srFrRows);

  // Mount points
  const content = document.getElementById('content');
  const nav     = document.getElementById('course-nav');

  // Course ordering + TOC (with legacy divider)
  const courseSet = new Set([...srcByCourse.keys(), ...srTaByCourse.keys(), ...srFrByCourse.keys()]);
  const orderedCourses = COURSE_ORDER.filter(c => courseSet.has(c));

  let navHtml = '';
  orderedCourses.forEach(course => {
    const id = makeAnchorId(course);
    if (course === 'Fantasy Meadows'){
      navHtml += '<div class="legacy-sep" aria-hidden="true"></div>';
    }
    navHtml += `#${id}${course}</a>`;
  });
  nav.innerHTML = navHtml;

  const sectionIds = [];
  orderedCourses.forEach(courseName => {
    const id = makeAnchorId(courseName);
    sectionIds.push(id);
    const srcCourse = srcByCourse.get(courseName) ?? { TA:{Restricted:[],Unrestricted:[]}, FR:{Restricted:[],Unrestricted:[]} };
    const srTaCourse = srTaByCourse.get(courseName) ?? [];
    const srFrCourse = srFrByCourse.get(courseName) ?? [];

    // Section
    const sec = document.createElement('section');
    sec.className = 'course';

    // Banner
    const bannerPath = BANNERS[courseName] ?? '';
    sec.innerHTML = `
      <span id="${id}" class="anchor"></span>
      <figure class="banner-wrap">
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

    // Inject banner image
    const fig = sec.querySelector('.banner-wrap');
    if (bannerPath){
      const img = document.createElement('img');
      img.className = 'course-banner';
      img.src = bannerPath;
      img.alt = `${courseName} banner`;
      fig.insertBefore(img, fig.firstChild);
    }
    content.appendChild(sec);

    // Render SRC tables (pass context for empty-state link)
    renderSrcTable(`${id}-ta-r`, srcCourse.TA.Restricted,   { course:courseName, mode:'TA', rules:'Restricted'   });
    renderSrcTable(`${id}-ta-u`, srcCourse.TA.Unrestricted, { course:courseName, mode:'TA', rules:'Unrestricted' });
    renderSrcTable(`${id}-fr-r`, srcCourse.FR.Restricted,   { course:courseName, mode:'FR', rules:'Restricted'   });
    renderSrcTable(`${id}-fr-u`, srcCourse.FR.Unrestricted, { course:courseName, mode:'FR', rules:'Unrestricted' });

    // Speedrider strips (sortable)
    renderSpeedriderStrip(`${id}-sr-ta`, srTaCourse);
    renderSpeedriderStrip(`${id}-sr-fr`, srFrCourse);
  });

  setupScrollSpy(sectionIds);

  // Smooth scroll for TOC clicks
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
}

/* Scroll‑spy */
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

document.addEventListener('DOMContentLoaded', loadAll);
