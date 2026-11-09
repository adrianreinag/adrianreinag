// Figuras del belén pintadas con primitivas volumétricas. Coordenadas locales: (0,0) en el suelo,
// y negativa hacia arriba. Cada función recibe el pintor y el estado de animación.
import { M, newObj, noise, smooth, lerp } from './engine.js';

// pliegues de tela: perturban la normal
export const vfold = (freq, amp, ph = 0) => (x, y) => [Math.sin(x * freq + y * 0.1 + ph + noise(x * 0.15, y * 0.07) * 2.6) * amp, 0];
export const radial = (cx, cy, k, amp, r0 = 4, r1 = 16) => (x, y) => {
  const dx = x - cx, dy = y - cy, a = Math.atan2(dy, dx), r = Math.hypot(dx, dy);
  const f = Math.sin(a * k + noise(x * 0.2, y * 0.2) * 2.2) * amp * smooth(r0, r1, r);
  return [-Math.sin(a) * f, Math.cos(a) * f];
};
const curly = (s, a) => (x, y) => [(noise(x * s, y * s) - 0.5) * a, (noise(x * s + 9.3, y * s - 4.1) - 0.5) * a];
const up = (b, lim) => pts => pts.map(([x, y]) => [x, y < lim ? y - b : y]);

// ---------------- María arrodillada, mirando a la derecha ----------------
export function maria(p, t) {
  const b = t.b || 0, U = up(b, -30);
  const robeF = vfold(1.05, 0.32), mantF = radial(-1, -50, 15, 0.42, 5, 18);
  // túnica rosa (debajo)
  p.poly(U([[3, -48], [8, -47], [11, -42], [11.5, -35], [11, -28], [12.5, -20], [15, -11], [17, -4], [18.5, 0], [6, 1], [0, -4], [-2, -14], [-1, -28], [0, -40]]), { m: M.rose, smooth: 2, R: 5, fold: robeF });
  // velo blanco: cabeza y caída al pecho
  p.ell(6.6, -55.6 - b, 6.2, 7, { m: M.white, R: 4, v: 0.08 });
  p.poly(U([[3, -51], [11, -50.5], [12.8, -47], [10.5, -43.8], [4, -43.4], [2, -47]]), { m: M.white, smooth: 1, R: 3, v: 0.08, fold: vfold(1.4, 0.25) });
  // rostro
  const fo = newObj();
  p.ell(8.7, -54.7 - b, 4.2, 5.2, { m: M.skin, R: 4, obj: fo, v: 0.1 });
  p.ell(12.6, -54.3 - b, 1.25, 1.7, { m: M.skin, R: 1.5, obj: fo, v: 0.1 });
  p.ell(10.4, -50.8 - b, 2.5, 1.7, { m: M.skin, R: 2, obj: fo, v: 0.1 });
  // manto azul: capucha y caída hasta el suelo
  p.poly(U([[12.2, -61.6], [9, -64.2], [4, -64.8], [-1, -62.6], [-4.5, -58], [-6.5, -52], [-9.5, -45], [-12.5, -36], [-15.5, -26], [-19.5, -16], [-24.5, -7], [-30.5, -1.5], [-34, 1], [-12, 1.2], [-2, 1.2], [2, -6], [3.2, -16], [4.2, -26], [6, -33], [7.2, -40], [6.2, -45], [4.4, -48], [3.8, -52], [4.4, -57], [7, -60.2], [10, -60.8]]), { m: M.blue, smooth: 2, R: 6, fold: mantF });
  // ribete dorado del manto
  p.crease(U([[4.4, -57], [3.8, -52], [4.4, -48], [6.2, -45]]), 0.25);
  // antebrazo (manga rosa) y manos juntas
  p.cap(5, -34 - b, 12, -41 - b, 2.9, 2.1, { m: M.rose, R: 2.6, fold: vfold(2, 0.2) });
  p.poly(U([[11, -40], [13, -43.6], [15.2, -47.6], [16.7, -48.8], [17.2, -46], [16.2, -42], [14, -39.4], [12, -38.9]]), { m: M.skin, smooth: 1, R: 2 });
  p.crease(U([[13.6, -41], [16.2, -46.8]]), -0.18);
  // detalles del rostro: ojos bajos, ceja, boca, cabello
  const y = -b;
  p.dot(9.6, -55.4 + y, M.ink, 0.3); p.dot(10.6, -55.2 + y, M.ink, 0.3);
  p.dot(9.6, -57.2 + y, M.skin, -0.28, true); p.dot(10.7, -57.4 + y, M.skin, -0.28, true);
  p.dot(11.4, -51.8 + y, M.lips, 0.25);
  p.dot(10.8, -53.4 + y, M.skin, 0.08, true);
  p.dot(5.4, -59.4 + y, M.hair, 0.1); p.dot(6.4, -59.9 + y, M.hair, 0.15); p.dot(5.2, -58.4 + y, M.hair, 0.05);
}

