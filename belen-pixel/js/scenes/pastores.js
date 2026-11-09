// El campo de los pastores junto a la Torre del Rebaño. Variantes: vela (noche tranquila), gloria (anuncio de los ángeles).
import { W, H, M, noise, fbm, rng, bayer, lerp } from '../engine.js';
import { Stage, LIGHT } from '../stage.js';
import { persona, angel } from '../people.js';
import { CAST } from '../cast.js';
import { oveja, perro } from '../animals.js';
import * as E from '../env.js';

export function buildPastores(R, V = 'vela') {
  const S = new Stage(R), p = S.p, r = rng(51), gloria = V === 'gloria';
  E.sky(p, 'night', W, H, { horizon: 190, mx: 380 });
  E.ridge(p, x => 160 + 10 * Math.sin(x * 0.015 + 1) + 6 * fbm(x * 0.02, 4), M.far1, -4, W + 4, 250, { base: 0.42 });
  // Belén a lo lejos sobre su colina
  const hill = x => 170 - 16 * Math.exp(-(((x - 390) / 60) ** 2));
  E.ridge(p, hill, M.far2, 300, W + 4, 250, { base: 0.45 });
  const lit = [];
  for (let k = 0; k < 14; k++) { const x = 350 + k * 6 + r() * 3, h = 4 + r() * 5, y = hill(x) + 5; p.poly([[x, y - h], [x + 5, y - h], [x + 5, y], [x, y]], { m: M.town, R: 0, n: [0, 0, 1], v: -0.04 + r() * 0.08, ol: 1 }); if (r() < 0.5) { p.pix(x + 2, y - h + 2, M.window, { v: 0.7 }); lit.push([x + 2, y - h + 2]); } }
  // ladera de los pastores
  E.ridge(p, x => 186 + 8 * Math.sin(x * 0.02) + 4 * fbm(x * 0.05, 1), M.grass, -4, W + 4, 272, { n: [0, -0.7, 0.7], base: -0.08, grad: 0.002 });
  // Torre del Rebaño (Migdal Eder)
  const tx = 70;
  p.poly([[tx - 16, 196], [tx + 16, 196], [tx + 13, 120], [tx - 13, 120]], { m: M.stone, R: 2, v: (x, y) => (noise(x * 0.5, y * 0.5) - 0.5) * 0.25 + (Math.floor(y / 5) % 2 ? -0.04 : 0.02) });
  for (let y = 124; y < 196; y += 5) p.crease([[tx - 15, y], [tx + 15, y]], -0.18);
  for (let x = tx - 14; x <= tx + 10; x += 6) p.poly([[x, 120], [x + 4, 120], [x + 4, 114], [x, 114]], { m: M.stone, R: 1, v: 0.05 });
  p.poly([[tx - 3, 150], [tx + 3, 150], [tx + 3, 158], [tx - 3, 158]], { m: M.window, R: 0, v: 0.75, ol: 0 });
  p.poly([[tx - 5, 196], [tx + 5, 196], [tx + 5, 182], [tx - 5, 182]], { m: M.ink, R: 0, v: 0.1 });
  // redil de piedra seca
  for (let a = 0; a < Math.PI * 2; a += 0.11) {
    const x = 380 + Math.cos(a) * 70, y = 228 + Math.sin(a) * 18;
    if (a > 1.2 && a < 1.9) continue;
    p.ell(x, y - 4, 4, 3, { m: M.stone, R: 2.4, n: [0, -0.3, 1], v: (noise(a * 9, 1) - 0.5) * 0.2 });
    p.ell(x + 1, y - 8, 3.4, 2.6, { m: M.stone, R: 2, n: [0, -0.3, 1], v: (noise(a * 7, 2) - 0.5) * 0.2 + 0.04 });
  }
  E.olive(p, 170, 214, 1, r);
  for (let k = 0; k < 40; k++) E.grassTuft(p, r() * W, 200 + r() * 70, 4 + r() * 6, r);
  E.stones(p, 40, r, rr => [rr() * W, 210 + rr() * 60]);
  E.campfire(p, 240, 240);
  Object.assign(S.light, LIGHT.night);
  const breath = (t, per, ph = 0) => ((t + ph) % per) / per < 0.45 ? 1 : 0;
  // ovejas dentro y fuera del redil
  const sheep = [[350, 222, 0, 0], [372, 226, 1, 0], [400, 220, 0, 1], [420, 230, 1, 1], [392, 236, 0, 0], [348, 238, 1, 1], [300, 252, 0, 0], [440, 248, 0, 1], [120, 246, 1, 0]];
  sheep.forEach(([x, y, lie, f], i) => S.add({ w: 50, h: 34, ox: 25, oy: 28, x, y, flip: !!f, scale: 0.8 + (y - 220) * 0.006, key: t => `${(t + i * 1.7) % 7 < 3 ? 1 : 0}`, draw: (p2, t, k) => oveja(p2, { g: lie ? 0 : +k, e: +k }, { lie: !!lie }) }));
  const pose = gloria ? { pose: 'kneel', armN: 'up', armF: 'up' } : { pose: 'kneel', armN: 'forward', armF: 'forward', item: {} };
  S.add({ w: 80, h: 130, ox: 34, oy: 112, x: 206, y: 250, key: t => `${breath(t, 4.4)}`, draw: (p2, t, k) => persona(p2, { ...CAST.pastorViejo, ...pose, item: {} }, { b: +k }) });
  S.add({ w: 80, h: 140, ox: 34, oy: 126, x: 284, y: 250, flip: true, scale: 0.82, key: t => `${gloria ? breath(t, 3) : Math.floor(t * 3) % 2}`, draw: (p2, t, k) => persona(p2, gloria ? { ...CAST.zagal, armN: 'point', armF: 'down', item: {} } : { ...CAST.zagal }, { b: +k }) });
  S.add({ w: 80, h: 150, ox: 34, oy: 134, x: 150, y: 256, key: t => `${breath(t, 5)}`, draw: (p2, t, k) => persona(p2, gloria ? { ...CAST.pastor, armN: 'chest' } : CAST.pastor, { b: +k }) });
  S.add({ w: 44, h: 30, ox: 20, oy: 26, x: 262, y: 262, key: t => `${(t % 2) < 0.4 ? 1 : 0}`, draw: (p2, t, k) => perro(p2, { tail: +k * 2 }) });
  if (gloria) {
    S.add({ w: 120, h: 130, ox: 56, oy: 112, x: 250, y: 150, flip: true, key: t => `${Math.floor(t * 4) % 3}`, pos: t => [250, 150 + Math.sin(t * 1.1) * 3], draw: (p2, t, k) => angel(p2, { f: +k }, { arm: 'up', robe: M.white }) });
    for (const [x, y, f, ph] of [[96, 64, false, 0], [404, 64, true, 1], [150, 30, false, 2], [350, 30, true, 1.5]]) S.add({ w: 120, h: 130, ox: 56, oy: 112, x, y: y + 60, flip: f, scale: 0.42, key: t => `${Math.floor(t * 5 + ph) % 3}`, pos: t => [x, y + 60 + Math.sin(t * 1.4 + ph) * 2], draw: (p2, t, k) => angel(p2, { f: +k }, { arm: 'open' }) });
  }
  S.done();
  // cinta con el Gloria (se pinta sobre el cielo en el G-buffer de fondo)
  if (gloria) {
    const txt = 'GLORIA IN EXCELSIS DEO', tw = E.textWidth(txt), x0 = 240 - tw / 2 - 6;
    const wave = x => Math.round(Math.sin((x - x0) * 0.05) * 3);
    for (let x = x0; x < x0 + tw + 12; x++) for (let y = 0; y < 9; y++) p.pix(x, 14 + y + wave(x), M.banner, { v: y === 0 || y === 8 ? -0.1 : 0.15, n: [0, Math.sin((x - x0) * 0.05) * 0.6, 0.8], ol: 1, obj: 1 });
    E.paintText(p, txt, x0 + 6, 16, M.red, 0.25, wave);
  }
  const stars = E.makeStars(S.bg, 240, 21, 180);
  S.lightsFn = t => {
    const L = [{ x: 240, y: 232, z: 14, r: 150, i: 1.05 * (0.9 + 0.1 * noise(Math.floor(t * 12) * 0.4, 2)) }];
    if (gloria) L.push({ x: 250, y: 100, z: 80, r: 360, i: 0.85 + 0.08 * Math.sin(t * 2) });
    return L;
  };
  S.fx = t => {
    E.drawStars(R, stars, t, M.sky, gloria ? 0.6 : 1);
    if (!gloria) E.shootingStar(R, t, M.sky, 12);
    if (gloria) {
      R.glow(250, 100, 150, [255, 220, 150], 0.22, 6);
      R.glow(250, 100, 60, [255, 240, 200], 0.3, 4);
      for (let k = 0; k < 40; k++) { const a = k * 2.4 + t * 0.2, d = 30 + ((k * 37 + t * 20) % 160); R.add(250 + Math.cos(a) * d, 70 + Math.sin(a) * d * 0.6, 200, 180, 120); }
    } else E.bethlehemStar(R, 392, 30, t, { s: 0.8, dir: [-1.4, -0.5] });
    E.flames(R, 240, 239, 1.1, t);
    E.smoke(R, 242, 214, t, 10);
    for (const [x, y] of lit) if (noise(t * 0.8 + x, y) > 0.84) R.set(x, y, [176, 90, 22]);
    R.glow(tx, 154, 8, [255, 170, 80], 0.25, 3);
  };
  S.focus = 0.5;
  return S;
}
