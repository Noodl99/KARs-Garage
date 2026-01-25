
/*
 * KARs Garage — City Trial
 * - Renders Time-Based Stadiums, Score-Based Stadiums, and Full Mode from SRC
 * - Table layout consistent with Air Ride: Player, Time, Machine, Rider, SRC Link, Video
 * - Uses your existing table/TOC styling and scroll spy (script.js)
 */

/* === Remote CSV === */
const SRC_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?gid=1831544535&single=true&output=csv";

/* === Category matchers === */
const CAT_TIME  = /time[- ]*based\s*stadiums?/i;
const CAT_SCORE = /score[- ]*based\s*stadiums?/i;
const CAT_CITY  = /city\s*trial/i; // full mode (per-game)

/* === Family orders (as requested) === */
const TIME_FAMILIES  = ["VS. Boss", "Drag Race", "Oval Circuit", "Rail Panic", "Beam Gauntlet"];
const SCORE_FAMILIES = ["Kirby Melee", "Dustup Derby", "Big Battle", "Air Glider", "High Jump", "Gourmet Race", "Button Rush", "Skydive"];

/* === Canonical Stadium Level lists (render tables even if no submissions) === */
// Time-Based Stadiums
const TIME_LEVELS = {
  "VS. Boss": [
    "VS. Gigantes",
    "VS. Robo Dedede",
    "VS. Nightmare",
    "VS. Zero Two",
    "VS. Marx"
  ],
  "Drag Race":      ["Drag Race 1","Drag Race 2","Drag Race 3","Drag Race 4"],
  "Oval Circuit":   ["Oval Circuit"],
  "Rail Panic":     ["Rail Panic"],
  "Beam Gauntlet":  ["Beam Gauntlet 1","Beam Gauntlet 2"]
};

// Score-Based Stadiums
const SCORE_LEVELS = {
  "Kirby Melee":   ["Kirby Melee 1","Kirby Melee 2"],
  "Dustup Derby":  ["Dustup Derby 1","Dustup Derby 2","Dustup Derby 3","Dustup Derby 4","Dustup Derby 5"],
  "Big Battle":    ["Big Battle 1","Big Battle 2","Big Battle 3"],
  "Air Glider":    ["Air Glider"],
  "High Jump":     ["High Jump"],
  "Gourmet Race":  ["Gourmet Race"],
  "Button Rush":   ["Button Rush 1","Button Rush 2"],
  "Skydive":       ["Skydive 1","Skydive 2"]
};

/* === Score-based families → measurement type === */
const SCORE_UNIT_BY_FAMILY = {
  "Kirby Melee": "KOs",
  "Dustup Derby": "KOs",
  "Big Battle": "KOs",

  "Air Glider": "Yards",
  "High Jump":  "Yards",

  "Gourmet Race": "Points",
  "Button Rush":  "Points",
  "Skydive":      "Points"
};

/* Parse hh:mm:ss.mmm (or mm:ss.mmm) into components */
function parseHMS(str){
  const s = String(str || "").trim();
  let m;

  // hh:mm:ss.mmm
  m = s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/);
  if (m) return { h:+m[1], m:+m[2], s:+m[3], ms:+m[4] };

  // mm:ss.mmm
  m = s.match(/^(\d+):(\d{2})\.(\d{3})$/);
  if (m) return { h:0, m:+m[1], s:+m[2], ms:+m[3] };

  // Fallback to totals (shouldn’t happen with your sheet)
  const totalMs = toMillis(s);
  const hh = Math.floor(totalMs / 3600000);
  const mm = Math.floor((totalMs % 3600000) / 60000);
  const ss = Math.floor((totalMs % 60000) / 1000);
  const ms = Math.floor(totalMs % 1000);
  return { h:hh, m:mm, s:ss, ms };
}

