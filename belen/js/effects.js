// Efectos: fuego, humo, luces parpadeantes, palomas, patos, nubes y estandarte del ángel.
import * as THREE from 'three';
import { GLOW_TEX } from './sky.js';
import { RNG } from './util.js';

export const UPDATERS = [];
export const NIGHT_LIGHTS = []; // {light, base}

export function makeFire(scene, pos, { size = 1, light = true, intensity = 18, distance = 22, color = 0xff8a3a } = {}) {
  const g = new THREE.Group(); g.position.copy(pos);
  const outer = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 1.5, 0.35), transparent: true, opacity: 0.92, depthWrite: false });
  const inner = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.2, 1.4), transparent: true, opacity: 0.95, depthWrite: false });
  const flames = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.16 * size, 0.7 * size, 5), i === 0 ? inner : outer);
    c.position.set((Math.random() - 0.5) * 0.18 * size, 0.33 * size, (Math.random() - 0.5) * 0.18 * size);
    if (i === 0) c.scale.set(0.6, 0.8, 0.6);
    g.add(c); flames.push({ m: c, ph: Math.random() * 10, base: c.scale.clone() });
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX(), color: 0xffa050, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
  glow.scale.set(3.2 * size, 3.2 * size, 1); glow.position.y = 0.4 * size; g.add(glow);
  let pl = null;
  if (light) {
    pl = new THREE.PointLight(color, intensity, distance, 1.6);
    pl.position.set(0, 0.9 * size, 0); g.add(pl);
    NIGHT_LIGHTS.push({ light: pl, base: intensity });
  }
  scene.add(g);
  UPDATERS.push((dt, t) => {
    for (const f of flames) {
      const k = 1 + Math.sin(t * 9 + f.ph) * 0.18 + Math.sin(t * 23 + f.ph * 2) * 0.1;
      f.m.scale.set(f.base.x * (1.05 - (k - 1) * 0.5), f.base.y * k, f.base.z * (1.05 - (k - 1) * 0.5));
      f.m.rotation.y = t * 0.7 + f.ph;
    }
    glow.material.opacity = 0.55 + Math.sin(t * 13) * 0.08;
    if (pl) pl.userData.flicker = 0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 27.3) * 0.05;
  });
  return g;
}

export function makeSmoke(scene, pos, { count = 8, size = 1 } = {}) {
  const mat = new THREE.SpriteMaterial({ map: GLOW_TEX(), color: 0x9a9088, transparent: true, opacity: 0.22, depthWrite: false });
  const parts = [];
  for (let i = 0; i < count; i++) {
    const s = new THREE.Sprite(mat.clone()); scene.add(s);
    parts.push({ s, t: i / count });
  }
  UPDATERS.push((dt) => {
    for (const p of parts) {
      p.t += dt * 0.12; if (p.t > 1) p.t -= 1;
      const k = p.t;
      p.s.position.set(pos.x + Math.sin(k * 5 + p.t) * 0.6 * k, pos.y + k * 9 * size, pos.z + k * 2.5);
      const sc = (1 + k * 5) * size; p.s.scale.set(sc, sc, 1);
      p.s.material.opacity = 0.28 * Math.sin(Math.PI * k);
    }
  });
}

export function makeGlowSprite(scene, pos, { size = 4, color = 0xffd090, opacity = 0.7 } = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.position.copy(pos); s.scale.set(size, size, 1); scene.add(s); return s;
}

// Palomas que vuelan en círculos
export function makeDoves(scene, center, { count = 9, radius = 14, height = 10, color = 0xf4f2ee } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
  const birds = [];
  for (let i = 0; i < count; i++) {
    const b = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 5), mat); body.rotation.x = Math.PI / 2; b.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), mat); head.position.z = 0.22; head.position.y = 0.03; b.add(head);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.1, 0.45, 0.02, -0.02, 0, 0, -0.12], 3)); wg.computeVertexNormals();
    const wl = new THREE.Mesh(wg, mat); const wr = new THREE.Mesh(wg, mat); wr.scale.x = -1;
    b.add(wl); b.add(wr);
    b.scale.setScalar(1.3);
    scene.add(b);
    birds.push({ b, wl, wr, a: (i / count) * Math.PI * 2, r: radius * (0.7 + Math.random() * 0.6), h: height + Math.random() * 5, sp: 0.25 + Math.random() * 0.15, ph: Math.random() * 6 });
  }
  UPDATERS.push((dt, t) => {
    for (const d of birds) {
      d.a += dt * d.sp;
      const x = center.x + Math.cos(d.a) * d.r, z = center.z + Math.sin(d.a) * d.r * 0.8;
      const y = center.y + d.h + Math.sin(t * 0.7 + d.ph) * 1.5;
      d.b.position.set(x, y, z);
      d.b.rotation.y = -d.a + Math.PI; // tangente
      const f = Math.sin(t * 11 + d.ph) * 0.7;
      d.wl.rotation.z = f; d.wr.rotation.z = -f;
    }
  });
}

