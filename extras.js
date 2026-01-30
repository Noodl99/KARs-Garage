

/* === SRC Extras CSV (whole tab) === */
const EXTRAS_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?gid=787244572&single=true&output=csv';

/* --- CSV parsing (same as airride.js) --- */
function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\r') { /* swallow CR */ }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else { cur += ch; }
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length && r.some(v => String(v).trim().length));
}
function idxOf(header, colName) {
  const i = header.findIndex(h => String(h).trim().toLowerCase() === String(colName).toLowerCase());
  return i < 0 ? null : i;
}

/* ===== Helpers ===== */
function esc(s){return String(s ?? '').replace(/[&<>"']/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function link(url,label){ if(!url) return ''; const u=String(url); return `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(label||u)}</a>`; }
function fmtFromMs(ms){
  if(!ms || isNaN(ms)) return '—';
  const t = Math.max(0, Math.round(ms));
  const h = Math.floor(t/3600000), m=Math.floor((t%3600000)/60000), s=Math.floor((t%60000)/1000), cc=Math.round((t%1000)/10);
  const HH=String(h).padStart(2,'0'), MM=String(m).padStart(2,'0'), SS=String(s).padStart(2,'0'), CC=String(cc).padStart(2,'0');
  return `${HH}:${MM}:${SS}.${CC}`;
}

/* Mount a standard table (your existing .table styles) */

function mountTable(containerId, columns, rows, emptyHref){
  const el = document.getElementById(containerId); if(!el) return;
  const emptyLink = emptyHref ? `<a href="${esc(emptyHref)}" target="_blank" rel="noopener">Be the first!</a>` : '';
  const thead = `<thead><tr>${columns.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${
    rows.length
      ? rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')
      : `<tr><td class="empty" colspan="${columns.length}"><span class="empty-msg"><span>No runs submitted for this category.</span> ${emptyLink}</span></td></tr>`
  }</tbody>`;
  el.innerHTML = `<div class="table-scroll"><table class="table table--fg">${thead}${tbody}</table></div>`;
}


/** Paint a 4‑column Full‑Game table: Player | Time | SRC | Video */
function paintExtrasTable(mountId, rows) {
  const el = document.getElementById(mountId);
  if (!el) return;

  // Column layout (desktop): 28% | 16% | 28% | 28%
  const colgroup = `
    <colgroup>
      <col style="width:28%">
      <col style="width:16%">
      <col style="width:28%">
      <col style="width:28%">
    </colgroup>
  `;
  const columns = ['Player','Time','SRC Link','Video'];

  const trows = rows.map((r,i) => [
    esc(r.Player),
    esc(r.Time),
    link(r.Link, String(r.Link || '')),
    link(r.Video, String(r.Video ||''))
  ]);

  const thead = `<thead><tr>${columns.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${
    trows.length
      ? trows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')
      : `<tr><td class="empty" colspan="${columns.length}"><span class="empty-msg"><span>No runs submitted for this category.</span> <a href="https://www.speedrun.com/kars/runs/new" target="_blank" rel="noopener">Be the first!</a></span></td></tr>`
  }</tbody>`;

  el.innerHTML = `<div class="table-scroll"><table class="table table--fg table--fg4">${colgroup}${thead}${tbody}</table></div>`;
}


/** Load the EXTRAS_CSV once, split into the eight blocks, then paint */
async function loadExtrasSRCFromCsv() {
  if (!EXTRAS_CSV) return;
  const res  = await fetch(EXTRAS_CSV, { cache:'no-store' });
  const text = await res.text();
  const rows = parseCSV(text);
  if (!rows || rows.length < 2) {
    // paint empty states
    ['fg-arm-noleg','fg-arm-allunlocks','fg-all-lessons','fg-100',
     'fg-ngc-air-ride','fg-ngc-top-ride','fg-ngc-city-trial','fg-tetrathlon']
      .forEach(id => paintExtrasTable(id, []));
    return;
  }

  const header = rows[0].map(h => String(h).trim());
  const IDX = {
    Category: idxOf(header, 'Category'),
    Subcategory: idxOf(header, 'Subcategory'),
    Player:      idxOf(header, 'Player'),
    Time:        idxOf(header, 'Time'),
    Machine:     idxOf(header, 'Machine'),
    Rider:       idxOf(header, 'Rider'),
    Link:        idxOf(header, 'Link'),
    Video:       idxOf(header, 'Video')
  };

function mapExtrasRow(row, IDX) {
  return {
    Category:    row[IDX.Category] || '',
    Subcategory: row[IDX.Subcategory] || '',
    Player:      row[IDX.Player] || '',
    Time:        row[IDX.Time] || '',
    Machine:     row[IDX.Machine] || '',
    Rider:       row[IDX.Rider] || '',
    Link:        row[IDX.Link] || '',
    Video:       row[IDX.Video] || ''
  };
}


  const body = rows.slice(1).map(r => {
    const obj = mapExtrasRow(r, IDX);
    // Defend CSV percent coercion (100% -> 1)
    if (obj.Subcategory === '1') obj.Subcategory = '100%';
    if (obj.Category    === '1') obj.Category    = '100%';
    return obj;
  });
  
  // helper: check in Subcategory OR Category
  const hasAny = (row, regex) => regex.test(String(row.Subcategory||'')) || regex.test(String(row.Category||''));


  // Helper: case-insensitive "includes" on subcategory
  const has = (row, regex) => regex.test(String(row.Subcategory||''));

  // 1) All Riders & Machines — No Legendaries
  paintExtrasTable(
    'fg-arm-noleg',
    body.filter(r => hasAny(r, /no\s*legendaries/i))
  );

  // 2) All Riders & Machines — All Unlocks
  paintExtrasTable(
    'fg-arm-allunlocks',
    body.filter(r => hasAny(r, /all\s*unlocks/i))
  );

  // 3) All Lessons
  paintExtrasTable(
    'fg-all-lessons',
    body.filter(r => hasAny(r, /all\s*lessons/i))
  );

  // 4) 100%
  paintExtrasTable(
    'fg-100',
    body.filter(r => hasAny(r, /(^|\b)100%(\b|$)/i))
  );

  // 5-7) New Game Categories (three sublabels)
  paintExtrasTable(
    'fg-ngc-air-ride',
    body.filter(r => hasAny(r, /new\s*game\s*categories/i) && hasAny(r, /air\s*ride\s*100%/i))
  );
  paintExtrasTable(
    'fg-ngc-top-ride',
    body.filter(r => hasAny(r, /new\s*game\s*categories/i) && hasAny(r, /top\s*ride\s*100%/i))
  );
  paintExtrasTable(
    'fg-ngc-city-trial',
    body.filter(r => hasAny(r, /new\s*game\s*categories/i) && hasAny(r, /city\s*trial\s*100%/i))
  );

  // 8) Tetrathlon
  paintExtrasTable(
    'fg-tetrathlon',
    body.filter(r => hasAny(r, /tetrathl/i))
  );
}

/* ===== CE (Category Extensions) ===== */
const CE_SECTIONS = [
  {
    id: 'ce-amiibo',
    category: 'Amiibo - Air Ride All Tracks',
    columns: ['Rank','Player','Time','Amiibo','Video'],
    row: (r,i)=>[
      String(i+1),
      esc(r.display_name||''),
      r.metric_type==='points' ? esc(String(r.points)) : fmtFromMs(r.time_ms),
      esc(r.rider||''),
      link(r.video_url, String(r.video_url || ''))
    ]
  },
  {
    id: 'ce-online-85',
    category: 'Online Checklist - 85 Checkboxes',
    columns: ['Rank','Player','Time','Video'],
    row: (r,i)=>[
      String(i+1),
      esc(r.display_name||''),
      r.metric_type==='points' ? esc(String(r.points)) : fmtFromMs(r.time_ms),
      link(r.video_url, String(r.video_url || ''))
    ]
  },
  {
    id: 'ce-99-air-ride',
    category: '99 Laps - Air Ride',
    columns: ['Rank','Player','Time','Rider','Machine','Video'],
    row: (r,i)=>[
      String(i+1),
      esc(r.display_name||''),
      r.metric_type==='points' ? esc(String(r.points)) : fmtFromMs(r.time_ms),
      esc(r.rider||''),
      esc(r.machine||''),
      link(r.video_url, String(r.video_url || ''))
    ]
  },
  {
    id: 'ce-99-top-ride',
    category: '99 Laps - Top Ride',
    columns: ['Rank','Player','Time','Rider','Machine','Video'],
    row: (r,i)=>[
      String(i+1),
      esc(r.display_name||''),
      r.metric_type==='points' ? esc(String(r.points)) : fmtFromMs(r.time_ms),
      esc(r.rider||''),
      esc(r.machine||''),
      link(r.video_url, String(r.video_url || ''))
    ]
  }
];


async function loadExtras(){
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  const tasks = [];

  // 1) Cat-Ex JSON (run in parallel)
  tasks.push((async ()=>{
    try{
      const res = await fetch(CE_API_BASE, { cache:'no-store' });
      const data = await res.json();

      /* normalize category keys so "-" and "–" match */
      const normKey = (s) => String(s || '')
        .replace(/[\u2013\u2014\u2212]/g, '-')  // en dash / em dash / minus -> hyphen
        .replace(/\s+/g, ' ')
        .trim();

      const dataNorm = {};
      Object.keys(data || {}).forEach(k => { dataNorm[normKey(k)] = data[k]; });

      CE_SECTIONS.forEach(sec => {
        const runs = dataNorm[normKey(sec.category)] || [];
        const rows = runs.map((r,i)=>sec.row(r,i));
        mountTable(sec.id, sec.columns, rows, 'https://forms.gle/PsSRSGpU8V2gfcUt6');
      });
    }catch(err){
      console.error(err);
      CE_SECTIONS.forEach(sec=>{
        const el=document.getElementById(sec.id);
        if(el) el.innerHTML = `<div class="extras-error">Could not load Category Extensions.</div>`;
      });
    }
  })());

  // 2) Full Game CSV (run in parallel)
  tasks.push(loadExtrasSRCFromCsv());

  // Wait for both
  await Promise.all(tasks);

  // ===== Scroll spy (underline active TOC item) =====
  const sectionIds = [
    'ex-arm-noleg','ex-arm-all','ex-lessons','ex-100',
    'ex-ngc-air','ex-ngc-top','ex-ngc-city','ex-tetrathlon',
    'ce-amiibo-anchor','ce-online-85-anchor','ce-99-air-anchor','ce-99-top-anchor',
    'full-game','cat-ex'
  ];
  (function setupScrollSpy(ids){
    const unique = [...new Set(ids)];
    const links = unique
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
  
    unique.forEach(id => {
      const anchor = document.getElementById(id);
      if (anchor) observer.observe(anchor);
    });
  })(sectionIds);
  


// ===== Mobile: collapsible Rules (no DOM moving — only show/hide) =====
(function mobileRules(){
  const mq = window.matchMedia('(max-width: 900px)');

  function applyMobileRulesMode(isMobile) {
    document.querySelectorAll('.catex-section').forEach(sec => {
      const rules = sec.querySelector('.catex-rules');
      const title = sec.querySelector('.catex-title');
      if (!rules || !title) return;

      // Remove any existing toggle from previous mode switch
      const oldBtn = sec.querySelector('.rules-toggle');
      if (oldBtn) oldBtn.remove();
      rules.classList.remove('is-collapsed');

      if (isMobile) {
        // Insert toggle under the title
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rules-toggle';
        btn.textContent = 'Rules';
        btn.setAttribute('aria-expanded', 'false');

        title.insertAdjacentElement('afterend', btn);

        // Start collapsed on mobile
        rules.classList.add('is-collapsed');

        btn.addEventListener('click', () => {
          const open = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', String(!open));
          rules.classList.toggle('is-collapsed', open);
        });
      }
    });
  }

  // Apply at load
  applyMobileRulesMode(mq.matches);

  // Apply when resizing
  mq.addEventListener('change', e => applyMobileRulesMode(e.matches));
})();
} // <--- this closes loadExtras()


// Example loader for SRC extras if you expose them later as JSON
async function loadSrcBlock(url, mountId){
  const el = document.getElementById(mountId); if(!el) return;
  try{
    const res = await fetch(url, { cache:'no-store' });
    const payload = await res.json(); // expect { runs: [...] } or [...]
    const list = Array.isArray(payload) ? payload : (payload.runs || []);
    const columns = ['Rank','Player','Time','Machine','Rider','SRC Link','Video'];
    const rows = list.map((r,i)=>[
      String(i+1), esc(r.player||''), esc(r.time_text||fmtFromMs(r.time_ms)),
      esc(r.machine||''), esc(r.rider||''), link(r.src_url,'SRC'), link(r.video_url,'Video')
    ]);
    mountTable(mountId, columns, rows);
  }catch(e){
    el.innerHTML = `<div class="extras-error">Could not load.</div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadExtras);
