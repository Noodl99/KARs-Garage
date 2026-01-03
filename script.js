
// KARs Garage — shared helpers (Home + Air Ride)
document.addEventListener('DOMContentLoaded', () => {
  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Top nav "active" state (supports "/" and "/index.html")
  const path = (location.pathname || '/').replace(/\/+$/, '') || '/';
  document.querySelectorAll('.site-nav a').forEach(a => {
    const href = a.getAttribute('href');
    const isHome = href === './' || href === '/' || href === '/index.html';
    const isOnHome = path === '' || path === '/' || path.endsWith('/index.html');
    const match = (href && href.replace(/\/+$/, '') === path) || (isHome && isOnHome);
    if (match) a.classList.add('active');
  });
});
