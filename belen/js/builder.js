// Construcción procedural: casas hebreas, murallas, el Portal, puente, molino, horno, fragua...
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RNG, clamp, lerp, noise2 } from './util.js';
import { heightAt } from './terrain.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

function prep(geo) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.uv1) g.deleteAttribute('uv1');
  return g;
}
function paint(g, color, jitter = 0, rng = null) {
  const c = new THREE.Color(color);
  if (jitter && rng) { const k = 1 + (rng.next() - 0.5) * jitter; c.multiplyScalar(k); }
  const n = g.attributes.position.count; const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

export class GeoBuilder {
  constructor() { this.parts = []; }
  add(geo, color, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, parent = null } = {}) {
    const g = paint(prep(geo.clone ? geo.clone() : geo), color);
    _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    if (parent) _m.premultiply(parent);
    g.applyMatrix4(_m);
    this.parts.push(g);
    return g;
  }
  box(w, h, d, color, o = {}) { return this.add(new THREE.BoxGeometry(w, h, d), color, o); }
  cyl(rt, rb, h, color, o = {}, seg = 8, open = false) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), color, o); }
  sphere(r, color, o = {}, ws = 10, hs = 6, thetaLen = Math.PI) { return this.add(new THREE.SphereGeometry(r, ws, hs, 0, Math.PI * 2, 0, thetaLen), color, o); }
  merge(other) { this.parts.push(...other.parts); other.parts = []; }
  build(material, { castShadow = true, receiveShadow = true, name = '' } = {}) {
    if (!this.parts.length) return null;
    const g = mergeGeometries(this.parts, false);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.castShadow = castShadow; m.receiveShadow = receiveShadow; m.name = name;
    this.parts = [];
    return m;
  }
}

// Matriz local para colocar piezas relativas a un edificio
export function frame(x, y, z, ry) { return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(1, 1, 1)); }

export const WALL_COLORS = [0xf0e8d8, 0xe9dcc2, 0xe2cfa8, 0xd8bf94, 0xf2ead8, 0xdcc6a4, 0xe8d6c0, 0xcfb48c];
const WOOD = 0x6a4a2c, WOOD_DARK = 0x4a3220, DOOR = 0x5a3a24, CLOTH = [0xb03a2a, 0x2a6a9a, 0xd8a838, 0x3a7a4a, 0x8a3a7a, 0xe0d0b0];

// Altura mínima/máxima del terreno bajo una huella rectangular
export function footprint(x, z, w, d, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  let mn = Infinity, mx = -Infinity;
  for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0], [0, 1], [1, 0], [-1, 0], [0, -1]]) {
    const lx = u * w / 2, lz = v * d / 2;
    const h = heightAt(x + lx * c + lz * s, z - lx * s + lz * c);
    mn = Math.min(mn, h); mx = Math.max(mx, h);
  }
  return { mn, mx };
}

