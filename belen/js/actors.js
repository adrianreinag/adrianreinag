// Figuras animadas: personas con túnicas y tocados, animales, posturas (sentado, arrodillado, rezando) y paseos.
import * as THREE from 'three';
import { RNG, PathWalker, clamp } from './util.js';
import { heightAt } from './terrain.js';
import { SHARED } from './assets.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const AX = V(1, 0, 0), AY = V(0, 1, 0), AZ = V(0, 0, 1);
const D = THREE.MathUtils.degToRad;

export const ACTORS = []; // todas las figuras activas (para actualizar)

// Materiales de tela (color por vértice)
const clothMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true, side: THREE.DoubleSide });

function paint(geo, color) {
  const c = new THREE.Color(color); const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
function clothMesh(geo, color) { const m = new THREE.Mesh(paint(geo, color), clothMat); m.castShadow = true; return m; }

// Túnica: forma de campana alrededor de la cadera
function robeGeometry({ top = 0.17, bottom = 0.3, length = 0.9, seg = 12, flare = 0.25, depth = 0.82 }) {
  const pts = [];
  const N = 7;
  for (let i = 0; i <= N; i++) {
    const t = i / N; const r = top + (bottom - top) * Math.pow(t, 0.8) + Math.sin(t * Math.PI) * 0.02;
    pts.push(new THREE.Vector2(r * (1 + flare * t * t * 0.3), -t * length));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  g.scale(1, 1, depth);
  return g.toNonIndexed();
}
// Pañuelo / velo sobre la cabeza (centrado en el centro de la cabeza, abierto hacia +z)
function scarfGeometry({ r = 0.15, drop = 0.32, open = 1.35, longBack = 0.0, capTheta = 0.4 }) {
  const cap = new THREE.SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI * capTheta);
  const y0 = r * Math.cos(Math.PI * capTheta), r0 = r * Math.sin(Math.PI * capTheta);
  const pts = [];
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const rr = r0 + (r * 1.02 - r0) * Math.min(1, t * 2.2) + t * t * r * 0.55;
    pts.push(new THREE.Vector2(rr, y0 - t * (y0 + drop + longBack)));
  }
  const drape = new THREE.LatheGeometry(pts, 14, open / 2, Math.PI * 2 - open);
  return mergeNonIndexed([cap.toNonIndexed(), drape.toNonIndexed()]);
}
function mergeNonIndexed(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of list) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
}
function cloakGeometry({ w = 0.26, top = 1.45, bottom = 0.15, depth = 0.17 }) {
  // capa trasera: medio cilindro abierto por delante
  const h = top - bottom;
  const g = new THREE.CylinderGeometry(w * 0.85, w * 1.3, h, 12, 1, true, Math.PI / 2 + 0.55, Math.PI * 2 - 1.1);
  g.scale(1, 1, depth / w); g.translate(0, bottom + h / 2, -0.02);
  return g.toNonIndexed();
}

// Cayado de pastor
export function staffMesh(color = 0x6b4a2b, len = 1.65) {
  const g1 = new THREE.CylinderGeometry(0.018, 0.022, len, 5); g1.translate(0, len / 2, 0);
  const g2 = new THREE.TorusGeometry(0.07, 0.016, 4, 8, Math.PI * 1.2); g2.rotateZ(-0.1); g2.translate(-0.07, len, 0);
  const m = new THREE.Mesh(paint(mergeNonIndexed([g1.toNonIndexed(), g2.toNonIndexed()]), color), clothMat); m.castShadow = true; return m;
}
export function spearMesh() {
  const g1 = new THREE.CylinderGeometry(0.016, 0.02, 2.1, 5); g1.translate(0, 1.05, 0);
  const g2 = new THREE.ConeGeometry(0.04, 0.22, 4); g2.translate(0, 2.2, 0);
  const g = mergeNonIndexed([paint(g1.toNonIndexed(), 0x5a3a22), paint(g2.toNonIndexed(), 0xc0c0c8)].map((x) => x));
  const col = new Float32Array(g.attributes.position.count * 3); let o = 0;
  for (const part of [[g1, 0x5a3a22], [g2, 0xc0c0c8]]) { const c = new THREE.Color(part[1]); const n = part[0].toNonIndexed().attributes.position.count; for (let i = 0; i < n; i++) { col[o++] = c.r; col[o++] = c.g; col[o++] = c.b; } }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, clothMat); m.castShadow = true; return m;
}
export function jarMesh(color = 0xb8643a, s = 1) {
  const pts = [[0.0, 0], [0.08, 0.0], [0.12, 0.08], [0.13, 0.16], [0.09, 0.26], [0.05, 0.3], [0.06, 0.34], [0.045, 0.35]].map(([x, y]) => new THREE.Vector2(x * s, y * s));
  const g = new THREE.LatheGeometry(pts, 9).toNonIndexed(); const m = new THREE.Mesh(paint(g, color), clothMat); m.castShadow = true; return m;
}
export function lanternMesh() {
  const grp = new THREE.Group();
  const frame = new THREE.Mesh(paint(new THREE.CylinderGeometry(0.05, 0.06, 0.16, 6).toNonIndexed(), 0x3a2a1a), clothMat); grp.add(frame);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.2) })); grp.add(glow);
  const roof = new THREE.Mesh(paint(new THREE.ConeGeometry(0.07, 0.07, 6).toNonIndexed(), 0x2a2018), clothMat); roof.position.y = 0.11; grp.add(roof);
  grp.userData.glow = glow;
  return grp;
}

