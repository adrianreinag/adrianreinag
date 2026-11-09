// Generador de personas del belén: una figura de 96 px de alto (a escala 1) mirando a la derecha,
// con poses (de pie, andando, arrodillada, montada), ropa, tocados, barbas y objetos configurables.
import { M, newObj, noise, smooth, lerp } from './engine.js';
import { vfold, radial } from './figures.js';

const curly = (s, a) => (x, y) => [(noise(x * s, y * s) - 0.5) * a, (noise(x * s + 9.3, y * s - 4.1) - 0.5) * a];

// posiciones de codo y mano (brazo cercano) según la pose
const ARMS = {
  down: [[3.5, -64], [4.5, -53]],
  staff: [[8, -66], [13, -62]],
  staffF: [[10, -66], [17, -63]],
  staffB: [[6, -65], [9, -61]],
  forward: [[9, -67], [17, -67]],
  offer: [[9, -63], [16, -64]],
  up: [[8.5, -87], [11, -98]],
  point: [[10, -83], [18, -92]],
  pray: [[5.5, -66], [10.5, -73]],
  chest: [[5, -66], [3.5, -71]],
  hold: [[6, -62], [11, -61]],
  torch: [[9, -72], [12, -81]],
  hip: [[7, -63], [4, -55]],
  flute: [[8, -70], [11, -77]],
  reins: [[8, -66], [14, -63]],
  open: [[9, -66], [15, -72]],
};

