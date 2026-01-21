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

// Make brand-name act as "Home" underline on the Home page

// Make brand-name act as "Home" underline on the Home page (handles subfolders)
(function(){
  const here = location.pathname
    .replace(/index\.html$/i, '')
    .replace(/\/+$/, '/') || '/';

  const brand = document.querySelector('.brand-name');
  if (!brand) return;

  // Resolve the brand's href just like we do for .site-nav links
  const href = brand.getAttribute('href') || './';
  const url  = new URL(href, location.href);
  const target = url.pathname
    .replace(/index\.html$/i, '')
    .replace(/\/+$/, '/') || '/';

  if (target === here) {
    brand.classList.add('active');   // CSS shows the white underline for .brand-name.active on page-home
  }
})();
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
})();
// Mobile: position the Courses button under the red line at load,
// then dock under the black navbar when you scroll.
(function(){
  const wrap = document.querySelector('.toc-wrap');
  const accent = document.querySelector('.accent--fullbleed');

  if (!wrap || !accent) return;

  const dockTop = `calc(var(--topbar-h) + 6px)`; // under black navbar
  let initialTop = dockTop;

  function setInitialTop() {
    // Get the bottom of the red line relative to the viewport, plus a small gap
    const rect = accent.getBoundingClientRect();
    // rect.bottom is the bottom edge; add 8px breathing room
    const px = Math.max(rect.bottom + 8, 0);
    initialTop = `${Math.round(px)}px`;
  }

  function updatePosition() {
    const scrolled = window.scrollY || document.documentElement.scrollTop || 0;
    const topVal = (scrolled <= 2) ? initialTop : dockTop;
    document.documentElement.style.setProperty('--toc-top', topVal);
  }

  // Initialize
  setInitialTop();
  updatePosition();

  // Recalculate on scroll and resize (orientation changes, etc.)
  window.addEventListener('scroll', updatePosition, { passive: true });
  window.addEventListener('resize', () => { setInitialTop(); updatePosition(); });
})();

// Home tiles marquee: duplicate once and set animation duration based on width.
(function initHomeTilesMarquee(){
  if (!document.body.classList.contains('page-home')) return;

  const carousel = document.querySelector('.tile-carousel');
  const belt     = carousel?.querySelector('.tile-belt');
  if (!carousel || !belt) return;

  // Duplicate the current tiles once to allow a perfect 50% loop
  if (!belt.dataset.duplicated) {
    const clones = Array.from(belt.children).map(n => n.cloneNode(true));
    clones.forEach(n => belt.appendChild(n));
    belt.dataset.duplicated = 'true';
  }

  // Force decode of tile background images so looping never stalls
  function warmTileImages(){
    const urls = new Set();
  
    belt.querySelectorAll('.tile').forEach(tile => {
      const bg = getComputedStyle(tile).backgroundImage;
      const m = bg.match(/url\(["']?(.+?)["']?\)/);
      if (m && m[1]) urls.add(m[1]);
    });
  
    urls.forEach(src => {
      const img = new Image();
      img.src = src;
      // Force decode immediately if supported
      if (img.decode) {
        img.decode().catch(() => {});
      }
    });
  }

  warmTileImages();

  // Compute a sensible duration from the belt width (larger width -> longer duration)
  function setDuration(){
    // total width of the full (duplicated) belt
    const full = belt.scrollWidth;
    if (full <= 0) return;

    // We move exactly 50% of the belt in one cycle (because @keyframes to translateX(-50%))
    // Pick speed ~ 90px/sec by default; slower if reduced motion is set.
    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pxPerSec  = mqReduced.matches ? 22.5 : 45;  // tweak as you like
    const halfWidth = full / 2;
    const seconds   = Math.max(halfWidth / pxPerSec, 12); // clamp to a minimum 12s
    belt.style.setProperty('--tiles-duration', `${seconds}s`);
  }

  // Set initially and on resize/orientation change
  setDuration();
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setDuration, 150);
  }, { passive: true });
})();



