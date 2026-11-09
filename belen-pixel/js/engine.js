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
export function defMat(name, ramp, o = {}) {
  const id = MATS.length;
  MATS.push({ id, name, ramp: ramp.map(hex), n: ramp.length, dither: o.dither ?? 0.5, unlit: !!o.unlit,
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
const KEYS = ['mat', 'val', 'nx', 'ny', 'nz', 'obj', 'ord', 'ol', 'ao', 'emi'];
export class GBuf {
  constructor(w, h) {
    this.w = w; this.h = h; const n = (this.n = w * h);
    this.mat = new Uint8Array(n); this.val = new Float32Array(n);
    this.nx = new Float32Array(n); this.ny = new Float32Array(n); this.nz = new Float32Array(n).fill(1);
    this.obj = new Uint32Array(n); this.ord = new Uint32Array(n); this.ol = new Uint8Array(n);
    this.ao = new Float32Array(n).fill(1); this.emi = new Float32Array(n);
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

// ---------- capas animadas: cada actor tiene fotogramas cacheados ----------
export class Actor {
  constructor(o) { Object.assign(this, { key: () => '0', cast: 0 }, o); this.cache = new Map(); }
  frame(t) {
    const k = this.key(t);
    let f = this.cache.get(k);
    if (!f) { const b = new GBuf(this.w, this.h); const p = new Painter(b, this.ox, this.oy, this.scale || 1); this.draw(p, t, k); f = b.pack(); this.cache.set(k, f); }
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
    const G = this.G, u = f.used, fw = f.w;
    for (let k = 0; k < u.length; k++) {
      const s = u[k], sx = s % fw, sy = (s - sx) / fw, X = (flip ? fw - 1 - sx : sx) + dx, Y = sy + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const i = Y * W + X;
      G.mat[i] = f.mat[s]; G.val[i] = f.val[s]; G.nx[i] = flip ? -f.nx[s] : f.nx[s]; G.ny[i] = f.ny[s]; G.nz[i] = f.nz[s];
      G.obj[i] = f.obj[s]; G.ord[i] = f.ord[s] + ordBase; G.ol[i] = f.ol[s]; G.ao[i] = f.ao[s]; G.emi[i] = f.emi[s];
    }
  }
  // capa de fondo desplazable con repetición horizontal (paralaje)
  blitWrap(b, off, ordBase) {
    const G = this.G, bw = b.w, o = ((Math.round(off) % bw) + bw) % bw;
    for (let y = 0; y < Math.min(H, b.h); y++) for (let x = 0; x < W; x++) {
      const s = y * bw + ((x + o) % bw); if (!b.mat[s]) continue;
      const i = y * W + x;
      G.mat[i] = b.mat[s]; G.val[i] = b.val[s]; G.nx[i] = b.nx[s]; G.ny[i] = b.ny[s]; G.nz[i] = b.nz[s];
      G.obj[i] = b.obj[s]; G.ord[i] = b.ord[s] + ordBase; G.ol[i] = b.ol[s]; G.ao[i] = b.ao[s]; G.emi[i] = b.emi[s];
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
    const [mx, my, mz] = L.moonDir, moonI = L.moon, a0 = L.amb0, a1 = L.amb1, hd = L.beamDir;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const m = G.mat[i]; if (!m) { idx[i] = 0; lum[i] = 0; continue; }
      const T = MATS[m];
      let I;
      if (T.unlit) I = G.val[i];
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
      if (m && ol[i]) {
        const o = obj[i], r = ord[i];
        const e = (x > 0 && obj[i - 1] !== o && ord[i - 1] < r) || (x < W - 1 && obj[i + 1] !== o && ord[i + 1] < r) ||
          (y > 0 && obj[i - W] !== o && ord[i - W] < r) || (y < H - 1 && obj[i + W] !== o && ord[i + W] < r);
        if (e) k = Math.max(0, k - (lum[i] > 0.9 ? 1 : ol[i]));
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