// ---------------- San José de pie, mirando a la izquierda, con la vara florida ----------------
export function jose(p, t) {
  const b = t.b || 0, U = up(b, -50);
  const tunF = vfold(0.95, 0.34, 1.3), manF = vfold(0.7, 0.4, 0.4);
  // manto por detrás (lado derecho, espalda)
  p.poly(U([[1, -82], [7, -81], [11, -78], [14, -71], [15.8, -58], [17, -42], [18, -26], [17.6, -12], [12, -11], [9.6, -22], [9, -38], [7.6, -54], [5, -68], [2, -76]]), { m: M.ochre, smooth: 2, R: 5, fold: manF, v: -0.04 });
  // túnica verde
  p.poly(U([[-8, -79], [-3, -81], [3, -81], [8, -78], [10.5, -68], [11, -56], [11.5, -40], [12.5, -24], [13.5, -10], [14.2, -2], [10, 0.6], [0, 0.6], [-11, 0.6], [-13.8, -2], [-13, -10], [-12, -24], [-11, -40], [-10.5, -56], [-10.5, -68]]), { m: M.green, smooth: 2, R: 6, fold: tunF });
  // sandalias y pies
  p.ell(-9.5, -0.7, 3.6, 1.5, { m: M.wood, R: 1 });
  p.ell(4.5, -0.7, 3, 1.4, { m: M.wood, R: 1 });
  p.ell(-11.6, -1.4, 1.7, 1, { m: M.skin, R: 1 });
  // cinturón de cuerda
  p.cap(-11, -49.5 - b, -2, -50.5 - b, 1.5, 1.5, { m: M.rope, R: 1.4 });
  p.cap(-6, -50 - b, -7.5, -40 - b, 0.8, 0.7, { m: M.rope, R: 0.8 });
  // manto cruzado sobre el hombro
  p.poly(U([[-9, -79], [-4, -82.2], [2, -81.8], [6, -76], [10, -64], [12.2, -50], [8, -45.6], [2, -54], [-4, -64], [-9.2, -71]]), { m: M.ochre, smooth: 2, R: 4, fold: radial(-6, -82, 10, 0.35, 3, 14) });
  p.crease(U([[-8.6, -71], [-4, -64], [2, -54], [7.6, -46]]), 0.2);
  // mano derecha sobre el pecho
  p.ell(-2.4, -66 - b, 2.3, 2.6, { m: M.skin, R: 2 });
  // cabeza
  const fo = newObj();
  p.ell(-2, -87 - b, 5, 6.2, { m: M.skin, R: 4.5, obj: fo, v: 0.06 });
  p.ell(-7, -86.6 - b, 1.35, 1.9, { m: M.skin, R: 1.5, obj: fo });
  // pelo canoso
  p.poly(U([[-6.6, -90.4], [-5, -93.6], [-1, -94.8], [3, -93.8], [5.8, -90.6], [6.8, -86], [6.2, -82.4], [3, -81.4], [2.6, -85], [2, -88], [-1, -90.2], [-4, -91]]), { m: M.beard, smooth: 1, R: 3, v: -0.06, fold: curly(0.8, 0.8) });
  p.ell(1.7, -86.4 - b, 1.25, 1.9, { m: M.skin, R: 1.2 });
  // barba
  p.poly(U([[-6.9, -84.8], [-5.6, -82.6], [-6.3, -80.2], [-4.8, -76.8], [-2.6, -74.8], [0.3, -76], [2.7, -80], [3.3, -84], [1.2, -84.6], [0, -83], [-2.6, -82.6], [-4.6, -84]]), { m: M.beard, smooth: 1, R: 3, fold: curly(0.9, 0.9) });
  // brazo izquierdo (delante) que sujeta la vara
  p.tube(U([[-7, -77], [-10.6, -68], [-12.8, -63]]), 3.3, 2.5, { m: M.green, R: 2.6, fold: vfold(1.6, 0.25) });
  p.cap(-15.6, -106, -13.2, 0.4, 1.25, 1.4, { m: M.wood, R: 1.3, v: (x, y) => (noise(x * 2, y * 0.5) - 0.5) * 0.2 });
  p.ell(-14, -62 - b, 2.4, 2.7, { m: M.skin, R: 2 });
  p.crease(U([[-15.6, -63], [-12.6, -63.4]]), -0.2);
  // vara florida: azucenas blancas
  for (const [x, y, r] of [[-17.4, -107.6, 1.5], [-14, -109.4, 1.4], [-15.8, -104.4, 1.2], [-13.2, -105.6, 1.1]]) p.circ(x, y, r, { m: M.white, R: 1.4, v: 0.15 });
  p.dot(-16.4, -103.2, M.moss, 0.2); p.dot(-14.6, -102.4, M.moss, 0.2); p.dot(-17.4, -105.4, M.moss, 0.15);
  // rostro
  const y = -b;
  p.dot(-4.6, -88 + y, M.ink, 0.2); p.dot(-3.6, -88 + y, M.ink, 0.35);
  p.dot(-5.2, -89.6 + y, M.beard, -0.1); p.dot(-4.2, -89.8 + y, M.beard, -0.1); p.dot(-3.2, -89.7 + y, M.beard, -0.15);
  p.dot(-5.4, -82.8 + y, M.ink, 0.35);
  p.dot(-1.4, -85.2 + y, M.skin, -0.18, true);
}