// Definiciones de posturas (rotaciones en ejes del mundo, aplicadas en orden sobre la pose de reposo en T)
// La figura mira hacia +Z; su izquierda es +X.
const POSES = {
  sit: [
    ['UpperLegL', AX, -84], ['UpperLegR', AX, -84], ['LowerLegL', AX, 80], ['LowerLegR', AX, 80],
    ['UpperArmL', AZ, -75], ['UpperArmL', AX, -32], ['LowerArmL', AX, -50],
    ['UpperArmR', AZ, 75], ['UpperArmR', AX, -32], ['LowerArmR', AX, -50],
    ['Abdomen', AX, 8],
  ],
  ride: [
    ['UpperLegL', AX, -70], ['UpperLegR', AX, -70], ['UpperLegL', AZ, 22], ['UpperLegR', AZ, -22], ['LowerLegL', AX, 75], ['LowerLegR', AX, 75],
    ['UpperArmL', AZ, -72], ['UpperArmL', AX, -40], ['LowerArmL', AX, -55],
    ['UpperArmR', AZ, 72], ['UpperArmR', AX, -40], ['LowerArmR', AX, -55],
  ],
  kneel: [
    ['UpperLegL', AX, -82], ['LowerLegL', AX, 84], ['UpperLegR', AX, 8], ['LowerLegR', AX, 82],
    ['Abdomen', AX, 6],
  ],
  kneel2: [ // de rodillas con ambas piernas
    ['UpperLegL', AX, 6], ['UpperLegR', AX, 6], ['LowerLegL', AX, 86], ['LowerLegR', AX, 86],
    ['Abdomen', AX, 5],
  ],
  pray: [ // manos juntas delante del pecho
    ['UpperArmL', AZ, -72], ['UpperArmL', AX, -22], ['LowerArmL', AX, -112], ['LowerArmL', AY, -40],
    ['UpperArmR', AZ, 72], ['UpperArmR', AX, -22], ['LowerArmR', AX, -112], ['LowerArmR', AY, 40],
  ],
  offer: [ // brazos extendidos hacia delante
    ['UpperArmL', AZ, -76], ['UpperArmL', AX, -62], ['LowerArmL', AX, -25], ['LowerArmL', AY, -12],
    ['UpperArmR', AZ, 76], ['UpperArmR', AX, -62], ['LowerArmR', AX, -25], ['LowerArmR', AY, 12],
    ['HandL', AX, 0], ['HandR', AX, 0],
  ],
  staffR: [ // brazo derecho sujetando el cayado
    ['UpperArmR', AZ, 76], ['UpperArmR', AX, -12], ['LowerArmR', AX, -78], ['HandR', AX, 0],
  ],
  armsDown: [
    ['UpperArmL', AZ, -76], ['UpperArmR', AZ, 76], ['LowerArmL', AX, -12], ['LowerArmR', AX, -12],
  ],
  armsOpen: [ // brazos abiertos (ángel anunciando)
    ['UpperArmL', AZ, -25], ['UpperArmL', AX, -30], ['LowerArmL', AX, -20],
    ['UpperArmR', AZ, 25], ['UpperArmR', AX, -30], ['LowerArmR', AX, -20],
  ],
  lookUp: [['Neck', AX, -14], ['Head', AX, -22]],
  shade: [ // mano sobre los ojos, mirando al cielo
    ['UpperArmL', AZ, 10], ['UpperArmL', AX, -60], ['LowerArmL', AX, -95], ['LowerArmL', AY, -55],
  ],
  wash: [ // lavandera: inclinada hacia delante con brazos al agua
    ['UpperLegL', AX, 4], ['UpperLegR', AX, 4], ['LowerLegL', AX, 86], ['LowerLegR', AX, 86],
    ['Abdomen', AX, 26], ['Torso', AX, 18],
    ['UpperArmL', AZ, -72], ['UpperArmL', AX, -55], ['LowerArmL', AX, -15],
    ['UpperArmR', AZ, 72], ['UpperArmR', AX, -55], ['LowerArmR', AX, -15],
  ],
  carryHead: [ // brazo izquierdo sujetando el cántaro sobre la cabeza
    ['UpperArmL', AZ, 62], ['LowerArmL', AZ, 72], ['HandL', AX, 0],
  ],
  carryArms: [ // brazos delante sujetando algo
    ['UpperArmL', AZ, -76], ['UpperArmL', AX, -28], ['LowerArmL', AX, -78], ['LowerArmL', AY, -20],
    ['UpperArmR', AZ, 76], ['UpperArmR', AX, -28], ['LowerArmR', AX, -78], ['LowerArmR', AY, 20],
    ['HandL', AX, 0], ['HandR', AX, 0],
  ],
  hammer: [
    ['UpperArmR', AZ, 70], ['UpperArmR', AX, -55], ['LowerArmR', AX, -70], ['HandR', AX, 0],
  ],
};

