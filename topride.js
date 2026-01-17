
/*
 * KARs Garage — Top Ride (IL + Full Mode)
 * - SRC tab: "Top Ride - Top 3 (All Subcategories)" (gid=1440461112)
 * - Speedrider tabs:
 *     "Speedrider - Top Ride Time Attack WRs" (gid=600831483)
 *     "Speedrider - Top Ride Free Run WRs"    (gid=1030452206)
 * - IL rules: Restricted / Legendaries  (NOT Unrestricted)
 * - Full Mode (Category === "Top Ride"):
 *     All Tracks, All Tracks (Legendaries), All Tracks (No Dupes), 100 Checkboxes, 100%
 */

/* === Remote CSVs (your GIDs) === */
const SRC_CSV   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?gid=1440461112&single=true&output=csv";
const SR_TA_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=600831483&single=true&output=csv";
const SR_FR_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=1030452206&single=true&output=csv";

/* === Mode and rules matchers === */
const TA_LABEL = /time\s*attack/i;
const FR_LABEL = /free\s*run/i;
const RESTRICTED   = /\brestricted\b/i;
const LEGENDARIES  = /\blegendaries\b/i;

/* === Full Mode (Category === "Top Ride") === */
const FG_LABEL = /^top\s*ride$/i;

/* Full Mode routes for Top Ride (stable IDs + anchors) */
const FG_ROUTES = [
  "All Tracks",
  "All Tracks (Legendaries)",
  "All Tracks (No Dupes)",
  "100 Checkboxes",
  "100%"
];

const FG_IDS = {
  "All Tracks":                "fg-all-tracks",
  "All Tracks (Legendaries)":  "fg-all-tracks-legendaries",
  "All Tracks (No Dupes)":     "fg-all-tracks-nodupes",
  "100 Checkboxes":            "fg-100-checkboxes",
  "100%":                      "fg-100"
};

const FG_ANCHORS = {
  "All Tracks":                "tr-full-all-tracks",
  "All Tracks (Legendaries)":  "tr-full-all-tracks-legendaries",
  "All Tracks (No Dupes)":     "tr-full-all-tracks-nodupes",
  "100 Checkboxes":            "tr-full-100-checkboxes",
  "100%":                      "tr-full-100"
};

/* === Top Ride course order (IL) === */
const COURSE_ORDER = [
  "Flower", "Flow", "Air", "Crystal", "Steam", "Cave", "Cyber", "Mountain", "Nova"
];

/* === Banners (IL) === */
const BANNERS = {
  "Flower":   "images/TR_Flower_Banner.webp",
  "Flow":     "images/TR_Flow_Banner.webp",
  "Air":      "images/TR_Air_Banner.webp",
  "Crystal":  "images/TR_Crystal_Banner.webp",
  "Steam":    "images/TR_Steam_Banner.webp",
  "Cave":     "images/TR_Cave_Banner.webp",
  "Cyber":    "images/TR_Cyber_Banner.webp",
  "Mountain": "images/TR_Mountain_Banner.webp",
  "Nova":     "images/TR_Nova_Banner.webp",
};

/* === ICONS (reuse; safe even if rows omit Machine/Rider) === */
const ICONS_BY_LABEL = (window.ICONS_BY_LABEL) || { rider: {}, machine: {} };
const ICONS_BY_KEY   = (window.ICONS_BY_KEY)   || { rider: {}, machine: {} };

