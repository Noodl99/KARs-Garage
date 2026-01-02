
// KARs Garage — Air Ride page
// Renders course TOC, SRC tables (TA R/U, FR R/U), and Speedrider strips.
// Ensures link cells are real <a> tags with ellipsized labels and correct anchors.
// Adds scroll-spy for the sidebar.

(function () {
  const COURSES = [
    { id: 'sunny', name: 'Sunny Sky' },
    { id: 'the-funnel', name: 'The Funnel' },
    { id: 'forest', name: 'Forest' },
    { id: 'sand', name: 'Sand' },
    { id: 'snow', name: 'Snow' },
    { id: 'magmac', name: 'Magmac' }
    // Add more as needed
  ];

  // ✅ Exact filenames/case — must match /images/
  const BANNERS = {
    'sunny': 'images/Sunny Sky.webp',
    'the-funnel': 'images/The Funnel.webp',
    'forest': 'images/Forest.webp',
    'sand': 'images/Sand.webp',
    'snow': 'images/Snow.webp',
    'magmac': 'images/Magmac.webp'
  };

  // Utility: strip protocol and www for label
  function stripPrefix(url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      return host + u.pathname;
    } catch {
      return url;
    }
  }

  // ✅ Link cell builder — always returns <a>
  function linkCell(url, textOverride) {
    if (!url) return '';
    const label = textOverride || stripPrefix(url);
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = label;
    return a;
  }

  // Build TOC anchors
  function buildTOC(courses) {
    const nav = document.getElementById('course-nav');
    if (!nav) return;
    nav.innerHTML = '';
    courses.forEach(c => {
      const li = document.createElement('li');
      const a = document.createElement('a');         // ✅ real anchor
      a.href = `#${c.id}`;                           // e.g., #sunny
      a.textContent = c.name;
      li.appendChild(a);
      nav.appendChild(li);
    });
  }

  // Build a table (generic renderer)
  function renderTable(title, rows) {
    const wrap = document.createElement('div');
    wrap.className = 'table-block';

    const table = document.createElement('table');
    table.className = 'table';

    // ✅ colgroup plan to fix widths and avoid overflow
    const cg = document.createElement('colgroup');
    [
      ['player', 'player'],
      ['time', 'time'],
      ['machine', 'machine'],
      ['rider', 'rider'],
      ['src', 'src'],
      ['video', 'video']
    ].forEach(([cls]) => {
      const col = document.createElement('col');
      col.className = cls;
      cg.appendChild(col);
    });
    table.appendChild(cg);

    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th colspan="6">${title}</th>
      </tr>
      <tr>
        <th>Player</th>
        <th>Time</th>
        <th>Machine</th>
        <th>Rider</th>
        <th>SRC Link</th>
        <th>Video</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    if (!rows || rows.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'No data yet';
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      rows.forEach(r => {
        const tr = document.createElement('tr');

        const tdPlayer = document.createElement('td'); tdPlayer.className = 'td--player'; tdPlayer.textContent = r.player || '';
        const tdTime   = document.createElement('td'); tdTime.className   = 'td--time';   tdTime.textContent   = r.time || '';
        const tdMachine= document.createElement('td'); tdMachine.className= 'td--machine';tdMachine.textContent= r.machine || '';
        const tdRider  = document.createElement('td'); tdRider.className  = 'td--rider';  tdRider.textContent  = r.rider || '';

        const tdSRC    = document.createElement('td'); tdSRC.className    = 'td--src';
        const tdVideo  = document.createElement('td'); tdVideo.className  = 'td--video';

        const srcA = linkCell(r.src);
        const vidA = linkCell(r.video);

        if (srcA) tdSRC.appendChild(srcA);
        if (vidA) tdVideo.appendChild(vidA);

        tr.append(tdPlayer, tdTime, tdMachine, tdRider, tdSRC, tdVideo);
        tbody.appendChild(tr);
      });
    }

    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  // Speedrider strip renderer (simple)
  function renderSpeedriderStrip(title, items) {
    const wrap = document.createElement('div');
    const h = document.createElement('h4');
    h.textContent = title;
    wrap.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'speedrider-strip';

    if (!items || items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'speedrider-card';
      empty.textContent = 'No data yet';
      grid.appendChild(empty);
    } else {
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'speedrider-card';
        card.innerHTML = `
          <div><strong>${it.player || ''}</strong></div>
          <div>${it.time || ''}</div>
          <div>${it.machine || ''} — ${it.rider || ''}</div>
        `;
        const links = document.createElement('div');
        links.style.marginTop = '4px';
        const a1 = linkCell(it.src, 'SRC');
        const a2 = linkCell(it.video, 'Video');
        if (a1) { a1.style.marginRight = '8px'; links.appendChild(a1); }
        if (a2) links.appendChild(a2);
        card.appendChild(links);
        grid.appendChild(card);
      });
    }

    wrap.appendChild(grid);
    return wrap;
  }

  // Compose course section with banner and the four SRC tables + two Speedrider strips
  function renderCourseSection(course, data) {
    const section = document.createElement('section');
    section.className = 'course-section';
    section.id = course.id;

    const banner = document.createElement('div');
    banner.className = 'course-banner';

    const img = document.createElement('img');
    const bannerPath = BANNERS[course.id];
    if (bannerPath) {
      img.src = bannerPath; // ✅ real image path used
      img.alt = `${course.name} banner`;
    } else {
      img.alt = `${course.name}`;
    }
    banner.appendChild(img);

    const title = document.createElement('h3');
    title.textContent = course.name;
    banner.appendChild(title);

    section.appendChild(banner);

    // Tables: TA R/U side-by-side, then FR R/U beneath
    const wrapTA = document.createElement('div');
    wrapTA.className = 'table-wrap';
    wrapTA.appendChild(renderTable('Time Attack — Restricted', data?.ta?.restricted || []));
    wrapTA.appendChild(renderTable('Time Attack — Unrestricted', data?.ta?.unrestricted || []));
    section.appendChild(wrapTA);

    const wrapFR = document.createElement('div');
    wrapFR.className = 'table-wrap';
    wrapFR.appendChild(renderTable('Free Run — Restricted', data?.fr?.restricted || []));
    wrapFR.appendChild(renderTable('Free Run — Unrestricted', data?.fr?.unrestricted || []));
    section.appendChild(wrapFR);

    // Speedrider strips: TA then FR
    section.appendChild(renderSpeedriderStrip('Speedrider — Time Attack', data?.speedrider?.ta || []));
    section.appendChild(renderSpeedriderStrip('Speedrider — Free Run', data?.speedrider?.fr || []));

    return section;
  }

  // Simple scroll spy
  function setupScrollSpy() {
    const links = Array.from(document.querySelectorAll('.sidebar a'));
    const sections = links
      .map(a => document.querySelector(a.getAttribute('href')))
      .filter(Boolean);

    function onScroll() {
      const y = window.scrollY + 100; // offset
      let active = null;
      for (const s of sections) {
        if (s.offsetTop <= y) active = s;
      }
      links.forEach(a => a.classList.toggle('active', active && a.getAttribute('href') === `#${active.id}`));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Build TOC
    buildTOC(COURSES);

    // Render content sections — placeholder/sample structure.
    const content = document.getElementById('content');
    COURSES.forEach(c => {
      // In production, you’ll pass real WR/current data from your pipeline:
      const sample = {
        ta: { restricted: [], unrestricted: [] },
        fr: { restricted: [], unrestricted: [] },
        speedrider: { ta: [], fr: [] }
      };
      content.appendChild(renderCourseSection(c, sample));
    });

    setupScrollSpy();

    // Ensure footer year is set
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  });
})();
