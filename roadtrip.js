
/*
 * KARs Garage — Road Trip
 * - Six full-game categories in a 2x3 grid under the banner
 * - Hides Machine/Rider columns
 * - Uses the same published SRC CSV (specific sheet gid)
 */

/* === Remote CSV === */
const SRC_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLdSEHHpUNrBHTlJlEZLBJmJpbBuxrnJ4AXQk_vqzhVoyliOzaM-uEAw-WXNskMOhcjZq7HWLctrBN/pub?gid=433573429&single=true&output=csv";

/* === Categories (order fixed) === */
const ROUTES = [
  "Any% Casual",
  "Any% Normal",
  "Any% Hard",
  "Any% Super Hard",
  "True Ending",
  "100%"
];

/* === Banner === */
const RT_BANNER = "images/RoadTrip.webp";

/* --- CSV parser (same as others) --- */
function parseCSV(text){
  const rows=[]; let row=[], cur='', inQ=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], nx=text[i+1];
    if(inQ){ if(ch==='"' && nx=== '"'){cur+='"'; i++;} else if(ch==='"'){inQ=false;} else {cur+=ch;} }
    else { if(ch==='"') inQ=true; else if(ch===','){row.push(cur); cur='';} else if(ch==='\r'){ } else if(ch==='\n'){row.push(cur); rows.push(row); row=[]; cur='';} else {cur+=ch;} }
  }
  if(cur.length || row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r=>r.length && r.some(v=>String(v).trim().length));
}
function idxOf(h, name){ const i=h.findIndex(x=>String(x).trim().toLowerCase()===String(name).toLowerCase()); return i<0?null:i; }
function normalizeUrl(u){
  if(!u) return ''; const raw=String(u).trim();
  if(/^https?:\/\//i.test(raw)) return raw;
  if(/^https?\/\/(?=\w)/i.test(raw)) return raw.replace(/^https?/i, m=>m+':');
  if(/^www\./i.test(raw)) return 'https://'+raw;
  if(/^[a-z0-9\-_.]+\.[a-z]{2,}(?:\/.*)?$/i.test(raw)) return 'https://'+raw;
  return raw;
}
function labelForUrl(u){
  try{ const url=new URL(u); const host=url.hostname.replace(/^www\./i,''); const path=url.pathname.replace(/\/+$/,''); return host+(path&&path!=='/'?path:''); }
  catch{ return String(u).replace(/^https?:\/\/(?:www\.)?/i,''); }
}
function linkCell(url){ const href=normalizeUrl(url); if(!href) return ''; const lab=labelForUrl(href); return `<a href="${href}" target="_blank" rel="noopener">${lab}</a>`; }
function toMillis(t){
  const s=String(t??'').trim(); let m;
  if((m=s.match(/^(\d+):(\d{2})\.(\d{3})$/))){ const mm=+m[1], ss=+m[2], ms=+m[3]; return (mm*60+ss)*1000+ms; }
  if((m=s.match(/^(\d+):(\d{2}):(\d{2})\.(\d{3})$/))){ const hh=+m[1], mm=+m[2], ss=+m[3], ms=+m[4]; return ((hh*3600)+(mm*60)+ss)*1000+ms; }
  if((m=s.match(/^(\d+)'(\d{2})"(\d{2,3})$/))){ const mm=+m[1], ss=+m[2], f=+m[3], ms=(m[3].length===2? f*10 : f); return (mm*60+ss)*1000+ms; }
  return Number.POSITIVE_INFINITY;
}

/* === Rider icon map (same set you use on other pages) === */
const ICONS_BY_LABEL_RIDER = {
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
};
const ICONS_BY_KEY_RIDER = Object.fromEntries(
  Object.entries(ICONS_BY_LABEL_RIDER).map(([k,v]) => [
    String(k).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''),
    v
  ])
);
function normKey(s){
  return String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function esc(s){
  return String(s ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
/* Build a Rider cell that contains an icon (if available) + text (for accessibility) */
function buildRiderCell(label){
  const key = normKey(label);
  const src = ICONS_BY_LABEL_RIDER[label] || ICONS_BY_KEY_RIDER[key] || null;
  if (src) {
    return {
      cls: `cell--rider has-icon`,
      html: `
        <span class="cell-icon" aria-hidden="true">
          <img src="${src}" alt="" />
        </span>
        <span class="cell-text">${esc(label ?? '')}</span>
      `
    };
  }
  return { cls:'cell--rider', html:`<span class="cell-text">${esc(label ?? '')}</span>` };
}

/* === Render table (HIDE Machine/Rider) === */

function renderSrcTable(mountId, rows){
  const mount=document.getElementById(mountId); if(!mount) return;

  // Player | Time | Rider | SRC Link | Video   (no Machine)
  const COLS=["Player","Time","Rider","SRC Link","Video"];
  const colgroup=`
    <colgroup>
      <col style="width:22%">
      <col style="width:16%">
      <col style="width:16%">
      <col style="width:23%">
      <col style="width:23%">
    </colgroup>
  `;

  let html=`
    <div class="table-scroll">
      <table class="table table--rt">
        ${colgroup}
        <thead><tr>${COLS.map(c=>`<th data-col="${c}">${c}<span class="sort-ind"></span></th>`).join('')}</tr></thead>
        <tbody>
  `;

  if(rows && rows.length){
    const sorted = rows.slice().sort((a,b)=>toMillis(a.Time)-toMillis(b.Time));
    for(const r of sorted){
      const rider = buildRiderCell(r.Rider ?? '');
      html += `
        <tr>
          <td>${esc(r.Player ?? '')}</td>
          <td class="td--time">${esc(r.Time ?? '')}</td>
          <td class="${rider.cls}">${rider.html}</td>
          <td>${linkCell(r.Link)}</td>
          <td>${linkCell(r.Video)}</td>
        </tr>
      `;
    }
  }else{
    const emptyUrl='https://www.speedrun.com/kars/runs/new';
    html += `<tr><td class="empty" colspan="${COLS.length}">
      <span class="empty-msg">
        <span>No runs submitted for this category.</span>
        <a href="${emptyUrl}" target="_blank" rel="noopener">Be the first!</a>
      </span>
    </td></tr>`;
  }

  html += `</tbody></table></div>`;
  mount.innerHTML = html;

  // Click-sort: Time by millis; others lexicographic
  {
    const ths=mount.querySelectorAll('th'); let sortState={};
    ths.forEach(th=>{
      th.addEventListener('click', ()=>{
        const col=th.getAttribute('data-col');
        const dir=(sortState.col===col && sortState.dir==='asc')?'desc':'asc';
        sortState={col,dir};

        const tbody=mount.querySelector('tbody');
        const rowsEl=Array.from(tbody.querySelectorAll('tr')).filter(tr=>!tr.querySelector('.empty'));
        if(rowsEl.length<=1) return;

        const headers=Array.from(mount.querySelectorAll('thead th')).map(h=>h.getAttribute('data-col'));
        const idx=headers.indexOf(col)+1; if(idx<=0) return;

        rowsEl.sort((rA,rB)=>{
          const a=rA.querySelector(`td:nth-child(${idx})`)?.textContent.trim()||'';
          const b=rB.querySelector(`td:nth-child(${idx})`)?.textContent.trim()||'';
          let cmp;
          if(col==='Time'){ cmp=toMillis(a)-toMillis(b); }
          else{ cmp=a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}); }
          return dir==='asc'?cmp:-cmp;
        });
        rowsEl.forEach(el=>tbody.appendChild(el));
        mount.querySelectorAll('.sort-ind').forEach(i=>i.textContent='');
        th.querySelector('.sort-ind').textContent = dir==='asc'?'▲':'▼';
      });
    });
  }
}

/* === MAIN === */
async function loadRT(){
  // Footer year
  const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

  const res = await fetch(SRC_CSV,{cache:'no-cache'}); const text=await res.text();
  const rows = parseCSV(text); const header=rows[0].map(h=>String(h).trim());
  const IDX = {
    Category: idxOf(header,"Category"),
    Level:    idxOf(header,"Level"),
    Subcat:   idxOf(header,"Subcategory"),
    Player:   idxOf(header,"Player"),
    Time:     idxOf(header,"Time"),
    Rider:    idxOf(header,"Rider"),
    Link:     idxOf(header,"Link"),
    Video:    idxOf(header,"Video")
  };

  // Collect per-route rows (Category ~ Road Trip, Level empty)
  const REG_RT = /road\s*trip/i;
  const byRoute = new Map(ROUTES.map(r=>[r,[]]));
  rows.slice(1).forEach(r=>{
    const cat = String(r[IDX.Category] ?? '');
    const level = String(r[IDX.Level] ?? '');
    const sub = String(r[IDX.Subcat] ?? '')
      .trim()
      .replace(/\uFF05/g, '%')   // full-width percent -> ASCII %
      .replace(/\s+/g, ' ');     // collapse whitespace
    if(!REG_RT.test(cat)) return;
    if(level) return; // only per-game
    if(!byRoute.has(sub)) return; // only our 6 routes

    byRoute.get(sub).push({
      Player: r[IDX.Player],
      Time:   r[IDX.Time],
      Rider:  r[IDX.Rider],
      Link:   r[IDX.Link],
      Video:  r[IDX.Video]
    });
  });

  // Build TOC (six items only)
  const nav = document.getElementById('course-nav');
  const sectionIds = [];
  let navHtml = '';
  ROUTES.forEach(name=>{
    const id = `rt-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}`;
    navHtml += `<a href="#${id}" class="toc-item">${esc(name)}</a>`;
    sectionIds.push(id);
  });
  nav.innerHTML = navHtml;


  // Build the single banner section with a 2x3 grid of cards
  const content = document.getElementById('content');
  const sec = document.createElement('section');
  sec.className='course';
  const cards = ROUTES.map(name=>{
    const id = `rt-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}`;
    return `
      <article class="table-card">
        <span id="${id}" class="anchor"></span>
        <h3>${name}</h3>
        <div id="${id}-tbl"></div>
      </article>
    `;
  }).join('');

  sec.innerHTML = `
    <span id="rt-banner" class="anchor"></span>
    <figure class="banner-wrap">
      <img class="course-banner" src="${RT_BANNER}" alt="Road Trip banner" />
      <figcaption class="banner-title">Full Mode</figcaption>
    </figure>
    <div class="tables-grid">${cards}</div>
    <hr class="section-divider" />
  `;
  content.appendChild(sec);

  // Paint tables (hide MR always)
  ROUTES.forEach(name=>{
    const id = `rt-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}-tbl`;
    renderSrcTable(id, byRoute.get(name));
  });

  // Scroll spy + smooth scroll (reuse your helpers)
  setupScrollSpy(sectionIds);
  document.getElementById('course-nav').querySelectorAll('a').forEach(a=>{
    a.addEventListener('click', e=>{
      e.preventDefault();
      const t=document.querySelector(a.getAttribute('href'));
      if(t) t.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
}
document.addEventListener('DOMContentLoaded', loadRT);
