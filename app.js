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
    const x = 50 + r() * 900, y = 50 + r() * 520;
    const p = document.createElementNS(svgNS, 'path');
    p.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)}l2 -7m2 7l-1 -6m3 6l3 -5`);
    p.setAttribute('stroke', '#5f7a36');
    p.setAttribute('stroke-opacity', (.25 + r() * .3).toFixed(2));
    p.setAttribute('stroke-width', '1.4');
    p.setAttribute('fill', 'none');
    g.appendChild(p);
  }
})();

const INTEL = {
  cub:     ['Acoperire', 'Cuburile negre', 'Cuburile marcate BASTION, pe care le vezi în mai toate pozele noastre. Acoperire solidă, bună de ținut o poziție cât echipa ta avansează.'],
  zid:     ['Acoperire', 'Cabanele pictate', 'Cabane mici din lemn, vopsite în galben, verde și negru, cu plasă pe acoperiș. Acoperire de toate părțile, cu ușă și geam.'],
  butoi:   ['Obiectiv', 'Butoaiele albastre', 'Grupul de butoaie albastre, cu tricolorul înfipt lângă ele în pozele de pe teren. Cine ajunge primul aici are mijlocul terenului.'],
  cauciuc: ['Acoperire joasă', 'Cauciucurile', 'Stive de cauciucuri. Acoperire joasă: stai în genunchi, nu în picioare.'],
  palet:   ['Acoperire rapidă', 'Paleții', 'Stive de paleți de lemn, bune pentru un salt rapid între două poziții.'],
  baza:    ['Start', 'Cele două baze', 'Fiecare echipă pleacă din capătul ei de teren. Vă deosebiți după banderolă, albastră sau roșie, ca să știi în cine nu tragi.'],
  plasa:   ['Limită', 'Plasa verde', 'Plasa de pe margine închide terenul. Tot ce e înăuntru e joc, tot ce e afară e pauză.']
};
const map = document.querySelector('.map');
const legendBtns = document.querySelectorAll('.legend button');
const intelK = document.getElementById('intelK'), intelH = document.getElementById('intelH'), intelP = document.getElementById('intelP');
const defaultIntel = [intelK.textContent, intelH.textContent, intelP.textContent];
let active = null;

function focusEl(k) {
  active = active === k ? null : k;
  legendBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.k === active)));
  map.classList.toggle('focus', !!active);
  document.querySelectorAll('#map .el').forEach(g => g.classList.toggle('on', g.dataset.k === active));
  const [k2, h, p] = active ? INTEL[active] : defaultIntel;
  intelK.textContent = k2; intelH.textContent = h; intelP.textContent = p;
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

/* ---------- Planner ---------- */
const PHONE = '40733358456';
const EMAIL = 'airsoft.bastion.tgv@gmail.com';
const state = { grup: 8, chirie: 8 };
const oGrup = document.getElementById('oGrup'), oChirie = document.getElementById('oChirie');
const form = document.getElementById('planForm');
const msgEl = document.getElementById('msg'), kitEl = document.getElementById('kit');
const fData = document.getElementById('fData');

// earliest date: tomorrow
(function () {
  const d = new Date(); d.setDate(d.getDate() + 1);
  fData.min = d.toISOString().slice(0, 10);
})();

document.querySelectorAll('.stepper').forEach(s => {
  s.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const key = s.dataset.for, d = +b.dataset.d;
    if (key === 'grup') {
      state.grup = Math.min(16, Math.max(8, state.grup + d));
      if (state.chirie > state.grup) state.chirie = state.grup;
    } else {
      state.chirie = Math.min(state.grup, Math.max(0, state.chirie + d));
    }
    render();
  });
});
form.addEventListener('input', render);
form.addEventListener('change', render);

const LUNI = ['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
const ZILE = ['duminică','luni','marți','miercuri','joi','vineri','sâmbătă'];
function fmtDate(v) {
  if (!v) return '';
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${ZILE[dt.getDay()]}, ${d} ${LUNI[m - 1]}`;
}
const oameni = n => n === 1 ? '1 persoană' : (n < 20 ? `${n} persoane` : `${n} de persoane`);

