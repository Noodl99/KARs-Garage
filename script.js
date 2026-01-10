// KARs Garage — shared helpers (Home + Air Ride)
document.addEventListener('DOMContentLoaded', () => {
  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // --- Robust top-nav "active" highlighting ---
  const here = location.pathname
    .replace(/index\.html$/i, '')
    .replace(/\/+$/, '/') || '/';

  document.querySelectorAll('.site-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#')) return;

    const url = new URL(href, location.href);
    const target = url.pathname
      .replace(/index\.html$/i, '')
      .replace(/\/+$/, '/') || '/';

    if (target === here) {
      a.classList.add('active');
    }
  });
});


// Mobile TOC toggle — minimal version (for debugging)
(function(){
  const toggle = document.querySelector('.toc-toggle');     // the Courses button
  const drawer = document.getElementById('toc-drawer');     // the dropdown panel

  if (!toggle || !drawer) return;

  // Ensure drawer can be displayed (extra-safe; CSS should do this on mobile)
  drawer.style.display = 'block';

  // Log once so we know we attached
  console.log('[TOC] minimal toggle ready');

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const willOpen = !drawer.classList.contains('open');
    drawer.classList.toggle('open', willOpen);
    toggle.setAttribute('aria-expanded', String(willOpen));
    console.log('[TOC] toggled. drawer.class=', drawer.className, 'aria-expanded=', toggle.getAttribute('aria-expanded'));

// Mirror desktop course nav into the mobile drawer
(function(){
  const desktopNav = document.getElementById('course-nav');        // left sidebar nav
  const mobileNav  = document.getElementById('course-nav-mobile');  // nav inside the drawer
  if (!desktopNav || !mobileNav) return;

  function copyNavIfReady() {
    // If desktop nav now has links, copy them once
    if (desktopNav.children.length > 0 || desktopNav.textContent.trim().length > 0) {
      mobileNav.innerHTML = desktopNav.innerHTML;
      return true;
    }
    return false;
  }

  // Try immediately (in case it's already populated)
  if (copyNavIfReady()) return;

  // Otherwise, watch for when airride.js populates #course-nav
  const obs = new MutationObserver(() => {
    if (copyNavIfReady()) {
      obs.disconnect();
    }
  });
  obs.observe(desktopNav, { childList: true, subtree: true, characterData: true });
})();

  });
})();
