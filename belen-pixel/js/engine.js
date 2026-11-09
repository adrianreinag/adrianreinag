// Motor de pixel art "pintado": cada escena se pinta en un G-buffer 2D (material, normal, orden de
// dibujo, oclusión) y cada fotograma se ilumina por píxel y se cuantiza a rampas de color con
// tramado ordenado. Después se añaden contornos sel-out y efectos aditivos (halos, rayos, motas).
export const W = 480, H = 270;

// ---------- utilidades ----------
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hash2(x, y) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, o = 4) { let s = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < o; i++) { s += a * noise(x * f + i * 17.3, y * f - i * 9.1); t += a; f *= 2.03; a *= 0.5; } return s / t; }
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16 - 0.5);
export const bayer = (x, y) => BAYER[(x & 3) | ((y & 3) << 2)];

// ---------- materiales: rampas de oscuro a claro ----------
export const MATS = [null];
export const M = {};
export function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// Paleta común: Endesga 64 (ENDESGA) ampliada con tonos tierra y grises cálidos de Resurrect 64 (Kerrie Lake), vía Lospec.
// Todas las rampas se ajustan a ella para que la imagen entera comparta colores, como en el pixel art hecho a mano.
export const PALETTE = ('ff0040 131313 1b1b1b 272727 3d3d3d 5d5d5d 858585 b4b4b4 ffffff c7cfdd 92a1b9 657392 424c6e 2a2f4e 1a1932 0e071b ' +
  '1c121c 391f21 5d2c28 8a4836 bf6f4a e69c69 f6ca9f f9e6cf edab50 e07438 c64524 8e251d ff5000 ed7614 ffa214 ffc825 ffeb57 d3fc7e ' +
  '99e65f 5ac54f 33984b 1e6f50 134c4c 0c2e44 00396d 0069aa 0098dc 00cdf9 0cf1ff 94fdff fdd2ed f389f5 db3ffd 7a09fa 3003d9 0c0293 ' +
  '03193f 3b1443 622461 93388f ca52c9 c85086 f68187 f5555d ea323c c42430 891e2b 571c27 ' +
  '2e222f 3e3546 625565 966c6c ab947a 694f62 7f708a 9babb2 4c3e24 676633 a2a947 374e4a 547e64 92a984 b2ba90 45293f 6b3e75 7a3045 9e4539 cd683d 323353 484a77').split(' ').map(h => hex('#' + h));
