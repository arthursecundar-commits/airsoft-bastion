const API = (window.BASTION && window.BASTION.api) || '';
const $ = id => document.getElementById(id);
const store = {
  get: () => { try { return localStorage.getItem('bastion-key') || ''; } catch { return ''; } },
  set: v => { try { v ? localStorage.setItem('bastion-key', v) : localStorage.removeItem('bastion-key'); } catch {} }
};
let key = store.get(), rows = [], filter = 'viitoare';

const LUNI = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const ZILE = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];
const fmtDay = s => { const [y, m, d] = s.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${ZILE[dt.getDay()]}, ${d} ${LUNI[m - 1]} ${y}`; };
const today = () => new Date().toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STATUS = { noua: 'Nouă', confirmata: 'Confirmată', respinsa: 'Respinsă' };
const EXP = { prima: 'prima dată pentru toți', cativa: 'unii au mai jucat', echipa: 'echipă formată' };

async function call(body) {
  const res = await fetch(API, { method: 'POST', body: JSON.stringify({ ...body, key }) });
  return res.json();
}

async function load() {
  $('list').innerHTML = '<p class="empty">Se încarcă...</p>';
  try {
    const res = await call({ action: 'list' });
    if (!res.ok) { if (res.error === 'key') return logout('Parolă greșită.'); throw new Error(res.error); }
    rows = res.rows.sort((a, b) => (a.data + a.interval).localeCompare(b.data + b.interval, 'ro', { numeric: true }));
    $('login').hidden = true; $('app').hidden = false;
    draw();
  } catch (e) {
    $('list').innerHTML = `<p class="err">Nu am putut încărca rezervările (${esc(e.message)}).</p>`;
  }
}

function draw() {
  const t = today();
  const shown = rows.filter(r =>
    filter === 'toate' ? true :
    filter === 'viitoare' ? r.data >= t && r.status !== 'respinsa' :
    r.status === filter);
  $('count').textContent = `${shown.length} din ${rows.length}`;
  if (!shown.length) { $('list').innerHTML = '<p class="empty">Nicio rezervare aici.</p>'; return; }
  let html = '', lastDay = '';
  for (const r of shown) {
    if (r.data !== lastDay) { html += `<h2 class="day">${esc(fmtDay(r.data))}</h2>`; lastDay = r.data; }
    const tel = String(r.telefon).replace(/[^\d+]/g, '');
    const wa = tel.replace(/^\+?40/, '').replace(/^0/, '');
    const confirmTxt = encodeURIComponent(`Salut, ${r.nume}! Rezervarea ta la Bastion TGV pentru ${fmtDay(r.data)}, ${r.interval}, e confirmată. Codul: ${r.id}. Ne vedem pe teren!`);
    html += `<article class="card ${esc(r.status)}">
      <div><div class="slot">${esc(r.interval)}</div><span class="st">${STATUS[r.status] || esc(r.status)}</span></div>
      <div>
        <div class="who">${esc(r.nume)} · ${esc(r.grup)} persoane</div>
        <p class="meta">${esc(r.chirie)} închiriază echipament · ${esc(EXP[r.experienta] || r.experienta)}${r.ocazie ? ' · ' + esc(r.ocazie) : ''}</p>
        <p class="meta"><a href="tel:${esc(tel)}">${esc(r.telefon)}</a>${r.email ? ' · <a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>' : ''} · cod ${esc(r.id)}</p>
      </div>
      <div class="acts">
        ${r.status !== 'confirmata' ? `<button class="btn btn-y" data-id="${esc(r.id)}" data-s="confirmata">Confirmă</button>` : ''}
        ${r.status !== 'respinsa' ? `<button class="btn btn-line" data-id="${esc(r.id)}" data-s="respinsa">Respinge</button>` : `<button class="btn btn-line" data-id="${esc(r.id)}" data-s="noua">Readu</button>`}
        <a class="btn btn-dark" href="https://wa.me/40${esc(wa)}?text=${confirmTxt}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </article>`;
  }
  $('list').innerHTML = html;
}

$('list').addEventListener('click', async e => {
  const b = e.target.closest('button[data-id]'); if (!b) return;
  b.disabled = true;
  const res = await call({ action: 'status', id: b.dataset.id, status: b.dataset.s }).catch(() => ({ ok: false }));
  if (res.ok) { rows.find(r => r.id === b.dataset.id).status = b.dataset.s; draw(); }
  else { b.disabled = false; alertBox('Nu am putut salva. Încearcă din nou.'); }
});
function alertBox(t) { $('count').textContent = t; }

document.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.f;
  document.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  draw();
}));
$('refresh').addEventListener('click', load);
$('logout').addEventListener('click', () => logout(''));
$('login').addEventListener('submit', e => { e.preventDefault(); key = $('key').value.trim(); store.set(key); load(); });

function logout(msg) {
  key = ''; store.set(''); rows = [];
  $('app').hidden = true; $('login').hidden = false; $('loginErr').textContent = msg; $('key').value = '';
}

if (!API) { $('login').hidden = false; $('loginErr').textContent = 'Lipsește adresa serverului de rezervări în config.js.'; }
else if (key) load();
else $('login').hidden = false;
