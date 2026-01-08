
// KARs Garage — shared helpers (Home + Air Ride)
document.addEventListener('DOMContentLoaded', () => {
  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // --- Robust top-nav "active" highlighting ---
  // Treat "/" and "/index.html" as the same, and normalize trailing slashes.
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

// Mobile TOC toggle behavior
(function(){
  const toggle = document.querySelector('.toc-toggle');
  const drawer = document.getElementById('toc-drawer');

  if (!toggle || !drawer) return;

  // Toggle open/closed
  toggle.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Click outside to close when drawer is fixed/open
  document.addEventListener('click', (e) => {
    const isOpen = drawer.classList.contains('open');
    if (!isOpen) return;

    const clickedInside = drawer.contains(e.target) || toggle.contains(e.target);
    if (!clickedInside) {
      drawer.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      drawer.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      // Return focus to the toggle for accessibility
      toggle.focus();
    }
  });

  // Close after clicking a link inside the drawer
  drawer.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    // Allow the anchor to navigate/scroll, but collapse the drawer immediately
    drawer.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  });
})();
