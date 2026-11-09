// Escena: el Portal de Belén en Nochebuena (vista cercana).
import { W, H, M, GBuf, Painter, Actor, bakeCel, newObj, noise, fbm, clamp, lerp, smooth, sdPoly, sdEllipse, bboxOf, chaikin, bayer, rng } from '../engine.js';
import * as F from '../figures.js';
import { persona } from '../people.js';
import { CAST } from '../cast.js';
import { oveja, perro, camelloEchado } from '../animals.js';
import { bethlehemStar, drawStars, shootingStar } from '../env.js';

const FLOOR = 222;
const LAMP = { x: 239, y: 99 };
const STAR = { x: 338, y: 22 };
const GAP = [[300, 45], [334, 49], [320, 89], [296, 89]];

// ---------- pintores reutilizables ----------
// macizo de roca con bultos (textura de corcho) y musgo en las caras altas
export function rockMass(p, region, o = {}) {
  const r = rng(o.seed || 1), m = o.m ?? M.rock;
  const reg = chaikin(region, 2), rs = sdPoly(reg), bb = bboxOf(reg);
  p.shape(rs, bb, { m, R: o.edgeR ?? 8, v: (x, y) => (fbm(x * 0.07, y * 0.07) - 0.5) * 0.3 - 0.05, ol: 1 });
  const pts = [];
  for (let k = 0; k < (o.n || 100) * 4 && pts.length < (o.n || 100); k++) {
    const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
    if (rs(x, y) < -1.5) pts.push([x, y, lerp(o.rmin || 5, o.rmax || 14, r() ** 1.4), r(), r()]);
  }
  pts.sort((a, b) => a[1] - b[1]);
  for (const [x, y, rr, q, q2] of pts) {
    const rx = rr * (0.95 + 0.5 * q), ry = rr * (0.62 + 0.3 * q2), rot = (q2 - 0.5) * 0.7;
    const e = sdEllipse(x, y, rx, ry, rot);
    const sdf = (px, py) => e(px, py) + (noise(px * 0.32 + q * 50, py * 0.32) - 0.5) * 3.4;
    p.shape(sdf, [x - rx - 3, y - rx - 3, x + rx + 3, y + rx + 3], {
      m, R: Math.min(rx, ry) * 1.15, n: [0, -(o.tilt ?? 0.25), 1], clip: rs, ol: 1,
      v: (px, py) => (q - 0.5) * 0.14 + (fbm(px * 0.22, py * 0.22) - 0.5) * 0.22 + (noise(px * 1.3, py * 1.3) - 0.5) * 0.08,
    });
  }
  // musgo
  if (o.moss) {
    const b = p.b;
    for (let y = Math.max(0, bb[1] | 0); y < Math.min(H, bb[3]); y++) for (let x = Math.max(0, bb[0] | 0); x < Math.min(W, bb[2]); x++) {
      const i = y * W + x; if (b.mat[i] !== m) continue;
      const g = fbm(x * 0.09 + 3, y * 0.09) + (noise(x * 0.8, y * 0.8) - 0.5) * 0.25;
      if (b.ny[i] < -0.45 && g > o.moss(x, y)) { b.mat[i] = M.moss; b.val[i] += (noise(x * 1.7, y * 1.7) - 0.5) * 0.2; }
    }
  }
}

function strawScatter(p, n, seed, area, o = {}) {
  const r = rng(seed);
  for (let k = 0; k < n; k++) {
    const [x, y] = area(r);
    if (x == null) continue;
    const a = (r() - 0.5) * (o.spread ?? 1.4), l = 2 + r() * (o.len ?? 5);
    p.cap(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.35, 0.5, 0.45, { m: M.straw, R: 0, n: [0, -0.7, 0.72], ol: 0, v: (r() - 0.35) * 0.35 + (o.v || 0) });
  }
}

function grassTuft(p, x, y, h, r, m = M.grass) {
  const n = 4 + (r() * 4) | 0;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 1.3, l = h * (0.5 + r() * 0.6);
    p.tube([[x + (r() - 0.5) * 3, y], [x + Math.cos(a) * l * 0.5, y + Math.sin(a) * l * 0.5], [x + Math.cos(a) * l + (r() - 0.5) * 2, y + Math.sin(a) * l]], 0.7, 0.35, { m, R: 0.6, ol: 0, v: r() * 0.2 });
  }
}

