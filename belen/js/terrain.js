// Terreno de Belén: colinas, la ciudad en lo alto, el río, el desierto y las montañas nevadas.
import * as THREE from 'three';
import { fbm, ridged, noise2, smoothstep, lerp, clamp, distToPolyline, smoothPath } from './util.js';
import { addDetail } from './materials.js';

export const SIZE = 760;            // metros de lado
export const SEG = 380;             // celdas por lado (2 m)
const CELL = SIZE / SEG;

// Lugares principales del belén (x, z). El norte es -z.
export const LOC = {
  town: { x: 0, z: -82, r: 52 },
  gateS: { x: 0, z: -30 },
  gateW: { x: -52, z: -82 },
  portal: { x: 16, z: 26 },
  shepherds: { x: 112, z: 14 },
  palace: { x: -165, z: -150 },
  desert: { x: 200, z: 200 },
  oasis: { x: 165, z: 128 },
  farm: { x: 96, z: -112 },
  forest: { x: -150, z: 95 },
  mill: { z: -60 },
  laundry: { z: 30 },
};

export function riverX(z) { return -86 + 9 * Math.sin(z / 48) + 4 * Math.sin(z / 19 + 1.3); }
LOC.mill.x = riverX(LOC.mill.z) + 9;
LOC.laundry.x = riverX(LOC.laundry.z) + 6;

// Caminos de tierra
const R = (pts) => smoothPath(pts, 2.5);
export const ROADS = {
  gateToPortal: R([[0, -30], [3, -14], [9, 2], [14, 16], [16, 38]]),
  portalToShepherds: R([[16, 40], [40, 36], [70, 26], [96, 18], [108, 16]]),
  kings: R([[300, 300], [235, 232], [190, 178], [150, 132], [108, 92], [70, 62], [40, 46], [22, 40]]),
  westRoad: R([[-52, -82], [-68, -76], [riverX(-74) - 2, -74], [-112, -92], [-140, -125], [-160, -142]]),
  laundry: R([[0, -30], [-20, -18], [-44, -2], [-62, 18], [riverX(30) + 7, 30]]),
  farm: R([[0, -30], [30, -30], [58, -50], [74, -80], [90, -106]]),
  forest: R([[16, 40], [-20, 62], [-60, 78], [-100, 88], [-140, 96]]),
};
const ROAD_LIST = Object.values(ROADS);

function gauss(x, z, cx, cz, r) { const d2 = (x - cx) ** 2 + (z - cz) ** 2; return Math.exp(-d2 / (r * r)); }

function baseHeight(x, z) {
  let h = fbm(x * 0.007, z * 0.007, 4) * 5 + fbm(x * 0.03 + 7, z * 0.03 - 3, 2) * 0.7;
  // colina de la ciudad
  const dt = Math.hypot(x - LOC.town.x, z - LOC.town.z);
  h += 12 * (1 - smoothstep(50, 92, dt)) + 2.5 * (1 - smoothstep(0, 56, dt));
  // colina del palacio de Herodes
  const dp = Math.hypot(x - LOC.palace.x, z - LOC.palace.z);
  h += 26 * (1 - smoothstep(28, 85, dp));
  // lomas de los pastores
  h += 7 * gauss(x, z, 148, -26, 42) + 4 * gauss(x, z, 86, 44, 26) + 6 * gauss(x, z, 152, 52, 34) + 3 * gauss(x, z, 120, -60, 30);
  // colinas del bosque
  h += 6 * gauss(x, z, -150, 140, 50) + 4 * gauss(x, z, -60, 150, 40);
  // dunas del desierto
  const dd = 1 - smoothstep(60, 170, Math.hypot(x - LOC.desert.x, z - LOC.desert.z));
  h += dd * (2.5 * Math.sin(x * 0.09 + Math.sin(z * 0.05) * 2) * Math.cos(z * 0.06) + 2.2);
  // cordillera alrededor
  const r = Math.hypot(x, (z + 20) * 1.05);
  const m = smoothstep(205, 335, r);
  h += m * (30 + 60 * ridged(x * 0.011 + 3, z * 0.011 - 1, 5));
  return h;
}

