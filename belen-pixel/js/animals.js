// Animales de pie y andando (vista lateral, mirando a la derecha): mula, camello, oveja, perro.
import { M, newObj, noise, lerp } from './engine.js';
import { vfold } from './figures.js';

const curly = (s, a) => (x, y) => [(noise(x * s, y * s) - 0.5) * a, (noise(x * s + 9.3, y * s - 4.1) - 0.5) * a];

// patas con dos tramos; fase 0..3 (paso diagonal)
function leg(p, hx, hy, len, ph, o) {
  const a = Math.sin(ph) * 0.42, lift = Math.max(0, Math.cos(ph)) * (o.lift ?? 3);
  const kx = hx + Math.sin(a) * len * 0.5, ky = hy + len * 0.5 - lift * 0.4;
  const fx = hx + Math.sin(a) * len + (o.back ? -1.5 : 1.5) * Math.max(0, Math.cos(ph)), fy = hy + len - lift;
  p.tube([[hx, hy], [kx + (o.back ? -1.4 : 1), ky], [fx, Math.min(0, fy)]], o.r0 ?? 3, o.r1 ?? 1.6, { m: o.m, R: 2, v: o.v || 0, obj: o.obj });
  p.ell(fx + 0.6, Math.min(0, fy) - 0.8, (o.r1 ?? 1.6) + 0.7, 1.3, { m: o.hoof ?? M.mane, R: 1, v: 0.1 });
}

// ---------------- Mula andando (o parada) con manta ----------------
export function mulaPie(p, t, o = {}) {
  const w = t.w ?? -1, ph = w < 0 ? null : (w * Math.PI) / 2;
  const bob = w === 1 || w === 3 ? -0.8 : 0, hair = curly(0.55, 0.3), m = o.m ?? M.mule;
  const P = (k) => (ph == null ? Math.PI / 2 * (k % 2 ? 0.2 : -0.2) : ph + k * Math.PI);
  // patas lejanas
  leg(p, 13, -26 + bob, 25, P(1), { m, v: -0.16 });
  leg(p, -14, -27 + bob, 26, P(0), { m, v: -0.16, back: true });
  // cola
  p.tube([[-21, -36 + bob], [-24 + (t.tail || 0), -27], [-23 + (t.tail || 0) * 1.5, -18]], 1.4, 0.9, { m, R: 1 });
  p.ell(-23 + (t.tail || 0) * 1.5, -16.5, 1.7, 2.6, { m: M.mane, R: 1.4 });
  const body = newObj();
  p.ell(0, -32 + bob, 22, 11, { m, R: 9, obj: body, fold: hair });
  p.ell(-12, -33 + bob, 11, 11, { m, R: 9, obj: body, fold: hair });
  p.ell(12, -33 + bob, 10, 11, { m, R: 8, obj: body, fold: hair });
  p.ell(0, -24.5 + bob, 17, 4, { m: M.mulel, R: 3, v: -0.1 });
  // cuello, crin y cabeza
  p.cap(15, -37 + bob, 25, -48 + bob, 7, 5, { m, R: 5, obj: body, fold: hair });
  p.tube([[10, -42 + bob], [18, -49 + bob], [24, -53 + bob]], 2, 1.4, { m: M.mane, R: 1.4, fold: curly(1, 0.6) });
  const hd = newObj(), ea = t.ear || 0;
  p.tube([[24, -52 + bob], [21.5 - ea, -59 + bob], [21 - ea * 1.6, -64 + bob]], 1.9, 0.8, { m, R: 1.5, v: -0.08 });
  p.cap(25, -50 + bob, 36, -41 + bob, 5, 3.4, { m, R: 3.8, obj: hd, v: 0.08 });
  p.ell(36.4, -40.6 + bob, 3.6, 3, { m: M.mulel, R: 2.6, obj: hd });
  p.tube([[26.6, -53 + bob], [25.8 + ea * 0.5, -60 + bob], [26.4 + ea, -65 + bob]], 1.9, 0.8, { m, R: 1.5 });
  p.dot(27.8, -49.6 + bob, M.ink, 0.3); p.dot(38.6, -41 + bob, M.ink, 0.2);
  // cabezada y ronzal
  p.crease([[27, -47 + bob], [33, -44 + bob]], -0.3, M.weave);
  if (o.rope) p.tube([[34, -42 + bob], [40, -38], ...o.rope], 0.5, 0.5, { m: M.rope, R: 0, ol: 0 });
  // manta y alforjas
  p.poly([[-12, -43.5 + bob], [10, -44 + bob], [12, -27 + bob], [-11, -26 + bob]], { m: o.blanket ?? M.weave, smooth: 1, R: 3, v: (x) => (Math.floor((x + 40) / 3) % 3 === 0 ? -0.3 : 0.06), fold: vfold(0.8, 0.2) });
  if (o.bags) { p.ell(-9, -27 + bob, 5.5, 6.4, { m: M.burlap, R: 4 }); p.ell(-2, -26 + bob, 4.4, 5.6, { m: M.weave, R: 4, v: 0.08 }); }
  // patas cercanas
  leg(p, 13, -26 + bob, 25, P(0), { m });
  leg(p, -14, -27 + bob, 26, P(1), { m, back: true });
  return { saddle: [0, -44 + bob] };
}