// ---------- fondo estático ----------
function paintBG(p) {
  const r = rng(11);
  // cielo con degradado y vía láctea
  p.shape(() => -1, [0, 0, W, H], {
    m: M.sky, R: 0, ol: 0, v: (x, y) => {
      const g = Math.pow(clamp(y / 205, 0, 1), 1.3);
      const d = ((x - 250) * 140 - y * 230) / Math.hypot(230, 140);
      const band = Math.exp(-(d * d) / (2 * 26 * 26));
      return 0.05 + 0.68 * g + band * (0.04 + 0.12 * fbm(x * 0.045, y * 0.045, 5)) - 0.04 * fbm(x * 0.02, y * 0.02);
    },
  });
  // colinas lejanas
  const ridge1 = x => 171 + 5 * Math.sin(x * 0.031) + 7 * (fbm(x * 0.02, 3) - 0.5) + 6 * smooth(440, 480, x);
  const r1 = []; for (let x = 270; x <= 482; x += 3) r1.push([x, ridge1(x)]); r1.push([482, 250], [270, 250]);
  p.poly(r1, { m: M.far1, R: 0, ol: 0, v: (x, y) => 0.46 - (y - ridge1(x)) * 0.015 + (fbm(x * 0.06, y * 0.06) - 0.5) * 0.12 });
  const hill = x => 187 - 27 * Math.exp(-(((x - 420) / 36) ** 2)) + 3 * (noise(x * 0.12, 7) - 0.5);
  const r2 = []; for (let x = 360; x <= 482; x += 2) r2.push([x, hill(x)]); r2.push([482, 250], [360, 250]);
  p.poly(r2, { m: M.far2, R: 0, ol: 1, v: (x, y) => 0.5 - (y - hill(x)) * 0.02 + (fbm(x * 0.1, y * 0.1) - 0.5) * 0.15 });
  // Belén dormida en su colina: casas cúbicas de azotea, una torre y palmeras
  const houses = [];
  for (let k = 0; k < 17; k++) {
    const cx = 392 + k * 3.7 + r() * 3, top = hill(cx);
    houses.push({ cx, w: 4 + (r() * 5 | 0), h: 3 + (r() * 5 | 0), base: top + 4 + r() * 7, lit: r() });
  }
  houses.push({ cx: 421, w: 5, h: 13, base: hill(421) + 4, lit: 0.9, tower: true });
  houses.sort((a, b) => a.base - b.base);
  const windows = [];
  for (const hs of houses) {
    const x0 = Math.round(hs.cx - hs.w / 2), x1 = x0 + hs.w, y1 = Math.round(hs.base), y0 = y1 - hs.h;
    const o = newObj();
    p.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], { m: M.town, R: 0, obj: o, n: [-0.1, 0, 1], v: -0.04, ol: 1 });
    p.poly([[x1, y0 - 1], [x1 + 2, y0 - 2], [x1 + 2, y1 - 1], [x1, y1]], { m: M.town, R: 0, obj: o, n: [0.85, -0.1, 0.5], v: 0.05, ol: 1 });
    p.poly([[x0, y0 - 1], [x1 + 1, y0 - 2], [x1, y0], [x0, y0]], { m: M.town, R: 0, obj: o, n: [0.2, -0.9, 0.4], v: 0.08, ol: 1 });
    const wx = x0 + 1 + (hs.w > 5 ? 1 : 0), wy = y0 + 2;
    if (hs.lit > 0.45) { p.pix(wx, wy, M.window, { v: 0.6 + hs.lit * 0.3, obj: o }); windows.push([wx, wy, hs.lit]); }
    else p.dot(wx, wy, M.ink, 0.1);
    if (hs.w > 6) p.dot(x1 - 2, y1 - 2, M.ink, 0.05), p.dot(x1 - 2, y1 - 1, M.ink, 0.05);
    if (hs.tower) { p.pix(x0 + 2, y0 + 5, M.window, { v: 0.8, obj: o }); windows.push([x0 + 2, y0 + 5, 0.8]); }
  }
  // palmeras datileras
  for (const [x, y, hh] of [[403, hill(403) + 6, 15], [452, hill(452) + 8, 12]]) {
    p.tube([[x, y], [x + 1, y - hh * 0.5], [x - 0.5, y - hh]], 0.8, 0.6, { m: M.far2, R: 0, ol: 0, v: 0.18 });
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.55, l = 5 + r() * 2;
      p.tube([[x - 0.5, y - hh], [x - 0.5 + Math.cos(a) * l * 0.6, y - hh + Math.sin(a) * l * 0.6 - 1], [x - 0.5 + Math.cos(a) * l, y - hh + Math.sin(a) * l * 0.4 + 1.5]], 0.6, 0.35, { m: M.far2, R: 0, ol: 0, v: 0.2 });
    }
  }
  // fondo de la cueva
  rockMass(p, [[124, 82], [399, 82], [395, 120], [393, 158], [384, 186], [377, 206], [372, 232], [108, 232]], { m: M.wall, seed: 5, n: 70, rmin: 8, rmax: 20, tilt: 0.1, edgeR: 3 });
  // suelo: tierra apisonada dentro, terreno con hierba fuera
  const gtop = x => (x < 376 ? 204 : 204 - (x - 376) * 0.06) + (noise(x * 0.2, 3) - 0.5) * 2;
  const gp = []; for (let x = -4; x <= 482; x += 3) gp.push([x, gtop(x)]); gp.push([482, 272], [-4, 272]);
  p.poly(gp, { m: M.dirt, R: 0, n: [0, -0.72, 0.7], ol: 1, v: (x, y) => (fbm(x * 0.06, y * 0.12) - 0.5) * 0.35 + (noise(x * 0.9, y * 1.8) - 0.5) * 0.12 + (y - 204) * 0.004 });
  // piedrecillas
  for (let k = 0; k < 70; k++) {
    const x = 100 + r() * 380, y = 206 + r() ** 0.8 * 62, s = 0.8 + r() * 1.8;
    p.ell(x, y, s * 1.4, s, { m: M.rock, R: s, n: [0, -0.4, 0.9], v: 0.1 + r() * 0.15, ol: 1 });
  }
  // paja esparcida por el suelo del establo
  strawScatter(p, 260, 21, r2 => { const x = 120 + r2() * 260, y = 206 + r2() * 62; const c = Math.exp(-(((x - 244) / 70) ** 2)) + 0.6 * Math.exp(-(((x - 160) / 30) ** 2)); return r2() < 0.15 + 0.85 * c && noise(x * 0.07, y * 0.12) > 0.42 ? [x, y] : [null]; }, { v: -0.12 });
  // pirca de piedra seca fuera
  for (let x = 394; x < 482; x += 4 + r() * 2) {
    const y = gtop(x) + 1;
    p.ell(x, y - 3, 3 + r() * 1.5, 2.4 + r(), { m: M.rock, R: 2.5, v: -0.05 + r() * 0.1, n: [0, -0.3, 1] });
    if (r() < 0.6) p.ell(x + 2, y - 7, 2.6 + r(), 2 + r() * 0.8, { m: M.rock, R: 2.2, v: r() * 0.1, n: [0, -0.3, 1] });
  }
  for (let k = 0; k < 26; k++) grassTuft(p, 384 + r() * 98, 208 + r() * 60, 4 + r() * 5, r);
  // olivo a la derecha
  p.tube([[466, 238], [462, 214], [466, 196], [460, 176], [462, 160]], 4.6, 2, { m: M.trunk, R: 4, fold: (x, y) => [Math.sin(y * 0.6) * 0.4, 0] });
  p.tube([[462, 196], [452, 184], [446, 170]], 2.2, 1.2, { m: M.trunk, R: 2 });
  p.tube([[464, 182], [474, 170], [478, 156]], 2, 1.1, { m: M.trunk, R: 2 });
  const leaves = []; for (let k = 0; k < 70; k++) leaves.push([436 + r() * 46, 132 + r() * 58, 2.5 + r() * 4, r()]);
  leaves.sort((a, b) => a[1] - b[1]);
  for (const [x, y, s, q] of leaves) {
    const e = sdEllipse(x, y, s * 1.5, s, (q - 0.5) * 0.5);
    p.shape((px, py) => e(px, py) + (noise(px * 0.9, py * 0.9) - 0.5) * 2.2, [x - s * 2 - 2, y - s * 2 - 2, x + s * 2 + 2, y + s * 2 + 2], { m: M.olive, R: s, n: [0.2, -0.3, 1], ol: 1, v: (q - 0.5) * 0.12 });
  }
  // gran roca de la izquierda con saliente sobre el portal
  rockMass(p, [[-6, -6], [272, -6], [266, 8], [254, 22], [238, 36], [224, 46], [190, 47], [158, 47], [147, 50], [142, 66], [138, 90], [134, 116], [130, 142], [126, 168], [122, 192], [116, 212], [108, 228], [96, 240], [76, 248], [40, 252], [-6, 254]], {
    m: M.rock, seed: 3, n: 170, rmin: 7, rmax: 22, tilt: 0.35, moss: (x, y) => 0.6 - smooth(120, 250, y) * 0.16 - smooth(110, 0, x) * 0.06,
  });
  // grietas
  for (const c of [[[40, 30], [52, 44], [49, 60], [58, 78]], [[98, 120], [106, 134], [102, 150]], [[20, 170], [30, 182], [27, 198], [36, 214]], [[180, 6], [192, 16], [210, 22]]]) p.crease(c, -0.35);
  // matojos en repisas de la roca
  for (const [x, y] of [[118, 196], [12, 96], [64, 150], [204, 30], [86, 214], [134, 82]]) grassTuft(p, x, y, 6, r, M.moss);
  // sombras de contacto
  for (let x = 110; x < 380; x += 6) p.aoBlob(x, 206, 9, 4, 0.35);
  return { windows, gtop };
}

