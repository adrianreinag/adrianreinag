// Utilidades: aleatorio con semilla, ruido, interpolación y geometría 2D.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) { this.r = mulberry32(seed); }
  next() { return this.r(); }
  range(a, b) { return a + (b - a) * this.r(); }
  int(a, b) { return Math.floor(this.range(a, b + 1)); }
  pick(arr) { return arr[Math.floor(this.r() * arr.length)]; }
  chance(p) { return this.r() < p; }
  sign() { return this.r() < 0.5 ? -1 : 1; }
}

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

// Ruido 2D tipo simplex (implementación compacta de dominio público)
const grad3 = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
const perm = new Uint8Array(512);
(function initPerm() {
  const p = new Uint8Array(256);
  const r = mulberry32(1225);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
export function noise2(xin, yin) {
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s), j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const x0 = xin - (i - t), y0 = yin - (j - t);
  const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  let n0 = 0, n1 = 0, n2 = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0) { const g = grad3[perm[ii + perm[jj]] & 7]; t0 *= t0; n0 = t0 * t0 * (g[0] * x0 + g[1] * y0); }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0) { const g = grad3[perm[ii + i1 + perm[jj + j1]] & 7]; t1 *= t1; n1 = t1 * t1 * (g[0] * x1 + g[1] * y1); }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0) { const g = grad3[perm[ii + 1 + perm[jj + 1]] & 7]; t2 *= t2; n2 = t2 * t2 * (g[0] * x2 + g[1] * y2); }
  return 70 * (n0 + n1 + n2); // [-1, 1]
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise2(x * f, y * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
export function ridged(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * (1 - Math.abs(noise2(x * f, y * f))); n += a; a *= 0.5; f *= 2.1; }
  return s / n;
}

// Distancia de un punto a una polilínea [[x,z],...]; devuelve {d, t (0..1 a lo largo), seg}
export function distToPolyline(x, z, pts) {
  let best = Infinity, bestT = 0, total = 0, acc = 0, bestSeg = 0;
  const lens = [];
  for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); lens.push(l); total += l; }
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0], az = pts[i][1], bx = pts[i + 1][0], bz = pts[i + 1][1];
    const dx = bx - ax, dz = bz - az; const l2 = dx * dx + dz * dz || 1;
    const u = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
    const px = ax + dx * u, pz = az + dz * u;
    const d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bestT = (acc + u * lens[i]) / (total || 1); bestSeg = i; }
    acc += lens[i];
  }
  return { d: best, t: bestT, seg: bestSeg };
}

// Muestrea una polilínea suavizada (Catmull-Rom) devolviendo puntos [x,z]
export function smoothPath(pts, step = 2) {
  const out = [];
  const P = (i) => pts[clamp(i, 0, pts.length - 1)];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

// Recorre una polilínea por distancia: devuelve posición y dirección
export class PathWalker {
  constructor(pts, { loop = false } = {}) {
    this.pts = pts; this.loop = loop;
    if (loop) this.pts = [...pts, pts[0]];
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(this.pts[i][0] - this.pts[i - 1][0], this.pts[i][1] - this.pts[i - 1][1]));
    this.length = this.cum[this.cum.length - 1];
  }
  at(s) {
    const L = this.length;
    if (this.loop) s = ((s % L) + L) % L; else s = clamp(s, 0, L);
    let lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.cum[m] <= s) lo = m; else hi = m; }
    const a = this.pts[lo], b = this.pts[hi];
    const seg = this.cum[hi] - this.cum[lo] || 1;
    const u = (s - this.cum[lo]) / seg;
    return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, dx: (b[0] - a[0]) / seg, dz: (b[1] - a[1]) / seg };
  }
}

export function circlePath(cx, cz, r, n = 48, a0 = 0, a1 = Math.PI * 2) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return pts;
}
