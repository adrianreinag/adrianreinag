// Escena de prueba: galería de personajes.
import { W, H, M, GBuf, Painter, Actor, noise, fbm } from '../engine.js';
import { persona, angel } from '../people.js';
import { CAST } from '../cast.js';

export function buildLineup(R) {
  const bg = new GBuf(W, H), p = new Painter(bg);
  p.shape(() => -1, [0, 0, W, 200], { m: M.wall, R: 0, ol: 0, v: (x, y) => (fbm(x * 0.05, y * 0.05) - 0.5) * 0.3 });
  p.shape(() => -1, [0, 200, W, H], { m: M.dirt, R: 0, n: [0, -0.7, 0.7], ol: 0, v: (x, y) => (fbm(x * 0.1, y * 0.2) - 0.5) * 0.3 });
  const who = new URLSearchParams(location.search).get('who'), POSE = new URLSearchParams(location.search).get('pose');
  const names = who ? who.split(',') : Object.keys(CAST);
  const SC = +(new URLSearchParams(location.search).get('sc') || 0.85), per = Math.floor(470 / (42 * SC));
  const actors = names.map((n, i) => new Actor({ w: 120, h: 180, ox: 60, oy: 150, x: 26 * SC + (i % per) * 42 * SC, y: 128 + Math.floor(i / per) * 128, scale: SC, light: [-0.55, -0.6, 0.58], draw: (pp, t, k) => { const c = CAST[n]; if (c.angel) angel(pp, { f: +k % 3 }, c.o); else persona(pp, { ...c, ...(POSE ? { pose: POSE } : {}) }, { w: +k % 4 }); }, key: t => `${Math.floor(t * 6) % 12}` }));
  R.shelter.fill(1); R.shad.fill(0); R.hl.fill(0);
  return { frame(t) {
    R.G.copyFrom(bg); let k = 0;
    for (const a of actors) R.blit(a.frame(t), a.x - a.ox, a.y - a.oy, 20000 + 1000 * k++);
    R.light({ moonDir: [0.5, -0.6, 0.6], moon: 0.3, amb0: 0.3, amb1: 0, beamDir: [0, -1, 0], lights: [{ x: 240, y: 60, z: 200, r: 900, i: 0.75 }] });
    R.present();
  } };
}