/* Convert encoded time → numeric score + display text */
function decodeScoreValue(timeStr, unit){
  const { h, m, s, ms } = parseHMS(timeStr);

  if (unit === "KOs" || unit === "Points") {
    // value is total milliseconds
    const totalMs = (h*3600 + m*60 + s) * 1000 + ms;
    const label = new Intl.NumberFormat('en-US').format(totalMs);
    return { num: totalMs, label };
  }

  if (unit === "Yards") {
    // yards = (hours*60 + minutes)*1000 + seconds*10 + floor(ms/100) + (ms%100)/100
    const totalMinutes = (h * 60) + m;
    const onesFromMs   = Math.floor(ms / 100); // 0..9
    const twoDecimals  = (ms % 100) / 100;     // .00 .. .99
    const yards = totalMinutes * 1000 + (s * 10) + onesFromMs + twoDecimals;
    const label = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(yards);
    return { num: yards, label };
  }

  // Default: treat like time (shouldn’t reach here for score families)
  return { num: toMillis(timeStr) * -1, label: timeStr }; // negative so larger sorts first if accidentally used
}


/* === Banners (from your screenshot) === */
const BANNERS = {
  "VS. Boss":       "images/CT_VS_Boss.webp",
  "Drag Race":      "images/CT_Drag_Race.webp",
  "Oval Circuit":   "images/CT_Oval_Circuit.webp",
  "Rail Panic":     "images/CT_Rail_Panic.webp",
  "Beam Gauntlet":  "images/CT_Beam_Gauntlet.webp",

  "Kirby Melee":    "images/CT_Kirby_Melee.webp",
  "Dustup Derby":   "images/CT_Dustup_Derby.webp",
  "Big Battle":     "images/CT_Big_Battle.webp",
  "Air Glider":     "images/CT_Air_Glider.webp",
  "High Jump":      "images/CT_High_Jump.webp",
  "Gourmet Race":   "images/CT_Gourmet_Race.webp",
  "Button Rush":    "images/CT_Button_Rush.webp",
  "Skydive":        "images/CT_Skydive.webp",

  "Full Mode":      "images/CT_Full_Mode.webp"
};

/* === Full Mode route order (2×2) === */
const FULL_MODE_ORDER = [
  "100 Checkboxes",
  "100%",
  "Stadium Blitz",
  "5 Hot Dogs"
];

// Canonicalize CT Full Mode route labels (collapse spaces; "100 %" -> "100%")
function canonCTRoute(name) {
  const s = String(name || '')
    .trim()
    .replace(/\uFF05/g, '%')   // full-width percent (％) -> ASCII %
    .replace(/\s+/g, ' ');
  // Keep the space-before-% fix too
  return s.replace(/\s+%$/, '%');
}

// For quick membership checks
const FULL_MODE_HIDE_MR = new Set(FULL_MODE_ORDER); // these do not show Machine/Rider

