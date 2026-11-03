// Carga de modelos 3D (Quaternius, CC0) y preparación: fusión de mallas, colores por vértice e instanciado.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { addDetail } from './materials.js';
import { HumanKit } from './people.js';

// La ruta de los modelos puede fijarse desde la página (window.BELEN_MODELS); si no, es ../models/ respecto a este módulo
export const MODELS_URL = (typeof window !== 'undefined' && window.BELEN_MODELS) || new URL('../models/', import.meta.url).href;
// Modo empaquetado (window.BELEN_PACKED): cada modelo es un .glb.json con el GLB en base64.
// Sirve para alojamientos que no publican ficheros .glb ni permiten URLs data:.
const PACKED = typeof window !== 'undefined' && !!window.BELEN_PACKED;
function base64ToBuffer(b64) {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

const KIT_FILES = ['kit_m', 'kit_f', 'anims_ual1', 'anims_ual2'];
const ANIMAL_FILES = ['Donkey', 'Cow', 'Bull', 'Horse', 'Horse_White', 'Husky', 'ShibaInu', 'Deer', 'Stag', 'Fox', 'Wolf'];

// Material compartido: color por vértice, sombreado plano estilo "low poly"
export const SHARED = {
  standard: addDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.0, flatShading: false }), { mode: 'plaster', bump: 0.8 }),
  skinned: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.0, flatShading: false }),
};

function toFloatGeometry(g) {
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name];
    if (name === 'skinIndex') { const arr = new Uint16Array(a.count * a.itemSize); for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = a.getComponent(i, k); out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize)); continue; }
    if (!['position', 'normal', 'skinWeight'].includes(name)) continue;
    const arr = new Float32Array(a.count * a.itemSize);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) arr[i * a.itemSize + k] = a.getComponent(i, k);
    if (a.normalized) { /* getComponent ya desnormaliza */ }
    out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
  }
  if (g.index) out.setIndex(Array.from(g.index.array));
  return out;
}

function materialColor(m) {
  const c = (m.color ? m.color.clone() : new THREE.Color(1, 1, 1));
  return c;
}

// Convierte un objeto (con varias mallas y materiales) en una única geometría con colores por vértice.
// Devuelve { geometry, matNames: [], hasMatId }
function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const geos = []; const matNames = []; const metal = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = toFloatGeometry(o.geometry);
    g.deleteAttribute('skinIndex'); g.deleteAttribute('skinWeight');
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(m);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3); const mid = new Float32Array(n);
    const groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: g.index ? g.index.count : n, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = mats[gr.materialIndex] || mats[0];
      let id = matNames.indexOf(mat.name); if (id < 0) { id = matNames.length; matNames.push(mat.name); metal.push(mat.metalness || 0); }
      const c = materialColor(mat);
      for (let k = gr.start; k < gr.start + gr.count; k++) {
        const v = g.index ? g.index.array[k] : k;
        col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; mid[v] = id;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('matid', new THREE.BufferAttribute(mid, 1));
    geos.push(g.index ? g.toNonIndexed() : g);
  });
  let geometry = mergeGeometries(geos, false);
  geometry = toCreasedNormals(geometry, THREE.MathUtils.degToRad(48));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return { geometry, matNames };
}