function oklab([r8, g8, b8]) {
  const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const r = f(r8), g = f(g8), b = f(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), q = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * q, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * q, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * q];
}
const PLAB = PALETTE.map(oklab);
export function nearestPal(rgb) {
  const [L, a, b] = oklab(rgb), C = Math.hypot(a, b); let best = 0, bd = Infinity;
  PLAB.forEach(([L2, a2, b2], i) => { const C2 = Math.hypot(a2, b2), d = (L - L2) ** 2 * 1.4 + (a - a2) ** 2 + (b - b2) ** 2 + Math.max(0, C2 - C) ** 2 * 1.5; if (d < bd) { bd = d; best = i; } });
  return PALETTE[best];
}
export const PAL = { on: false };
function palRamp(ramp) {
  if (!PAL.on) return ramp;
  const out = [];
  for (const c of ramp.map(nearestPal)) if (!out.length || out[out.length - 1] !== c) out.push(c);
  return out.length >= 2 ? out : ramp;
}
// Paleta única derivada de las propias rampas: k-medias en OKLab hasta K colores y todas las rampas se reajustan a ella.
export function unifyPalette(K = 56) {
  const pts = [], seen = new Set();
  for (const m of MATS) if (m && !m.keep) for (const c of m.src) { const k = c.join(','); if (!seen.has(k)) { seen.add(k); pts.push(c); } }
  const lab = pts.map(oklab);
  // semillas por punto más lejano
  const cen = [lab[0]];
  const dist = (a, b) => (a[0] - b[0]) ** 2 * 1.6 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  while (cen.length < Math.min(K, lab.length)) { let bi = 0, bd = -1; lab.forEach((p, i) => { const d = Math.min(...cen.map(c => dist(p, c))); if (d > bd) { bd = d; bi = i; } }); cen.push(lab[bi].slice()); }
  const asg = new Int32Array(lab.length);
  for (let it = 0; it < 14; it++) {
    lab.forEach((p, i) => { let bi = 0, bd = Infinity; cen.forEach((c, j) => { const d = dist(p, c); if (d < bd) { bd = d; bi = j; } }); asg[i] = bi; });
    const acc = cen.map(() => [0, 0, 0, 0]);
    lab.forEach((p, i) => { const a = acc[asg[i]]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; });
    acc.forEach((a, j) => { if (a[3]) cen[j] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; });
  }
  // cada centro se representa con el color real más cercano (colores de la paleta = colores de las rampas)
  const rep = cen.map(c => { let bi = 0, bd = Infinity; lab.forEach((p, i) => { const d = dist(p, c); if (d < bd) { bd = d; bi = i; } }); return pts[bi]; });
  const map = new Map(pts.map((c, i) => [c.join(','), rep[asg[i]]]));
  for (const m of MATS) if (m && !m.keep) { const out = []; for (const c of m.src.map(c => map.get(c.join(',')))) if (!out.length || out[out.length - 1] !== c) out.push(c); m.ramp = out.length >= 2 ? out : m.src; m.n = m.ramp.length; }
  return rep;
}
export function defMat(name, ramp, o = {}) {
  const id = MATS.length;
  const R = o.keep ? ramp.map(hex) : palRamp(ramp.map(hex));
  MATS.push({ id, name, ramp: R, src: R.slice(), keep: !!o.keep, n: R.length, dither: o.dither ?? 0.5, unlit: !!o.unlit,
    albedo: o.albedo ?? 1, wrap: o.wrap ?? 0.2, ol: o.ol ?? 2, gain: o.gain ?? 1, spec: o.spec ?? 0 });
  M[name] = id; return id;
}

// ---------- geometría: funciones de distancia con signo ----------
export const sdCircle = (cx, cy, r) => (x, y) => Math.hypot(x - cx, y - cy) - r;
export function sdEllipse(cx, cy, rx, ry, rot = 0) {
  const c = Math.cos(rot), s = Math.sin(rot), m = Math.min(rx, ry);
  return (x, y) => { const dx = x - cx, dy = y - cy, u = dx * c + dy * s, v = -dx * s + dy * c; return (Math.hypot(u / rx, v / ry) - 1) * m; };
}
export function sdCapsule(ax, ay, bx, by, ra, rb = ra) {
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-6;
  return (x, y) => { const wx = x - ax, wy = y - ay; const t = clamp((wx * ex + wy * ey) / l2, 0, 1); return Math.hypot(wx - ex * t, wy - ey * t) - (ra + (rb - ra) * t); };
}
export function sdPoly(pts) {
  const n = pts.length, P = new Float64Array(n * 2);
  pts.forEach((p, i) => { P[2 * i] = p[0]; P[2 * i + 1] = p[1]; });
  return (px, py) => {
    let d = (px - P[0]) ** 2 + (py - P[1]) ** 2, s = 1;
    for (let i = 0, j = n - 1; i < n; j = i, i++) {
      const xi = P[2 * i], yi = P[2 * i + 1], xj = P[2 * j], yj = P[2 * j + 1];
      const ex = xj - xi, ey = yj - yi, wx = px - xi, wy = py - yi;
      const t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey || 1e-9), 0, 1);
      const bx = wx - ex * t, by = wy - ey * t, dd = bx * bx + by * by;
      if (dd < d) d = dd;
      const c1 = py >= yi, c2 = py < yj, c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * Math.sqrt(d);
  };
}
// semiplano: positivo a la izquierda del segmento a->b
export function sdLine(ax, ay, bx, by) { const ex = bx - ax, ey = by - ay, l = Math.hypot(ex, ey); return (x, y) => ((x - ax) * ey - (y - ay) * ex) / l; }
export const uni = (...f) => (x, y) => { let d = Infinity; for (const g of f) d = Math.min(d, g(x, y)); return d; };
export const inter = (...f) => (x, y) => { let d = -Infinity; for (const g of f) d = Math.max(d, g(x, y)); return d; };
export const sub = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));
export const smin = (a, b, k) => (x, y) => { const da = a(x, y), db = b(x, y), h = clamp(0.5 + 0.5 * (db - da) / k, 0, 1); return lerp(db, da, h) - k * h * (1 - h); };
// suavizado de Chaikin para contornos orgánicos
export function chaikin(pts, it = 2, closed = true) {
  let p = pts;
  for (let k = 0; k < it; k++) {
    const q = [], n = p.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = p[i], b = p[(i + 1) % n];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) { q.unshift(p[0]); q.push(p[n - 1]); }
    p = q;
  }
  return p;
}
export function bboxOf(pts, pad = 1) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; }