// o: { skin, tunic, short, mantle:{m,style}, head:{type,m,m2}, beard:{len,m}, armN, armF, item:{type,...}, belt, pose, lean }
export function persona(p, o, t = {}) {
  const pose = o.pose || 'stand';
  const w = pose === 'walk' ? (t.w ?? 0) % 4 : -1;
  const bob = w === 1 || w === 3 ? -1 : 0;
  const br = t.b || 0;
  const kneel = pose === 'kneel', ride = pose === 'ride' || pose === 'side';
  const drop = kneel ? 24 : ride ? 32 : 0;
  const lean = o.lean || 0;
  const skin = o.skin ?? M.skin;
  // transformación del tronco (respiración, balanceo al andar, arrodillarse, inclinarse)
  const T = (x, y) => {
    if (y < -45) { const k = -y - 45; x += k * lean; y += drop + bob - (y < -54 ? br : 0); }
    return [x, y];
  };
  const TP = pts => pts.map(([x, y]) => T(x, y));
  const ell = (cx, cy, rx, ry, op) => { const [x, y] = T(cx, cy); p.ell(x, y, rx, ry, op); };
  const cap = (ax, ay, bx, by, ra, rb, op) => { const [x1, y1] = T(ax, ay), [x2, y2] = T(bx, by); p.cap(x1, y1, x2, y2, ra, rb, op); };
  const tube = (pts, r0, r1, op) => p.tube(TP(pts), r0, r1, op);
  const dot = (x, y, m, v, k) => { const [X, Y] = T(x, y); p.dot(X, Y, m, v, k); };
  const crease = (pts, v, m) => p.crease(TP(pts), v, m);
  const tunic = o.tunic ?? M.brown, sleeve = o.sleeve ?? tunic;
  const tunF = vfold(0.95, 0.32, o.seed || 0);
  const item = o.item || {};
  const armN = w >= 0 && o.armN === 'staff' ? ARMS[w === 0 ? 'staffF' : w === 2 ? 'staffB' : 'staff'] : w >= 0 && !o.armN ? (w === 0 ? [[-0.5, -64], [-3.5, -54]] : w === 2 ? [[6.5, -64], [10, -55]] : ARMS.down) : ARMS[o.armN || 'down'];
  const armF = ARMS[o.armF || (w >= 0 ? 'down' : 'down')];

  // ---- objeto largo detrás (vara, cayado, lanza) va con la mano cercana; se pinta luego
  // ---- brazo lejano (detrás del cuerpo)
  if (!o.noFarArm) {
    const [e, h] = w >= 0 && !o.armF ? (w === 2 ? [[-1.5, -65], [-4.5, -55]] : w === 0 ? [[5, -65], [8, -56]] : ARMS.down) : armF;
    tube([[-2, -77], [e[0] - 4, e[1]], [h[0] - 4, h[1]]], 3, 2.2, { m: sleeve, R: 2.4, v: -0.12 });
    ell(h[0] - 4, h[1] - 0.4, 2.1, 2.4, { m: skin, R: 2, v: -0.1 });
  }
  // ---- capa real o manto trasero
  const mt = o.mantle;
  if (mt && (mt.style === 'back' || mt.style === 'cape')) {
    const cape = mt.style === 'cape';
    const pts = cape
      ? [[-1, -82], [-7.5, -81], [-12, -77], [-15, -66], [-17.5, -48], [-19.5, -28], [-21.5, -10], [-23.5, 0.6], [-6, 0.6], [-9.5, -12], [-9.5, -30], [-8, -54], [-5, -70]]
      : [[-1, -82], [-7, -81], [-11, -78], [-14, -71], [-15.8, -58], [-17, -42], [-18, -26], [-17.6, -12], [-12, -11], [-9.6, -22], [-9, -38], [-7.6, -54], [-5, -68], [-2, -76]];
    const P = kneel ? pts.map(([x, y]) => y > -45 ? [x - (y + 45) * 0.15 - 4, Math.min(0.6, y)] : [x, y]) : pts;
    p.poly(TP(P).map(([x, y]) => [x, kneel || ride ? Math.min(y, ride ? 2 : 0.6) : y]), { m: mt.m, smooth: 2, R: 5, fold: vfold(0.7, 0.4, 0.4), v: -0.04 });
    if (cape && mt.trim) crease(P.slice(5, 9), 0.35, mt.trim);
  }
  // ---- piernas
  const legM = o.legs ?? skin;
  if (o.short && !kneel && !ride && !o.noBody) {
    const L = w < 0 ? [[[3, -25], [4, -4]], [[-2, -25], [-3, -4]]]
      : w === 0 ? [[[7, -25], [12, -4]], [[-3, -24], [-10, -6]]]
      : w === 1 ? [[[4, -25], [2, -4]], [[1, -27], [-4, -9]]]
      : w === 2 ? [[[-3, -24], [-10, -6]], [[7, -25], [12, -4]]]
      : [[[1, -27], [-4, -9]], [[4, -25], [2, -4]]];
    const [near, far] = L;
    for (const [leg, v] of [[far, -0.14], [near, 0]]) {
      p.tube([[v ? -1 : 1, -40], leg[0], leg[1]], 3.4, 2.2, { m: legM, R: 2.4, v });
      p.ell(leg[1][0] + 2, leg[1][1] + 2.4, 3, 1.4, { m: M.wood, R: 1, v });
    }
  }
  // ---- túnica (tronco + falda)
  let skirt;
  if (kneel) skirt = [[-11, -36], [-12.5, -30], [-14, -18], [-16, -6], [-15, 0.6], [20, 0.6], [19, -4], [16, -13], [13, -22], [11.5, -36]];
  else if (ride) skirt = [[-12, -9], [-6, -7], [7, -7.5], [9, -1], [15, -0.5], [15.5, -8], [13.5, -14]];
  else if (o.short) {
    const sw = w < 0 ? 0 : w === 0 ? 2 : w === 2 ? -2 : 0;
    skirt = [[-11.5, -40], [-12.5, -32], [-12 - sw * 0.5, -27], [0, -26], [12 + sw, -27], [12.5, -32], [11.5, -40]];
  } else {
    const hf = w < 0 ? 0 : w === 0 ? 5 : w === 2 ? 3 : -1, hb = w < 0 ? 0 : w === 0 ? 3.5 : w === 2 ? 2.5 : -1.5;
    skirt = [[-11.5, -40], [-12.5, -24], [-13.5 - hb * 0.5, -10], [-14.2 - hb, -2], [-10 - hb * 0.5, 0.6], [0, 0.6], [11 + hf, 0.6], [13.8 + hf, -2], [13 + hf * 0.5, -10], [12, -24], [11, -40]];
  }
  const torso = [[8, -79], [3, -81], [-3, -81], [-8, -78], [-10.5, -68], [-11, -56], [-11.5, -45]];
  const torsoR = [[11, -45], [10.5, -56], [10.5, -68]];
  if (!o.noBody) p.poly([...TP(torso), ...skirt.map(([x, y]) => (y < -45 ? T(x, y) : [x, y])), ...TP(torsoR)], { m: tunic, smooth: 2, R: 6, fold: tunF, v: o.tunicV || 0 });
  if (o.hem) crease(o.short ? [[-12, -27.5], [12, -27.5]] : [], 0.3, o.hem);
  // pies bajo la túnica larga
  if (!o.short && !kneel && !ride && !o.noBody) {
    const F = w < 0 ? [[8, -0.7, 0], [-4, -0.7, 0]] : w === 0 ? [[15, -1.4, -0.35], [-13, -1.8, 0.45]] : w === 1 ? [[4, -0.7, 0], [0, -3.4, 0.25]] : w === 2 ? [[-12, -1.8, 0.45], [14, -1.4, -0.35]] : [[0, -3.4, 0.25], [4, -0.7, 0]];
    for (const [x, y, r] of F) { p.ell(x, y, 3.4, 1.5, { m: M.wood, R: 1, rot: r }); p.ell(x + 2, y - 0.6, 1.6, 0.9, { m: skin, R: 1 }); }
  }
  if (ride && o.rideLegs !== false) {
    p.ell(13, -0.6, 3, 1.4, { m: M.wood, R: 1 });
  }
  // ---- chaleco de piel de oveja (pastores)
  if (mt && mt.style === 'fleece') p.poly(TP([[8.6, -78], [3, -80.6], [-4, -80], [-9.4, -76], [-11.2, -62], [-11.8, -48], [-2, -47], [8.6, -48], [10.6, -60]]), { m: M.wool, smooth: 1, R: 4, fold: curly(0.9, 1.1), v: -0.05 });
  // ---- cinturón
  if (o.belt) { cap(-11, -51.5, 11, -51.5, 1.5, 1.5, { m: o.belt, R: 1.4 }); if (o.beltEnd !== false) cap(6, -51.5, 7.5, -42, 0.8, 0.7, { m: o.belt, R: 0.8 }); }
  // ---- manto en bandolera / capa de hombros
  if (mt && mt.style === 'sash') {
    p.poly(TP([[9, -79], [4, -82.2], [-2, -81.8], [-6, -76], [-10, -64], [-12.2, -50], [-8, -45.6], [-2, -54], [4, -64], [9.2, -71]]), { m: mt.m, smooth: 2, R: 4, fold: radial(6, -82, 10, 0.35, 3, 14) });
    crease([[8.6, -71], [4, -64], [-2, -54], [-7.6, -46]], 0.2, mt.trim);
  }
  if (mt && mt.style === 'cape') {
    p.poly(TP([[9.5, -80.5], [4, -83], [-3, -82.5], [-6, -77], [-1, -73.5], [6, -73.5], [10.5, -76]]), { m: mt.m, smooth: 1, R: 3, v: 0.04 });
    if (mt.trim) crease([[-5.5, -76.5], [-1, -73.8], [6, -73.8], [10, -76]], 0.4, mt.trim);
  }
  // ---- objeto largo
  const [eN, hN] = armN;
  const hx = T(hN[0], hN[1])[0], hy = T(hN[0], hN[1])[1];
  if (item.type === 'staff' || item.type === 'crook' || item.type === 'spear') {
    const top = item.type === 'spear' ? -122 : -104, gx = hx + 0.6;
    p.cap(gx - 0.4, hy + (top + 62), gx + 0.6, ride ? hy + 30 : 0.4, 1.2, 1.35, { m: M.wood, R: 1.2, v: (x, y) => (noise(x * 2, y * 0.5) - 0.5) * 0.2 });
    if (item.type === 'crook') p.tube([[gx - 0.4, hy + top + 62], [gx - 0.2, hy + top + 56], [gx + 3.6, hy + top + 53], [gx + 6.4, hy + top + 56], [gx + 5.6, hy + top + 59]], 1.2, 1, { m: M.wood, R: 1.1 });
    if (item.type === 'spear') p.poly([[gx - 1.6, hy + top + 62], [gx + 0.2, hy + top + 53], [gx + 2, hy + top + 62], [gx + 0.2, hy + top + 64]], { m: M.metal, R: 1 });
  }
  // ---- cabeza
  const fo = newObj();
  const sk = { m: skin, R: 4.5, obj: fo, v: o.faceV ?? 0.05 };
  if (o.head?.type === 'hood' || o.head?.type === 'veil' || o.head?.type === 'cloth') {
    // tocado que cae por la espalda (se pinta antes de la cara)
    const back = o.head.type === 'cloth'
      ? [[7.2, -91], [4, -95.5], [-2, -96], [-6.5, -92.5], [-8.5, -86], [-10, -78], [-7, -75], [-3, -79], [-2, -84], [-1, -88], [2, -90.5], [5.5, -90.8]]
      : [[7.4, -92.4], [3, -96], [-3, -95.6], [-7.2, -91], [-9, -84], [-10.5, -77], [-12, -68], [-9, -66], [-4, -73], [-2.4, -80], [-1.8, -86], [0.4, -90], [4, -91.6]];
    if (o.head.type === 'veil' || o.head.type === 'hood') ell(2.4, -87.4, 6, 7, { m: o.head.m2 ?? M.white, R: 4, v: 0.04 });
    p.poly(TP(back), { m: o.head.m, smooth: 1, R: 4, fold: radial(-2, -90, 12, 0.3, 3, 12) });
  }
  if (o.head?.type === 'longhair') p.poly(TP([[6, -92], [1, -95.6], [-5, -94], [-8, -88], [-9, -78], [-7.6, -70], [-3, -72], [-2.4, -80], [-1, -87], [3, -90]]), { m: o.head.m, smooth: 1, R: 3, fold: vfold(2.5, 0.5) });
  ell(2, -87, 5, 6.2, sk);
  ell(7, -86.6, 1.35, 1.9, { ...sk, R: 1.5 });
  if (o.young) ell(4.6, -82.6, 2.6, 1.6, { ...sk, R: 1.6 });
  // cabello
  const ht = o.head?.type || 'hair';
  if (ht === 'hair' || ht === 'crown' || ht === 'helmet0') {
    p.poly(TP([[6.6, -90.4], [5, -93.6], [1, -94.8], [-3, -93.8], [-5.8, -90.6], [-6.8, -86], [-6.2, -82.4], [-3, -81.4], [-2.6, -85], [-2, -88], [1, -90.2], [4, -91]]), { m: o.hair ?? M.hair, smooth: 1, R: 3, fold: curly(0.8, 0.8), v: o.hairV || 0 });
  }
  if (ht !== 'cloth' && ht !== 'hood' && ht !== 'veil' && ht !== 'turban' && ht !== 'helmet') ell(-1.7, -86.4, 1.25, 1.9, { m: skin, R: 1.2 });
  // barba
  const bd = o.beard;
  if (bd && bd.len) {
    const long = bd.len >= 2;
    p.poly(TP(long
      ? [[6.9, -84.8], [5.6, -82.6], [6.4, -79], [5.4, -74], [3.4, -69.5], [0.6, -68.6], [-1.6, -72], [-2.8, -78], [-3.3, -84], [-1.2, -84.6], [0, -83], [2.6, -82.6], [4.6, -84]]
      : [[6.9, -84.8], [5.6, -82.6], [6.3, -80.2], [4.8, -76.8], [2.6, -74.8], [-0.3, -76], [-2.7, -80], [-3.3, -84], [-1.2, -84.6], [0, -83], [2.6, -82.6], [4.6, -84]]), { m: bd.m, smooth: 1, R: 3, fold: curly(0.9, 0.9) });
  }
  // tocados delanteros
  if (ht === 'cloth') { cap(6.8, -91.4, -5.6, -92.8, 1.05, 1.05, { m: o.head.m2 ?? M.ink, R: 1 }); }
  if (ht === 'hood' || ht === 'veil') crease([[4, -91.6], [0.4, -90], [-1.8, -86], [-2.4, -80]], 0.2, o.head.trim);
  if (ht === 'turban') {
    ell(0.6, -92.6, 7.4, 5.2, { m: o.head.m, R: 4, fold: (x, y) => [0, Math.sin((x * 0.3 + y) * 1.4) * 0.45] });
    crease([[-6, -94], [6.5, -91]], -0.25); crease([[-5.5, -91], [6.8, -94.5]], 0.15);
    if (o.head.jewel) { ell(6.4, -92.6, 1.3, 1.5, { m: o.head.jewel, R: 1, v: 0.3 }); }
  }
  if (ht === 'crown' || o.head?.crown) {
    const cy = ht === 'turban' ? -97 : -93;
    p.poly(TP([[-5.6, cy + 1.6], [6.2, cy + 1.6], [6.6, cy - 1.6], [5.2, cy - 4.2], [3.8, cy - 1.8], [1.6, cy - 5.6], [-0.4, cy - 1.8], [-2.6, cy - 4.4], [-4, cy - 1.8], [-5.8, cy - 1.6]]), { m: M.brass, R: 1.5, v: 0.05 });
    dot(1.6, cy - 0.4, M.red, 0.4); dot(-3, cy, M.teal, 0.4); dot(5, cy, M.teal, 0.4);
  }
  if (ht === 'cap') ell(0, -93.4, 5.8, 3.6, { m: o.head.m, R: 3 });
  if (ht === 'helmet') {
    ell(0.4, -91.6, 6.6, 5.4, { m: M.metal, R: 4 });
    p.poly(TP([[-4, -90], [-6, -84], [-4.4, -80], [-2, -84]]), { m: M.metal, R: 1.4, v: -0.1 });
    tube([[-6, -97], [-1, -100.5], [5, -98.6]], 1.6, 1.2, { m: M.red, R: 1.4, fold: curly(1.2, 0.6) });
  }
  // rasgos
  if (o.eyes !== 'closed') { dot(4.6, -88, M.ink, 0.2); dot(3.6, -88, M.ink, 0.35); }
  else { dot(4.6, -87.6, M.ink, 0.3); dot(3.6, -87.4, M.ink, 0.3); }
  const browM = bd && bd.len ? bd.m : o.hair ?? M.hair;
  dot(5.2, -89.6, browM, -0.1); dot(4.2, -89.8, browM, -0.1);
  if (!bd || !bd.len) { dot(5.4, -82.8, M.lips, 0.2); dot(1.4, -85.2, skin, -0.18, true); }
  else dot(5.4, -82.8, M.ink, 0.35);
  // ---- brazo cercano
  const sleeveR = o.shortSleeve ? 2.6 : 3.3;
  tube([[3, -77], eN, hN], sleeveR, 2.5, { m: o.shortSleeve ? skin : sleeve, R: 2.6, fold: vfold(1.6, 0.25) });
  if (o.cuff) cap(...T(eN[0] + (hN[0] - eN[0]) * 0.72, eN[1] + (hN[1] - eN[1]) * 0.72), ...T(eN[0] + (hN[0] - eN[0]) * 0.8, eN[1] + (hN[1] - eN[1]) * 0.8), 2.7, 2.7, { m: o.cuff, R: 1.5 });
  // objetos en las manos
  const [Hx, Hy] = T(hN[0], hN[1]);
  if (item.type === 'gift') {
    if (item.kind === 'chest') { p.poly([[Hx - 1, Hy - 5], [Hx + 8, Hy - 5], [Hx + 8, Hy + 1], [Hx - 1, Hy + 1]], { m: M.brass, R: 1.6 }); p.ell(Hx + 3.5, Hy - 5, 4.6, 2, { m: M.brass, R: 1.5, v: 0.1 }); p.dot(Hx + 3.5, Hy - 2, M.red, 0.5); p.crease([[Hx - 1, Hy - 3], [Hx + 8, Hy - 3]], -0.25); }
    if (item.kind === 'censer') { p.cap(Hx + 1, Hy, Hx + 2, Hy + 7, 0.4, 0.4, { m: M.metal, R: 0, ol: 0 }); p.ell(Hx + 2, Hy + 10, 3.4, 3, { m: M.brass, R: 2.4 }); p.ell(Hx + 2, Hy + 7.4, 2.4, 1.4, { m: M.brass, R: 1, v: 0.1 }); }
    if (item.kind === 'jar') { p.ell(Hx + 3, Hy - 3, 3.4, 4.6, { m: M.marble, R: 3, v: 0.1 }); p.cap(Hx + 3, Hy - 7, Hx + 3, Hy - 9.4, 1.6, 1.4, { m: M.marble, R: 1 }); p.ell(Hx + 3, Hy - 10.4, 2.4, 1.1, { m: M.brass, R: 1 }); }
  }
  if (item.type === 'torch') { p.cap(Hx, Hy + 6, Hx + 1, Hy - 9, 1, 1.1, { m: M.wood, R: 1 }); p.ell(Hx + 1, Hy - 10, 1.8, 2.4, { m: M.burlap, R: 1.4, v: -0.2 }); }
  if (item.type === 'lantern') { p.cap(Hx, Hy, Hx, Hy + 4, 0.4, 0.4, { m: M.metal, R: 0, ol: 0 }); p.poly([[Hx - 2.4, Hy + 4], [Hx + 2.4, Hy + 4], [Hx + 2, Hy + 10], [Hx - 2, Hy + 10]], { m: M.metal, R: 1 }); p.ell(Hx, Hy + 7, 1.2, 2, { m: M.window, R: 0, v: 0.8, ol: 0 }); }
  if (item.type === 'jar') { p.ell(Hx + 1, Hy - 4, 4.4, 5.2, { m: M.clay, R: 4 }); p.cap(Hx + 1, Hy - 9, Hx + 1, Hy - 11, 2, 1.8, { m: M.clay, R: 1.4 }); }
  if (item.type === 'flute') { const [mx, my] = T(7, -83); p.cap(mx + 1, my + 1, Hx + 6, Hy + 4, 0.7, 0.8, { m: M.wood, R: 0.6, v: 0.15 }); }
  if (item.type === 'scroll') { p.cap(Hx - 1, Hy - 4, Hx + 1, Hy + 6, 1.6, 1.6, { m: M.cream, R: 1.4 }); }
  if (item.type === 'bowl') p.ell(Hx + 2, Hy - 1, 4, 1.8, { m: M.clay, R: 1.5 });
  p.ell(Hx, Hy - 0.4, 2.3, 2.6, { m: skin, R: 2 });
  if (item.type === 'staff' || item.type === 'crook' || item.type === 'spear' || item.type === 'torch') p.crease([[Hx - 1.6, Hy - 1], [Hx + 1.6, Hy - 1.4]], -0.2);
  // cordero sobre los hombros
  if (item.type === 'lamb') {
    const [sx, sy] = T(-1, -80);
    p.shape((x, y) => Math.hypot((x - sx) / 9, (y - sy + 2) / 5) * 5 - 5 + (noise(x * 0.8, y * 0.8) - 0.5) * 2, [sx - 12, sy - 9, sx + 12, sy + 6], { m: M.wool, R: 4, fold: curly(0.9, 1) });
    p.ell(sx + 9, sy - 1, 2.8, 2.2, { m: M.sheepf, R: 2 });
    for (const dx of [-7, 6]) p.cap(sx + dx, sy + 2, sx + dx + 1, sy + 7, 0.9, 0.8, { m: M.sheepf, R: 0.8 });
  }
  return { hand: [Hx, Hy] };
}