/* === Icon maps (reused approach) === */
const ICONS_BY_LABEL = {
  rider: {
    'Pink Kirby':'icons/riders/KARs_Kirby_icon.png',
    'Yellow/Green Kirby':'icons/riders/KARs_Kirby_Yellow_icon.png',
    'Blue/Gray Kirby':'icons/riders/KARs_Kirby_Blue_icon.png',
    'Red/Purple Kirby':'icons/riders/KARs_Kirby_Red_icon.png',
    'King Dedede':'icons/riders/KARs_King_Dedede_icon.png',
    'Meta Knight':'icons/riders/KARs_Meta_Knight_icon.png',
    'Waddle Dee':'icons/riders/KARs_Waddle_Dee_icon.png',
    'Bandana Dee':'icons/riders/KARs_Bandana_Waddle_Dee_icon.png',
    'Waddle Doo':'icons/riders/KARs_Waddle_Doo_icon.png',
    'Chef Kawasaki':'icons/riders/KARs_Chef_Kawasaki_icon.png',
    'Knuckle Joe':'icons/riders/KARs_Knuckle_Joe_icon.png',
    'Rick':'icons/riders/KARs_Rick_icon.png',
    'Gooey':'icons/riders/KARs_Gooey_icon.png',
    'Cappy':'icons/riders/KARs_Cappy_icon.png',
    'Rocky':'icons/riders/KARs_Rocky_icon.png',
    'Scarfy':'icons/riders/KARs_Scarfy_icon.png',
    'Starman':'icons/riders/KARs_Starman_icon.png',
    'Lololo & Lalala':'icons/riders/KARs_Lololo_%26_Lalala_icon.png',
    'Marx':'icons/riders/KARs_Marx_icon.png',
    'Daroach':'icons/riders/KARs_Daroach_icon.png',
    'Magolor':'icons/riders/KARs_Magolor_icon.png',
    'Taranza':'icons/riders/KARs_Taranza_icon.png',
    'Susie':'icons/riders/KARs_Susie_icon.png',
    'Noir Dedede':'icons/riders/KARs_Noir_Dedede_icon.png',
  },
  machine: {
    'Warp':'icons/machines/KARs_Warp_Star_Icon.png',
    'Compact':'icons/machines/KARs_Compact_Star_Icon.png',
    'Winged':'icons/machines/KARs_Winged_Star_Icon.png',
    'Shadow':'icons/machines/KARs_Shadow_Star_Icon.png',
    'Wagon':'icons/machines/KARs_Wagon_Star_Icon.png',
    'Slick':'icons/machines/KARs_Slick_Star_Icon.png',
    'Formula':'icons/machines/KARs_Formula_Star_Icon.png',
    'Bulk':'icons/machines/KARs_Bulk_Star_Icon.png',
    'Rocket':'icons/machines/KARs_Rocket_Star_Icon.png',
    'Swerve':'icons/machines/KARs_Swerve_Star_Icon.png',
    'Turbo':'icons/machines/KARs_Turbo_Star_Icon.png',
    'Jet':'icons/machines/KARs_Jet_Star_Icon.png',
    'Wheelie Bike':'icons/machines/KARs_Wheelie_Bike_Icon.png',
    'Rex Wheelie':'icons/machines/KARs_Rex_Wheeler_Icon.png',
    'Wheelie Scooter':'icons/machines/KARs_Wheelie_Scooter_Icon.png',
    'Hop':'icons/machines/KARs_Hop_Star_Icon.png',
    'Vampire':'icons/machines/KARs_Vampire_Star_Icon.png',
    'Paper':'icons/machines/KARs_Paper_Star_Icon.png',
    'Chariot':'icons/machines/KARs_Chariot_Icon.png',
    'Battle Chariot':'icons/machines/KARs_Battle_Chariot_Icon.png',
    'Tank':'icons/machines/KARs_Tank_Star_Icon.png',
    'Bull Tank':'icons/machines/KARs_Bull_Tank_Icon.png',
    'Transform':'icons/machines/KARs_Transform_Star_Icon.png',
    'Dragoon':'icons/machines/KARs_Dragoon_Icon.png',
    'Hydra':'icons/machines/KARs_Hydra_Icon.png',
    'Leo':'icons/machines/KARs_Leo_Icon.png',
    'Gigantes':'icons/machines/KARs_Gigantes_Icon.png',
  }
};
const ICONS_BY_KEY = {
  rider: Object.fromEntries(Object.entries(ICONS_BY_LABEL.rider).map(([k,v]) => [normKey(k), v])),
  machine: Object.fromEntries(Object.entries(ICONS_BY_LABEL.machine).map(([k,v]) => [normKey(k), v]))
};