// ---------- G-buffer ----------
const KEYS = ['mat', 'val', 'nx', 'ny', 'nz', 'obj', 'ord', 'ol', 'ao', 'emi', 'cel', 'spr'];
export class GBuf {
  constructor(w, h) {
    this.w = w; this.h = h; const n = (this.n = w * h);
    this.mat = new Uint8Array(n); this.val = new Float32Array(n);
    this.nx = new Float32Array(n); this.ny = new Float32Array(n); this.nz = new Float32Array(n).fill(1);
    this.obj = new Uint32Array(n); this.ord = new Uint32Array(n); this.ol = new Uint8Array(n);
    this.ao = new Float32Array(n).fill(1); this.emi = new Float32Array(n);
    // cel: sombreado plano precalculado de figuras (-1 = iluminación normal); fix: píxel dibujado a mano
    this.cel = new Float32Array(n).fill(-1); this.fix = new Uint8Array(n); this.spr = new Uint8Array(n);
  }
  copyFrom(o) { for (const k of KEYS) this[k].set(o[k]); }
  // lista compacta de píxeles ocupados para volcar rápido
  pack() { const idx = []; for (let i = 0; i < this.n; i++) if (this.mat[i]) idx.push(i); this.used = Int32Array.from(idx); return this; }
}

let OBJ = 1;
export const newObj = () => OBJ++;

