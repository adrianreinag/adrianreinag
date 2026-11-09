// Arranque: elige la escena según la fecha real, escala entera en píxeles físicos, bucle de animación,
// navegación por días (máquina del tiempo) y puntos de vista de cada día.
import { W, H, Renderer } from './engine.js';
import './palette.js';
import { SCENES } from './scenes/index.js';
import { entryFor, defaultView, fmtDate } from './calendar.js';

const cv = document.getElementById('scene');
const stage = document.getElementById('stage');
const R = new Renderer(cv);
const q = new URLSearchParams(location.search);
const still = q.has('t') ? parseFloat(q.get('t')) : null;
const $ = id => document.getElementById(id);

// ---------- escala ----------
let focusX = 0.5;
function layout() {
  const dpr = window.devicePixelRatio || 1, box = stage.getBoundingClientRect();
  const vw = box.width * dpr, vh = box.height * dpr;
  const narrow = box.width / box.height < 1.15;
  let s = narrow ? Math.min(vw / 300, vh / H) : Math.min(vw / W, vh / H);
  s = s >= 1 ? Math.floor(s) : s;
  const cw = (W * s) / dpr, ch = (H * s) / dpr;
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  const left = Math.min(0, Math.max(box.width - cw, box.width / 2 - cw * (narrow ? focusX : 0.5)));
  cv.style.left = (cw > box.width ? left : (box.width - cw) / 2) + 'px';
  cv.style.top = Math.max(0, (box.height - ch) / 2) + 'px';
}
addEventListener('resize', layout);

// ---------- escenas (se pintan la primera vez y se guardan) ----------
const cache = new Map();
function getScene(v) {
  const k = v.scene + ':' + v.variant;
  if (!cache.has(k)) { const b = SCENES[v.scene] || SCENES.portal; cache.set(k, b(R, v.variant)); }
  return cache.get(k);
}

// ---------- estado: día y punto de vista ----------
const today = new Date();
let date = new Date(today), viewIdx = 0, entry, scene = null;
const parseHash = () => {
  const m = /^#(\d{2})-(\d{2})(?:-(\d))?$/.exec(location.hash);
  if (!m) return false;
  const mo = +m[1] - 1, d = +m[2];
  const y = today.getMonth() >= 6 ? (mo < 6 ? today.getFullYear() + 1 : today.getFullYear()) : (mo < 6 ? today.getFullYear() : today.getFullYear() - 1);
  date = new Date(y, mo, d, 22); viewIdx = m[3] ? +m[3] : -1; return true;
};
if (q.get('scene')) entry = { title: q.get('scene'), place: '', text: '', views: [{ scene: q.get('scene'), variant: q.get('v') || '', label: q.get('v') || '' }] };

function setDay(d, vi = -1) {
  date = d; entry = entryFor(date);
  viewIdx = vi >= 0 && vi < entry.views.length ? vi : defaultView(entry, date.toDateString() === today.toDateString() ? today : date);
  render();
}
function render() {
  const v = entry.views[viewIdx];
  $('when').textContent = `${fmtDate(date)} · ${entry.place}`;
  $('title').textContent = entry.title;
  $('text').textContent = entry.text;
  const tabs = $('views'); tabs.innerHTML = '';
  if (entry.views.length > 1) entry.views.forEach((w, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = w.label; b.id = 'view-' + i;
    b.setAttribute('aria-pressed', i === viewIdx); b.onclick = () => { viewIdx = i; render(); };
    tabs.appendChild(b);
  });
  $('today').hidden = date.toDateString() === today.toDateString();
  const k = v.scene + ':' + v.variant;
  const show = () => { scene = getScene(v); window.__scene = scene; warm(scene); $('painting').hidden = true; focusX = scene.focus ?? 0.5; layout(); first(); };
  if (!cache.has(k)) { $('painting').hidden = false; setTimeout(show, 30); } else show();
  if (!q.get('scene')) try { history.replaceState(null, '', `#${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}${viewIdx ? '-' + viewIdx : ''}`); } catch (e) {}
}
// prepara en segundo plano los fotogramas de animación que se usarán, para evitar tirones
function warm(sc) {
  const todo = [];
  for (const a of sc.layers || []) {
    if (!a.frame || !a.key) continue;
    const seen = new Set();
    for (let t = 0; t < 16; t += 0.05) { const k = a.key(t); if (!seen.has(k) && !a.cache.has(k)) { seen.add(k); todo.push([a, t]); } }
  }
  const stepW = () => { const t0 = performance.now(); while (todo.length && performance.now() - t0 < 8) { const [a, t] = todo.shift(); a.frame(t); } if (todo.length) setTimeout(stepW, 20); };
  setTimeout(stepW, 60);
}
const step = n => { const d = new Date(date); d.setDate(d.getDate() + n); setDay(d); };
$('prev').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('today').onclick = () => setDay(new Date(today));
addEventListener('keydown', e => { if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
addEventListener('hashchange', () => { if (parseHash()) setDay(date, viewIdx); });

const t0 = performance.now();
let last = 0;
function first() { if (scene) scene.frame(still ?? (performance.now() - t0) / 1000); window.READY = true; }
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
function tick(now) {
  requestAnimationFrame(tick);
  if (now - last < (reduce ? 250 : 33) || !scene) return;
  last = now; scene.frame((now - t0) / 1000);
}

layout();
if (entry) { viewIdx = 0; render(); }
else if (parseHash()) setDay(date, viewIdx);
else setDay(date);
if (still == null) requestAnimationFrame(tick);