/* === Helpers (copy of patterns you already use) === */
function normKey(s){
  return String(s ?? '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'');
}
function esc(s){
  return String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function iconSrc(kind, label){
  const exact = ICONS_BY_LABEL[kind]?.[label];
  if (exact) return exact;
  const key = normKey(label);
  return ICONS_BY_KEY[kind]?.[key] ?? null;
}
function buildIconCell(kind, value){
  const label = String(value ?? '');
  const src = iconSrc(kind, label);
  if (src) {
    return {
      cls: `cell--${kind} has-icon`,
      html: `
        <span class="cell-icon" aria-hidden="true"><img src="${src}" alt="" /></span>
        <span class="cell-text">${esc(label)}</span>
      `
    };
  }
  return { cls:`cell--${kind}`, html:`<span class="cell-text">${esc(label)}</span>` };
}

function parseCSV(text){
  const rows = []; let row=[], cur='', inQ=false;
  for (let i=0;i<text.length;i++){
    const ch=text[i], nx=text[i+1];
    if (inQ){
      if (ch === '"' && nx === '"'){ cur+='"'; i++; }
      else if (ch === '"'){ inQ=false; }
      else { cur+=ch; }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ','){ row.push(cur); cur=''; }
      else if (ch === '\r'){ /* swallow */ }
      else if (ch === '\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
      else { cur+=ch; }
    }
  }
  if (cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r => r.length && r.some(v => String(v).trim().length));
}
function idxOf(header, name){
  const i = header.findIndex(h => String(h).trim().toLowerCase() === String(name).toLowerCase());
  return i < 0 ? null : i;
}
function normalizeUrl(u){
  if (!u) return '';
  const raw = String(u).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^https?\/\/(?=\w)/i.test(raw)) return raw.replace(/^https?/i, m => m + ':');
  if (/^www\./i.test(raw)) return 'https://' + raw;
  if (/^[a-z0-9\-_.]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return 'https://' + raw;
  return raw;
}
function labelForUrl(u){
  try{
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./i,'');
    const path = url.pathname.replace(/\/+$/,'');
    return host + (path && path !== '/' ? path : '');
  } catch {
    return String(u).replace(/^https?:\/\/(?:www\.)?/i,'');
  }
}
function linkCell(url){
  const href = normalizeUrl(url);
  if (!href) return '';
  return `<a href="${href}" target="_blank" rel="noopener">${labelForUrl(href)}</a>`;
}
function toMillis(t){
  const s = String(t ?? '').trim(); let m;
  if ((m = s.match(/^(\d+):(\d{2})\.(\d{3})$/))) {
    const mm=+m[1], ss=+m[2], ms=+m[3]; return (mm*60+ss)*1000+ms;
  }
  if ((m = s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/))) {
    const hh=+m[1], mm=+m[2], ss=+m[3], ms=+m[4]; return ((hh*3600)+(mm*60)+ss)*1000+ms;
  }
  if ((m = s.match(/^(\d+)'(\d{2})"(\d{2,3})$/))) {
    const mm=+m[1], ss=+m[2], f=+m[3], ms=(m[3].length===2? f*10 : f); return (mm*60+ss)*1000+ms;
  }
  return Number.POSITIVE_INFINITY;
}

/* Map a Level string to one of the ordered families */
function familyFor(level){
  const s = String(level ?? '');

  if (/^vs\.\s*/i.test(s))          return "VS. Boss";
  if (/^drag\s*race\b/i.test(s))    return "Drag Race";
  if (/^oval\s*circuit\b/i.test(s)) return "Oval Circuit";
  if (/^rail\s*panic\b/i.test(s))   return "Rail Panic";
  if (/^beam\s*gauntlet\b/i.test(s))return "Beam Gauntlet";

  if (/^kirby\s*melee\b/i.test(s))  return "Kirby Melee";
  if (/^dustup\s*derby\b/i.test(s)) return "Dustup Derby";
  if (/^big\s*battle\b/i.test(s))   return "Big Battle";
  if (/^air\s*glider\b/i.test(s))   return "Air Glider";
  if (/^high\s*jump\b/i.test(s))    return "High Jump";
  if (/^gourmet\s*race\b/i.test(s)) return "Gourmet Race";
  if (/^button\s*rush\b/i.test(s))  return "Button Rush";
  if (/^skydive\b/i.test(s))        return "Skydive";

  return null;
}

/* Render a simple SRC Top-3 table */


function renderSrcTable(mountId, rows, opts){
  const mount = document.getElementById(mountId);
  if (!mount) return;

  const HIDE_MR = !!(opts && opts.hideMR);
  const MEASURE = (opts && opts.measure) || null; // "KOs" | "Yards" | "Points" | null

  // Choose headers: if score-based, rename "Time" -> measure label
  const COLS = HIDE_MR
    ? (MEASURE ? ["Player", MEASURE, "SRC Link", "Video"] : ["Player", "Time", "SRC Link", "Video"])
    : (MEASURE ? ["Player", MEASURE, "Machine", "Rider", "SRC Link", "Video"]
               : ["Player", "Time", "Machine", "Rider", "SRC Link", "Video"]);

  const colgroup = HIDE_MR
    ? `
      <colgroup>
        <col style="width:28%">
        <col style="width:20%">
        <col style="width:26%">
        <col style="width:26%">
      </colgroup>
    `
    : `
      <colgroup>
        <col style="width:18%">
        <col style="width:16%">
        <col style="width:18%">
        <col style="width:18%">
        <col style="width:15%">
        <col style="width:15%">
      </colgroup>
    `;

  let html = `
    <div class="table-scroll">
      <table class="table ${HIDE_MR ? 'table--fg' : 'table--il'}">
        ${colgroup}
        <thead><tr>${COLS.map(c=>`<th data-col="${c}">${c}<span class="sort-ind"></span></th>`).join('')}</tr></thead>
        <tbody>
  `;

  if (rows && rows.length){
    // Precompute display + numeric for sorting
    const prepared = rows.map(r => {
      if (MEASURE) {
        const conv = decodeScoreValue(r.Time, MEASURE); // { num, label }
        return { r, _num: conv.num, _label: conv.label };
      } else {
        return { r, _ms: (typeof r._ms === 'number' ? r._ms : toMillis(r.Time)) };
      }
    });

    // Sort: score tables → descending; time tables → ascending
    if (MEASURE) prepared.sort((a,b)=> b._num - a._num);
    else         prepared.sort((a,b)=> a._ms - b._ms);

    // Rows
    for (const x of prepared){
      const r = x.r;

      if (HIDE_MR){
        // Full Mode (hide Machine/Rider) — not score-based today, but safe
        const valCell = MEASURE
          ? `<td class="td--score" data-num="${x._num}">${esc(x._label)}</td>`
          : `<td class="td--time">${esc(r.Time ?? '')}</td>`;

        html += `
          <tr>
            <td>${esc(r.Player ?? '')}</td>
            ${valCell}
            <td>${linkCell(r.Link)}</td>
            <td>${linkCell(r.Video)}</td>
          </tr>
        `;
      } else {
        if (MEASURE){
          // Score-based stadiums: show measurement + keep Machine/Rider
          const mCell = buildIconCell('machine', r.Machine);
          const rCell = buildIconCell('rider',   r.Rider);
          html += `
            <tr>
              <td>${esc(r.Player ?? '')}</td>
              <td class="td--score" data-num="${x._num}">${esc(x._label)}</td>
              <td class="${mCell.cls}">${mCell.html}</td>
              <td class="${rCell.cls}">${rCell.html}</td>
              <td>${linkCell(r.Link)}</td>
              <td>${linkCell(r.Video)}</td>
            </tr>
          `;
        } else {
          // Time-based tables (unchanged)
          const mCell = buildIconCell('machine', r.Machine);
          const rCell = buildIconCell('rider',   r.Rider);
          html += `
            <tr>
              <td>${esc(r.Player ?? '')}</td>
              <td class="td--time">${esc(r.Time ?? '')}</td>
              <td class="${mCell.cls}">${mCell.html}</td>
              <td class="${rCell.cls}">${rCell.html}</td>
              <td>${linkCell(r.Link)}</td>
              <td>${linkCell(r.Video)}</td>
            </tr>
          `;
        }
      }
    }
  } else {
    const emptyUrl = 'https://www.speedrun.com/kars/runs/new';
    html += `<tr><td class="empty" colspan="${COLS.length}">
      <span class="empty-msg">
        <span>No runs submitted for this category.</span>
        <a href="${emptyUrl}" target="_blank" rel="noopener">Be the first!</a>
      </span>
    </td></tr>`;
  }

  html += `</tbody></table></div>`;
  mount.innerHTML = html;


  // Click-sort (robust for Time and Score columns)
  {
    const ths = mount.querySelectorAll('th');
    let sortState = {};
  
    // Helper: numeric value to sort for a cell/column
    function cellSortNum(colLabel, cellEl) {
      if (!cellEl) return Number.NaN;
  
      // Score tables put a numeric key on the measurement cell
      // e.g., <td class="td--score" data-num="2121.89">2,121.89</td>
      const numAttr = cellEl.getAttribute('data-num');
      if (numAttr != null) {
        const v = Number(numAttr);
        return Number.isFinite(v) ? v : Number.NaN;
      }
  
      // Time column (string like 00:02:12.189)
      if (/^time$/i.test(colLabel)) {
        const raw = cellEl.textContent.trim();
        const ms  = toMillis(raw);
        return Number.isFinite(ms) ? ms : Number.NaN;
      }
  
      // For text columns, we sort lexicographically in a second pass
      return Number.NaN;
    }
  
    // Helper: text value for lexicographic fallback
    function cellSortText(cellEl) {
      return (cellEl ? cellEl.textContent.trim() : '');
    }
  
    ths.forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');              // "Time", "KOs", "Feet", "Points", "Player", etc.
        const dir = (sortState.col === col && sortState.dir === 'asc') ? 'desc' : 'asc';
        sortState = { col, dir };

        const tbody = mount.querySelector('tbody');
        const rowsEl = Array.from(tbody.querySelectorAll('tr')).filter(tr => !tr.querySelector('.empty'));
        if (rowsEl.length <= 1) return; // nothing to do

        // Column index (1-based) by current header set
        const headers = Array.from(mount.querySelectorAll('thead th')).map(h => h.getAttribute('data-col'));
        const idx = headers.indexOf(col) + 1;
        if (idx <= 0) return;

        rowsEl.sort((rA, rB) => {
          const aCell = rA.querySelector(`td:nth-child(${idx})`);
          const bCell = rB.querySelector(`td:nth-child(${idx})`);

          // 1) Try numeric compare (data-num for score or millis for Time)
          const aNum = cellSortNum(col, aCell);
          const bNum = cellSortNum(col, bCell);
          let cmp;

          if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
            cmp = aNum - bNum;
          } else {
            // 2) Fallback to text compare (Player/Machine/Rider/links)
            const aTxt = cellSortText(aCell);
            const bTxt = cellSortText(bCell);
            cmp = aTxt.localeCompare(bTxt, undefined, { numeric: true, sensitivity: 'base' });
          }
          return dir === 'asc' ? cmp : -cmp;
        });

        // Re-append in the new order
        rowsEl.forEach(el => tbody.appendChild(el));

        // Update carets
        mount.querySelectorAll('.sort-ind').forEach(i => i.textContent = '');
        th.querySelector('.sort-ind').textContent = dir === 'asc' ? '▲' : '▼';
      });
    });
  }
}
/* Build a section (banner + a grid of per-level tables) for one family */

