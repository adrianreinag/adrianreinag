// Escena de viaje con paralaje: la Sagrada Familia camino de Belén, o la caravana de los Reyes.
import { W, H, M, MATS, noise, fbm, clamp, lerp, smooth, rng, bayer, sdEllipse } from '../engine.js';
import { Stage, LIGHT } from '../stage.js';
import { persona } from '../people.js';
import { CAST } from '../cast.js';
import { mulaPie, camello } from '../animals.js';
import * as E from '../env.js';

const LW = 960; // ancho de las capas repetibles
let TIME = 'day';
const far = n => M[(n === 1 ? 'far1' : 'far2') + (TIME === 'night' ? '' : TIME)];
const waterM = () => M[TIME === 'dusk' || TIME === 'dawn' ? 'waterdusk' : TIME === 'night' ? 'waternight' : 'water'];
const GROUND = 228;

// dibuja algo que puede cruzar el borde de la capa repetible
const wrap = (x, size, fn) => { fn(x); if (x < size) fn(x + LW); if (x > LW - size) fn(x - LW); };

const BIOMES = {
  galilea: { time: 'day', walkers: 'family' },
  jordan: { time: 'dusk', walkers: 'family', sun: 90 },
  jordanNoche: { time: 'night', walkers: 'camp', still: true },
  jerico: { time: 'dusk', walkers: 'family', sun: 400 },
  desierto: { time: 'night', walkers: 'family' },
  jerusalen: { time: 'dusk', walkers: 'family', sun: 60 },
  eufrates: { time: 'dusk', walkers: 'kings', sun: 380 },
  arabia: { time: 'night', walkers: 'kings', star: true },
  petra: { time: 'dusk', walkers: 'kings', sun: 40 },
  reyesJerusalen: { time: 'night', walkers: 'kings', star: true },
  regreso: { time: 'dawn', walkers: 'kingsBack', sun: 70 },
};

// ---------- pintores de capas ----------
function mountains(p, f, m, base, yb = 250, o = {}) {
  const b0 = MATS[m].unlit ? base : base - 0.5;
  let top = 1e9; for (let x = 0; x <= LW; x += 4) top = Math.min(top, f(x));
  p.shape((x, y) => Math.max(f(x) - y, y - yb), [-4, top - 2, LW + 4, yb], { m, R: 0, ol: o.ol ?? 1, n: o.n, v: (x, y) => b0 - (y - f(x)) * (o.grad ?? 0.01) + (fbm(x * 0.03, y * 0.05) - 0.5) * (o.tex ?? 0.15) });
}
const per = (x, k, a) => Math.sin((x / LW) * Math.PI * 2 * k + a); // periódica en LW

function nearGround(p, r, o) {
  const top = x => GROUND - 8 + 3 * per(x, 3, 1) + 2 * per(x, 7, 2);
  p.shape((x, y) => top(x) - y, [-4, GROUND - 14, LW + 4, 272], { m: o.m ?? M.dirt, R: 0, n: [0, -0.75, 0.65], ol: 1, v: (x, y) => (fbm(((x % LW) + LW) % LW * 0.06, y * 0.12) - 0.5) * 0.3 + (o.v || 0) });
  // camino más claro
  p.poly([[-4, GROUND - 3], [LW + 4, GROUND - 3], [LW + 4, GROUND + 8], [-4, GROUND + 8]], { m: o.path ?? M.sand, R: 0, n: [0, -0.8, 0.6], ol: 0, v: (x, y) => (noise(x * 0.3, y * 0.6) - 0.5) * 0.2 + 0.05 });
  E.stones(p, 40, r, rr => [rr() * LW, GROUND - 6 + rr() * 44], { m: o.stone ?? M.rock });
  // textura por planos: briznas (o rizos de arena) más altas cerca y más cortas lejos
  for (let k = 0; k < 1400; k++) {
    const x = r() * LW, y = GROUND + 9 + r() ** 0.7 * 54, near = (y - GROUND) / 62;
    if (o.green) { const h = 0.6 + near * 2.6 + r() * near; p.cap(x, y, x + (r() - 0.5) * near, y - h, 0.45, 0.4, { m: M.grass, R: 0, ol: 0, v: 0.1 + r() * 0.25 }); }
    else if (k % 3 === 0) { const l = 1 + near * 3; p.cap(x, y, x + l, y, 0.45, 0.45, { m: o.m, R: 0, ol: 0, n: [0, -0.9, 0.4], v: (k % 2 ? 0.18 : -0.12) }); }
  }
  return top;
}

