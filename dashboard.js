
// ===== KARs Garage - Home Dashboard (Step 2B) =====
//
// Sources:
// - SRC (Top 3 outputs, published CSVs)
// - Speedrider (TA/FR, published CSVs)
// - Category Extensions (Apps Script JSON)
// Widgets (in this step):
// - Latest Record (any place, any mode)
// - Record Spotlight (6-hour seeded random, any place, any mode)
// - All-Tracks vs Combined IL deltas (Air Ride, Top Ride)
//
// Notes:
// - We compute Place for Cat-Ex as per-category rank (1,2,3,...) so it can join filters.
// - We dedup across SRC/Speedrider primarily by video ID, then by a fingerprint.
// - Spotlight is deterministic per 6-hour window (aligned to your :30 cadence).

/* ===================== 0) CONFIG ===================== */

// --- Cat-Ex JSON (Approved only) ---
const CE_JSON_URL =
  'https://script.google.com/macros/s/AKfycbwFOHu7-yoVDVYZ22_ankIxrq-Xk4ktp2Dm9fpUnuxUh5ATkLJcOy3_72HdrPK_5KVh/exec';


// --- SRC CSV endpoints (Top 3 outputs you already publish) ---
const SRC_CSV_AIR_RIDE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?gid=1706390795&single=true&output=csv';

const SRC_CSV_TOP_RIDE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?gid=1440461112&single=true&output=csv';

const SRC_CSV_CITY_TRIAL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?gid=1831544535&single=true&output=csv';

const SRC_CSV_ROAD_TRIP =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?gid=433573429&single=true&output=csv';

const SRC_CSV_EXTRAS_FULL_GAME =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?gid=787244572&single=true&output=csv';

// Spotlight/Latest policy: include Speedrider rows or not?
const INCLUDE_SPEEDRIDER_IN_SPOTLIGHT = false; // set true only if we later parse node pages


// (If any gid above differs in your repo, adjust just those URLs. We’ll only
// use the header names to map fields; order doesn’t matter.)

// --- Speedrider CSV endpoints (Air Ride only per your importer) ---
const SR_TA_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=1618721256&single=true&output=csv';
const SR_FR_CSV =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=109124482&single=true&output=csv';
const SR_TA_CSV_TR =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=600831483&single=true&output=csv';
const SR_FR_CSV_TR =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLLtoztu41AtY4reRXwNd00WqxhlFyTbn3RKoBwssrf1fXFGAZxO2b1dB62-0lrUOz4yi1dLuJrmml/pub?gid=1030452206&single=true&output=csv';

// 6-hour spotlight cadence aligned to your :30 refreshes:
const SPOTLIGHT_ROLLOVER_HOURS = 6;

/* ============== 1) Small, local helpers ============== */

const norm = (s) => String(s ?? '').trim();
const toNum = (x) => (x == null || x === '' ? null : (isNaN(+x) ? null : +x));
const toSec = (s) => (typeof s === 'number' ? s : toNum(s));

function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i + 1];
    if (inQ) {
      if (ch === '"' && nx === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQ = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\r') { /* ignore */ }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else { cur += ch; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length && r.some(v => norm(v).length));
}


function parseVideoId(url) {
  const u = String(url ?? '').trim();
  if (!u) return null;
  try {
    // YouTube (watch?v=…, youtu.be/…, /embed/…)
    const ytWatch = u.match(/[?&]v=([\w-]{11})/);
    const ytShort = u.match(/youtu\.be\/([\w-]{11})/);
    const ytEmbed = u.match(/youtube\.com\/embed\/([\w-]{11})/);
    if (ytWatch || ytShort || ytEmbed) {
      return { platform: 'youtube', id: (ytWatch?.[1] || ytShort?.[1] || ytEmbed?.[1]) };
    }
    // Twitch VOD
    const tw = u.match(/twitch\.tv\/videos\/(\d+)/i);
    if (tw) return { platform: 'twitch', id: tw[1] };
  } catch {}
  return null;
}

const fingerprint = (r) => {
  // round to 0.001 sec to avoid float jitter
  const t = r.TimeSec != null ? (+r.TimeSec).toFixed(3) : '';
  const player = norm(r.Player).normalize('NFKD').replace(/[^\w ]/g,'').toLowerCase();
  return [
    norm(r.Track),
    norm(r.CategoryBucket),
    norm(r.Machine),
    norm(r.Rider),
    t,
    player,
  ].join('|');
};



function categoryBucketFrom(category) {
  const c = norm(category).toLowerCase();

  // Stadium sheets often have category labels like "Time-Based Stadiums" or "Score-Based Stadiums"
  if (/time[- ]*based\s*stadiums?/i.test(c) || /score[- ]*based\s*stadiums?/i.test(c) || /\bstadiums?\b/i.test(c)) {
    return 'City Trial - Stadiums';
  }
  // City Trial per-game sheet
  if (/^city\s*trial$/i.test(c)) {
    return 'City Trial - Full Mode';
  }

  // Air Ride / Top Ride IL + Full Mode
  if (c.startsWith('air ride time attack')) return 'Air Ride - Time Attack';
  if (c.startsWith('air ride free run'))   return 'Air Ride - Free Run';
  if (c === 'air ride')                    return 'Air Ride - Full Mode';

  if (c.startsWith('top ride time attack')) return 'Top Ride - Time Attack';
  if (c.startsWith('top ride free run'))    return 'Top Ride - Free Run';
  if (c === 'top ride')                     return 'Top Ride - Full Mode';

  // Road Trip (full-game set)
  if (/road\s*trip/i.test(c)) return 'Road Trip';

  // Fallback
  return 'Category Extensions';
}



function seededIndex(len) {
  if (!len) return 0;
  const now = new Date();
  // Chunk into 6-hour windows (00:00, 06:00, 12:00, 18:00)
  const windowIndex = Math.floor(now.getHours() / SPOTLIGHT_ROLLOVER_HOURS);
  // Day + window → deterministic seed for the current 6h period
  const seed = +`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${windowIndex}`;
  let x = (seed * 9301 + 49297) % 233280;
  return Math.floor((x / 233280) * len);
}

/* ============== 2) Loaders (fetch sources) ============== */

async function fetchCSV(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status} ${url}`);
  const text = await res.text();
  return parseCSV(text);
}

async function fetchCatEx() {
  const res = await fetch(CE_JSON_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`CatEx fetch failed: ${res.status}`);
  const data = await res.json(); // object keyed by category OR array
  return Array.isArray(data) ? data : Object.values(data).flat();
}

/* ============== 3) Canonicalizers per source ============== */

function adaptSRC(rows, label) {
  if (!rows.length) return [];
  const header = rows[0].map(h => norm(h));
  const idx = (name) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const IDX = {
    Category: idx('Category'),
    Level: idx('Level'),
    Subcategory: idx('Subcategory'),
    Machine: idx('Machine'),
    Rider: idx('Rider'),
    Place: idx('Place'),
    Player: idx('Player'),
    TimeSec: idx('Time (sec)'),
    Time: idx('Time'),
    Date: idx('Date'),
    Link: idx('Link'),
    Video: idx('Video'),
  };

  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const category = norm(r[IDX.Category]);
    const subcat = norm(r[IDX.Subcategory]);
    const machine = norm(r[IDX.Machine]);
    const rider = norm(r[IDX.Rider]);
    const player = norm(r[IDX.Player]);
    const place = toNum(r[IDX.Place]);
    const timeStr = norm(r[IDX.Time]);
    const timeSec = toSec(r[IDX.TimeSec]);
    const date = norm(r[IDX.Date]);
    const srcLink = norm(r[IDX.Link]);
    const video = norm(r[IDX.Video]);

    // Track: derived from Subcategory (first token before " + " if present)
    // e.g., "Checker Knights + Restricted" → "Checker Knights"
    const track = subcat.split(/\s*\+\s*/)[0] || '';

    out.push({
      Category: category,
      CategoryBucket: categoryBucketFrom(category),
      Track: track,
      SubcategoryRaw: subcat,  
      Machine: machine,
      Rider: rider,
      Player: player,
      Place: place,
      Time: timeStr,
      TimeSec: timeSec,
      Date: date,
      Link: srcLink, // SRC link
      Video: video,
      Source: 'SRC',
      Label: label || '', // which output tab we pulled from
    });
  }
  return out;
}


function adaptSpeedrider(rows, modeLabel, segment /* 'Air Ride' | 'Top Ride' */) {
  if (!rows.length) return [];
  const header = rows[0].map(h => norm(h));
  const idx = (name) => header.findIndex(h => h.toLowerCase() === name.toLowerCase());

  const IDX = {
    Course:   idx('Course'),
    Machine:  idx('Machine'),
    Rider:    idx('Rider'),
    Player:   idx('Player'),
    Time:     idx('Time'),
    TimeSec:  idx('Time (sec)'),
    NodeLink: idx('Node Link'),
    PlayerLink: idx('Player Link'),
  };
  
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r       = rows[i];
    const course  = norm(r[IDX.Course]);
    const machine = norm(r[IDX.Machine]);
    const rider   = norm(r[IDX.Rider]);
    const player  = norm(r[IDX.Player]);
    const timeStr = norm(r[IDX.Time]);
    const nodeLink= norm(r[IDX.NodeLink]);

    // Convert SR time to seconds; prefer provided numeric column, else parse mm'ss"ff/fff
    let timeSec = toSec(r[IDX.TimeSec]);
    if (timeSec == null) {
      const parsed = parseSrTimeToSec(timeStr);  // ← your helper
      if (parsed != null) timeSec = parsed;
    }

    out.push({
      Category: `${segment} ${modeLabel}`,
      CategoryBucket: categoryBucketFrom(`${segment} ${modeLabel}`),
      Track: course,
      Machine: machine,
      Rider: rider,
      Player: player,
      Place: null,
      Time: timeStr,               // leave blank → table will use timeFmt(TimeSec)
      TimeSec: timeSec,       // seconds → renders as hh:mm:ss.mmm
      Date: '',
      Link: nodeLink,
      Video: '',
      Source: 'Speedrider',
      Label: `Speedrider – ${modeLabel}`,
    });
  }
  return out;
}

function adaptCatEx(rows) {
  // Group by category to compute rank (Place)
  const byCat = new Map();
  for (const r of rows) {
    const cat = norm(r.category);
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(r); // server already sorted by metric
  }
  const out = [];
  for (const [cat, list] of byCat) {
    list.forEach((r, i) => {
      out.push({
        Category: 'Category Extensions',
        CategoryLabel: cat,   // keep exact Cat-Ex label for display
        CategoryBucket: 'Category Extensions',
        Track: '',
        Machine: norm(r.machine),
        Rider: norm(r.rider),
        Player: norm(r.display_name),
        Place: i + 1, // per-category rank
        Time: norm(r.time_text),
        TimeSec: typeof r.time_ms === 'number' ? r.time_ms / 1000 : null,
        Date: norm(r.run_date || r.timestamp),
        Link: '',               // no SRC link
        Video: norm(r.video_url),
        Source: 'CatEx',
        Label: 'Cat-Ex',
        MetricType: norm(r.metric_type || 'time'),
        Points: r.points == null ? null : Number(r.points),
      });
    });
  }
  return out;
}

/* ============== 4) Cross-source dedup ============== */

function dedup(records) {
  const seenVideo = new Set();
  const seenFP = new Set();
  const out = [];

  for (const r of records) {
    const vid = parseVideoId(r.Video);
    if (vid) {
      const key = `${vid.platform}:${vid.id}`;
      if (seenVideo.has(key)) continue;
      seenVideo.add(key);
      out.push(r);
      continue;
    }
    // No video → use fingerprint; prefer first occurrence (SRC rows often have better metadata)
    const fp = fingerprint(r);
    if (seenFP.has(fp)) continue;
    seenFP.add(fp);
    out.push(r);
  }
  return out;
}

/* ============== 5) Metrics: All-Tracks vs Combined IL (AR/TR) ============== */


function isAllTracksTarget(subcatRaw, segment) {
  const s = String(subcatRaw ?? '').trim().toLowerCase();
  if (!/all\s*tracks/.test(s)) return false;

  // never allow "Legendaries"
  if (/legendar/.test(s)) return false;

  if (segment === 'Air Ride') {
    // Air Ride: must include Glitchless
    return /glitchless/.test(s);
  }
  if (segment === 'Top Ride') {
    // Top Ride: All Tracks (with or without "Glitchless"), but NOT Legendaries (blocked above)
    return true;
  }
  return false;
}


function computeAllTracksDelta(records, segment /* 'Air Ride' | 'Top Ride' */) {
  const inSegment = records.filter(r =>
    String(r.CategoryBucket ?? '').toLowerCase().startsWith(segment.toLowerCase())
  );

  // Sum of IL WRs (Time Attack — Restricted ONLY)
  const ilsRestricted = inSegment.filter(r =>
    r.Source === 'SRC' &&
    r.CategoryBucket.endsWith('Time Attack') &&
    /\brestricted\b/i.test(String(r.SubcategoryRaw ?? '')) &&
    String(r.Track ?? '') && r.TimeSec != null
  );

  const bestByTrack = new Map();
  for (const r of ilsRestricted) {
    const t = r.Track;
    const cur = bestByTrack.get(t);
    if (!cur || (r.TimeSec ?? Infinity) < (cur.TimeSec ?? Infinity)) {
      bestByTrack.set(t, r);
    }
  }
  const sumIL = [...bestByTrack.values()].reduce((acc, r) => acc + (r.TimeSec ?? 0), 0);

  // Full Mode (All Tracks… per segment)
  const fullModeATRow = inSegment
    .filter(r =>
      r.Source === 'SRC' &&
      r.CategoryBucket.endsWith('Full Mode') &&
      r.TimeSec != null &&
      isAllTracksTarget(r.SubcategoryRaw, segment)
    )
    .sort((a, b) => (a.TimeSec ?? Infinity) - (b.TimeSec ?? Infinity))[0];

  const fullModeAT = fullModeATRow ? fullModeATRow.TimeSec : null;
  const delta = (fullModeAT != null) ? (fullModeAT - sumIL) : null;
  return { segment, sumIL_sec: sumIL ?? null, fullGame_sec: fullModeAT, delta_sec: delta };
}



/* ============== 6) Spotlight + Latest pickers ============== */


function sourceEligibleForSpotlight(r) {
  return INCLUDE_SPEEDRIDER_IN_SPOTLIGHT ? true : r.Source !== 'Speedrider';
}

function pickLatest(records) {
  const parse = (d) => (d ? new Date(d).getTime() : 0);
  const eligible = records.filter(sourceEligibleForSpotlight);
  return eligible
    .slice()
    .sort((a,b) => (parse(b.Date) - parse(a.Date)) || ((b.Video?1:0)-(a.Video?1:0)))[0] || null;
}

function pickSpotlight(records) {
  const eligible = records.filter(sourceEligibleForSpotlight);
  if (!eligible.length) return null;
  const withVideo = eligible.filter(r => !!parseVideoId(r.Video));
  const pool = withVideo.length ? withVideo : eligible;
  const idx = seededIndex(pool.length);
  return pool[idx];
}

/* ============== 7) Rendering (embed + meta + deltas) ============== */


function embedHtml(r) {
  const vid = parseVideoId(r.Video);
  // Prefer direct video embeds if we have a YouTube/Twitch URL
  if (vid && vid.platform === 'youtube') {
    return `<iframe src="https://www.youtube.com/embed/${vid.id}"
              title="YouTube video" width="100%" height="100%" frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen></iframe>`;
  }
  if (vid && vid.platform === 'twitch') {
    // Local preview works with parent=localhost; on GitHub Pages set your host
    const parent = location.hostname || 'localhost';
    return `<iframe
              src="https://player.twitch.tv/?video=${vid.id}&parent=${parent}"
              height="100%" width="100%" frameborder="0" scrolling="no" allowfullscreen>
            </iframe>`;
  }
  // No embeddable video → show a best-effort link (Node or Video)
  const href  = r.Link || r.Video || '#';
  const label = r.Link ? 'Open node' : (r.Video ? 'Watch video' : 'Open link');
  return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
}


function timeFmt(sec) {
  if (sec == null || isNaN(sec)) return '';
  const ms = Math.round(sec * 1000);
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  const s = Math.floor((ms%60000)/1000);
  const msec = ms%1000;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(msec).padStart(3,'0')}`;
}