const tq = new THREE.Quaternion(), tq2 = new THREE.Quaternion();
function applyWorldRotation(bone, axis, deg) {
  bone.parent.updateWorldMatrix(true, false);
  bone.updateWorldMatrix(false, false);
  const pw = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  const bw = bone.getWorldQuaternion(new THREE.Quaternion());
  tq.setFromAxisAngle(axis, D(deg));
  const nw = tq.multiply(bw);
  bone.quaternion.copy(pw.invert().multiply(nw));
  bone.updateMatrixWorld(true);
}

// Fusiona las piezas de tela enganchadas a un mismo hueso (menos llamadas de dibujo)
export function consolidate(actor) {
  for (const bone of Object.values(actor.bones)) {
    const parts = bone.children.filter((c) => c.isMesh && c.material === clothMat && c.geometry.attributes.color && !c.userData.keep);
    if (parts.length < 2) continue;
    const geos = parts.map((c) => {
      c.updateMatrix();
      const g = new THREE.BufferGeometry();
      for (const n of ['position', 'normal', 'color']) g.setAttribute(n, c.geometry.attributes[n].clone());
      const gi = c.geometry.index ? g.setIndex(c.geometry.index.clone()) && g.toNonIndexed() : g;
      return gi.applyMatrix4(c.matrix);
    });
    const merged = new THREE.Mesh(mergeGeometries(geos, false), clothMat);
    merged.castShadow = true;
    for (const c of parts) bone.remove(c);
    bone.add(merged);
  }
}