export class Painter {
  // s: escala de las coordenadas locales (permite reutilizar figuras a distintos tamaños)
  constructor(buf, ox = 0, oy = 0, s = 1) { this.b = buf; this.ox = ox; this.oy = oy; this.s = s; this.ord = 1; }
  // núcleo: rellena donde sdf<=0; normal = bisel de radio R sobre la normal base
  shape(sdf, bb, o) {
    const b = this.b, ox = this.ox, oy = this.oy, sc = this.s, is = 1 / sc;
    const X0 = Math.max(0, Math.floor(bb[0] * sc + ox) - 1), Y0 = Math.max(0, Math.floor(bb[1] * sc + oy) - 1);
    const X1 = Math.min(b.w - 1, Math.ceil(bb[2] * sc + ox) + 1), Y1 = Math.min(b.h - 1, Math.ceil(bb[3] * sc + oy) + 1);
    const m = o.m, R = (o.R ?? 3) * sc, obj = o.obj ?? newObj(), ord = o.ord ?? this.ord++, ol = o.ol ?? MATS[m].ol;
    const bn = o.n, fold = o.fold, vfn = typeof o.v === 'function' ? o.v : null, vc = typeof o.v === 'number' ? o.v : 0;
    const emi = o.emi || 0, ao = o.ao ?? 1, e = 0.6 * is, clip = o.clip;
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      const px = (x + 0.5 - ox) * is, py = (y + 0.5 - oy) * is;
      const d = sdf(px, py) * sc; if (d > 0) continue;
      if (clip && clip(px, py) > 0) continue;
      let gx = sdf(px + e, py) - sdf(px - e, py), gy = sdf(px, py + e) - sdf(px, py - e);
      const gl = Math.hypot(gx, gy); if (gl > 1e-9) { gx /= gl; gy /= gl; } else { gx = 0; gy = 0; }
      const s = R > 0 ? clamp(1 + d / R, 0, 1) : 0;
      let nz = Math.sqrt(1 - s * s), nx = gx * s, ny = gy * s;
      if (bn) { nx += bn[0] * nz; ny += bn[1] * nz; nz *= bn[2]; }
      if (fold) { const f = fold(px, py); nx += f[0]; ny += f[1]; }
      const l = Math.hypot(nx, ny, nz) || 1, i = y * b.w + x;
      b.mat[i] = m; b.nx[i] = nx / l; b.ny[i] = ny / l; b.nz[i] = nz / l;
      b.obj[i] = obj; b.ord[i] = ord; b.ol[i] = ol; b.val[i] = vc + (vfn ? vfn(px, py, d) : 0); b.emi[i] = emi; b.ao[i] = ao;
    }
    return obj;
  }
  poly(pts, o) { const p = o.smooth ? chaikin(pts, o.smooth) : pts; return this.shape(sdPoly(p), bboxOf(p, 1), o); }
  ell(cx, cy, rx, ry, o) { const r = Math.max(rx, ry); return this.shape(sdEllipse(cx, cy, rx, ry, o.rot || 0), [cx - r, cy - r, cx + r, cy + r], o); }
  circ(cx, cy, r, o) { return this.shape(sdCircle(cx, cy, r), [cx - r, cy - r, cx + r, cy + r], o); }
  cap(ax, ay, bx, by, ra, rb, o) { const r = Math.max(ra, rb); return this.shape(sdCapsule(ax, ay, bx, by, ra, rb), [Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.max(ax, bx) + r, Math.max(ay, by) + r], o); }
  // tubo por una polilínea (radio de r0 a r1)
  tube(pts, r0, r1, o) {
    const fs = [], n = pts.length - 1;
    for (let i = 0; i < n; i++) fs.push(sdCapsule(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], lerp(r0, r1, i / n), lerp(r0, r1, (i + 1) / n)));
    return this.shape(uni(...fs), bboxOf(pts, Math.max(r0, r1) + 1), o);
  }
  _xy(x, y) { return [Math.floor(x * this.s + this.ox), Math.floor(y * this.s + this.oy)]; }
  // detalles: cambia material/valor de un píxel sin tocar normal ni contorno
  dot(x, y, m, v = 0, keepVal = false) {
    const b = this.b, [X, Y] = this._xy(x, y);
    if (X < 0 || Y < 0 || X >= b.w || Y >= b.h) return;
    const i = Y * b.w + X; if (!b.mat[i]) return;
    b.mat[i] = m; b.val[i] = keepVal ? b.val[i] + v : v;
  }
  // píxel nuevo completo (con normal fija)
  pix(x, y, m, o = {}) {
    const b = this.b, [X, Y] = this._xy(x, y);
    if (X < 0 || Y < 0 || X >= b.w || Y >= b.h) return;
    const i = Y * b.w + X, n = o.n || [0, 0, 1];
    b.mat[i] = m; b.val[i] = o.v || 0; b.nx[i] = n[0]; b.ny[i] = n[1]; b.nz[i] = n[2];
    b.obj[i] = o.obj ?? b.obj[i]; b.ord[i] = o.ord ?? (this.ord++); b.ol[i] = o.ol ?? 0; b.emi[i] = o.emi || 0; b.ao[i] = 1;
  }
  // línea de 1 px que oscurece o aclara lo ya pintado (pliegues, juntas)
  crease(pts, v, m) {
    const b = this.b;
    for (let k = 0; k < pts.length - 1; k++) {
      const [X0, Y0] = this._xy(pts[k][0], pts[k][1]), [X1, Y1] = this._xy(pts[k + 1][0], pts[k + 1][1]);
      const n = Math.max(1, Math.abs(X1 - X0), Math.abs(Y1 - Y0));
      let prev = -1;
      for (let s = 0; s <= n; s++) {
        const X = Math.round(lerp(X0, X1, s / n)), Y = Math.round(lerp(Y0, Y1, s / n));
        if (X < 0 || Y < 0 || X >= b.w || Y >= b.h) continue;
        const i = Y * b.w + X; if (i === prev || !b.mat[i]) continue; prev = i;
        if (m) b.mat[i] = m; b.val[i] += v;
      }
    }
  }
  // sello dibujado a mano: filas de caracteres, 1 carácter = 1 píxel real (no se escala)
  // map: carácter -> [material, tono 0..1, valor]; anchor en coordenadas locales; flip invierte en horizontal
  stamp(lx, ly, rows, map, o = {}) {
    const b = this.b, [X0, Y0] = this._xy(lx, ly), h = rows.length, w = rows[0].length;
    const ax = o.ax ?? Math.floor(w / 2), ay = o.ay ?? Math.floor(h / 2);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][o.flip ? w - 1 - i : i]; if (ch === '.' || ch === ' ') continue;
      const e = map[ch]; if (!e) continue;
      const X = X0 + i - ax, Y = Y0 + j - ay; if (X < 0 || Y < 0 || X >= b.w || Y >= b.h) continue;
      const k = Y * b.w + X;
      if (o.onlyOn && !b.mat[k]) continue;
      if (!b.mat[k]) { b.ord[k] = this.ord++; b.obj[k] = o.obj ?? b.obj[k]; b.nx[k] = 0; b.ny[k] = 0; b.nz[k] = 1; b.ol[k] = o.ol ?? 2; b.ao[k] = 1; b.emi[k] = 0; }
      b.mat[k] = e[0]; b.cel[k] = e[1]; b.val[k] = e[2] || 0; b.fix[k] = 1;
    }
  }
  // oclusión ambiental elíptica (sombras de contacto)
  aoBlob(cx, cy, rx, ry, s, cond) {
    const b = this.b, sc = this.s, X0 = cx * sc + this.ox, Y0 = cy * sc + this.oy, RX = rx * sc, RY = ry * sc;
    for (let y = Math.floor(Y0 - RY); y <= Y0 + RY; y++) for (let x = Math.floor(X0 - RX); x <= X0 + RX; x++) {
      if (x < 0 || y < 0 || x >= b.w || y >= b.h) continue;
      const d = Math.hypot((x + 0.5 - X0) / RX, (y + 0.5 - Y0) / RY); if (d >= 1) continue;
      const i = y * b.w + x; if (cond && !cond(i)) continue;
      b.ao[i] *= 1 - s * (1 - d * d);
    }
  }
}