function ordinal(n){
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function setSpotlightMount(idEmbed, idMeta, r, title) {
  const embed = document.getElementById(idEmbed);
  const meta  = document.getElementById(idMeta);
  if (!embed || !meta) return;
  if (!r) {
    embed.innerHTML = '';
    meta.innerHTML = `<div class="muted">No record available.</div>`;
    return;
  }
  embed.innerHTML = embedHtml(r);

  const cat = r.CategoryBucket === 'Category Extensions'
    ? `${r.CategoryBucket} • ${r.CategoryLabel || ''}`.trim()
    : r.CategoryBucket;
  const trackLine = r.Track ? `<div><strong>Track:</strong> ${r.Track}</div>` : '';
  const placeLine = (r.Place != null)
    ? `<div><strong>Place:</strong> ${ordinal(Number(r.Place))}</div>`
    : '';
  const auxLink = r.Link
    ? `<a href="${r.Link}" target="_blank" rel="noopener">Link</a>`
    : (r.Video ? `<a href="${r.Video}" target="_blank" rel="noopener">Video</a>` : '');

  meta.innerHTML = `
    <div><strong>${title}</strong></div>
    <div><strong>Player:</strong> ${r.Player || '—'}</div>
    <div><strong>Time:</strong> ${r.Time || timeFmt(r.TimeSec) || '—'}</div>
    ${trackLine}
    <div><strong>Category:</strong> ${cat}</div>
    <div><strong>Machine:</strong> ${r.Machine || '—'}</div>
    <div><strong>Rider:</strong> ${r.Rider || '—'}</div>
    ${placeLine}
    <div>${auxLink}</div>
  `;
}


function setDeltaMount(id, d) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!d) { el.innerHTML = `<div class="muted">No data.</div>`; return; }

  const full = d.fullGame_sec != null ? timeFmt(d.fullGame_sec) : '—';
  const sum  = d.sumIL_sec  != null ? timeFmt(d.sumIL_sec)  : '—';
  const del  = d.delta_sec  != null ? (d.delta_sec >= 0 ? `+${timeFmt(d.delta_sec)}` : `−${timeFmt(Math.abs(d.delta_sec))}`) : '—';

  const fullLabel = (d.segment === 'Top Ride')
    ? 'Full Mode (All Tracks):'
    : 'Full Mode (All Tracks — Glitchless):';

  el.innerHTML = `
    <div><strong>${fullLabel}</strong> ${full}</div>
    <div><strong>Sum of IL WRs (Time Attack — Restricted):</strong> ${sum}</div>
    <div><strong>Delta:</strong> ${del}</div>
  `;
}


/* ===== Headline strip: big deltas + left Spotlight/Latest (with count-up) ===== */


function createHeroStripContainer() {
  // Use the pre-rendered hero strip in index.html
  return document.getElementById('dash-hero');
}

// Format a seconds value into 00:00:00.000 (we already have timeFmt)
function timeFmtSafe(sec) {
  return (sec == null || isNaN(sec)) ? '—' : timeFmt(sec);
}

// Animate a number from 0 -> target seconds and render as time text.
// If prefix is provided (e.g., '+', '−') it is prepended to the time.
function countUpTime(mountId, targetSec, opts = {}) {
  const el = document.getElementById(mountId);
  if (!el) return;
  if (targetSec == null || isNaN(targetSec)) { el.textContent = '—'; return; }

  const prefix = opts.prefix || '';
  const duration = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    ? 0 : (opts.durationMs || 610);

  if (duration <= 0) { el.textContent = prefix + timeFmt(targetSec); return; }

  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = (t < 1) ? (1 - Math.pow(1 - t, 3)) : 1; // ease-out cubic
    const cur = targetSec * eased;
    el.textContent = prefix + timeFmt(cur);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}


// Build one big delta panel with centered captions and "=" to the left of the green number
function renderBigDeltaPanel(mountId, deltaObj, labels /* {left, right} */) {
  const el = document.getElementById(mountId);
  if (!el) return;

  const full = deltaObj?.fullGame_sec;
  const sum  = deltaObj?.sumIL_sec;
  const dSec = deltaObj?.delta_sec;

  el.innerHTML = `
    <div class="row row-top" style="display:grid; grid-template-columns: 1fr auto 1fr; align-items: start; gap: 12px;">
      <div class="cell cell-left" style="text-align:center;">
        <div class="num" id="${mountId}-full">00:00:00.000</div>
        <div class="label">${labels.left}</div>
      </div>
      <div class="cell cell-mid" style="display:flex; align-items:center; justify-content:center;">
        <div class="num" aria-hidden="true">-</div>
      </div>
      <div class="cell cell-right" style="text-align:center;">
        <div class="num" id="${mountId}-sum">00:00:00.000</div>
        <div class="label">${labels.right}</div>
      </div>
    </div>

    <!-- single inline row: = 00:00:xx.xxx -->
    <div class="row row-eq">
      <div class="eq" aria-hidden="true">=</div>
      <div class="num num--highlight" id="${mountId}-delta">00:00:00.000</div>
    </div>

    <div class="row" style="justify-content:center;">
      <div class="label">Potential Time Save</div>
    </div>
  `;

  // Animate numbers (no '+' prefix on delta)
  countUpTime(`${mountId}-full`,  full);
  countUpTime(`${mountId}-sum`,   sum);
  if (dSec == null || isNaN(dSec)) {
    document.getElementById(`${mountId}-delta`).textContent = '—';
  } else {
    countUpTime(`${mountId}-delta`, Math.abs(dSec), { durationMs: 700 });
  }
}

// Build the whole headline strip and hide the old small cards
function renderHeroStrip(latest, spotlight, deltaAR, deltaTR) {
  const hero = createHeroStripContainer();
  if (!hero) return;

  // Paint the two embeds into the new left column
  setSpotlightMount('hero-spotlight-embed','hero-spotlight-meta', spotlight, 'Record Spotlight');
  setSpotlightMount('hero-latest-embed',   'hero-latest-meta',    latest,    'Latest Record');

  // Paint the two big delta panels (right column)
  renderBigDeltaPanel('delta-ar-big', deltaAR, {
    left: 'Air Ride All Tracks',
    right: 'Combined Air Ride IL Time'
  });
  renderBigDeltaPanel('delta-tr-big', deltaTR, {
    left: 'Top Ride All Tracks',
    right: 'Combined Top Ride IL Time'
  });

  // Hide the original smaller cards so they don’t duplicate on the page
  [
    'spotlight-embed','latest-embed','ar-delta','tr-delta'
  ].forEach(id => {
    const node = document.getElementById(id);
    const card = node && node.closest('.dash-card');
    if (card) card.style.display = 'none';
  });
}