// Casa hebrea de muros encalados, azotea con pretil, vigas asomando, escalera exterior y cúpula opcional
export function hebrewHouse(B, W, { x, z, ry = 0, w = 6, d = 5, floors = 1, color, rng, lit = 0.6, dome = false, stairs = null, awning = null, clutter = true }) {
  const { mn, mx } = footprint(x, z, w, d, ry);
  const base = lerp(mn, mx, 0.7);
  const F = frame(x, base, z, ry);
  const H1 = rng.range(2.9, 3.4);
  const wall = color;
  const roofCol = new THREE.Color(wall).multiplyScalar(0.86).getHex();
  // cimiento
  const foundH = base - mn + 1.5;
  B.box(w + 0.2, foundH, d + 0.2, 0xb8a07c, { y: -foundH / 2 + 0.05, parent: F });
  // planta baja
  B.box(w, H1, d, wall, { y: H1 / 2, parent: F });
  B.box(w + 0.12, 0.14, d + 0.12, roofCol, { y: H1 + 0.02, parent: F });
  // pretil
  const pt = 0.16, ph = 0.42;
  B.box(w, ph, pt, wall, { y: H1 + ph / 2, z: d / 2 - pt / 2, parent: F });
  B.box(w, ph, pt, wall, { y: H1 + ph / 2, z: -d / 2 + pt / 2, parent: F });
  B.box(pt, ph, d, wall, { y: H1 + ph / 2, x: w / 2 - pt / 2, parent: F });
  B.box(pt, ph, d, wall, { y: H1 + ph / 2, x: -w / 2 + pt / 2, parent: F });
  // vigas que asoman bajo la azotea
  const nb = Math.floor(w / 0.9);
  for (let i = 0; i < nb; i++) {
    const bx = -w / 2 + 0.5 + i * ((w - 1) / Math.max(1, nb - 1));
    B.box(0.13, 0.13, 0.55, WOOD_DARK, { x: bx, y: H1 - 0.28, z: d / 2 + 0.2, parent: F });
  }
  // puerta con arco
  const dw = rng.range(0.95, 1.2), dh = rng.range(1.85, 2.1), dx = rng.range(-w / 2 + 1.2, w / 2 - 1.2) * 0.6;
  B.box(dw, dh, 0.1, DOOR, { x: dx, y: dh / 2, z: d / 2 + 0.03, parent: F });
  B.add(new THREE.CylinderGeometry(dw / 2, dw / 2, 0.1, 10, 1, false, -Math.PI / 2, Math.PI), DOOR, { x: dx, y: dh, z: d / 2 + 0.03, rx: Math.PI / 2, parent: F });
  B.box(dw + 0.3, 0.12, 0.5, 0xc8b08a, { x: dx, y: 0.06, z: d / 2 + 0.25, parent: F });
  // ventanas
  const win = (wx, wy, wz, rot) => {
    const lightOn = rng.chance(lit);
    const ww = rng.range(0.45, 0.6), wh = rng.range(0.55, 0.75);
    if (lightOn) W.box(ww, wh, 0.06, 0xffc070, { x: wx, y: wy, z: wz, ry: rot, parent: F });
    else B.box(ww, wh, 0.06, 0x2a2018, { x: wx, y: wy, z: wz, ry: rot, parent: F });
    B.box(ww + 0.16, 0.08, 0.14, 0xc8b08a, { x: wx + Math.sin(rot) * 0.03, y: wy - wh / 2 - 0.04, z: wz + Math.cos(rot) * 0.03, ry: rot, parent: F });
  };
  const nwf = Math.max(1, Math.floor(w / 2.4));
  for (let i = 0; i < nwf; i++) { const wx = -w / 2 + (i + 0.5) * (w / nwf); if (Math.abs(wx - dx) > dw) win(wx, H1 * 0.62, d / 2 + 0.035, 0); }
  if (rng.chance(0.7)) win(w / 2 + 0.035, H1 * 0.6, rng.range(-d / 4, d / 4), Math.PI / 2);
  if (rng.chance(0.7)) win(-w / 2 - 0.035, H1 * 0.6, rng.range(-d / 4, d / 4), -Math.PI / 2);
  let topY = H1;
  // segundo piso
  if (floors >= 2) {
    const w2 = w * rng.range(0.5, 0.85), d2 = d * rng.range(0.5, 0.8), H2 = rng.range(2.4, 2.8);
    const ox = (w - w2) / 2 * rng.sign() * rng.range(0.3, 1), oz = -(d - d2) / 2;
    B.box(w2, H2, d2, wall, { x: ox, y: H1 + H2 / 2, z: oz, parent: F });
    B.box(w2 + 0.12, 0.14, d2 + 0.12, roofCol, { x: ox, y: H1 + H2 + 0.02, z: oz, parent: F });
    B.box(w2, ph, pt, wall, { x: ox, y: H1 + H2 + ph / 2, z: oz + d2 / 2 - pt / 2, parent: F });
    B.box(w2, ph, pt, wall, { x: ox, y: H1 + H2 + ph / 2, z: oz - d2 / 2 + pt / 2, parent: F });
    B.box(pt, ph, d2, wall, { x: ox + w2 / 2 - pt / 2, y: H1 + H2 + ph / 2, z: oz, parent: F });
    B.box(pt, ph, d2, wall, { x: ox - w2 / 2 + pt / 2, y: H1 + H2 + ph / 2, z: oz, parent: F });
    for (let i = 0; i < Math.max(1, Math.floor(w2 / 1.8)); i++) win(ox - w2 / 2 + (i + 0.5) * (w2 / Math.max(1, Math.floor(w2 / 1.8))), H1 + H2 * 0.55, oz + d2 / 2 + 0.035, 0);
    // puerta a la azotea
    B.box(0.85, 1.7, 0.08, DOOR, { x: ox + rng.range(-w2 / 4, w2 / 4), y: H1 + 0.85, z: oz + d2 / 2 + 0.03, parent: F });
    if (dome || rng.chance(0.12)) B.sphere(Math.min(w2, d2) * 0.36, wall, { x: ox, y: H1 + H2 + 0.1, z: oz, parent: F }, 12, 6, Math.PI / 2);
    topY = H1 + H2;
  } else if (dome) {
    B.sphere(Math.min(w, d) * 0.33, wall, { x: rng.range(-0.5, 0.5), y: H1 + 0.1, z: -d * 0.1, parent: F }, 12, 6, Math.PI / 2);
  }
  // escalera exterior hasta la azotea
  if (stairs ?? rng.chance(0.35)) {
    const side = rng.sign(); const n = Math.round(H1 / 0.3); const sw = 0.9;
    for (let i = 0; i < n; i++) {
      const sh = (i + 1) * (H1 / n);
      B.box(sw, sh, 0.32, wall, { x: side * (w / 2 + sw / 2), y: sh / 2, z: d / 2 - 0.4 - i * 0.32 - (d > 4.5 ? 0 : 0), parent: F, sz: 1 });
      if (i * 0.32 > d - 1.0) break;
    }
  }
  // toldo de tela sobre la puerta
  if (awning ?? rng.chance(0.3)) {
    const col = rng.pick(CLOTH);
    B.box(dw + 1.3, 0.04, 1.3, col, { x: dx, y: dh + 0.45, z: d / 2 + 0.65, rx: 0.28, parent: F });
    B.cyl(0.04, 0.04, dh + 0.3, WOOD, { x: dx - (dw + 1.2) / 2, y: (dh + 0.3) / 2, z: d / 2 + 1.25, parent: F }, 5);
    B.cyl(0.04, 0.04, dh + 0.3, WOOD, { x: dx + (dw + 1.2) / 2, y: (dh + 0.3) / 2, z: d / 2 + 1.25, parent: F }, 5);
  }
  // objetos en la azotea: tinajas, plantas, tendedero
  if (clutter) {
    const nJ = rng.int(0, 3);
    for (let i = 0; i < nJ; i++) B.cyl(0.18, 0.13, 0.5, rng.pick([0xb8643a, 0xa05a30, 0xc88a5a]), { x: rng.range(-w / 2 + 0.6, w / 2 - 0.6), y: H1 + 0.32, z: rng.range(0.4, d / 2 - 0.5), parent: F }, 7);
    if (rng.chance(0.4)) B.sphere(0.45, rng.pick([0x4a7a3a, 0x5a8a3a, 0x3a6a2a]), { x: rng.range(-w / 2 + 0.7, w / 2 - 0.7), y: H1 + 0.3, z: d / 2 - 0.6, parent: F }, 7, 5);
    if (rng.chance(0.25)) {
      const cy = H1 + 1.4; B.cyl(0.03, 0.03, 1.4, WOOD, { x: -w / 2 + 0.4, y: H1 + 0.7, z: 0, parent: F }, 4); B.cyl(0.03, 0.03, 1.4, WOOD, { x: w / 2 - 0.4, y: H1 + 0.7, z: 0, parent: F }, 4);
      for (let i = 0; i < 3; i++) B.box(0.7, 0.6, 0.02, rng.pick(CLOTH.concat([0xf4f0e8, 0xf4f0e8])), { x: -w / 2 + 1.0 + i * (w - 2) / 3, y: cy - 0.32, z: 0, parent: F });
    }
  }
  return { base, top: topY, door: new THREE.Vector3(dx, 0, d / 2 + 0.6).applyMatrix4(F), F, H1 };
}