// Explanadas para construcciones
const PADS = [
  { x: LOC.portal.x, z: LOC.portal.z, r: 15, fall: 14 },
  { x: LOC.shepherds.x, z: LOC.shepherds.z, r: 11, fall: 12 },
  { x: LOC.mill.x, z: LOC.mill.z, r: 9, fall: 8 },
  { x: LOC.palace.x, z: LOC.palace.z, r: 30, fall: 18 },
  { x: LOC.oasis.x, z: LOC.oasis.z, r: 16, fall: 10 },
  { x: LOC.farm.x, z: LOC.farm.z, r: 11, fall: 10 },
  { x: LOC.town.x, z: LOC.town.z, r: 15, fall: 10 },
];
for (const p of PADS) p.h = baseHeight(p.x, p.z);
LOC.portal.h = PADS[0].h;

// Nivel del agua a lo largo del río (suavizado)
const WL = []; const WL_Z0 = -SIZE / 2, WL_STEP = 4;
(function () {
  const raw = [];
  for (let z = WL_Z0; z <= SIZE / 2; z += WL_STEP) {
    const rx = riverX(z);
    let mn = Infinity;
    for (let dx = -12; dx <= 12; dx += 4) mn = Math.min(mn, baseHeight(rx + dx, z));
    raw.push(mn - 0.6);
  }
  for (let i = 0; i < raw.length; i++) {
    let s = 0, n = 0;
    for (let k = -6; k <= 6; k++) { const j = clamp(i + k, 0, raw.length - 1); s += raw[j]; n++; }
    WL.push(Math.min(raw[i], s / n));
  }
})();
export function waterLevel(z) {
  const f = (z - WL_Z0) / WL_STEP; const i = clamp(Math.floor(f), 0, WL.length - 2); const u = clamp(f - i, 0, 1);
  return lerp(WL[i], WL[i + 1], u);
}

function fullHeight(x, z) {
  let h = baseHeight(x, z);
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    const w = 1 - smoothstep(p.r, p.r + p.fall, d);
    if (w > 0) h = lerp(h, p.h, w);
  }
  // cauce del río
  const d = Math.abs(x - riverX(z));
  if (d < 18) {
    const wl = waterLevel(z);
    const bed = wl - 1.3 - 0.6 * (1 - d / 6);
    const t = smoothstep(4.5, 16, d);
    const bank = Math.max(h, wl + 0.35);
    h = lerp(bed, lerp(bank, h, smoothstep(9, 18, d)), t);
  }
  return h;
}

let HEIGHTS = null; // Float32Array (SEG+1)^2

