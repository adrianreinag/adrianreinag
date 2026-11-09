// Pintores de escenario compartidos: cielos, colinas, casas de Tierra Santa, árboles, agua, fuego.
import { W, H, M, newObj, noise, fbm, clamp, lerp, smooth, sdPoly, sdEllipse, chaikin, bboxOf, rng, bayer } from './engine.js';

// ---------- cielos ----------
export function sky(p, kind = 'night', w = W, h = H, o = {}) {
  const m = kind === 'night' ? M.sky : kind === 'dusk' || kind === 'dawn' ? M.skyDusk : M.skyDay;
  const hz = o.horizon ?? 200;
  p.shape(() => -1, [0, 0, w, h], {
    m, R: 0, ol: 0, v: (x, y) => {
      const g = Math.pow(clamp(y / hz, 0, 1), kind === 'day' ? 0.9 : 1.3);
      let v = kind === 'night' ? 0.05 + 0.68 * g : kind === 'day' ? 0.1 + 0.8 * g : 0.04 + 0.92 * g;
      if (kind === 'night' && o.milky !== false) {
        const d = ((x - (o.mx ?? 250)) * 140 - y * 230) / Math.hypot(230, 140), band = Math.exp(-(d * d) / (2 * 26 * 26));
        v += band * (0.04 + 0.12 * fbm(x * 0.045, y * 0.045, 5));
      }
      if (kind === 'dusk' && o.sunX != null) v += 0.25 * Math.exp(-(((x - o.sunX) / 90) ** 2) - (((y - hz) / 70) ** 2));
      return v - 0.04 * fbm(x * 0.02, y * 0.02);
    },
  });
}
export function clouds(p, r, n, y0, y1, w = W, o = {}) {
  for (let k = 0; k < n; k++) {
    const cx = r() * w, cy = lerp(y0, y1, r()), s = 6 + r() * 10;
    for (let j = 0; j < 5; j++) {
      const x = cx + (j - 2) * s * 0.9 + (r() - 0.5) * s, y = cy + (r() - 0.5) * s * 0.4, rr = s * (0.6 + r() * 0.5);
      const e = sdEllipse(x, y, rr * 1.6, rr * 0.7);
      p.shape((px, py) => e(px, py) + (noise(px * 0.2, py * 0.3) - 0.5) * 4, [x - rr * 2, y - rr, x + rr * 2, y + rr], { m: o.m ?? M.cloud, R: rr * 0.7, n: [0, -0.4, 0.9], ol: 0, v: o.v ?? 0 });
    }
  }
}

// ---------- relieve ----------
export function ridge(p, f, m, x0, x1, yb, o = {}) {
  let top = 1e9; for (let x = x0; x <= x1; x += 3) top = Math.min(top, f(x));
  return p.shape((x, y) => Math.max(f(x) - y, y - yb, x0 - x, x - x1), [x0, top - 2, x1, yb], { m, R: o.R ?? 0, ol: o.ol ?? 1, n: o.n, v: o.v ?? ((x, y) => (fbm(x * 0.05, y * 0.05) - 0.5) * 0.2 + (o.base ?? 0.45) - (y - f(x)) * (o.grad ?? 0.012)) });
}