export class Actor {
  constructor(template, { palette = null, height = 1.7, kind = 'human' } = {}) {
    const inst = template.instance(palette);
    this.template = template; this.kind = kind;
    this.inner = inst.root; this.body = inst.body; this.bones = inst.bones;
    this.group = new THREE.Group();
    this.pivot = new THREE.Group(); // compensación vertical de posturas
    this.pivot.add(this.inner); this.group.add(this.pivot);
    this.scale = height / template.height;
    this.group.scale.setScalar(this.scale);
    this.mixer = new THREE.AnimationMixer(this.inner);
    this.overrides = null; this.action = null; this.timeScale = 1;
    this.walker = null; this.speed = 0; this.s = 0;
    this.extra = []; // funciones de actualización
    this.lod = 0; this.acc = 0;
    ACTORS.push(this);
  }
  bone(name) { return this.bones[name] || this.bones[name.replace('.', '')]; }
  play(name, { timeScale = 1, offset = Math.random(), fade = 0 } = {}) {
    const clip = this.template.clips.get(name); if (!clip) return this;
    const a = this.mixer.clipAction(clip);
    if (this.action && this.action !== a) { if (fade) { a.reset().play(); this.action.crossFadeTo(a, fade, false); } else { this.action.stop(); a.play(); } }
    else a.play();
    a.timeScale = timeScale; a.time = offset * clip.duration;
    this.action = a; return this;
  }
  // Calcula la postura (y la caída vertical) a partir de la pose de reposo
  pose(...names) {
    const steps = names.flatMap((n) => POSES[n] || []);
    // si se mueve un brazo, fijar también la clavícula en reposo para que la animación no lo desvíe
    for (const side of ['L', 'R']) if (steps.some((st) => st[0].endsWith('Arm' + side) || st[0] === 'Hand' + side)) steps.unshift(['Shoulder' + side, AX, 0]);
    const kneeling = names.some((n) => ['kneel', 'kneel2', 'wash'].includes(n));
    return this.poseSteps(steps, { drop: true, extra: kneeling ? 0.03 : 0 });
  }
  poseSteps(steps, { drop = false, extra = 0 } = {}) {
    const touched = new Set(steps.map((s) => s[0]));
    this.pivot.position.y = 0;
    this.group.updateMatrixWorld(true);
    const ly = (b) => this.group.worldToLocal(b.getWorldPosition(V())).y;
    const ankleY = this.bones.FootL ? ly(this.bones.FootL) : 0.08;
    for (const [n, axis, deg] of steps) { const b = this.bones[n]; if (b) applyWorldRotation(b, axis, deg); }
    const prev = new Map(this.overrides || []);
    for (const n of touched) if (this.bones[n]) prev.set(this.bones[n], this.bones[n].quaternion.clone());
    this.overrides = [...prev.entries()];
    this.group.updateMatrixWorld(true);
    if (drop) {
      const lows = ['FootL', 'FootR', 'LowerLegL', 'LowerLegR'].map((n) => this.bones[n]).filter(Boolean).map(ly);
      if (lows.length) {
        const d = Math.min(...lows) - Math.min(ankleY, 0.09);
        this.pivot.position.y = -Math.max(0, d) + extra;
      }
      this._posedState = true;
    }
    return this;
  }
  // Coloca un objeto en el espacio de reposo de la figura y lo engancha a un hueso
  attach(boneName, obj, worldPos = null, worldQuat = null) {
    const bone = this.bones[boneName]; if (!bone) return obj;
    this.applyOverrides();
    this.inner.updateMatrixWorld(true); this.group.updateMatrixWorld(true);
    // posición dada en espacio local de la figura (antes de escala del grupo)
    const local = new THREE.Matrix4().compose(worldPos || V(), worldQuat || new THREE.Quaternion(), V(1, 1, 1));
    const groupInv = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    const boneInGroup = new THREE.Matrix4().multiplyMatrices(groupInv, bone.matrixWorld);
    const m = new THREE.Matrix4().multiplyMatrices(boneInGroup.invert(), local);
    // compensar la escala del grupo: local está en unidades "plantilla" (sin escalar)
    m.decompose(obj.position, obj.quaternion, obj.scale);
    bone.add(obj);
    return obj;
  }
  bonePos(name) {
    this.applyOverrides(); this.inner.updateMatrixWorld(true); this.group.updateMatrixWorld(true);
    const p = this.bones[name].getWorldPosition(V());
    return this.group.worldToLocal(p);
  }
  applyOverrides() { if (this.overrides) for (const [b, q] of this.overrides) b.quaternion.copy(q); }
  // Centro y orientación actuales de la cabeza (espacio del grupo)
  headFrame() {
    const h = this.template.head; const bone = this.bones[h.bone];
    this.applyOverrides(); this.inner.updateMatrixWorld(true); this.group.updateMatrixWorld(true);
    const pos = h.centerBone.clone().applyMatrix4(bone.matrixWorld); this.group.worldToLocal(pos);
    const gq = this.group.getWorldQuaternion(new THREE.Quaternion()).invert();
    const quat = gq.multiply(bone.getWorldQuaternion(new THREE.Quaternion())).multiply(h.restQuat.clone().invert());
    return { pos, quat, r: Math.max(h.size.x, h.size.z) / 2, size: h.size };
  }
  place(x, z, ry = 0, y = null) {
    this.group.position.set(x, y ?? heightAt(x, z), z); this.group.rotation.y = ry; return this;
  }
  walk(path, { speed = 1.1, loop = true, offset = 0, anim = 'Walk', animSpeed = null, yOffset = 0 } = {}) {
    this.walker = path instanceof PathWalker ? path : new PathWalker(path, { loop });
    this.speed = speed; this.s = offset * this.walker.length; this.yOffset = yOffset;
    this.play(anim, { timeScale: animSpeed ?? speed / 1.1 });
    this.pingpong = !loop; this.dir = 1;
    this._step(0);
    return this;
  }
  _step(dt) {
    const w = this.walker;
    this.s += this.speed * dt * this.dir;
    if (this.pingpong) { if (this.s > w.length) { this.s = w.length; this.dir = -1; } if (this.s < 0) { this.s = 0; this.dir = 1; } }
    const p = w.at(this.s);
    const y = heightAt(p.x, p.z) + (this.yOffset || 0);
    this.group.position.set(p.x, y, p.z);
    const target = Math.atan2(p.dx * this.dir, p.dz * this.dir);
    let d = target - this.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.group.rotation.y += d * Math.min(1, dt * 6 + (dt === 0 ? 1 : 0));
  }
  update(dt, camPos) {
    // nivel de detalle: animar menos a menudo las figuras lejanas
    const dist = camPos ? this.group.position.distanceTo(camPos) : 0;
    const every = dist > 220 ? 4 : dist > 110 ? 2 : 1;
    this.acc += dt; this.lod = (this.lod + 1) % every;
    if (this.walker) this._step(dt);
    const vis = dist < 330 || this.alwaysVisible;
    if (this.group.visible !== vis && !this.mounted) this.group.visible = vis;
    if (!vis) { this.acc = 0; return; }
    if (this.lod === 0) { this.mixer.update(this.acc); this.acc = 0; this.applyOverrides(); }
    for (const f of this.extra) f(dt);
  }
}