export function heightAt(x, z) {
  if (!HEIGHTS) return fullHeight(x, z);
  const fx = (x + SIZE / 2) / CELL, fz = (z + SIZE / 2) / CELL;
  const i = clamp(Math.floor(fx), 0, SEG - 1), j = clamp(Math.floor(fz), 0, SEG - 1);
  const u = clamp(fx - i, 0, 1), v = clamp(fz - j, 0, 1);
  const N = SEG + 1;
  const h00 = HEIGHTS[j * N + i], h10 = HEIGHTS[j * N + i + 1], h01 = HEIGHTS[(j + 1) * N + i], h11 = HEIGHTS[(j + 1) * N + i + 1];
  if (u + v <= 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
  return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
}

export function roadDistance(x, z) {
  let d = Infinity;
  for (const r of ROAD_LIST) d = Math.min(d, distToPolyline(x, z, r).d);
  return d;
}

const C = (hex) => new THREE.Color(hex);
const COL = {
  moss: C(0x5d7f2e), moss2: C(0x7a9a3a), dryGrass: C(0xa49a58), dirt: C(0xa98a5c), road: C(0xc2a273),
  sand: C(0xe3c58f), sand2: C(0xd4ad74), rock: C(0x8c8070), rockDark: C(0x6c6358), snow: C(0xf6f4ef),
  bank: C(0x8a7a5a), townGround: C(0xc4a57a),
};

export function buildTerrain() {
  const N = SEG + 1;
  HEIGHTS = new Float32Array(N * N);
  const pos = new Float32Array(N * N * 3);
  const col = new Float32Array(N * N * 3);
  // cálculo de alturas
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -SIZE / 2 + i * CELL, z = -SIZE / 2 + j * CELL;
    HEIGHTS[j * N + i] = fullHeight(x, z);
  }
  // distancia a caminos sólo en la zona central (optimización)
  const tmp = new THREE.Color();
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = j * N + i;
    const x = -SIZE / 2 + i * CELL, z = -SIZE / 2 + j * CELL, h = HEIGHTS[k];
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    const hx = HEIGHTS[j * N + Math.min(i + 1, N - 1)] - HEIGHTS[j * N + Math.max(i - 1, 0)];
    const hz = HEIGHTS[Math.min(j + 1, N - 1) * N + i] - HEIGHTS[Math.max(j - 1, 0) * N + i];
    const slope = Math.hypot(hx, hz) / (2 * CELL);
    const n1 = fbm(x * 0.05, z * 0.05, 2), n2 = noise2(x * 0.21, z * 0.21);
    // base: musgo de belén
    tmp.copy(COL.moss).lerp(COL.moss2, clamp(0.5 + n1 * 0.9, 0, 1));
    tmp.lerp(COL.dryGrass, clamp(0.25 + fbm(x * 0.012 + 9, z * 0.012, 2) * 0.9, 0, 0.7));
    // desierto
    const des = 1 - smoothstep(90, 175, Math.hypot(x - LOC.desert.x, z - LOC.desert.z));
    const des2 = smoothstep(130, 210, x + z * 0.4) * (1 - smoothstep(205, 300, Math.hypot(x, z + 20)));
    const sandW = clamp(Math.max(des, des2 * 0.85), 0, 1);
    if (sandW > 0) { const s = COL.sand.clone().lerp(COL.sand2, clamp(0.5 + n2 * 0.5, 0, 1)); tmp.lerp(s, sandW); }
    // ciudad: tierra pisada
    const dt = Math.hypot(x - LOC.town.x, z - LOC.town.z);
    tmp.lerp(COL.townGround, 1 - smoothstep(LOC.town.r - 2, LOC.town.r + 4, dt));
    // caminos
    if (Math.abs(x) < 320 && Math.abs(z) < 320) {
      const rd = roadDistance(x, z);
      if (rd < 4.5) tmp.lerp(COL.road, (1 - smoothstep(1.6, 4.5, rd)) * (0.85 + 0.15 * n2));
    }
    // orillas del río
    const dr = Math.abs(x - riverX(z));
    if (dr < 11) tmp.lerp(COL.bank, 1 - smoothstep(5, 11, dr));
    // roca en pendientes
    tmp.lerp(COL.rock.clone().lerp(COL.rockDark, clamp(0.5 + n2, 0, 1)), smoothstep(0.55, 1.0, slope));
    // nieve (harina) en las cumbres
    const snowLine = 52 + n1 * 8;
    tmp.lerp(COL.snow, smoothstep(snowLine, snowLine + 7, h) * (1 - smoothstep(1.2, 1.8, slope) * 0.6));
    // variación fina
    const v = 1 + n2 * 0.05;
    col[k * 3] = tmp.r * v; col[k * 3 + 1] = tmp.g * v; col[k * 3 + 2] = tmp.b * v;
  }
  const idx = new Uint32Array(SEG * SEG * 6);
  let p = 0;
  for (let j = 0; j < SEG; j++) for (let i = 0; i < SEG; i++) {
    const a = j * N + i, b = (j + 1) * N + i, c = j * N + i + 1, d = (j + 1) * N + i + 1;
    idx[p++] = a; idx[p++] = b; idx[p++] = c;
    idx[p++] = b; idx[p++] = d; idx[p++] = c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const mat = addDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, flatShading: false }), { mode: 'terrain', bump: 1.4 });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