// Home tiles arrows: animate a wrapper so the inner belt's marquee never stops.
(function initHomeTilesArrows(){
  if (!document.body.classList.contains('page-home')) return;

  const strip    = document.querySelector('.tile-strip');
  const carousel = strip?.querySelector('.tile-carousel');
  let   belt     = carousel?.querySelector('.tile-belt');
  const btnL     = strip?.querySelector('.tile-nav--left');
  const btnR     = strip?.querySelector('.tile-nav--right');
  if (!strip || !carousel || !belt || !btnL || !btnR) return;

  // --- Build a wrapper around the belt ---
  // <div class="tile-carousel">
  //   <div class="tile-shift">  <-- animate this
  //     <div class="tile-belt"> <-- belt keeps marquee
  //       ...tiles...
  //     </div>
  //   </div>
  // </div>
  let shift = carousel.querySelector('.tile-shift');
  if (!shift){
    shift = document.createElement('div');
    shift.className = 'tile-shift';
    carousel.insertBefore(shift, belt);
    shift.appendChild(belt);
  }

  // --- Helpers ---
  function getStep(){
    const firstTile = belt.querySelector('.tile');
    const tileW = firstTile ? firstTile.getBoundingClientRect().width : 300;
    const cs  = getComputedStyle(belt);
    const gap = parseFloat(cs.gap || '18') || 18;
    const STEP_MULT = 1; // change to 2 to jump two tiles per click
    return (tileW + gap) * STEP_MULT;
  }
  function stepDurationMs(){
    const root = getComputedStyle(document.documentElement);
    return parseFloat(root.getPropertyValue('--tiles-step-ms')) || 420;
  }
  function stepEase(){
    const root = getComputedStyle(document.documentElement);
    return (root.getPropertyValue('--tiles-step-ease') || 'cubic-bezier(.22,.61,.36,1)').trim();
  }

  // Accumulated shift we apply to the wrapper (belt keeps auto-marquee inside)
  let shiftX = 0;
  let stepAnim = null;

  function animateStep(dir){
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = prefersReduced ? 0 : stepDurationMs();
    const ez  = stepEase();
    const delta = getStep() * (dir > 0 ? -1 : 1); // ▶ means advance leftward

    // Cancel any running click animation (supports rapid clicks)
    try{ stepAnim?.cancel(); }catch{}
    stepAnim = null;

    const from = shiftX;
    const to   = shiftX + delta;

    // Keep the number small over time (mod half-belt width). Visually seamless.
    const halfWidth = belt.scrollWidth / 2;
    const wrap = (x) => {
      if (!halfWidth) return x;
      let m = ((x % halfWidth) + halfWidth) % halfWidth; // [0, H)
      return (m === 0 ? -0.001 : m) - halfWidth;         // (-H, 0)
    };

    // Ensure we start from the current offset
    shift.style.transform = `translateX(${from}px)`;

    if (dur > 0 && typeof shift.animate === 'function'){
      stepAnim = shift.animate(
        [
          { transform: `translateX(${from}px)` },
          { transform: `translateX(${to}px)` }
        ],
        {
          duration: dur,
          easing: ez,
          fill: 'none',          // do not keep owning transform
          composite: 'replace'
        }
      );

      const finalize = () => {
        shiftX = wrap(to);
        shift.style.transform = `translateX(${shiftX}px)`;
        stepAnim = null;
      };
      stepAnim.finished.then(finalize).catch(finalize);
      setTimeout(() => { if (stepAnim){ try{ stepAnim.cancel(); }catch{}; finalize(); } }, dur + 60);
    } else {
      shiftX = wrap(to);
      shift.style.transform = `translateX(${shiftX}px)`;
    }
  }

  btnL.addEventListener('click', () => animateStep(-1));
  btnR.addEventListener('click', () => animateStep(+1));
})();

  