// Oriente: los Magos estudian el cielo desde la terraza de un zigurat junto al Éufrates.
import { W, H, M, noise, fbm, clamp, lerp, rng, bayer } from '../engine.js';
import { Stage, LIGHT } from '../stage.js';
import { persona } from '../people.js';
import { CAST } from '../cast.js';
import * as E from '../env.js';

export function buildOriente(R) {
  const S = new Stage(R), p = S.p, r = rng(31);
  E.sky(p, 'night', W, H, { horizon: 200, mx: 120 });
  // la ciudad de Babilonia allá abajo, con el río y las palmeras
  E.ridge(p, x => 186 + 3 * Math.sin(x * 0.03), M.far1, -4, W + 4, 250, { base: 0.4 });
  for (let k = 0; k < 40; k++) { const x = r() * W, w = 6 + r() * 12, h = 4 + r() * 10, y = 192 + r() * 6; p.poly([[x, y - h], [x + w, y - h], [x + w, y], [x, y]], { m: M.town, R: 0, n: [0, 0, 1], v: -0.1 + r() * 0.1, ol: 1 }); if (r() < 0.5) p.pix(x + 2 + r() * (w - 4), y - h + 2, M.window, { v: 0.7 }); }
  // otro zigurat a lo lejos
  for (let k = 0; k < 5; k++) { const w = 70 - k * 13, x0 = 90 - w / 2, y0 = 196 - k * 8; p.poly([[x0, y0 - 8], [x0 + w, y0 - 8], [x0 + w, y0], [x0, y0]], { m: M.town, R: 0, n: [0, 0, 1], v: 0.02 + k * 0.02, ol: 1 }); }
  p.poly([[-4, 198], [W + 4, 198], [W + 4, 206], [-4, 206]], { m: M.waternight, R: 0, n: [0, -1, 0.3], ol: 0, v: (x, y) => 0.25 + (noise(x * 0.1, y) - 0.5) * 0.2 });
  for (let k = 0; k < 18; k++) E.palm(p, r() * W, 200 + r() * 4, 14 + r() * 10, r, { s: 0.55 });
  // terraza: suelo de ladrillo y pretil de azulejos azules con leones dorados
  p.poly([[-4, 206], [W + 4, 206], [W + 4, 272], [-4, 272]], { m: M.sand, R: 0, n: [0, -0.8, 0.6], ol: 1, v: (x, y) => ((Math.floor(x / 8 + (Math.floor(y / 4) % 2) * 0.5) + Math.floor(y / 4)) % 3 === 0 ? -0.08 : 0) + (noise(x * 0.5, y * 0.5) - 0.5) * 0.1 - 0.12 });
  for (let y = 210; y < 272; y += 4) p.crease([[0, y], [W, y]], -0.15);
  const fp = S.fgPainter();
  fp.poly([[-4, 238], [W + 4, 238], [W + 4, 272], [-4, 272]], { m: M.blue, R: 2, n: [0, -0.2, 1], v: (x, y) => ((Math.floor(x / 6) + Math.floor(y / 5)) % 2 ? -0.06 : 0.04) });
  for (let y = 243; y < 272; y += 5) fp.crease([[0, y], [W, y]], -0.3);
  for (let x = 3; x < W; x += 6) fp.crease([[x, 238], [x, 272]], -0.2);
  fp.poly([[-4, 234], [W + 4, 234], [W + 4, 239], [-4, 239]], { m: M.brass, R: 1, n: [0, -0.7, 0.7], v: 0 });
  for (let x = 30; x < W; x += 90) {
    // león de Ishtar estilizado
    fp.ell(x, 255, 12, 5, { m: M.brass, R: 3, v: 0.05 });
    fp.circ(x + 12, 251, 4.4, { m: M.brass, R: 3, v: 0.1 });
    fp.ell(x + 11, 251, 6, 6, { m: M.ochre, R: 3, v: -0.05 });
    fp.circ(x + 13, 251, 3, { m: M.brass, R: 2, v: 0.15 });
    for (const lx of [-8, -3, 5, 9]) fp.cap(x + lx, 258, x + lx, 264, 1.3, 1.2, { m: M.brass, R: 1 });
    fp.tube([[x - 12, 254], [x - 17, 249], [x - 15, 245]], 0.9, 0.7, { m: M.brass, R: 0.8 });
  }
  // columnas y toldo
  for (const cx of [26, 454]) {
    p.tube([[cx, 236], [cx, 120]], 6, 5.4, { m: M.marble, R: 5, v: (x, y) => (Math.sin(x * 2.2) > 0.6 ? -0.15 : 0) });
    p.poly([[cx - 9, 120], [cx + 9, 120], [cx + 7, 114], [cx - 7, 114]], { m: M.brass, R: 1.5 });
    p.poly([[cx - 8, 236], [cx + 8, 236], [cx + 8, 230], [cx - 8, 230]], { m: M.marble, R: 1.5, v: 0.05 });
  }
  p.poly([[16, 114], [464, 114], [470, 124], [10, 124]], { m: M.red, R: 2, v: (x) => (Math.floor(x / 12) % 2 ? -0.18 : 0.08), fold: (x, y) => [0, Math.sin(x * 0.26) * 0.5] });
  for (let x = 14; x < 468; x += 12) p.poly([[x, 124], [x + 12, 124], [x + 6, 130]], { m: M.red, R: 1, v: (Math.floor(x / 12) % 2 ? -0.18 : 0.08) });
  // mesa con pergaminos, esfera armilar y astrolabio
  p.poly([[300, 214], [380, 214], [384, 220], [296, 220]], { m: M.wood, R: 1.5, v: 0.1 });
  for (const lx of [302, 378]) p.cap(lx, 220, lx, 236, 1.6, 1.6, { m: M.wood, R: 1.4 });
  p.poly([[296, 214], [384, 214], [382, 210], [298, 210]], { m: M.purple, R: 1, v: -0.1 });
  for (const [x, y] of [[312, 207], [324, 208], [356, 207]]) { p.cap(x - 6, y, x + 6, y, 2.4, 2.4, { m: M.cream, R: 2 }); }
  p.poly([[330, 209], [348, 209], [347, 205], [331, 205]], { m: M.cream, R: 0.8, v: 0.15 });
  const ax = 370, ay = 192;
  p.cap(ax, 210, ax, 200, 1.4, 1.2, { m: M.brass, R: 1.2 });
  for (const [rx, ry] of [[9, 9], [9, 3], [3, 9]]) p.shape((x, y) => Math.abs(Math.hypot((x - ax) / rx, (y - ay) / ry) - 1) * Math.min(rx, ry) - 0.8, [ax - 11, ay - 11, ax + 11, ay + 11], { m: M.brass, R: 1, ol: 0, v: 0.1 });
  p.circ(ax, ay, 2, { m: M.brass, R: 1.6, v: 0.2 });
  // brasero
  p.poly([[176, 236], [196, 236], [192, 222], [180, 222]], { m: M.metal, R: 2 });
  p.ell(186, 220, 12, 3.4, { m: M.brass, R: 2 });
  p.ell(186, 219, 9, 2, { m: M.ember, R: 0, v: 0.6, ol: 0 });
  Object.assign(S.light, LIGHT.night);
  const breath = (t, per, ph = 0) => ((t + ph) % per) / per < 0.45 ? 1 : 0;
  S.add({ w: 90, h: 150, ox: 36, oy: 134, x: 110, y: 236, key: t => `${breath(t, 4.3)}`, draw: (p2, t, k) => persona(p2, { ...CAST.melchor, armN: 'point', item: {} }, { b: +k }) });
  S.add({ w: 90, h: 150, ox: 36, oy: 134, x: 262, y: 238, key: t => `${breath(t, 5, 1)}`, draw: (p2, t, k) => persona(p2, { ...CAST.gaspar, armN: 'hold', item: { type: 'scroll' } }, { b: +k }) });
  S.add({ w: 90, h: 150, ox: 36, oy: 134, x: 410, y: 238, flip: true, key: t => `${breath(t, 4.6, 2)}`, draw: (p2, t, k) => persona(p2, { ...CAST.baltasar, armN: 'point', item: {} }, { b: +k }) });
  S.addFG();
  S.done();
  const stars = E.makeStars(S.bg, 300, 12, 200);
  S.lightsFn = t => [{ x: 186, y: 212, z: 18, r: 170, i: 0.95 * (0.9 + 0.1 * noise(Math.floor(t * 12) * 0.4, 3)) }, { x: 330, y: 40, z: 60, r: 320, i: 0.28 }];
  S.fx = t => {
    E.drawStars(R, stars, t, M.sky, 1.2);
    E.shootingStar(R, t, M.sky, 11);
    // la estrella nueva, grande y sin cola todavía
    E.bethlehemStar(R, 330, 40, t, { tail: false, s: 1.15 });
    E.flames(R, 186, 218, 1, t);
    E.smoke(R, 188, 196, t, 8, [90, 80, 100]);
    E.shimmer(R, S.wm || (S.wm = (() => { const o = []; for (let i = 0; i < W * H; i++) if (R.G.mat[i] === M.waternight) o.push(i); return o; })()), t, M.waternight);
  };
  S.focus = 0.4;
  return S;
}
