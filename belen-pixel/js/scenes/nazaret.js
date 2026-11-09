// Nazaret: la casa de María, el pozo y el taller de José. Variantes: anunciacion, taller, edicto, partida, noche.
import { W, H, M, noise, fbm, clamp, lerp, smooth, rng, bayer, sdPoly, chaikin } from '../engine.js';
import { Stage, LIGHT } from '../stage.js';
import { persona, angel } from '../people.js';
import { CAST } from '../cast.js';
import { mulaPie } from '../animals.js';
import { paloma, gato } from '../figures.js';
import * as E from '../env.js';

const GY = 226;
const TIMES = { anunciacion: 'dusk', taller: 'day', edicto: 'day', partida: 'dawn', noche: 'night' };

function paint(S, time, V) {
  const p = S.p, r = rng(21), night = time === 'night';
  const far = n => M[(n === 1 ? 'far1' : 'far2') + (night ? '' : time)];
  E.sky(p, time, W, H, { horizon: 190, sunX: time === 'dusk' ? 80 : 420, mx: 200 });
  if (time === 'day') E.clouds(p, r, 5, 20, 90);
  if (time === 'dusk' || time === 'dawn') { E.clouds(p, r, 4, 40, 110, W, { m: M.clouddusk }); }
  if (time === 'dawn') { p.circ(430, 150, 12, { m: M.fire, R: 0, ol: 0, v: 0.9 }); }
  // colinas de Galilea
  E.ridge(p, x => 146 + 10 * Math.sin(x * 0.012) + 8 * fbm(x * 0.01, 1), far(1), -4, W + 4, 250, { base: 0.5, grad: 0.006 });
  E.ridge(p, x => 166 + 8 * Math.sin(x * 0.02 + 1) + 6 * fbm(x * 0.02, 2), far(2), -4, W + 4, 250, { base: 0.5, grad: 0.01 });
  // ladera con el pueblo detrás
  E.ridge(p, x => 178 - 14 * Math.exp(-(((x - 300) / 140) ** 2)) + 4 * fbm(x * 0.03, 3), M.grass, -4, W + 4, 250, { n: [0, -0.6, 0.8], base: -0.05, grad: 0.004 });
  const lit = [];
  for (let k = 0; k < 16; k++) {
    const x = 160 + k * 18 + r() * 6, y = 182 - 10 * Math.exp(-(((x - 300) / 120) ** 2)) + r() * 5;
    lit.push(...E.house(p, { x, y, w: 10 + r() * 6, ht: 8 + r() * 6, side: 3, base: false, windows: [{ x: 3, y: 3, w: 2, h: 2, lit: night && r() < 0.5 ? 0.7 : 0 }] }));
  }
  for (let k = 0; k < 8; k++) E.cypress(p, 150 + r() * 320, 186 + r() * 6, 14 + r() * 10);
  for (let k = 0; k < 10; k++) E.olive(p, r() * W, 190 + r() * 8, 0.35 + r() * 0.15, r);
  // suelo de tierra batida
  E.ridge(p, x => 204 + 2 * Math.sin(x * 0.05), M.dirt, -4, W + 4, 272, { n: [0, -0.75, 0.65], v: (x, y) => (fbm(x * 0.06, y * 0.12) - 0.5) * 0.3 + (noise(x * 0.9, y * 1.8) - 0.5) * 0.1 });
  E.stones(p, 60, r, rr => [rr() * W, 208 + rr() * 60]);
  for (let k = 0; k < 24; k++) E.grassTuft(p, r() * W, 210 + r() * 60, 4 + r() * 5, r);
  // casa de María (izquierda)
  lit.push(...E.house(p, { x: 14, y: 214, w: 118, ht: 66, side: 10, m: M.plaster, beams: true, stairs: 'right',
    door: { x: 66, w: 18, h: 34, arch: true, open: true, glow: night ? 0.6 : 0 },
    windows: [{ x: 18, y: 14, w: 8, h: 9, lit: night ? 0.75 : 0 }, { x: 96, y: 14, w: 7, h: 8, lit: night ? 0.6 : 0 }],
    awning: { x: 14, y: 30, w: 30, m: M.weave } }));
  // grietas, manchas de humedad y cosas en la azotea
  for (const c of [[[30, 160], [34, 170], [32, 182]], [[118, 156], [114, 168]], [[52, 190], [60, 196]]]) p.crease(c, -0.25);
  for (const [x, s] of [[30, 1], [44, 0.8], [120, 1]]) { p.ell(x, 145, 3.4 * s, 3.8 * s, { m: M.clay, R: 2.6 }); }
  p.poly([[60, 140], [100, 140], [98, 147], [62, 147]], { m: M.cream, R: 1, v: (x) => (Math.floor(x / 4) % 2 ? 0.05 : -0.1), fold: (x, y) => [0, Math.sin(x * 0.8) * 0.4] });
  p.cap(58, 139.5, 102, 139.5, 0.4, 0.4, { m: M.rope, R: 0, ol: 0 });
  // macetas, cántaros y una parra sobre la puerta
  for (const [x, s] of [[56, 1], [92, 0.8], [104, 1.1]]) { p.ell(x, 210, 4 * s, 4.5 * s, { m: M.clay, R: 3 }); E.bush(p, x, 205, 3.5 * s, r, M.leaf); }
  p.ell(36, 208, 5, 6.5, { m: M.clay, R: 4.5 }); p.cap(36, 202, 36, 199, 2.4, 2, { m: M.clay, R: 1.5 });
  for (let k = 0; k < 40; k++) { const x = 58 + r() * 34, y = 140 + r() * 10; p.ell(x, y, 2.4, 1.8, { m: M.leaf, R: 1.6, ol: 1, v: r() * 0.2 }); }
  p.tube([[52, 214], [53, 180], [56, 150], [70, 142], [92, 144]], 1.3, 0.8, { m: M.trunk, R: 1 });
  // pozo en el centro
  const wx = 236;
  p.ell(wx, 216, 22, 6, { m: M.stone, R: 3, n: [0, -0.7, 0.7], v: 0.05 });
  p.poly([[wx - 20, 216], [wx + 20, 216], [wx + 20, 202], [wx - 20, 202]], { m: M.stone, R: 2, v: (x, y) => (noise(x * 0.5, y * 0.7) - 0.5) * 0.25 + (Math.floor(y / 4) % 2 ? 0 : -0.06) });
  for (let y = 205; y < 216; y += 4) p.crease([[wx - 20, y], [wx + 20, y]], -0.2);
  p.ell(wx, 202, 20, 4.5, { m: M.stone, R: 2, n: [0, -0.8, 0.6], v: 0.12 });
  p.ell(wx, 202, 15, 2.8, { m: M.ink, R: 0, v: 0.1 });
  for (const s2 of [-1, 1]) p.cap(wx + s2 * 16, 202, wx + s2 * 16, 170, 1.6, 1.4, { m: M.wood, R: 1.4 });
  p.cap(wx - 18, 171, wx + 18, 171, 1.5, 1.5, { m: M.wood, R: 1.4 });
  p.cap(wx, 172, wx, 186, 0.4, 0.4, { m: M.rope, R: 0, ol: 0 });
  p.poly([[wx - 3, 186], [wx + 3, 186], [wx + 2.5, 192], [wx - 2.5, 192]], { m: M.wood, R: 1 });
  // olivo grande junto al pozo
  E.olive(p, 300, 212, 1.05, r);
  // taller de José (derecha): cobertizo abierto
  const sx = 340;
  E.house(p, { x: sx + 70, y: 214, w: 66, ht: 70, side: 0, m: M.stone, beams: true, windows: [{ x: 20, y: 18, w: 6, h: 7, lit: night ? 0.6 : 0 }] });
  for (const px of [sx, sx + 70]) p.tube([[px, 214], [px + 1, 150]], 2.6, 2.2, { m: M.wood, R: 2.4, v: (x, y) => (noise(x, y * 0.1) - 0.5) * 0.3 });
  p.poly([[sx - 8, 150], [sx + 76, 146], [sx + 76, 141], [sx - 8, 145]], { m: M.wood, R: 1.6 });
  for (let x = sx - 10; x < sx + 78; x += 1.6 + r()) p.cap(x, 144 + (x - sx) * -0.05, x + (r() - 0.5) * 3, 150 + r() * 6, 0.7, 0.5, { m: M.palm, R: 0.6, ol: 0, v: r() * 0.25 - 0.1 });
  p.poly([[sx + 2, 214], [sx + 68, 214], [sx + 68, 152], [sx + 2, 152]], { m: M.wall, R: 0, n: [0, 0, 1], v: -0.15, ol: 1 });
  // herramientas colgadas y tablones
  for (const [tx, ty, kind] of [[sx + 14, 166, 'saw'], [sx + 28, 164, 'adze'], [sx + 40, 166, 'mallet'], [sx + 54, 165, 'square']]) {
    if (kind === 'saw') { p.poly([[tx - 1, ty], [tx + 2, ty], [tx + 2, ty + 14], [tx - 1, ty + 14]], { m: M.metal, R: 0.5 }); p.cap(tx, ty - 2, tx + 1, ty + 1, 1.4, 1.4, { m: M.wood, R: 1 }); }
    if (kind === 'adze') { p.cap(tx, ty, tx, ty + 12, 0.8, 0.8, { m: M.wood, R: 0.7 }); p.poly([[tx - 3, ty + 11], [tx + 1, ty + 11], [tx + 1, ty + 14], [tx - 3, ty + 13]], { m: M.metal, R: 0.5 }); }
    if (kind === 'mallet') { p.cap(tx, ty, tx, ty + 10, 0.8, 0.8, { m: M.wood, R: 0.7 }); p.ell(tx, ty + 12, 3, 2.2, { m: M.wood, R: 1.5, v: 0.1 }); }
    if (kind === 'square') { p.poly([[tx, ty], [tx + 1.4, ty], [tx + 1.4, ty + 12], [tx, ty + 12]], { m: M.wood, R: 0, v: 0.2 }); p.poly([[tx, ty + 10.6], [tx + 8, ty + 10.6], [tx + 8, ty + 12], [tx, ty + 12]], { m: M.wood, R: 0, v: 0.2 }); }
  }
  for (let k = 0; k < 5; k++) p.cap(sx + 60 + k * 2.4, 213, sx + 54 + k * 3, 168, 1.4, 1.3, { m: M.wood, R: 1.2, v: 0.05 + k * 0.03 });
  // banco de carpintero
  p.poly([[sx + 10, 196], [sx + 52, 196], [sx + 52, 200], [sx + 10, 200]], { m: M.wood, R: 1.6, v: 0.12 });
  for (const lx of [sx + 13, sx + 48]) p.cap(lx, 200, lx, 214, 1.4, 1.4, { m: M.wood, R: 1.2 });
  p.poly([[sx + 18, 192], [sx + 44, 192], [sx + 44, 196], [sx + 18, 196]], { m: M.wood, R: 1, v: 0.25 });
  for (let k = 0; k < 26; k++) { const x = sx + 6 + r() * 56, y = 210 + r() * 6; p.ell(x, y, 1.4, 0.7, { m: M.straw, R: 0.6, ol: 0, v: 0.2 + r() * 0.2 }); }
  // muro bajo en primer plano
  const fp = S.fgPainter();
  for (const [a, b] of [[-6, 150], [330, W + 6]]) fp.poly([[a, 258], [b, 258], [b, 272], [a, 272]], { m: M.stone, R: 2, n: [0, -0.2, 1], v: (x, y) => (noise(x * 0.4, y * 0.5) - 0.5) * 0.25 - 0.08 });
  for (let x = -4; x < W + 6; x += 6 + r() * 3) {
    if (x > 150 && x < 330) continue;
    fp.ell(x, 262, 5 + r() * 2, 4 + r(), { m: M.stone, R: 3, n: [0, -0.3, 1], v: r() * 0.1 - 0.05 });
    fp.ell(x + 3, 255, 4.4 + r() * 2, 3.4 + r(), { m: M.stone, R: 3, n: [0, -0.3, 1], v: r() * 0.12 });
  }
  for (let k = 0; k < 10; k++) E.grassTuft(fp, r() * W, 252 + r() * 6, 6 + r() * 4, r);
  for (const x of [20, 120, 440]) E.bush(fp, x, 252, 6, r, M.leaf);
  return { lit };
}

