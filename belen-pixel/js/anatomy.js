// Anatomía para figuras bonitas: cabeza con cráneo, mandíbula y nariz suaves; rasgos colocados píxel a píxel
// según el tamaño real; brazos articulados con manga que cae y manos dibujadas a mano.
import { M, newObj, noise, lerp, smooth, sdCircle, sdEllipse, sdCapsule, sdPoly, smin, uni, chaikin } from './engine.js';

// ---------- cabeza ----------
// Coordenadas de cabeza: u hacia delante (la cara), v hacia abajo; radio ~6.5 a escala 1.
// o: { cx, cy (centro en coords locales ya transformadas), dir: 1 mira a la derecha / -1 izquierda, hs: tamaño,
//      skin, hair:{style,m}, beard:{len,m}, wear:{type,m,m2,trim,jewel,crown}, eyes:'open'|'closed'|'down', young, female, baby, faceV }
export function head(p, o) {
  const dir = o.dir ?? 1, hs = o.hs ?? 1, cx = o.cx, cy = o.cy;
  const X = u => cx + u * dir * hs, Y = v => cy + v * hs;
  const PT = pts => pts.map(([u, v]) => [X(u), Y(v)]);
  const skin = o.skin ?? M.skin, wear = o.wear || {}, hair = o.hair || {}, bd = o.beard;
  const ellH = (u, v, ru, rv, op) => p.ell(X(u), Y(v), ru * hs, rv * hs, { ...op, rot: (op.rot || 0) * dir });
  // cuello
  p.cap(X(-0.6), Y(4.6), X(-1.2), Y(9.5), 2.7 * hs, 3 * hs, { m: skin, R: 2.2, v: -0.12 });
  // tocados que caen por detrás (velo, manto, pañuelo, pelo largo)
  if (wear.type === 'veil' || wear.type === 'hood' || wear.type === 'cloth') {
    const long = wear.type !== 'cloth';
    const back = long
      ? [[6.4, -5.8], [3, -8.8], [-2.6, -9], [-7, -5.8], [-8.8, 0], [-9.8, 6], [-11.4, 13], [-8, 14.4], [-4.8, 8.4], [-3.4, 2.2], [-2.4, -2.8], [0.6, -5.4], [4.2, -6.2]]
      : [[6.2, -5.2], [3, -8.6], [-2.4, -8.8], [-6.8, -5.8], [-8.6, -0.6], [-10, 6], [-8, 8.6], [-4.4, 5], [-3.2, 0.6], [-2, -3], [0.8, -5], [4, -5.6]];
    if (long) ellH(0.9, 0.4, 6.8, 7.8, { m: wear.m2 ?? M.white, R: 4, v: 0.04 });
    p.poly(PT(back), { m: wear.m, smooth: 1, R: 4 });
  }
  if (hair.style === 'long') p.poly(PT([[5.4, -4.6], [3, -7.8], [-1, -8.6], [-5.6, -6.8], [-7.8, -2], [-8.4, 4], [-8, 10.5], [-4.8, 11.6], [-3.2, 6], [-2.6, 0], [-0.6, -4.2], [2.8, -5.2]]), { m: hair.m, smooth: 1, R: 3, v: 0.05 });
  // cara: cráneo + mandíbula + nariz, unidos con suavidad
  const fo = newObj();
  const skull = sdCircle(X(-0.6), Y(-1.2), 6.3 * hs), jaw = sdEllipse(X(o.baby ? 0.6 : 1.5), Y(o.baby ? 2 : 2.6), (o.baby ? 5 : 4.6) * hs, (o.baby ? 4.6 : 4.3) * hs);
  const nose = sdCircle(X(o.baby ? 5.6 : 6), Y(0.7), (o.baby ? 0.9 : 1.15) * hs);
  const face = smin(smin(skull, jaw, 2.2 * hs), nose, 0.9 * hs);
  p.shape(face, [X(-8) < X(8) ? X(-8) : X(8), Y(-8.5), X(-8) < X(8) ? X(8) : X(-8), Y(8.5)], { m: skin, R: 4.6, obj: fo, v: o.faceV ?? 0.06 });
  const visibleEar = !['veil', 'hood', 'cloth', 'turban', 'helmet'].includes(wear.type) && hair.style !== 'long';
  if (wear.type === 'veil' || wear.type === 'hood' || wear.type === 'cloth') {
    if (wear.type !== 'cloth') ellH(1.8, -4.4, 4, 1.7, { m: o.hairM ?? M.hair, R: 1.2, v: 0.05 });
    const cap = sdEllipse(X(-0.8), Y(-1.9), 7.9 * hs, 8.7 * hs), open = sdEllipse(X(3), Y(1.6), (wear.type === 'cloth' ? 5.6 : 5.5) * hs, 7.2 * hs);
    p.shape((x, y) => Math.max(cap(x, y), -open(x, y), y - Y(wear.type === 'cloth' ? 6 : 9)), [Math.min(X(-10), X(9)), Y(-11), Math.max(X(-10), X(9)), Y(10)], { m: wear.m, R: 3.4, v: 0.02 });
  }
  // pelo corto
  if (hair.style === 'short' || hair.style === 'curly' || hair.style === 'gray') {
    const pts = [[5.4, -4.8], [3.8, -7.4], [0, -8.4], [-4, -7.6], [-6.9, -4.6], [-7.5, -0.6], [-6.9, 3.2], [-4.8, 4.8], [-3.4, 2.2], [-2.8, -1.4], [-0.6, -3.8], [2.6, -4.7]];
    if (hair.style === 'curly') p.shape((x, y) => sdPoly(chaikin(PT(pts), 1))(x, y) + (noise(x * 1.3, y * 1.3) - 0.5) * 1.4, [Math.min(X(-9), X(7)), Y(-10), Math.max(X(-9), X(7)), Y(6)], { m: hair.m, R: 3, v: 0.04 });
    else p.poly(PT(pts), { m: hair.m, smooth: 1, R: 3, v: 0.03 });
    // mechones
    for (const [a, b] of [[[3.6, -6.8], [0.6, -4.6]], [[0.4, -7.8], [-2.2, -4]], [[-3.6, -7.2], [-5.2, -3]], [[-5.8, -2.2], [-5.4, 2.4]]]) p.crease(PT([a, b]), -0.22);
  }
  if (hair.style === 'baby') for (const [u, v] of [[0, -7], [1.4, -6.8], [-1.4, -6.6], [2.6, -6.2]]) p.dot(X(u), Y(v), hair.m ?? M.hair, 0.4);
  if (visibleEar) { ellH(-1.9, 0.6, 1.3, 1.9, { m: skin, R: 1.2, v: -0.04 }); p.dot(X(-1.9), Y(0.6), skin, -0.25, true); }
  // barba
  if (bd && bd.len) {
    const long = bd.len >= 2;
    p.poly(PT(long
      ? [[6.6, 1.8], [5.6, 3.8], [6, 6.4], [4.6, 10.4], [2.2, 14], [-0.6, 13], [-2.4, 9], [-3.6, 4.4], [-4.2, 1.2], [-2.6, 0.8], [-1, 3.2], [1.8, 3.8], [3.8, 2.6]]
      : [[6.6, 1.8], [5.6, 3.8], [5.8, 5.6], [4.2, 7.8], [1.8, 8.8], [-1, 7.8], [-3, 5.2], [-3.9, 1.6], [-2.4, 1.2], [-0.8, 3.2], [1.8, 3.8], [3.8, 2.6]]), { m: bd.m, smooth: 1, R: 3, v: 0.02 });
    p.poly(PT([[3, 2.4], [6.4, 1.6], [6.2, 3], [4.4, 3.4], [3, 3.2]]), { m: bd.m, R: 1, v: 0.08 });
    for (const [a, b] of [[[4.6, 5], [3.8, 8]], [[1.6, 5], [1, 8.6]], [[-1.4, 4.4], [-1.6, 7.4]]]) p.crease(PT([a, b]), -0.2);
  }
  // tocados delanteros
  if ((wear.type === 'veil' || wear.type === 'hood') && wear.trim) { p.crease(PT([[5.8, -4.6], [3.4, -6.2], [0, -5.6], [-2.2, -3], [-2.8, 1.6], [-2.2, 6.4]]), 0.35, wear.trim); }
  if (wear.type === 'cloth') p.cap(X(6.4), Y(-5.4), X(-6.2), Y(-6.6), 1.05 * hs, 1.05 * hs, { m: wear.m2 ?? M.ink, R: 1 });
  if (wear.type === 'turban') {
    p.shape((x, y) => sdEllipse(X(-0.4), Y(-5.4), 7.6 * hs, 5 * hs)(x, y), [Math.min(X(-9), X(8)), Y(-11), Math.max(X(-9), X(8)), Y(0)], { m: wear.m, R: 4, fold: (x, y) => [0, Math.sin((x * 0.35 * dir + y) * 1.3) * 0.4] });
    p.crease(PT([[-6.6, -6.6], [6.4, -3.6]]), -0.25); p.crease(PT([[-6, -3.2], [6.6, -7]]), 0.12);
    if (wear.jewel) { ellH(5.8, -5, 1.3, 1.5, { m: wear.jewel, R: 1, v: 0.3 }); }
  }
  if (wear.type === 'cap') ellH(-0.6, -6.4, 6.4, 3.6, { m: wear.m, R: 3 });
  if (wear.type === 'helmet') {
    ellH(-0.4, -3.8, 7.2, 6, { m: M.metal, R: 4 });
    p.poly(PT([[-4.4, -2], [-6.6, 3.6], [-4.8, 7], [-2.2, 3]]), { m: M.metal, R: 1.4, v: -0.1 });
    p.tube(PT([[-6.4, -9.8], [-1, -13.4], [5.4, -11.2]]), 1.7 * hs, 1.3 * hs, { m: M.red, R: 1.4 });
  }
  if (wear.crown || wear.type === 'crown') {
    const c0 = wear.type === 'turban' ? -10 : -6.4;
    p.poly(PT([[-6, c0 + 1.6], [6.6, c0 + 1.6], [7, c0 - 1.6], [5.6, c0 - 4.4], [4.2, c0 - 1.8], [1.8, c0 - 5.8], [-0.4, c0 - 1.8], [-2.8, c0 - 4.6], [-4.4, c0 - 1.8], [-6.2, c0 - 1.6]]), { m: M.brass, R: 1.5, v: 0.05 });
    p.dot(X(1.8), Y(c0 - 0.4), M.red, 0.4); p.dot(X(-3), Y(c0), M.teal, 0.4); p.dot(X(5.2), Y(c0), M.teal, 0.4);
  }
  // rasgos píxel a píxel
  features(p, o, X, Y);
  return fo;
}