// ---------- Fábrica de personajes del belén ----------
const SKIN = [0xe0ad85, 0xd29a6e, 0xc48a5e, 0xb27a50, 0x9a6640, 0xdcb08c];
const CLOTH = [0x8a5a3a, 0x6f7a4a, 0xa0784a, 0x5b6a8a, 0x9a4a3a, 0xc8b48a, 0x7a5a7a, 0x4f6a5a, 0xb08a5a, 0x8a3a2a, 0x5a5a6a, 0xd8c8a8];
const SCARF = [0xefe6d0, 0xd8c8a0, 0xb8a07a, 0x9ab0c8, 0xc8a0a0, 0xe0d0b0, 0x8a6a4a, 0xf0e8e0];

export class Cast {
  constructor(lib, scene) { this.lib = lib; this.scene = scene; this.rng = new RNG(77); }

  // Crea una persona vestida al estilo hebreo.
  person(opts = {}) {
    const r = this.rng;
    const female = opts.female ?? r.chance(0.45);
    const type = opts.type || (female ? r.pick(['W_Medieval', 'W_Casual', 'W_Formal', 'W_Worker']) : r.pick(['M_Farmer', 'M_Adventurer', 'M_Casual', 'M_Casual2', 'M_Worker']));
    const tpl = this.lib.chars[type];
    const skin = opts.skin ?? r.pick(SKIN);
    const cloth = opts.robe ?? r.pick(CLOTH);
    const under = opts.under ?? r.pick(CLOTH);
    // Repintar la ropa moderna con tonos de tela natural
    const pal = {};
    for (const n of tpl.matNames) {
      if (/Skin/i.test(n)) pal[n] = skin;
      else if (/Eye|Eyebrow|Hair|Moustache|Black|Gold|Crown/i.test(n)) continue;
      else pal[n] = (n.length % 2 ? cloth : under);
    }
    if (type === 'M_King') { pal.Skin = skin; Object.assign(pal, opts.kingPalette || {}); }
    if (opts.palette) Object.assign(pal, opts.palette);
    const height = opts.height ?? (female ? r.range(1.56, 1.66) : r.range(1.66, 1.78));
    const a = new Actor(tpl, { palette: pal, height });
    a.female = female; a.type = type;
    if (opts.pose) a.pose(...[].concat(opts.pose));
    // túnica, tocado y capa
    this.dress(a, { robe: opts.robe ?? cloth, robeLen: opts.robeLen, scarf: opts.scarf === undefined ? r.pick(SCARF) : opts.scarf, veil: opts.veil ?? female, cloak: opts.cloak, band: opts.band ?? (!female && r.chance(0.6)), cloakColor: opts.cloakColor, noRobe: opts.noRobe, kneelRobe: opts.kneelRobe, helmet: opts.helmet, robeBottom: opts.robeBottom });
    if (opts.staff) a.attach('HandR', opts.staff === 'spear' ? spearMesh() : staffMesh(), a.bonePos('HandR').add(V(0, -0.95, 0.03)));
    if (opts.shield) { const sh = clothMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 10, 1, true, -0.9, 1.8).toNonIndexed(), 0xa02020); a.attach('LowerArmL', sh, a.bonePos('HandL').add(V(0.12, 0.05, 0.08)), new THREE.Quaternion().setFromAxisAngle(AY, Math.PI / 2)); }
    if (opts.anim !== false) a.play(opts.anim || 'Idle', { timeScale: opts.animSpeed ?? r.range(0.85, 1.1) });
    this.scene.add(a.group);
    consolidate(a);
    return a;
  }

  dress(a, { robe, robeLen, scarf, veil, cloak, band, cloakColor, noRobe, kneelRobe, helmet, robeBottom }) {
    a.applyOverrides(); a.inner.updateMatrixWorld(true);
    const hips = a.bonePos('Hips');
    const head = a.bonePos('Head');
    const posed = !!a._posedState;
    const ground = 0; // el suelo está en y=0 del grupo
    if (!noRobe && robe !== null) {
      const top = hips.y + 0.1;
      const len = Math.max(0.3, (robeLen ?? (top - (posed ? ground + 0.02 : (a.female ? 0.08 : 0.2)))));
      const wide = kneelRobe || posed;
      const g = robeGeometry({ top: 0.17, bottom: robeBottom ?? (wide ? 0.4 : (a.female ? 0.25 : 0.22)), length: len, depth: wide ? 1.05 : 0.85 });
      const m = clothMesh(g, robe);
      const zoff = wide ? 0.08 : 0.0;
      a.attach('Hips', m, V(hips.x, top, hips.z + zoff));
      // cinturón
      const belt = clothMesh(new THREE.CylinderGeometry(0.185, 0.19, 0.05, 12, 1, true).toNonIndexed(), 0x5a3a22);
      belt.scale.z = 0.85; a.attach('Hips', belt, V(hips.x, top - 0.02, hips.z));
    }
    if (scarf) {
      const hf = a.headFrame();
      const R = hf.r * 1.06;
      const g = scarfGeometry({ r: R, drop: veil ? 0.36 : 0.24, open: veil ? 1.7 : 1.5, longBack: veil ? 0.14 : 0.02, capTheta: 0.42 });
      const m = clothMesh(g, scarf);
      const c = hf.pos.clone().add(V(0, hf.size.y * 0.04, -0.012).applyQuaternion(hf.quat));
      a.attach('Head', m, c, hf.quat);
      if (band) {
        const t = clothMesh(new THREE.TorusGeometry(R * 0.98, 0.016, 4, 16).toNonIndexed(), 0x3a2a20);
        const q = hf.quat.clone().multiply(new THREE.Quaternion().setFromAxisAngle(AX, Math.PI / 2 - 0.12));
        a.attach('Head', t, c.clone().add(V(0, R * 0.42, 0).applyQuaternion(hf.quat)), q);
      }
    }
    if (helmet) {
      const hf = a.headFrame(); const R = hf.r * 1.1;
      const hg = new THREE.SphereGeometry(R, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).toNonIndexed();
      const hm = clothMesh(hg, 0xb8903a);
      a.attach('Head', hm, hf.pos.clone().add(V(0, hf.size.y * 0.08, 0).applyQuaternion(hf.quat)), hf.quat);
      const crest = clothMesh(new THREE.BoxGeometry(0.035, 0.12, R * 2.1).toNonIndexed(), 0xb02020);
      a.attach('Head', crest, hf.pos.clone().add(V(0, hf.size.y * 0.08 + R + 0.04, 0).applyQuaternion(hf.quat)), hf.quat);
    }
    if (cloak) {
      const chest = a.bonePos('Chest');
      const g = cloakGeometry({ top: chest.y + 0.12, bottom: posed ? ground + 0.05 : 0.18, w: 0.26 });
      const m = clothMesh(g, cloakColor ?? 0x6a4a3a);
      m.geometry.translate(0, -chest.y, 0);
      a.attach('Chest', m, V(0, chest.y, chest.z - 0.02));
    }
  }

  // Animal animado
  animal(name, opts = {}) {
    const tpl = this.lib.animals[name];
    const a = new Actor(tpl, { palette: opts.palette, height: opts.height ?? 1.4, kind: 'animal' });
    if (opts.anim !== false) a.play(opts.anim || 'Idle', { timeScale: opts.animSpeed ?? this.rng.range(0.8, 1.1) });
    this.scene.add(a.group);
    return a;
  }

  // Camello: alpaca recoloreada, cuello curvado, joroba y manta
  camel(opts = {}) {
    const a = this.animal('Alpaca', { palette: { Main: 0xc39456, Main_Light: 0xd8b27c, Main_Dark: 0x7a5a36, Muzzle: 0x5a3e24, Hooves: 0x4a3a2a }, height: opts.height ?? 3.3, anim: opts.anim, animSpeed: opts.animSpeed });
    a.poseSteps([['Neck1', AX, 42], ['Neck2', AX, 8], ['Neck3', AX, -38], ['Head', AX, -22]]);
    const H = a.template.height;
    const bk = a.template.back.box;
    const top = bk.max.y, cz = (bk.min.z + bk.max.z) / 2 + (bk.max.z - bk.min.z) * 0.05;
    const hr = H * 0.115;
    const humpG = new THREE.SphereGeometry(hr, 10, 7); humpG.scale(0.95, 0.85, 1.25);
    const hump = clothMesh(humpG.toNonIndexed(), 0xc39456);
    a.attach('Torso', hump, V(0, top - hr * 0.25, cz));
    if (opts.blanket !== false) {
      const bg = new THREE.CylinderGeometry(hr * 1.12, hr * 1.12, hr * 2.0, 12, 1, true, -Math.PI / 2, Math.PI); bg.rotateX(Math.PI / 2);
      const bl = clothMesh(bg.toNonIndexed(), opts.blanket ?? 0xa03028);
      bl.scale.set(1.18, 1.0, 1.0);
      a.attach('Torso', bl, V(0, top - hr * 0.35, cz));
      for (let i = 0; i < 7; i++) { const t = clothMesh(new THREE.BoxGeometry(H * 0.012, H * 0.05, H * 0.012).toNonIndexed(), opts.fringe ?? 0xe8c050); const ang = -Math.PI / 2 + (i / 6) * Math.PI; for (const sd of [-1, 1]) a.attach('Torso', t.clone(), V(sd * hr * 1.28, top - hr * 1.15, cz - hr * 1.0 + (i / 6) * hr * 2.0)); }
      if (opts.bags) for (const s of [-1, 1]) { const b = clothMesh(new THREE.BoxGeometry(hr * 0.5, hr * 0.9, hr * 1.1).toNonIndexed(), opts.bags); a.attach('Torso', b, V(s * hr * 1.25, top - hr * 1.3, cz)); }
    }
    a.humpTop = V(0, top + hr * 0.5, cz);
    consolidate(a);
    return a;
  }

  // Jinete sobre un animal: la persona sigue al hueso del lomo
  mount(rider, beast, boneName = 'Torso', seat = null) {
    const p = seat || beast.humpTop || beast.bonePos(boneName).add(V(0, beast.template.height * 0.08, 0));
    if (rider.group.parent) rider.group.parent.remove(rider.group);
    const holder = new THREE.Group();
    beast.attach(boneName, holder, p);
    // el soporte hereda la escala del animal; el jinete conserva su altura real
    const s = rider.scale / beast.scale;
    rider.group.rotation.set(0, 0, 0);
    rider.group.scale.setScalar(s);
    rider.group.position.set(0, 0, 0);
    const hip = rider.bonePos('Hips');
    rider.group.position.set(-hip.x * s, -(hip.y - 0.06) * s, -hip.z * s);
    holder.add(rider.group); rider.mounted = true;
    return rider;
  }
}