// ---------- casas de piedra y cal ----------
// x: borde izquierdo, y: suelo. side>0 cara lateral a la derecha. Devuelve ventanas encendidas.
export function house(p, h) {
  const { x, y, w, ht } = h, side = h.side ?? 6, m = h.m ?? M.plaster, top = y - ht, lit = [];
  const o = newObj();
  const tex = (px, py) => (fbm(px * 0.12, py * 0.12) - 0.5) * 0.22 + (noise(px * 0.9, py * 0.9) - 0.5) * 0.06 + (h.v || 0) + (py > y - 6 ? -0.06 : 0);
  p.poly([[x, top], [x + w, top], [x + w, y], [x, y]], { m, R: 1.5, obj: o, n: [0, 0, 1], v: tex });
  if (side) {
    const sx = side > 0 ? x + w : x, s = Math.abs(side), d = side > 0 ? 1 : -1;
    p.poly([[sx, top], [sx + d * s, top - s * 0.45], [sx + d * s, y - s * 0.45], [sx, y]], { m, R: 0, obj: o, n: [d * 0.9, 0, 0.45], v: (px, py) => tex(px, py) - 0.04 });
    p.poly([[x, top], [x + w, top], [sx + d * s, top - s * 0.45], [side > 0 ? x + s : x + w - s, top - s * 0.45]], { m, R: 0, obj: o, n: [0, -0.9, 0.4], v: (px, py) => tex(px, py) + 0.06 });
  }
  // pretil de la azotea
  if (h.parapet !== false) { p.poly([[x - 0.5, top - 2.5], [x + w + 0.5, top - 2.5], [x + w + 0.5, top + 0.5], [x - 0.5, top + 0.5]], { m, R: 0.8, n: [0, -0.4, 0.9], v: 0.06 }); }
  // zócalo de piedra
  if (h.base !== false) for (let bx = x; bx < x + w - 1; bx += 4 + (noise(bx, y) * 3 | 0)) p.ell(bx + 2, y - 2, 2.6, 2, { m: M.stone, R: 1.6, v: (noise(bx, 3) - 0.5) * 0.2, ol: 1, clip: (px, py) => px < x || px > x + w ? 1 : -1 });
  // vigas que asoman (rollizos)
  if (h.beams) for (let bx = x + 3; bx < x + w - 2; bx += 5) p.ell(bx, top + 3, 1.1, 1.1, { m: M.wood, R: 1, v: -0.1 });
  // puerta
  if (h.door) {
    const d = h.door, dx = x + d.x, dw = d.w, dh = d.h;
    const arch = d.arch ? [[dx, y - dh + dw / 2], ...Array.from({ length: 7 }, (_, k) => { const a = Math.PI - k * Math.PI / 6; return [dx + dw / 2 + Math.cos(a) * dw / 2, y - dh + dw / 2 - Math.sin(a) * dw / 2]; })] : [[dx, y - dh], [dx + dw, y - dh]];
    const pts = [...arch, [dx + dw, y], [dx, y]];
    if (d.open) { p.poly(pts, { m: M.ink, R: 0, ol: 1, v: d.glow ? 0 : 0.1 }); if (d.glow) p.poly(pts.map(([px, py]) => [px, py]), { m: M.window, R: 0, ol: 1, v: d.glow }); }
    else p.poly(pts, { m: M.wood, R: 1.2, ol: 2, v: (px, py) => (noise(px * 1.4, py * 0.1) - 0.5) * 0.3 - 0.05 });
    if (!d.open) { p.crease([[dx + dw / 2, y - dh + 2], [dx + dw / 2, y]], -0.3); p.dot(dx + dw - 2, y - dh / 2, M.metal, 0.3); }
    p.poly([[dx - 1.5, y - dh - 1.5], [dx + dw + 1.5, y - dh - 1.5], [dx + dw + 1.5, y - dh], [dx - 1.5, y - dh]], { m: d.arch ? m : M.wood, R: 0.8, v: 0.05 });
  }
  // ventanas
  for (const wn of h.windows || []) {
    const wx = x + wn.x, wy = top + wn.y, ww = wn.w || 3, wh = wn.h || 4;
    const pts = [[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]];
    if (wn.lit) { p.poly(pts, { m: M.window, R: 0, ol: 0, v: wn.lit }); lit.push([wx, wy, ww, wh, wn.lit]); if (ww > 2) p.crease([[wx + (ww / 2 | 0), wy], [wx + (ww / 2 | 0), wy + wh - 1]], -0.5, M.window); }
    else p.poly(pts, { m: M.ink, R: 0, ol: 1, v: 0.12 });
    p.poly([[wx - 1, wy + wh], [wx + ww + 1, wy + wh], [wx + ww + 1, wy + wh + 1], [wx - 1, wy + wh + 1]], { m: M.wood, R: 0.5, v: 0 });
  }
  // escalera exterior a la azotea
  if (h.stairs) {
    const dir = h.stairs === 'left' ? -1 : 1, sx = dir < 0 ? x : x + w, n = Math.floor(ht / 3);
    const pts = [[sx, top + 1]]; for (let k = 0; k <= n; k++) pts.push([sx + dir * (k * 1.3 + 2), top + 1 + k * 3], [sx + dir * (k * 1.3 + 2), top + 4 + k * 3]);
    pts.push([sx + dir * (n * 1.3 + 2), y], [sx, y]);
    p.poly(pts, { m, R: 1, v: -0.06, n: [dir * 0.5, -0.4, 0.8] });
    for (let k = 0; k <= n; k++) p.crease([[sx, top + 4 + k * 3], [sx + dir * (k * 1.3 + 2), top + 4 + k * 3]], -0.22);
  }
  // toldo de tela
  if (h.awning) { const a = h.awning; p.poly([[x + a.x, top + a.y], [x + a.x + a.w, top + a.y], [x + a.x + a.w + 2, top + a.y + 5], [x + a.x - 2, top + a.y + 5]], { m: a.m, R: 1.5, v: (px) => (Math.floor(px / 2.5) % 2 ? -0.2 : 0.06) }); for (const ax of [x + a.x - 1, x + a.x + a.w + 1]) p.cap(ax, top + a.y + 5, ax, top + a.y + 14, 0.6, 0.6, { m: M.wood, R: 0.5 }); }
  return lit;
}

