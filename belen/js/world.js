// Composición del Belén: la ciudad, el Portal y todas las escenas del nacimiento.
import * as THREE from 'three';
import { RNG, PathWalker, circlePath, smoothPath, clamp, lerp, distToPolyline } from './util.js';
import { LOC, ROADS, riverX, waterLevel, heightAt, buildTerrain, buildRiver, buildPond, roadDistance, shadeGround } from './terrain.js';
import { Instancer, SHARED } from './assets.js';
import { Cast, babyMesh, angelFigure, staffMesh, jarMesh, lanternMesh, ACTORS } from './actors.js';
import { GeoBuilder, hebrewHouse, cityWalls, buildPortal, stoneBridge, waterMill, bakeryOven, forge, rockBlob, frame, footprint, WALL_COLORS } from './builder.js';
import { makeFire, makeSmoke, makeGlowSprite, makeDoves, makeDucks, makeClouds, makeBanner, makeFireflies, makeEmbers, UPDATERS, NIGHT_LIGHTS } from './effects.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const angDist = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export class World {
  constructor(scene, lib, { lite = false } = {}) {
    this.scene = scene; this.lib = lib; this.lite = lite;
    this.Q = lite ? 0.5 : 1; // densidad de vegetación y gente
    this.rng = new RNG(1225);
    this.inst = new Instancer(scene, lib.props);
    this.cast = new Cast(lib, scene);
    this.buildingMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true });
    this.windowMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: new THREE.Color(1.0, 0.62, 0.28), emissiveIntensity: 0, flatShading: true });
    this.glowMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: new THREE.Color(1, 0.45, 0.12), emissiveIntensity: 2.5, roughness: 0.8 });
    this.B = new GeoBuilder(); this.W = new GeoBuilder(); this.G = new GeoBuilder();
    this.flocks = []; this.spin = [];
    this.poi = {};
  }

  // Construcción por etapas (para mostrar progreso)
  steps() {
    return [
      ['Modelando el terreno', () => this.buildLand()],
      ['Levantando la ciudad de Belén', () => this.buildTown()],
      ['Preparando el Portal', () => this.buildPortalScene()],
      ['Reuniendo a los pastores', () => this.buildShepherds()],
      ['Llegan los Reyes Magos', () => this.buildKings()],
      ['El río, el molino y las lavanderas', () => this.buildRiverScene()],
      ['Huertas, olivares y campos', () => this.buildFarm()],
      ['El palacio de Herodes', () => this.buildPalace()],
      ['El desierto y el oasis', () => this.buildDesert()],
      ['Bosques, montañas y vegetación', () => this.buildNature()],
      ['Encendiendo las luces', () => this.finish()],
    ];
  }

  prop(name, x, z, { ry = 0, h = null, s = 1, y = null, palette = null, yOff = 0, color = null, cast = true } = {}) {
    this.inst.add(name, { x, y: (y ?? heightAt(x, z)) + yOff, z, ry, height: h, s, palette, color, castShadow: cast });
  }

  // ---------------------------------------------------------------- terreno
  buildLand() {
    this.terrain = buildTerrain(); this.scene.add(this.terrain);
    this.scene.userData.heightAt = heightAt;
    this.river = buildRiver(); this.scene.add(this.river);
  }

  // ---------------------------------------------------------------- ciudad
  buildTown() {
    const { B, W, rng } = this; const T = LOC.town;
    cityWalls(B, { cx: T.x, cz: T.z, r: T.r, gates: [Math.PI / 2, Math.PI], rng });
    const rings = [19.5, 27, 34.5, 42, 48.2];
    const streets = [[Math.PI / 2, 4.4], [Math.PI, 3.4], [-Math.PI / 2, 3.0], [0, 3.0], [Math.PI * 0.27, 2.4], [Math.PI * 1.27, 2.4], [-Math.PI * 0.2, 2.4], [Math.PI * 0.75, 2.4]];
    this.houses = [];
    const special = new Map();
    // la posada junto a la calle mayor y la sinagoga al norte de la plaza
    special.set('posada', { ring: 3, a: Math.PI / 2 - 0.2, w: 10 });
    special.set('sinagoga', { ring: 0, a: -Math.PI / 2 + 0.25, w: 10.5 });
    rings.forEach((r, ri) => {
      let a = rng.range(0, 0.2);
      const d = ri === 4 ? 4.2 : 4.5;
      while (a < Math.PI * 2 - 0.05) {
        let w = rng.range(4.6, 7.6); const gap = rng.chance(0.35) ? 0.05 : rng.range(0.4, 1.6);
        let am = a + w / 2 / r;
        let kind = null;
        for (const [k, sp] of special) if (sp.ring === ri && angDist(am, sp.a) * r < sp.w / 2 + w / 2 && !sp.done) { kind = k; am = sp.a; w = sp.w; sp.done = true; a = sp.a - w / 2 / r; }
        const blocked = !kind && (streets.some(([s, hw]) => angDist(am, s) * r < hw + w / 2) || [...special.values()].some((sp) => sp.ring === ri && angDist(am, sp.a) * r < sp.w / 2 + w / 2));
        if (!blocked && a + w / r < Math.PI * 2 + 0.02) {
          const x = T.x + Math.cos(am) * r, z = T.z + Math.sin(am) * r;
          const ry = Math.atan2(-Math.cos(am), -Math.sin(am));
          const floors = kind ? 2 : (rng.chance(0.18 + ri * 0.06) ? 2 : 1);
          const info = hebrewHouse(B, W, { x, z, ry, w: w - 0.1, d, floors, color: kind === 'sinagoga' ? 0xf4efe4 : rng.pick(WALL_COLORS), rng, lit: 0.55, dome: kind === 'sinagoga' || rng.chance(0.08), awning: kind === 'posada' ? true : null });
          this.houses.push({ x, z, ry, w, d, ...info, kind, ring: ri, a: am });
          if (kind) this.poi[kind] = { x, z, ry, door: info.door, top: info.top, base: info.base };
        }
        a += (w + gap) / r;
      }
    });
    // la plaza: pozo, mercado y palmeras
    const pc = V(T.x, heightAt(T.x, T.z), T.z);
    this.prop('v_Well', T.x + 4, T.z + 3, { h: 2.6, ry: 0.4 });
    this.prop('r_Market_FirstAge_Level2', T.x - 3, T.z - 2, { h: 3.4, ry: 0.2 });
    const stands = [['v_MarketStand_1', 9.5, 0.3], ['v_MarketStand_2', 8.5, 1.1], ['v_MarketStand_1', 10, 2.0], ['v_MarketStand_2', 9.5, 3.4], ['v_MarketStand_1', 9.5, 4.3], ['v_MarketStand_2', 10, 5.4]];
    for (const [n, r, a] of stands) {
      const x = T.x + Math.cos(a) * r, z = T.z + Math.sin(a) * r;
      this.prop(n, x, z, { h: 2.5, ry: Math.atan2(-Math.cos(a), -Math.sin(a)) });
      // mercancías
      for (let i = 0; i < 3; i++) {
        const n2 = rng.pick(['v_Crate', 'v_Barrel', 'v_Bags', 'c_Pumpkin_Crop', 'c_Lettuce_Crop', 'v_Package_1']);
        const h2 = { v_Crate: 0.6, v_Barrel: 0.85, v_Bags: 0.45, c_Pumpkin_Crop: 0.45, c_Lettuce_Crop: 0.35, v_Package_1: 0.4 }[n2];
        this.prop(n2, x + rng.range(-1.5, 1.5), z + rng.range(-1.5, 1.5), { h: h2, ry: rng.range(0, 6) });
      }
    }
    this.prop('v_Cart', T.x - 8, T.z + 6, { h: 2.1, ry: 2.2 });
    for (const [dx, dz] of [[-11, -6], [11, -7], [-12, 8], [6, -12]]) this.prop(rng.pick(['n_PalmTree_1', 'n_PalmTree_3']), T.x + dx, T.z + dz, { h: rng.range(9, 11.5), ry: rng.range(0, 6) });
    // palmeras y árboles entre las casas
    for (let i = 0; i < 26; i++) {
      const r = rng.pick([23.2, 30.8, 38.2]) + rng.range(-0.4, 0.4), a = rng.range(0, Math.PI * 2);
      if (streets.some(([s]) => angDist(a, s) * r < 4)) continue;
      this.prop(rng.pick(['n_PalmTree_1', 'n_PalmTree_3', 'n_PalmTree_4', 'n_CommonTree_3']), T.x + Math.cos(a) * (r + rng.sign() * 1.3), T.z + Math.sin(a) * (r + rng.sign() * 1.3), { h: rng.range(6, 10), ry: rng.range(0, 6) });
    }
    // la posada: cartel y farol
    if (this.poi.posada) {
      const p = this.poi.posada; const F = frame(p.x, p.base, p.z, p.ry);
      B.box(1.6, 0.7, 0.08, 0x6a4a2c, { x: 2.2, y: 2.6, z: 2.6, parent: F });
      W.box(0.25, 0.3, 0.25, 0xffd080, { x: -2.6, y: 2.4, z: 2.45, parent: F });
      const lp = V(-2.6, 2.4, 2.6).applyMatrix4(F);
      this.townLanterns = [lp];
    }
    // faroles en la calle mayor y la plaza
    this.lanternPosts = [];
    for (const [x, z] of [[-2.6, -36], [3.4, -44], [-2.6, -52], [3.4, -60], [-2.6, -66], [T.x + 12.5, T.z + 6], [T.x - 12.5, T.z + 4], [T.x + 7, T.z - 12], [T.x - 8, T.z - 11]]) {
      const y0 = heightAt(x, z);
      B.cyl(0.07, 0.09, 2.6, 0x3a2a1a, { x, y: y0 + 1.3, z }, 5);
      B.box(0.5, 0.06, 0.06, 0x3a2a1a, { x: x + 0.2, y: y0 + 2.55, z });
      W.box(0.22, 0.28, 0.22, 0xffd090, { x: x + 0.42, y: y0 + 2.35, z });
      this.lanternPosts.push(V(x + 0.42, y0 + 2.35, z));
    }
    // gente por las calles
    this.buildTownPeople(pc);
    // soldados romanos en las puertas
    this.soldier(LOC.gateS.x - 3.2, LOC.gateS.z + 2.5, 0.2);
    this.soldier(LOC.gateS.x + 3.2, LOC.gateS.z + 2.5, -0.2);
    this.soldier(LOC.gateW.x - 2.5, LOC.gateW.z - 3.2, -Math.PI / 2);
    this.soldier(LOC.gateW.x - 2.5, LOC.gateW.z + 3.2, -Math.PI / 2);
    // oficios junto a la puerta sur
    this.buildCrafts();
  }

  soldier(x, z, ry, walk = null) {
    const s = this.cast.person({ type: this.rng.pick(['M_Casual2', 'M_Adventurer', 'M_Casual']), female: false, scarf: null, helmet: true, robe: 0xa82a22, robeLen: 0.5, cloak: true, cloakColor: 0x8a1a18, staff: 'spear', shield: true, pose: ['staffR'], skin: this.rng.pick([0xe0ad85, 0xd29a6e]), palette: { LightBlue: 0x8a6a40, Purple: 0xa82a22, White: 0xb08a50, Red_Dark: 0xa82a22, LightBrown: 0xb08a50, Green: 0xa82a22, LightGreen: 0xa82a22, Grey: 0x6a5a40, Black: 0x4a3a2a } });
    if (walk) s.walk(walk.path, { speed: 1.0, offset: walk.offset ?? 0, loop: walk.loop ?? true });
    else s.place(x, z, ry);
    return s;
  }

  buildTownPeople(pc) {
    const { cast, rng } = this; const T = LOC.town;
    // paseantes por las calles anulares
    for (let i = 0; i < Math.round(30 * (this.lite ? 0.6 : 1)); i++) {
      const r = rng.pick([23.25, 30.75, 38.2]);
      let pts = circlePath(T.x, T.z, r + rng.range(-0.5, 0.5), 72);
      if (rng.chance(0.5)) pts = pts.reverse();
      const female = rng.chance(0.5);
      const jar = female && rng.chance(0.45);
      const kid = !jar && rng.chance(0.15);
      const p = cast.person({ female, pose: jar ? ['carryHead'] : undefined, height: kid ? rng.range(1.05, 1.25) : undefined, anim: 'Walk' });
      if (jar) { const hf = p.headFrame(); p.attach('Head', jarMesh(rng.pick([0xb8643a, 0xc88a5a, 0x9a5a34]), 1.2), hf.pos.clone().add(V(0, hf.size.y * 0.5 + 0.02, 0))); }
      p.walk(pts, { speed: kid ? 1.5 : rng.range(0.8, 1.15), offset: rng.next(), loop: true, anim: kid ? 'Run' : 'Walk', animSpeed: kid ? 0.9 : undefined });
    }
    // calle mayor: de la puerta a la plaza
    const main = [[0.8, -32], [0.8, -60], [0.8, -68]];
    for (let i = 0; i < 6; i++) {
      const p = cast.person({ anim: 'Walk' });
      p.walk(i % 2 ? main.map(([x, z]) => [x - 1.6, z]) : main, { speed: rng.range(0.8, 1.1), offset: rng.next(), loop: false });
    }
    // corrillos en la plaza
    const groups = [[5, 6], [-6, 5], [3, -7], [-9, -2], [7, -2]];
    for (const [dx, dz] of groups) {
      const n = rng.int(2, 3);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rng.range(0, 1); const x = T.x + dx + Math.cos(a) * 0.9, z = T.z + dz + Math.sin(a) * 0.9;
        const p = cast.person({ anim: rng.chance(0.25) ? 'Wave' : 'Idle' });
        p.place(x, z, Math.atan2(T.x + dx - x, T.z + dz - z));
      }
    }
    // vendedores tras los puestos
    for (const a of [0.3, 1.1, 2.0, 3.4, 4.3, 5.4]) {
      const x = T.x + Math.cos(a) * 11.1, z = T.z + Math.sin(a) * 11.1;
      const p = cast.person({ anim: rng.chance(0.5) ? 'Interact' : 'Idle' });
      p.place(x, z, Math.atan2(-Math.cos(a), -Math.sin(a)));
    }
    // mujer sacando agua del pozo
    const w = cast.person({ female: true, anim: 'Interact' }); w.place(T.x + 4, T.z + 4.4, Math.PI);
    const w2 = cast.person({ female: true, pose: ['carryHead'], anim: 'Idle' }); w2.place(T.x + 5.8, T.z + 4.8, -2.4);
    { const hf = w2.headFrame(); w2.attach('Head', jarMesh(0xb8643a, 1.2), hf.pos.clone().add(V(0, hf.size.y * 0.5 + 0.02, 0))); }
    // el posadero
    if (this.poi.posada) {
      const p = this.poi.posada; const pos = p.door;
      const k = cast.person({ female: false, robe: 0x7a4a2a, anim: 'Wave' }); k.place(pos.x, pos.z, p.ry);
    }
    // mujeres tendiendo la ropa en las azoteas
    let roofs = 0;
    for (const h of this.houses) {
      if (roofs > 10 || h.kind || this.rng.next() > 0.12) continue;
      const F = h.F; const pos = V(rng.range(-h.w / 4, h.w / 4), h.H1 + 0.01, rng.range(-0.5, h.d / 2 - 0.8)).applyMatrix4(F);
      const p = cast.person({ female: true, anim: rng.pick(['Interact', 'Idle', 'Wave']) }); p.place(pos.x, pos.z, h.ry + rng.range(-1, 1), h.base + h.H1 + 0.02);
      roofs++;
    }
  }

  buildCrafts() {
    const { B, G, cast, rng, scene } = this;
    // fragua del herrero
    const fx = -10, fz = -19, fy = heightAt(fx, fz);
    forge(B, G, { x: fx, z: fz, y: fy, ry: 0.5 });
    makeFire(scene, V(fx, fy + 1.05, fz), { size: 0.5, intensity: 10, distance: 12 });
    makeEmbers(scene, V(fx, fy + 1.2, fz), { count: 20, height: 2.5, spread: 0.6 });
    const smith = cast.person({ type: 'M_Worker', female: false, robe: 0x5a4a3a, scarf: null, pose: ['hammer'], anim: 'Idle', noRobe: false, robeLen: 0.6 });
    const sp = V(1.6, 0, 1.1).applyMatrix4(frame(fx, fy, fz, 0.5)); smith.place(sp.x, sp.z, 0.5 - Math.PI / 2 + 0.6);
    const arm = smith.bones.LowerArmR; const q0 = arm.quaternion.clone();
    smith.extra.push(((t0) => (dt) => { t0 += dt; const k = Math.max(0, Math.sin(t0 * 4)); const q = q0.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -k * 0.9)); for (const o of smith.overrides) if (o[0] === arm) o[1].copy(q); })(0));
    this.poi.forge = V(fx, fy, fz);
    // horno de pan con la panadera
    const bx = 11, bz = -20, by = heightAt(bx, bz);
    bakeryOven(B, G, { x: bx, z: bz, y: by, ry: -0.4 });
    makeFire(scene, V(bx + Math.sin(-0.4) * 1.1, by + 0.95, bz + Math.cos(-0.4) * 1.1), { size: 0.35, intensity: 6, distance: 9 });
    const baker = cast.person({ female: true, anim: 'Interact', robe: 0xd8c8a8 }); const bp = V(-0.4, 0, 2.2).applyMatrix4(frame(bx, by, bz, -0.4)); baker.place(bp.x, bp.z, -0.4 + Math.PI);
    B.box(1.6, 0.8, 0.8, 0x6a4a2c, { x: bx + 2.2, y: by + 0.4, z: bz + 0.4 });
    for (let i = 0; i < 6; i++) B.sphere(0.13, 0xc08a48, { x: bx + 1.8 + (i % 3) * 0.3, y: by + 0.86, z: bz + 0.2 + Math.floor(i / 3) * 0.3, sy: 0.6 }, 6, 4);
    // alfarero
    const px = -14, pz = -8, py = heightAt(px, pz);
    for (let i = 0; i < 9; i++) { const j = jarMesh(rng.pick([0xb8643a, 0xa05a30, 0xc88a5a, 0x9a4a2a]), rng.range(1.2, 2.2)); j.position.set(px + rng.range(-2, 2), py, pz + rng.range(-2, 2)); scene.add(j); }
    const potter = cast.person({ female: false, pose: ['sit'], anim: 'Idle', robe: 0x8a6a4a }); potter.place(px + 2.4, pz + 1, -1.2);
    this.prop('n_Rock_3', px + 2.4 - Math.sin(-1.2) * 0.2, pz + 1 - Math.cos(-1.2) * 0.2, { h: 0.42, cast: true });
    // carpintero
    const cx = 15, cz = -7, cy = heightAt(cx, cz);
    this.prop('r_Logs', cx, cz, { h: 0.9, ry: 0.6 });
    const carp = cast.person({ female: false, anim: 'Interact', robe: 0x6a5a3a, scarf: 0xd8c8a0 }); carp.place(cx - 1.6, cz + 1.6, 2.4);
    const spinner = cast.person({ female: true, pose: ['sit'], anim: 'Idle_Neutral', robe: 0x8a5a6a }); spinner.place(-4, -12, 0.6);
    this.prop('n_Rock_5', -4 - Math.sin(0.6) * 0.2, -12 - Math.cos(0.6) * 0.2, { h: 0.42 });
    for (let i = 0; i < 5; i++) { const j = jarMesh(0xc8a060, rng.range(1.0, 1.6)); j.scale.y *= 0.5; j.position.set(-2.6 + i * 0.5, heightAt(-2.6 + i * 0.5, -10.5), -10.5); scene.add(j); }
    this.prop('v_Well', -6, -2, { h: 2.4, ry: 0.8 });
    const wg = cast.person({ female: true, anim: 'Interact' }); wg.place(-6, -0.6, Math.PI);
    // vendedor de leña con su burro
    const don = cast.animal('Donkey', { height: 1.45, anim: 'Walk' });
    const dpath = ROADS.gateToPortal.slice(4, -16);
    don.walk(dpath, { speed: 0.7, loop: false, offset: 0.3, anim: 'Walk', animSpeed: 0.8 });
    const driver = cast.person({ female: false, staff: true, pose: ['staffR'], anim: 'Walk' });
    driver.walk(dpath.map(([x, z]) => [x + 1.1, z + 0.3]), { speed: 0.7, loop: false, offset: 0.3 });
  }

  // ---------------------------------------------------------------- portal
  buildPortalScene() {
    const { B, rng, cast, scene } = this; const P = LOC.portal; const y = LOC.portal.h;
    const info = buildPortal(B, { x: P.x, z: P.z, y, rng });
    this.poi.portal = V(P.x, y, P.z);
    const L = (lx, lz) => [P.x + lx, P.z + lz];
    // el Niño en el pesebre
    const baby = babyMesh(); baby.position.copy(info.manger); baby.rotation.y = 0.15; scene.add(baby);
    makeGlowSprite(scene, info.manger.clone().add(V(0.1, 0.25, 0)), { size: 2.2, color: 0xffe0a0, opacity: 0.35 });
    // la Virgen María
    const maria = cast.person({ type: 'W_Medieval', female: true, pose: ['kneel2', 'pray'], robe: 0x2f5fa8, scarf: 0xf4f0e6, kneelRobe: true, anim: 'Idle_Neutral', skin: 0xe8b890, palette: { Black: 0x2f5fa8, DarkBrown: 0x3a6ab8, LightBrown: 0xf0ece0, Metal: 0x2f5fa8, White: 0xf0ece0, Gold: 0xd0a040, Brown: 0x5a3a20 } });
    maria.place(...L(-0.95, 0.85), Math.PI / 2 + 0.25, y);
    const mh = maria.headFrame();
    const halo1 = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.009, 6, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.45, 0.7) }));
    maria.attach('Head', halo1, mh.pos.clone().add(V(0, 0.05, -0.2)), mh.quat);
    // San José con su cayado y un farol
    const jose = cast.person({ type: 'M_Adventurer', female: false, staff: true, pose: ['staffR'], robe: 0x7a5232, scarf: 0xb89868, band: true, cloak: true, cloakColor: 0x4f6a3a, anim: 'Idle', skin: 0xd29a6e });
    jose.place(...L(1.45, 0.3), -Math.PI / 2 + 0.35, y);
    const jh = jose.headFrame();
    const halo2 = halo1.clone(); jose.attach('Head', halo2, jh.pos.clone().add(V(0, 0.05, -0.2)), jh.quat);
    // el buey y la mula
    const ox = cast.animal('Cow', { height: 1.55, anim: 'Eating', animSpeed: 0.6 }); ox.place(...L(-1.3, -1.4), 0.9, y);
    const mule = cast.animal('Donkey', { height: 1.5, anim: 'Idle_Headlow', animSpeed: 0.7 }); mule.place(...L(1.3, -1.6), -0.8, y);
    // ovejitas en el portal
    this.flocks.push(new Flock(this, { cx: P.x - 4.6, cz: P.z + 4.6, r: 1.8, count: 4, static: true }));
    // farol y luz cálida
    const lan = lanternMesh(); lan.position.copy(info.lanternPos); scene.add(lan);
    const pl = new THREE.PointLight(0xffb060, 12, 22, 1.5); pl.position.copy(info.lanternPos).add(V(0.6, -0.4, -0.4)); pl.castShadow = false; scene.add(pl);
    NIGHT_LIGHTS.push({ light: pl, base: 12 });
    const pl2 = new THREE.PointLight(0xffe0b0, 6, 9, 1.6); pl2.position.copy(info.manger).add(V(0, 1.2, 0.8)); scene.add(pl2);
    NIGHT_LIGHTS.push({ light: pl2, base: 6 });
    // ángel sobre el portal con el estandarte
    const angel = angelFigure(cast, { height: 1.9 });
    angel.place(P.x + 0.4, P.z - 0.6, 0, y + 6.4);
    angel.pose('armsOpen');
    const banner = makeBanner('GLORIA IN EXCELSIS DEO', { width: 5.4, height: 0.8 });
    banner.position.set(P.x + 0.4, y + 9.3, P.z - 0.2); scene.add(banner);
    const ay = y + 6.4; let at = 0;
    angel.extra.push((dt) => { at += dt; angel.group.position.y = ay + Math.sin(at * 1.2) * 0.18; banner.position.y = y + 9.35 + Math.sin(at * 1.2 + 0.6) * 0.12; });
    makeGlowSprite(scene, V(P.x + 0.4, y + 7.5, P.z - 0.8), { size: 7, color: 0xfff0c0, opacity: 0.35 });
    // pastores adorando
    const sh1 = cast.person({ female: false, pose: ['kneel2', 'pray'], kneelRobe: true, anim: 'Idle_Neutral', robe: 0x8a6a40 }); sh1.place(...L(3.3, 3.9), -2.5, y);
    const lamb = this.lib.props.geometry('f_Sheep', { height: 0.55 });
    const lm = new THREE.Mesh(lamb, SHARED.standard); lm.castShadow = true; const lp = L(2.6, 3.4); lm.position.set(lp[0], heightAt(...lp), lp[1]); lm.rotation.y = 2.0; scene.add(lm);
    const sh2 = cast.person({ female: false, staff: true, pose: ['staffR'], anim: 'Idle' }); sh2.place(...L(4.4, 2.0), -1.9, y);
    const sh3 = cast.person({ female: true, pose: ['carryArms'], anim: 'Idle' }); sh3.place(...L(5.0, 4.0), -2.2, y);
    { const b = jarMesh(0xc8a060, 1.4); sh3.attach('HandR', b, sh3.bonePos('HandR').add(V(0.1, -0.25, 0.05))); }
    const kid = cast.person({ female: false, height: 1.1, anim: 'Wave' }); kid.place(...L(4.0, 5.4), -2.6, y);
    // palomas
    makeDoves(scene, V(P.x, y, P.z), { count: 10, radius: 16, height: 11 });
    this.portalInfo = info;
  }

  // ---------------------------------------------------------------- pastores
  buildShepherds() {
    const { cast, rng, scene, B } = this; const S = LOC.shepherds; const y = heightAt(S.x, S.z);
    // hoguera con pastores sentados
    this.prop('v_Bonfire', S.x, S.z, { h: 0.28 });
    makeFire(scene, V(S.x, y + 0.05, S.z), { size: 1.1, intensity: 30, distance: 30 });
    makeSmoke(scene, V(S.x, y + 1.2, S.z), { count: 7, size: 0.8 });
    makeEmbers(scene, V(S.x, y + 0.4, S.z), { count: 40, height: 5 });
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI * 0.5 + 0.4; const r = 2.1;
      const x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r;
      const face = Math.atan2(S.x - x, S.z - z);
      if (i === 3) {
        const st = cast.person({ female: false, staff: true, pose: ['staffR', 'lookUp'], anim: 'Idle', robe: 0x8a6a40, cloak: true, cloakColor: 0x6a5030 });
        st.place(x, z, face + 0.6);
        continue;
      }
      const p = cast.person({ female: i === 1, pose: i === 2 ? ['sit', 'lookUp'] : ['sit'], anim: 'Idle_Neutral', robe: rng.pick([0x8a6a40, 0x7a5a3a, 0x9a8060, 0x6a5a40]) });
      p.place(x, z, face);
      this.prop('n_WoodLog', x - Math.sin(face) * 0.15, z - Math.cos(face) * 0.15, { h: 0.42, ry: face + Math.PI / 2 });
    }
    // olla al fuego, tiendas y el redil
    this.prop('s_Pot', S.x + 0.9, S.z - 0.6, { h: 0.35 });
    this.prop('s_Tent', S.x - 7, S.z - 5, { h: 2.6, ry: 0.8 });
    this.prop('s_Tent', S.x + 6, S.z - 7, { h: 2.4, ry: -0.6, palette: { } });
    this.prop('v_Hay', S.x - 4, S.z + 3, { h: 1.0 });
    // redil de piedra
    const fx = S.x + 20, fz = S.z - 18;
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * Math.PI * 2; if (a > 1.2 && a < 1.6) continue;
      const x = fx + Math.cos(a) * 9, z = fz + Math.sin(a) * 9;
      B.box(1.5, 1.0, 0.7, rng.pick([0xb8a486, 0xa89474, 0xc4b090]), { x, y: heightAt(x, z) + 0.35, z, ry: -a + Math.PI / 2 });
    }
    this.flocks.push(new Flock(this, { cx: fx, cz: fz, r: 7, count: 18 }));
    // rebaños pastando
    this.flocks.push(new Flock(this, { cx: S.x + 6, cz: S.z + 14, r: 16, count: 30 }));
    this.flocks.push(new Flock(this, { cx: S.x + 36, cz: S.z + 32, r: 14, count: 22 }));
    // perros pastores
    for (const [r, off, cx, cz] of [[17, 0, S.x + 6, S.z + 14], [15, 0.5, S.x + 36, S.z + 32]]) {
      const d = cast.animal(rng.pick(['Husky', 'ShibaInu']), { height: 0.75, anim: 'Walk' });
      d.walk(circlePath(cx, cz, r, 40), { speed: 1.4, offset: off, anim: 'Walk', animSpeed: 1.1 });
    }
    // pastor con una oveja a hombros camino del Portal
    const carrier = cast.person({ female: false, pose: ['carryArms'], anim: 'Walk', robe: 0x7a6040 });
    const lambG = this.lib.props.geometry('f_Sheep', { height: 0.5 });
    const lamb = new THREE.Mesh(lambG, SHARED.standard); lamb.castShadow = true;
    const chest = carrier.bonePos('Chest');
    carrier.attach('Chest', lamb, V(0, chest.y + 0.26, chest.z - 0.04), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.PI / 2));
    carrier.walk([...ROADS.portalToShepherds].reverse().slice(0, -3), { speed: 0.9, loop: false, offset: 0.2 });
    // otro pastor con zurrón y cayado
    const w2 = cast.person({ female: false, staff: true, pose: ['staffR'], anim: 'Walk' });
    w2.walk([...ROADS.portalToShepherds].reverse().slice(0, -3).map(([x, z]) => [x + 1.2, z - 0.6]), { speed: 0.9, loop: false, offset: 0.62 });
    // el ángel de la Anunciación sobre el campo
    const angel = angelFigure(cast, { height: 2.1 });
    angel.pose('armsOpen');
    const ax = S.x + 2, az = S.z + 10, ay = y + 9;
    angel.place(ax, az, Math.PI + 0.3, ay);
    let t = 0; angel.extra.push((dt) => { t += dt; angel.group.position.y = ay + Math.sin(t * 0.9) * 0.4; });
    makeGlowSprite(scene, V(ax, ay + 1.3, az), { size: 16, color: 0xfff2d0, opacity: 0.45 });
    const al = new THREE.PointLight(0xdfe8ff, 30, 40, 1.4); al.position.set(ax, ay + 2, az); scene.add(al); NIGHT_LIGHTS.push({ light: al, base: 30 });
    this.poi.shepherds = V(S.x, y, S.z);
    // un lobo acechando desde la loma
    const wolf = cast.animal('Wolf', { height: 0.9, anim: 'Idle' }); wolf.place(S.x + 44, S.z - 40, -2.2);
    const fox = cast.animal('Fox', { height: 0.55, anim: 'Walk' }); fox.walk(circlePath(S.x + 50, S.z - 10, 9, 30), { speed: 1.2, anim: 'Walk' });
  }

  // ---------------------------------------------------------------- reyes magos
  buildKings() {
    const { cast, rng, scene } = this; const P = LOC.portal; const y = LOC.portal.h;
    const L = (lx, lz) => [P.x + lx, P.z + lz];
    const kings = [
      { name: 'Melchor', skin: 0xe8c0a0, robe: 0xc8a030, pal: { Blue: 0xc8a030, Metal: 0xf0d070, Beige: 0xe8e0d0, Metal_Dark: 0xa07820, DarkBrown: 0x6a4a20 }, pos: L(-1.5, 2.9), gift: 'i_Chest_Ingots', pose: ['kneel', 'offer'] },
      { name: 'Gaspar', skin: 0xd8a880, robe: 0x2a6a3a, pal: { Blue: 0x2a6a3a, Metal: 0xb02a2a, Beige: 0xd8c8a0, Metal_Dark: 0x8a1a1a, DarkBrown: 0x5a2a20, Hair_White: 0x6a3a1a }, pos: L(1.9, 3.1), gift: 'i_Chalice', pose: ['kneel', 'offer'] },
      { name: 'Baltasar', skin: 0x5a3620, robe: 0x6a2a8a, pal: { Blue: 0x6a2a8a, Metal: 0xe8c050, Beige: 0xf0e8d8, Metal_Dark: 0x4a1a5a, DarkBrown: 0x2a1a10, Hair_White: 0x1a1210 }, pos: L(-3.1, 3.4), gift: 'i_Potion3_Filled', pose: ['offer'] },
    ];
    this.kings = [];
    for (const k of kings) {
      const a = cast.person({ type: 'M_King', female: false, pose: k.pose, robe: k.robe, scarf: null, skin: k.skin, kingPalette: k.pal, cloak: true, cloakColor: k.robe, kneelRobe: k.pose.includes('kneel'), anim: 'Idle_Neutral' });
      a.place(k.pos[0], k.pos[1], Math.atan2(P.x + 0.2 - k.pos[0], P.z + 0.6 - k.pos[1]), y);
      // regalo en las manos
      const g = new THREE.Mesh(this.lib.props.geometry(k.gift, { height: k.gift === 'i_Chest_Ingots' ? 0.32 : 0.28 }), SHARED.standard); g.castShadow = true;
      const hl = a.bonePos('HandL'), hr = a.bonePos('HandR');
      a.attach('HandR', g, hl.clone().add(hr).multiplyScalar(0.5).add(V(0, -0.05, 0.08)));
      this.kings.push(a);
    }
    // camellos y pajes esperando
    const camels = [
      { pos: L(9.5, 9), ry: -2.4, blanket: 0xc8a030, fringe: 0xe04030, anim: 'Eating' },
      { pos: L(12.5, 7), ry: -2.0, blanket: 0x2a6a3a, fringe: 0xe8c050, anim: 'Idle' },
      { pos: L(11.5, 11.5), ry: -2.7, blanket: 0x6a2a8a, fringe: 0xe8c050, anim: 'Idle_Headlow' },
    ];
    for (const c of camels) { const cm = cast.camel({ blanket: c.blanket, fringe: c.fringe, anim: c.anim, bags: 0x8a5a30 }); cm.place(c.pos[0], c.pos[1], c.ry); }
    const pages = [[L(8, 7.4), -2.2], [L(10.8, 5.2), -2.6], [L(13.6, 9.8), -1.8]];
    for (const [p, r] of pages) { const a = cast.person({ female: false, robe: rng.pick([0xd8c8a8, 0xb03a2a, 0x2a5a8a]), scarf: rng.pick([0xf0e8d0, 0xe8c050]), band: false, anim: 'Idle' }); a.place(p[0], p[1], r); }
    const horse = cast.animal('Horse_White', { height: 1.9, anim: 'Eating' }); horse.place(...L(15, 4), -1.6);
    this.poi.kings = V(P.x + 10, y, P.z + 8);
    // la caravana del séquito por el camino del desierto
    const route = ROADS.kings.slice(0, -14);
    const back = smoothPath([[route[route.length - 1][0] + 10, route[route.length - 1][1] + 25], [170, 185], [230, 255], [route[0][0] + 8, route[0][1] + 4]], 3);
    const loop = [...route, ...back];
    const walker = new PathWalker(loop, { loop: true });
    const blankets = [0xb03a2a, 0x2a5a8a, 0xd8a838, 0x3a7a4a, 0x8a3a7a];
    for (let i = 0; i < 9; i++) {
      const off = 0.5 + i * 0.012 * (i % 3 === 0 ? 1 : 1);
      if (i % 3 === 0) {
        const p = cast.person({ female: false, robe: rng.pick([0xd8c8a8, 0x8a6a4a]), scarf: 0xf0e8d0, staff: true, pose: ['staffR'], anim: 'Walk' });
        p.walk(walker, { speed: 1.0, offset: off, loop: true });
      } else {
        const cm = cast.camel({ blanket: rng.pick(blankets), fringe: 0xe8c050, bags: rng.pick([0x8a5a30, 0x6a4a2a, 0xa07040]), anim: 'Walk', animSpeed: 0.75 });
        cm.walk(walker, { speed: 1.0, offset: off, loop: true, animSpeed: 0.75 });
      }
    }
    // un rey cabalgando en camello (paje real)
    const rider = cast.person({ type: 'M_King', female: false, pose: ['ride'], noRobe: true, cloak: true, cloakColor: 0x2a4a8a, scarf: null, skin: 0xc89070, kingPalette: { Blue: 0x2a4a8a, Metal: 0xd8b040, Beige: 0x2a4a8a, Metal_Dark: 0x1a2a5a } });
    const rc = cast.camel({ blanket: 0x2a4a8a, fringe: 0xe8c050, anim: 'Walk', animSpeed: 0.75 });
    cast.mount(rider, rc);
    rc.walk(walker, { speed: 1.0, offset: 0.5 + 9 * 0.012, loop: true, animSpeed: 0.75 });
    this.caravanWalker = walker; this.caravanLead = rc;
  }

  // ---------------------------------------------------------------- río
  buildRiverScene() {
    const { B, cast, rng, scene } = this;
    // puente de piedra
    const bz = -74, bx = riverX(bz);
    stoneBridge(B, { x: bx, z: bz, y0: waterLevel(bz) + 0.4, len: 22, width: 3.8, ry: 0.05 });
    // molino de agua
    const M = LOC.mill; const my = heightAt(M.x, M.z);
    const mill = waterMill(B, scene, { x: M.x, z: M.z, y: my, ry: 0, riverSide: -1 });
    this.spin.push({ obj: mill.wheel, axis: 'z', speed: -0.6 });
    const miller = cast.person({ female: false, robe: 0xe8e0d0, scarf: 0xf0ece0, anim: 'Interact' }); miller.place(M.x + 1.6, M.z + 3.2, Math.PI);
    for (let i = 0; i < 4; i++) this.prop('v_Bags', M.x + 2.5 + (i % 2) * 0.6, M.z + 2.9 + Math.floor(i / 2) * 0.5, { h: 0.45, ry: rng.range(0, 6) });
    const mdon = cast.animal('Donkey', { height: 1.4, anim: 'Idle' }); mdon.place(M.x + 4, M.z + 1, -0.4);
    this.poi.mill = V(M.x, my, M.z);
    // lavanderas en la orilla
    const Lz = LOC.laundry.z;
    for (let i = 0; i < 4; i++) {
      const z = Lz - 3 + i * 2.3, x = riverX(z) + 6.1;
      const w = cast.person({ female: true, pose: ['wash'], anim: 'Idle_Neutral', robe: rng.pick([0x9a4a3a, 0x5b6a8a, 0xa0784a, 0x7a5a7a]) });
      w.place(x, z, -Math.PI / 2 + rng.range(-0.2, 0.2));
      // movimiento de frotar
      const ua = w.bones.UpperArmL, ub = w.bones.UpperArmR; const qa = ua.quaternion.clone(), qb = ub.quaternion.clone(); let tt = rng.next() * 5;
      w.extra.push((dt) => { tt += dt; const k = Math.sin(tt * 3.5) * 0.25; for (const o of w.overrides) { if (o[0] === ua) o[1].copy(qa.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), k))); if (o[0] === ub) o[1].copy(qb.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -k))); } });
      this.prop('v_Bags', x + 0.9, z + 0.6, { h: 0.4 });
    }
    // tendederos con ropa
    const cl = [0xf4f0e8, 0xb03a2a, 0x2a6a9a, 0xd8a838, 0xf4f0e8, 0x3a7a4a, 0xe0d0b0];
    for (let k = 0; k < 2; k++) {
      const z0 = Lz - 4 + k * 7, x0 = riverX(z0) + 12;
      const y0 = heightAt(x0, z0);
      B.cyl(0.05, 0.06, 2.2, 0x6a4a2c, { x: x0, y: y0 + 1.1, z: z0 }, 5); B.cyl(0.05, 0.06, 2.2, 0x6a4a2c, { x: x0 + 0.5, y: heightAt(x0 + 0.5, z0 + 5) + 1.1, z: z0 + 5 }, 5);
      for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5; const yy = lerp(y0, heightAt(x0 + 0.5, z0 + 5), t) + 1.6; B.box(0.04, 0.75, 0.7, rng.pick(cl), { x: x0 + t * 0.5, y: yy, z: z0 + t * 5 }); }
    }
    this.poi.laundry = V(riverX(Lz) + 6, heightAt(riverX(Lz) + 6, Lz), Lz);
    // barca de pescador
    const boat = new THREE.Mesh(this.lib.props.geometry('b_BoatWSail', { height: 4.2 }), SHARED.standard); boat.castShadow = true; scene.add(boat);
    const fisher = cast.person({ female: false, pose: ['sit'], anim: 'Idle_Neutral', robe: 0x5a6a7a, scarf: 0xe8e0d0 });
    scene.remove(fisher.group); boat.add(fisher.group); fisher.group.position.set(0, 0.35 / 1, -0.6); fisher.group.scale.setScalar(fisher.scale / (4.2 / this.lib.props.size('b_BoatWSail').y));
    let bt = 0;
    UPDATERS.push((dt) => {
      bt += dt * 0.012; const u = Math.sin(bt * Math.PI * 2) * 0.5 + 0.5; const z = lerp(60, 150, u); const x = riverX(z) + 1.5;
      const z2 = z + 0.5 * Math.sign(Math.cos(bt * Math.PI * 2)); boat.position.set(x, waterLevel(z) - 0.15 + Math.sin(bt * 300) * 0.04, z);
      boat.lookAt(riverX(z2) + 1.5, boat.position.y, z2); boat.rotation.z += Math.sin(bt * 200) * 0.02;
    });
    // patos
    makeDucks(scene, (u, side) => { const z = lerp(-40, 40, u); return { x: riverX(z) + side * 0.6, y: waterLevel(z), z }; }, { count: 8 });
    // pequeño muelle
    this.prop('r_Dock_FirstAge', riverX(-50) + 6.5, -50, { h: 1.6, ry: Math.PI / 2, y: waterLevel(-50) - 0.6 });
  }

  // ---------------------------------------------------------------- campos
  buildFarm() {
    const { B, W, cast, rng } = this; const F0 = LOC.farm;
    const info = hebrewHouse(B, W, { x: F0.x, z: F0.z, ry: -0.6, w: 8, d: 6, floors: 2, color: 0xe2cfa8, rng, lit: 0.7, stairs: true, awning: true });
    this.poi.farm = V(F0.x, info.base, F0.z);
    // campos de trigo
    for (let row = 0; row < 7; row++) for (let col = 0; col < 3; col++) {
      const x = F0.x + 14 + col * 13, z = F0.z - 22 + row * 5.5;
      this.prop('r_Farm_FirstAge_Level1_Wheat', x, z, { h: 1.1, ry: 0.05 });
    }
    // huerta
    for (let row = 0; row < 5; row++) for (let i = 0; i < 9; i++) {
      const n = ['c_Lettuce_Crop', 'c_Carrot_Crop', 'c_Pumpkin_Crop', 'c_Lettuce_Crop', 'c_Carrot_Crop'][row];
      const h = { c_Lettuce_Crop: 0.35, c_Carrot_Crop: 0.5, c_Pumpkin_Crop: 0.45 }[n];
      this.prop(n, F0.x - 10 + i * 1.1, F0.z + 9 + row * 1.3, { h, ry: rng.range(0, 6) });
    }
    // naranjos
    for (let i = 0; i < 14; i++) this.prop('c_Orange_4', F0.x - 16 + (i % 7) * 4.5, F0.z - 6 - Math.floor(i / 7) * 5, { h: rng.range(3.3, 4.2), ry: rng.range(0, 6) });
    // labrador con el buey arando
    const field = [[F0.x + 12, F0.z + 22], [F0.x + 40, F0.z + 22]];
    const ox = cast.animal('Bull', { height: 1.55, anim: 'Walk', palette: { Main: 0x8a5a30, Main_Light: 0xc89a6a } });
    ox.walk(field, { speed: 0.8, loop: false, anim: 'Walk', animSpeed: 0.7 });
    const farmer = cast.person({ female: false, staff: true, pose: ['staffR'], anim: 'Walk' });
    farmer.walk(field.map(([x, z]) => [x, z + 0.1]), { speed: 0.8, loop: false, offset: 0 });
    // desfase: el labrador camina detrás del buey
    farmer.s = -2.6; ox.s = 0;
    this.prop('v_Cart', F0.x + 6, F0.z + 3, { h: 2.0, ry: 1.0 });
    for (let i = 0; i < 6; i++) this.prop('v_Hay', F0.x + 7 + rng.range(-2, 2), F0.z + 6 + rng.range(-2, 2), { h: 1.1 });
    const cow = cast.animal('Cow', { height: 1.5, anim: 'Eating' }); cow.place(F0.x - 4, F0.z - 14, 0.4);
    const woman = cast.person({ female: true, anim: 'Interact' }); woman.place(F0.x - 6, F0.z + 10, 0.3);
    // olivar
    for (let i = 0; i < 40; i++) {
      const x = F0.x - 40 + (i % 8) * 8 + rng.range(-1.5, 1.5), z = F0.z - 52 + Math.floor(i / 8) * 8 + rng.range(-1.5, 1.5);
      this.prop(rng.pick(['n_CommonTree_1', 'n_CommonTree_2', 'n_CommonTree_5']), x, z, { h: rng.range(4, 5.5), ry: rng.range(0, 6), palette: { Green: 0x7d8f5a, DarkGreen: 0x5f7448, Leaves: 0x7d8f5a } });
    }
    const pick = cast.person({ female: true, anim: 'Interact' }); pick.place(F0.x - 30, F0.z - 40, 1.2);
  }

  // ---------------------------------------------------------------- Herodes
  buildPalace() {
    const { cast, rng, scene } = this; const H = LOC.palace; const y = heightAt(H.x, H.z);
    this.prop('r_Wonder_SecondAge_Level3', H.x, H.z, { h: 30, ry: 0.6, palette: { Stone: 0xd9c49a, Stone_Light: 0xeee0c0, Main: 0xb8862e, Wood: 0x8a5a30 }, yOff: -0.6 });
    this.poi.palace = V(H.x, y, H.z);
    // Herodes y su guardia en la escalinata
    const herod = cast.person({ type: 'M_King', female: false, robe: 0x5a1a4a, cloak: true, cloakColor: 0x7a1a2a, scarf: null, kingPalette: { Blue: 0x5a1a4a, Metal: 0xd8b040, Beige: 0x7a1a2a }, anim: 'Wave' });
    const front = V(Math.sin(0.6), 0, Math.cos(0.6));
    const hp = V(H.x, 0, H.z).addScaledVector(front, 26);
    herod.place(hp.x, hp.z, 0.6);
    for (const s of [-1, 1]) {
      const side = V(front.z, 0, -front.x).multiplyScalar(s * 2.2);
      this.soldier(hp.x + side.x + front.x * 0.8, hp.z + side.z + front.z * 0.8, 0.6);
    }
    // patrulla de soldados por el camino oeste
    const road = ROADS.westRoad;
    for (let i = 0; i < 3; i++) this.soldier(0, 0, 0, { path: road, offset: 0.3 + i * 0.012, loop: false });
    // antorchas
    for (const s of [-1, 1]) {
      const side = V(front.z, 0, -front.x).multiplyScalar(s * 6);
      const tp = hp.clone().add(side); const ty = heightAt(tp.x, tp.z);
      this.prop('s_WoodenTorch_Fire', tp.x, tp.z, { h: 2.2 });
      makeFire(scene, V(tp.x, ty + 2.1, tp.z), { size: 0.35, light: s > 0, intensity: 8, distance: 14 });
    }
  }

  // ---------------------------------------------------------------- desierto
  buildDesert() {
    const { cast, rng, scene, B } = this; const O = LOC.oasis; const y = heightAt(O.x, O.z);
    scene.add(buildPond(O.x, O.z, 7, y + 0.06));
    for (let i = 0; i < 16; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(8, 15);
      this.prop(rng.pick(['n_PalmTree_1', 'n_PalmTree_2', 'n_PalmTree_3', 'n_PalmTree_4']), O.x + Math.cos(a) * r, O.z + Math.sin(a) * r, { h: rng.range(7, 12), ry: rng.range(0, 6) });
    }
    // tiendas de beduinos
    for (const [dx, dz, ry, col] of [[16, -6, 0.4, 0x5a3a2a], [20, 4, -0.6, 0x6a4a30], [12, 12, 1.2, 0x4a3020]]) {
      const x = O.x + dx, z = O.z + dz, yy = heightAt(x, z);
      const F = frame(x, yy, z, ry);
      B.add(new THREE.CylinderGeometry(0.2, 3.6, 2.6, 4, 1, true), col, { y: 1.3, ry: Math.PI / 4, parent: F });
      B.add(new THREE.ConeGeometry(0.4, 0.6, 4), 0x2a1a10, { y: 2.8, ry: Math.PI / 4, parent: F });
      B.box(1.2, 1.6, 0.1, 0x1a1008, { y: 0.8, z: 2.4, parent: F });
    }
    for (let i = 0; i < 3; i++) { const c = cast.camel({ blanket: false, anim: rng.pick(['Eating', 'Idle']) }); c.place(O.x - 10 + i * 4, O.z + 12 + rng.range(-2, 2), rng.range(0, 6)); }
    const b1 = cast.person({ female: false, robe: 0xe8e0d0, scarf: 0xf4f0e6, anim: 'Idle' }); b1.place(O.x + 14, O.z - 2, -1.6);
    const b2 = cast.person({ female: true, robe: 0x2a2a3a, scarf: 0x1a1a2a, anim: 'Interact' }); b2.place(O.x - 5, O.z - 7, 0.4);
    this.poi.oasis = V(O.x, y, O.z);
  }

  // ---------------------------------------------------------------- vegetación
  buildNature() {
    const { rng } = this; const T = LOC.town; const P = LOC.portal;
    const blocked = (x, z, margin = 0) => {
      if (Math.hypot(x - T.x, z - T.z) < T.r + 6 + margin) return true;
      if (Math.abs(x - riverX(z)) < 8.5) return true;
      if (Math.hypot(x - P.x, z - P.z) < 18) return true;
      if (Math.hypot(x - LOC.shepherds.x, z - LOC.shepherds.z) < 9) return true;
      if (Math.hypot(x - LOC.farm.x, z - LOC.farm.z) < 12) return true;
      if (Math.hypot(x - LOC.oasis.x, z - LOC.oasis.z) < 18) return true;
      if (Math.hypot(x - LOC.palace.x, z - LOC.palace.z) < 34) return true;
      if (Math.hypot(x - LOC.mill.x, z - LOC.mill.z) < 10) return true;
      if (roadDistance(x, z) < 4 + margin) return true;
      return false;
    };
    const desertW = (x, z) => 1 - THREE.MathUtils.smoothstep(Math.hypot(x - LOC.desert.x, z - LOC.desert.z), 90, 170);
    const scatter = (count, R, fn) => {
      let n = 0, tries = 0;
      while (n < count && tries < count * 8) {
        tries++;
        const x = rng.range(-R, R), z = rng.range(-R, R);
        const r = Math.hypot(x, z + 20); if (r > 300) continue;
        const h = heightAt(x, z); if (h > 60) continue;
        if (fn(x, z, h)) n++;
      }
    };
    // olivos dispersos por las laderas
    scatter(170, 280, (x, z) => { if (blocked(x, z, 2) || desertW(x, z) > 0.3) return false; this.prop(rng.pick(['n_CommonTree_1', 'n_CommonTree_2', 'n_CommonTree_4', 'n_CommonTree_5']), x, z, { h: rng.range(3.8, 6), ry: rng.range(0, 6), palette: { Green: 0x7d8f5a, DarkGreen: 0x5f7448 } }); return true; });
    // palmeras
    scatter(70, 260, (x, z) => { if (blocked(x, z, 1)) return false; this.prop(rng.pick(['n_PalmTree_1', 'n_PalmTree_2', 'n_PalmTree_3', 'n_PalmTree_4']), x, z, { h: rng.range(7, 11), ry: rng.range(0, 6) }); return true; });
    // palmeras alrededor del Portal y junto a la ciudad
    for (let i = 0; i < 10; i++) { const a = rng.range(-0.6, 3.6), r = rng.range(19, 28); const x = P.x + Math.cos(a) * r, z = P.z - Math.sin(a) * r * 0.8; if (roadDistance(x, z) < 4) continue; this.prop(rng.pick(['n_PalmTree_1', 'n_PalmTree_3']), x, z, { h: rng.range(8, 11), ry: rng.range(0, 6) }); }
    // arbustos, rocas, hierba y flores
    scatter(Math.round(320 * this.Q), 270, (x, z) => { if (blocked(x, z)) return false; this.prop(rng.pick(['n_Bush_1', 'n_Bush_2', 'n_BushBerries_1']), x, z, { h: rng.range(0.8, 1.6), ry: rng.range(0, 6) }); return true; });
    scatter(260, 290, (x, z) => { if (blocked(x, z)) return false; const k = rng.range(0.6, 2.8); this.prop(rng.pick(['n_Rock_1', 'n_Rock_2', 'n_Rock_3', 'n_Rock_4', 'n_Rock_5', 'n_Rock_6', 'n_Rock_7']), x, z, { h: k, ry: rng.range(0, 6), yOff: -k * 0.15, palette: { Rock: 0x9a8c78 } }); return true; });
    scatter(Math.round(2600 * this.Q), 250, (x, z) => { if (blocked(x, z) || desertW(x, z) > 0.2) return false; this.prop(rng.pick(['n_Grass', 'n_Grass_2', 'n_Grass_Short', 'n_Grass_Short']), x, z, { h: rng.range(0.35, 0.8), ry: rng.range(0, 6), cast: false }); return true; });
    scatter(Math.round(380 * this.Q), 240, (x, z) => { if (blocked(x, z) || desertW(x, z) > 0.2) return false; this.prop(rng.pick(['n_Flowers', 'n_Plant_1', 'n_Plant_3', 'n_Plant_5']), x, z, { h: rng.range(0.4, 1.0), ry: rng.range(0, 6), cast: false }); return true; });
    // sauces junto al río
    for (let z = -200; z < 200; z += rng.range(9, 18)) for (const side of [-1, 1]) {
      if (rng.chance(0.35)) continue;
      const x = riverX(z) + side * rng.range(9.5, 14);
      if (Math.abs(z - LOC.mill.z) < 12 || Math.abs(z + 74) < 14 || Math.abs(z - LOC.laundry.z) < 10) continue;
      this.prop(rng.pick(['n_Willow_1', 'n_Willow_2', 'n_Willow_3']), x, z, { h: rng.range(6, 8.5), ry: rng.range(0, 6) });
    }
    for (let i = 0; i < 26; i++) { const z = rng.range(-150, 150); this.prop('n_Lilypad', riverX(z) + rng.range(-4, 4), z, { h: 0.12, y: waterLevel(z) + 0.02, s: rng.range(0.6, 1.1), ry: rng.range(0, 6), cast: false }); }
    // bosque del suroeste con ciervos
    const Fo = LOC.forest;
    for (let i = 0; i < 90; i++) {
      const a = rng.range(0, Math.PI * 2), r = Math.sqrt(rng.next()) * 60; const x = Fo.x + Math.cos(a) * r, z = Fo.z + Math.sin(a) * r;
      if (blocked(x, z)) continue;
      this.prop(rng.pick(['n_CommonTree_1', 'n_CommonTree_2', 'n_CommonTree_3', 'n_CommonTree_4', 'n_CommonTree_5']), x, z, { h: rng.range(5, 8), ry: rng.range(0, 6) });
    }
    const deer = this.cast.animal('Deer', { height: 1.6, anim: 'Eating' }); deer.place(Fo.x + 10, Fo.z - 22, 1.0);
    const stag = this.cast.animal('Stag', { height: 2.1, anim: 'Idle' }); stag.place(Fo.x + 16, Fo.z - 18, -0.6);
    const deer2 = this.cast.animal('Deer', { height: 1.5, anim: 'Walk' }); deer2.walk(circlePath(Fo.x - 5, Fo.z - 5, 14, 30), { speed: 0.9, anim: 'Walk' });
    // montañas en el horizonte
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + rng.range(-0.08, 0.08);
      const r = rng.range(300, 345);
      const x = Math.cos(a) * r, z = Math.sin(a) * r - 20;
      const desert = desertW(x * 0.8, z * 0.8) > 0.05 || (x > 150 && z > 100);
      this.prop(rng.pick(['r_Mountain_Group_1', 'r_Mountain_Group_2', 'r_MountainLarge_Single']), x, z, { h: rng.range(60, 95), ry: rng.range(0, 6), yOff: -6, palette: desert ? { Stone: 0xc8a878, Snow: 0xe8d8b8, Dirt: 0xb08a5a } : { Stone: 0x8e8478, Snow: 0xf4f2ee, Dirt: 0x7a6a50 }, cast: false });
    }
  }

  finish() {
    const { scene } = this;
    // sombreado de contacto en el suelo: casas, muralla y Portal
    const shapes = (this.houses || []).map((h) => {
      const c = Math.cos(h.ry), sn = Math.sin(h.ry), hw = h.w / 2, hd = h.d / 2;
      return { x: h.x, z: h.z, radius: Math.max(hw, hd) + 0.5, reach: 2.2, strength: 0.42, dist: (x, z) => { const dx = x - h.x, dz = z - h.z; const lx = dx * c - dz * sn, lz = dx * sn + dz * c; const qx = Math.abs(lx) - hw, qz = Math.abs(lz) - hd; return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0); } };
    });
    const T = LOC.town;
    shapes.push({ x: T.x, z: T.z, radius: T.r + 3, reach: 3.2, strength: 0.38, dist: (x, z) => Math.abs(Math.hypot(x - T.x, z - T.z) - T.r) - 1.2 });
    const P = LOC.portal;
    shapes.push({ x: P.x, z: P.z - 3, radius: 12, reach: 6, strength: 0.3, dist: (x, z) => Math.hypot((x - P.x) * 0.8, z - (P.z - 5)) - 6 });
    shadeGround(this.terrain, shapes);
    const houses = this.B.build(this.buildingMat, { name: 'buildings' }); if (houses) scene.add(houses);
    const wins = this.W.build(this.windowMat, { name: 'windows', castShadow: false }); if (wins) scene.add(wins);
    const glows = this.G.build(this.glowMat, { name: 'glows', castShadow: false }); if (glows) scene.add(glows);
    this.instanced = this.inst.build();
    for (const f of this.flocks) f.build();
    this.cloudSys = makeClouds(scene);
    this.lanternGlows = (this.lanternPosts || []).map((p) => makeGlowSprite(scene, p, { size: 2.6, color: 0xffb060, opacity: 0.6 }));
    this.fireflies = makeFireflies(scene);
    // luz cálida del farol de la posada
    if (this.townLanterns) for (const p of this.townLanterns) { const l = new THREE.PointLight(0xffb060, 8, 14, 1.6); l.position.copy(p); scene.add(l); NIGHT_LIGHTS.push({ light: l, base: 8 }); }
  }

  setNight(n) {
    this.windowMat.emissiveIntensity = 0.1 + n * 1.5;
    this.glowMat.emissiveIntensity = 1.2 + n * 2.2;
    for (const L of NIGHT_LIGHTS) L.light.userData.base = L.base * (0.15 + 0.85 * n);
    if (this.cloudSys) { this.cloudSys.mat.color.setRGB(1 - n * 0.82, 1 - n * 0.8, 1 - n * 0.7); this.cloudSys.mat.opacity = 0.9 - n * 0.45; }
    for (const g of this.lanternGlows || []) g.material.opacity = 0.1 + n * 0.55;
    if (this.fireflies) this.fireflies.material.opacity = n * 0.9;
  }

  update(dt, t, camera) {
    for (const a of ACTORS) a.update(dt, camera.position);
    for (const f of this.flocks) f.update(dt, t);
    for (const u of UPDATERS) u(dt, t);
    for (const s of this.spin) s.obj.rotation[s.axis] += s.speed * dt;
    for (const L of NIGHT_LIGHTS) L.light.intensity = (L.light.userData.base ?? L.base) * (L.light.userData.flicker ?? 1);
    if (this.river) this.river.userData.update(t);
  }
}

