
// KARs Garage — Home helpers
// Sets footer year and highlights active nav if needed.
// (Air Ride page loads its own data script: airride.js)

document.addEventListener('DOMContentLoaded', () => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Optional: active link sync by pathname (kept lightweight)
  const path = location.pathname.replace(/\/+$/, '') || '/';
  document.querySelectorAll('.site-nav a').forEach(a => {
    const href = a.getAttribute('href');
    const isHome = href === './' || href === '/' || href === '';
    if ((isHome && (path.endsWith('/') || path.endsWith('/index.html'))) || href === path) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });
});