// Recolorea una geometría (copia del atributo color) según un mapa nombre->color
export function recolor(geometry, matNames, palette, baseColors) {
  const col = geometry.attributes.color;
  const mid = geometry.attributes.matid;
  const arr = new Float32Array(col.array.length);
  const pal = matNames.map((n, i) => (palette && palette[n] !== undefined ? new THREE.Color(palette[n]) : baseColors[i]));
  for (let i = 0; i < mid.count; i++) { const c = pal[mid.array[i]]; arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  return new THREE.BufferAttribute(arr, 3);
}

function baseColorsOf(geometry, matNames) {
  const out = matNames.map(() => new THREE.Color(1, 1, 1));
  const col = geometry.attributes.color, mid = geometry.attributes.matid;
  const seen = new Set();
  for (let i = 0; i < mid.count && seen.size < matNames.length; i++) {
    const id = mid.array[i]; if (seen.has(id)) continue; seen.add(id);
    out[id] = new THREE.Color(col.array[i * 3], col.array[i * 3 + 1], col.array[i * 3 + 2]);
  }
  return out;
}

// ---------- Plantillas estáticas (props) ----------
export class PropLibrary {
  constructor(gltf) {
    this.map = new Map();
    const scene = gltf.scene;
    for (const child of [...scene.children]) {
      const name = child.name;
      child.position.set(0, 0, 0); child.rotation.set(0, 0, 0); child.scale.set(1, 1, 1);
      const { geometry, matNames } = bakeStatic(child);
      const base = baseColorsOf(geometry, matNames);
      this.map.set(name, { geometry, matNames, base, variants: new Map() });
    }
  }
  has(name) { return this.map.has(name); }
  get(name) { const p = this.map.get(name); if (!p) throw new Error('Modelo no encontrado: ' + name); return p; }
  // geometría con paleta aplicada, normalizada (escala real, base en y=0)
  geometry(name, { palette = null, height = null, scale = null, key = '' } = {}) {
    const p = this.get(name);
    const vk = key + JSON.stringify(palette) + height + ':' + scale;
    if (p.variants.has(vk)) return p.variants.get(vk);
    const g = p.geometry.clone();
    if (palette) g.setAttribute('color', recolor(g, p.matNames, palette, p.base));
    const bb = p.geometry.boundingBox;
    let s = scale ?? 1;
    if (height) s = height / (bb.max.y - bb.min.y);
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g.scale(s, s, s);
    g.computeBoundingBox(); g.computeBoundingSphere();
    p.variants.set(vk, g);
    return g;
  }
  size(name) { const bb = this.get(name).geometry.boundingBox; return new THREE.Vector3().subVectors(bb.max, bb.min); }
}

// Gestor de instancias: agrupa todas las colocaciones de un mismo modelo en un InstancedMesh
export class Instancer {
  constructor(scene, lib) { this.scene = scene; this.lib = lib; this.groups = new Map(); }
  add(name, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1, sy = null, palette = null, height = null, scale = null, color = null, castShadow = true, material = null }) {
    // una única geometría por modelo y paleta, normalizada a 1 m de alto; la escala va en la instancia
    const g = this.lib.geometry(name, { palette, height: 1 });
    const k = height ?? (this.lib.size(name).y * (scale ?? 1));
    s *= k; if (sy !== null) sy *= k;
    const key = g.uuid + (castShadow ? 's' : 'n');
    let grp = this.groups.get(key);
    if (!grp) { grp = { geometry: g, list: [], castShadow, material }; this.groups.set(key, grp); }
    grp.list.push({ x, y, z, ry, rx, rz, s, sy: sy ?? s, color });
  }
  build() {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    const meshes = [];
    for (const grp of this.groups.values()) {
      const im = new THREE.InstancedMesh(grp.geometry, grp.material || SHARED.standard, grp.list.length);
      grp.list.forEach((it, i) => {
        e.set(it.rx, it.ry, it.rz); q.setFromEuler(e); p.set(it.x, it.y, it.z); sc.set(it.s, it.sy, it.s);
        m4.compose(p, q, sc); im.setMatrixAt(i, m4);
        if (it.color) im.setColorAt(i, new THREE.Color(it.color));
      });
      if (im.instanceColor) {
        grp.list.forEach((it, i) => { if (!it.color) im.setColorAt(i, new THREE.Color(1, 1, 1)); });
        im.instanceColor.needsUpdate = true;
      }
      im.castShadow = grp.castShadow; im.receiveShadow = true;
      im.computeBoundingSphere();
      this.scene.add(im); meshes.push(im);
    }
    this.groups.clear();
    return meshes;
  }
}

