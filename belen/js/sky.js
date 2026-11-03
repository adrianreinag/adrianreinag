// Cielo, estrellas, luna, la Estrella de Belén y el ciclo día/noche.
import * as THREE from 'three';
import { lerp, clamp, smoothstep } from './util.js';

const skyVert = /* glsl */`
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // siempre al fondo
}`;
const skyFrag = /* glsl */`
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uGlow;
uniform vec3 uSunDir; uniform vec3 uMoonDir; uniform float uStars; uniform float uTime; uniform float uSunVis;
varying vec3 vDir;
float hash(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
vec3 starField(vec3 d){
  vec3 col = vec3(0.0);
  for(int l=0;l<3;l++){
    float sc = 90.0 + float(l)*85.0;
    vec3 p = d*sc; vec3 id = floor(p); vec3 f = fract(p)-0.5;
    float h = hash(id + float(l)*17.0);
    if(h > 0.965){
      vec3 off = vec3(hash(id+1.3), hash(id+2.7), hash(id+5.1)) - 0.5;
      float dd = length(f - off*0.7);
      float tw = 0.6 + 0.4*sin(uTime*(1.5+h*3.0) + h*40.0);
      float b = smoothstep(0.09, 0.0, dd) * tw * (h-0.965)*28.0;
      vec3 tint = mix(vec3(1.0,0.85,0.7), vec3(0.75,0.85,1.0), hash(id+9.0));
      col += tint*b;
    }
  }
  return col;
}
void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 col = y > 0.0 ? mix(uHorizon, uTop, pow(clamp(y,0.0,1.0), 0.55)) : mix(uHorizon, uBottom, clamp(-y*4.0,0.0,1.0));
  // resplandor del sol
  float s = max(dot(d, uSunDir), 0.0);
  col += uGlow * (pow(s, 6.0)*0.55 + pow(s, 60.0)*0.8) * uSunVis;
  col += vec3(1.0,0.95,0.85) * smoothstep(0.9993, 0.9997, s) * uSunVis * 2.0;
  // vía láctea tenue
  float band = exp(-pow(dot(d, normalize(vec3(0.35,0.55,-0.75)))*3.2, 2.0));
  float mw = band * (0.5 + 0.5*sin(d.x*14.0+d.z*9.0)*sin(d.y*11.0));
  col += vec3(0.32,0.34,0.48) * mw * 0.22 * uStars * smoothstep(-0.05, 0.25, y);
  // estrellas
  col += starField(d) * uStars * smoothstep(-0.02, 0.18, y);
  // luna
  float m = dot(d, uMoonDir);
  col += vec3(0.95,0.93,0.85) * smoothstep(0.99955, 0.9997, m) * uStars * 1.6;
  col += vec3(0.5,0.55,0.7) * pow(max(m,0.0), 120.0) * 0.25 * uStars;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function makeGlowTexture(rays = true) {
  const S = 256; const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.08, 'rgba(255,248,220,0.95)');
  grd.addColorStop(0.25, 'rgba(255,215,140,0.35)');
  grd.addColorStop(0.6, 'rgba(255,190,110,0.08)');
  grd.addColorStop(1, 'rgba(255,180,100,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  if (rays) {
    g.translate(S / 2, S / 2);
    for (let k = 0; k < 8; k++) {
      const long = k % 2 === 0 ? S * 0.5 : S * 0.3;
      g.rotate(Math.PI / 4);
      const lg = g.createLinearGradient(0, 0, 0, -long);
      lg.addColorStop(0, 'rgba(255,250,230,0.95)'); lg.addColorStop(1, 'rgba(255,230,170,0)');
      g.fillStyle = lg;
      g.beginPath(); g.moveTo(-4, 0); g.lineTo(0, -long); g.lineTo(4, 0); g.closePath(); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeTailTexture() {
  const W = 64, H = 512; const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  for (let y = 0; y < H; y++) {
    const t = y / H; const a = Math.pow(1 - t, 1.6) * 0.9;
    const w = (0.15 + t * 0.85) * W * 0.5;
    const lg = g.createLinearGradient(W / 2 - w, 0, W / 2 + w, 0);
    lg.addColorStop(0, 'rgba(255,220,150,0)'); lg.addColorStop(0.5, `rgba(255,240,200,${a})`); lg.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = lg; g.fillRect(0, y, W, 1);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export const GLOW_TEX = () => (makeGlowTexture._c ||= makeGlowTexture(false));

// Paletas para el ciclo: 0 = mediodía, 0.5 = atardecer, 0.75 = anochecer, 1 = noche cerrada
const KEYS = [
  { t: 0.0, top: 0x3f86d8, hor: 0xbfdcf2, bot: 0x8aa0a8, glow: 0xfff2d0, sun: 0xfff3dc, sunI: 3.0, hemiS: 0xcfe6ff, hemiG: 0x8a7a55, hemiI: 1.25, fog: 0xc6dcea, stars: 0, exp: 1.0, elev: 62 },
  { t: 0.45, top: 0x4d78b8, hor: 0xf5c28a, bot: 0x9a8a70, glow: 0xffb066, sun: 0xffc48a, sunI: 2.4, hemiS: 0xc9d4f0, hemiG: 0x8a6a45, hemiI: 1.0, fog: 0xe8c49a, stars: 0, exp: 1.0, elev: 14 },
  { t: 0.62, top: 0x2b3a78, hor: 0xe07a4e, bot: 0x5a4a50, glow: 0xff7a3a, sun: 0xff9a60, sunI: 1.5, hemiS: 0x8a8ec8, hemiG: 0x5a4038, hemiI: 1.0, fog: 0xa87a78, stars: 0.25, exp: 1.05, elev: 2 },
  { t: 0.78, top: 0x101a4a, hor: 0x54468a, bot: 0x2a2438, glow: 0xb05a70, sun: 0xa8b4f0, sunI: 1.15, hemiS: 0x6a78c8, hemiG: 0x40384c, hemiI: 1.15, fog: 0x3c3e70, stars: 0.75, exp: 1.25, elev: -8 },
  { t: 1.0, top: 0x060c2a, hor: 0x24305e, bot: 0x0d1020, glow: 0x223060, sun: 0xa8bcff, sunI: 1.05, hemiS: 0x5466b0, hemiG: 0x2e2c40, hemiI: 1.05, fog: 0x1c2446, stars: 1.0, exp: 1.35, elev: -25 },
];
function sampleKeys(t) {
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) if (t >= KEYS[i].t && t <= KEYS[i + 1].t) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const u = (t - a.t) / ((b.t - a.t) || 1);
  const c = (k) => new THREE.Color(a[k]).lerp(new THREE.Color(b[k]), u);
  const n = (k) => lerp(a[k], b[k], u);
  return { top: c('top'), hor: c('hor'), bot: c('bot'), glow: c('glow'), sun: c('sun'), sunI: n('sunI'), hemiS: c('hemiS'), hemiG: c('hemiG'), hemiI: n('hemiI'), fog: c('fog'), stars: n('stars'), exp: n('exp'), elev: n('elev') };
}

export class Sky {
  constructor(scene, { starPos }) {
    this.scene = scene;
    this.uniforms = {
      uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uMoonDir: { value: new THREE.Vector3(-0.4, 0.5, -0.7).normalize() },
      uStars: { value: 0 }, uTime: { value: 0 }, uSunVis: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: skyVert, fragmentShader: skyFrag, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), mat);
    this.dome.frustumCulled = false; this.dome.renderOrder = -10;
    scene.add(this.dome);

    // luces
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6;
    const sc = this.sun.shadow.camera; sc.near = 10; sc.far = 900; sc.left = -150; sc.right = 150; sc.top = 150; sc.bottom = -150;
    scene.add(this.sun); scene.add(this.sun.target);
    scene.fog = new THREE.FogExp2(0x000000, 0.0022);

    // Estrella de Belén
    this.starGroup = new THREE.Group();
    this.starGroup.position.copy(starPos);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(true), color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    glow.scale.set(34, 34, 1); this.starGroup.add(glow); this.starGlow = glow;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW_TEX(), color: 0xffd9a0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true, opacity: 0.6 }));
    halo.scale.set(90, 90, 1); this.starGroup.add(halo); this.starHalo = halo;
    // cola del cometa
    const tailMat = new THREE.MeshBasicMaterial({ map: makeTailTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide, fog: false });
    const tailGeo = new THREE.PlaneGeometry(14, 120); tailGeo.translate(0, -60, 0);
    this.tail = new THREE.Mesh(tailGeo, tailMat);
    this.tail.rotation.z = Math.PI * 0.62; this.tail.rotation.y = 0.3;
    this.starGroup.add(this.tail);
    const tail2 = this.tail.clone(); tail2.rotation.y = 0.3 + Math.PI / 2; this.starGroup.add(tail2); this.tail2 = tail2;
    // núcleo brillante (bloom)
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.2, 3.6), fog: false }));
    this.starGroup.add(core); this.starCore = core;
    scene.add(this.starGroup);

    // haz de luz hacia el Portal
    const beamH = starPos.y - 2;
    const beamGeo = new THREE.CylinderGeometry(0.4, 5.5, beamH, 32, 1, true); beamGeo.translate(0, -beamH / 2, 0);
    const beamMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uI: { value: 0.5 }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.0); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uI; uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(abs(dot(vN, vV)), 1.5); float a = f * uI * (0.25 + 0.75*vUv.y) * (0.85+0.15*sin(vUv.x*40.0+uTime*0.7));
        a *= smoothstep(0.0, 0.08, vUv.y); gl_FragColor = vec4(vec3(1.0,0.86,0.55)*a, a); }`,
    });
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.position.copy(starPos); this.beam.renderOrder = 5;
    scene.add(this.beam);

    this.t = 0.8;
    this.envDirty = true;
  }

  // night: 0 (día) .. 1 (noche)
  setTime(t) {
    this.t = clamp(t, 0, 1);
    const k = sampleKeys(this.t);
    const u = this.uniforms;
    u.uTop.value.copy(k.top); u.uHorizon.value.copy(k.hor); u.uBottom.value.copy(k.bot); u.uGlow.value.copy(k.glow);
    u.uStars.value = k.stars;
    const elev = THREE.MathUtils.degToRad(k.elev), az = THREE.MathUtils.degToRad(-55 + this.t * 70);
    const sunDir = new THREE.Vector3(Math.cos(elev) * Math.sin(az), Math.sin(elev), Math.cos(elev) * Math.cos(az)).normalize();
    u.uSunDir.value.copy(sunDir);
    u.uSunVis.value = smoothstep(-0.12, 0.05, sunDir.y);
    this.sunDir = sunDir;
    this.night = smoothstep(0.55, 0.85, this.t);
    // luz principal: sol de día, luna de noche
    const moonDir = u.uMoonDir.value;
    const useMoon = sunDir.y < 0.02;
    this.lightDir = useMoon ? moonDir.clone() : sunDir.clone();
    if (!useMoon) this.lightDir.y = Math.max(this.lightDir.y, 0.12);
    this.sun.color.copy(k.sun); this.sun.intensity = k.sunI;
    this.hemi.color.copy(k.hemiS); this.hemi.groundColor.copy(k.hemiG); this.hemi.intensity = k.hemiI;
    this.scene.fog.color.copy(k.fog);
    this.scene.fog.density = lerp(0.0011, 0.0021, smoothstep(0.3, 1.0, this.t));
    this.exposure = k.exp;
    // estrella
    const sv = 0.35 + 0.65 * smoothstep(0.3, 0.8, this.t);
    this.starGlow.material.opacity = sv; this.starHalo.material.opacity = 0.65 * sv;
    this.tail.material.opacity = sv; this.beam.material.uniforms.uI.value = 0.03 + 0.16 * this.night;
    this.envDirty = true;
  }

  update(dt, time, focus) {
    this.uniforms.uTime.value = time;
    this.beam.material.uniforms.uTime.value = time;
    const s = 1 + Math.sin(time * 2.1) * 0.05 + Math.sin(time * 5.3) * 0.03;
    this.starGlow.scale.set(34 * s, 34 * s, 1);
    this.starGlow.material.rotation = Math.sin(time * 0.2) * 0.05;
    this.starCore.rotation.y = time * 0.5;
    // la cámara de sombras sigue al foco de la cámara
    const L = this.lightDir || new THREE.Vector3(0, 1, 0);
    this.sun.target.position.copy(focus);
    this.sun.position.copy(focus).addScaledVector(L, 400);
  }

  setShadowExtent(r) {
    const sc = this.sun.shadow.camera;
    if (Math.abs(sc.right - r) < 4) return;
    sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.updateProjectionMatrix();
  }
}
