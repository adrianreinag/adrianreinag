// Generador de personas del belén: una figura de 96 px de alto (a escala 1) mirando a la derecha,
// con poses (de pie, andando, arrodillada, montada), ropa, tocados, barbas y objetos configurables.
import { M, newObj, noise, smooth, lerp } from './engine.js';
import { vfold, radial } from './figures.js';
import { head as drawHead, arm as drawArm, hand as drawHand } from './anatomy.js';

const curly = (s, a) => (x, y) => [(noise(x * s, y * s) - 0.5) * a, (noise(x * s + 9.3, y * s - 4.1) - 0.5) * a];

// posiciones de codo y mano (brazo cercano) según la pose
const ARMS = {
  down: [[3.5, -63], [5.5, -53.5], 'relaxed'],
  staff: [[8, -66], [12, -62], 'grip'],
  staffF: [[10, -66], [16, -63], 'grip'],
  staffB: [[6, -65], [8.5, -61], 'grip'],
  forward: [[9, -67], [16, -67.5], 'offer'],
  offer: [[9, -64], [15, -64.5], 'offer'],
  up: [[9, -85], [11.5, -95], 'offer'],
  point: [[10, -82], [16, -90], 'point'],
  pray: [[6, -66], [9.5, -72], 'pray'],
  chest: [[5.5, -66], [3.5, -71], 'relaxed'],
  hold: [[6, -62], [10.5, -61], 'grip'],
  torch: [[9, -72], [11.5, -80], 'grip'],
  hip: [[7.5, -63], [4.5, -55], 'relaxed'],
  flute: [[8, -70], [10.5, -77], 'grip'],
  reins: [[8, -66], [13.5, -63], 'grip'],
  open: [[9, -66], [14.5, -71], 'offer'],
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
  const armN = w >= 0 && o.armN === 'staff' ? ARMS[w === 0 ? 'staffF' : w === 2 ? 'staffB' : 'staff'] : w >= 0 && !o.armN ? (w === 0 ? [[0.5, -64], [-1.5, -54.5], 'relaxed'] : w === 2 ? [[6, -64], [9.5, -55], 'relaxed'] : ARMS.down) : ARMS[o.armN || 'down'];
  const armF = ARMS[o.armF || (w >= 0 ? 'down' : 'down')];

  // ---- objeto largo detrás (vara, cayado, lanza) va con la mano cercana; se pinta luego
  // ---- brazo lejano (detrás del cuerpo)
  if (!o.noFarArm) {
    const [e, h, g] = w >= 0 && !o.armF ? (w === 2 ? [[-0.5, -65], [-2.5, -55.5], 'relaxed'] : w === 0 ? [[5, -65], [8, -56], 'relaxed'] : ARMS.down) : armF;
    drawArm(p, T(-2, -77), T(e[0] - 4, e[1]), T(h[0] - 4, h[1]), { m: sleeve, skin, short: o.shortSleeve, dark: true, hand: g, cuff: o.cuff });
  }
  // ---- capa real o manto trasero
  const mt = o.mantle;
  if (mt && (mt.style === 'back' || mt.style === 'cape')) {
    const cape = mt.style === 'cape';
    const pts = cape
      ? [[2, -81.5], [-4, -81.6], [-9.5, -78.5], [-13, -70], [-15.4, -52], [-17.6, -32], [-19.8, -14], [-21.6, 0.6], [-4, 0.8], [-8.6, -14], [-9.4, -34], [-8.4, -54], [-4, -72]]
      : [[1, -81.5], [-5, -81.4], [-10, -78], [-12.8, -70], [-14.2, -56], [-15.4, -40], [-16.4, -24], [-16, -12], [-10.6, -10.6], [-9.4, -22], [-9, -38], [-7.8, -54], [-5, -68], [-1, -76]];
    const P = kneel ? pts.map(([x, y]) => { if (y <= -45) return [x, y]; const yy = -21 + (y + 45) * (21.6 / 45.6); return [x - (yy + 21) * 0.35, Math.min(0.6, yy)]; }) : pts;
    p.poly(TP(P).map(([x, y]) => [x, kneel || ride ? Math.min(y, ride ? 2 : 0.6) : y]), { m: mt.m, smooth: 2, R: 5, v: -0.04 });
    for (const [a, b] of cape ? [[[-9, -66], [-15, -4]], [[-6, -60], [-9, -6]]] : [[[-8, -66], [-13, -14]], [[-5, -62], [-7.4, -16]]]) { p.crease(TP([a, b]), -0.45); p.crease(TP([[a[0] + 1, a[1] + 2], [b[0] + 1, b[1]]]), 0.25); }
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
  if (kneel) skirt = [[-10, -21], [-11.2, -14], [-13.6, -6], [-16, -1.2], [-15, 0.6], [13, 0.6], [13.8, -2], [12.8, -8], [11.2, -15], [10.2, -21]];
  else if (ride) skirt = [[-12, -9], [-6, -7], [7, -7.5], [9, -1], [15, -0.5], [15.5, -8], [13.5, -14]];
  else if (o.short) {
    const sw = w < 0 ? 0 : w === 0 ? 2 : w === 2 ? -2 : 0;
    skirt = [[-11.5, -40], [-12.5, -32], [-12 - sw * 0.5, -27], [0, -26], [12 + sw, -27], [12.5, -32], [11.5, -40]];
  } else {
    const hf = w < 0 ? 0 : w === 0 ? 5 : w === 2 ? 3 : -1, hb = w < 0 ? 0 : w === 0 ? 3.5 : w === 2 ? 2.5 : -1.5;
    skirt = [[-10.6, -32], [-11.8, -16], [-12.8 - hb, -3], [-11.4 - hb * 0.5, 0.4], [-2, 1], [6, 1], [12.6 + hf, 0.4], [13.6 + hf, -3], [12.4 + hf * 0.5, -16], [11, -32]];
  }
  const torso = [[3.5, -81], [-3, -81], [-6.5, -79.5], [-9, -76], [-10, -70], [-9.6, -62], [-9.2, -54], [-9.8, -46]];
  const torsoR = [[9.8, -46], [9.2, -54], [9.8, -62], [10.6, -70], [9.6, -76], [7, -79.5]];
  if (!o.noBody) {
    p.poly([...TP(torso), ...skirt.map(([x, y]) => (y < -45 ? T(x, y) : [x, y])), ...TP(torsoR)], { m: tunic, smooth: 2, R: 6, v: (x, y) => (o.tunicV || 0) + (y > -4 && !kneel && !ride ? -0.25 : 0) });
    // pliegues marcados: línea de sombra con su brillo al lado
    if (!o.short && !ride) for (const [x0, x1, s0] of kneel ? [[2, 6, 1], [-4, -7, 1]] : [[3.5, 6.5 + (w === 0 ? 2 : 0), 1], [-3, -5.5, 1], [8, 11, 0.7]]) {
      const yA = kneel ? -19 : -48, yB = -2;
      p.crease(TP([[x0, yA], [x1, yB]]).map(([x, y]) => [x, y]), -0.5 * s0); p.crease(TP([[x0 + 1, yA + 2], [x1 + 1, yB]]), 0.3 * s0);
    }
  }
  if (o.hem) crease(o.short ? [[-12, -27.5], [12, -27.5]] : [], 0.3, o.hem);
  // pies bajo la túnica larga
  if (!o.short && !kneel && !ride && !o.noBody) {
    const F = w < 0 ? [[8, -0.7, 0], [-4, -0.7, 0]] : w === 0 ? [[15, -1.4, -0.35], [-13, -1.8, 0.45]] : w === 1 ? [[4, -0.7, 0], [0, -3.4, 0.25]] : w === 2 ? [[-12, -1.8, 0.45], [14, -1.4, -0.35]] : [[0, -3.4, 0.25], [4, -0.7, 0]];
    for (const [x, y, r] of F) { p.ell(x, y, 3.4, 1.5, { m: M.wood, R: 1, rot: r }); p.ell(x + 2, y - 0.6, 1.6, 0.9, { m: skin, R: 1 }); }
  }
  if (ride && o.rideLegs !== false) {
    p.ell(13, -0.6, 3, 1.4, { m: M.wood, R: 1 });
  }
  if (mt && mt.style === 'wrap' && !o.noBody) {
    const base = kneel
      ? [[4, -81], [8, -78], [9.4, -71], [8.6, -62], [7, -52], [6.2, -46], [7.4, -18], [10.4, -10], [13, -3], [14, 0.6], [-17, 0.6], [-17.6, -5], [-15, -14], [-12.6, -50], [-11.2, -66], [-8.5, -78], [-3, -81.6]]
      : [[4, -81], [7.5, -78.5], [8.6, -72], [7.6, -64], [6.2, -54], [5.2, -40], [4.6, -24], [4.4, -10], [4.8, 0.6], [-15.6, 0.6], [-16.6, -6], [-15, -28], [-12.8, -50], [-11.2, -66], [-8.5, -78], [-3, -81.6]];
    p.poly(base.map(([x, y]) => (y < -45 ? T(x, y) : [x, y])), { m: mt.m, smooth: 2, R: 5, v: -0.02 });
    const edge = kneel ? [[8.6, -62], [7, -52], [6.2, -46], [7.4, -18], [10.4, -10], [13, -3], [14, 0]] : [[8.6, -72], [7.6, -64], [6.2, -54], [5.2, -40], [4.6, -24], [4.4, -10], [4.8, 0]];
    if (mt.trim) p.crease(edge.map(([x, y]) => (y < -45 ? T(x, y) : [x, y])), 0.45, mt.trim);
    for (const [a, b] of kneel ? [[[-4, -60], [-12, -3]], [[1, -50], [-2, -3]]] : [[[-4, -64], [-10, -4]], [[1, -52], [-2, -4]], [[-9, -60], [-14, -6]]]) { p.crease([a, b].map(([x, y]) => (y < -45 ? T(x, y) : [x, y])), -0.45); p.crease([[a[0] + 1, a[1] + 2], [b[0] + 1, b[1]]].map(([x, y]) => (y < -45 ? T(x, y) : [x, y])), 0.25); }
  }
  // ---- chaleco de piel de oveja (pastores)
  if (mt && mt.style === 'fleece') p.poly(TP([[8.6, -78], [3, -80.6], [-4, -80], [-9.4, -76], [-11.2, -62], [-11.8, -48], [-2, -47], [8.6, -48], [10.6, -60]]), { m: M.wool, smooth: 1, R: 4, fold: curly(0.9, 1.1), v: -0.05 });
  // ---- cinturón
  if (o.belt) { cap(-9.6, -52, 9.6, -51.6, 1.6, 1.6, { m: o.belt, R: 1.4 }); if (o.beltEnd !== false) { cap(6.4, -51.4, 7.6, -42.6, 0.8, 0.7, { m: o.belt, R: 0.8 }); cap(5.2, -51.4, 5.6, -44, 0.7, 0.6, { m: o.belt, R: 0.7, v: -0.1 }); } }
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
  // ---- cabeza (cráneo, mandíbula y nariz suaves; rasgos a mano)
  const ht = o.head?.type || 'hair';
  const [hcx, hcy] = T(2, -86);
  const hairStyle = ht === 'longhair' ? 'long' : (ht === 'hair' || ht === 'crown') ? (o.curly ? 'curly' : 'short') : null;
  drawHead(p, { cx: hcx, cy: hcy, dir: 1, hs: o.hs ?? 1, skin, young: o.young, female: o.female ?? (ht === 'veil' || ht === 'hood'), eyes: o.eyes,
    hair: hairStyle ? { style: hairStyle, m: ht === 'longhair' ? o.head.m : o.hair ?? M.hair } : null,
    beard: o.beard, faceV: o.faceV,
    wear: ht === 'hood' || ht === 'veil' ? { type: 'veil', m: o.head.m, m2: o.head.m2, trim: o.head.trim } : ht === 'cloth' ? { type: 'cloth', m: o.head.m, m2: o.head.m2 } : ht === 'turban' ? { type: 'turban', m: o.head.m, jewel: o.head.jewel, crown: o.head.crown } : ht === 'crown' ? { type: 'crown' } : ht === 'cap' ? { type: 'cap', m: o.head.m } : ht === 'helmet' ? { type: 'helmet' } : {} });
  // ---- brazo cercano
  drawArm(p, T(3, -77), T(eN[0], eN[1]), T(hN[0], hN[1]), { m: sleeve, skin, short: o.shortSleeve, hand: false, cuff: o.cuff, bell: o.bell });
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
  { const [ex, ey] = T(eN[0], eN[1]), dx = Hx - ex, dy = Hy - ey, L = Math.hypot(dx, dy) || 1; drawHand(p, Hx + dx / L * 1.8, Hy + dy / L * 1.8, armN[2] || 'relaxed', { skin }); }
  // cordero sobre los hombros
  if (item.type === 'lamb') {
    const [sx, sy] = T(-1, -80);
    p.shape((x, y) => Math.hypot((x - sx) / 9, (y - sy + 2) / 5) * 5 - 5 + (noise(x * 0.8, y * 0.8) - 0.5) * 2, [sx - 12, sy - 9, sx + 12, sy + 6], { m: M.wool, R: 4, fold: curly(0.9, 1) });
    p.ell(sx + 9, sy - 1, 2.8, 2.2, { m: M.sheepf, R: 2 });
    for (const dx of [-7, 6]) p.cap(sx + dx, sy + 2, sx + dx + 1, sy + 7, 0.9, 0.8, { m: M.sheepf, R: 0.8 });
  }
  return { hand: [Hx, Hy] };
}

// ---------------- Ángel (túnica larga que ondea, alas grandes) ----------------
export function angel(p, t, o = {}) {
  const fl = t.f || 0, ang = [0.28, 0, -0.32][fl];
  const wing = (bx, by, far) => {
    const base = -2.95 + ang;
    for (let k = 7; k >= 0; k--) {
      const a = base + k * 0.19, L = 22 + k * 3.6 - (k > 5 ? (k - 5) * 5 : 0);
      p.cap(bx + Math.cos(a) * 5, by + Math.sin(a) * 5, bx + Math.cos(a) * L, by + Math.sin(a) * L, 3.5, 1.3, { m: M.feather, R: 2.4, v: (far ? -0.22 : 0) + k * 0.015, ol: 1 });
    }
    p.ell(bx + Math.cos(base + 0.7) * 8, by + Math.sin(base + 0.7) * 8, 10.5, 7, { m: M.feather, R: 5, rot: base + 0.7, v: far ? -0.16 : 0.1 });
    p.ell(bx + Math.cos(base + 0.9) * 5, by + Math.sin(base + 0.9) * 5, 6.4, 4.6, { m: M.feather, R: 4, rot: base + 0.9, v: far ? -0.1 : 0.16 });
  };
  wing(-5, -74, true);
  wing(-1, -71, false);
  const robe = o.robe ?? M.cream, sw = Math.sin((t.s || 0) * 6.28 + fl) * 1.2;
  // bajo de la túnica que ondea hacia atrás
  p.poly([[-10.6, -32], [-13, -16], [-16 - sw, -6], [-20 - sw, 0], [-14, -1.6], [-9, 1.2], [-4, -0.6], [2, 1.6], [8, 0], [12.6, 1], [13.4, -4], [12.2, -16], [10.6, -32]], { m: robe, smooth: 2, R: 5, v: 0.06 });
  persona(p, { tunic: robe, pose: 'stand', noFarArm: !!o.noFar, head: { type: 'longhair', m: M.straw }, faceV: 0.14, young: true, female: true, armN: o.arm || 'up', armF: o.armF || 'chest', item: o.item || {}, skin: M.skin, belt: M.brass, beltEnd: true, eyes: o.eyes, ...o.persona }, {});
  // pies descalzos que asoman
  p.ell(5, -0.4, 2.8, 1.2, { m: M.skin, R: 1, v: 0.05 });
  if (o.lily) { const [hx, hy] = [15, -72]; p.cap(hx, hy + 4, hx + 2, hy - 12, 0.5, 0.5, { m: M.leaf, R: 0, ol: 0 }); for (const [x, y] of [[hx + 2, hy - 13], [hx + 4, hy - 10], [hx + 1, hy - 9]]) p.circ(x, y, 1.4, { m: M.white, R: 1.2, v: 0.25 }); }
  p.ell(1, -97.6, 5.6, 1.4, { m: M.gold, v: 0.7, R: 0, ol: 0 });
}