// Rebaño de ovejas instanciado con un pastoreo sencillo
class Flock {
  constructor(world, { cx, cz, r, count, static: isStatic = false }) {
    this.world = world; this.cx = cx; this.cz = cz; this.r = r; this.isStatic = isStatic;
    const rng = world.rng;
    this.sheep = [];
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2), d = Math.sqrt(rng.next()) * r;
      this.sheep.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, h: rng.range(0, Math.PI * 2), state: rng.chance(0.3) ? 1 : 0, t: rng.range(0, 6), sp: rng.range(0.25, 0.5), s: rng.range(0.85, 1.1), ph: rng.range(0, 6), black: rng.chance(0.08) });
    }
  }
  build() {
    const geo = this.world.lib.props.geometry('f_Sheep', { height: 0.95 });
    this.mesh = new THREE.InstancedMesh(geo, SHARED.standard, this.sheep.length);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    this.sheep.forEach((s, i) => this.mesh.setColorAt(i, s.black ? new THREE.Color(0.35, 0.3, 0.28) : new THREE.Color(1, 1, 1)));
    this.world.scene.add(this.mesh);
    this.update(0, 0);
    this.mesh.computeBoundingSphere();
    this.mesh.boundingSphere.radius += this.r + 4;
  }
  update(dt, t) {
    if (!this.mesh) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
    for (let i = 0; i < this.sheep.length; i++) {
      const s = this.sheep[i];
      if (!this.isStatic) {
        s.t -= dt;
        if (s.t < 0) { s.state = s.state ? 0 : 1; s.t = s.state ? 2 + Math.random() * 4 : 4 + Math.random() * 8; if (s.state) s.h += (Math.random() - 0.5) * 2; }
        if (s.state) {
          s.x += Math.sin(s.h) * s.sp * dt; s.z += Math.cos(s.h) * s.sp * dt;
          const dx = s.x - this.cx, dz = s.z - this.cz;
          if (dx * dx + dz * dz > this.r * this.r) { const back = Math.atan2(-dx, -dz); let d = back - s.h; d = Math.atan2(Math.sin(d), Math.cos(d)); s.h += d * Math.min(1, dt * 2); }
        }
      }
      const walk = s.state && !this.isStatic;
      const bob = walk ? Math.abs(Math.sin(t * 7 + s.ph)) * 0.05 : 0;
      const graze = !walk ? Math.sin(t * 0.8 + s.ph) * 0.04 + 0.08 : 0;
      e.set(graze, s.h, walk ? Math.sin(t * 7 + s.ph) * 0.04 : 0, 'YXZ'); q.setFromEuler(e);
      p.set(s.x, heightAt(s.x, s.z) + bob, s.z); sc.setScalar(s.s);
      m.compose(p, q, sc); this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