// ---------------- El Niño en el pesebre ----------------
export function nino(p, t) {
  const a = t.a || 0;
  p.circ(-12, -6, 6.8, { m: M.gold, v: 0.5, ol: 0, R: 0 });
  p.circ(-12, -6, 5.6, { m: M.gold, v: 0.68, ol: 0, R: 0 });
  // pañales con fajas
  p.cap(-7, -4, 9, -3, 4.7, 3.7, { m: M.white, R: 3.6, v: 0.06, fold: vfold(0.9, 0.18) });
  for (const x of [-4, 0, 4, 8]) p.crease([[x - 1.5, -7.6], [x + 1.5, 0]], -0.22);
  // brazo que se alza
  const hx = -3 + a * 0.6, hy = -10 - a * 1.4;
  p.cap(-5, -6, hx, hy, 1.6, 1.4, { m: M.white, R: 1.4, v: 0.05 });
  p.circ(hx, hy - 0.8, 1.3, { m: M.skin, R: 1.2 });
  // cabeza
  const fo = newObj();
  p.circ(-11.6, -4.6, 4.3, { m: M.skin, R: 4, obj: fo, v: 0.04 });
  p.dot(-13.6, -8.4, M.hair, 0.3); p.dot(-12.6, -8.8, M.hair, 0.35); p.dot(-11.4, -8.8, M.hair, 0.3); p.dot(-14.4, -7.6, M.hair, 0.25);
  p.dot(-13, -4.8, M.ink, 0.35); p.dot(-10.2, -4.8, M.ink, 0.35);
  p.dot(-11.6, -2.6, M.lips, 0.3);
  p.dot(-14, -3.4, M.lips, 0.45); p.dot(-9.2, -3.4, M.lips, 0.45);
}