// ---------- vegetación ----------
export function palm(p, x, y, hgt, r, o = {}) {
  const lean = o.lean ?? (r() - 0.5) * 8, m = o.m ?? M.palm, tm = o.tm ?? M.trunk;
  const top = [x + lean, y - hgt];
  p.tube([[x, y], [x + lean * 0.3, y - hgt * 0.4], [x + lean * 0.75, y - hgt * 0.75], top], 2.4 * (o.s ?? 1), 1.4 * (o.s ?? 1), { m: tm, R: 2, v: (px, py) => (Math.sin(py * 1.6) > 0.3 ? -0.18 : 0.04) });
  const n = 9;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (k - (n - 1) / 2) * 0.42 + (r() - 0.5) * 0.15, l = (13 + r() * 5) * (o.s ?? 1);
    const pts = [top, [top[0] + Math.cos(a) * l * 0.5, top[1] + Math.sin(a) * l * 0.5 - 2], [top[0] + Math.cos(a) * l, top[1] + Math.sin(a) * l * 0.35 + l * 0.3]];
    p.tube(pts, 1.3, 0.4, { m, R: 1, ol: 1, v: (r() - 0.5) * 0.15 });
    for (let j = 1; j < 6; j++) { const u = j / 6, px = lerp(pts[0][0], pts[2][0], u), py = lerp(pts[0][1], pts[2][1], u) - Math.sin(u * Math.PI) * 3; p.cap(px, py, px + Math.cos(a + 1.2) * 2.4, py + 2.6, 0.5, 0.3, { m, R: 0.4, ol: 0, v: -0.05 }); p.cap(px, py, px + Math.cos(a - 1.2) * 2.4, py + 2.6, 0.5, 0.3, { m, R: 0.4, ol: 0, v: -0.1 }); }
  }
  if (o.dates) for (let k = 0; k < 4; k++) p.circ(top[0] + (k - 1.5) * 1.6, top[1] + 3 + (k % 2), 1.2, { m: M.ochre, R: 1, v: -0.1 });
}
export function olive(p, x, y, s, r, o = {}) {
  p.tube([[x, y], [x - 2 * s, y - 10 * s], [x + 1 * s, y - 18 * s], [x - 1 * s, y - 24 * s]], 3.4 * s, 1.6 * s, { m: M.trunk, R: 3 * s, fold: (px, py) => [Math.sin(py * 0.7) * 0.4, 0] });
  p.tube([[x - 1 * s, y - 16 * s], [x - 9 * s, y - 24 * s]], 1.6 * s, 0.9 * s, { m: M.trunk, R: 1.5 });
  p.tube([[x, y - 18 * s], [x + 8 * s, y - 27 * s]], 1.5 * s, 0.8 * s, { m: M.trunk, R: 1.5 });
  const L = []; for (let k = 0; k < 26 * s; k++) L.push([x + (r() - 0.5) * 30 * s, y - 22 * s - r() * 20 * s, (2 + r() * 3.4) * Math.sqrt(s), r()]);
  L.sort((a, b) => a[1] - b[1]);
  for (const [lx, ly, ls, q] of L) { const e = sdEllipse(lx, ly, ls * 1.5, ls, (q - 0.5) * 0.5); p.shape((px, py) => e(px, py) + (noise(px * 0.9, py * 0.9) - 0.5) * 2.2, [lx - ls * 2 - 2, ly - ls * 2 - 2, lx + ls * 2 + 2, ly + ls * 2 + 2], { m: o.m ?? M.olive, R: ls, n: [0.2, -0.3, 1], ol: 1, v: (q - 0.5) * 0.12 + (o.v || 0) }); }
}
export function cypress(p, x, y, hgt, o = {}) {
  const e = sdEllipse(x, y - hgt / 2, hgt * 0.16, hgt / 2);
  p.shape((px, py) => e(px, py) + (noise(px * 0.7, py * 0.4) - 0.5) * 2.4, [x - hgt * 0.3, y - hgt - 2, x + hgt * 0.3, y + 1], { m: o.m ?? M.leaf, R: hgt * 0.15, ol: 1, v: (px, py) => (noise(px * 1.2, py * 0.6) - 0.5) * 0.25 - 0.1, fold: (px, py) => [(noise(px * 0.8, py * 0.5) - 0.5) * 0.8, 0] });
}
export function bush(p, x, y, s, r, m = M.leaf) {
  for (let k = 0; k < 6; k++) { const bx = x + (r() - 0.5) * s * 2, by = y - r() * s, bs = s * (0.4 + r() * 0.4); const e = sdEllipse(bx, by, bs * 1.3, bs); p.shape((px, py) => e(px, py) + (noise(px, py) - 0.5) * 2, [bx - bs * 2, by - bs * 2, bx + bs * 2, by + bs * 2], { m, R: bs, n: [0, -0.4, 0.9], ol: 1, v: (r() - 0.5) * 0.1 }); }
}
export function grassTuft(p, x, y, h, r, m = M.grass) {
  const n = 4 + (r() * 4) | 0;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.3, l = h * (0.5 + r() * 0.6);
    p.tube([[x + (r() - 0.5) * 3, y], [x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [x + Math.cos(a) * l + (r() - 0.5) * 2, y + Math.sin(a) * l]], 0.7, 0.35, { m, R: 0.6, ol: 0, v: r() * 0.2 });
  }
}
export function stones(p, n, r, area, o = {}) {
  for (let k = 0; k < n; k++) { const [x, y] = area(r); const s = (o.min ?? 0.8) + r() * (o.max ?? 2); p.ell(x, y, s * 1.4, s, { m: o.m ?? M.rock, R: s, n: [0, -0.4, 0.9], v: 0.05 + r() * 0.15, ol: 1 }); }
}