// ---------- Plantillas animadas (personas y animales) ----------
function mergeSkinned(root) {
  const meshes = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  if (!meshes.length) return null;
  const ref = meshes[0];
  const skel = ref.skeleton;
  const boneIndex = new Map(skel.bones.map((b, i) => [b.name, i]));
  const refBindInv = ref.bindMatrix.clone().invert();
  const geos = []; const matNames = [];
  for (const m of meshes) {
    const g = toFloatGeometry(m.geometry);
    // reasignar índices de huesos al esqueleto de referencia
    const remap = m.skeleton.bones.map((b) => boneIndex.get(b.name) ?? 0);
    const si = g.attributes.skinIndex;
    for (let i = 0; i < si.array.length; i++) si.array[i] = remap[si.array[i]];
    // llevar al espacio de la malla de referencia
    const mm = new THREE.Matrix4().multiplyMatrices(refBindInv, m.bindMatrix);
    g.applyMatrix4(mm);
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3), mid = new Float32Array(n);
    const groups = m.geometry.groups.length ? m.geometry.groups : [{ start: 0, count: g.index ? g.index.count : n, materialIndex: 0 }];
    for (const gr of groups) {
      const mat = mats[gr.materialIndex] || mats[0];
      let id = matNames.indexOf(mat.name); if (id < 0) { id = matNames.length; matNames.push(mat.name); }
      const c = materialColor(mat);
      for (let k = gr.start; k < gr.start + gr.count; k++) { const v = g.index ? g.index.array[k] : k; col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; mid[v] = id; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('matid', new THREE.BufferAttribute(mid, 1));
    geos.push(g.index ? g.toNonIndexed() : g);
  }
  let geometry = mergeGeometries(geos, false);
  geometry = toCreasedNormals(geometry, THREE.MathUtils.degToRad(55));
  geometry.computeBoundingBox();
  const rawH = geometry.boundingBox.max.y - geometry.boundingBox.min.y || 1;
  const furMat = addDetail(SHARED.skinned.clone(), { mode: 'fur', objectSpace: true, scale: 1.6 / rawH, bump: 0.7 });
  const merged = new THREE.SkinnedMesh(geometry, furMat);
  merged.name = 'body';
  ref.parent.add(merged);
  merged.position.copy(ref.position); merged.quaternion.copy(ref.quaternion); merged.scale.copy(ref.scale);
  merged.updateMatrixWorld(true);
  merged.bind(skel, ref.bindMatrix);
  for (const m of meshes) m.parent.remove(m);
  // eliminar grupos vacíos que contenían las primitivas
  root.traverse((o) => { if (o.isGroup && o.children.length === 0 && o.parent) o.userData._empty = true; });
  merged.castShadow = true; merged.receiveShadow = false;
  merged.frustumCulled = false;
  return { mesh: merged, matNames, base: baseColorsOf(geometry, matNames) };
}

// Retargeting de las animaciones de la biblioteca (rig original con hueso "Body") al rig del showcase
const KEEP_BONES = ['Hips', 'Abdomen', 'Torso', 'Chest', 'Neck', 'Head', 'ShoulderL', 'UpperArmL', 'LowerArmL', 'WristL', 'ShoulderR', 'UpperArmR', 'LowerArmR', 'WristR', 'UpperLegL', 'LowerLegL', 'FootL', 'UpperLegR', 'LowerLegR', 'FootR'];
function retargetHumanClip(clip) {
  const by = {}; for (const t of clip.tracks) by[t.name] = t;
  const out = [];
  for (const t of clip.tracks) {
    const i0 = t.name.lastIndexOf('.'); const node = t.name.slice(0, i0), prop = t.name.slice(i0 + 1);
    if (!KEEP_BONES.includes(node) || prop !== 'quaternion' || node === 'Hips') continue;
    out.push(new THREE.QuaternionKeyframeTrack(node.replace('Wrist', 'Hand') + '.quaternion', t.times, t.values));
  }
  const bq = by['Body.quaternion'], bp = by['Body.position'], hq = by['Hips.quaternion'], hp = by['Hips.position'];
  const times = hq ? hq.times : (bq ? bq.times : new Float32Array([0]));
  const bqi = bq?.createInterpolant(), bpi = bp?.createInterpolant(), hqi = hq?.createInterpolant(), hpi = hp?.createInterpolant();
  const qv = [], pv = []; const q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), p = new THREE.Vector3(), p2 = new THREE.Vector3();
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (hqi) q2.fromArray(hqi.evaluate(t)); else q2.set(-0.069, 0, 0, 0.998);
    if (bqi) q1.fromArray(bqi.evaluate(t)); else q1.identity();
    const q = q1.clone().multiply(q2); qv.push(q.x, q.y, q.z, q.w);
    if (bpi) p.fromArray(bpi.evaluate(t)); else p.set(0, 0.937, 0);
    if (hpi) p2.fromArray(hpi.evaluate(t)); else p2.set(0, 0.029, 0.009);
    p2.applyQuaternion(q1); p.add(p2).multiplyScalar(0.01);
    pv.push(p.x, p.y, p.z);
  }
  out.push(new THREE.QuaternionKeyframeTrack('Hips.quaternion', Array.from(times), qv));
  out.push(new THREE.VectorKeyframeTrack('Hips.position', Array.from(times), pv));
  return new THREE.AnimationClip(clip.name, clip.duration, out);
}