function paintBiome(S, B, name, r) {
  const t = B.time;
  // ---- capa lejana
  S.parallax(LW, B.still ? 0 : 3, p => {
    if (name === 'galilea') {
      mountains(p, x => 168 - 34 * Math.exp(-(((x - 300) / 70) ** 2)) - 4 * per(x, 2, 0.4), far(1), 0.58, 250, { tex: 0.1 });
      mountains(p, x => 178 + 6 * per(x, 3, 1) + 4 * per(x, 5, 2), far(2), 0.62);
    } else if (name === 'jordan' || name === 'jordanNoche' || name === 'jerico') {
      mountains(p, x => 150 + 10 * per(x, 2, 0.3) + 7 * per(x, 5, 1.2) + 4 * per(x, 9, 2), far(1), 0.5, 250, { tex: 0.12 });
    } else if (name === 'desierto' || name === 'regreso') {
      mountains(p, x => 158 + 12 * per(x, 3, 0.3) + 6 * per(x, 7, 1.2), far(1), 0.5);
    } else if (name === 'jerusalen' || name === 'reyesJerusalen') {
      mountains(p, x => 178 + 4 * per(x, 2, 0.5), far(1), 0.5);
      // la ciudad sobre su colina
      const hill = x => 176 - 18 * Math.exp(-(((x - 480) / 160) ** 2));
      mountains(p, hill, far(2), 0.5);
      const rr = rng(4);
      for (let x = 340; x < 640; x += 4 + rr() * 5) { const h = 4 + rr() * 8, yb = hill(x) + 6; p.poly([[x, yb - h], [x + 5, yb - h], [x + 5, yb], [x, yb]], { m: M.town, R: 0, n: [0, 0, 1], v: -0.02 + rr() * 0.08, ol: 1 }); if (rr() < 0.4) p.pix(x + 2, yb - h + 2, t === 'night' ? M.window : M.ink, { v: 0.7 }); }
      // murallas y Templo
      p.poly([[330, hill(330) + 8], [650, hill(650) + 8], [650, hill(650) + 2], [330, hill(330) + 2]], { m: M.town, R: 0, v: 0.05, n: [0, 0, 1] });
      for (let x = 336; x < 650; x += 18) p.poly([[x, hill(x) + 4], [x + 6, hill(x) + 4], [x + 6, hill(x) - 6], [x, hill(x) - 6]], { m: M.town, R: 0, v: 0.08, n: [0.3, 0, 1] });
      p.poly([[440, 152], [520, 152], [520, 170], [440, 170]], { m: M.marble, R: 0, n: [0, 0, 1], v: 0.1 });
      p.poly([[462, 134], [498, 134], [498, 152], [462, 152]], { m: M.marble, R: 0, n: [0.2, 0, 1], v: 0.18 });
      p.poly([[458, 134], [502, 134], [500, 131], [460, 131]], { m: M.brass, R: 0, v: 0.3, n: [0, -1, 0.5] });
      for (let x = 466; x < 498; x += 5) p.poly([[x, 137], [x + 2, 137], [x + 2, 152], [x, 152]], { m: M.marble, R: 0, v: -0.1 });
      p.poly([[540, 146], [556, 146], [556, 170], [540, 170]], { m: M.town, R: 0, n: [0.2, 0, 1], v: 0.06 });
      for (const tx of [540, 551]) p.poly([[tx, 140], [tx + 5, 140], [tx + 5, 146], [tx, 146]], { m: M.town, R: 0, v: 0.1 });
    } else if (name === 'eufrates') {
      mountains(p, x => 190 + 3 * per(x, 3, 0.4), far(2), 0.55);
      // zigurat escalonado
      for (let k = 0; k < 6; k++) { const w = 120 - k * 18, h = 11, x0 = 300 - w / 2, y0 = 192 - k * h; p.poly([[x0, y0 - h], [x0 + w, y0 - h], [x0 + w, y0], [x0, y0]], { m: M.sand, R: 0, n: [0, 0, 1], v: 0.0 + k * 0.03, ol: 1 }); p.crease([[x0, y0 - h + 1], [x0 + w, y0 - h + 1]], 0.2); }
      p.poly([[296, 192], [304, 192], [304, 132], [296, 132]], { m: M.sand, R: 0, v: 0.12 });
      for (let x = 160; x < 460; x += 10) if (Math.abs(x - 300) > 64) p.poly([[x, 192], [x + 7, 192], [x + 7, 180 + (x % 3)], [x, 180 + (x % 3)]], { m: M.sand, R: 0, n: [0, 0, 1], v: -0.05 });
    } else if (name === 'arabia') {
      mountains(p, x => 182 + 10 * per(x, 2, 0.4) + 5 * per(x, 5, 2), far(1), 0.5, 250, { tex: 0.08 });
    } else if (name === 'petra') {
      mountains(p, x => 90 + 30 * per(x, 2, 0.4) + 14 * per(x, 6, 2) + 8 * per(x, 11, 1), M.rosestone, 0.36, 250, { tex: 0.35, grad: 0.002, n: [-0.3, -0.2, 0.9] });
    }
  });
  // ---- capa media
  S.parallax(LW, B.still ? 0 : 10, p => {
    const rr = rng(name.length * 13);
    if (name === 'galilea') {
      mountains(p, x => 192 + 8 * per(x, 2, 1) + 5 * per(x, 5, 0.3), M.grass, 0.45, 250, { n: [0, -0.5, 0.85], tex: 0.25 });
      // bancales de trigo
      for (let k = 0; k < 6; k++) { const y = 200 + k * 4; p.crease(Array.from({ length: 49 }, (_, i) => [i * 20, y + 2 * per(i * 20, 3, k)]), 0.15); }
      for (let k = 0; k < 40; k++) { const x = rr() * LW, y = 195 + rr() * 16; wrap(x, 12, xx => E.olive(p, xx, y, 0.35 + rr() * 0.15, rr)); }
      // aldea blanca
      for (let k = 0; k < 7; k++) wrap(620 + k * 9, 20, xx => E.house(p, { x: xx, y: 200 - (k % 3) * 3, w: 8, ht: 6 + (k % 2) * 3, side: 3, base: false, parapet: true, windows: [{ x: 3, y: 2, w: 1, h: 2 }] }));
    } else if (name === 'jordan' || name === 'jordanNoche') {
      mountains(p, x => 196 + 3 * per(x, 4, 1), M.grass, 0.4, 250, { n: [0, -0.6, 0.8] });
      // el río
      p.poly([[-4, 204], [LW + 4, 204], [LW + 4, 214], [-4, 214]], { m: waterM(), R: 0, n: [0, -1, 0.3], ol: 0, v: (x, y) => 0.42 + (y - 204) * 0.02 + (noise(x * 0.1, y * 0.8) - 0.5) * 0.15 });
      for (let k = 0; k < 160; k++) { const x = rr() * LW, y = 201 + rr() * 4; p.cap(x, y, x + (rr() - 0.5) * 3, y - 5 - rr() * 7, 0.5, 0.35, { m: M.palm, R: 0.5, ol: 0, v: rr() * 0.3 }); }
      for (let k = 0; k < 9; k++) { const x = rr() * LW; wrap(x, 30, xx => E.palm(p, xx, 205 + rr() * 6, 30 + rr() * 16, rr, { s: 0.8 })); }
    } else if (name === 'jerico') {
      mountains(p, x => 200 + 2 * per(x, 3, 1), M.grass, 0.4);
      // murallas y torres de Jericó con palmeras
      const cx = 480;
      p.poly([[cx - 120, 202], [cx + 120, 202], [cx + 120, 184], [cx - 120, 184]], { m: M.stone, R: 0, n: [0, 0, 1], v: (x, y) => (noise(x * 0.4, y * 0.4) - 0.5) * 0.2 });
      for (let x = cx - 120; x <= cx + 110; x += 26) p.poly([[x, 202], [x + 12, 202], [x + 12, 174], [x, 174]], { m: M.stone, R: 0, n: [0.2, 0, 1], v: 0.05 });
      for (let k = 0; k < 14; k++) { const x = cx - 110 + k * 16 + rr() * 6; E.house(p, { x, y: 186, w: 10, ht: 8 + rr() * 6, side: 3, base: false, windows: [{ x: 4, y: 3, w: 2, h: 2, lit: rr() < 0.4 ? 0.7 : 0 }] }); }
      for (let k = 0; k < 18; k++) { const x = rr() * LW; wrap(x, 30, xx => E.palm(p, xx, 206 + rr() * 6, 28 + rr() * 20, rr, { s: 0.85, dates: rr() < 0.5 })); }
    } else if (name === 'desierto' || name === 'regreso') {
      mountains(p, x => 186 + 14 * per(x, 3, 2) + 6 * per(x, 8, 0.2), name === 'regreso' ? M.grass : M.sand, 0.42, 250, { n: [0.3, -0.5, 0.8], tex: 0.3 });
      for (let k = 0; k < 30; k++) { const x = rr() * LW; wrap(x, 10, xx => E.bush(p, xx, 200 + rr() * 10, 2 + rr() * 2, rr, name === 'regreso' ? M.leaf : M.olive)); }
      if (name === 'desierto') {
        // posada del Buen Samaritano
        const ix = 520;
        p.poly([[ix - 40, 206], [ix + 50, 206], [ix + 50, 194], [ix - 40, 194]], { m: M.stone, R: 0, n: [0, 0, 1], v: (x, y) => (noise(x * 0.5, y * 0.5) - 0.5) * 0.2 });
        S.innLit = E.house(p, { x: ix - 18, y: 206, w: 34, ht: 20, side: 6, m: M.stone, door: { x: 13, w: 7, h: 11, arch: true, open: true, glow: 0.55 }, windows: [{ x: 4, y: 5, w: 3, h: 3, lit: 0.7 }, { x: 27, y: 5, w: 3, h: 3, lit: 0.6 }], beams: true });
        S.innX = ix;
      }
    } else if (name === 'jerusalen' || name === 'reyesJerusalen') {
      mountains(p, x => 200 + 4 * per(x, 3, 1), M.grass, 0.42, 250, { n: [0, -0.5, 0.85] });
      for (let k = 0; k < 30; k++) { const x = rr() * LW; wrap(x, 14, xx => E.olive(p, xx, 206 + rr() * 6, 0.45 + rr() * 0.2, rr)); }
    } else if (name === 'eufrates') {
      mountains(p, x => 200 + 2 * per(x, 3, 1), M.sand, 0.42);
      p.poly([[-4, 204], [LW + 4, 204], [LW + 4, 212], [-4, 212]], { m: waterM(), R: 0, n: [0, -1, 0.3], ol: 0, v: (x, y) => 0.5 + (noise(x * 0.1, y * 0.8) - 0.5) * 0.15 });
      for (let k = 0; k < 16; k++) { const x = rr() * LW; wrap(x, 30, xx => E.palm(p, xx, 206 + rr() * 5, 30 + rr() * 18, rr, { s: 0.85, dates: true })); }
    } else if (name === 'arabia') {
      for (let k = 0; k < 3; k++) mountains(p, x => 196 + k * 6 + 8 * per(x, 2 + k, k * 1.7) + 4 * per(x, 5 + k, k), M.sand, 0.5 - k * 0.04, 250, { n: [0.4, -0.6, 0.7], tex: 0.1, ol: 1 });
      for (let k = 0; k < 4; k++) { const x = rr() * LW; wrap(x, 30, xx => E.palm(p, xx, 210, 26 + rr() * 8, rr, { s: 0.7 })); }
    } else if (name === 'petra') {
      mountains(p, x => 120 + 20 * per(x, 3, 1) + 10 * per(x, 7, 0.5), M.rosestone, 0.5, 250, { tex: 0.4, n: [-0.4, -0.1, 0.9], grad: 0.001 });
      // estratos de la roca
      for (let k = 0; k < 14; k++) { const y0 = 130 + k * 7; p.crease(Array.from({ length: 49 }, (_, i) => [i * 20, y0 + 3 * per(i * 20, 4, k)]), k % 2 ? -0.18 : 0.12); }
      // el Tesoro (al-Jazneh) tallado en la roca rosa
      const tx = 420, ty = 214, sm = M.rosestone, F = [0, 0, 1];
      p.poly([[tx - 52, ty], [tx + 52, ty], [tx + 52, ty - 104], [tx - 52, ty - 104]], { m: sm, R: 0, n: F, v: -0.25, ol: 1 });
      p.poly([[tx - 46, ty], [tx + 46, ty], [tx + 46, ty - 50], [tx - 46, ty - 50]], { m: sm, R: 0, n: F, v: 0.08, ol: 1 });
      for (const c of [-42, -28, -14, 10, 24, 38]) {
        p.poly([[tx + c, ty], [tx + c + 5, ty], [tx + c + 5, ty - 46], [tx + c, ty - 46]], { m: sm, R: 2.5, n: [0, 0, 1], v: 0.18 });
        p.poly([[tx + c - 1, ty - 46], [tx + c + 6, ty - 46], [tx + c + 6, ty - 49], [tx + c - 1, ty - 49]], { m: sm, R: 0, n: [0, -0.6, 0.8], v: 0.28 });
      }
      p.poly([[tx - 48, ty - 50], [tx + 48, ty - 50], [tx + 48, ty - 54], [tx - 48, ty - 54]], { m: sm, R: 0, n: [0, -0.7, 0.7], v: 0.26 });
      p.poly([[tx - 16, ty - 54], [tx + 16, ty - 54], [tx, ty - 64]], { m: sm, R: 0, n: [0, -0.5, 0.9], v: 0.22 });
      p.poly([[tx - 7, ty], [tx + 7, ty], [tx + 7, ty - 28], [tx - 7, ty - 28]], { m: M.ink, R: 0, v: 0.12, ol: 1 });
      // piso alto: medios frontones y templete circular
      for (const s2 of [-1, 1]) {
        const cx = tx + s2 * 34;
        p.poly([[cx - 12, ty - 64], [cx + 12, ty - 64], [cx + 12, ty - 92], [cx - 12, ty - 92]], { m: sm, R: 0, n: F, v: 0.06 });
        for (const c of [-10, 6]) p.poly([[cx + c, ty - 64], [cx + c + 4, ty - 64], [cx + c + 4, ty - 90], [cx + c, ty - 90]], { m: sm, R: 2, v: 0.18 });
        p.poly(s2 < 0 ? [[cx - 13, ty - 92], [cx + 13, ty - 92], [cx + 13, ty - 99]] : [[cx - 13, ty - 92], [cx + 13, ty - 92], [cx - 13, ty - 99]], { m: sm, R: 0, n: [0, -0.6, 0.8], v: 0.24 });
      }
      p.poly([[tx - 12, ty - 64], [tx + 12, ty - 64], [tx + 12, ty - 90], [tx - 12, ty - 90]], { m: sm, R: 6, n: F, v: 0.14 });
      for (const c of [-9, -2, 5]) p.poly([[tx + c, ty - 64], [tx + c + 3, ty - 64], [tx + c + 3, ty - 89], [tx + c, ty - 89]], { m: sm, R: 1.5, v: 0.24 });
      p.poly([[tx - 13, ty - 90], [tx + 13, ty - 90], [tx, ty - 100]], { m: sm, R: 2, n: [0, -0.6, 0.8], v: 0.24 });
      p.ell(tx, ty - 102, 2.4, 3, { m: sm, R: 2, v: 0.3 });
    }
  });
  // ---- suelo cercano
  const groundM = { galilea: M.dirt, jordan: M.dirt, jordanNoche: M.dirt, jerico: M.dirt, desierto: M.sand, jerusalen: M.dirt, eufrates: M.sand, arabia: M.sand, petra: M.sand, reyesJerusalen: M.dirt, regreso: M.dirt }[name];
  S.parallax(LW, B.still ? 0 : 30, p => {
    const rr = rng(name.length * 7 + 1);
    const green0 = ['galilea', 'jordan', 'jordanNoche', 'jerico', 'jerusalen', 'regreso', 'reyesJerusalen'].includes(name);
    nearGround(p, rr, { m: groundM, path: M.sand, stone: name === 'petra' ? M.rosestone : M.rock, green: green0 });
    const green = ['galilea', 'jordan', 'jordanNoche', 'jerico', 'jerusalen', 'regreso', 'reyesJerusalen'].includes(name);
    for (let k = 0; k < (green ? 40 : 14); k++) E.grassTuft(p, rr() * LW, 236 + rr() * 34, 5 + rr() * 6, rr, green ? M.grass : M.olive);
    if (name === 'galilea') for (let k = 0; k < 30; k++) { const x = rr() * LW, y = 238 + rr() * 30; p.pix(x, y, M.red, { v: 0.5 }); p.pix(x + 1, y, M.red, { v: 0.3 }); }
    if (name === 'jordanNoche') E.campfire(p, 300, 244);
    if (name === 'petra' || name === 'desierto') for (let k = 0; k < 10; k++) { const x = rr() * LW; wrap(x, 16, xx => p.ell(xx, 250 + rr() * 16, 6 + rr() * 8, 4 + rr() * 4, { m: name === 'petra' ? M.rosestone : M.rock, R: 4, n: [0, -0.5, 0.9], v: 0.05 })); }
  });
  // ---- primer plano rápido
  if (!B.still) S.parallax(LW, 52, p => {
    const rr = rng(name.length * 3 + 5);
    for (let k = 0; k < 7; k++) {
      const x = rr() * LW;
      wrap(x, 30, xx => {
        if (['galilea', 'jordan', 'jerico', 'regreso'].includes(name)) { E.bush(p, xx, 272, 7 + rr() * 5, rr, M.leaf); }
        else p.ell(xx, 272, 12 + rr() * 10, 8 + rr() * 5, { m: M.rock, R: 6, n: [0, -0.5, 0.85], v: -0.05 });
      });
    }
  }, true);
}