// ---------- fuego: hoguera con piedras y leña ----------
export function campfire(p, x, y) {
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; p.ell(x + Math.cos(a) * 7, y + Math.sin(a) * 2.4, 2.4, 1.8, { m: M.stone, R: 1.6, v: -0.02 }); }
  p.cap(x - 6, y + 0.5, x + 5, y - 2, 1.3, 1.1, { m: M.wood, R: 1, v: -0.2 });
  p.cap(x + 6, y + 0.5, x - 4, y - 2.4, 1.3, 1.1, { m: M.wood, R: 1, v: -0.25 });
  p.ell(x, y - 0.5, 4, 1.4, { m: M.ember, R: 0, v: 0.5, ol: 0 });
}
// llamas animadas (sobre el color final)
export function flames(R, x, y, s, t, o = {}) {
  const fl = Math.floor(t * 12);
  const cols = [[120, 30, 10], [220, 80, 16], [255, 150, 40], [255, 214, 110], [255, 248, 210]];
  const n = Math.round(5 * s);
  for (let k = 0; k < n; k++) {
    const ph = noise(fl * 0.7 + k * 3.1, k), hgt = (4 + ph * 7) * s, bx = x + (k - (n - 1) / 2) * 1.6 * s;
    for (let j = 0; j < hgt; j++) {
      const u = j / hgt, wob = Math.round((noise(fl * 0.9 + k, j * 0.4) - 0.5) * 2 * u * s);
      const ci = Math.min(4, Math.floor((1 - u) * 4.6 * (0.6 + 0.4 * ph)));
      const wdt = Math.max(0, Math.round((1 - u) * 1.4 * s));
      for (let d = -wdt; d <= wdt; d++) R.set(bx + wob + d, y - j, cols[Math.max(0, ci - Math.abs(d))]);
    }
  }
  // chispas
  for (let k = 0; k < 4 * s; k++) { const u = ((t * 0.9 + k * 0.37) % 1), sx = x + Math.sin(k * 2.3 + t * 2) * 3 * s + u * 2, sy = y - 6 * s - u * 22 * s; if (u < 0.85) R.add(sx, sy, 255 * (1 - u), 150 * (1 - u), 50 * (1 - u)); }
  R.glow(x, y - 3 * s, 14 * s, [255, 160, 70], 0.4, 4);
  if (o.big !== false) R.glow(x, y - 3 * s, 60 * s, [255, 120, 40], 0.12, 5);
}
// humo de chimenea / hoguera
export function smoke(R, x, y, t, n = 8, col = [70, 70, 96]) {
  for (let k = 0; k < n; k++) {
    const u = ((t * 0.22 + k / n) % 1), sx = x + Math.sin(u * 5 + k) * 1.8 + u * 7, sy = y - u * 30;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1]]) if (bayer((sx + dx) | 0, (sy + dy) | 0) + 0.5 < (1 - u) * 0.75) R.mix(sx + dx, sy + dy, col, 0.45 * (1 - u));
  }
}
// estrellas del cielo (lista) y su dibujo
export function makeStars(buf, n, seed, maxY = 185, skyM = M.sky) {
  const r = rng(seed), s = [];
  for (let k = 0; k < n * 3 && s.length < n; k++) { const x = (r() * W) | 0, y = (r() ** 1.5 * maxY) | 0; if (buf.mat[y * buf.w + x] !== skyM) continue; s.push([x, y, r() ** 2.2, r() * 6.28, r()]); }
  return s;
}
export function drawStars(R, stars, t, skyM = M.sky, k = 1) {
  const G = R.G;
  for (const [x, y, b, ph, c] of stars) {
    if (G.mat[y * W + x] !== skyM) continue;
    const tw = b * k * (0.55 + 0.45 * Math.sin(t * (0.8 + c * 2.6) + ph));
    const col = c < 0.15 ? [255, 214, 170] : c > 0.85 ? [170, 200, 255] : [225, 228, 255];
    R.add(x, y, col[0] * tw, col[1] * tw, col[2] * tw);
    if (b > 0.72) { const q = tw * 0.35; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) R.add(x + dx, y + dy, col[0] * q, col[1] * q, col[2] * q); }
  }
}
// estrella de Belén con cola
export function bethlehemStar(R, sx, sy, t, o = {}) {
  const G = R.G, s = o.s ?? 1, skyM = o.sky ?? M.sky;
  R.glow(sx, sy, 34 * s, [120, 140, 230], 0.42, 6);
  R.glow(sx, sy, 12 * s, [255, 250, 220], 0.5, 4);
  if (o.tail !== false) {
    const dx = o.dir?.[0] ?? 1.6, dy = o.dir?.[1] ?? -0.62, n = Math.round(60 * s);
    for (let k = 0; k < n; k++) {
      const u = k / n, x = sx + 4 * Math.sign(dx) + k * dx, y = sy - 2 + k * dy, w = 1 + u * 5 * s;
      for (let d = -w; d <= w; d++) {
        const px = Math.round(x - d * 0.36), py = Math.round(y + d * 0.93);
        if (py < 0 || px < 0 || px >= W || G.mat[py * W + px] !== skyM) continue;
        const q = (1 - u) ** 1.6 * (1 - Math.abs(d) / (w + 0.5)) * (0.75 + 0.25 * Math.sin(k * 0.7 - t * 3));
        const qq = Math.floor(q * 4 + bayer(px, py) + 0.5) / 4;
        R.add(px, py, 130 * qq, 140 * qq, 190 * qq);
      }
    }
  }
  const L1 = (11 + 2 * Math.sin(t * 2.1)) * s, L2 = (6 + 1.5 * Math.sin(t * 2.7 + 1)) * s;
  for (let k = 1; k <= L1; k++) { const q = (1 - k / (L1 + 1)) ** 1.3; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) R.add(sx + dx * k, sy + dy * k, 255 * q, 250 * q, 230 * q); }
  for (let k = 1; k <= L2; k++) { const q = (1 - k / (L2 + 1)) ** 1.5 * 0.7; for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) R.add(sx + dx * k, sy + dy * k, 255 * q, 240 * q, 210 * q); }
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) R.set(sx + dx, sy + dy, dx || dy ? [255, 246, 214] : [255, 255, 255]);
}
export function shootingStar(R, t, skyM = M.sky, per = 13.5) {
  const G = R.G, sp = t % per; if (sp >= 0.9) return;
  const sx = 470 - sp * 120, sy = 8 + sp * 40;
  for (let k = 0; k < 14; k++) { const x = Math.round(sx + k * 3), y = Math.round(sy - k); if (y >= 0 && x < W && x >= 0 && G.mat[y * W + x] === skyM) { const q = (1 - k / 14) * (1 - sp / 0.9); R.add(x, y, 230 * q, 230 * q, 255 * q); } }
}
// brillo de agua tipo papel de plata
export function shimmer(R, mask, t, m = M.water) {
  const G = R.G, d = R.img.data;
  for (const i of mask) {
    if (G.mat[i] !== m) continue;
    const x = i % W, y = (i - x) / W;
    const s = Math.sin(x * 0.35 + t * 2.2 + Math.sin(y * 1.7 + t) * 2) * Math.sin(y * 2.1 - t * 1.3);
    if (s > 0.86) { const q = (s - 0.86) * 7; const j = i * 4; d[j] = Math.min(255, d[j] + 150 * q); d[j + 1] = Math.min(255, d[j + 1] + 170 * q); d[j + 2] = Math.min(255, d[j + 2] + 200 * q); }
  }
}

// ---------- letras de 3x5 para cintas y carteles ----------
const GLYPH = {
  A: ['010', '101', '111', '101', '101'], C: ['111', '100', '100', '100', '111'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], G: ['111', '100', '101', '101', '111'], I: ['111', '010', '010', '010', '111'],
  L: ['100', '100', '100', '100', '111'], N: ['101', '111', '111', '101', '101'], O: ['111', '101', '101', '101', '111'],
  R: ['110', '101', '110', '101', '101'], S: ['111', '100', '111', '001', '111'], X: ['101', '101', '010', '101', '101'],
};
export function textWidth(s) { let w = 0; for (const ch of s) w += ch === ' ' ? 3 : 4; return w - 1; }
// escribe sobre lo ya pintado (cambia material y valor)
export function paintText(p, s, x, y, m, v = 0.1, yf = () => 0) {
  let cx = x;
  for (const ch of s) {
    if (ch === ' ') { cx += 3; continue; }
    const g = GLYPH[ch]; if (!g) { cx += 4; continue; }
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j][i] === '1') p.dot(cx + i, y + j + yf(cx + i), m, v);
    cx += 4;
  }
}