export class AnimatedTemplate {
  constructor(gltf, clips, { human = false, hideHeadMats = [] } = {}) {
    this.scene = gltf.scene;
    const r = mergeSkinned(this.scene);
    this.mesh = r.mesh;
    this.matNames = r.matNames; this.base = r.base;
    this.clips = new Map(clips.map((c) => [c.name, c]));
    this.scene.updateMatrixWorld(true);
    r.mesh.computeBoundingSphere(); r.mesh.boundingSphere.radius *= 1.4;
    r.mesh.frustumCulled = true;
    const bb = new THREE.Box3().setFromObject(r.mesh);
    this.height = bb.max.y - bb.min.y;
    if (human) {
      const head = this.region(['Head'], hideHeadMats);
      this.head = head;
      this.height = head.box.max.y; // altura real hasta la coronilla
    }
  }
  // Caja (en espacio de la plantilla, pose de reposo) de los vértices ligados a ciertos huesos.
  // Opcionalmente colapsa los vértices de ciertos materiales (sombreros) para ocultarlos.
  region(boneNames, hideMats = []) {
    const mesh = this.mesh; const bones = mesh.skeleton.bones;
    const ids = boneNames.map((n) => bones.findIndex((b) => b.name === n)).filter((i) => i >= 0);
    const g = mesh.geometry; const si = g.attributes.skinIndex, sw = g.attributes.skinWeight, mid = g.attributes.matid, pos = g.attributes.position;
    const hide = hideMats.map((n) => this.matNames.indexOf(n)).filter((i) => i >= 0);
    const v = new THREE.Vector3(); const box = new THREE.Box3(); const collapse = []; let keep = -1;
    for (let i = 0; i < pos.count; i++) {
      let w = 0; for (let k = 0; k < 4; k++) if (ids.includes(si.getComponent(i, k))) w += sw.getComponent(i, k);
      if (w < 0.5) continue;
      if (hide.includes(mid.array[i])) { collapse.push(i); continue; }
      if (keep < 0) keep = i;
      mesh.getVertexPosition(i, v); v.applyMatrix4(mesh.matrixWorld); box.expandByPoint(v);
    }
    if (collapse.length && keep >= 0) {
      for (const i of collapse) {
        pos.setXYZ(i, pos.getX(keep), pos.getY(keep), pos.getZ(keep));
        for (let k = 0; k < 4; k++) { si.setComponent(i, k, si.getComponent(keep, k)); sw.setComponent(i, k, sw.getComponent(keep, k)); }
      }
      pos.needsUpdate = true;
    }
    const bone = bones[ids[0]];
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const boneInv = bone.matrixWorld.clone().invert();
    const restQuat = bone.getWorldQuaternion(new THREE.Quaternion());
    return { box, center, size, centerBone: center.clone().applyMatrix4(boneInv), restQuat, bone: bone.name };
  }
  instance(palette) {
    const o = SkeletonUtils.clone(this.scene);
    let body = null; o.traverse((c) => { if (c.isSkinnedMesh) body = c; });
    if (palette) {
      body.geometry = body.geometry.clone();
      body.geometry.setAttribute('color', recolor(body.geometry, this.matNames, palette, this.base));
    }
    body.castShadow = true; body.frustumCulled = true;
    const bones = {}; o.traverse((c) => { if (c.isBone) bones[c.name] = c; });
    return { root: o, body, bones };
  }
}

export async function loadAll(onProgress) {
  const manager = new THREE.LoadingManager();
  const loader = new GLTFLoader(manager); loader.setMeshoptDecoder(MeshoptDecoder);
  const files = ['props', ...KIT_FILES, ...ANIMAL_FILES];
  let done = 0;
  // si el navegador bloquea WebAssembly (decodificador meshopt), se usan los modelos sin comprimir
  const wasmOk = await MeshoptDecoder.ready.then(() => true, () => false);
  const base = wasmOk ? MODELS_URL : MODELS_URL + 'plain/';
  const fetchModel = PACKED
    ? (f) => fetch(base + f + '.glb.json').then((r) => { if (!r.ok) throw new Error(`no se encontró ${f} (${r.status})`); return r.json(); }).then((j) => loader.parseAsync(base64ToBuffer(j.glb), base))
    : (f) => loader.loadAsync(base + f + '.glb');
  const load = (f) => fetchModel(f).then((g) => { done++; onProgress?.(done / files.length, f); return g; });
  const results = await Promise.all(files.map(load));
  const byName = Object.fromEntries(files.map((f, i) => [f, results[i]]));
  const humanClips = [...byName.anims_ual1.animations, ...byName.anims_ual2.animations];
  const lib = {
    props: new PropLibrary(byName.props),
    kits: { m: new HumanKit(byName.kit_m, humanClips, 'm'), f: new HumanKit(byName.kit_f, humanClips, 'f') },
    animals: {},
  };
  for (const f of ANIMAL_FILES) {
    const clips = byName[f].animations.map((c) => { c.tracks = c.tracks.filter((tr) => !tr.name.endsWith('.scale')); return c; });
    const t = new AnimatedTemplate(byName[f], clips);
    t.back = t.region(['Torso', 'Torso2', 'Back']);
    lib.animals[f] = t;
  }
  return lib;
}
