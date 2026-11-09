// Mapa de pergamino en pixel art: Tierra Santa esquemática con el camino de la Sagrada Familia
// y el de los Reyes, y dónde está cada uno el día que se muestra.
import { noise, fbm } from './engine.js';

const MW = 120, MH = 92;
const PLACES = { nazaret: [58, 20, 'Nazaret'], tabor: [64, 25], jerico: [79, 56, 'Jericó'], jerusalen: [66, 60, 'Jerusalén'], belen: [64, 66, 'Belén'], petra: [104, 86, 'Petra'] };
const FAMILY = [[58, 20], [64, 26], [72, 32], [78, 40], [79, 48], [79, 56], [72, 58], [66, 60], [64, 66]];
const KINGS = [[119, 34], [112, 52], [104, 70], [104, 86], [92, 72], [80, 64], [66, 60], [64, 66]];
// posición en cada ruta (0..1) según el día; null = no se muestra
const STOPS = {
  '12-16': [0, null], '12-17': [0.16, null], '12-18': [0.35, null], '12-19': [0.45, null], '12-20': [0.62, null], '12-21': [0.72, null], '12-22': [0.86, null], '12-23': [1, null], '12-24': [1, null],
  '12-25': [1, 0], '12-26': [1, 0.04], '12-27': [1, 0.08], '12-28': [1, 0.18], '12-29': [1, 0.25], '12-30': [1, 0.32], '12-31': [1, 0.42], '01-01': [1, 0.46],
  '01-02': [1, 0.86], '01-03': [1, 0.86], '01-04': [1, 0.86], '01-05': [1, 1], '01-06': [1, 1], '01-07': [1, 1],
};
const along = (path, u) => {
  const seg = []; let tot = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); seg.push(l); tot += l; }
  let d = u * tot;
  for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) { const t = d / seg[i]; return [path[i][0] + (path[i + 1][0] - path[i][0]) * t, path[i][1] + (path[i + 1][1] - path[i][1]) * t]; } d -= seg[i]; }
  return path[path.length - 1];
};

let base = null;
function paintBase() {
  const img = new ImageData(MW, MH), d = img.data;
  const coast = y => 26 - y * 0.2 + 3 * Math.sin(y * 0.08) + 2 * fbm(y * 0.1, 3);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const j = (y * MW + x) * 4, n = fbm(x * 0.12, y * 0.12), edge = Math.min(x, y, MW - 1 - x, MH - 1 - y);
    let c = [214 - n * 40, 186 - n * 40, 136 - n * 36];
    if (x < coast(y)) c = [126 - n * 20, 140 - n * 20, 138 - n * 16];
    const sea = (cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
    if (sea(78, 21, 3, 4.5) || sea(81, 68, 3.2, 11)) c = [110, 132, 136];
    if (edge < 3) c = c.map(v => v * (0.6 + edge * 0.12));
    if (noise(x * 0.7, y * 0.7) > 0.8) c = c.map(v => v * 0.93);
    d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
  }
  const px = (x, y, c) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= MW || y >= MH) return; const j = (y * MW + x) * 4; d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; };
  // río Jordán
  for (let y = 25; y < 57; y++) px(79 + Math.sin(y * 0.5) * 1.2, y, [90, 116, 128]);
  // montes (pequeños triángulos)
  for (const [x, y] of [[64, 25], [56, 44], [60, 50], [70, 76], [96, 40], [100, 60]]) { px(x, y - 2, [120, 92, 62]); px(x - 1, y - 1, [120, 92, 62]); px(x + 1, y - 1, [150, 116, 80]); px(x - 2, y, [120, 92, 62]); px(x + 2, y, [150, 116, 80]); }
  // rutas punteadas
  const dash = (path, c) => { let k = 0; for (let i = 1; i < path.length; i++) { const [a, b] = [path[i - 1], path[i]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])); for (let s = 0; s < n; s++, k++) if (k % 3 < 2) px(a[0] + (b[0] - a[0]) * s / n, a[1] + (b[1] - a[1]) * s / n, c); } };
  dash(FAMILY, [150, 52, 40]);
  dash(KINGS, [96, 60, 130]);
  for (const k in PLACES) { const [x, y] = PLACES[k]; px(x, y, [60, 36, 24]); px(x + 1, y, [60, 36, 24]); px(x, y + 1, [60, 36, 24]); px(x + 1, y + 1, [60, 36, 24]); }
  // rosa de los vientos
  for (let k = -3; k <= 3; k++) { px(12, 80 + k, [90, 60, 40]); px(12 + k, 80, [90, 60, 40]); }
  px(12, 75, [150, 52, 40]);
  return img;
}

export function drawMap(cv, key, t = 0) {
  const ctx = cv.getContext('2d');
  if (!base) base = paintBase();
  ctx.putImageData(base, 0, 0);
  const st = STOPS[key];
  const mark = (path, u, c) => { const [x, y] = along(path, u); ctx.fillStyle = c; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 3); ctx.fillStyle = '#fff6d0'; ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1); };
  if (st && st[0] != null) mark(FAMILY, st[0], '#b02a1e');
  if (st && st[1] != null) mark(KINGS, st[1], '#5a2c8c');
  if (!st) { const [x, y] = key >= '11-29' || key < '12-16' ? PLACES.nazaret : PLACES.belen; ctx.fillStyle = '#b02a1e'; ctx.fillRect(x - 1, y - 2, 3, 3); }
  // la estrella sobre Belén a partir de Nochebuena
  if (st && (key >= '12-24' || key < '06-01')) { const tw = Math.sin(t * 3) > 0 ? '#fff4b0' : '#ffd860'; ctx.fillStyle = tw; ctx.fillRect(64, 58, 1, 3); ctx.fillRect(63, 59, 3, 1); }
}
export const MAP_SIZE = [MW, MH];
