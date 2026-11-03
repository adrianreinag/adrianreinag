// Personas realistas: cabezas y trajes de "Universal Base Characters" + "Modular Character Outfits" (Quaternius, CC0)
// con túnicas, mantos, velos, coronas y cascos generados por código y enlazados al esqueleto.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Regiones del atlas (en unidades de casilla, atlas de 3x2 casillas)
const AW = 3, AH = 2;
export const TILE = { fabric: [2.5, 1, 0.5, 0.5], wool: [2.5, 1.5, 0.5, 0.5], white: [2, 1.5, 0.5, 0.5] };
// Índices de la paleta por vértice
export const T = { NONE: 0, SKIN: 1, HAIR: 2, OUTFIT: 3, ROBE: 4, CLOAK: 5, SCARF: 6, BAND: 7, GOLD: 8, ACCENT: 9 };
const NPAL = 10;

// Nombres de huesos del sistema anterior -> esqueleto nuevo (para reutilizar posturas y enganches)
export const BONE_ALIAS = {
  Hips: 'pelvis', Abdomen: 'spine_01', Torso: 'spine_02', Chest: 'spine_03', Neck: 'neck_01', Head: 'Head',
  ShoulderL: 'clavicle_l', UpperArmL: 'upperarm_l', LowerArmL: 'lowerarm_l', HandL: 'hand_l',
  ShoulderR: 'clavicle_r', UpperArmR: 'upperarm_r', LowerArmR: 'lowerarm_r', HandR: 'hand_r',
  UpperLegL: 'thigh_l', LowerLegL: 'calf_l', FootL: 'foot_l', UpperLegR: 'thigh_r', LowerLegR: 'calf_r', FootR: 'foot_r',
};
// Animaciones del sistema anterior -> biblioteca universal
export const ANIM_ALIAS = { Idle: 'Idle_Loop', Idle_Neutral: 'Idle_Loop', Walk: 'Walk_Loop', Run: 'Jog_Fwd_Loop', Wave: 'Idle_Talking_Loop', Interact: 'Interact' };

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;

