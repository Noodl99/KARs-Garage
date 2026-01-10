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

  // Toggle open/close on button click
  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const willOpen = !drawer.classList.contains('open');
    drawer.classList.toggle('open', willOpen);
    toggle.setAttribute('aria-expanded', String(willOpen));
  });

  // Mirror desktop course nav into the mobile drawer
  (function(){
    const desktopNav = document.getElementById('course-nav');        // left sidebar nav
    const mobileNav  = document.getElementById('course-nav-mobile'); // nav inside the drawer
    if (!desktopNav || !mobileNav) return;

    function copyNavIfReady() {
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

  // Close the mobile drawer on outside click, Esc, or after clicking a link
  (function(){
    const mobileNav = document.getElementById('course-nav-mobile');

    // Close if you click anywhere that's not the button or the drawer
    document.addEventListener('click', (e) => {
      const open = drawer.classList.contains('open');
      if (!open) return;

      const clickedInside = drawer.contains(e.target) || toggle.contains(e.target);
      if (!clickedInside) {
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });

    // Close after clicking any link inside the drawer
    if (mobileNav) {
      mobileNav.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        drawer.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    }
  })();

  // Optional: close if the user scrolls the page
  let scrollCloseTimer = null;
  window.addEventListener('scroll', () => {
    if (!drawer.classList.contains('open')) return;
    clearTimeout(scrollCloseTimer);
    scrollCloseTimer = setTimeout(() => {
      drawer.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }, 250);
  }, { passive: true });
})();