export function buildCamino(R, name = 'galilea') {
  const B = BIOMES[name] || BIOMES.galilea, S = new Stage(R), r = rng(3);
  const t = B.time, back = B.walkers === 'kingsBack';
  TIME = t;
  E.sky(S.p, t, W, H, { horizon: 196, sunX: B.sun, mx: 300 });
  if (t === 'dusk' || t === 'dawn') {
    const sx = B.sun ?? 100, sy = t === 'dawn' ? 170 : 168;
    S.p.circ(sx, sy, 13, { m: M.fire, R: 0, ol: 0, v: 0.86 });
    S.p.circ(sx, sy, 10, { m: M.fire, R: 0, ol: 0, v: 0.98 });
    E.clouds(S.p, r, 5, 60, 130, W, { m: M.clouddusk });
  }
  if (t === 'day') E.clouds(S.p, r, 6, 30, 110);
  paintBiome(S, B, name, r);
  Object.assign(S.light, LIGHT[t]);
  if (t === 'dusk') { S.light.moonDir = [-0.8, -0.32, 0.5]; S.light.moon = 0.72; S.light.amb0 = 0.08; S.light.amb1 = 0.08; }
  const stars = t === 'night' ? E.makeStars(S.bg, 220, 9) : [];
  const walk = tt => `${Math.floor(tt * 6) % 4}`;
  const sc = 0.92;

  if (B.walkers === 'family') {
    S.add({ w: 150, h: 150, ox: 66, oy: 124, x: 190, y: GROUND, scale: sc, shadow: [26, 3], key: walk, draw: (p, tt, k) => {
      const w = +k, ms = sc * 1.3; p.s = ms; const res = mulaPie(p, { w, tail: w % 2 }, { bags: false }); p.s = sc;
      const ox = p.ox, oy = p.oy; p.ox += res.saddle[0] * ms - 2 * sc; p.oy += res.saddle[1] * ms + 13 * sc;
      persona(p, { ...CAST.maria, pose: 'side', armN: 'hold', armF: 'hold' }, { b: w === 1 ? 1 : 0 });
      p.ox = ox; p.oy = oy;
    } });
    S.add({ w: 80, h: 140, ox: 34, oy: 124, x: 262, y: GROUND + 2, scale: sc, shadow: [10, 2.5], key: walk, draw: (p, tt, k) => persona(p, { ...CAST.joseWalk }, { w: +k }) });
  } else if (B.walkers === 'camp') {
    S.add({ w: 150, h: 120, ox: 66, oy: 110, x: 196, y: GROUND + 4, scale: sc * 1.3, shadow: [24, 3], key: tt => `${(tt % 6) < 3 ? 1 : 0}`, draw: (p, tt, k) => mulaPie(p, { ear: +k }, { bags: true }) });
    S.add({ w: 80, h: 120, ox: 34, oy: 104, x: 262, y: GROUND + 14, scale: sc, key: tt => `${((tt % 4.4) < 2) ? 1 : 0}`, draw: (p, tt, k) => persona(p, { ...CAST.maria, pose: 'kneel', armN: 'pray', armF: 'pray' }, { b: +k }) });
    S.add({ w: 80, h: 120, ox: 34, oy: 104, x: 346, y: GROUND + 16, flip: true, scale: sc, key: tt => `${((tt % 5) < 2.4) ? 1 : 0}`, draw: (p, tt, k) => persona(p, { ...CAST.jose, pose: 'kneel', armN: 'forward', item: {} }, { b: +k }) });
    S.lightsFn = tt => [{ x: 300, y: 238, z: 14, r: 150, i: 1.05 * (0.92 + 0.08 * noise(Math.floor(tt * 12) * 0.4, 1)) }];
  } else {
    const kings = [['melchor', M.red, M.brass], ['gaspar', M.teal, M.brass], ['baltasar', M.purple, M.brass]];
    const ks = 0.56;
    kings.forEach(([k, cloth, trim], i) => {
      S.add({ w: 150, h: 190, ox: 70, oy: 170, x: back ? 330 - i * 100 : 120 + i * 100, y: GROUND + (i % 2) * 3, scale: ks, flip: back, shadow: [18, 2.5], key: tt => `${Math.floor(tt * 5 + i * 1.3) % 4}`, draw: (p, tt, kk) => {
        const w = +kk, cs = ks * 1.22; p.s = cs; const res = camello(p, { w }, { cloth, trim, packs: i === 1 }); p.s = ks;
        const ox = p.ox, oy = p.oy; p.ox += res.saddle[0] * cs; p.oy += res.saddle[1] * cs + 13 * ks;
        persona(p, { ...CAST[k], pose: 'ride', armN: 'reins', item: {}, mantle: { ...CAST[k].mantle } }, {});
        p.ox = ox; p.oy = oy;
      } });
    });
    S.add({ w: 60, h: 90, ox: 26, oy: 80, x: back ? 70 : 420, y: GROUND + 4, scale: 0.6, flip: back, shadow: [7, 2], key: walk, draw: (p, tt, k) => persona(p, { ...CAST.paje, pose: 'walk' }, { w: +k }) });
    S.torch = back ? [70 - 7, GROUND + 4 - 54] : [420 + 7, GROUND + 4 - 54];
    if (t === 'night') S.lightsFn = tt => [{ x: S.torch[0], y: S.torch[1], z: 20, r: 150, i: 0.9 * (0.9 + 0.1 * noise(Math.floor(tt * 12) * 0.5, 2)) }];
  }
  if (back) for (const l of [...S.para, ...S.paraTop]) l.speed *= -1;
  S.done();
  const camp = B.walkers === 'camp';
  S.fx = tt => {
    if (stars.length) { E.drawStars(R, stars, tt); E.shootingStar(R, tt, M.sky, 17); }
    if (t === 'night' && !B.star) { R.glow(390, 40, 22, [200, 210, 255], 0.25, 5); for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36 && (x + 2) * (x + 2) + (y - 1) * (y - 1) > 26) R.set(390 + x, 40 + y, [236, 232, 214]); }
    if (B.star) E.bethlehemStar(R, 360, 34, tt, { dir: [1.6, -0.5] });
    if (t === 'day' || t === 'dusk' || t === 'dawn') E.birds(R, tt, 5, 60, 70, t === 'day' ? [40, 44, 60] : [30, 20, 36]);
    if (name === 'jordan' || name === 'jordanNoche' || name === 'eufrates') E.shimmer(R, S.waterMask || (S.waterMask = waterPixels(R)), tt, waterM());
    if (camp) { E.flames(R, 300, 242, 1.1, tt); E.smoke(R, 302, 222, tt, 10); }
    if (S.torch) E.flames(R, S.torch[0], S.torch[1], 0.45, tt, { big: t === 'night' });
    if (name === 'desierto' && S.innX != null) {
      const off = ((tt * 10) % LW + LW) % LW, sx = S.innX - off; for (const xx of [sx, sx + LW]) if (xx > -60 && xx < W + 60) R.glow(xx, 200, 26, [255, 160, 70], 0.18, 4);
    }
  };
  // posición del agua (en pantalla cambia con el paralaje: se recalcula cada pocos fotogramas)
  function waterPixels(Rr) { const out = []; const wm = waterM(); for (let i = 0; i < W * H; i++) if (Rr.G.mat[i] === wm) out.push(i); setTimeout(() => { S.waterMask = null; }, 300); return out; }
  S.focus = 0.5;
  return S;
}