function renderFamilySection(anchorId, title, groups){
  const content = document.getElementById('content');
  const sec = document.createElement('section');
  sec.className = 'course';

  const banner = BANNERS[title] || '';
  const tables = [];

  // Build per-level cards (create the DOM first)
  const levelNames = Array.from(groups.keys())
    .sort((a,b)=>a.localeCompare(b, undefined, { numeric:true }));

  for (const level of levelNames){
    const id = `${anchorId}-${normKey(level)}`;
    tables.push(`
      <article class="table-card">
        <h3>${esc(level)}</h3>
        <div id="${id}"></div>
      </article>
    `);
  }

  sec.innerHTML = `
    <span id="${anchorId}" class="anchor"></span>
    <figure class="banner-wrap">
      ${banner ? `<img class="course-banner" src="${banner}" alt="${esc(title)} banner" />` : ''}
      <figcaption class="banner-title">${esc(title)}</figcaption>
    </figure>
    <div class="tables-grid">${tables.join('')}</div>
    <hr class="section-divider" />
  `;
  content.appendChild(sec);

  // Now that mount points exist, paint the tables.
  // For score-based families, pass the measurement ("KOs" | "Yards" | "Points")
  const measure = SCORE_UNIT_BY_FAMILY[title] || null;
  for (const level of levelNames){
    const id = `${anchorId}-${normKey(level)}`;
    renderSrcTable(id, groups.get(level), { measure });
  }
}

