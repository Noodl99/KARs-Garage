
// KARs Garage — shared helpers (Home + Air Ride)
document.addEventListener('DOMContentLoaded', () => {
  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Top nav "active" state (supports "/" and "/index.html")

  // --- Robust top-nav "active" highlighting ---
  const here = location.pathname
    .replace(/index\.html$/i, '')   // treat / and /index.html as the same
    .replace(/\/+$/, '/') || '/';

  document.querySelectorAll('.site-nav a').forEach(a => {
    const url = new URL(a.getAttribute('href'), location.href);
    const target = url.pathname
      .replace(/index\.html$/i, '')
      .replace(/\/+$/, '/') || '/';

    if (target === here) {
      a.classList.add('active');
    }
  });
});