// ---------------- Ángel en vuelo (mirando a la derecha) ----------------
export function angel(p, t, o = {}) {
  const fl = t.f || 0, ang = [0.28, 0, -0.32][fl];
  const wing = (bx, by, far) => {
    const base = -2.95 + ang;
    for (let k = 7; k >= 0; k--) {
      const a = base + k * 0.19, L = 20 + k * 3.4 - (k > 5 ? (k - 5) * 5 : 0);
      p.cap(bx + Math.cos(a) * 5, by + Math.sin(a) * 5, bx + Math.cos(a) * L, by + Math.sin(a) * L, 3.4, 1.3, { m: M.feather, R: 2.4, v: (far ? -0.22 : 0) + k * 0.015, ol: 1 });
    }
    p.ell(bx + Math.cos(base + 0.7) * 8, by + Math.sin(base + 0.7) * 8, 10, 6.5, { m: M.feather, R: 5, rot: base + 0.7, v: far ? -0.16 : 0.1 });
    p.ell(bx + Math.cos(base + 0.9) * 5, by + Math.sin(base + 0.9) * 5, 6, 4.5, { m: M.feather, R: 4, rot: base + 0.9, v: far ? -0.1 : 0.16 });
  };
  wing(-5, -75, true);
  wing(-1, -72, false);
  const sw = Math.sin((t.s || 0) * 6.28) * 1.5, robe = o.robe ?? M.cream;
  p.poly([[8, -79], [3, -81], [-3, -81], [-8, -78], [-10.5, -66], [-12, -52], [-16, -40], [-22, -30 + sw], [-30, -24 + sw], [-36, -19 + sw * 1.5], [-27, -17], [-18, -19], [-12, -21], [-4, -25], [4, -30], [10, -40], [11, -56], [10.5, -68]], { m: robe, smooth: 2, R: 6, fold: radial(-2, -60, 12, 0.4, 6, 30), v: 0.1 });
  p.cap(-11, -54, 10.5, -55, 1.3, 1.3, { m: M.brass, R: 1 });
  p.crease([[-36, -19], [-27, -17], [-18, -19], [-12, -21], [-4, -25], [4, -30]], 0.35, M.brass);
  persona(p, { tunic: robe, pose: 'stand', noFarArm: true, head: { type: 'longhair', m: M.straw }, faceV: 0.14, young: true, armN: o.arm || 'up', item: o.item || {}, skin: M.skin, noBody: true, ...o.persona }, {});
  if (o.lily) { const [hx, hy] = [15, -72]; p.cap(hx, hy + 4, hx + 2, hy - 12, 0.5, 0.5, { m: M.leaf, R: 0, ol: 0 }); for (const [x, y] of [[hx + 2, hy - 13], [hx + 4, hy - 10], [hx + 1, hy - 9]]) p.circ(x, y, 1.4, { m: M.white, R: 1.2, v: 0.25 }); }
  p.ell(1, -97.6, 5.4, 1.4, { m: M.gold, v: 0.7, R: 0, ol: 0 });
}