/* Build the Full Mode section in a fixed 2×2 order and hide MR on those routes */
function renderFullModeSection(anchorId, routesMap){
  const content = document.getElementById('content');
  const sec = document.createElement('section');
  sec.className = 'course';

  const banner = BANNERS["Full Mode"] || '';
  const cards = [];

  // 1) Take the fixed order first, but only include routes that exist in the data map.
  const orderedExisting = FULL_MODE_ORDER.filter(name => routesMap.has(name));

  // 2) If there are other CT Full-Mode routes present, append them after the fixed four (alphabetically).
  const extras = Array.from(routesMap.keys())
    .filter(name => !FULL_MODE_ORDER.includes(name))
    .sort((a,b) => a.localeCompare(b, undefined, { numeric:true }));

  const routeNames = [...orderedExisting, ...extras];

  // Build cards (we’ll naturally render 2 per row via your existing CSS grid)
  for (const route of routeNames){
    const id = `${anchorId}-${normKey(route)}`;
    cards.push(`
      <article class="table-card">
        <h3>${esc(route)}</h3>
        <div id="${id}"></div>
      </article>
    `);
  }

  sec.innerHTML = `
    <span id="${anchorId}" class="anchor"></span>
    <figure class="banner-wrap">
      ${banner ? `<img class="course-banner" src="${banner}" alt="Full Mode banner" />` : ''}
      <figcaption class="banner-title">Full Mode</figcaption>
    </figure>
    <div class="tables-grid">${cards.join('')}</div>
    <hr class="section-divider" />
  `;
  content.appendChild(sec);

  // Paint the tables (hide MR for the four primary routes)
  for (const route of routeNames){
    const mountId = `${anchorId}-${normKey(route)}`;
    const hideMR = FULL_MODE_HIDE_MR.has(route);
    renderSrcTable(mountId, routesMap.get(route), { hideMR });
  }
}


