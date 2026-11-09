// Belén: una calle con la posada. Variantes: censo (atardecer), posadas (Nochebuena), cabalgata (5 de enero).
import { W, H, M, noise, fbm, rng, bayer } from '../engine.js';
import { Stage, LIGHT } from '../stage.js';
import { persona } from '../people.js';
import { CAST } from '../cast.js';
import { mulaPie, camello } from '../animals.js';
import { perro } from '../animals.js';
import * as E from '../env.js';

const GY = 232;

export function buildBelen(R, V = 'posadas') {
  const time = V === 'censo' ? 'dusk' : 'night', night = time === 'night';
  const S = new Stage(R), p = S.p, r = rng(41);
  const far = n => M[(n === 1 ? 'far1' : 'far2') + (night ? '' : time)];
  E.sky(p, time, W, H, { horizon: 180, sunX: 60, mx: 330 });
  if (!night) E.clouds(p, r, 4, 30, 100, W, { m: M.clouddusk });
  E.ridge(p, x => 150 + 8 * Math.sin(x * 0.02), far(1), -4, W + 4, 250, { base: 0.45 });
  // tejados del fondo
  const lit = [];
  for (let k = 0; k < 22; k++) { const x = -10 + k * 23 + r() * 8; lit.push(...E.house(p, { x, y: 166 + r() * 6, w: 18 + r() * 10, ht: 12 + r() * 16, side: 4, base: false, windows: [{ x: 4, y: 4, w: 2, h: 3, lit: night && r() < 0.5 ? 0.7 : 0 }] })); }
  for (let k = 0; k < 4; k++) E.palm(p, 40 + r() * 400, 170, 30 + r() * 12, r, { s: 0.8 });
  // suelo empedrado
  p.poly([[-4, 206], [W + 4, 206], [W + 4, 272], [-4, 272]], { m: M.stone, R: 0, n: [0, -0.8, 0.6], ol: 1, v: (x, y) => (noise(x * 0.3, y * 0.6) - 0.5) * 0.2 - 0.1 });
  for (let k = 0; k < 380; k++) { const x = r() * W, y = 206 + r() ** 0.8 * 66, s = 1.4 + (y - 206) * 0.04; p.ell(x, y, s * 1.5, s, { m: M.stone, R: s, n: [0, -0.5, 0.85], v: (r() - 0.5) * 0.2, ol: 1 }); }
  // fachadas principales
  lit.push(...E.house(p, { x: -6, y: 208, w: 96, ht: 70, side: 0, m: M.plaster, beams: true, door: { x: 30, w: 14, h: 26, arch: true, open: night, glow: night ? 0.5 : 0 }, windows: [{ x: 10, y: 14, w: 7, h: 8, lit: night ? 0.7 : 0 }, { x: 64, y: 14, w: 7, h: 8, lit: night ? 0.75 : 0 }], awning: { x: 56, y: 32, w: 28, m: M.teal } }));
  // la posada: dos plantas con balcón y cartel
  const px0 = 120, pw = 160;
  lit.push(...E.house(p, { x: px0, y: 210, w: pw, ht: 96, side: 0, m: M.stone, beams: true, door: { x: 70, w: 20, h: 32, arch: true, open: V === 'posadas', glow: V === 'posadas' ? 0.7 : 0 },
    windows: [{ x: 14, y: 16, w: 8, h: 10, lit: night ? 0.8 : 0 }, { x: 40, y: 16, w: 8, h: 10, lit: night ? 0.65 : 0 }, { x: 112, y: 16, w: 8, h: 10, lit: night ? 0.75 : 0 }, { x: 138, y: 16, w: 8, h: 10, lit: night ? 0.8 : 0 }, { x: 22, y: 52, w: 9, h: 9, lit: night ? 0.7 : 0 }, { x: 128, y: 52, w: 9, h: 9, lit: night ? 0.7 : 0 }] }));
  p.poly([[px0 + 8, 146], [px0 + pw - 8, 146], [px0 + pw - 8, 149], [px0 + 8, 149]], { m: M.wood, R: 1, v: 0.1 });
  for (let x = px0 + 10; x < px0 + pw - 8; x += 6) p.cap(x, 140, x, 146, 0.7, 0.7, { m: M.wood, R: 0.6 });
  p.cap(px0 + 8, 140, px0 + pw - 8, 140, 0.9, 0.9, { m: M.wood, R: 0.8 });
  // cartel colgante con un cántaro pintado
  p.cap(px0 + 62, 166, px0 + 98, 166, 0.9, 0.9, { m: M.wood, R: 0.8 });
  p.poly([[px0 + 68, 168], [px0 + 92, 168], [px0 + 92, 178], [px0 + 68, 178]], { m: M.wood, R: 1.2, v: 0.15 });
  p.ell(px0 + 80, 173, 3, 3.4, { m: M.clay, R: 0, v: 0.3, ol: 0 });
  // casa de la derecha con escalera y gente en la azotea
  lit.push(...E.house(p, { x: 330, y: 208, w: 156, ht: 64, side: 0, m: M.plaster, beams: true, stairs: 'left', door: { x: 60, w: 14, h: 26, open: night, glow: night ? 0.45 : 0 }, windows: [{ x: 26, y: 12, w: 7, h: 8, lit: night ? 0.7 : 0 }, { x: 110, y: 12, w: 7, h: 8, lit: night ? 0.6 : 0 }] }));
  E.palm(p, 300, 212, 54, r, { s: 1, dates: true, lean: -4 });
  // antorchas en los muros
  const torches = [[px0 + 4, 168], [px0 + pw - 4, 168], [92, 172], [328, 170]];
  for (const [x, y] of torches) { p.cap(x, y, x, y + 10, 1, 1, { m: M.wood, R: 1 }); p.poly([[x - 3, y + 8], [x + 3, y + 8], [x + 2, y + 10], [x - 2, y + 10]], { m: M.metal, R: 0.5 }); }
  // cántaros junto a la puerta de la posada
  for (const [x, s] of [[px0 + 54, 1], [px0 + 106, 0.9], [px0 + 116, 0.7]]) { p.ell(x, 204, 5 * s, 6 * s, { m: M.clay, R: 4 }); p.cap(x, 198 - s * 2, x, 196 - s * 2, 2 * s, 1.8 * s, { m: M.clay, R: 1.2 }); }
  Object.assign(S.light, LIGHT[time]);
  if (!night) { S.light.moonDir = [-0.8, -0.32, 0.5]; S.light.moon = 0.72; }
  const breath = (t, per, ph = 0) => ((t + ph) % per) / per < 0.45 ? 1 : 0;
  const P = (cfg) => (p2, t, k) => persona(p2, cfg, { b: +k });
  const mulaMaria = (x, y, flip) => S.add({ w: 150, h: 150, ox: 66, oy: 124, x, y, flip, scale: 0.9, key: t => `${breath(t, 4)}`, draw: (p2, t, k) => {
    const ms = 0.9 * 1.3; p2.s = ms; const res = mulaPie(p2, { ear: +k }, { bags: false }); p2.s = 0.9;
    const ox = p2.ox, oy = p2.oy; p2.ox += res.saddle[0] * ms - 2; p2.oy += res.saddle[1] * ms + 12; persona(p2, { ...CAST.maria, pose: 'side', armN: 'hold', armF: 'hold' }, { b: +k }); p2.ox = ox; p2.oy = oy;
  } });
  const torchLights = [];
  if (V === 'censo') {
    // mesa del escriba romano bajo un toldo
    p.poly([[330, 196], [410, 196], [414, 202], [326, 202]], { m: M.wood, R: 1.5, v: 0.08 });
    for (const lx of [332, 408]) p.cap(lx, 202, lx, 220, 1.5, 1.5, { m: M.wood, R: 1.2 });
    p.poly([[324, 150], [416, 150], [420, 158], [320, 158]], { m: M.red, R: 2, v: (x) => (Math.floor(x / 8) % 2 ? -0.15 : 0.06) });
    for (const ax of [322, 418]) p.cap(ax, 158, ax, 214, 1, 1, { m: M.wood, R: 0.8 });
    p.cap(350, 192, 362, 192, 2, 2, { m: M.cream, R: 1.6 });
    S.add({ w: 80, h: 140, ox: 34, oy: 124, x: 378, y: 222, flip: true, scale: 0.9, key: t => `${Math.floor(t * 2) % 2}`, draw: (p2, t, k) => persona(p2, { ...CAST.heraldo, pose: 'kneel', armN: +k ? 'hold' : 'offer', item: {} }, {}) });
    S.add({ w: 80, h: 150, ox: 34, oy: 134, x: 430, y: GY, flip: true, key: t => `${breath(t, 5)}`, draw: P(CAST.soldado) });
    const q = [['pastorViejo', 300, 0.95], ['aldeana', 272, 0.9], ['posadero', 246, 0.96], ['pastor', 220, 0.95]];
    for (const [c, x, s] of q) S.add({ w: 80, h: 150, ox: 34, oy: 134, x, y: GY + 2, scale: s, key: t => `${breath(t, 4 + x % 3, x)}`, draw: P({ ...CAST[c], item: c === 'aldeana' ? { type: 'jar' } : CAST[c].item, armN: c === 'aldeana' ? 'up' : CAST[c].armN }) });
    mulaMaria(110, GY + 14, false);
    S.add({ w: 80, h: 140, ox: 34, oy: 124, x: 168, y: GY + 16, scale: 0.94, key: t => `${breath(t, 4.6)}`, draw: P(CAST.jose) });
  }
  if (V === 'posadas') {
    S.add({ w: 80, h: 140, ox: 34, oy: 124, x: 182, y: GY - 6, scale: 0.94, key: t => `${Math.floor(t * 2.5) % 3 === 0 ? 1 : 0}`, draw: (p2, t, k) => persona(p2, { ...CAST.jose, armN: +k ? 'forward' : 'staff' }, {}) });
    S.add({ w: 80, h: 140, ox: 34, oy: 124, x: 214, y: GY - 10, flip: true, scale: 0.9, key: t => `${Math.floor(t * 1.2) % 2}`, draw: (p2, t, k) => persona(p2, { ...CAST.posadero, armN: +k ? 'open' : 'forward' }, {}) });
    mulaMaria(96, GY + 18, false);
    S.add({ w: 44, h: 30, ox: 20, oy: 26, x: 388, y: 250, flip: true, key: t => `${(t % 1.5) < 0.5 ? 1 : 0}`, draw: (p2, t, k) => perro(p2, { tail: +k * 2 }) });
    S.lantern = [214 - 15, GY - 10 - 54];
    torchLights.push(t => ({ x: S.lantern[0], y: S.lantern[1], z: 16, r: 90, i: 0.7 }));
  }
  if (V === 'cabalgata') {
    const kings = [['melchor', M.red], ['gaspar', M.teal], ['baltasar', M.purple]];
    kings.forEach(([k, cloth], i) => S.add({ w: 150, h: 190, ox: 70, oy: 170, x: 150 + i * 120, y: GY + 10 + (i % 2) * 6, scale: 0.6, key: t => `${Math.floor(t * 2 + i) % 2}`, draw: (p2, t, kk) => {
      const cs = 0.6 * 1.22; p2.s = cs; const res = camello(p2, { w: -1 }, { cloth, packs: true }); p2.s = 0.6;
      const ox = p2.ox, oy = p2.oy; p2.ox += res.saddle[0] * cs; p2.oy += res.saddle[1] * cs + 8; persona(p2, { ...CAST[k], pose: 'ride', armN: +kk ? 'up' : 'reins', item: {} }, {}); p2.ox = ox; p2.oy = oy;
    } }));
    for (const [x, y, f] of [[96, GY + 22, false], [470, GY + 18, true], [228, GY + 30, false]]) {
      S.add({ w: 60, h: 90, ox: 26, oy: 80, x, y, flip: f, scale: 0.66, key: t => `${breath(t, 3 + x % 2, x)}`, draw: P(CAST.paje) });
      torchLights.push(t => ({ x: x + (f ? -8 : 8), y: y - 58, z: 18, r: 110, i: 0.75 * (0.9 + 0.1 * noise(Math.floor(t * 12) * 0.5, x)) }));
      (S.torches ||= []).push([x + (f ? -8 : 8), y - 59]);
    }
    // vecinos mirando desde las azoteas
    for (const [x, y, c] of [[30, 138, 'aldeana'], [60, 138, 'zagal'], [360, 144, 'pastorViejo'], [420, 144, 'aldeana']]) S.add({ w: 60, h: 100, ox: 26, oy: 90, x, y, scale: 0.5, flip: x > 200, key: t => `${Math.floor(t * 1.5 + x) % 2}`, draw: (p2, t, k) => persona(p2, { ...CAST[c], armN: +k ? 'up' : 'down', item: {} }, {}) });
  }
  S.done();
  S.lightsFn = t => [...torches.map(([x, y], i) => ({ x, y: y + 4, z: 16, r: 120, i: (night ? 0.75 : 0.3) * (0.9 + 0.1 * noise(Math.floor(t * 12) * 0.4, i)) })), ...torchLights.map(f => f(t))];
  const stars = night ? E.makeStars(S.bg, 200, 6) : [];
  S.fx = t => {
    if (stars.length) E.drawStars(R, stars, t);
    if (V === 'cabalgata') E.bethlehemStar(R, 300, 30, t, { tail: false, s: 1.1 });
    else if (night) { R.glow(420, 34, 22, [200, 210, 255], 0.25, 5); for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36 && (x + 2) * (x + 2) + (y - 1) * (y - 1) > 26) R.set(420 + x, 34 + y, [236, 232, 214]); }
    for (const [x, y] of torches) E.flames(R, x, y + 7, 0.55, t, { big: night });
    for (const [x, y] of S.torches || []) E.flames(R, x, y, 0.45, t, { big: true });
    if (S.lantern) R.glow(S.lantern[0], S.lantern[1] + 6, 10, [255, 190, 90], 0.45, 3);
    for (const [x, y, w, h] of lit) if (noise(t * 0.6 + x, y) > 0.86) for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) R.mix(x + xx, y + yy, [140, 70, 20], 0.5);
  };
  S.focus = V === 'posadas' ? 0.4 : 0.5;
  return S;
}