export function buildNazaret(R, V = 'noche') {
  const time = TIMES[V] || 'night', S = new Stage(R);
  const info = paint(S, time, V);
  Object.assign(S.light, LIGHT[time]);
  if (time === 'dusk') { S.light.moonDir = [-0.8, -0.32, 0.5]; S.light.moon = 0.78; }
  const breath = (t, per, ph = 0) => ((t + ph) % per) / per < 0.45 ? 1 : 0;
  const P = (cfg, st) => (p, t, k) => persona(p, cfg, st ? st(k) : { b: +k });
  const lights = [];
  const fx = [];
  if (V === 'anunciacion') {
    S.add({ w: 80, h: 120, ox: 34, oy: 104, x: 92, y: GY + 4, key: t => `${breath(t, 4.4)}`, draw: P({ ...CAST.maria, pose: 'kneel', armN: 'chest', armF: 'chest', mantle: null, lean: 0.06 }) });
    S.add({ w: 110, h: 130, ox: 50, oy: 112, x: 196, y: 196, flip: true, key: t => `${Math.floor(t * 4) % 3}`, pos: t => [196, 196 + Math.sin(t * 1.2) * 2.5], draw: (p, t, k) => angel(p, { f: +k, s: 0 }, { arm: 'open', item: {}, lily: true }) });
    S.dove = true;
    lights.push(t => ({ x: 176, y: 140, z: 30, r: 170, i: 0.85 + 0.05 * Math.sin(t * 2) }));
  }
  if (V === 'taller') {
    S.add({ w: 80, h: 130, ox: 34, oy: 116, x: 404, y: GY - 6, flip: true, key: t => `${Math.floor(t * 3) % 2}`, draw: (p, t, k) => persona(p, { ...CAST.jose, mantle: null, armN: +k ? 'forward' : 'offer', armF: +k ? 'forward' : 'offer', item: {}, lean: 0.12 }, {}) });
    S.add({ w: 80, h: 120, ox: 34, oy: 104, x: 166, y: GY + 4, key: t => `${breath(t, 4)}`, draw: P({ ...CAST.maria, pose: 'kneel', armN: 'hold', armF: 'hold', mantle: null }) });
    S.add({ w: 18, h: 14, ox: 9, oy: 11, x: 60, y: 129, flip: true, key: t => `${(t % 2.5) < 0.4 ? 1 : 0}`, draw: (p, t, k) => paloma(p, { h: +k }) });
    S.hens = [[270, 236], [292, 240]];
  }
  if (V === 'edicto') {
    S.add({ w: 80, h: 140, ox: 34, oy: 126, x: 214, y: 238, key: t => `${breath(t, 3.8)}`, draw: P(CAST.heraldo) });
    S.add({ w: 80, h: 150, ox: 34, oy: 134, x: 262, y: 240, flip: true, key: t => `${breath(t, 5)}`, draw: P(CAST.soldado) });
    const crowd = [['jose', 140, 254, false, 1], ['maria', 166, 256, false, 0.96], ['aldeana', 110, 250, false, 0.9], ['pastorViejo', 320, 254, true, 1], ['zagal', 350, 256, true, 0.75], ['posadero', 384, 252, true, 0.95]];
    for (const [c, x, y, flip, s] of crowd) S.add({ w: 80, h: 150, ox: 34, oy: 134, x, y, flip, scale: s, key: t => `${breath(t, 4 + x % 3, x)}`, draw: P({ ...CAST[c], ...(c === 'maria' ? { mantle: null } : {}) }) });
  }
  if (V === 'partida') {
    S.add({ w: 150, h: 150, ox: 66, oy: 124, x: 236, y: GY + 10, scale: 0.92, key: t => `${breath(t, 4)}`, draw: (p, t, k) => {
      const ms = 0.92 * 1.3; p.s = ms; const res = mulaPie(p, { ear: +k }, { bags: true }); p.s = 0.92;
      const ox = p.ox, oy = p.oy; p.ox += res.saddle[0] * ms - 2; p.oy += res.saddle[1] * ms + 12; persona(p, { ...CAST.maria, pose: 'side', armN: 'hold', armF: 'hold' }, { b: +k }); p.ox = ox; p.oy = oy;
    } });
    S.add({ w: 80, h: 140, ox: 34, oy: 124, x: 318, y: GY + 12, scale: 0.92, key: t => `${breath(t, 4.6)}`, draw: P(CAST.jose) });
    S.add({ w: 80, h: 140, ox: 34, oy: 124, x: 100, y: GY - 4, scale: 0.86, key: t => `${Math.floor(t * 3) % 2}`, draw: (p, t, k) => persona(p, { ...CAST.aldeana, armN: +k ? 'up' : 'open', item: {} }, {}) });
  }
  if (V === 'noche') {
    S.add({ w: 36, h: 22, ox: 18, oy: 18, x: 300, y: 250, scale: 1.2, key: t => `${(t % 4.4) < 0.5 ? 1 : 0}`, draw: (p, t, k) => gato(p, { tail: +k * 1.5 }) });
    lights.push(() => ({ x: 89, y: 196, z: 20, r: 70, i: 0.5 }));
  }
  S.addFG();
  S.done();
  S.lightsFn = t => lights.map(f => f(t));
  const stars = time === 'night' ? E.makeStars(S.bg, 200, 4) : [];
  S.fx = t => {
    if (stars.length) { E.drawStars(R, stars, t); E.shootingStar(R, t, M.sky, 19); R.glow(410, 36, 22, [200, 210, 255], 0.25, 5); for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36 && (x + 2) * (x + 2) + (y - 1) * (y - 1) > 26) R.set(410 + x, 36 + y, [236, 232, 214]); }
    for (const [x, y, w, h] of info.lit) if (noise(t * 0.7 + x, y) > 0.85) for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) R.mix(x + xx, y + yy, [140, 70, 20], 0.5);
    if (time === 'night') { E.smoke(R, 120, 128, t, 9); for (const [x, y, w, h] of info.lit) R.glow(x + w / 2, y + h / 2, 7, [255, 170, 80], 0.2, 3); }
    if (V === 'anunciacion') {
      // rayos de luz celestial y la paloma del Espíritu
      const d = R.img.data;
      for (let y = 0; y < 230; y++) for (let x = 60; x < 300; x++) {
        const u = (x - 230) - (y - 0) * -0.55; if (u < -70 || u > 40) continue;
        const st = Math.sin(u * 0.35 + t * 0.6) * 0.5 + 0.5, q = Math.floor((0.25 + 0.35 * st) * (1 - y / 260) * 3 + bayer(x, y) + 0.5) / 3; if (q <= 0) continue;
        const j = (y * W + x) * 4; d[j] = Math.min(255, d[j] + 34 * q); d[j + 1] = Math.min(255, d[j + 1] + 30 * q); d[j + 2] = Math.min(255, d[j + 2] + 20 * q);
      }
      const dx = 150 + Math.sin(t * 0.8) * 6, dy = 92 + Math.sin(t * 1.6) * 3, fl = Math.floor(t * 8) % 2;
      R.glow(dx, dy, 18, [255, 240, 200], 0.35, 4);
      const dove = [[0, 0], [1, 0], [-1, 0], [2, -1], [-2, fl ? -2 : 1], [-3, fl ? -3 : 2], [3, fl ? -2 : 1], [4, fl ? -3 : 2], [0, 1], [1, 1], [-1, 1], [2, 0], [-2, 0]];
      for (const [x, y] of dove) R.set(dx + x, dy + y, [255, 252, 240]);
      R.glow(196, 120, 30, [255, 240, 200], 0.3, 5);
    }
    if (S.hens) S.hens.forEach(([x, y], i) => { const pk = Math.floor(t * 2 + i) % 3 === 0; const c1 = [200, 120, 60], c2 = [150, 80, 40]; for (let k = -2; k <= 2; k++) R.set(x + k, y - 2, c1); for (let k = -2; k <= 1; k++) R.set(x + k, y - 3, c1); R.set(x + 2, y - (pk ? 1 : 4), c2); R.set(x + 3, y - (pk ? 1 : 4), [220, 60, 40]); R.set(x - 1, y, c2); R.set(x + 1, y, c2); R.set(x - 3, y - 4, c2); });
  };
  S.focus = V === 'taller' ? 0.75 : V === 'anunciacion' ? 0.3 : 0.5;
  return S;
}