// Bebé envuelto en pañales (Niño Jesús)
export function babyMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(paint(new THREE.CapsuleGeometry(0.09, 0.26, 3, 8).toNonIndexed(), 0xf4efe6), clothMat);
  body.rotation.z = Math.PI / 2; body.position.y = 0.09; g.add(body);
  const head = new THREE.Mesh(paint(new THREE.SphereGeometry(0.075, 10, 8).toNonIndexed(), 0xf0c8a8), clothMat);
  head.position.set(0.22, 0.12, 0); g.add(head);
  const hair = new THREE.Mesh(paint(new THREE.SphereGeometry(0.078, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.45).toNonIndexed(), 0x7a5030), clothMat);
  hair.position.copy(head.position); hair.rotation.z = -0.6; g.add(hair);
  const arm = new THREE.Mesh(paint(new THREE.CapsuleGeometry(0.025, 0.08, 2, 6).toNonIndexed(), 0xf0c8a8), clothMat);
  arm.position.set(0.12, 0.2, 0.06); arm.rotation.z = 0.9; g.add(arm);
  const arm2 = arm.clone(); arm2.position.z = -0.06; arm2.rotation.z = 1.3; g.add(arm2);
  // aureola
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.5, 1.2) }));
  halo.position.set(0.26, 0.14, 0); halo.rotation.y = Math.PI / 2; g.add(halo);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Ángel: figura con túnica blanca, alas y aureola