// Normal map procedural para el agua
function waterNormalTexture() {
  const S = 256; const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(S, S);
  const hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    // ruido periódico
    const a = (x / S) * Math.PI * 2, b = (y / S) * Math.PI * 2;
    hgt[y * S + x] = Math.sin(a * 3 + Math.sin(b * 2) * 1.5) * 0.5 + Math.sin(b * 5 + Math.cos(a * 2)) * 0.35 + Math.sin((a + b) * 7) * 0.15;
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const hx = hgt[y * S + ((x + 1) % S)] - hgt[y * S + ((x - 1 + S) % S)];
    const hy = hgt[((y + 1) % S) * S + x] - hgt[((y - 1 + S) % S) * S + x];
    const n = new THREE.Vector3(-hx * 2, -hy * 2, 1).normalize();
    const i = (y * S + x) * 4;
    img.data[i] = (n.x * 0.5 + 0.5) * 255; img.data[i + 1] = (n.y * 0.5 + 0.5) * 255; img.data[i + 2] = (n.z * 0.5 + 0.5) * 255; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 40);
  return t;
}

export function buildRiver() {
  const zs = [];
  for (let z = -232; z <= 262; z += 3) zs.push(z);
  const W = 7.2;
  const pos = [], uv = [], idx = [];
  zs.forEach((z, k) => {
    const rx = riverX(z), y = waterLevel(z);
    for (let s = 0; s <= 4; s++) {
      const u = s / 4; pos.push(rx - W + 2 * W * u, y, z); uv.push(u, k / zs.length);
    }
  });
  for (let k = 0; k < zs.length - 1; k++) for (let s = 0; s < 4; s++) {
    const a = k * 5 + s, b = a + 1, c = a + 5, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const normalMap = waterNormalTexture();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3f7a9a, roughness: 0.22, metalness: 0.15, normalMap, normalScale: new THREE.Vector2(0.5, 0.5),
    transparent: true, opacity: 0.88,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.name = 'river';
  mesh.userData.update = (t) => { normalMap.offset.y = -t * 0.035; normalMap.offset.x = Math.sin(t * 0.3) * 0.02; };
  return mesh;
}

// Estanque del oasis
export function buildPond(x, z, r, y) {
  const g = new THREE.CircleGeometry(r, 28); g.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x3f8fa0, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.92 });
  const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; return m;
}

// Oscurece el suelo junto a muros y edificios (oclusión ambiental falsa, barata)
export function shadeGround(terrain, shapes) {
  const col = terrain.geometry.attributes.color; const N = SEG + 1;
  for (const sh of shapes) {
    const R = sh.radius; const reach = sh.reach ?? 1.8;
    const i0 = Math.max(0, Math.floor((sh.x - R - reach + SIZE / 2) / CELL)), i1 = Math.min(SEG, Math.ceil((sh.x + R + reach + SIZE / 2) / CELL));
    const j0 = Math.max(0, Math.floor((sh.z - R - reach + SIZE / 2) / CELL)), j1 = Math.min(SEG, Math.ceil((sh.z + R + reach + SIZE / 2) / CELL));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = -SIZE / 2 + i * CELL, z = -SIZE / 2 + j * CELL;
      const d = sh.dist(x, z);
      if (d > reach) continue;
      const k = (sh.strength ?? 0.4) * (1 - Math.max(0, d) / reach);
      const idx = j * N + i; const f = 1 - k;
      col.setXYZ(idx, col.getX(idx) * f, col.getY(idx) * f, col.getZ(idx) * f);
    }
  }
  col.needsUpdate = true;
}