// ---------- sombreado plano estilo sprite: 4 tonos con una luz fija y limpieza de píxeles sueltos ----------
export const CEL = [0.1, 0.4, 0.7, 1];
export function bakeCel(b, L = [-0.5, -0.62, 0.6], flip = false, o = {}) {
  const lx = flip ? -L[0] : L[0], ly = L[1], lz = L[2], n = b.n, w = b.w, h = b.h, q = new Int8Array(n).fill(-1);
  const texK = o.texK ?? 0.8, sprite = !!o.sprite;
  // siluetas limpias en figuras: fuera picos de 1 píxel y rellenar muescas
  if (sprite) for (let pass = 0; pass < 2; pass++) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, nb = [i - 1, i + 1, i - w, i + w];
    const c = nb.reduce((s2, j) => s2 + (b.mat[j] ? 1 : 0), 0);
    if (b.mat[i] && c <= 1 && !b.fix[i]) b.mat[i] = 0;
    else if (!b.mat[i] && c === 4) { const j = i - 1; for (const k of ['mat', 'val', 'nx', 'ny', 'nz', 'obj', 'ord', 'ol', 'ao', 'emi']) b[k][i] = b[k][j]; }
  }
  for (let i = 0; i < n; i++) {
    if (!b.mat[i] || b.fix[i] || MATS[b.mat[i]].unlit) continue;
    const d = b.nx[i] * lx + b.ny[i] * ly + b.nz[i] * lz + b.val[i] * texK;
    q[i] = d < -0.12 ? 0 : d < 0.38 ? 1 : d < 0.82 ? 2 : 3;
  }
  // limpieza: un píxel distinto a sus 4 vecinos del mismo objeto adopta el tono mayoritario
  for (let pass = 0; pass < 2; pass++) for (let i = w; i < n - w; i++) {
    if (q[i] < 0) continue;
    const ob = b.obj[i], nb = [i - 1, i + 1, i - w, i + w].filter(j => q[j] >= 0 && b.obj[j] === ob && b.mat[j] === b.mat[i]);
    if (nb.length < 3) continue;
    if (nb.every(j => q[j] !== q[i])) { const c = [0, 0, 0, 0]; nb.forEach(j => c[q[j]]++); q[i] = c.indexOf(Math.max(...c)); }
  }
  const haze = o.haze || 0;
  for (let i = 0; i < n; i++) {
    if (q[i] >= 0) { b.cel[i] = CEL[q[i]] * (1 - haze) + 0.62 * haze; b.val[i] *= sprite ? 0.25 : 0.15; }
    if (sprite && (b.mat[i] || b.fix[i])) b.spr[i] = 1;
  }
}