// ---------------- Camello andando con gualdrapa ----------------
export function camello(p, t, o = {}) {
  const w = t.w ?? -1, ph = w < 0 ? null : (w * Math.PI) / 2;
  const bob = w === 1 || w === 3 ? -1 : 0, m = M.camel, hair = curly(0.45, 0.32);
  const P = (k) => (ph == null ? (k % 2 ? 0.3 : -0.3) : ph + k * Math.PI);
  // paso de ambladura: patas del mismo lado a la vez
  leg(p, 15, -46 + bob, 46, P(1), { m, v: -0.16, r0: 4, r1: 2, lift: 5, hoof: M.camel });
  leg(p, -17, -48 + bob, 48, P(1), { m, v: -0.16, back: true, r0: 4.6, r1: 2, lift: 5, hoof: M.camel });
  p.tube([[-27, -60 + bob], [-31, -50], [-30, -40]], 1.4, 1, { m, R: 1 });
  p.ell(-30, -38.6, 1.6, 2.6, { m: M.brown, R: 1.4 });
  const body = newObj();
  p.ell(0, -58 + bob, 28, 14, { m, R: 11, obj: body, fold: hair });
  p.ell(-3, -71 + bob, 15, 10, { m, R: 9, obj: body, fold: hair });
  // cuello en S y cabeza
  p.tube([[20, -60 + bob], [30, -56 + bob], [38, -66 + bob], [40, -82 + bob]], 7.5, 4.4, { m, R: 4.5, obj: body, fold: hair });
  const hd = newObj();
  p.cap(39, -86 + bob, 51, -82 + bob, 5.4, 3.6, { m, R: 4, obj: hd, v: 0.06 });
  p.ell(51.6, -81.6 + bob, 3.4, 3, { m: M.muzzle, R: 2.4, obj: hd });
  p.ell(38.6, -91 + bob, 2, 1.4, { m, R: 1.2, rot: -0.6 });
  p.dot(43, -88 + bob, M.ink, 0.3); p.dot(54, -82.6 + bob, M.ink, 0.2); p.crease([[51, -79.6 + bob], [54.6, -79.6 + bob]], -0.3);
  // gualdrapa, borlas y silla
  const cl = o.cloth ?? M.red, tr = o.trim ?? M.brass;
  p.poly([[-16, -76 + bob], [13, -76 + bob], [17, -52 + bob], [-18, -51 + bob]], { m: cl, smooth: 1, R: 3, fold: vfold(0.6, 0.25) });
  p.crease([[-18, -53 + bob], [16.6, -54 + bob]], 0.4, tr);
  for (let x = -16; x <= 15; x += 4) { p.cap(x, -51.5 + bob, x, -48 + bob, 0.6, 0.6, { m: tr, R: 0.5, ol: 0 }); p.circ(x, -47.4 + bob, 1, { m: tr, R: 1, v: 0.2 }); }
  p.poly([[-9, -86 + bob], [8, -86 + bob], [9, -77 + bob], [-10, -77 + bob]], { m: o.saddle ?? M.brown, smooth: 1, R: 2.5, v: 0.05 });
  p.cap(-10, -88 + bob, -10, -79 + bob, 1.2, 1.2, { m: tr, R: 1 }); p.cap(9, -88 + bob, 9, -79 + bob, 1.2, 1.2, { m: tr, R: 1 });
  p.crease([[28, -62 + bob], [36, -71 + bob]], 0.35, tr);
  if (o.packs) { p.ell(-20, -64 + bob, 6, 7, { m: M.burlap, R: 4 }); p.ell(-24, -56 + bob, 4.4, 5, { m: M.weave, R: 3 }); p.poly([[14, -74 + bob], [22, -74 + bob], [22, -66 + bob], [14, -66 + bob]], { m: M.brass, R: 1.5, v: 0.05 }); }
  // campanilla
  p.cap(36, -66 + bob, 36, -62 + bob, 0.5, 0.5, { m: M.rope, R: 0, ol: 0 }); p.ell(36, -61 + bob, 1.6, 1.8, { m: M.brass, R: 1.2, v: 0.2 });
  leg(p, 15, -46 + bob, 46, P(0), { m, r0: 4, r1: 2, lift: 5, hoof: M.camel });
  leg(p, -17, -48 + bob, 48, P(0), { m, back: true, r0: 4.6, r1: 2, lift: 5, hoof: M.camel });
  return { saddle: [0, -86 + bob] };
}
// camello echado (descansando)
export function camelloEchado(p, t, o = {}) {
  const m = M.camel, hair = curly(0.45, 0.32), body = newObj();
  p.ell(-6, -8, 22, 8, { m, R: 6, fold: hair, v: -0.06 });
  p.ell(0, -16, 27, 13, { m, R: 10, obj: body, fold: hair });
  p.ell(-4, -27, 14, 9, { m, R: 8, obj: body, fold: hair });
  p.poly([[-17, -32], [10, -32], [14, -12], [-19, -12]], { m: o.cloth ?? M.red, smooth: 1, R: 3, fold: vfold(0.6, 0.25) });
  p.crease([[-19, -13], [13.6, -13.6]], 0.4, o.trim ?? M.brass);
  const hh = t.h || 0;
  p.tube([[20, -18], [30, -16], [38, -26 - hh], [40, -40 - hh]], 7, 4.2, { m, R: 4.5, obj: body, fold: hair });
  p.cap(39, -44 - hh, 50, -40 - hh, 5.2, 3.5, { m, R: 4, v: 0.06 });
  p.ell(50.6, -39.6 - hh, 3.3, 2.9, { m: M.muzzle, R: 2.4 });
  p.dot(43, -46 - hh, M.ink, 0.3);
  p.cap(22, -4, 36, -3, 3, 2.4, { m, R: 2.4 });
}