// Muralla circular con almenas, torres y puertas
export function cityWalls(B, { cx, cz, r, gates = [], wallH = 6.5, thick = 1.8, rng }) {
  const STEP = 3.6 / r; // radianes por tramo
  const towerEvery = Math.PI / 7;
  const inGate = (a) => gates.find((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < (3.4 / r));
  const stone = 0xcdb28a, stoneD = 0xb89c74;
  for (let a = 0; a < Math.PI * 2 - 1e-6; a += STEP) {
    const am = a + STEP / 2;
    if (inGate(am)) continue;
    const x = cx + Math.cos(am) * r, z = cz + Math.sin(am) * r;
    const g = heightAt(x, z);
    const ry = -am + Math.PI / 2;
    const len = STEP * r + 0.25;
    const F = frame(x, g, z, ry);
    const H = wallH + 3;
    B.box(len, H, thick, rng.chance(0.5) ? stone : 0xd3b892, { y: wallH - H / 2, parent: F });
    // almenas en el lado exterior
    for (let k = 0; k < 2; k++) B.box(len * 0.32, 0.8, 0.45, stone, { x: (k - 0.5) * len * 0.5, y: wallH + 0.4, z: thick / 2 - 0.22, parent: F });
    B.box(len, 0.35, 0.4, stoneD, { y: wallH + 0.17, z: -thick / 2 + 0.2, parent: F });
  }
  // torres
  const towers = [];
  for (let a = towerEvery / 2; a < Math.PI * 2; a += towerEvery) {
    if (inGate(a)) continue;
    towers.push(a);
  }
  for (const g of gates) towers.push(g - 4.3 / r, g + 4.3 / r);
  for (const a of towers) {
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const g = heightAt(x, z) - 0.5;
    const ry = -a + Math.PI / 2;
    const F = frame(x, g, z, ry);
    const T = 4.4, TH = wallH + 3.2;
    B.box(T, TH + 3, T, stone, { y: (TH + 3) / 2 - 3, parent: F });
    B.box(T + 0.3, 0.3, T + 0.3, stoneD, { y: TH, parent: F });
    for (let i = 0; i < 4; i++) for (let k = 0; k < 2; k++) {
      const off = (k - 0.5) * T * 0.5;
      const rot = i * Math.PI / 2;
      const px = Math.sin(rot) * (T / 2 - 0.2) + Math.cos(rot) * off, pz = Math.cos(rot) * (T / 2 - 0.2) - Math.sin(rot) * off;
      B.box(0.9, 0.8, 0.4, stone, { x: px, y: TH + 0.55, z: pz, ry: rot, parent: F });
    }
    // saeteras
    B.box(0.18, 0.9, 0.1, 0x3a2a20, { y: TH - 2, z: T / 2 + 0.01, parent: F });
  }
  // dinteles de las puertas
  for (const ga of gates) {
    const x = cx + Math.cos(ga) * r, z = cz + Math.sin(ga) * r;
    const g = heightAt(x, z);
    const ry = -ga + Math.PI / 2;
    const F = frame(x, g, z, ry);
    B.box(6.8, 1.6, thick + 0.6, stone, { y: 5.6, parent: F });
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, ang = Math.PI * t; const ax = Math.cos(ang) * 2.4, ay = 3.2 + Math.sin(ang) * 1.4;
      B.box(0.6, 0.5, thick + 0.4, stoneD, { x: ax, y: ay, rz: ang - Math.PI / 2, parent: F });
    }
    for (const sx of [-1, 1]) B.box(1.0, 5.0, thick + 0.6, stone, { x: sx * 2.9, y: 2.4, parent: F });
    B.box(5.2, 0.12, thick + 1.2, 0xa88a62, { y: 0.06, parent: F });
  }
}