/* === Helpers (same as Air Ride) === */
function normKey(s){return String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function esc(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function iconSrc(kind,label){const byLabel=ICONS_BY_LABEL[kind]?.[label]; if(byLabel) return byLabel; const key=normKey(label); return ICONS_BY_KEY[kind]?.[key]??null;}
function buildIconCell(kind,value){
  const label=String(value??'');
  const src=iconSrc(kind,label);
  if(src){
    return { cls:`cell--${kind} has-icon`, html: `
      <span class="cell-icon" aria-hidden="true"><img src="${src}" alt="" /></span>
      <span class="cell-text">${esc(label)}</span>
    ` };
  }
  return { cls:`cell--${kind}`, html:`<span class="cell-text">${esc(label)}</span>` };
}
function parseCSV(text){const rows=[];let row=[],cur='',inQ=false;for(let i=0;i<text.length;i++){const ch=text[i],nx=text[i+1];if(inQ){if(ch==='"'&&nx==='"'){cur+='"';i++;}else if(ch==='"'){inQ=false;}else{cur+=ch;}}else{if(ch==='"')inQ=true;else if(ch===','){row.push(cur);cur='';}else if(ch==='\r'){}else if(ch==='\n'){row.push(cur);rows.push(row);row=[];cur='';}else{cur+=ch;}}}if(cur.length||row.length){row.push(cur);rows.push(row);}return rows.filter(r=>r.length&&r.some(v=>String(v).trim().length));}
function idxOf(header,col){const i=header.findIndex(h=>String(h).trim().toLowerCase()===String(col).toLowerCase()); return i<0?null:i;}
function makeAnchorId(name){return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function normalizeUrl(u){if(!u) return ''; const raw=String(u).trim(); if(/^https?:\/\//i.test(raw)) return raw; if(/^https?\/\/(?=\w)/i.test(raw)) return raw.replace(/^https?/i,m=>m+':'); if(/^www\./i.test(raw)) return 'https://'+raw; if(/^[a-z0-9\-_.]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return 'https://'+raw; return raw;}
function labelForUrl(u){try{const url=new URL(u);const path=url.pathname.replace(/\/+$/,'');const host=url.hostname.replace(/^www\./i,'');return host+(path&&path!=='/'?path:'');}catch{return String(u).replace(/^https?:\/\/(?:www\.)?/i,'');}}
function preferEnglishUrl(u){const href=normalizeUrl(u); if(!href) return ''; try{const url=new URL(href); if(/^(.+\.)?speedrider\.coresv\.net$/i.test(url.hostname)){url.searchParams.set('lang','en'); return url.toString();} return href;}catch{return href;}}
function linkCell(url){const href=normalizeUrl(url); if(!href) return ''; const label=labelForUrl(href); return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;}
function toMillis(t){const s=String(t??'').trim(); let m; if((m=s.match(/^(\d+)'(\d{2})"(\d{2,3})$/))){const mm=+m[1], ss=+m[2], frac=+m[3]; const ms=m[3].length===2?frac*10:frac; return (mm*60+ss)*1000+ms;} if((m=s.match(/^(\d+):(\d{2})\.(\d{3})$/))){const mm=+m[1], ss=+m[2], ms=+m[3]; return (mm*60+ss)*1000+ms;} if((m=s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/))){const hh=+m[1], mm=+m[2], ss=+m[3], ms=+m[4]; return ((hh*3600)+(mm*60)+ss)*1000+ms;} return Number.POSITIVE_INFINITY;}

/* === "Be the first!" direct SRC links (Top Ride ILs) === */
const SRC_EMPTY_LINKS = {
  TA: {
    Restricted: {
      "Flower":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Flower&variable_Rules=Restricted",
      "Flow":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Flow&variable_Rules=Restricted",
      "Air":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Air&variable_Rules=Restricted",
      "Crystal":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Crystal&variable_Rules=Restricted",
      "Steam":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Steam&variable_Rules=Restricted",
      "Cave":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Cave&variable_Rules=Restricted",
      "Cyber":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Cyber&variable_Rules=Restricted",
      "Mountain":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Mountain&variable_Rules=Restricted",
      "Nova":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Nova&variable_Rules=Restricted"
    },
    Legendaries: {
      "Flower":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Flower&variable_Rules=Legendaries",
      "Flow":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Flow&variable_Rules=Legendaries",
      "Air":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Air&variable_Rules=Legendaries",
      "Crystal":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Crystal&variable_Rules=Legendaries",
      "Steam":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Steam&variable_Rules=Legendaries",
      "Cave":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Cave&variable_Rules=Legendaries",
      "Cyber":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Cyber&variable_Rules=Legendaries",
      "Mountain":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Mountain&variable_Rules=Legendaries",
      "Nova":"https://www.speedrun.com/kars/runs/new?category=Time_Attack&variable_Course=Nova&variable_Rules=Legendaries"
    }
  },
  FR: {
    Restricted: {
      "Flower":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Flower&variable_Rules=Restricted",
      "Flow":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Flow&variable_Rules=Restricted",
      "Air":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Air&variable_Rules=Restricted",
      "Crystal":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Crystal&variable_Rules=Restricted",
      "Steam":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Steam&variable_Rules=Restricted",
      "Cave":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Cave&variable_Rules=Restricted",
      "Cyber":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Cyber&variable_Rules=Restricted",
      "Mountain":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Mountain&variable_Rules=Restricted",
      "Nova":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Nova&variable_Rules=Restricted"
    },
    Legendaries: {
      "Flower":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Flower&variable_Rules=Legendaries",
      "Flow":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Flow&variable_Rules=Legendaries",
      "Air":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Air&variable_Rules=Legendaries",
      "Crystal":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Crystal&variable_Rules=Legendaries",
      "Steam":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Steam&variable_Rules=Legendaries",
      "Cave":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Cave&variable_Rules=Legendaries",
      "Cyber":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Cyber&variable_Rules=Legendaries",
      "Mountain":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Mountain&variable_Rules=Legendaries",
      "Nova":"https://www.speedrun.com/kars/runs/new?category=Free_Run&variable_Course=Nova&variable_Rules=Legendaries"
    }
  }
};

function buildSrcCategoryUrl(course, mode, rules){
  const byMode = SRC_EMPTY_LINKS[mode] ?? {};
  const byRule = byMode[rules] ?? {};
  return byRule[course] ?? '';
}

/* === SRC table rendering ===
   - IL tables show Machine/Rider
   - FG tables hide Machine/Rider (hideMR:true) */
function renderSrcTable(mountId, rows, ctx) {
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const HIDE_MR = !!(ctx && ctx.hideMR);

  const COLS = HIDE_MR
    ? ["Player","Time","SRC Link","Video"]
    : ["Player","Time","Machine","Rider","SRC Link","Video"];

  const colgroup = HIDE_MR
    ? `
      <colgroup>
        <col style="width:28%"><col style="width:20%"><col style="width:26%"><col style="width:26%">
      </colgroup>
    `
    : `
      <colgroup>
        <col style="width:18%"><col style="width:16%"><col style="width:18%"><col style="width:18%"><col style="width:15%"><col style="width:15%">
      </colgroup>
    `;

  const tableClass = HIDE_MR ? 'table table--fg' : 'table table--il';
  let html = `<div class="table-scroll"><table class="${tableClass}">${colgroup}<thead><tr>`;
  COLS.forEach(c => { html += `<th data-col="${c}">${c}<span class="sort-ind"></span></th>`; });
  html += '</tr></thead><tbody>';

  if (rows && rows.length) {
    const sorted = rows.slice().sort((a,b) => (a._ms - b._ms));
    sorted.forEach(r => {
      html += '<tr>';
      html += `<td>${r.Player ?? ''}</td>`;
      html += `<td class="td--time">${r.Time ?? ''}</td>`;
      if (!HIDE_MR) {
        const mCell = buildIconCell('machine', r.Machine);
        const rCell = buildIconCell('rider',   r.Rider);
        html += `<td class="${mCell.cls}">${mCell.html}</td>`;
        html += `<td class="${rCell.cls}">${rCell.html}</td>`;
      }
      html += `<td>${linkCell(r.Link)}</td>`;
      html += `<td>${linkCell(r.Video)}</td>`;
      html += '</tr>';
    });
  } else {
    const emptyUrl = (ctx && ctx.mode === 'FG')
      ? 'https://www.speedrun.com/kars/runs/new'
      : buildSrcCategoryUrl(ctx.course, ctx.mode, ctx.rules);

    const linkHtml = emptyUrl ? `<a href="${emptyUrl}" target="_blank" rel="noopener">Be the first!</a>` : '';
    html += `<tr><td class="empty" colspan="${COLS.length}">
      <span class="empty-msg">
        <span>No runs submitted for this category.</span>
        ${linkHtml}
      </span>
    </td></tr>`;
  }

  html += '</tbody></table></div>';
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
        if (col === 'Time') { cmp = toMillis(a) - toMillis(b); }
        else { cmp = a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }); }
        return dir === 'asc' ? cmp : -cmp;
      });
      rowsEl.forEach(el => tbody.appendChild(el));
      mount.querySelectorAll('.sort-ind').forEach(i => i.textContent = '');
      th.querySelector('.sort-ind').textContent = dir === 'asc' ? '▲' : '▼';
    });
  });
}

/* === Speedrider strips (same as Air Ride) === */
const SR_STATE = new Map();

function renderSpeedriderStrip(mountId, entries) {
  const mount = document.getElementById(mountId); if (!mount) return;
  if (!entries || entries.length === 0) { mount.innerHTML = '<p class="muted">No data</p>'; return; }

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

  const strip = mount.querySelector('.sr-strip');
  strip.querySelectorAll('.sr-left-row').forEach(row => {
    const key = row.getAttribute('data-sort');
    if (key === 'link') return;
    row.addEventListener('click', () => {
      const state = SR_STATE.get(mountId);
      let dir = 'asc';
      if (state.sortKey === key) dir = (state.dir === 'asc') ? 'desc' : 'asc';
      sortSr(mountId, key, dir);
      updateSrSortIndicators(strip, key, dir);
    });
  });
}

function updateSrSortIndicators(strip, activeKey, dir) {
  strip.querySelectorAll('.sr-left-row .sr-sort-ind').forEach(ind => ind.textContent = '');
  const row = strip.querySelector(`.sr-left-row[data-sort="${activeKey}"] .sr-sort-ind`);
  if (row) row.textContent = dir === 'asc' ? '◀' : '▶';
}
function sortSr(mountId, key, dir) {
  const state = SR_STATE.get(mountId);
  const entries = state.entries.slice();
  const cmpStr = (a,b) => a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' });
  let cmp;
  switch (key) {
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
function paintSrRecords(mountId) {
  const strip = document.querySelector(`[data-mount="${mountId}"]`);
  const list = strip.querySelector('.sr-records');
  const { entries } = SR_STATE.get(mountId);

  list.innerHTML = entries.map((e, i) => {
    const cls = (i === 0) ? 'sr-col first' : (i === entries.length - 1 ? 'sr-col last' : 'sr-col');
    const rawHref = normalizeUrl(e["Node Link"] ?? '') || normalizeUrl(e["Player Link"] ?? '');
    const nodeHref = preferEnglishUrl(rawHref);
    const linkHtml = nodeHref ? `<a href="${nodeHref}" target="_blank" rel="noopener">${labelForUrl(nodeHref)}</a>` : '';
    return `
      <div class="${cls}">
        <div class="sr-time">${e.Time ?? ''}</div>
        <div class="sr-row">${e.Machine ?? ''}</div>
        <div class="sr-row">${e.Rider ?? ''}</div>
        <div class="sr-row">${e.Player ?? ''}</div>
        <div class="sr-row">${linkHtml}</div>
      </div>
    `;
  }).join('');
}

/* Build Speedrider per-course index (same columns as Air Ride WR sheets) */
function buildSrIndex(rows) {
  const header = rows[0].map(h => String(h).trim());
  const IDX = {
    Course:     idxOf(header,"Course"),
    Machine:    idxOf(header,"Machine"),
    Rider:      idxOf(header,"Rider"),
    Player:     idxOf(header,"Player"),
    Time:       idxOf(header,"Time"),
    TimeSec:    idxOf(header,"Time (sec)"),
    NodeLink:   idxOf(header,"Node Link"),
    PlayerLink: idxOf(header,"Player Link")
  };
  const byCourse = new Map();
  rows.slice(1).forEach(r => {
    const course = r[IDX.Course] ?? ''; if (!course) return;
    const entry = {
      "Time":        r[IDX.Time],
      "Machine":     r[IDX.Machine],
      "Rider":       r[IDX.Rider],
      "Player":      r[IDX.Player],
      "Node Link":   r[IDX.NodeLink],
      "Player Link": r[IDX.PlayerLink],
      _sec: Number(r[IDX.TimeSec] ?? NaN)
    };
    if (!byCourse.has(course)) byCourse.set(course, []);
    byCourse.get(course).push(entry);
  });
  return byCourse;
}

/* === MAIN === */
async function loadAll() {
  // Footer year
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

  const srcHeader = srcRows[0].map(h => String(h).trim());
  const SRC_IDX = {
    Category:    idxOf(srcHeader,"Category"),
    Subcategory: idxOf(srcHeader,"Subcategory"),
    Machine:     idxOf(srcHeader,"Machine"),
    Rider:       idxOf(srcHeader,"Rider"),
    Player:      idxOf(srcHeader,"Player"),
    Time:        idxOf(srcHeader,"Time"),
    Link:        idxOf(srcHeader,"Link"),
    Video:       idxOf(srcHeader,"Video")
  };

  // Collections for Full Mode
  const fgMap = new Map(FG_ROUTES.map(r => [r, []])); // route -> rows[]

  // Build SRC by Course -> { TA:{Restricted,Legendaries}, FR:{Restricted,Legendaries} }
  const srcByCourse = new Map();

  srcRows.slice(1).forEach(r => {
    const category = r[SRC_IDX.Category] ?? '';
    const subcat   = r[SRC_IDX.Subcategory] ?? '';
    if (!category || !subcat) return;

    // Full Mode (Category === "Top Ride")
    if (FG_LABEL.test(category)) {
      const route = String(subcat).trim(); // e.g., "All Tracks", "100%"
      if (!route) return;

      const rowObj = {
        Player:  r[SRC_IDX.Player],
        Time:    r[SRC_IDX.Time],
        Machine: r[SRC_IDX.Machine], // kept in data; hidden in FG tables
        Rider:   r[SRC_IDX.Rider],
        Link:    normalizeUrl(r[SRC_IDX.Link]),
        Video:   normalizeUrl(r[SRC_IDX.Video]),
        _ms:     toMillis(r[SRC_IDX.Time])
      };

      if (fgMap.has(route)) fgMap.get(route).push(rowObj);
      return; // do not fall through to IL (TA/FR) logic
    }

    // IL: TA/FR
    const mode =
      TA_LABEL.test(category) ? 'TA' :
      FR_LABEL.test(category) ? 'FR' : 'OTHER';
    if (mode === 'OTHER') return;

    const parts = String(subcat).trim().replace(/\s*\+$/, '').split(/\s*\+\s*/);
    const course = (parts[0] ?? '').trim();
    const rulesText = (parts[1] ?? '').trim() || subcat;

    let rules = '';
    if (LEGENDARIES.test(rulesText)) rules = 'Legendaries';
    else if (RESTRICTED.test(rulesText)) rules = 'Restricted';
    if (!course || !rules) return;

    const rowObj = {
      Player:  r[SRC_IDX.Player],
      Time:    r[SRC_IDX.Time],
      Machine: r[SRC_IDX.Machine],
      Rider:   r[SRC_IDX.Rider],
      Link:    normalizeUrl(r[SRC_IDX.Link]),
      Video:   normalizeUrl(r[SRC_IDX.Video]),
      _ms:     toMillis(r[SRC_IDX.Time])
    };

    if (!srcByCourse.has(course)) {
      srcByCourse.set(course, { TA:{Restricted:[],Legendaries:[]}, FR:{Restricted:[],Legendaries:[]} });
    }
    srcByCourse.get(course)[mode][rules].push(rowObj);
  });

  const srTaByCourse = buildSrIndex(srTaRows);
  const srFrByCourse = buildSrIndex(srFrRows);

  const content = document.getElementById('content');
  const nav     = document.getElementById('course-nav');

  const courseSet = new Set([...srcByCourse.keys(), ...srTaByCourse.keys(), ...srFrByCourse.keys()]);
  const orderedCourses = COURSE_ORDER.filter(c => courseSet.has(c));

  /* === TOC build: IL + Full Mode === */
  const sectionIds = [];
  let navHtml = '<div class="toc-title">Individual Levels</div>';
  orderedCourses.forEach(course => {
    const id = makeAnchorId(course);
    navHtml += `<a href="#${id}" class="toc-item indent">${course}</a>`;
  });

  // Full Mode anchors
  navHtml += '<div class="toc-title">Full Mode</div>';
  FG_ROUTES.forEach(route => {
    navHtml += `<a href="#${FG_ANCHORS[route]}" class="toc-item indent">${route}</a>`;
  });
  nav.innerHTML = navHtml;

  // Register FG anchor IDs for scroll spy
  sectionIds.push(...FG_ROUTES.map(r => FG_ANCHORS[r]));

  /* === Build IL sections === */
  orderedCourses.forEach(courseName => {
    const id = makeAnchorId(courseName);
    sectionIds.push(id);

    const srcCourse  = srcByCourse.get(courseName) ?? { TA:{Restricted:[],Legendaries:[]}, FR:{Restricted:[],Legendaries:[]} };
    const srTaCourse = srTaByCourse.get(courseName) ?? [];
    const srFrCourse = srFrByCourse.get(courseName) ?? [];

    const sec = document.createElement('section');
    sec.className = 'course';

    const bannerPath = BANNERS[courseName] ?? '';

    sec.innerHTML = `
      <span id="${id}" class="anchor"></span>
      <figure class="banner-wrap">
        ${bannerPath ? `<img class="course-banner" src="${bannerPath}" alt="${courseName} banner" />` : ''}
        <figcaption class="banner-title">${courseName}</figcaption>
      </figure>
      <div class="tables-grid">
        <article class="table-card"><h3>Time Attack - Restricted</h3><div id="${id}-ta-r"></div></article>
        <article class="table-card"><h3>Time Attack - Legendaries</h3><div id="${id}-ta-l"></div></article>
        <article class="table-card"><h3>Free Run - Restricted</h3><div id="${id}-fr-r"></div></article>
        <article class="table-card"><h3>Free Run - Legendaries</h3><div id="${id}-fr-l"></div></article>
        <article class="table-card wide"><h3>Speedrider - Time Attack Records by Machine</h3><div id="${id}-sr-ta"></div></article>
        <article class="table-card wide"><h3>Speedrider - Free Run Records by Machine</h3><div id="${id}-sr-fr"></div></article>
      </div>
      <hr class="section-divider" />
    `;

    content.appendChild(sec);

    renderSrcTable(`${id}-ta-r`, srcCourse.TA.Restricted,   { course:courseName, mode:'TA', rules:'Restricted'   });
    renderSrcTable(`${id}-ta-l`, srcCourse.TA.Legendaries,  { course:courseName, mode:'TA', rules:'Legendaries'  });
    renderSrcTable(`${id}-fr-r`, srcCourse.FR.Restricted,   { course:courseName, mode:'FR', rules:'Restricted'   });
    renderSrcTable(`${id}-fr-l`, srcCourse.FR.Legendaries,  { course:courseName, mode:'FR', rules:'Legendaries'  });

    renderSpeedriderStrip(`${id}-sr-ta`, srTaCourse);
    renderSpeedriderStrip(`${id}-sr-fr`, srFrCourse);
  });

  /* === FULL MODE section === */
  const fgSec = document.createElement('section');
  fgSec.className = 'course';
  fgSec.innerHTML = `
    <span id="${FG_ANCHORS["All Tracks"]}" class="anchor"></span>
    <figure class="banner-wrap">
      <img class="course-banner" src="images/misc_banner.webp" alt="Full Mode banner" />
      <figcaption class="banner-title">Full Mode</figcaption>
    </figure>

    <div class="tables-grid">
      <!-- Row 1 -->
      <article class="table-card">
        <h3>All Tracks</h3>
        <div id="${FG_IDS["All Tracks"]}"></div>
      </article>

      <article class="table-card">
        <h3>All Tracks (Legendaries)</h3>
        <div id="${FG_IDS["All Tracks (Legendaries)"]}"></div>
      </article>

      <!-- Row 2 -->
      <article class="table-card">
        <h3>All Tracks (No Dupes)</h3>
        <div id="${FG_IDS["All Tracks (No Dupes)"]}"></div>
      </article>

      <article class="table-card">
        <span id="${FG_ANCHORS["100 Checkboxes"]}" class="anchor"></span>
        <h3>100 Checkboxes</h3>
        <div id="${FG_IDS["100 Checkboxes"]}"></div>
      </article>

      <!-- Row 3 -->
      <article class="table-card">
        <span id="${FG_ANCHORS["100%"]}" class="anchor"></span>
        <h3>100%</h3>
        <div id="${FG_IDS["100%"]}"></div>
      </article>
    </div>
    <hr class="section-divider" />
  `;
  content.appendChild(fgSec);

  // Paint the FG tables (hide Machine/Rider; custom empty link)
  FG_ROUTES.forEach(route => {
    const rows = fgMap.get(route) ?? [];
    renderSrcTable(FG_IDS[route], rows, { mode:'FG', hideMR:true, course:route, rules:route });
  });

  setupScrollSpy(sectionIds);

  // Smooth scroll for TOC links
  nav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior:'smooth', block:'start' });
    });
  });
}

function setupScrollSpy(sectionIds) {
  const uniqueIds = [...new Set(sectionIds)];
  const links = uniqueIds
    .map(id => ({ id, el: document.querySelector(`#course-nav a[href="#${id}"]`) }))
    .filter(x => x.el);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const id = entry.target.id;
      const link = links.find(l => l.id === id)?.el; if (!link) return;
      if (entry.isIntersecting) {
        links.forEach(l => l.el.classList.remove('active'));
        link.classList.add('active');
      }
    });
  }, { root:null, rootMargin:'0px 0px -60% 0px', threshold:0.25 });

  uniqueIds.forEach(id => {
    const anchor = document.getElementById(id);
    if (anchor) observer.observe(anchor);
  });
}

document.addEventListener('DOMContentLoaded', loadAll);