/* ===== Step 2C: Filters + Charts + Search Table ===== */

/** Shared state for filters and data */
const Dash = {
  all: [],           // merged (deduped) rows
  filtered: [],      // rows after applying filters
  opts: {            // distinct options to paint
    categories: [], players: [], machines: [], riders: [], places: [1,2,3]
  },
  sel: {             // selected filter values; [] = all
  categories: [], players: [], machines: [], riders: [], places: [],
  includeSpeedrider: false
},
     sort: {            // table sort state
       col: '__multi__', dir: 'asc'   // default: Category, Subcategory, Track, then TimeSec
     }
   };


// Search table default: include Speedrider rows unless user changes Place/SR chips
Dash._searchIncludeSRImplicit = true;

/* ===== Category ordering + per-chart exclusions (added) ===== */

// The fixed display order to use everywhere (charts + search)
const ORDERED_CATEGORIES = [
  'Air Ride - Time Attack',
  'Air Ride - Free Run',
  'Air Ride - Full Mode',
  'Top Ride - Time Attack',
  'Top Ride - Free Run',
  'Top Ride - Full Mode',
  'City Trial - Stadiums',
  'City Trial - Full Mode',
  'Road Trip',
  'Full Game',
  'Category Extension'
];

function categoryOrderIndex(label) {
  const i = ORDERED_CATEGORIES.indexOf(label);
  return i >= 0 ? i : ORDERED_CATEGORIES.length + 1; // unknowns go to the end
}
function sortCategories(arr) {
  return arr.slice().sort((a,b) => {
    const ia = categoryOrderIndex(a), ib = categoryOrderIndex(b);
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });
}

// Per-chart exclusions requested
const EXCLUDE_FOR_CHAR = [
  'Air Ride - Full Mode',
  'City Trial - Full Mode',
  'Full Game',
  'Top Ride - Full Mode'
];
const EXCLUDE_FOR_MACHINE = [
  ...EXCLUDE_FOR_CHAR,
  'Road Trip'
];
// Players chart has no special exclusions