// ---------------- Pesebre de madera con paja y sábana ----------------
export function pesebre(p, o = {}) {
  for (const s of [-1, 1]) {
    p.cap(s * 21, -17, s * 14.5, 0, 1.9, 2.1, { m: M.wood, R: 1.7 });
    p.cap(s * 14.5, -17, s * 21, 0, 1.9, 2.1, { m: M.wood, R: 1.7 });
  }
  const grain = (x, y) => (noise(x * 0.12, y * 0.9) - 0.5) * 0.3;
  p.poly([[-24.5, -31], [24.5, -31], [20.5, -16], [-20.5, -16]], { m: M.wood, R: 3, v: grain });
  p.crease([[-22.6, -23.6], [22.6, -23.6]], -0.3);
  p.crease([[-22.6, -24.4], [22.6, -24.4]], 0.12);
  for (const x of [-17, 16]) { p.dot(x, -27.5, M.metal, 0.2); p.dot(x, -19.5, M.metal, 0.2); }
  // paja colmada
  const r = mulberry(7);
  for (let k = 0; k < 140; k++) {
    const x = -22 + r() * 44, y = -31 - r() * 5 * (1 - Math.abs(x) / 26), a = (r() - 0.5) * 1.6, l = 2 + r() * 5;
    p.cap(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l * 0.5, 0.5, 0.45, { m: M.straw, R: 0.6, ol: 0, v: (r() - 0.4) * 0.3 });
  }
  for (let k = 0; k < 16; k++) { const x = -23 + r() * 46, l = 2 + r() * 4; p.cap(x, -30.5, x + (r() - 0.5) * 3, -30.5 + l, 0.45, 0.4, { m: M.straw, R: 0.5, ol: 0, v: r() * 0.25 }); }
  // sábana que cuelga por delante
  if (o.sheet !== false) p.poly([[-17, -31.4], [12, -31.4], [13.4, -26], [10.6, -21.6], [6.4, -24], [1.4, -20.8], [-3.8, -23.2], [-9, -20.2], [-13.4, -23], [-17, -27]], { m: M.white, smooth: 1, R: 3, fold: vfold(1.1, 0.4, 2) });
}