// ---------- primer plano estático ----------
function paintFG(p) {
  const r = rng(77);
  // pies derechos
  const grainV = (x, y) => (noise(x * 0.9, y * 0.09) - 0.5) * 0.32 + (noise(x * 3, y * 0.4) - 0.5) * 0.08;
  p.tube([[153.6, 86], [152.8, 150], [154, 226]], 4.3, 4.8, { m: M.wood, R: 4.2, v: grainV });
  p.tube([[384.4, 86], [385.4, 160], [384.6, 229]], 4.3, 4.8, { m: M.wood, R: 4.2, v: grainV });
  for (const [x, y] of [[153, 130], [385, 120], [384, 180]]) { p.ell(x, y, 1.6, 2.2, { m: M.wood, R: 1.4, v: -0.3 }); }
  // tornapuntas
  p.cap(384, 116, 364, 92, 1.8, 1.6, { m: M.wood, R: 1.7, v: grainV });
  p.cap(154, 116, 172, 92, 1.8, 1.6, { m: M.wood, R: 1.7, v: grainV });
  // viga
  const grainH = (x, y) => (noise(x * 0.07, y * 0.9) - 0.5) * 0.34 + (noise(x * 0.4, y * 3) - 0.5) * 0.08;
  p.poly([[138, 84], [409, 84.5], [410, 91.5], [138, 91]], { m: M.wood, R: 3.4, v: grainH });
  p.ell(409.2, 88, 2, 3.6, { m: M.wood, R: 1.6, v: 0.18 });
  p.crease([[409.2, 86], [409.2, 90]], -0.2);
  // ataduras de cuerda
  for (const x of [153.5, 384.8]) for (let k = -2; k <= 2; k++) p.cap(x - 5.5, 84 + k * 1.6 + 2, x + 5.5, 84 + k * 1.6 + 4.5, 0.75, 0.75, { m: M.rope, R: 0.8, ol: 1 });
  // techumbre de cañas y paja
  const rt = x => 44 + (x - 138) * 0.045 + 1.6 * Math.sin(x * 0.21) + 2 * (noise(x * 0.1, 1) - 0.5);
  const band = []; for (let x = 136; x <= 412; x += 3) band.push([x, rt(x)]); band.push([412, 87], [136, 87]);
  const gapS = sdPoly(chaikin(GAP.map(([x, y]) => [x + (noise(y, 1) - 0.5) * 4, y]), 1));
  const clip = (x, y) => -gapS(x, y) - 0.5;
  p.poly(band, { m: M.thatch, R: 2, n: [0, 0.3, 0.95], clip, v: -0.12 });
  // varas visibles por el hueco
  p.cap(292, 60, 338, 54, 1.3, 1.2, { m: M.wood, R: 1.2 });
  p.cap(288, 76, 330, 71, 1.3, 1.2, { m: M.wood, R: 1.2 });
  p.cap(318, 47, 306, 90, 1.1, 1.1, { m: M.wood, R: 1, v: -0.1 });
  // haces de paja en hileras
  for (let row = 0; row < 6; row++) {
    for (let x = 136; x < 412; x += 1.3 + r() * 1.2) {
      const y0 = rt(x) + row * 7 - 2 + r() * 2, l = 7 + r() * 5, dx = (r() - 0.5) * 2.4 + (x - 274) * 0.006;
      if (y0 > 86) continue;
      p.cap(x, y0, x + dx, Math.min(y0 + l, 88), 0.75, 0.6, { m: M.thatch, R: 0.9, ol: 0, n: [0, 0.25, 1], clip, v: (r() - 0.5) * 0.36 + row * 0.02 });
    }
    if (row > 0) p.crease(band.slice(0, -2).map(([x, y]) => [x, y + row * 7 - 2]), -0.2);
  }
  // flecos colgando sobre la viga
  for (let x = 137; x < 411; x += 1 + r() * 1.6) {
    if (gapS(x, 86) < 1) continue;
    const l = 2 + r() * 8 * (0.6 + 0.4 * noise(x * 0.2, 2));
    p.cap(x, 85, x + (r() - 0.5) * 2, 85 + l, 0.6, 0.45, { m: r() < 0.3 ? M.straw : M.thatch, R: 0.6, ol: 0, n: [0, 0.4, 0.9], v: (r() - 0.3) * 0.3 });
  }
  // pajas rotas en el borde del hueco
  for (let k = 0; k < 14; k++) { const y = 50 + r() * 36, x = 297 + (y - 45) * -0.1 + r() * 30; if (gapS(x, y) > 1.5 || gapS(x, y) < -3) continue; p.cap(x, y, x + (r() - 0.5) * 6, y + 3 + r() * 5, 0.55, 0.4, { m: M.thatch, R: 0.5, ol: 0, v: r() * 0.2 }); }
  // candil de barro colgado de la viga
  p.cap(233, 91.5, 235.5, 102, 0.5, 0.5, { m: M.rope, R: 0, ol: 0, v: -0.2 });
  p.cap(242, 91.5, 239.5, 102, 0.5, 0.5, { m: M.rope, R: 0, ol: 0, v: -0.2 });
  p.ell(237.5, 104.4, 6.4, 2.8, { m: M.clay, R: 2.4 });
  p.ell(237.5, 102.4, 5.2, 1.2, { m: M.clay, R: 1, v: -0.4 });
  p.cap(242, 103, 245, 101.6, 1.5, 1, { m: M.clay, R: 1 });
  p.ell(237.5, 107.2, 2.2, 1, { m: M.clay, R: 1, v: -0.1 });
  // cántaro y cuenco (abajo a la izquierda)
  p.ell(113, 241, 7.4, 8.4, { m: M.clay, R: 6.5 });
  p.cap(113, 233, 113, 227, 3.2, 2.6, { m: M.clay, R: 2.5 });
  p.ell(113, 226.2, 3.9, 1.5, { m: M.clay, R: 1.2, v: 0.08 });
  p.dot(113, 226.2, M.clay, -0.5); p.dot(112, 226.2, M.clay, -0.5);
  p.tube([[106.6, 231], [104.6, 234], [106.8, 238]], 1, 1, { m: M.clay, R: 0.9 });
  p.crease([[106.6, 239], [119.4, 239]], -0.18); p.crease([[106, 243], [120, 243]], 0.12);
  p.ell(128, 249.5, 6, 2.6, { m: M.clay, R: 2.2, v: -0.05 });
  p.ell(128, 247.6, 4.8, 1, { m: M.clay, R: 0.6, v: -0.45 });
  // alforjas y odre (junto a la mula)
  p.ell(363, 214, 8, 8.5, { m: M.burlap, R: 6, fold: F.vfold(1.2, 0.25) });
  p.ell(374, 216, 6.5, 7.5, { m: M.weave, R: 5, v: (x, y) => (Math.floor(y / 2.5) % 2 ? -0.25 : 0.08) });
  p.cap(360, 206, 376, 208.5, 1.6, 1.6, { m: M.rope, R: 1.4 });
  p.ell(352, 220, 6, 3.6, { m: M.wood, R: 3, rot: -0.2, v: 0.08 });
  p.cap(347, 218, 344, 214.6, 1.1, 0.8, { m: M.wood, R: 1 });
  // rocas del primer plano (abajo a la izquierda) con musgo
  rockMass(p, [[-6, 236], [34, 238], [64, 246], [86, 258], [96, 272], [-6, 272]], { m: M.rock, seed: 9, n: 26, rmin: 6, rmax: 13, tilt: 0.5, moss: () => 0.5 });
  for (const [x, y] of [[70, 252], [18, 240], [92, 266], [48, 244]]) grassTuft(p, x, y, 7, r, M.moss);
  // hierbas en el primer plano derecho
  for (let k = 0; k < 9; k++) grassTuft(p, 410 + r() * 70, 262 + r() * 8, 7 + r() * 5, r);
  p.ell(452, 266, 10, 5, { m: M.rock, R: 4, n: [0, -0.5, 0.9], v: 0.05 });
}