// rasgos según el tamaño real de la cabeza en píxeles
function features(p, o, X, Y) {
  const r = 6.5 * (o.hs ?? 1) * p.s, dir = o.dir ?? 1;
  const at = (u, v) => p._xy(X(u), Y(v));
  const put = (u, v, dx, dy, m, cel, val = 0) => {
    const [px, py] = at(u, v), b = p.b, x = px + dx * dir, y = py + dy;
    if (x < 0 || y < 0 || x >= b.w || y >= b.h) return; const k = y * b.w + x; if (!b.mat[k]) return;
    b.mat[k] = m; b.cel[k] = cel; b.val[k] = val; b.fix[k] = 1;
  };
  const skin = o.skin ?? M.skin, brow = o.brow ?? (o.beard?.len ? o.beard.m : o.hair?.m ?? M.hair);
  const eyes = o.eyes || 'open';
  if (r >= 5.2) {
    if (eyes === 'open') {
      put(1.6, -0.4, -1, 0, M.ink, 0.25); put(1.6, -0.4, 0, 0, M.ink, 0.25); put(1.6, -0.4, -1, 1, M.ink, 0.3); put(1.6, -0.4, 0, 1, M.ink, 0.8);
      put(4.8, -0.4, 0, 0, M.ink, 0.25); put(4.8, -0.4, 0, 1, M.ink, 0.35);
      put(1.6, -0.4, -2, 0, skin, 0.4);
    } else {
      put(1.6, -0.4, -2, 1, M.ink, 0.3); put(1.6, -0.4, -1, 1, M.ink, 0.3); put(1.6, -0.4, 0, 1, M.ink, 0.35);
      put(1.6, -0.4, -1, 0, skin, 0.45); put(1.6, -0.4, 0, 0, skin, 0.45);
      put(4.8, -0.4, 0, 1, M.ink, 0.35);
    }
    put(1.6, -0.4, -2, -2, brow, 0.15); put(1.6, -0.4, -1, -2, brow, 0.15); put(1.6, -0.4, 0, -2, brow, 0.25);
    put(4.8, -0.4, 0, -2, brow, 0.2); put(4.8, -0.4, 1, -2, brow, 0.25);
    put(4.8, -0.4, 0, 2, skin, 0.4);
    if (!o.beard?.len) { put(3.6, 4.2, 0, 0, M.lips, o.female ? 0.6 : 0.45); put(3.6, 4.2, 1, 0, M.lips, o.female ? 0.5 : 0.4); if (o.female || o.young || o.baby) put(3.6, 4.2, 0, 1, skin, 0.55); }
    if (o.female || o.young || o.baby) { put(1.6, 2.4, -1, 0, M.lips, 1); put(5, 2.6, 0, 0, M.lips, 1); }
  } else if (r >= 3.2) {
    if (eyes === 'open') { put(1.6, -0.4, 0, 0, M.ink, 0.25); put(1.6, -0.4, 0, 1, M.ink, 0.3); put(4.8, -0.4, 0, 0, M.ink, 0.3); }
    else { put(1.6, -0.4, -1, 1, M.ink, 0.35); put(1.6, -0.4, 0, 1, M.ink, 0.35); }
    if (!o.beard?.len) put(3.6, 4.2, 0, 0, M.lips, 0.5);
    if (o.female || o.young || o.baby) put(1.4, 2.6, 0, 0, M.lips, 1);
  } else {
    put(1.8, -0.2, 0, 0, M.ink, 0.3); put(4.8, -0.2, 0, 0, M.ink, 0.35);
  }
}