// Rocas facetadas (cueva del Portal, peñascos)
export function rockBlob(B, { x, y, z, sx = 2, sy = 2, sz = 2, ry = 0, color = 0x8a7a68, rng, detail = 2 }) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position;
  const sd = rng.range(0, 100);
  // desplazamiento en función de la posición: los vértices compartidos se mueven igual (sin grietas)
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
    const n = noise2(px * 1.3 + sd, pz * 1.3 + py * 0.9) * 0.22 + noise2(py * 2.6 - sd, px * 2.6 + pz * 1.7) * 0.1;
    const k = 1 + n;
    pos.setXYZ(i, px * k, py * k * (py < -0.3 ? 0.6 : 1), pz * k);
  }
  B.add(g, color, { x, y, z, ry, sx, sy, sz });
}

// Muro de piedra en ruinas (sillares irregulares con remate roto)
export function ruinWall(B, F, { x0, z0, len, height, axis = 'z', rng, color = 0xbca486 }) {
  const cols = Math.round(len / 0.62);
  for (let c = 0; c < cols; c++) {
    const top = height * (0.35 + 0.65 * Math.abs(Math.sin(c * 0.9 + 1))) * rng.range(0.75, 1.0);
    const rows = Math.max(1, Math.round(top / 0.38));
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * 0.31;
      const t = -len / 2 + c * 0.62 + off;
      if (t > len / 2) continue;
      const col = new THREE.Color(rng.pick([color, 0xb09878, 0xc8b090, 0xa89070])).multiplyScalar(rng.range(0.92, 1.06)).getHex();
      const bw = rng.range(0.52, 0.6), bh = rng.range(0.32, 0.37);
      const px = axis === 'z' ? x0 + rng.range(-0.03, 0.03) : x0 + t, pz = axis === 'z' ? z0 + t : z0 + rng.range(-0.03, 0.03);
      B.box(axis === 'z' ? 0.55 : bw, bh, axis === 'z' ? bw : 0.55, col, { x: px, y: 0.19 + r * 0.38, z: pz, ry: rng.range(-0.04, 0.04), parent: F });
    }
    if (rng.chance(0.35)) B.sphere(0.25, rng.pick([0x5a7a3a, 0x6a8a3a]), { x: axis === 'z' ? x0 : x0 - len / 2 + c * 0.62, y: rows * 0.38 + 0.05, z: axis === 'z' ? z0 - len / 2 + c * 0.62 : z0, sy: 0.6, parent: F }, 6, 4);
  }
}