// ---------------- Oveja (de pie, paciendo o echada) ----------------
export function oveja(p, t, o = {}) {
  const graze = t.g || 0, wf = curly(0.9, 1.1), lie = o.lie;
  const y0 = lie ? 0 : -9;
  if (!lie) for (const [x, v] of [[7, -0.18], [-6, -0.18], [8.5, 0], [-4.5, 0]]) { p.cap(x, -10, x + 0.4, -0.5, 1.3, 1, { m: M.sheepf, R: 1, v }); }
  p.ell(-9, y0 - 6, 4, 3.6, { m: M.wool, R: 3, fold: wf, v: -0.05 });
  p.shape((x, y) => Math.hypot(x / 12, (y - y0 + 8) / 7.4) * 7.4 - 7.4 + (noise(x * 0.7, y * 0.7) - 0.5) * 2.4, [-14, y0 - 18, 14, y0 + 1], { m: M.wool, R: 6, fold: wf, v: o.v || 0 });
  const hd = newObj(), hy = graze ? y0 + 1 : y0 - 12, hx = graze ? 14 : 12.5;
  p.ell(hx, hy, 4.4, 3.2, { m: o.face ?? M.sheepf, R: 2.6, rot: graze ? 1 : 0.4, obj: hd });
  p.ell(hx - 2.4, hy - 1.6, 2.8, 1.2, { m: o.face ?? M.sheepf, R: 1, rot: -0.5 + (t.e || 0) * 0.4, v: -0.1 });
  p.dot(hx + 0.6, hy - 1, M.ink, 0.3);
}
// ---------------- Perro pastor ----------------
export function perro(p, t) {
  const tl = t.tail || 0;
  p.tube([[-10, -9], [-15, -12 - tl], [-17, -16 - tl * 1.5]], 1.6, 1, { m: M.cream, R: 1.2 });
  p.ell(-2, -6, 10, 5, { m: M.cream, R: 4, v: -0.05, fold: curly(0.8, 0.6) });
  p.cap(5, -9, 9, -15, 4, 3.4, { m: M.cream, R: 3 });
  p.cap(9, -17, 14, -14, 3.4, 2, { m: M.cream, R: 2.4, v: 0.05 });
  p.ell(8, -20, 1.6, 2.4, { m: M.brown, R: 1.2, rot: -0.3 });
  p.dot(11.6, -17, M.ink, 0.3); p.dot(15, -14.4, M.ink, 0.2);
  p.cap(4, -2, 12, -1.6, 1.6, 1.4, { m: M.cream, R: 1.2 });
}