let lastKit = [];
function render() {
  const fd = new FormData(form);
  const cand = fd.get('cand'), exp = fd.get('exp'), ocazie = fd.get('ocazie'), nume = (fd.get('nume') || '').trim();
  const data = fmtDate(fd.get('data'));
  oGrup.textContent = state.grup; oChirie.textContent = state.chirie;

  const lines = [];
  lines.push(`Salut! ${nume ? 'Sunt ' + nume + '. ' : ''}Vrem să venim la airsoft.`);
  lines.push(data ? `Ziua: ${data}, ${cand}.` : `Ziua: încă nu știm, ${cand} ne-ar conveni.`);
  lines.push(`Suntem ${oameni(state.grup)}, toți de cel puțin 16 ani.`);
  if (state.chirie === 0) lines.push('Venim cu echipamentul nostru.');
  else if (state.chirie === state.grup) lines.push('Toți avem nevoie de echipament închiriat.');
  else lines.push(`${state.chirie} dintre noi au nevoie de echipament închiriat.`);
  lines.push({ prima: 'E prima dată pentru toți.', cativa: 'Unii au mai jucat, alții sunt la prima.', echipa: 'Suntem o echipă care joacă des.' }[exp]);
  if (ocazie) lines.push(`Ocazia: ${ocazie.toLowerCase()}.`);
  lines.push('Ce variante aveți și cât ar costa?');
  const msg = lines.join('\n');
  msgEl.textContent = msg;

  document.getElementById('wa').href = `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
  document.getElementById('mail').href = `mailto:${EMAIL}?subject=${encodeURIComponent('Rezervare airsoft' + (data ? ', ' + data : ''))}&body=${encodeURIComponent(msg)}`;

  // what to bring, driven by the answers
  const kit = [
    ['<strong>Încălțăminte închisă</strong>, cu talpă bună: bocanci sau adidași de alergat pe teren.', 'k-shoes'],
    ['<strong>Haine lungi</strong> care se pot murdări. Mânecile lungi îți apără brațele de bile.', 'k-clothes'],
    ['<strong>Apă</strong> și ceva de mâncat între ture.', 'k-water']
  ];
  kit.push(['<strong>Vârsta minimă: 16 ani</strong>, pentru fiecare jucător din grup.', 'k-age']);
  if (state.chirie > 0) kit.push([`<strong>Echipament închiriat pentru ${oameni(state.chirie)}</strong>: îl primiți pe teren. Întreabă la rezervare exact ce intră în chirie.`, 'k-rent']);
  if (state.chirie < state.grup) kit.push([`<strong>${state.grup - state.chirie === 1 ? 'Cine vine' : 'Cei ' + (state.grup - state.chirie) + ' care vin'} cu replica proprie</strong>: baterii încărcate, bile și ochelari de protecție pentru airsoft.`, 'k-own']);
  if (exp === 'prima') kit.push(['<strong>Timp pentru instructaj</strong>: ajungeți puțin mai devreme, regulile de siguranță se explică înainte de primul joc.', 'k-brief']);
  if (ocazie === 'Zi de naștere') kit.push(['<strong>Tortul</strong> rămâne în mașină până după ultima tură.', 'k-cake']);
  if (ocazie === 'Team building') kit.push(['<strong>Echipe amestecate</strong>: puneți colegii care nu lucrează împreună în aceeași echipă.', 'k-team']);

  kitEl.innerHTML = kit.map(([t, id]) => `<li data-id="${id}"${lastKit.length && !lastKit.includes(id) ? ' class="new"' : ''}><span>${t}</span></li>`).join('');
  lastKit = kit.map(k => k[1]);
}
render();

document.getElementById('copy').addEventListener('click', async e => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText(msgEl.textContent); b.textContent = 'Copiat'; }
  catch { b.textContent = 'Selectează textul'; }
  setTimeout(() => (b.textContent = 'Copiază'), 1800);
});

/* ---------- mobile dock hides over the planner ---------- */
const dock = document.querySelector('.dock');
if ('IntersectionObserver' in window) {
  new IntersectionObserver(es => es.forEach(e => dock.classList.toggle('hide', e.isIntersecting)), { threshold: .05 })
    .observe(document.getElementById('planifica'));
}