// El Portal de Belén: cueva de roca, establo de madera con techo de paja, ruina de piedra y pesebre
export function buildPortal(B, { x, z, y, rng }) {
  const F = frame(x, y, z, 0);
  const WOODP = 0x5e4026, STRAW = 0xd2b05a, STRAW2 = 0xc09a48, STONE = 0xbca486;
  // cueva de roca detrás
  const rocks = [
    [-7.2, 1.6, -4.6, 3.0, 3.2, 3.0], [-3.6, 2.6, -6.2, 3.6, 4.0, 3.0], [0.8, 3.2, -6.8, 4.2, 4.6, 3.2], [5.0, 2.6, -6.0, 3.6, 3.8, 3.0],
    [8.4, 1.4, -4.0, 2.6, 2.6, 2.6], [-9.2, 0.6, -1.8, 2.0, 1.8, 2.2], [10.0, 0.5, -1.2, 1.8, 1.4, 1.8], [-1.2, 6.6, -8.4, 4.4, 3.0, 3.0],
    [4.2, 6.0, -8.0, 3.2, 2.6, 2.6], [-5.6, 5.6, -7.6, 3.0, 2.4, 2.6], [-11.0, 0.3, 1.2, 1.4, 1.0, 1.4], [12.0, 0.2, 0.6, 1.2, 0.9, 1.2],
  ];
  for (const [rx, ry, rz, sx, sy, sz] of rocks) {
    rockBlob(B, { x: x + rx, y: y + ry, z: z + rz, sx, sy, sz, ry: rng.range(0, 6), color: rng.pick([0x9a8a76, 0xa4927a, 0x8e8070, 0xa89880]), rng });
  }
  // musgo y matas sobre la roca
  for (let i = 0; i < 14; i++) B.sphere(rng.range(0.35, 0.7), rng.pick([0x5a7a3a, 0x4f6e32, 0x6a8a40]), { x: x + rng.range(-8, 8), y: y + rng.range(4.5, 8.5), z: z + rng.range(-8.5, -5.5), sy: 0.6, parent: null }, 7, 5);
  // postes del establo
  const posts = [[-3.6, 2.2], [0, 2.4], [3.6, 2.2], [-3.6, -2.8], [3.6, -2.8]];
  for (const [px, pz] of posts) B.cyl(0.16, 0.19, 3.4, WOODP, { x: px, y: 1.7, z: pz, parent: F }, 6);
  // vigas
  B.box(7.8, 0.26, 0.26, WOODP, { y: 3.42, z: 2.3, parent: F });
  B.box(7.8, 0.26, 0.26, WOODP, { y: 3.62, z: -2.8, parent: F });
  for (const bx of [-3.6, 0, 3.6]) B.box(0.22, 0.22, 5.6, WOODP, { x: bx, y: 3.55, z: -0.25, rx: -0.04, parent: F });
  // techo de tablas con huecos y paja
  for (let i = 0; i < 17; i++) {
    if (i === 5 || i === 11) continue; // tablas rotas
    const bx = -4.0 + i * 0.5;
    B.box(0.44, 0.07, 6.2 + rng.range(-0.4, 0.3), rng.chance(0.5) ? 0x7a5634 : 0x6e4c2e, { x: bx, y: 3.78, z: -0.25 + rng.range(-0.15, 0.15), rx: -0.05, parent: F });
  }
  for (let i = 0; i < 14; i++) B.box(rng.range(1.2, 2.4), 0.22, rng.range(1.0, 2.2), rng.chance(0.5) ? STRAW : STRAW2, { x: rng.range(-3.6, 3.6), y: 3.92, z: rng.range(-2.6, 2.2), ry: rng.range(-0.5, 0.5), rz: rng.range(-0.06, 0.06), parent: F });
  // ruina de piedra a la izquierda y columnas romanas a la derecha
  ruinWall(B, F, { x0: -4.6, z0: -0.4, len: 5.2, height: 2.8, axis: 'z', rng });
  ruinWall(B, F, { x0: -6.6, z0: 2.4, len: 3.2, height: 1.6, axis: 'x', rng });
  for (const [cx, cz, ch] of [[5.0, 1.8, 3.6], [6.6, 1.0, 2.1]]) {
    B.box(0.85, 0.3, 0.85, 0xc8b496, { x: cx, y: 0.15, z: cz, parent: F });
    B.cyl(0.3, 0.33, ch, 0xd6c4a4, { x: cx, y: 0.3 + ch / 2, z: cz, parent: F }, 10);
    if (ch > 3) B.box(0.8, 0.28, 0.8, 0xc8b496, { x: cx, y: 0.3 + ch + 0.14, z: cz, parent: F });
  }
  B.cyl(0.28, 0.28, 1.6, 0xd0bc9c, { x: 6.2, y: 0.28, z: 3.4, rz: Math.PI / 2, ry: 0.5, parent: F }, 10);
  for (let i = 0; i < 6; i++) B.box(rng.range(0.4, 0.6), 0.34, rng.range(0.4, 0.6), rng.pick([STONE, 0xb09878]), { x: rng.range(4.4, 7.4), y: 0.17, z: rng.range(2.2, 4.6), ry: rng.range(0, 3), rz: rng.range(-0.2, 0.2), parent: F });
  // suelo de paja
  for (let i = 0; i < 18; i++) B.cyl(rng.range(0.5, 1.2), rng.range(0.6, 1.3), 0.06, rng.chance(0.5) ? STRAW : STRAW2, { x: rng.range(-4, 4), y: 0.03, z: rng.range(-2.5, 2.6), parent: F }, 7);
  // pesebre
  const MX = 0.2, MZ = 0.6;
  B.box(1.25, 0.08, 0.6, WOODP, { x: MX, y: 0.62, z: MZ, parent: F });
  B.box(1.35, 0.32, 0.07, WOODP, { x: MX, y: 0.78, z: MZ + 0.32, rx: -0.25, parent: F });
  B.box(1.35, 0.32, 0.07, WOODP, { x: MX, y: 0.78, z: MZ - 0.32, rx: 0.25, parent: F });
  B.box(0.07, 0.34, 0.75, WOODP, { x: MX - 0.66, y: 0.78, z: MZ, parent: F });
  B.box(0.07, 0.34, 0.75, WOODP, { x: MX + 0.66, y: 0.78, z: MZ, parent: F });
  for (const lx of [-0.55, 0.55]) for (const s of [-1, 1]) B.box(0.07, 0.8, 0.07, WOODP, { x: MX + lx, y: 0.34, z: MZ + s * 0.22, rx: s * 0.4, parent: F });
  B.box(1.2, 0.16, 0.55, STRAW, { x: MX, y: 0.75, z: MZ, parent: F });
  for (let i = 0; i < 6; i++) B.box(0.5, 0.04, 0.06, STRAW2, { x: MX + rng.range(-0.5, 0.5), y: 0.86, z: MZ + rng.range(-0.3, 0.3), ry: rng.range(0, 3), rz: rng.range(-0.3, 0.3), parent: F });
  // valla de madera para los animales
  for (let i = 0; i < 4; i++) B.box(0.1, 1.0, 0.1, WOODP, { x: 2.4, y: 0.5, z: -2.2 + i * 1.1, parent: F });
  B.box(0.06, 0.1, 3.4, WOODP, { x: 2.4, y: 0.75, z: -0.55, parent: F });
  B.box(0.06, 0.1, 3.4, WOODP, { x: 2.4, y: 0.4, z: -0.55, parent: F });
  return { manger: new THREE.Vector3(x + MX, y + 0.86, z + MZ), lanternPos: new THREE.Vector3(x - 1.6, y + 3.0, z + 2.3) };
}

