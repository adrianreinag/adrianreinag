// Escenario genérico: fondo pintado (fijo o en capas con paralaje), actores animados, primer plano,
// mapas de luz propios de la escena y efectos. Cada escena solo describe qué hay y cómo se mueve.
import { W, H, GBuf, Painter, Actor, bakeCel } from './engine.js';

export const LIGHT = {
  night: { moonDir: [0.52, -0.62, 0.58], moon: 0.42, amb0: 0.075, amb1: 0.06 },
  dusk: { moonDir: [-0.75, -0.35, 0.56], moon: 0.95, amb0: 0.1, amb1: 0.12, bgDim: 0.95, bgMoon: 0.6 },
  dawn: { moonDir: [0.78, -0.3, 0.55], moon: 0.75, amb0: 0.12, amb1: 0.12, bgDim: 0.95, bgMoon: 0.6 },
  day: { moonDir: [0.45, -0.78, 0.45], moon: 0.82, amb0: 0.14, amb1: 0.18, bgDim: 1, bgMoon: 0.72 },
};

export class Stage {
  constructor(R) {
    this.R = R;
    this.bg = new GBuf(W, H); this.p = new Painter(this.bg);
    this.fg = null; this.layers = []; this.para = []; this.paraTop = [];
    this.shelter = new Float32Array(W * H); this.shad = new Float32Array(W * H); this.hl = new Float32Array(W * H);
    this.light = { ...LIGHT.night, beamDir: [0.4, -0.85, 0.3], lights: [] };
    this.lightsFn = null; this.fx = null; this.shadOrd = 20000;
  }
  fgPainter() { this.fg = new GBuf(W, H); return new Painter(this.fg); }
  // capa con paralaje: ancho propio, se repite; speed en px/s
  parallax(w, speed, paint, top = false) { const b = new GBuf(w, H); paint(new Painter(b), b); (top ? this.paraTop : this.para).push({ b, speed }); return b; }
  add(o) { const a = o instanceof Actor ? o : new Actor(o); this.layers.push(a); return a; }
  addFG() { this.layers.push({ fg: true }); }
  // horneado del sombreado plano de todo el escenario con la luz principal de la escena
  done() {
    const key = this.key || this.light.moonDir;
    bakeCel(this.bg, key, false, { texK: 0.5 });
    if (this.fg) { bakeCel(this.fg, key, false, { texK: 0.6 }); this.fg.pack(); }
    this.para.forEach((l, i) => bakeCel(l.b, key, false, { texK: 0.5, haze: i === 0 ? 0.35 : i === 1 ? 0.15 : 0 }));
    this.paraTop.forEach(l => bakeCel(l.b, key, false, { texK: 0.6 }));
    return this;
  }
  frame(t) {
    const R = this.R, G = R.G;
    R.shelter = this.shelter; R.shad = this.shad; R.hl = this.hl; R.shadOrd = this.shadOrd;
    G.copyFrom(this.bg);
    this.para.forEach((l, i) => R.blitWrap(l.b, t * l.speed, 1000 + i * 4000));
    if (this.before) this.before(t);
    let k = 0;
    for (const a of this.layers) {
      if (a.fg) { R.blit(this.fg, 0, 0, 50000); continue; }
      if (a.hidden && a.hidden(t)) { k++; continue; }
      const pos = a.pos ? a.pos(t) : [a.x, a.y];
      if (a.shadow) R.aoEllipse(pos[0] + (a.shadow[2] || 0), pos[1] + 1, a.shadow[0], a.shadow[1], 0.5);
      const f = a.frame(t), flip = a.flip;
      R.blit(f, Math.round(pos[0] - (flip ? f.w - a.ox - 1 : a.ox)), Math.round(pos[1] - a.oy), a.top ? 60000 + k * 300 : 20000 + k * 900, flip);
      k++;
    }
    this.paraTop.forEach((l, i) => R.blitWrap(l.b, t * l.speed, 62000 + i * 1000));
    const L = this.light;
    if (this.lightsFn) L.lights = this.lightsFn(t);
    R.light(L);
    if (this.fx) this.fx(t);
    R.present();
  }
}
export const fl12 = t => Math.floor(t * 12);