// Patos que nadan río abajo y vuelven
export function makeDucks(scene, pathFn, { count = 7 } = {}) {
  const white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8, flatShading: true });
  const brown = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.8, flatShading: true });
  const green = new THREE.MeshStandardMaterial({ color: 0x2f6a3a, roughness: 0.6, flatShading: true });
  const beakM = new THREE.MeshStandardMaterial({ color: 0xe8a030, roughness: 0.7, flatShading: true });
  const ducks = [];
  for (let i = 0; i < count; i++) {
    const d = new THREE.Group();
    const male = i % 3 === 0;
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), male ? white : brown); body.scale.set(0.8, 0.6, 1.2); d.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), male ? green : brown); head.position.set(0, 0.2, 0.2); d.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), beakM); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.18, 0.33); d.add(beak);
    d.castShadow = true;
    scene.add(d);
    ducks.push({ d, s: Math.random(), sp: 0.004 + Math.random() * 0.004, side: (Math.random() - 0.5) * 5, ph: Math.random() * 6 });
  }
  UPDATERS.push((dt, t) => {
    for (const k of ducks) {
      k.s += dt * k.sp; const u = (Math.sin(k.s * Math.PI * 2) * 0.5 + 0.5);
      const p = pathFn(u, k.side + Math.sin(t * 0.3 + k.ph) * 0.8);
      const p2 = pathFn(u + 0.001 * Math.sign(Math.cos(k.s * Math.PI * 2)), k.side);
      k.d.position.set(p.x, p.y + 0.06 + Math.sin(t * 2 + k.ph) * 0.02, p.z);
      k.d.lookAt(p2.x, p.y + 0.06, p2.z);
    }
  });
}

// Nubes bajas de estilo "low poly"
export function makeClouds(scene, { count = 14, rng = new RNG(5) } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.92, fog: true, depthWrite: false });
  const clouds = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    const n = rng.int(3, 6);
    for (let k = 0; k < n; k++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rng.range(6, 12), 1), mat);
      m.position.set(k * rng.range(7, 10) - n * 4, rng.range(-2, 3), rng.range(-4, 4)); m.scale.y = 0.55; g.add(m);
    }
    g.position.set(rng.range(-420, 420), rng.range(95, 140), rng.range(-420, 420));
    scene.add(g); clouds.push(g);
  }
  UPDATERS.push((dt) => { for (const c of clouds) { c.position.x += dt * 2.2; if (c.position.x > 480) c.position.x = -480; } });
  return { clouds, mat };
}

// Estandarte con texto (Gloria in excelsis Deo)
export function makeBanner(text, { width = 4.6, height = 0.7 } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#f7f1e1'; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#c9a24a'; g.lineWidth = 10; g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.fillStyle = '#8a1f1a'; g.font = 'bold 82px "Cinzel", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const geo = new THREE.PlaneGeometry(width, height, 16, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, -Math.pow(x / (width / 2), 2) * 0.35); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
  m.userData.tex = tex;
  return m;
}

// Luciérnagas junto al río y en los prados (sólo de noche)
export function makeFireflies(scene, { count = 260 } = {}) {
  const pos = new Float32Array(count * 3); const base = [];
  for (let i = 0; i < count; i++) {
    const zone = Math.random();
    let x, z;
    if (zone < 0.5) { z = (Math.random() - 0.5) * 220; x = -86 + 9 * Math.sin(z / 48) + 4 * Math.sin(z / 19 + 1.3) + (Math.random() - 0.5) * 30; }
    else { x = 20 + Math.random() * 120; z = -10 + Math.random() * 80; }
    base.push([x, z, Math.random() * 10, 0.6 + Math.random() * 2.2]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: GLOW_TEX(), color: 0xd8ff8a, size: 0.9, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
  let hf = null;
  UPDATERS.push((dt, t) => {
    if (mat.opacity < 0.02) return;
    hf ||= scene.userData.heightAt;
    for (let i = 0; i < count; i++) {
      const [x, z, ph, h] = base[i];
      const xx = x + Math.sin(t * 0.3 + ph) * 2, zz = z + Math.cos(t * 0.27 + ph * 1.3) * 2;
      pos[i * 3] = xx; pos[i * 3 + 1] = (hf ? hf(xx, zz) : 0) + h + Math.sin(t * 1.3 + ph) * 0.3; pos[i * 3 + 2] = zz;
    }
    g.attributes.position.needsUpdate = true;
  });
  return pts;
}

// Chispas que suben de una hoguera
export function makeEmbers(scene, pos, { count = 36, height = 4, spread = 0.5 } = {}) {
  const arr = new Float32Array(count * 3); const st = [];
  for (let i = 0; i < count; i++) st.push({ t: Math.random(), sp: 0.25 + Math.random() * 0.4, ox: (Math.random() - 0.5) * spread, oz: (Math.random() - 0.5) * spread, ph: Math.random() * 6 });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ map: GLOW_TEX(), color: new THREE.Color(3, 1.3, 0.35), size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(g, mat); scene.add(pts);
  UPDATERS.push((dt, t) => {
    for (let i = 0; i < count; i++) {
      const e = st[i]; e.t += dt * e.sp; if (e.t > 1) { e.t -= 1; e.ox = (Math.random() - 0.5) * spread; e.oz = (Math.random() - 0.5) * spread; }
      arr[i * 3] = pos.x + e.ox + Math.sin(t * 2 + e.ph) * 0.3 * e.t; arr[i * 3 + 1] = pos.y + e.t * height; arr[i * 3 + 2] = pos.z + e.oz + Math.cos(t * 1.7 + e.ph) * 0.3 * e.t;
    }
    g.attributes.position.needsUpdate = true;
  });
  return pts;
}