// ---------- manos dibujadas (mirando a la derecha) ----------
const HANDS = {
  relaxed: ['.LS.', 'sssS', 'sssS', '.sS.'],
  offer: ['....L', 'Lsss.', 'sssSS', '.SS..'],
  grip: ['.Ls.', 'Lss.', 'sSS.', '.S..'],
  pray: ['..L.', '.Ls.', '.ss.', 'Lss.', 'sSS.', '.S..'],
  point: ['...L', '..L.', 'Lss.', 'sSS.'],
};
export function hand(p, x, y, kind, o = {}) {
  const skin = o.skin ?? M.skin, dir = o.dir ?? 1;
  if (p.s * (o.hs ?? 1) < 0.8) { p.ell(x, y, 2.2, 2.4, { m: skin, R: 1.8, v: o.v || 0 }); return; }
  const rows = HANDS[kind] || HANDS.relaxed;
  const map = { s: [skin, 0.7], S: [skin, 0.4], L: [skin, 1] };
  if (o.dark) { map.s = [skin, 0.45]; map.S = [skin, 0.2]; map.L = [skin, 0.7]; }
  p.stamp(x, y, rows, map, { flip: dir < 0, ol: 1 });
}

// ---------- brazo articulado con manga ----------
// sh, el, wr: hombro, codo, muñeca (coords locales). o: { m (manga), skin, bell, short, dark, hand, dir }
export function arm(p, sh, el, wr, o) {
  const m = o.m, w0 = o.w0 ?? 3.3, w1 = o.w1 ?? 2.9, bell = o.bell ?? 3.6, v = o.dark ? -0.14 : 0;
  const up = sdCapsule(sh[0], sh[1], el[0], el[1], w0, w1);
  let sd;
  if (o.short) {
    const cut = [lerp(sh[0], el[0], 0.75), lerp(sh[1], el[1], 0.75)];
    p.shape(smin(sdCapsule(sh[0], sh[1], el[0], el[1], 2.5, 2.2), sdCapsule(el[0], el[1], wr[0], wr[1], 2.2, 1.8), 1.2), bb(sh, el, wr, 4), { m: o.skin, R: 2, v });
    sd = sdCapsule(sh[0], sh[1], cut[0], cut[1], w0, w1 + 0.4);
  } else {
    const fa = sdCapsule(el[0], el[1], wr[0], wr[1], w1 * 0.95, bell);
    // tela que cuelga bajo el antebrazo
    const dx = wr[0] - el[0], dy = wr[1] - el[1], L = Math.hypot(dx, dy) || 1, mx = el[0] + dx * 0.62, my = el[1] + dy * 0.62;
    const hang = sdEllipse(mx, my + bell * 0.75, L * 0.42, bell * 0.85, Math.atan2(dy, dx) * 0.5);
    sd = smin(smin(up, fa, 1.8), hang, 1.4);
  }
  p.shape(sd, bb(sh, el, wr, 8), { m, R: 2.6, v, fold: (x, y) => [0, Math.sin((x + y) * 0.9) * 0.15] });
  if (!o.short && o.cuff) p.cap(wr[0] - (wr[0] - el[0]) * 0.12, wr[1] - (wr[1] - el[1]) * 0.12, wr[0], wr[1], bell * 0.85, bell * 0.85, { m: o.cuff, R: 1.4 });
  if (o.hand !== false) {
    const dx = wr[0] - el[0], dy = wr[1] - el[1], L = Math.hypot(dx, dy) || 1;
    hand(p, wr[0] + dx / L * 1.8, wr[1] + dy / L * 1.8, o.hand || 'relaxed', { skin: o.skin, dir: o.dir, dark: o.dark });
  }
}
const bb = (a, b, c, r) => [Math.min(a[0], b[0], c[0]) - r, Math.min(a[1], b[1], c[1]) - r, Math.max(a[0], b[0], c[0]) + r, Math.max(a[1], b[1], c[1]) + r + 4];
