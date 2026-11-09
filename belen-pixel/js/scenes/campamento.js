// El campamento de los Reyes la noche del 6 de enero: duermen en su tienda y un ángel les avisa en sueños.
import { W, H, M, noise, fbm, rng, bayer } from '../engine.js';
import { Stage, LIGHT } from '../stage.js';
import { angel } from '../people.js';
import { camelloEchado } from '../animals.js';
import { vfold } from '../figures.js';
import * as E from '../env.js';

export function buildCampamento(R) {
  const S = new Stage(R), p = S.p, r = rng(71);
  E.sky(p, 'night', W, H, { horizon: 190, mx: 100 });
  E.ridge(p, x => 170 + 8 * Math.sin(x * 0.02) + 5 * fbm(x * 0.03, 2), M.far1, -4, W + 4, 250, { base: 0.42 });
  for (let k = 0; k < 3; k++) E.ridge(p, x => 192 + k * 7 + 7 * Math.sin(x * (0.012 + k * 0.006) + k * 2), M.sand, -4, W + 4, 272, { n: [0.3, -0.7, 0.6], base: -0.08 - k * 0.04, grad: 0.002, ol: 1 });
  for (let k = 0; k < 3; k++) E.palm(p, [30, 74, 448][k], 206 + k * 2, 34 + r() * 10, r, { s: 0.9 });
  // la tienda: lona a rayas con la entrada abierta
  const tx = 240, ty = 236;
  const stripes = (x) => (Math.floor((x - tx) / 7) % 2 ? -0.18 : 0.06);
  p.poly([[tx - 114, ty], [tx - 100, ty - 46], [tx - 66, ty - 62], [tx - 34, ty - 92], [tx, ty - 72], [tx + 34, ty - 92], [tx + 66, ty - 62], [tx + 100, ty - 46], [tx + 114, ty]], { m: M.cream, smooth: 1, R: 5, v: stripes, fold: vfold(0.4, 0.3) });
  for (const s of [-1, 1]) { p.cap(tx + s * 34, ty - 92, tx + s * 34, ty - 104, 1.2, 1, { m: M.wood, R: 1 }); p.cap(tx + s * 34, ty - 92, tx + s * 128, ty + 2, 0.4, 0.4, { m: M.rope, R: 0, ol: 0 }); }
  p.poly([[tx - 70, ty], [tx - 60, ty - 62], [tx + 60, ty - 62], [tx + 70, ty]], { m: M.wall, R: 0, n: [0, 0, 1], v: -0.2, ol: 1 });
  // faldones recogidos
  p.poly([[tx - 74, ty], [tx - 62, ty - 66], [tx - 50, ty - 60], [tx - 56, ty]], { m: M.red, smooth: 1, R: 3, v: stripes, fold: vfold(0.9, 0.4) });
  p.poly([[tx + 74, ty], [tx + 62, ty - 66], [tx + 50, ty - 60], [tx + 56, ty]], { m: M.red, smooth: 1, R: 3, v: stripes, fold: vfold(0.9, 0.4) });
  p.poly([[tx + 34, ty - 104], [tx + 46, ty - 100], [tx + 34, ty - 96]], { m: M.purple, R: 1, v: 0.05 });
  for (const s of [-1, 1]) p.cap(tx + s * 108, ty, tx + s * 130, ty + 4, 0.4, 0.4, { m: M.rope, R: 0, ol: 0 });
  // alfombra, cojines y los tres Reyes dormidos bajo sus mantas
  p.poly([[tx - 66, ty], [tx + 66, ty], [tx + 62, ty - 8], [tx - 62, ty - 8]], { m: M.weave, R: 0, n: [0, -0.8, 0.6], v: (x, y) => (Math.floor(x / 5) % 3 === 0 ? -0.25 : 0.05) });
  const sleepers = [[tx - 40, M.brass, M.white, M.white], [tx, M.green, M.hair, M.cream], [tx + 40, M.purple, M.ink, M.white]];
  sleepers.forEach(([x, blanket, hair, turban], i) => {
    p.ell(x - 12, ty - 12, 5, 3, { m: M.red, R: 2.4, v: 0.1 });
    p.ell(x + 2, ty - 12, 15, 6, { m: blanket, R: 5, fold: vfold(0.8, 0.3) });
    p.crease([[x - 10, ty - 10], [x + 15, ty - 10]], 0.3, M.brass);
    p.circ(x - 12, ty - 16, 3.6, { m: i === 2 ? M.skind : M.skin, R: 3 });
    if (i === 0) p.ell(x - 10, ty - 13, 3, 2.6, { m: M.white, R: 2 });
    if (i > 0) p.ell(x - 14, ty - 18, 4, 3, { m: turban, R: 2.6 });
    p.dot(x - 10.6, ty - 16.4, M.ink, 0.3);
  });
  // coronas y cofres a un lado
  p.poly([[tx + 56, ty - 8], [tx + 66, ty - 8], [tx + 66, ty - 15], [tx + 56, ty - 15]], { m: M.brass, R: 1.5 });
  for (const cx of [tx - 58, tx - 50]) { p.poly([[cx - 3, ty - 9], [cx + 3, ty - 9], [cx + 3.4, ty - 13], [cx + 1.5, ty - 11], [cx, ty - 14], [cx - 1.5, ty - 11], [cx - 3.4, ty - 13]], { m: M.brass, R: 1, v: 0.1 }); }
  // candil dentro de la tienda
  p.ell(tx + 50, ty - 30, 3.4, 1.6, { m: M.clay, R: 1.4 });
  E.campfire(p, tx - 2, 256);
  E.stones(p, 30, r, rr => [rr() * W, 240 + rr() * 30], { m: M.rock });
  Object.assign(S.light, LIGHT.night);
  S.add({ w: 110, h: 60, ox: 50, oy: 56, x: 70, y: 254, draw: camelloEchado, key: t => `${Math.sin(t * 0.4) > 0.6 ? 1 : 0}`, scale: 0.75 }).draw = ((d) => (p2, t, k) => d(p2, { h: +k * 2 }, { cloth: M.red }))(camelloEchado);
  S.add({ w: 110, h: 60, ox: 50, oy: 56, x: 420, y: 258, flip: true, scale: 0.75, key: t => `${Math.sin(t * 0.37 + 1) > 0.6 ? 1 : 0}`, draw: (p2, t, k) => camelloEchado(p2, { h: +k * 2 }, { cloth: M.teal }) });
  S.add({ w: 120, h: 130, ox: 56, oy: 112, x: 236, y: 112, flip: true, scale: 0.8, key: t => `${Math.floor(t * 4) % 3}`, pos: t => [236, 112 + Math.sin(t * 1.1) * 3], draw: (p2, t, k) => angel(p2, { f: +k }, { arm: 'point', robe: M.white }) });
  S.done();
  const stars = E.makeStars(S.bg, 240, 31, 190);
  S.lightsFn = t => [
    { x: tx - 2, y: 250, z: 12, r: 110, i: 0.6 * (0.85 + 0.15 * noise(Math.floor(t * 10) * 0.4, 1)) },
    { x: tx + 50, y: ty - 34, z: 12, r: 60, i: 0.5 },
    { x: 236, y: 60, z: 60, r: 220, i: 0.6 + 0.06 * Math.sin(t * 2.2) },
  ];
  S.fx = t => {
    E.drawStars(R, stars, t);
    E.bethlehemStar(R, 410, 28, t, { s: 0.6, tail: false });
    E.flames(R, tx - 2, 255, 0.55, t, { big: false });
    E.smoke(R, tx, 240, t, 8);
    R.glow(tx + 50, ty - 33, 6, [255, 190, 90], 0.5, 3);
    R.glow(236, 64, 70, [220, 230, 255], 0.22 + 0.04 * Math.sin(t * 2), 5);
    // polvo de sueño que cae del ángel hacia la tienda
    for (let k = 0; k < 26; k++) { const u = ((t * 0.12 + k / 26) % 1), x = 236 + Math.sin(k * 3.7 + t) * (10 + u * 50), y = 80 + u * 140; R.add(x, y, 160 * (1 - u), 170 * (1 - u), 220 * (1 - u)); }
  };
  S.focus = 0.5;
  return S;
}