// ---------- escena ----------
// variantes: espera (antes del nacimiento), nacimiento, pastores, reyes, final
export function buildPortal(R, variant = 'nacimiento') {
  const V = variant;
  const family = V !== 'espera', starOn = V !== 'espera', lampOn = V !== 'espera';
  const bg = new GBuf(W, H), pb = new Painter(bg);
  const info = paintBG(pb);
  const fg = new GBuf(W, H), pf = new Painter(fg);
  paintFG(pf);
  bakeCel(bg, [0.15, -0.72, 0.66], false, { texK: 0.5 }); bakeCel(fg, [0.15, -0.72, 0.66], false, { texK: 0.6 }); fg.pack();
  const maps = { shelter: new Float32Array(W * H), shad: new Float32Array(W * H), hl: new Float32Array(W * H), shadOrd: 20000 };

  // refugio: cuánto cielo ve cada punto (0 = todo, 1 = nada)
  const inside = sdPoly(chaikin([[124, 40], [404, 52], [400, 226], [392, 240], [104, 240]], 2));
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) maps.shelter[i] = clamp(0.5 - inside(x + 0.5, y + 0.5) / 16, 0, 1) * 0.92;

  // haz de la estrella (o de la luna, antes de Nochebuena) a través del hueco del techo
  const beamK = V === 'espera' ? 0.45 : V === 'final' ? 0.5 : 1;
  const beamPoly = sdPoly([[STAR.x - 2, STAR.y], [STAR.x + 2, STAR.y], [321, 89], [282, 226], [208, 226], [296, 89]]);
  const beam = new Float32Array(W * H);
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const d = beamPoly(x + 0.5, y + 0.5); if (d > 0) continue;
    beam[i] = smooth(0, 7, -d) * (y < 89 ? 0.35 : 1) * (1 - smooth(150, 232, y) * 0.55) * beamK;
    maps.hl[i] = beam[i] * 0.55;
  }
  const beamCol = V === 'espera' ? [0.55, 0.7, 1] : [1.05, 0.98, 0.8];

  const breath = (t, per, ph = 0) => ((t + ph) % per) / per < 0.45 ? 1 : 0;
  const A = o => { const d = o.draw, parse = o.parse || (() => ({})); delete o.parse; return new Actor({ ...o, draw: (p, t, k) => d(p, parse(k)) }); };
  const P = (cfg, extra = {}) => (p, st) => persona(p, { ...cfg, ...extra }, st);
  const L = [
    A({ w: 106, h: 56, ox: 43, oy: 52, x: 166, y: 216, cast: 0.18, draw: F.buey, key: t => { const h = Math.sin(t * 0.55) > 0.55 ? 1 : 0, tl = Math.sin(t * 0.9) > 0.8 ? 1 : 0, e = (t % 7.3) < 0.25 ? 1 : 0; return `${h}${tl}${e}`; }, parse: k => ({ h: +k[0], tail: +k[1], e: +k[2] }) }),
    A({ w: 100, h: 68, ox: 57, oy: 64, x: 318, y: 217, cast: 0.18, draw: F.mula, key: t => { const ear = (t % 5.1) < 0.3 ? 1 : Math.sin(t * 0.33) > 0.7 ? 2 : 0, tl = (t % 6.7) < 0.6 ? 1 : 0; return `${ear}${tl}`; }, parse: k => ({ ear: [0, 1.6, -1.2][+k[0]], tail: +k[1] }) }),
    A({ w: 56, h: 46, ox: 28, oy: 42, x: 244, y: 224, cast: 0.22, draw: (p) => F.pesebre(p, { sheet: family }) }),
  ];
  if (family) L.push(
    A({ w: 40, h: 24, ox: 21, oy: 18, x: 244, y: 193, light: [0, -0.5, 0.86], draw: F.nino, key: t => `${Math.round((Math.sin(t * 1.4) * 0.5 + 0.5) * 2)}`, parse: k => ({ a: +k }) }),
    A({ w: 64, h: 78, ox: 40, oy: 72, x: 186, y: FLOOR, cast: 0.3, light: [0.62, -0.55, 0.56], draw: F.maria, key: t => `${breath(t, 4.2)}`, parse: k => ({ b: +k }) }),
    A({ w: 70, h: 124, ox: 34, oy: 116, x: 311, y: FLOOR + 1, cast: 0.32, flip: true, light: [-0.62, -0.55, 0.56], draw: (p, st) => persona(p, { ...CAST.jose, armF: 'chest' }, st), key: t => `${breath(t, 4.9, 1.7)}`, parse: k => ({ b: +k }) }),
  );
  const visitors = V === 'pastores' || V === 'reyes';
  if (!visitors) L.push(A({ w: 36, h: 22, ox: 18, oy: 18, x: 142, y: 254, scale: 1.35, draw: F.gato, key: t => `${(t % 4.4) < 0.5 ? 1 : 0}`, parse: k => ({ tail: +k * 1.5 }) }));
  L.push(A({ w: 44, h: 28, ox: 23, oy: 24, x: 338, y: 254, draw: F.cordero, key: t => `${(t % 5.7) < 0.3 ? 1 : 0}`, parse: k => ({ e: +k }) }));
  const torches = [];
  if (V === 'pastores') {
    L.push(
      A({ w: 70, h: 120, ox: 30, oy: 104, x: 128, y: 268, scale: 1.08, draw: P(CAST.pastorCordero, { pose: 'kneel', item: { type: 'lamb' }, armN: 'pray', armF: 'pray' }), key: t => `${breath(t, 4.4)}`, parse: k => ({ b: +k }) }),
      A({ w: 50, h: 34, ox: 25, oy: 28, x: 368, y: 268, flip: true, draw: oveja, key: t => `${(t % 6) < 3 ? 1 : 0}`, parse: k => ({ g: +k }) }),
      A({ w: 70, h: 140, ox: 30, oy: 128, x: 412, y: 268, flip: true, scale: 1.06, draw: P(CAST.pastorViejo, { armF: 'chest' }), key: t => `${breath(t, 5.1, 1)}`, parse: k => ({ b: +k }) }),
      A({ w: 60, h: 120, ox: 28, oy: 106, x: 452, y: 266, flip: true, scale: 0.86, draw: P(CAST.zagal), key: t => `${breath(t, 3.6, 2)}`, parse: k => ({ b: +k }) }),
      A({ w: 44, h: 30, ox: 20, oy: 26, x: 84, y: 266, draw: perro, key: t => `${(t % 1.2) < 0.6 ? 1 : 0}`, parse: k => ({ tail: +k * 2 }) }),
    );
  }
  if (V === 'reyes') {
    L.push(
      A({ w: 80, h: 120, ox: 34, oy: 104, x: 126, y: 268, scale: 1.08, draw: P(CAST.melchor, { pose: 'kneel', lean: 0.12 }), key: t => `${breath(t, 4.6)}`, parse: k => ({ b: +k }) }),
      A({ w: 70, h: 140, ox: 30, oy: 128, x: 410, y: 268, flip: true, scale: 1.06, draw: P(CAST.gaspar), key: t => `${breath(t, 5, 1)}`, parse: k => ({ b: +k }) }),
      A({ w: 70, h: 140, ox: 30, oy: 128, x: 448, y: 262, flip: true, scale: 1.0, draw: P(CAST.baltasar), key: t => `${breath(t, 4.3, 2)}`, parse: k => ({ b: +k }) }),
    );
  }
  const doves = [
    A({ w: 16, h: 12, ox: 8, oy: 10, x: 356, y: 84, draw: F.paloma, key: t => `${(t % 2.3) < 0.35 ? 1 : 0}`, parse: k => ({ h: +k }) }),
    A({ w: 16, h: 12, ox: 8, oy: 10, x: 368, y: 84, draw: F.paloma, key: t => `${((t + 1.1) % 3.1) < 0.4 ? 1 : 0}`, parse: k => ({ h: +k }) }),
  ];
  const FGL = { fg: true };
  // las figuras de visita van delante del pórtico
  const layers = [...L.filter(a => a.y <= 256 || a.x < 300 && a.y < 262), FGL, ...L.filter(a => !(a.y <= 256 || a.x < 300 && a.y < 262)), ...doves];

  // sombras proyectadas por el candil sobre la pared y el suelo
  if (lampOn) {
    const tmp = new Float32Array(W * H);
    for (const a of L) if (a.cast) {
      const f = a.frame(0), u = f.used;
      for (let k = 0; k < u.length; k++) {
        const s = u[k], sx = s % f.w, sy = (s - sx) / f.w, X = sx + a.x - a.ox, Y = sy + a.y - a.oy;
        const tx = Math.round(X + (X - LAMP.x) * a.cast), ty = Math.round(Y + (Y - LAMP.y) * a.cast * 0.8);
        if (tx >= 0 && ty >= 0 && tx < W && ty < H) tmp[ty * W + tx] = 1;
      }
    }
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; maps.shad[i] = Math.max(tmp[i], (tmp[i - 1] + tmp[i + 1] + tmp[i - W] + tmp[i + W]) * 0.25) * 0.62; }
  }

  const stars = []; { const sr = rng(5); for (let k = 0; k < 420 && stars.length < 210; k++) { const x = (sr() * W) | 0, y = (sr() ** 1.5 * 185) | 0; if (bg.mat[y * W + x] !== M.sky) continue; stars.push([x, y, sr() ** 2.2, sr() * 6.28, sr()]); } }
  const motes = []; { const sr = rng(8); for (let k = 0; k < 34; k++) motes.push([sr(), sr(), sr() * 6.28, 0.3 + sr() * 0.7]); }
  const fgOrd = 50000, AFTER = 64000;

  function frame(t) {
    const G = R.G;
    Object.assign(R, maps);
    G.copyFrom(bg);
    let k = 0;
    for (const a of layers) {
      if (a.fg) { R.blit(fg, 0, 0, fgOrd); continue; }
      const f = a.frame(t);
      const isDove = doves.includes(a);
      R.blit(f, Math.round(a.x - (a.flip ? f.w - a.ox - 1 : a.ox)), Math.round(a.y - a.oy), isDove ? AFTER + (k++) * 200 : (a.y > 256 && !(a.x < 300 && a.y < 262) ? 55000 : 20000) + (k++) * 900, a.flip);
    }
    const fl = Math.floor(t * 12);
    const flick = 0.93 + 0.05 * (noise(fl * 0.37, 2) - 0.5) * 2 + 0.03 * (noise(fl * 1.7, 9) - 0.5);
    const pulse = 0.5 + 0.06 * Math.sin(t * 1.25);
    const lights = [];
    if (lampOn) lights.push({ x: LAMP.x + (noise(fl * 0.5, 4) - 0.5), y: LAMP.y + 2, z: 26, r: 235, i: (V === 'final' ? 0.85 : 1.04) * flick, shadow: true, inside: true });
    if (family) lights.push({ x: 236, y: 186, z: 16, r: 132, i: pulse * 1.45 });
    R.light({ moonDir: [0.52, -0.62, 0.58], moon: 0.42, amb0: 0.075, amb1: 0.06, beamDir: [0.42, -0.86, 0.3], lights });
    effects(t, fl, flick, pulse);
    R.present();
  }

  function effects(t, fl, flick, pulse) {
    const G = R.G;
    drawStars(R, stars, t);
    shootingStar(R, t);
    // haz de luz con estrías y motas
    const bd = R.img.data;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const b0 = beam[i]; if (!b0 || G.ord[i] >= fgOrd && G.ord[i] < AFTER) continue;
      const a = Math.atan2(x + 0.5 - STAR.x, y + 0.5 - STAR.y);
      const st = 0.62 + 0.38 * Math.sin(a * 140 + t * 0.7) * Math.sin(a * 37 - t * 0.4);
      const q = Math.floor(b0 * st * 4 + bayer(x, y) * 0.95 + 0.5) / 4; if (q <= 0) continue;
      const j = i * 4, s = q * 30;
      bd[j] = Math.min(255, bd[j] + s * beamCol[0]); bd[j + 1] = Math.min(255, bd[j + 1] + s * beamCol[1]); bd[j + 2] = Math.min(255, bd[j + 2] + s * beamCol[2]);
    }
    for (const m of motes) {
      const u = (m[0] + t * 0.012 * m[3]) % 1, y = 92 + u * 128;
      const xl = lerp(296, 208, (y - 89) / 137), xr = lerp(321, 282, (y - 89) / 137);
      const x = Math.round(lerp(xl, xr, (m[1] + 0.06 * Math.sin(t * 0.5 + m[2])) % 1)), yy = Math.round(y);
      const i = yy * W + x; if (G.ord[i] >= fgOrd) continue;
      const tw = (0.5 + 0.5 * Math.sin(t * 2 * m[3] + m[2])) * beamK;
      R.add(x, yy, 120 * tw * beamCol[0], 110 * tw * beamCol[1], 70 * tw * beamCol[2]);
    }
    if (starOn) bethlehemStar(R, STAR.x, STAR.y, t, V === 'final' ? { s: 0.6, tail: false } : {});
    // ventanas de Belén que parpadean
    for (const [x, y] of info.windows) { const v = noise(t * 0.8 + x, y) > 0.82; R.set(x, y, v ? [176, 90, 22] : [255, 196, 90]); R.add(x, y - 1, 30, 16, 4); }
    for (let k = 0; k < 8; k++) {
      const u = ((t * 0.25 + k / 8) % 1), x = 433 + Math.sin(u * 5 + k) * 1.5 + u * 6, y = info.gtop(433) - 18 - u * 26;
      if (bayer(x | 0, y | 0) + 0.5 < (1 - u) * 0.7) R.mix(x, y, [60, 64, 92], 0.5 * (1 - u));
    }
    // aliento del buey y de la mula en el aire frío
    for (const [nx, ny, per, ph, dir] of [[219, 190, 6.5, 0, 1], [265, 187, 7.3, 3, -1]]) {
      const u = ((t + ph) % per) / 2.2; if (u > 1) continue;
      for (let k = 0; k < 3; k++) {
        const cx = nx + dir * (u * 9 + k * 2.5), cy = ny - u * 5 - k * 1.5, rr = 1.2 + u * 2.6 - k * 0.3;
        for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
          if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > rr) continue;
          if (bayer(x, y) + 0.5 < (1 - u) * 0.6) R.mix(x, y, [196, 190, 200], 0.3);
        }
      }
    }
    if (lampOn) {
      const fx = 244.4, fy = 100;
      const hgt = 3 + (noise(fl * 0.9, 5) > 0.55 ? 1 : 0), sway = noise(fl * 0.6, 8) > 0.6 ? 1 : noise(fl * 0.6, 8) < 0.3 ? -1 : 0;
      R.glow(fx, fy - 1, 44, [255, 150, 60], 0.13 * flick, 5, (x, y) => R.shelter[y * W + x] > 0.3);
      R.glow(fx, fy - 1.5, 9, [255, 200, 120], 0.55, 3);
      R.set(fx, fy, [255, 140, 40]); R.set(fx - 1, fy, [220, 90, 20]); R.set(fx + 1, fy, [220, 90, 20]);
      for (let k = 1; k <= hgt; k++) R.set(fx + (k >= hgt - 1 ? sway : 0), fy - k, k === hgt ? [255, 250, 220] : [255, 214, 110]);
      R.set(fx, fy - 1, [255, 246, 200]);
    }
    if (family) {
      R.glow(232.4, 187.6, 19, [255, 214, 130], 0.26 + (pulse - 0.5) * 1.2, 5);
      R.glow(232.4, 187.6, 8, [255, 240, 190], 0.25, 3);
    }
    if (V === 'reyes') {
      // incienso del incensario de Gaspar
      for (let k = 0; k < 10; k++) { const u = ((t * 0.18 + k / 10) % 1), x = 392 + Math.sin(u * 6 + k) * 2.5 - u * 8, y = 196 - u * 40; if (bayer(x | 0, y | 0) + 0.5 < (1 - u) * 0.8) R.mix(x, y, [190, 184, 200], 0.35 * (1 - u)); }
    }
  }

  return { frame, layers };
}