// Puente de piedra en arco
export function stoneBridge(B, { x, z, y0, len = 20, width = 3.6, ry = 0, rise = 2.4 }) {
  const F = frame(x, y0, z, ry);
  const N = 16; const STONE = 0xc2a882;
  for (let i = 0; i < N; i++) {
    const t0 = i / N, t1 = (i + 1) / N, tm = (t0 + t1) / 2;
    const xx = -len / 2 + tm * len;
    const yy = Math.sin(tm * Math.PI) * rise;
    const ang = Math.atan2((Math.sin(t1 * Math.PI) - Math.sin(t0 * Math.PI)) * rise, len / N);
    B.box(len / N + 0.06, 0.5, width, STONE, { x: xx, y: yy + 0.6, rz: ang, parent: F });
    B.box(len / N + 0.06, 0.6, 0.3, 0xb09670, { x: xx, y: yy + 1.15, z: width / 2 - 0.15, rz: ang, parent: F });
    B.box(len / N + 0.06, 0.6, 0.3, 0xb09670, { x: xx, y: yy + 1.15, z: -width / 2 + 0.15, rz: ang, parent: F });
  }
  // arco inferior
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * i / 10; const ax = Math.cos(a) * 4.2, ay = Math.sin(a) * 2.8 - 1.6;
    B.box(0.8, 0.6, width - 0.2, 0xae9470, { x: ax, y: ay, rz: a - Math.PI / 2, parent: F });
  }
  for (const s of [-1, 1]) B.box(3.2, 3.6, width, STONE, { x: s * 6.2, y: -0.9, parent: F });
}