// Material del atlas con paleta por personaje (multiplica el color de la textura)
function paletteMaterial(base) {
  const m = base.clone();
  m.vertexColors = false;
  m.userData.pal = { value: Array.from({ length: NPAL }, () => new THREE.Color(1, 1, 1)) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uPal = m.userData.pal;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float tint;\nvarying float vTint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = tint;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nuniform vec3 uPal[${NPAL}];\nvarying float vTint;`)
      .replace('#include <map_fragment>', '#include <map_fragment>\n{ int ti = int(vTint + 0.5); vec3 pc = uPal[0]; for (int i = 1; i < ' + NPAL + '; i++) { if (i == ti) pc = uPal[i]; } diffuseColor.rgb *= pc; }');
  };
  m.customProgramCacheKey = () => 'belen-palette';
  return m;
}

export class HumanKit {
  constructor(gltf, clips, sex) {
    this.sex = sex;
    this.scene = gltf.scene;
    this.scene.updateMatrixWorld(true);
    this.parts = {};
    this.scene.traverse((o) => { if (o.isSkinnedMesh) this.parts[o.name] = o; });
    const any = this.parts.head;
    this.refMesh = any;
    this.baseMaterial = any.material;
    this.baseMaterial.side = THREE.DoubleSide; this.baseMaterial.alphaTest = 0.5;
    this.boneNames = any.skeleton.bones.map((b) => b.name);
    this.boneIndex = new Map(this.boneNames.map((n, i) => [n, i]));
    this.boneInverses = any.skeleton.boneInverses;
    // matriz de piel de cada hueso en reposo (lleva del espacio de enlace al espacio de la plantilla)
    const bm = any.bindMatrix, bmi = any.bindMatrixInverse;
    this.skinMats = any.skeleton.bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(bmi, b.matrixWorld).multiply(this.boneInverses[i]).multiply(bm));
    // posiciones de reposo de los huesos (espacio de la plantilla = metros, mirando a +Z)
    this.rest = {};
    for (const b of any.skeleton.bones) this.rest[b.name] = b.getWorldPosition(new THREE.Vector3());
    // armadura sin mallas para clonar en cada personaje
    this.bare = this.scene.clone(true);
    const kill = []; this.bare.traverse((o) => { if (o.isMesh) kill.push(o); });
    kill.forEach((o) => o.parent.remove(o));
    this.meshParentName = any.parent.name;
    // clips (con alias del sistema anterior)
    this.clips = new Map(clips.map((c) => [c.name, c]));
    for (const [a, b] of Object.entries(ANIM_ALIAS)) if (this.clips.has(b)) this.clips.set(a, this.clips.get(b));
    // cabeza: caja en reposo
    const bb = new THREE.Box3(); const v = new THREE.Vector3(); const hm = this.parts.head;
    for (let i = 0; i < hm.geometry.attributes.position.count; i++) { hm.getVertexPosition(i, v); bb.expandByPoint(v); }
    const headBone = any.skeleton.bones[this.boneIndex.get('Head')];
    this.head = { bone: 'Head', box: bb, size: bb.getSize(new THREE.Vector3()), center: bb.getCenter(new THREE.Vector3()), restQuat: headBone.getWorldQuaternion(new THREE.Quaternion()) };
    this.head.centerBone = this.head.center.clone().applyMatrix4(headBone.matrixWorld.clone().invert());
    this.height = bb.max.y;
    this.cache = new Map();
    // copia de cada pieza con el atributo de tinte
    this.partGeo = {};
    for (const [name, m] of Object.entries(this.parts)) {
      const g = m.geometry.clone();
      for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'skinIndex', 'skinWeight'].includes(n)) g.deleteAttribute(n);
      // pasar a float para poder fusionar con las piezas generadas
      for (const n of ['position', 'normal', 'uv', 'skinWeight']) { const a = g.attributes[n]; const arr = new Float32Array(a.count * a.itemSize); for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = a.getComponent(i, k); g.setAttribute(n, new THREE.BufferAttribute(arr, a.itemSize)); }
      { const a = g.attributes.skinIndex; const arr = new Uint16Array(a.count * 4); for (let i = 0; i < a.count; i++) for (let k = 0; k < 4; k++) arr[i * 4 + k] = a.getComponent(i, k); g.setAttribute('skinIndex', new THREE.BufferAttribute(arr, 4)); }
      const tint = /head|_body$|arms_2_body/.test(name) ? T.SKIN : /hair|lashes|brows/.test(name) ? T.HAIR : name === 'eyes' ? T.NONE : T.OUTFIT;
      g.setAttribute('tint', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(tint), 1));
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      this.partGeo[name] = g;
    }
  }

  // Pasa un punto del espacio de la plantilla (reposo) al espacio de enlace, según sus pesos
  toBind(v, idx, w) {
    const M = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    for (let k = 0; k < 4; k++) if (w[k] > 0) { const e = this.skinMats[idx[k]].elements; for (let j = 0; j < 16; j++) M.elements[j] += e[j] * w[k]; }
    return v.applyMatrix4(M.invert());
  }
  // ---------- generadores de ropa enlazada al esqueleto ----------
  weights(list) { // [[bone, w], ...] -> 4 índices/pesos normalizados
    list = list.filter((e) => e[1] > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const s = list.reduce((t, e) => t + e[1], 0) || 1;
    const idx = [0, 0, 0, 0], w = [0, 0, 0, 0];
    list.forEach((e, i) => { idx[i] = this.boneIndex.get(e[0]) ?? 0; w[i] = e[1] / s; });
    return { idx, w };
  }
  legWeights(x, y, { pelvisMin = 0.15 } = {}) {
    const R = this.rest; const hipY = R.thigh_l.y, kneeY = R.calf_l.y, ankY = R.foot_l.y;
    const wl = 1 / (1 + Math.exp(-x / 0.035)), wr = 1 - wl;
    if (y >= hipY) return [['pelvis', 1]];
    const u = clamp((hipY - y) / (hipY - kneeY), 0, 1), v = clamp((kneeY - y) / (kneeY - ankY), 0, 1);
    const pel = (1 - u) * 0.75 + pelvisMin, thigh = u * (1 - v) + v * 0.25, calf = v * 0.75;
    return [['pelvis', pel], ['thigh_l', thigh * wl], ['thigh_r', thigh * wr], ['calf_l', calf * wl], ['calf_r', calf * wr]];
  }
  torsoWeights(x, y) {
    const R = this.rest;
    if (y > R.spine_03.y) { const c = clamp((Math.abs(x) - 0.08) / 0.12, 0, 1) * 0.5; return [['spine_03', 1 - c], [x > 0 ? 'clavicle_l' : 'clavicle_r', c]]; }
    if (y > R.spine_01.y) { const t = (y - R.spine_01.y) / (R.spine_03.y - R.spine_01.y); return [['spine_03', t], ['spine_01', 1 - t]]; }
    if (y > R.pelvis.y) { const t = (y - R.pelvis.y) / (R.spine_01.y - R.pelvis.y); return [['spine_01', t], ['pelvis', 1 - t]]; }
    return this.legWeights(x, y, { pelvisMin: 0.45 });
  }
  // Superficie de revolución deformable: anillos a lo largo de y (de arriba abajo)
  shell({ rings, seg = 30, phi0 = 0, phiLen = Math.PI * 2, closed = true, tile = TILE.fabric, tint, weightFn, uRepeat = 1 }) {
    const pos = [], uv = [], si = [], sw = [], idx = [], tt = [];
    const cols = closed ? seg : seg + 1;
    const [tx, ty, tw, th] = tile;
    rings.forEach((rg, i) => {
      for (let j = 0; j < cols; j++) {
        const f = j / seg; const phi = phi0 + phiLen * f;
        const fold = 1 + (rg.fold || 0) * Math.sin(phi * (rg.folds || 9) + Math.sin(phi * 3) * 1.4);
        const x = rg.cx + Math.sin(phi) * rg.rx * fold, z = rg.cz + Math.cos(phi) * rg.rz * fold, y = rg.y;
        uv.push((tx + ((f * uRepeat) % 1) * tw) / AW, (ty + (i / (rings.length - 1)) * th) / AH);
        const { idx: bi, w } = this.weights(weightFn(x, y, z, i / (rings.length - 1)));
        const vb = this.toBind(new THREE.Vector3(x, y, z), bi, w);
        pos.push(vb.x, vb.y, vb.z);
        si.push(...bi); sw.push(...w); tt.push(tint);
      }
    });
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * cols + j, b = i * cols + ((j + 1) % cols), c = (i + 1) * cols + j, d = (i + 1) * cols + ((j + 1) % cols);
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.setAttribute('tint', new THREE.Float32BufferAttribute(tt, 1));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  robe({ hem = 0.08, wide = 1, short = false, dress = false } = {}) {
    const R = this.rest; const f = this.sex === 'f';
    const waist = R.pelvis.y + (f ? 0.1 : 0.07), bottom = short ? R.calf_l.y + 0.06 : hem;
    const cz = R.pelvis.z + 0.01;
    const hemRx = (f ? 0.25 : 0.235) * wide, hemRz = (f ? 0.22 : 0.21) * wide;
    // perfil: [y, rx, rz, pliegue]
    const prof = [];
    if (dress) { // vestido entero desde el pecho
      const ch = R.spine_03.y + (f ? 0.05 : 0.08);
      prof.push([ch + 0.04, f ? 0.17 : 0.18, f ? 0.15 : 0.15, 0], [ch - 0.06, f ? 0.19 : 0.19, f ? 0.17 : 0.16, 0], [R.spine_01.y + 0.03, f ? 0.175 : 0.18, f ? 0.145 : 0.145, 0]);
    }
    const N = 11;
    for (let i = 0; i <= N; i++) {
      const t = i / N; const y = lerp(waist, bottom, t); const k = Math.pow(t, 0.85);
      prof.push([y, lerp(f ? 0.19 : 0.2, hemRx, k), lerp(f ? 0.16 : 0.165, hemRz, k), 0.04 * t]);
    }
    const rings = prof.map(([y, rx, rz, fold], i) => ({ y, cx: 0, cz: cz + (dress && y > waist ? 0.025 : 0) + (i / prof.length) * 0.02, rx, rz, fold, folds: 11 }));
    const last = rings[rings.length - 1]; rings.push({ ...last, y: last.y + 0.004, rx: last.rx * 0.96, rz: last.rz * 0.96 });
    return this.shell({ rings, tile: TILE.fabric, tint: T.ROBE, weightFn: (x, y) => (y > R.pelvis.y + 0.05 ? this.torsoWeights(x, y) : this.legWeights(x, y)), uRepeat: 2 });
  }
  cloak({ length = 0.25 } = {}) {
    const R = this.rest; const f = this.sex === 'f';
    const top = R.upperarm_l.y + 0.06, bottom = length;
    const rings = []; const N = 14;
    for (let i = 0; i <= N; i++) {
      const t = i / N; const y = lerp(top, bottom, t);
      const k = Math.pow(t, 0.6);
      rings.push({ y, cx: 0, cz: R.spine_03.z - 0.015 - t * 0.04, rx: lerp(f ? 0.2 : 0.23, f ? 0.32 : 0.34, k), rz: lerp(0.15, 0.27, k), fold: 0.05 * t, folds: 7 });
    }
    const open = 1.15; // abertura delantera (radianes)
    return this.shell({ rings, seg: 26, phi0: open / 2, phiLen: Math.PI * 2 - open, closed: false, tile: TILE.wool, tint: T.CLOAK, weightFn: (x, y) => this.torsoWeights(x, y) });
  }
  // Velo o pañuelo: casquete sobre la cabeza y caída por detrás hasta los hombros
  scarf({ veil = false } = {}) {
    const h = this.head; const R = this.rest;
    const r = Math.max(h.size.x, h.size.z) * 0.53 + 0.012;
    const cx = h.center.x, cy = h.center.y + h.size.y * (veil ? 0.03 : 0.06), cz = h.center.z - 0.015;
    const capT = veil ? 0.46 : 0.43;
    const capG = new THREE.SphereGeometry(r, 20, 8, 0, Math.PI * 2, 0, Math.PI * capT); capG.translate(cx, cy, cz);
    const cap = this.rigid(capG, 'Head', T.SCARF, TILE.fabric);
    const y0 = cy + Math.cos(Math.PI * capT) * r, r0 = Math.sin(Math.PI * capT) * r;
    const yb = veil ? R.spine_03.y - 0.1 : R.neck_01.y - 0.04;
    const dr = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8; const y = lerp(y0, yb, t);
      const rr = lerp(r0, r * (veil ? 2.05 : 1.45), Math.pow(t, veil ? 1.15 : 1.3));
      dr.push({ y, cx, cz: cz - t * 0.03, rx: rr, rz: rr * (1 - t * 0.12), fold: 0.03 * t, folds: 8 });
    }
    const open = veil ? 1.75 : 1.55;
    const neckY = R.neck_01.y;
    const drape = this.shell({ rings: dr, seg: 24, phi0: open / 2, phiLen: Math.PI * 2 - open, closed: false, tile: TILE.fabric, tint: T.SCARF,
      weightFn: (x, y) => { const k = clamp((neckY + 0.06 - y) / 0.2, 0, 1); return [['Head', 1 - k], ['spine_03', k]]; } });
    return [cap, drape];
  }
  band() { // cordón (agal) sobre el pañuelo
    const h = this.head; const r = Math.max(h.size.x, h.size.z) * 0.53 + 0.02;
    const g = new THREE.TorusGeometry(r, 0.012, 5, 22); g.rotateX(Math.PI / 2 - 0.12);
    g.translate(h.center.x, h.center.y + h.size.y * 0.2, h.center.z - 0.01);
    return this.rigid(g, 'Head', T.BAND, TILE.white);
  }
  crown() {
    const h = this.head; const r = Math.max(h.size.x, h.size.z) * 0.5 + 0.004;
    const parts = [];
    const ring = new THREE.CylinderGeometry(r, r * 0.97, 0.05, 20, 1, true); ring.translate(0, 0.025, 0); parts.push(ring);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const s = new THREE.ConeGeometry(0.016, 0.06, 4); s.translate(Math.sin(a) * r, 0.075, Math.cos(a) * r); parts.push(s); const b = new THREE.SphereGeometry(0.011, 6, 4); b.translate(Math.sin(a) * r, 0.11, Math.cos(a) * r); parts.push(b); }
    const g = mergeGeometries(parts.map((p) => { const q = p.toNonIndexed(); q.deleteAttribute('uv'); return q; }));
    g.translate(h.center.x, h.box.max.y - 0.085, h.center.z - 0.012);
    return this.rigid(g, 'Head', T.GOLD, TILE.white);
  }
  helmet() {
    const h = this.head; const r = Math.max(h.size.x, h.size.z) * 0.55 + 0.012;
    const dome = new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const crest = new THREE.BoxGeometry(0.03, 0.09, r * 2.0); crest.translate(0, r + 0.03, 0);
    const cheek = new THREE.BoxGeometry(r * 2.1, 0.06, 0.02); cheek.translate(0, -0.01, -r * 0.6);
    const g1 = this.rigid(dome.translate(h.center.x, h.center.y + h.size.y * 0.1, h.center.z - 0.01), 'Head', T.GOLD, TILE.white);
    const g2 = this.rigid(crest.translate(h.center.x, h.center.y + h.size.y * 0.1, h.center.z - 0.01), 'Head', T.ACCENT, TILE.wool);
    return [g1, g2];
  }
  belt() {
    const R = this.rest; const g = new THREE.TorusGeometry(1, 0.025, 4, 24); g.rotateX(Math.PI / 2); g.scale(0.19, 1, 0.155);
    g.translate(0, R.pelvis.y + (this.sex === 'f' ? 0.12 : 0.09), R.pelvis.z + 0.01);
    return this.rigid(g, 'pelvis', T.BAND, TILE.white);
  }
  // geometría rígida unida a un hueso
  rigid(geo, bone, tint, tile) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    const n = g.attributes.position.count;
    const [tx, ty, tw, th] = tile;
    const uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { uv[i * 2] = (tx + 0.5 * tw) / AW; uv[i * 2 + 1] = (ty + 0.5 * th) / AH; }
    const g2 = new THREE.BufferGeometry();
    const bi = this.boneIndex.get(bone) ?? 0;
    const inv = this.skinMats[bi].clone().invert();
    g2.setAttribute('position', g.attributes.position.clone().applyMatrix4(inv)); g2.computeVertexNormals();
    g2.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g2.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(n * 4).map((_, i) => (i % 4 === 0 ? bi : 0)), 4));
    g2.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(n * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
    g2.setAttribute('tint', new THREE.Float32BufferAttribute(new Float32Array(n).fill(tint), 1));
    g2.setIndex([...Array(n).keys()]);
    return g2;
  }

  // Geometría de un personaje (cacheada por combinación)
  geometry(spec) {
    const key = JSON.stringify(spec);
    if (this.cache.has(key)) return this.cache.get(key);
    const geos = [];
    for (const p of spec.parts) if (this.partGeo[p]) geos.push(this.partGeo[p]);
    if (spec.robe) geos.push(this.robe(spec.robe));
    if (spec.cloak) geos.push(this.cloak(spec.cloak));
    if (spec.scarf) geos.push(...this.scarf(spec.scarf));
    if (spec.band) geos.push(this.band());
    if (spec.crown) geos.push(this.crown());
    if (spec.helmet) geos.push(...this.helmet());
    if (spec.belt) geos.push(this.belt());
    const g = mergeGeometries(geos, false);
    g.computeBoundingSphere(); g.boundingSphere.radius = 1.4; g.boundingSphere.center.set(0, 0.9, 0);
    this.cache.set(key, g);
    return g;
  }

  // Crea una instancia (armadura propia + malla única)
  instance(spec, palette) {
    const root = this.bare.clone(true);
    const bones = {}; root.traverse((o) => { if (o.isBone) bones[o.name] = o; });
    const skel = new THREE.Skeleton(this.boneNames.map((n) => bones[n]), this.boneInverses.map((m) => m.clone()));
    const mat = paletteMaterial(this.baseMaterial);
    for (let i = 0; i < NPAL; i++) if (palette[i] !== undefined) mat.userData.pal.value[i].set(palette[i]);
    const body = new THREE.SkinnedMesh(this.geometry(spec), mat);
    body.name = 'body';
    const parent = root.getObjectByName(this.meshParentName) || root;
    parent.add(body);
    body.bind(skel, this.refMesh.bindMatrix.clone());
    body.castShadow = true; body.frustumCulled = true;
    for (const [a, b] of Object.entries(BONE_ALIAS)) if (bones[b]) bones[a] = bones[b];
    return { root, body, bones };
  }
}

// ---------- Recetas de personajes ----------
export const SKIN_TONES = [0xf2d2b8, 0xe6c0a0, 0xd9ad8a, 0xc99a78, 0xb8876a, 0xf6dcc6];
export const HAIR_COLORS = [0x2a1d14, 0x3a2716, 0x1c1410, 0x4a3420, 0x6a5a50, 0xd8d4cc];
export const ROBE_COLORS = [0x8a6a48, 0x7a5a3c, 0xa58560, 0x6f6a4a, 0x8a7656, 0x5f5040, 0xb09a78, 0x9a5a3a, 0x5b6a7a, 0x7a6a8a, 0xc8b898, 0x6a4a3a];
export const SCARF_COLORS = [0xefe6d0, 0xe2d6b8, 0xd4c4a0, 0xc8b49a, 0xf4ecdc, 0xb8a888, 0xdcd0c0];
