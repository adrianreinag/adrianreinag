// Belén Monumental: arranque, render cinematográfico, cámara, recorrido e interfaz.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { loadAll } from './assets.js';
import { World } from './world.js';
import { Sky } from './sky.js';
import { LOC, heightAt } from './terrain.js';
import { TOURS } from './tours.js';
import { MusicBox } from './music.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const isMobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;

// ------------------------------------------------------------ renderer
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.3, 2400);
camera.position.set(95, 55, 135);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.minDistance = 4; controls.maxDistance = 420;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(8, 6, -6);
controls.zoomSpeed = 0.9; controls.rotateSpeed = 0.55;

// ------------------------------------------------------------ post-proceso
const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: isMobile ? 0 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(renderer.getPixelRatio());
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.55, 0.88);
composer.addPass(bloom);
// gradación de color + viñeta + grano suave (aspecto cinematográfico)
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uVignette: { value: 0.9 }, uWarm: { value: 0.0 }, uTime: { value: 0 }, uSat: { value: 1.08 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVignette; uniform float uWarm; uniform float uTime; uniform float uSat; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126,0.7152,0.0722));
      c.rgb = mix(vec3(l), c.rgb, uSat);
      // sombras ligeramente azuladas y luces cálidas (teal & orange suave)
      c.rgb += vec3(0.035,0.012,-0.03) * smoothstep(0.35, 1.0, l) * (0.6 + uWarm);
      c.rgb += vec3(-0.012,0.0,0.03) * (1.0 - smoothstep(0.0, 0.35, l));
      vec2 d = vUv - 0.5; float v = 1.0 - dot(d, d) * uVignette; c.rgb *= clamp(v, 0.0, 1.0);
      c.rgb += (rnd(vUv * 731.0) - 0.5) * 0.012;
      gl_FragColor = c;
    }`,
});
composer.addPass(new OutputPass());
composer.addPass(grade);

// ------------------------------------------------------------ carga
const loaderEl = $('#loader'), bar = $('#bar'), stepEl = $('#step');
function progress(p, text) { bar.style.transform = `scaleX(${p})`; if (text) stepEl.textContent = text; }
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

let world, sky, music;
const state = { night: 0.8, auto: false, tourIndex: -1, fly: null, labels: true };

async function boot() {
  progress(0.02, 'Descargando las figuras 3D');
  const lib = await loadAll((p, f) => progress(0.05 + p * 0.45, 'Descargando las figuras 3D'));
  world = new World(scene, lib);
  const steps = world.steps();
  for (let i = 0; i < steps.length; i++) {
    progress(0.5 + (i / steps.length) * 0.48, steps[i][0]);
    await nextFrame();
    steps[i][1]();
  }
  const P = LOC.portal;
  sky = new Sky(scene, { starPos: new THREE.Vector3(P.x + 6, LOC.portal.h + 72, P.z - 18) });
  const t0 = params.has('t') ? +params.get('t') : 0.8;
  setTime(t0); $('#time').value = Math.round(t0 * 100);
  progress(1, 'Listo');
  // compilar sombreadores antes de mostrar
  renderer.compile(scene, camera);
  await nextFrame();
  loaderEl.classList.add('done');
  setTimeout(() => loaderEl.remove(), 1200);
  buildTourUI();
  const start = params.get('view');
  if (start !== null) goTour(+start, true);
  window.READY = true;
}

function setTime(t) {
  state.night = t;
  sky.setTime(t);
  world.setNight(sky.night);
  renderer.toneMappingExposure = sky.exposure;
  bloom.strength = 0.35 + sky.night * 0.45;
  bloom.threshold = 0.9 - sky.night * 0.15;
  grade.uniforms.uWarm.value = 1 - sky.night;
  $('#timeLabel').textContent = t < 0.3 ? 'Día' : t < 0.58 ? 'Atardecer' : t < 0.82 ? 'Anochecer' : 'Noche';
}

// ------------------------------------------------------------ recorrido
function buildTourUI() {
  const nav = $('#tour');
  nav.innerHTML = '';
  TOURS.forEach((t, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = t.short; b.id = 'tour-' + i;
    b.addEventListener('click', () => { state.auto = false; $('#auto').setAttribute('aria-pressed', 'false'); goTour(i); });
    nav.appendChild(b);
  });
}
function goTour(i, instant = false) {
  const t = TOURS[(i + TOURS.length) % TOURS.length];
  state.tourIndex = TOURS.indexOf(t);
  document.querySelectorAll('#tour button').forEach((b, k) => b.classList.toggle('on', k === state.tourIndex));
  const target = t.target(world), pos = t.pos(world);
  $('#infoTitle').textContent = t.title; $('#infoText').textContent = t.text; $('#info').hidden = false;
  if (instant) { camera.position.copy(pos); controls.target.copy(target); controls.update(); return; }
  state.fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, k: 0, dur: Math.min(6, 2.2 + camera.position.distanceTo(pos) / 80) };
}

// ------------------------------------------------------------ bucle
const clock = new THREE.Clock();
let elapsed = 0, autoTimer = 0, fpsAcc = 0, fpsN = 0, lowFrames = 0, quality = isMobile ? 1 : 2;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function applyQuality(q) {
  quality = q;
  sky.sun.shadow.mapSize.set(q >= 2 ? 4096 : 2048, q >= 2 ? 4096 : 2048);
  if (sky.sun.shadow.map) { sky.sun.shadow.map.dispose(); sky.sun.shadow.map = null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, q >= 2 ? 2 : q === 1 ? 1.25 : 1));
  composer.setPixelRatio(renderer.getPixelRatio());
  onResize();
}

const STILL = params.has('still'); // modo de pruebas: un fotograma bajo demanda
function frame() {
  if (!STILL) requestAnimationFrame(frame);
  const dt = STILL ? 1 / 30 : Math.min(clock.getDelta(), 0.1);
  if (!world || !sky) return;
  elapsed += dt;
  // vuelo de cámara
  if (state.fly) {
    const f = state.fly; f.k = Math.min(1, f.k + dt / f.dur); const e = ease(f.k);
    camera.position.lerpVectors(f.p0, f.p1, e);
    camera.position.y += Math.sin(e * Math.PI) * Math.min(40, f.p0.distanceTo(f.p1) * 0.15);
    controls.target.lerpVectors(f.t0, f.t1, e);
    if (f.k >= 1) state.fly = null;
  } else if (state.auto) {
    // modo cinemático: gira lentamente y cambia de escena
    const off = camera.position.clone().sub(controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.05);
    camera.position.copy(controls.target).add(off);
    autoTimer += dt; if (autoTimer > 16) { autoTimer = 0; goTour(state.tourIndex + 1); }
  }
  controls.update();
  // la cámara nunca atraviesa el terreno
  const gh = heightAt(camera.position.x, camera.position.z) + 1.2;
  if (camera.position.y < gh) camera.position.y = gh;
  // sombras: siguen al foco y se ajustan al zoom
  const dist = camera.position.distanceTo(controls.target);
  sky.setShadowExtent(THREE.MathUtils.clamp(dist * 0.9, 30, 170));
  sky.update(dt, elapsed, controls.target);
  sky.dome.position.copy(camera.position);
  world.update(dt, elapsed, camera);
  grade.uniforms.uTime.value = elapsed % 10;
  composer.render();
  // calidad adaptativa
  if (STILL) return;
  fpsAcc += dt; fpsN++;
  if (fpsAcc > 2) { const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; if (fps < 28 && quality > 0) { lowFrames++; if (lowFrames >= 2) { applyQuality(quality - 1); lowFrames = 0; } } else lowFrames = 0; }
}

function onResize() {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth, innerHeight);
}
addEventListener('resize', onResize);

// ------------------------------------------------------------ interfaz
$('#time').addEventListener('input', (e) => setTime(e.target.value / 100));
$('#auto').addEventListener('click', (e) => {
  state.auto = !state.auto; e.currentTarget.setAttribute('aria-pressed', String(state.auto)); autoTimer = 0;
  if (state.auto) goTour(state.tourIndex < 0 ? 0 : state.tourIndex);
});
$('#music').addEventListener('click', (e) => {
  music ||= new MusicBox();
  const on = music.toggle(); e.currentTarget.setAttribute('aria-pressed', String(on));
});
$('#closeInfo').addEventListener('click', () => { $('#info').hidden = true; });
$('#help').addEventListener('click', () => { const h = $('#hint'); h.hidden = !h.hidden; });
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight') goTour(state.tourIndex + 1);
  if (e.key === 'ArrowLeft') goTour(state.tourIndex - 1);
  if (e.key === 'n') { const v = state.night > 0.5 ? 0.15 : 0.92; setTime(v); $('#time').value = v * 100; }
});
controls.addEventListener('start', () => { state.fly = null; if (state.auto) { state.auto = false; $('#auto').setAttribute('aria-pressed', 'false'); } });

window.__belen = {
  scene, camera, controls, goTour, setTime, get world() { return world; }, get sky() { return sky; },
  // avanza la simulación n fotogramas y renderiza (pruebas)
  step(n = 1) { for (let i = 0; i < n; i++) frame(); return renderer.info.render; },
  fly(i) { goTour(i, true); },
};
boot().catch((err) => { console.error(err); stepEl.textContent = 'No se pudo cargar el belén: ' + err.message + '. Recarga la página para intentarlo de nuevo.'; });
frame();