// Molino de agua: casa de piedra con tejado y rueda giratoria
export function waterMill(B, scene, { x, z, y, ry = 0, riverSide = -1 }) {
  const F = frame(x, y, z, ry);
  const STONE = 0xb8a080, ROOF = 0x9a5a3a;
  B.box(6, 4.2, 5, STONE, { y: 2.1, parent: F });
  B.box(6.2, 1.2, 5.2, 0xa89070, { y: -0.4, parent: F });
  // tejado a dos aguas
  B.box(6.6, 0.18, 3.1, ROOF, { y: 5.1, z: 1.25, rx: 0.6, parent: F });
  B.box(6.6, 0.18, 3.1, ROOF, { y: 5.1, z: -1.25, rx: -0.6, parent: F });
  B.add(new THREE.CylinderGeometry(0.0001, 1.0, 2.2, 3, 1), STONE, { x: 3.0, y: 4.7, rz: Math.PI / 2, ry: 0, sx: 1, sy: 1, sz: 1, parent: F });
  B.add(new THREE.CylinderGeometry(0.0001, 1.0, 2.2, 3, 1), STONE, { x: -3.0, y: 4.7, rz: -Math.PI / 2, parent: F });
  B.box(1.1, 2.0, 0.1, 0x5a3a24, { y: 1.0, z: 2.52, parent: F });
  B.box(0.6, 0.6, 0.08, 0xffc070, { x: 1.8, y: 2.6, z: 2.52, parent: F });
  // canal de madera
  B.box(0.8, 0.5, 9, 0x6a4a2c, { x: riverSide * 3.9, y: 4.6, z: -3, parent: F });
  // rueda
  const wheel = new THREE.Group();
  const WB = new GeoBuilder();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    WB.box(0.15, 3.6, 0.15, 0x5a3a22, { rz: a });
    WB.box(0.9, 0.5, 0.08, 0x6a4a2c, { x: Math.cos(a) * 1.9, y: Math.sin(a) * 1.9, rz: a + Math.PI / 2, ry: Math.PI / 2 });
  }
  WB.add(new THREE.TorusGeometry(1.8, 0.1, 4, 18), 0x4a3220, { z: 0.42 });
  WB.add(new THREE.TorusGeometry(1.8, 0.1, 4, 18), 0x4a3220, { z: -0.42 });
  WB.cyl(0.25, 0.25, 1.4, 0x3a2a1a, { rx: Math.PI / 2 });
  const wm = WB.build(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }));
  wheel.add(wm);
  const wp = new THREE.Vector3(riverSide * 3.75, 2.0, 0).applyMatrix4(F);
  wheel.position.copy(wp); wheel.rotation.y = ry + Math.PI / 2;
  wm.rotation.y = 0;
  scene.add(wheel);
  return { wheel: wm };
}