// ---------- capas animadas: cada actor tiene fotogramas cacheados ----------
export class Actor {
  constructor(o) { Object.assign(this, { key: () => '0', cast: 0 }, o); this.cache = new Map(); }
  frame(t) {
    const k = this.key(t);
    let f = this.cache.get(k);
    if (!f) { const b = new GBuf(this.w, this.h); const p = new Painter(b, this.ox, this.oy, this.scale || 1); this.draw(p, t, k); if (this.cel !== false) bakeCel(b, this.light, this.flip, { sprite: true }); f = b.pack(); this.cache.set(k, f); }
    return f;
  }
}

// ---------- render ----------
export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.G = new GBuf(W, H); this.idx = new Uint8Array(W * H); this.lum = new Float32Array(W * H);
    this.img = this.ctx.createImageData(W, H); this.shelter = new Float32Array(W * H); this.shad = new Float32Array(W * H);
    this.hl = new Float32Array(W * H); // luz extra por haz (estrella)
    this.shadOrd = 0;
  }
  blit(f, dx, dy, ordBase, flip = false) {
    dx = Math.round(dx); dy = Math.round(dy);
    const G = this.G, u = f.used, fw = f.w;
    for (let k = 0; k < u.length; k++) {
      const s = u[k], sx = s % fw, sy = (s - sx) / fw, X = (flip ? fw - 1 - sx : sx) + dx, Y = sy + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const i = Y * W + X;
      G.mat[i] = f.mat[s]; G.val[i] = f.val[s]; G.nx[i] = flip ? -f.nx[s] : f.nx[s]; G.ny[i] = f.ny[s]; G.nz[i] = f.nz[s];
      G.obj[i] = f.obj[s]; G.ord[i] = f.ord[s] + ordBase; G.ol[i] = f.ol[s]; G.ao[i] = f.ao[s]; G.emi[i] = f.emi[s]; G.cel[i] = f.cel[s]; G.spr[i] = f.spr[s];
    }
  }
  // capa de fondo desplazable con repetición horizontal (paralaje)
  blitWrap(b, off, ordBase) {
    const G = this.G, bw = b.w, o = ((Math.round(off) % bw) + bw) % bw;
    for (let y = 0; y < Math.min(H, b.h); y++) for (let x = 0; x < W; x++) {
      const s = y * bw + ((x + o) % bw); if (!b.mat[s]) continue;
      const i = y * W + x;
      G.mat[i] = b.mat[s]; G.val[i] = b.val[s]; G.nx[i] = b.nx[s]; G.ny[i] = b.ny[s]; G.nz[i] = b.nz[s];
      G.obj[i] = b.obj[s]; G.ord[i] = b.ord[s] + ordBase; G.ol[i] = b.ol[s]; G.ao[i] = b.ao[s]; G.emi[i] = b.emi[s]; G.cel[i] = b.cel[s]; G.spr[i] = b.spr[s];
    }
  }
  // sombra de contacto dinámica sobre lo ya compuesto
  aoEllipse(cx, cy, rx, ry, s) {
    const G = this.G;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry); if (d >= 1) continue;
      G.ao[y * W + x] *= 1 - s * (1 - d * d);
    }
  }
  // iluminación + cuantización
  light(L) {
    const G = this.G, idx = this.idx, lum = this.lum, sh = this.shelter, shad = this.shad, hl = this.hl;
    const lights = L.lights, nl = lights.length;
    const [mx, my, mz] = L.moonDir, moonI = L.moon, a0 = L.amb0, a1 = L.amb1, hd = L.beamDir, bgDim = L.bgDim ?? 0.84, bgMoon = L.bgMoon ?? 0.42;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const m = G.mat[i]; if (!m) { idx[i] = 0; lum[i] = 0; continue; }
      const T = MATS[m];
      let I;
      const cl = G.cel[i];
      if (T.unlit) I = G.val[i];
      else if (cl >= 0) {
        const ex = 1 - sh[i];
        const sp = G.spr[i];
        let a = (a0 + a1 * ex) * (0.7 + 0.3 * G.ao[i]) + moonI * ex * (sp ? 0.62 : bgMoon);
        for (let k = 0; k < nl; k++) {
          const Lk = lights[k], dx = Lk.x - x, dy = Lk.y - y, dz = Lk.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > Lk.r) continue;
          let f = 1 - d / Lk.r; f *= f;
          if (Lk.shadow && G.ord[i] < this.shadOrd) f *= 1 - shad[i];
          if (Lk.inside) f *= 0.2 + 0.8 * sh[i];
          a += Lk.i * f * (0.55 + 0.45 * dz / d);
        }
        if (hl[i] > 0) a += hl[i] * 0.6;
        I = a * (0.4 + 0.86 * cl) * T.albedo * T.gain * (sp ? 1 : bgDim) + G.val[i];
        lum[i] = I + G.emi[i];
        const tt = lum[i] * (T.n - 1) + (G.spr[i] ? 0 : BAYER[(x & 3) | ((y & 3) << 2)] * T.dither * 0.7);
        idx[i] = tt <= 0 ? 0 : tt >= T.n - 1 ? T.n - 1 : Math.round(tt);
        continue;
      }
      else {
        const nx = G.nx[i], ny = G.ny[i], nz = G.nz[i], ex = 1 - sh[i], w = T.wrap;
        let a = (a0 + a1 * ex) * G.ao[i];
        const md = nx * mx + ny * my + nz * mz;
        if (md > -w) a += moonI * ex * (md + w) / (1 + w) * (0.55 + 0.45 * G.ao[i]);
        for (let k = 0; k < nl; k++) {
          const Lk = lights[k], dx = Lk.x - x, dy = Lk.y - y, dz = Lk.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d > Lk.r) continue;
          let lam = (nx * dx + ny * dy + nz * dz) / d; lam = (lam + w) / (1 + w); if (lam <= 0) continue;
          let f = 1 - d / Lk.r; f *= f;
          if (Lk.shadow && G.ord[i] < this.shadOrd) f *= 1 - shad[i];
          if (Lk.inside) f *= 0.2 + 0.8 * sh[i];
          a += Lk.i * lam * f * (0.6 + 0.4 * G.ao[i]);
          if (T.spec && lam > 0.85) a += T.spec * (lam - 0.85) * 6 * f;
        }
        if (hl[i] > 0) { const bd = nx * hd[0] + ny * hd[1] + nz * hd[2]; if (bd > 0) a += hl[i] * bd; }
        I = a * T.albedo * T.gain + G.val[i];
      }
      I += G.emi[i];
      lum[i] = I;
      const t = I * (T.n - 1) + BAYER[(x & 3) | ((y & 3) << 2)] * T.dither;
      idx[i] = t <= 0 ? 0 : t >= T.n - 1 ? T.n - 1 : Math.round(t);
    }
    // contornos sel-out: borde de un objeto sobre lo que está detrás
    const d = this.img.data, mat = G.mat, obj = G.obj, ord = G.ord, ol = G.ol;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const m = mat[i]; let k = idx[i];
      if (m && ol[i] && !G.spr[i] && ord[i] < 50000 && G.cel[i] >= 0) {
        const un = j => mat[j] && MATS[mat[j]].unlit && !MATS[mat[j]].ol;
        if ((x > 0 && un(i - 1)) || (x < W - 1 && un(i + 1)) || (y > 0 && un(i - W)) || (y < H - 1 && un(i + W))) k = Math.max(0, k - 1);
      } else if (m && ol[i]) {
        const o = obj[i], r = ord[i];
        const e = (x > 0 && obj[i - 1] !== o && ord[i - 1] < r) || (x < W - 1 && obj[i + 1] !== o && ord[i + 1] < r) ||
          (y > 0 && obj[i - W] !== o && ord[i - W] < r) || (y < H - 1 && obj[i + W] !== o && ord[i + W] < r);
        if (e) k = Math.max(0, k - (G.cel[i] >= 0 ? (G.cel[i] > 0.6 ? 1 : Math.max(1, ol[i])) : lum[i] > 0.9 ? 1 : ol[i]));
      }
      const c = m ? MATS[m].ramp[k] : [0, 0, 0], j = i * 4;
      d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
    }
  }
  present() { this.ctx.putImageData(this.img, 0, 0); }
  // --- efectos sobre el color final ---
  add(x, y, r, g, b) { if (x < 0 || y < 0 || x >= W || y >= H) return; const j = ((y | 0) * W + (x | 0)) * 4, d = this.img.data; d[j] = Math.min(255, d[j] + r); d[j + 1] = Math.min(255, d[j + 1] + g); d[j + 2] = Math.min(255, d[j + 2] + b); }
  mix(x, y, c, a) { if (x < 0 || y < 0 || x >= W || y >= H) return; const j = ((y | 0) * W + (x | 0)) * 4, d = this.img.data; d[j] += (c[0] - d[j]) * a; d[j + 1] += (c[1] - d[j + 1]) * a; d[j + 2] += (c[2] - d[j + 2]) * a; }
  set(x, y, c) { if (x < 0 || y < 0 || x >= W || y >= H) return; const j = ((y | 0) * W + (x | 0)) * 4, d = this.img.data; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; }
  // halo aditivo en bandas (aspecto pixel art)
  glow(cx, cy, R, col, s, bands = 4, cond) {
    for (let y = Math.floor(cy - R); y <= cy + R; y++) for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (dd >= R) continue;
      if (cond && !cond(x, y)) continue;
      const t = 1 - dd / R, q = Math.floor(t * t * bands + bayer(x, y) * 0.9 + 0.5) / bands; if (q <= 0) continue;
      this.add(x, y, col[0] * q * s, col[1] * q * s, col[2] * q * s);
    }
  }
}