/** Build distinct option lists from records (for dropdowns) */
function buildDistincts(rows) {
  const set = (arr) => [...new Set(arr.filter(Boolean))];
  // Use fixed order for Category
  Dash.opts.categories = sortCategories(set(rows.map(r => r.CategoryUI)));
  // Others can stay alphabetical
  Dash.opts.players    = [...new Set(rows.map(r => r.Player).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  Dash.opts.machines   = [...new Set(rows.map(r => r.Machine).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  Dash.opts.riders     = [...new Set(rows.map(r => r.Rider).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}


/** Apply filters to Dash.all and store into Dash.filtered */
function applyFilters() {
  const s = Dash.sel;

  Dash.filtered = Dash.all.filter(r => {
    if (s.categories.length && !s.categories.includes(r.CategoryUI)) return false;
    if (s.players.length    && (!r.Player   || !s.players.includes(r.Player))) return false;
    if (s.machines.length   && (!r.Machine  || !s.machines.includes(r.Machine))) return false;
    if (s.riders.length     && (!r.Rider    || !s.riders.includes(r.Rider))) return false;

    // Place + Include Speedrider logic (additive behavior)
    const isSR = (r.Place == null);                    // Speedrider rows have no Place
    const hasPlaces = Array.isArray(s.places) && s.places.length > 0;

    // Implicit default ON for Search: include SR until user interacts
    const includeSR = s.includeSpeedrider || Dash._searchIncludeSRImplicit;

    if (isSR) {
      if (!includeSR) return false;
    } else {
      if (hasPlaces && !s.places.includes(Number(r.Place))) return false;
    }

    return true;
  });
}

// Build a compact multi-select dropdown with checkboxes (All/Clear outside)
function makeMultiSelectDropdown({ mountSel, label, options, selKey }) {
  const mount = document.querySelector(mountSel);
  const wrap  = h('div', { class:'filt-block' });

  // Label
  wrap.appendChild(h('div', { class:'filt-label' }, label));

  // Button host
  const host = h('div', { class:'ms' });
  const btn  = h('button', { class:'ms-btn', type:'button', 'aria-expanded':'false' }, 'All');
  host.appendChild(btn);

  // Dropdown menu
  const menu = h('div', { class:'ms-menu', role:'menu' });

  // Checkbox list (create FIRST so All/Clear can refer to it)
  const list = h('div', { class:'ms-list' });
  options.forEach(opt => {
    const id  = `${selKey}-${opt}`.replace(/[^a-z0-9_-]+/gi,'-');
    const row = h('label', { class:'ms-item', for:id });
    const box = h('input', { type:'checkbox', id, value:opt });
    box.addEventListener('change', () => {
      const val = (selKey === 'places') ? Number(box.value) : box.value; // number-aware for Place
      if (box.checked) {
        if (!Dash.sel[selKey].includes(val)) Dash.sel[selKey].push(val);
      } else {
        Dash.sel[selKey] = Dash.sel[selKey].filter(v => v !== val);
      }
      updateSummary();
      scheduleRefresh();
    });
    row.appendChild(box);
    row.appendChild(document.createTextNode(opt));
    list.appendChild(row);
  });
  menu.appendChild(list);

  host.appendChild(menu);
  wrap.appendChild(host);

  // Actions outside the dropdown (AFTER list exists)
  const acts = h('div', { class:'filt-actions' });
  acts.appendChild(h('button', { class:'btn-secondary', type:'button', onclick: () => {
    // All = clear selection to mean “no filter”
    list.querySelectorAll('input[type="checkbox"]').forEach(b => b.checked = false);
    Dash.sel[selKey] = [];
    updateSummary();
    scheduleRefresh();
  }}, 'All'));
  acts.appendChild(h('button', { class:'btn-secondary', type:'button', onclick: () => {
    list.querySelectorAll('input[type="checkbox"]').forEach(b => b.checked = false);
    Dash.sel[selKey] = [];
    updateSummary();
    scheduleRefresh();
  }}, 'Clear'));
  wrap.appendChild(acts);

  mount.appendChild(wrap);

  // Open/close logic
  function openMenu() {
    host.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    const set = new Set(
      (Dash.sel[selKey] || []).map(v => (selKey === 'places') ? String(v) : v)
    );
    list.querySelectorAll('input[type="checkbox"]').forEach(b => { b.checked = set.has(b.value); });
  }
  function closeMenu() {
    host.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  }
  btn.addEventListener('click', () => host.classList.contains('open') ? closeMenu() : openMenu());
  document.addEventListener('click', (e) => { if (!host.contains(e.target)) closeMenu(); });

  // Summary on the button
  function updateSummary() {
    const sel = Dash.sel[selKey] || [];
    if (!sel.length) { btn.textContent = 'All'; return; }
    const labels = (selKey === 'places') ? sel.map(String) : sel;
    btn.textContent = labels.length <= 3 ? labels.join(', ') : `${labels.length} selected`;
  }
  updateSummary();
}

// Build the Player dropdown with a live "starts with" search (case-insensitive)
function makePlayerDropdown({ mountSel, label, options, selKey }) {
  const mount = document.querySelector(mountSel);
  const wrap  = h('div', { class:'filt-block' });

  // Label
  wrap.appendChild(h('div', { class:'filt-label' }, label));

  // Button host
  const host = h('div', { class:'ms' });
  const btn  = h('button', { class:'ms-btn', type:'button', 'aria-expanded':'false' }, 'All');
  host.appendChild(btn);

  // Dropdown menu
  const menu = h('div', { class:'ms-menu', role:'menu' });

  // Search input at the top of the menu
  const search = h('input', {
    type:'text',
    class:'ms-search',
    placeholder:'Search players…'
  });
  menu.appendChild(search);

  // List container
  const list = h('div', { class:'ms-list' });
  menu.appendChild(list);

  host.appendChild(menu);
  wrap.appendChild(host);

  // Actions outside the dropdown (kept: All / Clear)
  const acts = h('div', { class:'filt-actions' });
  acts.appendChild(h('button', {
    class:'btn-secondary', type:'button', onclick: () => {
      // "All" means clear selection → no filter
      Dash.sel[selKey] = [];
      renderList(search.value);   // repaint to reflect unchecked boxes
      updateSummary();
      scheduleRefresh();
    }
  }, 'All'));
  acts.appendChild(h('button', {
    class:'btn-secondary', type:'button', onclick: () => {
      Dash.sel[selKey] = [];
      renderList(search.value);
      updateSummary();
      scheduleRefresh();
    }
  }, 'Clear'));
  wrap.appendChild(acts);

  mount.appendChild(wrap);

  // Render the checkbox list with current filter text; preserve any selections
  function renderList(filterText = '') {
    const selected = new Set((Dash.sel[selKey] || []).map(String));
    const f = String(filterText || '').trim().toLowerCase();

    // Case-insensitive "starts with" filter; empty string shows all
    const visible = (f ? options.filter(o => o.toLowerCase().startsWith(f)) : options);

    list.innerHTML = '';
    visible.forEach(opt => {
      const id  = `${selKey}-opt-${opt}`.replace(/[^a-z0-9_-]+/gi,'-');
      const row = h('label', { class:'ms-item', for:id });
      const box = h('input', { type:'checkbox', id, value:opt });

      // Keep already-checked players checked (even if they’re not in the visible set)
      box.checked = selected.has(opt);

      box.addEventListener('change', () => {
        const val = box.value;
        if (box.checked) {
          if (!Dash.sel[selKey].includes(val)) Dash.sel[selKey].push(val);
        } else {
          Dash.sel[selKey] = Dash.sel[selKey].filter(v => v !== val);
        }
        updateSummary();
        scheduleRefresh();
      });

      row.appendChild(box);
      row.appendChild(document.createTextNode(opt));
      list.appendChild(row);
    });
  }

  // Open/close logic
  function openMenu() {
    host.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    // Reset search box each open and show full list
    search.value = '';
    renderList('');
    // Focus the search so the user can type immediately
    setTimeout(() => search.focus(), 0);
  }
  function closeMenu() {
    host.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  }
  btn.addEventListener('click', () => host.classList.contains('open') ? closeMenu() : openMenu());
  document.addEventListener('click', (e) => { if (!host.contains(e.target)) closeMenu(); });

  // Live filter while typing; do NOT clear any existing selections
  search.addEventListener('input', () => { renderList(search.value); });

  // Button summary
  function updateSummary() {
    const sel = Dash.sel[selKey] || [];
    if (!sel.length) { btn.textContent = 'All'; return; }
    btn.textContent = sel.length <= 3 ? sel.join(', ') : `${sel.length} selected`;
  }
  updateSummary();
}


// Build the Place dropdown with 1st/2nd/3rd + "Include Speedrider" in the same menu
function buildPlaceDropdown(mountSel) {
  const mount = document.querySelector(mountSel);
  const wrap  = h('div', { class:'filt-block' });

  // Label
  wrap.appendChild(h('div', { class:'filt-label' }, 'Place'));

  // Button host
  const host = h('div', { class:'ms' });
  const btn  = h('button', { class:'ms-btn', type:'button', 'aria-expanded':'false' }, 'All');
  host.appendChild(btn);

  // Dropdown menu
  const menu = h('div', { class:'ms-menu', role:'menu' });

  // List of numeric places
  const list = h('div', { class:'ms-list' });
  ['1','2','3'].forEach(opt => {
    const id  = `places-${opt}`;
    const row = h('label', { class:'ms-item', for:id });
    const box = h('input', { type:'checkbox', id, value:opt });
    box.addEventListener('change', () => {
      const val = Number(box.value);
      if (box.checked) {
        if (!Dash.sel.places.includes(val)) Dash.sel.places.push(val);
      } else {
        Dash.sel.places = Dash.sel.places.filter(v => v !== val);
      }
      updateSummary(); scheduleRefresh();
    });
    row.appendChild(box); row.appendChild(document.createTextNode(
      opt === '1' ? '1st' : opt === '2' ? '2nd' : '3rd'
    ));
    list.appendChild(row);
  });

  // Extra item inside the same menu: Include Speedrider
  {
    const id  = 'places-sr';
    const row = h('label', { class:'ms-item', for:id });
    const box = h('input', { type:'checkbox', id, value:'__sr__' });
    box.addEventListener('change', () => {
      Dash.sel.includeSpeedrider = box.checked;
      updateSummary(); scheduleRefresh();
    });
    row.appendChild(box); row.appendChild(document.createTextNode('Include Speedrider'));
    list.appendChild(row);
  }

  menu.appendChild(list);
  host.appendChild(menu);
  wrap.appendChild(host);

  // Actions outside the dropdown
  const acts = h('div', { class:'filt-actions' });
  acts.appendChild(h('button', { class:'btn-secondary', type:'button', onclick: () => {
    // All = clear every selection (no filter)
    list.querySelectorAll('input[type="checkbox"]').forEach(b => b.checked = false);
    Dash.sel.places = [];
    Dash.sel.includeSpeedrider = false;
    updateSummary(); scheduleRefresh();
  }}, 'All'));
  acts.appendChild(h('button', { class:'btn-secondary', type:'button', onclick: () => {
    list.querySelectorAll('input[type="checkbox"]').forEach(b => b.checked = false);
    Dash.sel.places = [];
    Dash.sel.includeSpeedrider = false;
    updateSummary(); scheduleRefresh();
  }}, 'Clear'));
  wrap.appendChild(acts);

  mount.appendChild(wrap);

  // Open/close logic
  function openMenu() {
    host.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    const selSet = new Set((Dash.sel.places || []).map(String));
    list.querySelectorAll('input[type="checkbox"]').forEach(b => {
      if (b.value === '__sr__') b.checked = !!Dash.sel.includeSpeedrider;
      else b.checked = selSet.has(b.value);
    });
  }
  function closeMenu() {
    host.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  }
  btn.addEventListener('click', () => host.classList.contains('open') ? closeMenu() : openMenu());
  document.addEventListener('click', (e) => { if (!host.contains(e.target)) closeMenu(); });

  // Summary on the button
  function updateSummary() {
    const labels = [];
    if (Dash.sel.places.includes(1)) labels.push('1st');
    if (Dash.sel.places.includes(2)) labels.push('2nd');
    if (Dash.sel.places.includes(3)) labels.push('3rd');
    if (Dash.sel.includeSpeedrider)  labels.push('Speedrider');

    if (!labels.length) { btn.textContent = 'All'; return; }
    btn.textContent = labels.length <= 3 ? labels.join(', ') : `${labels.length} selected`;
  }
  updateSummary();
}


// Build "Place" as chips: 1st, 2nd, 3rd, Include Speedrider (no All/Clear buttons)
function buildPlaceChips(mountSel) {
  const mount = document.querySelector(mountSel);
  const wrap  = h('div', { class:'filt-block' });
  wrap.appendChild(h('div', { class:'filt-label' }, 'Place'));

  const row = h('div', { class:'filt-row' });

  function chip(label, value, onChange) {
    const id = `place-chip-${value}`;
    const lab = h('label', { class:'filt-chip', for:id });
    const box = h('input', { type:'checkbox', id, value:String(value) });
    box.addEventListener('change', () => onChange(box.checked));
    lab.appendChild(box);
    lab.appendChild(document.createTextNode(label));
    row.appendChild(lab);
    return box;
  }


  const b1 = chip('1st', 1, (on) => {
    Dash._searchIncludeSRImplicit = false;
    if (on) { if (!Dash.sel.places.includes(1)) Dash.sel.places.push(1); }
    else    { Dash.sel.places = Dash.sel.places.filter(v => v !== 1); }
    scheduleRefresh();
  });
  const b2 = chip('2nd', 2, (on) => {
    Dash._searchIncludeSRImplicit = false;
    if (on) { if (!Dash.sel.places.includes(2)) Dash.sel.places.push(2); }
    else    { Dash.sel.places = Dash.sel.places.filter(v => v !== 2); }
    scheduleRefresh();
  });
  const b3 = chip('3rd', 3, (on) => {
    Dash._searchIncludeSRImplicit = false;
    if (on) { if (!Dash.sel.places.includes(3)) Dash.sel.places.push(3); }
    else    { Dash.sel.places = Dash.sel.places.filter(v => v !== 3); }
    scheduleRefresh();
  });

  const bSR = chip('Include Speedrider', '__sr__', (on) => {
    Dash._searchIncludeSRImplicit = false;
    Dash.sel.includeSpeedrider = !!on;
    scheduleRefresh();
  });


  // reflect current state when (re)built
  b1.checked  = Dash.sel.places.includes(1);
  b2.checked  = Dash.sel.places.includes(2);
  b3.checked  = Dash.sel.places.includes(3);
  bSR.checked = !!Dash.sel.includeSpeedrider;

  wrap.appendChild(row);
  mount.appendChild(wrap);
}

/** Build the whole (global) filter panel with dropdowns */
function buildFiltersUI() {
  const mount = el('#search-filters');
  if (!mount) return;
  mount.innerHTML = '';

  // Category, Rider, Machine, Player (with search), then Place chips
  makeMultiSelectDropdown({ mountSel:'#search-filters', label:'Category', options:Dash.opts.categories, selKey:'categories' });
  makeMultiSelectDropdown({ mountSel:'#search-filters', label:'Rider',    options:Dash.opts.riders,     selKey:'riders'     });
  makeMultiSelectDropdown({ mountSel:'#search-filters', label:'Machine',  options:Dash.opts.machines,   selKey:'machines'   });
  makePlayerDropdown     ({ mountSel:'#search-filters', label:'Player',   options:Dash.opts.players,    selKey:'players'    });
  buildPlaceChips('#search-filters');
}
/** Small DOM helpers */
const el = sel => document.querySelector(sel);
function h(tag, attrs={}, ...kids) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (k==='class') e.className = v; else if (k==='html') e.innerHTML=v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  });
  kids.filter(Boolean).forEach(k => e.appendChild(typeof k==='string'?document.createTextNode(k):k));
  return e;
}

// Debounce: batch rapid UI changes into one refresh
let REFRESH_TIMER = null;
function scheduleRefresh() {
  if (REFRESH_TIMER) clearTimeout(REFRESH_TIMER);
  REFRESH_TIMER = setTimeout(() => {
    refreshAfterFilterChange();
    REFRESH_TIMER = null;
  }, 150); // 150ms feels instant but avoids re-render storms
}

function parseSrTimeToSec(txt) {
  const s = String(txt || '').trim()
  .replace(/[\u2019\u2032\u02B9]/g, "'")
  .replace(/[\u201D\u2033\u02BA]/g, '"');
 
  // Current Speedrider format: 01:34.61
  let m = s.match(/^(\d+):(\d{2})\.(\d{2})$/);
  if (m) {
    const mm = +m[1];
    const ss = +m[2];
    const cs = +m[3]; // centiseconds
    return (mm * 60 + ss) + (cs / 100);
  }
 
  // Older Speedrider format: 1'34"610
  m = s.match(/^(\d+)'(\d{2})"(\d{2,3})$/);
  if (m) {
    const mm = +m[1];
    const ss = +m[2];
    const frac = m[3];
    const ms = frac.length === 2 ? +frac * 10 : +frac;
    return (mm * 60 + ss) + (ms / 1000);
  }
 
  return null;
}

/* === Popularity chart color scale (light -> dark by count) === */
// Lightest (smallest bar) and darkest (largest bar)
const BAR_MIN_HEX = '#ff788d'; // smallest
const BAR_MAX_HEX = '#f7aa45'; // largest

function hexToRgb(hex) {
  const h = hex.replace('#','').trim();
  const v = h.length === 3
    ? h.split('').map(ch => ch+ch).join('')
    : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToCss({r,g,b}) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}
function lerp(a, b, t) { return a + (b - a) * t; }

/**
 * Return a CSS color for a given count given [min,max] range.
 * t=0 -> BAR_MIN_HEX (light), t=1 -> BAR_MAX_HEX (dark)
 */
function colorForCount(count, minCount, maxCount) {
  // Normalize t in [0,1]; if flat, keep mid color.
  let t = (maxCount === minCount) ? 1 : (count - minCount) / (maxCount - minCount);
  // Clamp
  t = Math.max(0, Math.min(1, t));

  const c0 = hexToRgb(BAR_MIN_HEX);
  const c1 = hexToRgb(BAR_MAX_HEX);
  const rgb = {
    r: lerp(c0.r, c1.r, t),
    g: lerp(c0.g, c1.g, t),
    b: lerp(c0.b, c1.b, t),
  };
  return rgbToCss(rgb);
}

/** Charts: tally helpers under current filters */
const tally = (rows, key) => {
 
  // Deduplicate only for the Player chart
  if (key === 'Player') {
 
    const counts = new Map();
    const seen = new Set();
 
    rows.forEach(r => {
 
      const player = String(r.Player || '')
        .trim()
        .toLowerCase();
 
      if (!player) return;
 
      const recordKey = [
        String(r.CategoryUI || r.Category || ''),
        String(r.TrackUI || r.Track || ''),
        String(r.Machine || ''),
        String(r.Rider || ''),
        Number(r.TimeSec || 0).toFixed(3)
      ].join('|');
 
      if (seen.has(recordKey)) return;
      seen.add(recordKey);
 
      counts.set(
        player,
        (counts.get(player) || 0) + 1
      );
    });
 
    return [...counts.entries()]
      .map(([k,v]) => ({ key:k, count:v }))
      .sort((a,b)=>b.count-a.count || a.key.localeCompare(b.key));
  }
 
  // Existing behavior for Rider / Machine charts
  const m = new Map();
 
  rows.forEach(r=>{
    const k = norm(r[key]);
    if (!k) return;
    m.set(k, (m.get(k)||0) + 1);
  });
 
  return [...m.entries()]
    .map(([k,v])=>({key:k, count:v}))
    .sort((a,b)=>b.count-a.count || a.key.localeCompare(b.key));
};

function paintChart({rows, key, mountSel, topN=15}) {
  const mount = el(mountSel);
  if (!mount) return;
  mount.innerHTML = '';
  const data = tally(rows, key).slice(0, topN);
  const max = data.length ? data[0].count : 1;

  const chart = h('div',{class:'chart'});
  data.forEach(d=>{
    const row = h('div',{class:'chart-row'});
    const label = h('div',{class:'chart-label'}, d.key);
    const barWrap = h('div',{class:'chart-bar-wrap'});
    const bar = h('div',{class:'chart-bar', style:`width:${(d.count/max*100).toFixed(1)}%`});
    barWrap.appendChild(bar);
    const count = h('div',{class:'chart-count'}, String(d.count));

    // clicking a bar adds that value to the corresponding filter
    barWrap.style.cursor = 'pointer';
    barWrap.title = `Filter by ${key}: ${d.key}`;
    barWrap.addEventListener('click', ()=>{
      const selMap = {Rider:'riders', Machine:'machines', Player:'players'};
      const sk = selMap[key];
      if (!Dash.sel[sk].includes(d.key)) Dash.sel[sk].push(d.key);
      scheduleRefresh(); // rebuild to reflect new chips checked
    });

    row.appendChild(label); row.appendChild(count);
    const row2 = h('div',{style:'grid-column:1 / -1;'}); row2.appendChild(barWrap);
    chart.appendChild(row); chart.appendChild(row2);
  });

  if (!data.length) chart.appendChild(h('div',{class:'info-muted'}, 'No data under current filters.'));
  mount.appendChild(chart);
}



/** Search table */
function buildTable() {
  // Mobile flag used for stacked Links logic
  const isMobile = window.matchMedia('(max-width: 900px)').matches;

  const mount = el('#search-table');
  if (!mount) return;
  mount.innerHTML = '';

  const wrap  = h('div', { class: 'table-wrap' });
  const table = h('table', { class: 'table-simple table--search' });
  const thead = h('thead');
  const trh   = h('tr');

  // Map a Category label to its page URL
  function categoryHref(label) {
    const c = String(label || '').replace(/\u2013/g, '-').toLowerCase(); // normalize any en-dash to '-'
    if (c.startsWith('air ride')) return 'air-ride.html';
    if (c.startsWith('top ride')) return 'top-ride.html';
    if (c.startsWith('city trial - stadiums') || c.startsWith('city trial - full mode')) return 'city-trial.html';
    if (c.startsWith('road trip')) return 'road-trip.html';
    if (c === 'full game' || c === 'category extension') return 'extras.html';
    return null;
  }

// On mobile, keep stacked Rider/Machine and stack Links; on desktop split Rider and Machine.
const useStackedLinks = isMobile;
const cols = useStackedLinks
  ? [
      { key:'CategoryUI',   label:'Category',     mobileLabel:'Cat'   },
      { key:'SubcategoryUI',label:'Subcategory',  mobileLabel:'Subcat'},
      { key:'TrackUI',      label:'Track/Stadium',mobileLabel:'Track' },
      { key:'RM',           label:'Rider / Machine', mobileLabel:'R/M' },
      { key:'Player',       label:'Player',       mobileLabel:'Player'},
      { key:'TimeOrScore',  label:'Time/Score',   mobileLabel:'Time', sortKey:'TimeSec' },
      { key:'Place',        label:'Place',        mobileLabel:'Place' },
      { key:'Links',        label:'Links',        mobileLabel:'Links' },
    ]
  : [
      { key:'CategoryUI',   label:'Category',     mobileLabel:'Cat'   },
      { key:'SubcategoryUI',label:'Subcategory',  mobileLabel:'Subcat'},
      { key:'TrackUI',      label:'Track/Stadium',mobileLabel:'Track' },
      // Desktop: separate Rider and Machine columns (text-only)
      { key:'Rider',        label:'Rider',        mobileLabel:'Rider' },
      { key:'Machine',      label:'Machine',      mobileLabel:'Machine'},
      { key:'Player',       label:'Player',       mobileLabel:'Player'},
      { key:'TimeOrScore',  label:'Time/Score',   mobileLabel:'Time', sortKey:'TimeSec' },
      { key:'Place',        label:'Place',        mobileLabel:'Place' },
      { key:'Link',         label:'Link',         mobileLabel:'Link'  },
      { key:'Video',        label:'Video',        mobileLabel:'Video' },
    ];

const thClassByKey = {
  CategoryUI:  'col--cat',
  SubcategoryUI:'col--subcat',
  TrackUI:     'col--track',
  // Mobile-only stacked column:
  RM:          'col--rm',
  // Desktop-only split columns:
  Rider:       'col--rider',
  Machine:     'col--machine',
  Player:      'col--player',
  TimeOrScore: 'col--time',
  Place:       'col--place',
  Link:        'col--link',
  Video:       'col--video',
  Links:       'col--links',
};

  // ===== Build header (ONCE) =====
  cols.forEach((c) => {
    const attrs = { onclick: () => sortBy(c.key) };

    const thClass = thClassByKey[c.key];
    if (thClass) attrs.class = thClass;

    const th = h('th', attrs);

    const full   = h('span', { class: 'th-label th-label--full'   }, c.label);
    const mobile = h('span', { class: 'th-label th-label--mobile' }, (c.mobileLabel || c.label));

    th.appendChild(full);
    th.appendChild(mobile);
    th.appendChild(h('span', { class: 'sort-ind' }, ''));
    trh.appendChild(th);
  });
  thead.appendChild(trh);

  const tbody = h('tbody');

  // Project rows for display
  const rows = Dash.filtered.slice();

  // ===== Apply sort (supports default multi-key sort) =====
  const dir = Dash.sort.dir === 'asc' ? 1 : -1;
  const cfg = cols.find(c => c.key === Dash.sort.col);
  const k   = (cfg && cfg.sortKey) ? cfg.sortKey : Dash.sort.col;

  rows.sort((a, b) => {
    // Default on first load: Category A→Z, Subcategory A→Z, Track A→Z, then TimeSec asc
    if (k === '__multi__') {
      const s = v => String(v || '').toLowerCase();

      // 1) Category
      const c1 = s(a.CategoryUI), c2 = s(b.CategoryUI);
      if (c1 !== c2) return c1.localeCompare(c2);

      // 2) Subcategory
      const sc1 = s(a.SubcategoryUI), sc2 = s(b.SubcategoryUI);
      if (sc1 !== sc2) return sc1.localeCompare(sc2);

      // 3) Track/Stadium
      const t1 = s(a.TrackUI), t2 = s(b.TrackUI);
      if (t1 !== t2) return t1.localeCompare(t2);

      // 4) Time (numeric; nulls last)
      const toNum = v => (typeof v === 'number' && isFinite(v)) ? v : Infinity;
      return toNum(a.TimeSec) - toNum(b.TimeSec);
    }

    // Single-column sort (when user clicks any header)
    const ax = a[k] ?? '';
    const bx = b[k] ?? '';

    if (k === 'Place' || k === 'TimeSec') {
      const toNum = v => (typeof v === 'number' && isFinite(v)) ? v : Infinity;
      return (toNum(ax) - toNum(bx)) * dir;
    }
    return String(ax).localeCompare(String(bx), undefined, { numeric: true, sensitivity: 'base' }) * dir;
  });

// Build a single cell with Rider on top and Machine below (each = icon + text)
function rmCellHtml(r) {
  const riderHtml   = iconCellHtml(r.Rider, 'Rider');
  const machineHtml = iconCellHtml(r.Machine, 'Machine');

  // If Machine is missing (e.g., some modes), render just Rider
  if (!r.Machine) {
    return `
      <div class="rm rm--rider has-icon">${riderHtml}</div>
    `;
  }

  return `
    <div class="rm rm--rider has-icon">${riderHtml}</div>
    <div class="rm rm--machine has-icon" style="margin-top:4px">${machineHtml}</div>
  `;
}

  // Helper: return HTML that shows an icon + keeps text in DOM (for accessibility)
  function iconCellHtml(label, which /* 'Rider' | 'Machine' */) {
    const name = String(label || '').trim();
    let src = null;
    if (which === 'Rider')   src = ICONS_RIDER[name] || null;
    if (which === 'Machine') src = ICONS_MACHINE[name] || null;

    if (src) {
      return `
        <div class="cell-icon">
          <img src="${src}" alt="" width="20" height="20" loading="lazy" decoding="async">
        </div>
        <div class="cell-text">${name || ''}</div>
      `;
    }
    // Fallback: no icon — just text
    return `<div class="cell-text">${name || ''}</div>`;
  }

  // Column class map used for <td> on this device mode

const tdClassByIndex = useStackedLinks
  ? [
      'col--cat',     // 0
      'col--subcat',  // 1
      'col--track',   // 2
      'col--rm',      // 3  (stacked Rider/Machine)
      'col--player',  // 4
      'col--time',    // 5
      'col--place',   // 6
      'col--links',   // 7
    ]
  : [
      'col--cat',     // 0
      'col--subcat',  // 1
      'col--track',   // 2
      'col--rider',      // 3
      'col--machine',      // 4
      'col--player',  // 5
      'col--time',    // 6
      'col--place',   // 7
      'col--link',    // 8
      'col--video'    // 9
    ];


  // ===== Render body rows =====
  rows.forEach(r => {
    const tr = h('tr');

    // Build the Time/Score text for the row
    const timeOrScore = (
      r.ScoreUnit
        ? `${r.ScoreLabel} ${r.ScoreUnit}`
        : (r.TimeSec != null ? timeFmt(r.TimeSec) : (r.Time || ''))
    );

    // Prebuild anchor HTML
    const linkHtml  = (r.Link  ? `<a href="${r.Link}"  target="_blank" rel="noopener">Link</a>`  : '');
    const videoHtml = (r.Video ? `<a href="${r.Video}" target="_blank" rel="noopener">Video</a>` : '');
 

const cells = useStackedLinks
  // ====== MOBILE ======
  ? [
      (() => { const href = categoryHref(r.CategoryUI);
               return href ? `<a href="${href}" target="_self">${r.CategoryUI}</a>` : (r.CategoryUI || ''); })(),
      (r.SubcategoryUI || ''),
      (r.TrackUI || ''),
      rmCellHtml(r), // stacked Rider/Machine with icons; CSS hides text on small screens
      (r.Player || ''),
      timeOrScore,
      (r.Place != null ? String(r.Place) : ''),
      (linkHtml || videoHtml ? `<div class="links-vert">${linkHtml}${videoHtml ? `<br>${videoHtml}` : ''}</div>` : ''),
    ]
  // ====== DESKTOP ======
  : [
      (() => { const href = categoryHref(r.CategoryUI);
               return href ? `<a href="${href}" target="_self">${r.CategoryUI}</a>` : (r.CategoryUI || ''); })(),
      (r.SubcategoryUI || ''),
      (r.TrackUI || ''),
      (r.Rider   || ''),  // text only
      (r.Machine || ''),  // text only
      (r.Player  || ''),
      timeOrScore,
      (r.Place != null ? ordinal(Number(r.Place)) : ''),
      linkHtml,
      videoHtml,
    ];


    // Append <td>s with classes
    cells.forEach((html, i) => {
      const td = h('td', { html });
      td.classList.add(tdClassByIndex[i]);
      // icon helpers (same indexes in both modes)
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  // Mount table
  table.appendChild(thead);
  table.appendChild(tbody);
  wrap.appendChild(table);
  mount.appendChild(wrap);

  // Count
  mount.appendChild(h('div', { class: 'info-muted', style: 'margin-top:6px;' },
    `${rows.length.toLocaleString()} records`
  ));

  // Paint sort indicators
  const idx = cols.findIndex(c => c.key === Dash.sort.col);
  if (idx >= 0) thead.querySelectorAll('.sort-ind')[idx].textContent = Dash.sort.dir === 'asc' ? '▲' : '▼';

  function sortBy(col) {
    if (Dash.sort.col === col) Dash.sort.dir = (Dash.sort.dir === 'asc' ? 'desc' : 'asc');
    else { Dash.sort.col = col; Dash.sort.dir = 'asc'; }
    buildTable();
  }
}


/** Full refresh after any filter change */
function refreshAfterFilterChange(rebuildChips=false) {
  applyFilters();
  buildTable();

  // Optionally re-check chips to mirror the internal selections (when bars add filters)
}

/* ===== Canonical Category/Subcategory projection for table + filters ===== */

const CAT_MAP = new Map([
  ['Air Ride – Time Attack', 'Air Ride - Time Attack'],
  ['Air Ride – Free Run',    'Air Ride - Free Run'],
  ['Air Ride – Full Mode',   'Air Ride - Full Mode'],
  ['Top Ride – Time Attack', 'Top Ride - Time Attack'],
  ['Top Ride – Free Run',    'Top Ride - Free Run'],
  ['Top Ride – Full Mode',   'Top Ride - Full Mode'],
  ['City Trial – Full Game', 'City Trial - Full Mode'], // our bucket name used “Full Game”
  ['City Trial – Stadiums',  'City Trial - Stadiums'],
  ['City Trial – Full Mode', 'City Trial - Full Mode'],
  ['Road Trip – Full Game',  'Road Trip'],
  ['Category Extensions',    'Category Extension'],
]);

// === Canonicalize Rider & Machine labels so filters don't splinter ===
function canonRider(nameRaw) {
  const s = String(nameRaw || '').trim();

  // Normalize obvious aliases
  const map = new Map([
    ['Bandana Waddle Dee', 'Bandana Dee'],
    ['Bandana Dee',        'Bandana Dee'],

    ['Star Man',           'Starman'],
    ['Starman',            'Starman'],

    ['Yellow/Green Kirby', 'Kirby (Yellow or Green)'],
    ['Kirby (Yellow or Green)', 'Kirby (Yellow or Green)'],

    ['Kirby (Blue or White)', 'Kirby (Blue or Gray)'],
    ['Blue/Gray Kirby',       'Kirby (Blue or Gray)'],
    ['Kirby (Blue or Gray)',  'Kirby (Blue or Gray)'],

    ['Pink Kirby',         'Kirby (Pink)'],
  ]);

  // If your data sometimes uses “Kirby, Pink” etc, we could add more rules here later.
  return map.get(s) || s;
}

function canonMachine(nameRaw) {
  const s = String(nameRaw || '').trim();

  // Map generic names to "Star" variants
  const starPairs = [
    ['Bulk', 'Bulk Star'],
	['Compact', 'Compact Star'],
    ['Formula', 'Formula Star'],
	['Hop', 'Hop Star'],
    ['Jet', 'Jet Star'],
    ['Paper', 'Paper Star'],
    ['Rocket', 'Rocket Star'],
    ['Shadow', 'Shadow Star'],
    ['Slick', 'Slick Star'],
    ['Swerve', 'Swerve Star'],
	['Tank', 'Tank Star'],
    ['Transform', 'Transform Star'],
	['Turbo', 'Turbo Star'],
    ['Vampire', 'Vampire Star'],
    ['Wagon', 'Wagon Star'],
	['Warp', 'Warp Star'],
    ['Winged', 'Winged Star'],
  ];
  for (const [shortName, starName] of starPairs) {
    if (s === shortName) return starName;
    if (s === starName)  return starName; // keep as-is if already the star variant
  }
  return s;
}

function canonPlayer(nameRaw) {
  return String(nameRaw || '').trim().toLowerCase();
}

function deriveUIFields(r) {
  // 1) Category for table
  let CategoryUI = null;
  if (r.Source === 'CatEx') {
    CategoryUI = 'Category Extension';
  } else if (/full\s*game/i.test(r.Category) || r.Label === 'Extras') {
    CategoryUI = 'Full Game';
  } else {
    CategoryUI = CAT_MAP.get(r.CategoryBucket) || r.CategoryBucket;
  }

  // Normalize '–' to '-' so ordering and filters match our ORDERED_CATEGORIES
  CategoryUI = (CategoryUI || '').replace(/\u2013/g, '-');

 // 2) Subcategory for table
 const sub = s => String(s ?? '').trim();
 
 let SubcategoryUI = '';
 // Speedrider rows should show "Speedrider" in the Subcategory column
 if (r.Source === 'Speedrider') {
   SubcategoryUI = 'Speedrider';
 }
 else if (CategoryUI === 'Category Extension') {
   SubcategoryUI = r.CategoryLabel || sub(r.SubcategoryRaw) || r.Category;
 }
 else if (CategoryUI === 'City Trial - Stadiums') {
   const c = (r.Category || '').toLowerCase();
   SubcategoryUI = /score/.test(c) ? 'Score Based' : 'Time Based';
 }
  else if (CategoryUI.endsWith('Time Attack') || CategoryUI.endsWith('Free Run')) {
    // AR TA/FR → Restricted/Unrestricted ; TR TA/FR → Restricted/Legendaries
    const sraw = (r.SubcategoryRaw || '').toLowerCase();
    if (CategoryUI.startsWith('Top Ride')) {
      if (/legend/.test(sraw)) SubcategoryUI = 'Legendaries';
      else SubcategoryUI = /restrict/.test(sraw) ? 'Restricted' : '';
    } else {
      SubcategoryUI = /restrict/.test(sraw) ? 'Restricted' : (/unrestrict/.test(sraw) ? 'Unrestricted' : '');
    }
  }

else if (CategoryUI === 'Full Game') {
  const raw = sub(r.SubcategoryRaw || r.CategoryLabel);
  // Canonicalize common FG routes
  if (/^no\s*legendaries$/i.test(raw)) {
    SubcategoryUI = 'All Riders & Machines - No Legendaries';
  } else if (/^all\s*riders?\s*&\s*machines\s*-\s*no\s*legendaries$/i.test(raw)) {
    SubcategoryUI = 'All Riders & Machines - No Legendaries';
  } else if (/^all\s*lessons$/i.test(raw)) {
    SubcategoryUI = 'All Lessons';
  } else if (/^100%$/i.test(raw)) {
    SubcategoryUI = '100%';
  } else if (/^all\s*riders?\s*&\s*machines\s*-\s*all\s*unlocks$/i.test(raw)) {
    SubcategoryUI = 'All Riders & Machines - All Unlocks';
  } else {
    SubcategoryUI = raw; // leave as-is for other FG routes (e.g., Tetrathlon, New Game categories)
  }
}
else if (CategoryUI === 'Road Trip' || CategoryUI.endsWith('Full Mode')) {
  SubcategoryUI = sub(r.SubcategoryRaw || r.CategoryLabel);
}

  else {
    SubcategoryUI = sub(r.SubcategoryRaw || r.CategoryLabel || r.Category);
  }

  return { CategoryUI, SubcategoryUI };
}

// Allowed Track/Stadium display names
const AR_COURSES = [
  'Floria Fields','Waveflow Waters','Airtopia Ruins','Crystalline Fissure','Steamgust Forge',
  'Cavernous Corners','Cyberion Highway','Mount Amberfalls','Galactic Nova','Fantasy Meadows',
  'Celestial Valley','Sky Sands','Frozen Hillside','Magma Flows','Beanstalk Park',
  'Machine Passage','Checker Knights','Nebula Belt'
];
const TR_COURSES = ['Flower','Flow','Air','Crystal','Steam','Cave','Cyber','Mountain','Nova'];
const CT_FAMILIES_TIME  = ['VS. Boss','Drag Race','Oval Circuit','Rail Panic','Beam Gauntlet'];
const CT_FAMILIES_SCORE = ['Kirby Melee','Dustup Derby','Big Battle','Air Glider','High Jump','Gourmet Race','Button Rush','Skydive'];

// === City Trial score-based stadiums: family → unit ===
const CT_SCORE_UNIT_BY_FAMILY = {
  'Kirby Melee': 'KOs',
  'Dustup Derby': 'KOs',
  'Big Battle': 'KOs',
  'Air Glider': 'Yards',
  'High Jump':  'Yards',
  'Gourmet Race': 'Points',
  'Button Rush':  'Points',
  'Skydive':      'Points'
};

// Minimal parsers used to decode SRC's time-encoded "scores"
function ct_toMillis(t){
  const s = String(t ?? '').trim(); let m;
  if ((m = s.match(/^(\d+):(\d{2})\.(\d{3})$/))) {
    const mm=+m[1], ss=+m[2], ms=+m[3]; return (mm*60+ss)*1000+ms;
  }
  if ((m = s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/))) {
    const hh=+m[1], mm=+m[2], ss=+m[3], ms=+m[4]; return ((hh*3600)+(mm*60)+ss)*1000+ms;
  }
  if ((m = s.match(/^(\d+)'(\d{2})"(\d{2,3})$/))) {
    const mm=+m[1], ss=+m[2], f=+m[3]; const ms=(m[3].length===2? f*10 : f);
    return (mm*60+ss)*1000+ms;
  }
  return Number.NaN;
}

function ct_parseHMS(str){
  const s = String(str || "").trim(); let m;
  // hh:mm:ss.mmm
  m = s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/);
  if (m) return { h:+m[1], m:+m[2], s:+m[3], ms:+m[4] };
  // mm:ss.mmm
  m = s.match(/^(\d+):(\d{2})\.(\d{3})$/);
  if (m) return { h:0, m:+m[1], s:+m[2], ms:+m[3] };
  // fallback split
  const totalMs = ct_toMillis(s);
  const hh = Math.floor(totalMs / 3600000);
  const mm = Math.floor((totalMs % 3600000) / 60000);
  const ss = Math.floor((totalMs % 60000) / 1000);
  const ms = Math.floor(totalMs % 1000);
  return { h:hh, m:mm, s:ss, ms };
}

// Convert encoded time → numeric score + display text (same logic as citytrial.js)
function ct_decodeScoreValue(timeStr, unit){
  const { h, m, s, ms } = ct_parseHMS(timeStr);

  if (unit === 'KOs' || unit === 'Points') {
    // value is total milliseconds (encoded); display as a plain integer with separators
    const totalMs = (h*3600 + m*60 + s) * 1000 + ms;
    const label = new Intl.NumberFormat('en-US').format(totalMs);
    return { num: totalMs, label };
  }

  if (unit === 'Yards') {
    // yards = (hours*60 + minutes)*1000 + seconds*10 + floor(ms/100) + (ms%100)/100
    const totalMinutes = (h * 60) + m;
    const onesFromMs   = Math.floor(ms / 100); // 0..9
    const twoDecimals  = (ms % 100) / 100;     // .00 .. .99
    const yards = totalMinutes * 1000 + (s * 10) + onesFromMs + twoDecimals;
    const label = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(yards);
    return { num: yards, label };
  }

  return { num: Number.NaN, label: '' };
}

function familyForStadiumLevel(level) {
  const s = String(level || '');
  if (/^vs\.\s*/i.test(s))          return 'VS. Boss';
  if (/^drag\s*race\b/i.test(s))    return 'Drag Race';
  if (/^oval\s*circuit\b/i.test(s)) return 'Oval Circuit';
  if (/^rail\s*panic\b/i.test(s))   return 'Rail Panic';
  if (/^beam\s*gauntlet\b/i.test(s))return 'Beam Gauntlet';

  if (/^kirby\s*melee\b/i.test(s))  return 'Kirby Melee';
  if (/^dustup\s*derby\b/i.test(s)) return 'Dustup Derby';
  if (/^big\s*battle\b/i.test(s))   return 'Big Battle';
  if (/^air\s*glider\b/i.test(s))   return 'Air Glider';
  if (/^high\s*jump\b/i.test(s))    return 'High Jump';
  if (/^gourmet\s*race\b/i.test(s)) return 'Gourmet Race';
  if (/^button\s*rush\b/i.test(s))  return 'Button Rush';
  if (/^skydive\b/i.test(s))        return 'Skydive';
  return '';
}

function computeTrackUI(row, CategoryUI) {
  const t = String(row.Track || '');
  if (CategoryUI === 'City Trial - Stadiums') {
    return familyForStadiumLevel(row.SubcategoryRaw);
  }
  if (CategoryUI.startsWith('Air Ride') && AR_COURSES.includes(t)) return t;
  if (CategoryUI.startsWith('Top Ride') && TR_COURSES.includes(t)) return t;
  return ''; // hide for others
}

/** Initialize Step 2C after Step 2B finished computing “merged” */


function initFiltersAndCharts(merged) {
  // 1) Build the unified dataset with canonical labels + optional score fields
  Dash.all = merged.map(r => {
    const { CategoryUI, SubcategoryUI } = deriveUIFields(r);
    const TrackUI = computeTrackUI(r, CategoryUI);

    // Score fields (City Trial - Score Based)
    let ScoreUnit = null, ScoreNum = null, ScoreLabel = '';
    if (CategoryUI === 'City Trial - Stadiums' && SubcategoryUI === 'Score Based') {
      const fam  = familyForStadiumLevel(r.SubcategoryRaw);
      const unit = CT_SCORE_UNIT_BY_FAMILY[fam];
      if (unit) {
        const conv = ct_decodeScoreValue(r.Time || '', unit);
        ScoreUnit  = unit;
        ScoreNum   = conv.num;
        ScoreLabel = conv.label;
      }
    }

    // Canonicalize Rider/Machine so filters/charts don't splinter
    const Machine = canonMachine(r.Machine);
    const Rider   = canonRider(r.Rider);
	const Player = canonPlayer(r.Player);

    return {
      ...r,
      Machine,
	  Rider,
	  Player,
      CategoryUI, SubcategoryUI, TrackUI,
      ScoreUnit, ScoreNum, ScoreLabel
    };
  });

  // 2) Build distinct options and paint UI
  buildDistincts(Dash.all);
  buildFiltersUI();

  // 3) First render
  applyFilters();
  buildTable();
}

/** Build a distinct list helper over the full dataset (Dash.all). */
function distinctOverAll(mapper) {
  return [...new Set(Dash.all.map(mapper).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
}


// Move "Players with Most Records" card next to the other two charts (same row)
{
  const charCard   = document.querySelector('#dash-char')?.closest('.dash-card');
  const machCard   = document.querySelector('#dash-machine')?.closest('.dash-card');
  const playerCard = document.querySelector('#dash-player')?.closest('.dash-card');

  const chartsRow = charCard?.closest('.dash-row') || machCard?.closest('.dash-row');
  const playersRow = playerCard?.closest('.dash-row');

  if (chartsRow && playerCard && playersRow && playersRow !== chartsRow) {
    chartsRow.appendChild(playerCard);   // move it into the same row as the others
  }
}

function chartDropdownFilters({ mountCardSel, chartSel, onChange, excludeCategories = [] }) {
  const card = document.querySelector(mountCardSel);
  if (!card) return;

  const uid  = mountCardSel.replace(/[^a-z0-9_-]+/gi,'-') + '-' + Math.random().toString(36).slice(2,7);
  const slug = s => String(s||'').toLowerCase().replace(/[^a-z0-9_-]+/g,'-');

  const top = document.createElement('div'); top.className = 'chart-filters';

  /* =============== Category (dropdown with checkboxes) =============== */
  const catGroup = document.createElement('div'); catGroup.className = 'cf-group';
  catGroup.appendChild(Object.assign(document.createElement('div'), { className:'cf-label', textContent:'Category' }));

  const catHost = Object.assign(document.createElement('div'), { className:'ms' });
  const catBtn  = Object.assign(document.createElement('button'), { className:'ms-btn', type:'button', 'aria-expanded':'false', textContent:'All' });
  catHost.appendChild(catBtn);

  const catMenu = Object.assign(document.createElement('div'), { className:'ms-menu', role:'menu' });
  const catList = Object.assign(document.createElement('div'), { className:'ms-list' });

  // Distinct categories -> remove excluded -> sort by fixed order
  const categories = sortCategories(
    [...new Set(Dash.all.map(r => r.CategoryUI))].filter(c => !excludeCategories.includes(c))
  );

  categories.forEach(c => {
    const id  = `${uid}-cat-${slug(c)}`;
    const row = Object.assign(document.createElement('label'), { className:'ms-item', htmlFor:id });
    const box = Object.assign(document.createElement('input'), { type:'checkbox', id, value:c });
    row.appendChild(box); row.appendChild(document.createTextNode(c));
    catList.appendChild(row);
  });
  catMenu.appendChild(catList);
  catHost.appendChild(catMenu);
  catGroup.appendChild(catHost);

  // Actions under Category (kept)
  const catActs = Object.assign(document.createElement('div'), { className:'cf-actions' });
  catActs.appendChild(Object.assign(document.createElement('button'), {
    className:'btn-secondary', type:'button',
    onclick: () => {
      catList.querySelectorAll('input[type="checkbox"]').forEach(b => b.checked = false);
      Local.cats = []; updateChartAndSummary();
    }
  }, { textContent:'All' }));
  catActs.appendChild(Object.assign(document.createElement('button'), {
    className:'btn-secondary', type:'button',
    onclick: () => {
      catList.querySelectorAll('input[type="checkbox"]').forEach(b => b.checked = false);
      Local.cats = []; updateChartAndSummary();
    }
  }, { textContent:'Clear' }));
  catGroup.appendChild(catActs);

  /* ======================= Place (chips) ======================= */
  const plcGroup = document.createElement('div'); plcGroup.className = 'cf-group';
  plcGroup.appendChild(Object.assign(document.createElement('div'), { className:'cf-label', textContent:'Place' }));

  const plcRow = Object.assign(document.createElement('div'), { className:'filt-row' });

  const Local = { cats: [], places: [1], includeSR: false };


  function plcChip(label, value, onChange){
    const id  = `${uid}-pl-${value}`;
    const lab = Object.assign(document.createElement('label'), { className:'filt-chip', htmlFor:id });
    const box = Object.assign(document.createElement('input'), { type:'checkbox', id, value:String(value) });

    // Pre-check based on our default Local state
    if (value === 1 || value === 2 || value === 3) {
      box.checked = Local.places.includes(value);
    } else if (value === '__sr__') {
      box.checked = !!Local.includeSR;
    }

    box.addEventListener('change', () => onChange(box.checked));
    lab.appendChild(box); lab.appendChild(document.createTextNode(label));
    plcRow.appendChild(lab);
    return box;
  }

  plcChip('1st', 1, on => { if (on) { if (!Local.places.includes(1)) Local.places.push(1); } else { Local.places = Local.places.filter(v=>v!==1); } schedule(updateChartAndSummary); });
  plcChip('2nd', 2, on => { if (on) { if (!Local.places.includes(2)) Local.places.push(2); } else { Local.places = Local.places.filter(v=>v!==2); } schedule(updateChartAndSummary); });
  plcChip('3rd', 3, on => { if (on) { if (!Local.places.includes(3)) Local.places.push(3); } else { Local.places = Local.places.filter(v=>v!==3); } schedule(updateChartAndSummary); });
  plcChip('Include Speedrider', '__sr__', on => { Local.includeSR = !!on; schedule(updateChartAndSummary); });

  plcGroup.appendChild(plcRow);

  // Insert both filter groups above the chart
  top.appendChild(catGroup);
  top.appendChild(plcGroup);
  const chartMount = card.querySelector(chartSel);
  if (chartMount) card.insertBefore(top, chartMount);

  // Debounce
  let t = null;
  function schedule(fn) { if (t) clearTimeout(t); t = setTimeout(() => { fn(); t = null; }, 150); }

  // Category dropdown open/close
  function openMenu(host, btn)  { host.classList.add('open');  btn.setAttribute('aria-expanded','true'); }
  function closeMenu(host, btn) { host.classList.remove('open');btn.setAttribute('aria-expanded','false'); }
  catBtn.addEventListener('click', () => catHost.classList.contains('open') ? closeMenu(catHost,catBtn) : openMenu(catHost,catBtn));
  document.addEventListener('click', (e) => { if (!catHost.contains(e.target)) closeMenu(catHost, catBtn); });

  // Category changes
  catList.addEventListener('change', () => {
    schedule(() => {
      Local.cats = Array.from(catList.querySelectorAll('input:checked')).map(i => i.value);
      updateChartAndSummary();
    });
  });

  // Filter + repaint
  function updateChartAndSummary() {
    const subset = Dash.all.filter(r => {
      // Always exclude the suppressed categories for this card
      if (excludeCategories.includes(r.CategoryUI)) return false;

      // Local category filter (if any selected)
      if (Local.cats.length && !Local.cats.includes(r.CategoryUI)) return false;

      // Place + SR additive logic
      const isSR = (r.Place == null);
      if (isSR) {
        if (!Local.includeSR) return false;
      } else {
        if (Local.places.length && !Local.places.includes(Number(r.Place))) return false;
      }
      return true;
    });

    onChange(subset);

    // Button summary
    catBtn.textContent = Local.cats.length
      ? (Local.cats.length <= 3 ? Local.cats.join(', ') : `${Local.cats.length} selected`)
      : 'All';
  }

  updateChartAndSummary();
}

// === Icon paths + maps (only used by the two "Most Popular" charts) ===
// Update these two lines if your icons live elsewhere:
const RIDER_ICON_BASE   = 'icons/riders/';
const MACHINE_ICON_BASE = 'icons/machines/';

// Note: names must match your **canonical** labels produced by canonRider / canonMachine.

// Riders (characters)
const ICONS_RIDER = {
  'Bandana Dee':            RIDER_ICON_BASE + 'KARs_Bandana_Waddle_Dee_icon.png',
  'Cappy':                  RIDER_ICON_BASE + 'KARs_Cappy_icon.png',
  'Chef Kawasaki':          RIDER_ICON_BASE + 'KARs_Chef_Kawasaki_icon.png',
  'Daroach':                RIDER_ICON_BASE + 'KARs_Daroach_icon.png',
  'Gooey':                  RIDER_ICON_BASE + 'KARs_Gooey_icon.png',
  'King Dedede':            RIDER_ICON_BASE + 'KARs_King_Dedede_icon.png',

  // Kirby variants (match your canonicalization)
  'Kirby (Blue or Gray)':   RIDER_ICON_BASE + 'KARs_Kirby_Blue_icon.png',    // using Blue as the representative
  'Kirby (Pink)':           RIDER_ICON_BASE + 'KARs_Kirby_icon.png',
  'Kirby (Red or Purple)':  RIDER_ICON_BASE + 'KARs_Kirby_Red_icon.png',     // using Red as the representative
  'Kirby (Yellow or Green)':RIDER_ICON_BASE + 'KARs_Kirby_Yellow_icon.png',  // using Yellow as the representative

  'Knuckle Joe':            RIDER_ICON_BASE + 'KARs_Knuckle_Joe_icon.png',
  'Lololo & Lalala':        RIDER_ICON_BASE + 'KARs_Lololo_%26_Lalala_icon.png', // %26 encodes "&" for safe URLs
  'Magolor':                RIDER_ICON_BASE + 'KARs_Magolor_icon.png',
  'Marx':                   RIDER_ICON_BASE + 'KARs_Marx_icon.png',
  'Meta Knight':            RIDER_ICON_BASE + 'KARs_Meta_Knight_icon.png',
  'Noir Dedede':            RIDER_ICON_BASE + 'KARs_Noir_Dedede_icon.png',
  'Rick':                   RIDER_ICON_BASE + 'KARs_Rick_icon.png',
  'Rocky':                  RIDER_ICON_BASE + 'KARs_Rocky_icon.png',
  'Scarfy':                 RIDER_ICON_BASE + 'KARs_Scarfy_icon.png',
  'Starman':                RIDER_ICON_BASE + 'KARs_Starman_icon.png',
  'Susie':                  RIDER_ICON_BASE + 'KARs_Susie_icon.png',
  'Taranza':                RIDER_ICON_BASE + 'KARs_Taranza_icon.png',
  'Waddle Dee':             RIDER_ICON_BASE + 'KARs_Waddle_Dee_icon.png',
  'Waddle Doo':             RIDER_ICON_BASE + 'KARs_Waddle_Doo_icon.png',
};

// Machines
const ICONS_MACHINE = {
  'Battle Chariot':     MACHINE_ICON_BASE + 'KARs_Battle_Chariot_Icon.png',
  'Bulk Star':          MACHINE_ICON_BASE + 'KARs_Bulk_Star_Icon.png',
  'Bull Tank':          MACHINE_ICON_BASE + 'KARs_Bull_Tank_Icon.png',
  'Chariot':            MACHINE_ICON_BASE + 'KARs_Chariot_Icon.png',          // if you use this label anywhere
  'Compact Star':       MACHINE_ICON_BASE + 'KARs_Compact_Star_Icon.png',
  'Dragoon':            MACHINE_ICON_BASE + 'KARs_Dragoon_Icon.png',
  'Flight Warp Star':   MACHINE_ICON_BASE + 'KARs_Flight_Warp_Star_Icon.png', // matches your file name
  'Formula Star':       MACHINE_ICON_BASE + 'KARs_Formula_Star_Icon.png',
  'Gigantes':           MACHINE_ICON_BASE + 'KARs_Gigantes_Icon.png',
  'Hop Star':           MACHINE_ICON_BASE + 'KARs_Hop_Star_Icon.png',
  'Hydra':              MACHINE_ICON_BASE + 'KARs_Hydra_Icon.png',
  'Jet Star':           MACHINE_ICON_BASE + 'KARs_Jet_Star_Icon.png',
  'Leo':                MACHINE_ICON_BASE + 'KARs_Leo_Icon.png',
  'Paper Star':         MACHINE_ICON_BASE + 'KARs_Paper_Star_Icon.png',
  'Rex Wheelie':        MACHINE_ICON_BASE + 'KARs_Rex_Wheelie_Icon.png',
  'Rocket Star':        MACHINE_ICON_BASE + 'KARs_Rocket_Star_Icon.png',
  'Shadow Star':        MACHINE_ICON_BASE + 'KARs_Shadow_Star_Icon.png',
  'Slick Star':         MACHINE_ICON_BASE + 'KARs_Slick_Star_Icon.png',
  'Swerve Star':        MACHINE_ICON_BASE + 'KARs_Swerve_Star_Icon.png',
  'Tank Star':          MACHINE_ICON_BASE + 'KARs_Tank_Star_Icon.png',
  'Transform Star':     MACHINE_ICON_BASE + 'KARs_Transform_Star_Icon.png',
  'Turbo Star':         MACHINE_ICON_BASE + 'KARs_Turbo_Star_Icon.png',
  'Vampire Star':       MACHINE_ICON_BASE + 'KARs_Vampire_Star_Icon.png',
  'Wagon Star':         MACHINE_ICON_BASE + 'KARs_Wagon_Star_Icon.png',
  'Warp Star':          MACHINE_ICON_BASE + 'KARs_Warp_Star_Icon.png',
  'Wheelie Bike':       MACHINE_ICON_BASE + 'KARs_Wheelie_Bike_Icon.png',
  'Wheelie Scooter':    MACHINE_ICON_BASE + 'KARs_Wheelie_Scooter_Icon.png',
  'Winged Star':        MACHINE_ICON_BASE + 'KARs_Winged_Star_Icon.png',
};

// Resolve a label -> icon URL if available (only Riders/Machines charts use this)
function iconFor(label, chartKey) {
  if (chartKey === 'Rider')   return ICONS_RIDER[label]   || null;
  if (chartKey === 'Machine') return ICONS_MACHINE[label] || null;
  return null;
}


function paintPopularityChart(rows, key, mountSel, topN=15) {
  const mount = document.querySelector(mountSel);
  if (!mount) return;
  mount.innerHTML = '';
  const counts = tally(rows, key).slice(0, topN);
  const max = counts.length ? counts[0].count : 1;
  const min = counts.length ? counts[counts.length - 1].count : 0;  // because counts is sorted desc
  const chart = document.createElement('div'); chart.className = 'chart';

  counts.forEach(d => {
    const row = document.createElement('div'); row.className='chart-row';

    // Label + optional icon
    const label = document.createElement('div');
    const wantIcon = (key === 'Rider' || key === 'Machine');
    if (wantIcon) {
      label.className = 'chart-label iconized';

      const url = iconFor(d.key, key);
      if (url) {
        const img = document.createElement('img');
        img.className = 'chart-icon';
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = url;
        img.onerror = () => {
          img.remove();
          const fb = document.createElement('span');
          fb.className = 'icon-fallback';
          fb.textContent = (d.key || '?').slice(0,1);
          label.insertBefore(fb, label.firstChild);
        };
        label.appendChild(img);
      } else {
        const fb = document.createElement('span');
        fb.className = 'icon-fallback';
        fb.textContent = (d.key || '?').slice(0,1);
        label.appendChild(fb);
      }
      label.appendChild(document.createTextNode(d.key));
    } else {
      label.className = 'chart-label';
      label.textContent = d.key;
    }

    const count = Object.assign(document.createElement('div'), {className:'chart-count', textContent:String(d.count)});
    const barWrap = Object.assign(document.createElement('div'), {className:'chart-bar-wrap', style:'grid-column:1 / -1;'});

    const barWidthPct = (d.count / (max || 1)) * 100;
    const barColor = colorForCount(d.count, min, max);
    const barSheen = 'linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0) 40%)';
    const bar = Object.assign(document.createElement('div'), { className:'chart-bar' });
    bar.style.width = `${barWidthPct.toFixed(1)}%`;
    bar.style.backgroundColor = barColor;   // base color (darkest for largest)
    bar.style.backgroundImage = barSheen;   // optional sheen overlay

    barWrap.appendChild(bar);

    // Click-to-filter (unchanged)
    barWrap.style.cursor = 'pointer';
    barWrap.title = `Filter by ${key}: ${d.key}`;
    barWrap.addEventListener('click', () => {
      const selMap = {Rider:'riders', Machine:'machines', Player:'players'};
      const sk = selMap[key];
      if (sk && !Dash.sel[sk].includes(d.key)) Dash.sel[sk].push(d.key);
      scheduleRefresh();
    });

    row.appendChild(label);
    row.appendChild(count);
    const row2 = document.createElement('div'); row2.style.gridColumn = '1 / -1';
    row2.appendChild(barWrap);

    chart.appendChild(row);
    chart.appendChild(row2);
  });

  if (!counts.length) chart.appendChild(Object.assign(document.createElement('div'), {className:'info-muted', textContent:'No data under current chart filters.'}));
  mount.appendChild(chart);
}


// Rebuild the search table when the viewport crosses 900px
function installResponsiveRebuild() {
  const mq = window.matchMedia('(max-width: 900px)');
  let last = mq.matches;
  let t = null;

  function onChange() {
    const now = mq.matches;
    if (now === last) return;     // only react when it actually flips
    last = now;
    // debounce a touch so we don't thrash during resize
    if (t) cancelAnimationFrame(t);
    t = requestAnimationFrame(() => {
      // Rebuild under current filters
      applyFilters();
      buildTable();
    });
  }

  // Newer browsers: 'change' event; older Safari: addListener fallback
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else mq.addListener(onChange);
}

/* ============== 8) Main ============== */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1) Load everything in parallel
    const [
      arCSV, trCSV, ctCSV, rtCSV, exCSV,
      srTaCSV, srFrCSV, srTaCsvTR, srFrCsvTR,
      catExJson
    ] = await Promise.all([
      fetchCSV(SRC_CSV_AIR_RIDE),
      fetchCSV(SRC_CSV_TOP_RIDE),
      fetchCSV(SRC_CSV_CITY_TRIAL),
      fetchCSV(SRC_CSV_ROAD_TRIP),
      fetchCSV(SRC_CSV_EXTRAS_FULL_GAME),
      fetchCSV(SR_TA_CSV),
      fetchCSV(SR_FR_CSV),
	  fetchCSV(SR_TA_CSV_TR),
	  fetchCSV(SR_FR_CSV_TR),
      fetchCatEx()
    ]);

    // 2) Canonicalize per source
    const srcRows = []
      .concat(adaptSRC(arCSV, 'Air Ride'))
      .concat(adaptSRC(trCSV, 'Top Ride'))
      .concat(adaptSRC(ctCSV, 'City Trial'))
      .concat(adaptSRC(rtCSV, 'Road Trip'))
      .concat(adaptSRC(exCSV, 'Extras'));
    const srRows  = []
      .concat(adaptSpeedrider(srTaCSV, 'Time Attack', 'Air Ride'))
      .concat(adaptSpeedrider(srFrCSV, 'Free Run', 'Air Ride'))
      .concat(adaptSpeedrider(srTaCsvTR, 'Time Attack', 'Top Ride'))
      .concat(adaptSpeedrider(srFrCsvTR, 'Free Run', 'Top Ride'));
    const ceRows  = adaptCatEx(catExJson);

    // 3) Merge and dedup (video ID first, then fingerprint)
    const merged = dedup([ ...srcRows, ...srRows, ...ceRows ]);

    // 4) Compute stats
    const deltaAR = computeAllTracksDelta(merged, 'Air Ride');
    const deltaTR = computeAllTracksDelta(merged, 'Top Ride');

    // 5) Picks
    const latest    = pickLatest(merged);
    const spotlight = pickSpotlight(merged);

    // 6) Edge-case: if the spotlight vanished between windows, fall back to latest
    const finalSpotlight = spotlight || latest || null;

    // 7) Render
    setSpotlightMount('latest-embed',   'latest-meta',   latest, 'Latest Record');
    setSpotlightMount('spotlight-embed','spotlight-meta',finalSpotlight, 'Record Spotlight');

    setDeltaMount('ar-delta', deltaAR);
    setDeltaMount('tr-delta', deltaTR);

    // Build the new headline strip (left = Spotlight/Latest, right = big deltas with animation)
    renderHeroStrip(latest, finalSpotlight, deltaAR, deltaTR);

    // Dev sanity:
    console.log('[Dashboard] merged:', merged.length,
      { latest, spotlight: finalSpotlight, deltaAR, deltaTR });
    initFiltersAndCharts(merged);
    installResponsiveRebuild();

    chartDropdownFilters({
      mountCardSel:'#dash-char', chartSel:'#chart-rider',
      excludeCategories: EXCLUDE_FOR_CHAR,
      onChange: rows => paintPopularityChart(rows, 'Rider', '#chart-rider')
    });

    chartDropdownFilters({
      mountCardSel:'#dash-machine', chartSel:'#chart-machine',
      excludeCategories: EXCLUDE_FOR_MACHINE,
      onChange: rows => paintPopularityChart(rows, 'Machine', '#chart-machine')
    });

    chartDropdownFilters({
      mountCardSel:'#dash-player', chartSel:'#chart-player',
      excludeCategories: [], // no exclusions for Players
      onChange: rows => paintPopularityChart(rows, 'Player', '#chart-player')
    });

  } catch (err) {
    console.error('[Dashboard] load failed:', err);
    // Minimal UI hint
    const e1 = document.getElementById('latest-meta');
    if (e1) e1.innerHTML = `<div class="muted">Failed to load dashboard data.</div>`;
  }
});