// Horno de pan (cúpula de barro)
export function bakeryOven(B, G, { x, z, y, ry = 0 }) {
  const F = frame(x, y, z, ry);
  B.box(2.6, 0.8, 2.6, 0xb89a72, { y: 0.4, parent: F });
  B.sphere(1.15, 0xc8925e, { y: 0.8, parent: F }, 12, 7, Math.PI / 2);
  B.box(0.6, 0.5, 0.3, 0x2a1a10, { y: 1.1, z: 1.05, parent: F });
  G.box(0.5, 0.36, 0.1, 0xff8a30, { y: 1.08, z: 1.14, parent: F });
  B.cyl(0.18, 0.2, 0.6, 0x9a7a5a, { y: 2.0, z: -0.3, parent: F }, 6);
}

// Fragua del herrero
export function forge(B, G, { x, z, y, ry = 0 }) {
  const F = frame(x, y, z, ry);
  B.box(1.8, 1.0, 1.4, 0x8a7a6a, { y: 0.5, parent: F });
  G.box(1.2, 0.12, 0.9, 0xff6a20, { y: 1.04, parent: F });
  B.cyl(0.35, 0.6, 2.2, 0x7a6a5a, { y: 2.2, parent: F }, 6);
  // yunque
  B.box(0.3, 0.55, 0.3, 0x4a3a2a, { x: 1.6, y: 0.28, z: 0.4, parent: F });
  B.box(0.65, 0.2, 0.28, 0x3a3a40, { x: 1.6, y: 0.65, z: 0.4, parent: F });
  // techo de madera
  for (const [px, pz] of [[-1.4, -1.4], [2.4, -1.4], [-1.4, 1.6], [2.4, 1.6]]) B.cyl(0.08, 0.1, 2.8, 0x5e4026, { x: px, y: 1.4, z: pz, parent: F }, 5);
  B.box(4.4, 0.12, 3.6, 0x7a5634, { x: 0.5, y: 2.85, z: 0.1, rx: 0.12, parent: F });
}