/* MAIN */
async function loadCT(){
  // footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  const res = await fetch(SRC_CSV, { cache:'no-cache' });
  const text = await res.text();
  const rows = parseCSV(text);
  const header = rows[0].map(h => String(h).trim());

  const IDX = {
    Category: idxOf(header, "Category"),
    Level:    idxOf(header, "Level"),
    Subcat:   idxOf(header, "Subcategory"),
    Machine:  idxOf(header, "Machine"),
    Rider:    idxOf(header, "Rider"),
    Player:   idxOf(header, "Player"),
    Time:     idxOf(header, "Time"),
    Link:     idxOf(header, "Link"),
    Video:    idxOf(header, "Video")
  };


// === Buckets (pre-seeded with expected Level names) ===
const timeFamilies  = new Map(TIME_FAMILIES.map(f => [f, new Map()]));
const scoreFamilies = new Map(SCORE_FAMILIES.map(f => [f, new Map()]));
const fullMode      = new Map(); // route (subcat) -> rows[]

// Seed all four so they render even with no data
FULL_MODE_ORDER.forEach(name => { if (!fullMode.has(name)) fullMode.set(name, []); });

// Seed Time-Based families with their known Level names
TIME_FAMILIES.forEach(f => {
  const levels = timeFamilies.get(f);
  const expected = TIME_LEVELS[f] || [];
  expected.forEach(name => { if (!levels.has(name)) levels.set(name, []); });
});

// Seed Score-Based families with their known Level names
SCORE_FAMILIES.forEach(f => {
  const levels = scoreFamilies.get(f);
  const expected = SCORE_LEVELS[f] || [];
  expected.forEach(name => { if (!levels.has(name)) levels.set(name, []); });
});


// === Partition rows (use SUBCATEGORY for Stadium level names) ===
rows.slice(1).forEach(r => {
  const cat    = String(r[IDX.Category] ?? '');
  const level  = String(r[IDX.Level] ?? '');
  const subcat = String(r[IDX.Subcat] ?? '');

  const rowObj = {
    Player:  r[IDX.Player],
    Time:    r[IDX.Time],
    Machine: r[IDX.Machine],
    Rider:   r[IDX.Rider],
    Link:    r[IDX.Link],
    Video:   r[IDX.Video],
    _ms:     toMillis(r[IDX.Time])
  };

  // --- TIME-BASED STADIUMS ---
  if (CAT_TIME.test(cat)) {
    // Stadium level name is in Subcategory (e.g., "VS. Gigantes", "Drag Race 1")
    const stadLevel = subcat.trim() || level.trim();
    if (!stadLevel) return;

    // Map to family using the stage name
    const fam = familyFor(stadLevel);
    if (fam && timeFamilies.has(fam)) {
      const levels = timeFamilies.get(fam);
      if (!levels.has(stadLevel)) levels.set(stadLevel, []);
      levels.get(stadLevel).push(rowObj);
      return;
    }

    // Fallback: drop under first Time family if familyFor() didn't match (unlikely)
    const fallbackFam = TIME_FAMILIES[0];
    const levels = timeFamilies.get(fallbackFam);
    const name = stadLevel || '(Unlabeled Level)';
    if (!levels.has(name)) levels.set(name, []);
    levels.get(name).push(rowObj);
    return;
  }

  // --- SCORE-BASED STADIUMS ---
  if (CAT_SCORE.test(cat)) {
    // Stadium level name is in Subcategory (e.g., "Kirby Melee 1", "Skydive 2")
    const stadLevel = subcat.trim() || level.trim();
    if (!stadLevel) return;

    const fam = familyFor(stadLevel);
    if (fam && scoreFamilies.has(fam)) {
      const levels = scoreFamilies.get(fam);
      if (!levels.has(stadLevel)) levels.set(stadLevel, []);
      levels.get(stadLevel).push(rowObj);
      return;
    }

    const fallbackFam = SCORE_FAMILIES[0];
    const levels = scoreFamilies.get(fallbackFam);
    const name = stadLevel || '(Unlabeled Level)';
    if (!levels.has(name)) levels.set(name, []);
    levels.get(name).push(rowObj);
    return;
  }

  // --- FULL MODE (per-game) ---
  // These have Category like "City Trial" and the route name in Subcategory; Level is empty.
  if (CAT_CITY.test(cat) && !level) {
    const route = canonCTRoute(subcat.trim() || level.trim());
    if (!route) return;
    if (!fullMode.has(route)) fullMode.set(route, []);
    fullMode.get(route).push(rowObj);
    return;
  }

  // Otherwise ignore (not a City Trial family we render here)
});


  /* === Build TOC === */
  const nav = document.getElementById('course-nav');
  const sectionIds = [];


  // Time-Based Stadiums
  let navHtml = `<div class="toc-title">Time-Based Stadiums</div>`;
  TIME_FAMILIES.forEach(fam => {
    const id = `time-${normKey(fam)}`;
    sectionIds.push(id);
    navHtml += `<a href="#${id}" class="toc-item indent">${fam}</a>`;
  });


  // Score-Based Stadiums
  navHtml += `<div class="toc-title">Score-Based Stadiums</div>`;
  SCORE_FAMILIES.forEach(fam => {
    const id = `score-${normKey(fam)}`;
    sectionIds.push(id);
    navHtml += `<a href="#${id}" class="toc-item indent">${fam}</a>`;
  });




// Full Mode (always listed)
const id = `full-mode`;
sectionIds.push(id);
navHtml += `<div class="toc-title">Full Mode</div>`;
FULL_MODE_ORDER.forEach(name => {
  const rid = `${id}-${normKey(name)}`;
  sectionIds.push(rid);
  navHtml += `<a href="#${rid}" class="toc-item indent">${name}</a>`;
});



  nav.innerHTML = navHtml;

  /* === Render sections === */

  TIME_FAMILIES.forEach(fam => {
    const levels = timeFamilies.get(fam) || new Map();
    const anchorId = `time-${normKey(fam)}`;
    renderFamilySection(anchorId, fam, levels);
  });

  SCORE_FAMILIES.forEach(fam => {
    const levels = scoreFamilies.get(fam) || new Map();
    const anchorId = `score-${normKey(fam)}`;
    renderFamilySection(anchorId, fam, levels);
  });


  renderFullModeSection('full-mode', fullMode);

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

function setupScrollSpy(sectionIds){
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

document.addEventListener('DOMContentLoaded', loadCT);
