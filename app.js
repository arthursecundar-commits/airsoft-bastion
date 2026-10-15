document.documentElement.classList.add('js');

/* ---------- Camo: the blocky yellow / green / black paint on their field cabins ---------- */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const PAINT = ['#f2c230', '#e0a91f', '#3d6b22', '#2a4a18', '#7aa33a', '#11140d', '#11140d'];

function paintCamo(ctx, w, h, seed, cell) {
  const r = rng(seed);
  ctx.fillStyle = '#c9a23a';
  ctx.fillRect(0, 0, w, h);
  const blobs = Math.ceil((w * h) / (cell * cell * 5));
  for (let i = 0; i < blobs; i++) {
    ctx.fillStyle = PAINT[Math.floor(r() * PAINT.length)];
    let x = Math.floor(r() * w / cell) * cell;
    let y = Math.floor(r() * h / cell) * cell;
    // a blob is a short walk of chunky rectangles, like a brush-painted block pattern
    const steps = 3 + Math.floor(r() * 4);
    for (let s = 0; s < steps; s++) {
      const bw = cell * (1 + Math.floor(r() * 3));
      const bh = cell * (1 + Math.floor(r() * 2));
      ctx.fillRect(x, y, bw, bh);
      x += (r() < .5 ? -1 : 1) * cell * Math.floor(r() * 2);
      y += (r() < .5 ? -1 : 1) * cell;
    }
  }
}

function camoCanvas(el, seed) {
  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    el.width = Math.round(w * dpr); el.height = Math.round(h * dpr);
    const ctx = el.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintCamo(ctx, w, h, seed, Math.max(26, Math.round(w / 24)));
  };
  draw();
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 150); });
}
camoCanvas(document.getElementById('footCamo'), 2025);

// same paint as an SVG pattern for the cabins on the map
(function () {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  paintCamo(c.getContext('2d'), 160, 160, 77, 16);
  document.getElementById('camoImg').setAttribute('href', c.toDataURL());
})();

/* ---------- Map ---------- */
const svgNS = 'http://www.w3.org/2000/svg';
(function grass() {
  const g = document.getElementById('grass');
  const r = rng(31);
  for (let i = 0; i < 260; i++) {
    const x = 50 + r() * 900, y = 50 + r() * 870;
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)}l2 -7m2 7l-1 -6m3 6l3 -5`);
    p.setAttribute('stroke', '#5f7a36');
    p.setAttribute('stroke-opacity', (.25 + r() * .3).toFixed(2));
    p.setAttribute('stroke-width', '1.4');
    p.setAttribute('fill', 'none');
    g.appendChild(p);
  }
})();

const map = document.querySelector('.map');
const legendBtns = document.querySelectorAll('.legend button');
let active = null;

function focusEl(k) {
  active = active === k ? null : k;
  legendBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === active)));
  map.classList.toggle('focus', !!active);
  document.querySelectorAll('#map .el').forEach(g => g.classList.toggle('on', g.dataset.k === active));
  document.dispatchEvent(new CustomEvent("fieldfocus", { detail: active }));
}
window.focusEl = focusEl;
legendBtns.forEach(b => b.addEventListener('click', () => focusEl(b.dataset.k)));
document.querySelectorAll('#map .el').forEach(g => {
  g.style.cursor = 'pointer';
  g.addEventListener('click', () => focusEl(g.dataset.k));
});

if ('IntersectionObserver' in window) {
  new IntersectionObserver((es, o) => es.forEach(e => {
    if (e.isIntersecting) { map.classList.add('seen'); o.disconnect(); }
  }), { threshold: .35 }).observe(map);
} else map.classList.add('seen');

/* ---------- mobile call bar hides over the call section ---------- */
const dock = document.querySelector('.dock');
if ('IntersectionObserver' in window) {
  new IntersectionObserver(es => es.forEach(e => dock.classList.toggle('hide', e.isIntersecting)), { threshold: .05 })
    .observe(document.getElementById('planifica'));
}

/* ---------- hero video: muted loop, paused off screen; the poster stays for reduced motion and data saver ---------- */
const heroVid = document.querySelector('.hero-video');
if (heroVid && !matchMedia('(prefers-reduced-motion: reduce)').matches && !(navigator.connection && navigator.connection.saveData)) {
  // AV1 where the browser can decode it (sharper at the same size), H.264 for the rest
  const av1 = heroVid.canPlayType('video/mp4; codecs="av01.0.08M.08"') ? '-av1' : '';
  heroVid.src = `video/hero-${matchMedia('(max-width: 640px)').matches ? 'phone' : 'desktop'}${av1}.mp4`;
  new IntersectionObserver(([e]) => { if (e.isIntersecting) heroVid.play().catch(() => {}); else heroVid.pause(); }).observe(heroVid);
}
