// Jerusalén: los Magos ante Herodes en el salón del trono.
import { W, H, M, noise, fbm, rng, bayer } from '../engine.js';
import { Stage } from '../stage.js';
import { persona } from '../people.js';
import { CAST } from '../cast.js';
import * as E from '../env.js';

export function buildHerodes(R) {
  const S = new Stage(R), p = S.p, r = rng(61);
  // pared del fondo con ventana en arco hacia la ciudad de noche
  p.poly([[-4, -4], [W + 4, -4], [W + 4, 214], [-4, 214]], { m: M.marble, R: 0, n: [0, 0, 1], ol: 0, v: (x, y) => (fbm(x * 0.04, y * 0.04) - 0.5) * 0.2 - 0.25 });
  const wx = 300, ww = 70;
  E.sky(p, 'night', W, H, { horizon: 160 });
  p.poly([[-4, -4], [W + 4, -4], [W + 4, 214], [-4, 214]], { m: M.marble, R: 0, n: [0, 0, 1], ol: 1, clip: (x, y) => (Math.abs(x - wx) < ww / 2 && y > 52 && (y > 87 || Math.hypot(x - wx, y - 87) < ww / 2) ? 1 : -1), v: (x, y) => (fbm(x * 0.04, y * 0.04) - 0.5) * 0.2 - 0.22 + ((Math.floor(y / 14) + Math.floor(x / 28 + (Math.floor(y / 14) % 2) * 0.5)) % 2 ? -0.03 : 0) });
  for (let y = 14; y < 214; y += 14) p.crease([[0, y], [W, y]], -0.12);
  // la ciudad por la ventana
  for (let k = 0; k < 12; k++) { const x = wx - 34 + k * 6, h = 6 + r() * 14; p.poly([[x, 150 - h], [x + 5, 150 - h], [x + 5, 150], [x, 150]], { m: M.town, R: 0, v: -0.05 + r() * 0.1, ol: 1, clip: (xx, yy) => (Math.abs(xx - wx) < ww / 2 ? -1 : 1) }); if (r() < 0.6) p.pix(x + 2, 152 - h + 3, M.window, { v: 0.7 }); }
  p.poly([[wx - ww / 2, 150], [wx + ww / 2, 150], [wx + ww / 2, 160], [wx - ww / 2, 160]], { m: M.marble, R: 1, v: 0.05 });
  // pilastras con antorchas
  const pil = [40, 170, 430];
  for (const x of pil) {
    p.poly([[x - 9, 214], [x + 9, 214], [x + 9, 10], [x - 9, 10]], { m: M.marble, R: 4, v: (xx) => (Math.sin(xx * 1.6) > 0.7 ? -0.12 : 0.04) });
    p.poly([[x - 12, 18], [x + 12, 18], [x + 12, 8], [x - 12, 8]], { m: M.brass, R: 1.5, v: -0.1 });
    p.cap(x + 12, 104, x + 17, 98, 1.2, 1.2, { m: M.metal, R: 1 });
    p.poly([[x + 14, 96], [x + 21, 96], [x + 20, 99], [x + 15, 99]], { m: M.metal, R: 1 });
  }
  // cortinajes púrpura
  for (const [x0, x1] of [[-4, 30], [450, W + 4]]) p.poly([[x0, -4], [x1, -4], [x1 - (x0 < 0 ? 0 : 10), 214], [x0 + (x0 < 0 ? 10 : 0), 214]], { m: M.purple, R: 3, fold: (x) => [Math.sin(x * 0.7) * 0.6, 0], v: -0.05 });
  p.poly([[-4, -4], [W + 4, -4], [W + 4, 8], [-4, 8]], { m: M.purple, R: 2, v: 0 });
  for (let x = 0; x < W; x += 20) p.poly([[x, 8], [x + 20, 8], [x + 10, 18]], { m: M.purple, R: 1.5, v: -0.05 });
  // suelo de mármol ajedrezado
  p.poly([[-4, 214], [W + 4, 214], [W + 4, 272], [-4, 272]], { m: M.marble, R: 0, n: [0, -0.85, 0.5], ol: 1, v: (x, y) => { const row = Math.floor((y - 214) / (4 + (y - 214) * 0.12)); return ((Math.floor(x / (12 + (y - 214) * 0.4)) + row) % 2 ? -0.2 : 0.06) + (noise(x * 0.2, y * 0.3) - 0.5) * 0.1; } });
  // estrado y trono a la izquierda
  for (let k = 0; k < 3; k++) p.poly([[60 - k * 6, 214 + k * 6 + 6], [180 + k * 6, 214 + k * 6 + 6], [180 + k * 6, 214 + k * 6], [60 - k * 6, 214 + k * 6]], { m: M.marble, R: 1.2, n: [0, -0.5, 0.85], v: 0.08 - k * 0.04 });
  p.poly([[78, 214], [132, 214], [132, 150], [126, 128], [105, 120], [84, 128], [78, 150]], { m: M.brass, R: 3, v: -0.05 });
  p.poly([[84, 210], [126, 210], [126, 152], [120, 136], [105, 130], [90, 136], [84, 152]], { m: M.red, R: 3, v: -0.1 });
  for (const ax of [74, 136]) { p.cap(ax, 214, ax, 184, 3, 3, { m: M.brass, R: 2.6 }); p.circ(ax, 182, 4, { m: M.brass, R: 3, v: 0.12 }); }
  // braseros
  for (const bx of [200, 470]) { p.poly([[bx - 9, 238], [bx + 9, 238], [bx + 6, 222], [bx - 6, 222]], { m: M.metal, R: 2 }); p.ell(bx, 220, 12, 3.4, { m: M.brass, R: 2 }); p.ell(bx, 219, 9, 2, { m: M.ember, R: 0, v: 0.6, ol: 0 }); }
  S.light.moonDir = [0.5, -0.6, 0.6]; S.light.moon = 0.15; S.light.amb0 = 0.08; S.light.amb1 = 0; S.light.bgDim = 0.6; S.key = [-0.3, -0.6, 0.74];
  S.shelter.fill(1);
  const breath = (t, per, ph = 0) => ((t + ph) % per) / per < 0.45 ? 1 : 0;
  S.add({ w: 90, h: 150, ox: 36, oy: 134, x: 30, y: 230, key: t => `${breath(t, 5)}`, draw: (p2, t, k) => persona(p2, CAST.soldado, { b: +k }) });
  S.add({ w: 90, h: 130, ox: 36, oy: 104, x: 104, y: 200, key: t => `${Math.floor(t * 0.8) % 2}`, draw: (p2, t, k) => persona(p2, { ...CAST.herodes, pose: 'ride', armN: +k ? 'open' : 'point', armF: 'hip' }, {}) });
  S.add({ w: 90, h: 130, ox: 36, oy: 112, x: 230, y: 252, key: t => `${breath(t, 4)}`, draw: (p2, t, k) => persona(p2, { tunic: M.white, mantle: { m: M.teal, style: 'sash', trim: M.brass }, head: { type: 'cloth', m: M.white, m2: M.brass }, beard: { len: 2, m: M.beard }, pose: 'kneel', armN: 'hold', item: { type: 'scroll' }, belt: M.brass }, { b: +k }) });
  const kings = [['melchor', 300, 246, 'open'], ['gaspar', 346, 250, 'chest'], ['baltasar', 392, 246, 'hip']];
  for (const [k, x, y, arm] of kings) S.add({ w: 90, h: 150, ox: 36, oy: 134, x, y, flip: true, key: t => `${breath(t, 4.5 + x % 2, x)}`, draw: (p2, t, kk) => persona(p2, { ...CAST[k], armN: arm, item: {} }, { b: +kk }) });
  S.add({ w: 90, h: 150, ox: 36, oy: 134, x: 452, y: 236, flip: true, key: t => `${breath(t, 5.3, 2)}`, draw: (p2, t, k) => persona(p2, CAST.soldado, { b: +k }) });
  S.done();
  const stars = E.makeStars(S.bg, 30, 2, 150);
  S.lightsFn = t => [
    ...[200, 470].map((x, i) => ({ x, y: 212, z: 20, r: 190, i: 0.95 * (0.9 + 0.1 * noise(Math.floor(t * 12) * 0.4, i)) })),
    ...pil.map((x, i) => ({ x: x + 17, y: 92, z: 20, r: 140, i: 0.6 * (0.9 + 0.1 * noise(Math.floor(t * 12) * 0.5, i + 5)) })),
  ];
  S.fx = t => {
    E.drawStars(R, stars, t);
    for (const x of [200, 470]) E.flames(R, x, 218, 1, t);
    for (const x of pil) E.flames(R, x + 17, 95, 0.5, t, { big: false });
  };
  S.focus = 0.45;
  return S;
}