export function mulberry(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------- Buey tumbado, mirando a la derecha ----------------
export function buey(p, t) {
  const h = t.h || 0, tl = t.tail || 0, e = t.e || 0;
  const hair = curly(0.5, 0.35);
  const body = newObj();
  // cola
  p.tube([[-31, -24], [-36 - tl, -15], [-35 - tl * 2, -5]], 1.5, 1.1, { m: M.ox, R: 1.3 });
  p.ell(-35 - tl * 2, -3.5, 1.8, 2.6, { m: M.mane, R: 1.5 });
  p.ell(0, -17, 33, 16.5, { m: M.ox, R: 13, obj: body, fold: hair });
  p.ell(-19, -20, 16, 15, { m: M.ox, R: 12, obj: body, fold: hair });
  p.ell(18, -23.5, 15, 13.5, { m: M.ox, R: 10, obj: body, fold: hair });
  // patas recogidas
  p.ell(-12, -6.5, 13, 6, { m: M.ox, R: 5, fold: hair });
  p.ell(-26, -2.6, 3.2, 2.2, { m: M.horn, R: 1.5, v: -0.35 });
  p.cap(22, -5, 36, -3, 3.9, 3.1, { m: M.ox, R: 3 });
  p.ell(38.6, -2.9, 2.8, 2.3, { m: M.horn, R: 1.5, v: -0.35 });
  // cuello y papada
  p.cap(20, -26, 36, -30 - h, 10.5, 8.2, { m: M.ox, R: 8, obj: body, fold: hair });
  p.ell(32, -21.5 - h, 5.5, 5.5, { m: M.ox, R: 4, obj: body });
  // cabeza
  const hd = newObj();
  p.ell(35.5, -35.5 - h, 4.8, 2.1, { m: M.ox, R: 2, rot: -0.35 - e * 0.45 });
  p.ell(42, -31 - h, 7.6, 6.6, { m: M.ox, R: 6, obj: hd, rot: 0.35, fold: hair });
  p.ell(49.2, -26 - h, 5.6, 4.7, { m: M.muzzle, R: 4, rot: 0.45, obj: hd });
  p.tube([[38.4, -36 - h], [35.8, -41 - h], [38.6, -45.4 - h]], 1.9, 0.8, { m: M.horn, R: 1.5 });
  p.tube([[45.4, -37 - h], [47.4, -42 - h], [45.6, -45.8 - h]], 1.6, 0.7, { m: M.horn, R: 1.4, v: -0.1 });
  p.ell(42.6, -37.8 - h, 3, 1.5, { m: M.ox, R: 1.5, v: 0.12, obj: hd });
  const y = -h;
  p.dot(44, -32.4 + y, M.ink, 0.25); p.dot(45, -32.6 + y, M.ink, 0.1); p.dot(44, -33.4 + y, M.ox, -0.25, true);
  p.dot(52.6, -25.6 + y, M.ink, 0.15); p.dot(51, -23.6 + y, M.ink, 0.2); p.crease([[47.4, -22.6 + y], [50.6, -22 + y]], -0.25);
}

// ---------------- Mula tumbada, mirando a la izquierda, con manta tejida ----------------
export function mula(p, t) {
  const ea = t.ear || 0, tl = t.tail || 0;
  const hair = curly(0.55, 0.3);
  p.tube([[29, -20], [33 + tl, -12], [33 + tl * 2, -3]], 1.2, 0.9, { m: M.mule, R: 1 });
  p.ell(33 + tl * 2, -2.6, 1.6, 2.6, { m: M.mane, R: 1.4 });
  const body = newObj();
  p.ell(0, -16, 30, 15, { m: M.mule, R: 12, obj: body, fold: hair });
  p.ell(17, -18.5, 14, 14, { m: M.mule, R: 11, obj: body, fold: hair });
  p.ell(-16, -19.5, 12, 12, { m: M.mule, R: 9, obj: body, fold: hair });
  p.ell(2, -6, 24, 6, { m: M.mulel, R: 4, v: -0.1 });
  // manta de lana a rayas sobre el lomo
  const stripes = (x, y) => (Math.floor((x + 40) / 3) % 3 === 0 ? -0.3 : Math.floor((x + 40) / 3) % 3 === 1 ? 0.12 : 0);
  p.poly([[-13, -31.5], [11, -32.5], [14, -19], [-11, -17.5]], { m: M.weave, smooth: 1, R: 4, v: stripes, fold: vfold(0.8, 0.2) });
  p.crease([[-11, -18.4], [13.6, -19.8]], 0.3);
  // patas
  p.cap(-18, -4, -32, -2.6, 3.1, 2.5, { m: M.mule, R: 2.6 });
  p.ell(-34, -2.4, 2.4, 2.1, { m: M.mane, R: 1.4, v: 0.2 });
  p.ell(12, -6, 10, 5, { m: M.mule, R: 4 });
  // cuello, crin, cabeza
  p.cap(-17, -24, -31, -35, 8.2, 6, { m: M.mule, R: 6, obj: body, fold: hair });
  p.tube([[-12, -31], [-21, -37.6], [-30, -42.4], [-34, -44]], 2.2, 1.6, { m: M.mane, R: 1.6, fold: curly(1, 0.6) });
  const hd = newObj();
  p.tube([[-34, -44], [-30.6 + ea, -51], [-31 + ea * 1.4, -57.4]], 2.1, 0.8, { m: M.mule, R: 1.6 });
  p.crease([[-32.6, -46], [-31 + ea * 1.2, -54.6]], -0.3);
  p.cap(-35, -41, -50, -30, 6, 4.3, { m: M.mule, R: 4.5, obj: hd, v: 0.1 });
  p.ell(-50.4, -30, 4.4, 3.8, { m: M.mulel, R: 3, obj: hd, v: 0.05 });
  p.ell(-37.6, -39.6, 2.6, 2.2, { m: M.mulel, R: 2, obj: hd, v: -0.15 });
  p.tube([[-37.2, -44], [-38.6 - ea * 0.6, -50], [-39.6 - ea, -56]], 2, 0.8, { m: M.mule, R: 1.6, v: -0.08 });
  p.crease([[-38.4, -46], [-39.4 - ea, -54]], -0.3);
  p.dot(-37.6, -39.6, M.ink, 0.3); p.dot(-38.6, -39.6, M.ink, 0.1);
  p.dot(-53.2, -30.6, M.ink, 0.2); p.dot(-52.6, -31.4, M.ink, 0.15); p.crease([[-53, -27.6], [-48.6, -27]], -0.3);
}

// ---------------- Cordero (oveja awassi, cara parda) ----------------
export function cordero(p, t) {
  const e = t.e || 0;
  const wsdf = (x, y) => 0;
  const wf = curly(0.9, 1.1);
  p.ell(10.5, -6.5, 5.5, 4.6, { m: M.wool, R: 4, fold: wf, v: -0.05 });
  const body = newObj();
  p.shape((x, y) => Math.hypot((x - 1) / 13, (y + 9) / 8.6) * 8.6 - 8.6 + (noise(x * 0.7, y * 0.7) - 0.5) * 2.4, [-14, -20, 16, 2], { m: M.wool, R: 7, fold: wf, obj: body });
  p.ell(-6, -1.6, 4, 1.8, { m: M.sheepf, R: 1.4 });
  const hd = newObj();
  p.ell(-12.4, -12.6, 4.4, 3.4, { m: M.sheepf, R: 3, rot: 0.5, obj: hd });
  p.ell(-15.6, -10.6, 2.4, 2, { m: M.sheepf, R: 1.8, obj: hd, v: 0.08 });
  p.ell(-9.6, -11 + e * 0.6, 3, 1.3, { m: M.sheepf, R: 1, rot: 0.9 + e * 0.3, v: -0.08 });
  p.shape((x, y) => Math.hypot((x + 9.5) / 4, (y + 15.5) / 2.6) * 2.6 - 2.6 + (noise(x, y) - 0.5) * 1.5, [-14, -19, -5, -12], { m: M.wool, R: 2, fold: wf });
  p.dot(-13.2, -13.4, M.ink, 0.3); p.dot(-17, -10.4, M.ink, 0.25);
}

// ---------------- Gato dormido ----------------
export function gato(p, t) {
  const tt = t.tail || 0;
  const str = (x, y) => (Math.sin(x * 1.3 + y * 0.4) > 0.55 ? -0.22 : 0);
  p.ell(1, -4.2, 7.6, 4.4, { m: M.cat, R: 4, v: str });
  p.circ(-5.4, -5.4, 3.4, { m: M.cat, R: 3, v: 0.04 });
  p.poly([[-8.4, -7], [-8, -10.4], [-6.2, -8.2]], { m: M.cat, R: 1 });
  p.poly([[-4.6, -8.6], [-3, -11], [-2.2, -8]], { m: M.cat, R: 1 });
  p.tube([[7.6, -2.6], [4, -0.6], [-3, -0.4], [-7 - tt, -1.2 - tt * 0.6]], 1.5, 1.2, { m: M.cat, R: 1.2, v: str });
  p.crease([[-7, -5.4], [-6, -5.2]], -0.4); p.crease([[-4.4, -5.4], [-3.6, -5.2]], -0.4);
  p.dot(-5.4, -3.8, M.lips, 0.3);
}

// ---------------- Paloma ----------------
export function paloma(p, t) {
  const h = t.h || 0;
  p.tube([[2.4, -2.6], [5.6, -1.4]], 1.4, 0.8, { m: M.dove, R: 1, v: -0.12 });
  p.ell(0, -3, 3.6, 2.5, { m: M.dove, R: 2.2 });
  p.ell(0.6, -3.4, 2.2, 1.4, { m: M.dove, R: 1.2, v: -0.12 });
  p.circ(-2.8 - h * 0.6, -5.2 + h * 0.8, 1.6, { m: M.dove, R: 1.5, v: 0.05 });
  p.dot(-4.6 - h * 0.6, -5 + h * 0.8, M.clay, 0.3);
  p.dot(-3.2 - h * 0.6, -5.6 + h * 0.8, M.ink, 0.2);
  p.dot(-1, -0.4, M.clay, 0.2); p.dot(1, -0.4, M.clay, 0.2);
}
