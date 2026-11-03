// Figuras animadas: personas con túnicas y tocados, animales, posturas (sentado, arrodillado, rezando) y paseos.
import * as THREE from 'three';
import { RNG, PathWalker, clamp } from './util.js';
import { heightAt } from './terrain.js';
import { SHARED } from './assets.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { T as TINT, SKIN_TONES, HAIR_COLORS, ROBE_COLORS, SCARF_COLORS } from './people.js';

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
  constructor(template, { palette = null, height = 1.7, kind = 'human', inst = null } = {}) {
    inst ||= template.instance(palette);
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
export class Cast {
  constructor(lib, scene) { this.lib = lib; this.scene = scene; this.rng = new RNG(77); }

  // Crea una persona (cabeza y traje realistas + túnica, manto y tocado generados).
  // Opciones heredadas: female, type ('M_King', 'W_Medieval'...), pose, robe, robeLen, scarf, veil, band, cloak, cloakColor,
  // staff ('spear'|true), shield, helmet, noRobe, kneelRobe, anim, height, skin, outfit ('peasant'|'ranger'), hood, crown, hair
  person(opts = {}) {
    const r = this.rng;
    const female = opts.female ?? (opts.type ? opts.type.startsWith('W_') : r.chance(0.45));
    const kit = this.lib.kits[female ? 'f' : 'm'];
    const kid = (opts.height ?? 1.7) < 1.35;
    const king = opts.type === 'M_King' || opts.crown;
    const soldier = !!opts.helmet;
    let outfit = opts.outfit || (soldier ? 'ranger' : opts.staff && r.chance(0.5) ? 'ranger' : 'peasant');
    const hood = opts.hood ?? (outfit === 'ranger' && !soldier && !king && opts.scarf === undefined && r.chance(0.7));
    // piezas del traje
    const P = (n) => n;
    let parts = ['head', 'eyes', 'lashes'];
    if (outfit === 'peasant') parts.push(...(female ? ['peasant_arms_peasant', 'peasant_body_peasant', 'peasant_feet_peasant', 'peasant_legs_peasant'] : ['peasant_arms_1_peasant', 'peasant_arms_2_body', 'peasant_body_peasant', 'peasant_feet_peasant', 'peasant_legs_peasant']));
    else parts.push('ranger_arms_1_ranger', 'ranger_arms_2_body', 'ranger_body_ranger', female ? 'ranger_feet_ranger' : 'ranger_feet_boots_ranger', 'ranger_legs_ranger', 'ranger_arms_bracer_ranger', ...(opts.noRobe ? ['ranger_body_belt_1_ranger'] : []));
    if (soldier) parts.push(female ? 'ranger_acc_pauldrons_ranger' : 'ranger_acc_pauldron_ranger');
    if (hood) parts.push('ranger_head_hood_ranger');
    // tocado
    const scarfColor = hood || soldier || king ? null : (opts.scarf === undefined ? (female ? r.pick(SCARF_COLORS) : (r.chance(0.8) ? r.pick(SCARF_COLORS) : null)) : opts.scarf);
    const covered = !!scarfColor || hood || soldier;
    // pelo
    if (female) parts.push(covered ? 'buzzedf_hair_buzzedfemale_hair' : (opts.hair || r.pick(['long_hair_long_hair', 'buns_hair_buns_hair'])));
    else {
      if (!kid && (king || opts.beard || r.chance(0.75))) parts.push('beard_hair_beard_hair');
      parts.push(covered || king ? 'buzzed_hair_buzzed_hair' : (opts.hair || r.pick(['parted_hair_simpleparted_hair', 'buzzed_hair_buzzed_hair', 'long_hair_long_hair'])));
    }
    // ropa generada
    const robeColor = opts.noRobe ? null : (opts.robe === undefined ? r.pick(ROBE_COLORS) : opts.robe);
    const spec = { parts };
    if (robeColor !== null) spec.robe = { short: soldier || (opts.robeLen !== undefined && opts.robeLen < 0.7), wide: opts.kneelRobe ? 1.12 : 1, dress: opts.dress ?? (female && !soldier) };
    if (opts.cloak) spec.cloak = { length: soldier ? 0.55 : 0.22 };
    if (scarfColor) spec.scarf = { veil: opts.veil ?? female };
    if (scarfColor && !female && (opts.band ?? r.chance(0.6))) spec.band = true;
    if (king) spec.crown = true;
    if (soldier) spec.helmet = true;
    if (robeColor !== null) spec.belt = true;
    // paleta
    const pal = {};
    let skin = r.pick(SKIN_TONES);
    if (opts.skin !== undefined) { const c = new THREE.Color(opts.skin); const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; if (l < 0.25) skin = 0x7a5c4a; }
    pal[TINT.SKIN] = skin;
    const grey = !kid && !female && r.chance(king ? 0.5 : 0.2);
    pal[TINT.HAIR] = opts.hairColor ?? (grey ? r.pick([0x8a8478, 0xc8c4bc]) : r.pick(HAIR_COLORS.slice(0, 4)));
    pal[TINT.OUTFIT] = opts.outfitTint ?? (soldier ? 0xc8604a : king ? 0xf0c878 : outfit === 'ranger' ? r.pick([0xd8b890, 0xc8a878, 0xe0c8a0, 0xb8a080]) : r.pick([0xffffff, 0xf0e0c8, 0xe8d8c0, 0xd8d0c8]));
    if (robeColor !== null) pal[TINT.ROBE] = robeColor;
    pal[TINT.CLOAK] = opts.cloakColor ?? r.pick(ROBE_COLORS);
    if (scarfColor) pal[TINT.SCARF] = scarfColor;
    pal[TINT.BAND] = 0x3a2a1e;
    pal[TINT.GOLD] = soldier ? 0xb08a50 : 0xf2c460;
    pal[TINT.ACCENT] = 0xb02020;
    const height = opts.height ?? (female ? r.range(1.58, 1.68) : r.range(1.68, 1.8));
    const inst = kit.instance(spec, pal);
    const a = new Actor(kit, { height, inst });
    a.female = female; a.type = opts.type; a.kit = kit;
    // posturas: sentarse y lavar usan animaciones propias
    let poses = [].concat(opts.pose || []);
    let anim = opts.anim;
    if (poses.includes('sit')) { poses = poses.filter((p) => p !== 'sit'); anim = r.chance(0.5) ? 'Sitting_Talking_Loop' : 'Sitting_Idle_Loop'; }
    if (poses.includes('wash')) { poses = poses.filter((p) => p !== 'wash'); anim = 'Fixing_Kneeling'; }
    if (poses.includes('hammer')) { poses = poses.filter((p) => p !== 'hammer'); anim = 'TreeChopping_Loop'; }
    if (poses.length) a.pose(...poses);
    if (opts.staff) a.attach('HandR', opts.staff === 'spear' ? spearMesh() : staffMesh(), a.bonePos('HandR').add(V(0, -0.95, 0.03)));
    if (opts.shield) { const sh = clothMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 12, 1, true, -0.9, 1.8).toNonIndexed(), 0xa02020); a.attach('LowerArmL', sh, a.bonePos('HandL').add(V(0.12, 0.05, 0.08)), new THREE.Quaternion().setFromAxisAngle(AY, Math.PI / 2)); }
    if (anim !== false) a.play(anim || 'Idle', { timeScale: opts.animSpeed ?? r.range(0.85, 1.1) });
    this.scene.add(a.group);
    consolidate(a);
    return a;
  }

  // Animal animado
  animal(name, opts = {}) {
    const tpl = this.lib.animals[name];
    const a = new Actor(tpl, { palette: opts.palette, height: opts.height ?? 1.4, kind: 'animal' });
    if (opts.anim !== false) a.play(opts.anim || 'Idle', { timeScale: opts.animSpeed ?? this.rng.range(0.8, 1.1) });
    this.scene.add(a.group);
    return a;
  }

  // Camello (dromedario): caballo con patas y cuello alargados, cabeza menor, cuello en "S" y gran joroba
  camel(opts = {}) {
    const a = this.animal('Horse', { palette: { Main: 0xc49a62, Main_Light: 0xdcb886, Main_Dark: 0x9a7448, Hair: 0x8a6440, Muzzle: 0x6a4e34, Hooves: 0x4a3a2a }, height: opts.height ?? 2.35, anim: opts.anim, animSpeed: opts.animSpeed });
    const B = a.bones;
    const sc = (n, x, y, z) => { if (B[n]) B[n].scale.set(x, y, z); };
    sc('Neck1', 0.8, 1.18, 0.8); sc('Neck2', 0.84, 1.22, 0.84); sc('Neck3', 0.9, 1.12, 0.9); sc('Head', 0.82, 0.82, 0.86);
    a.poseSteps([['Neck1', AX, 20], ['Neck2', AX, 4], ['Neck3', AX, -30], ['Head', AX, -12]]);
    a.inner.updateMatrixWorld(true);
    const H = a.template.height;
    const bk = a.template.back.box;
    const top = bk.max.y, cz = (bk.min.z + bk.max.z) / 2 - (bk.max.z - bk.min.z) * 0.04;
    const hr = H * 0.15;
    const humpG = new THREE.SphereGeometry(hr, 16, 12); humpG.scale(0.85, 0.95, 1.25);
    const hump = clothMesh(humpG.toNonIndexed(), 0xb48a56); hump.userData.keep = true;
    hump.material = a.body.material; // mismo pelaje que el cuerpo
    a.attach('Torso', hump, V(0, top - hr * 0.2, cz));
    if (opts.blanket !== false) {
      const bg = new THREE.CylinderGeometry(hr * 1.05, hr * 1.05, hr * 1.9, 18, 1, true, -Math.PI / 2, Math.PI); bg.rotateX(Math.PI / 2);
      const bl = clothMesh(bg.toNonIndexed(), opts.blanket ?? 0xa03028);
      bl.scale.set(1.12, 1.0, 1.0);
      a.attach('Torso', bl, V(0, top - hr * 0.42, cz));
      for (let i = 0; i < 7; i++) { const t = clothMesh(new THREE.BoxGeometry(H * 0.012, H * 0.05, H * 0.012).toNonIndexed(), opts.fringe ?? 0xe8c050); for (const sd of [-1, 1]) a.attach('Torso', t.clone(), V(sd * hr * 1.16, top - hr * 1.18, cz - hr * 0.95 + (i / 6) * hr * 1.9)); }
      if (opts.bags) for (const s of [-1, 1]) { const b = clothMesh(new THREE.BoxGeometry(hr * 0.45, hr * 0.8, hr * 1.0).toNonIndexed(), opts.bags); a.attach('Torso', b, V(s * hr * 1.2, top - hr * 1.25, cz)); }
    }
    a.humpTop = V(0, top + hr * 0.62, cz);
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
  const a = cast.person({ female: true, height, robe: 0xf6f2ea, cloak: true, cloakColor: 0xfaf6ee, scarf: null, hair: 'long_hair_long_hair', hairColor: 0xd8b878, outfitTint: 0xffffff, pose: ['armsDown'], anim: 'Idle' });
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
  // el ángel brilla con luz propia
  const glowCloth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true, side: THREE.DoubleSide, emissive: 0xfff2dc, emissiveIntensity: 0.45 });
  a.group.traverse((o) => { if (o.isMesh && o.material === clothMat) o.material = glowCloth; });
  a.body.material.emissive = new THREE.Color(0xfff0dc); a.body.material.emissiveIntensity = 0.22;
  a.isAngel = true;
  return a;
}