export function angelFigure(cast, { height = 1.9, banner = null } = {}) {
  const a = cast.person({ type: 'W_Formal', female: true, height, robe: 0xf8f4ec, scarf: null, pose: ['armsDown'], palette: { LimeGreen: 0xf2eee4, Red: 0xf2eee4, Gold: 0xe8c060, Brown: 0xc89a50 }, skin: 0xf0d0b0, anim: 'Idle' });
  // alas
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0); wingShape.bezierCurveTo(0.25, 0.25, 0.6, 0.55, 0.95, 0.75); wingShape.bezierCurveTo(0.8, 0.45, 0.75, 0.2, 0.7, 0.0);
  wingShape.bezierCurveTo(0.6, -0.25, 0.4, -0.5, 0.15, -0.65); wingShape.bezierCurveTo(0.15, -0.35, 0.05, -0.15, 0, 0);
  const wg = new THREE.ExtrudeGeometry(wingShape, { depth: 0.03, bevelEnabled: false, curveSegments: 6 }).toNonIndexed();
  const wingMat = new THREE.MeshStandardMaterial({ color: 0xfffaf0, emissive: 0xfff0d0, emissiveIntensity: 0.35, roughness: 0.7, flatShading: true, side: THREE.DoubleSide });
  const chest = a.bonePos('Chest');
  for (const s of [1, -1]) {
    const w = new THREE.Mesh(wg, wingMat); w.castShadow = true;
    w.scale.set(s * 0.62, 0.62, 0.62);
    const holder = new THREE.Group(); holder.add(w); w.rotation.y = s * 0.35; w.position.z = -0.02;
    a.attach('Chest', holder, V(chest.x + s * 0.06, chest.y + 0.05, chest.z - 0.14));
    a.extra.push(((h, s2) => { let t = Math.random() * 10; return (dt) => { t += dt; h.rotation.y = s2 * (0.15 + Math.sin(t * 2.2) * 0.18); }; })(holder, s));
  }
  // aureola
  const head = a.bonePos('Head');
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 6, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.5, 2.8, 1.3) }));
  a.attach('Head', halo, head.clone().add(V(0, 0.33, -0.04)), new THREE.Quaternion().setFromAxisAngle(AX, Math.PI / 2 - 0.25));
  a.isAngel = true;
  return a;
}
