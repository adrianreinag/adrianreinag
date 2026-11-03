// Caja de música sintetizada: «Noche de paz» (Franz X. Gruber, 1818, dominio público).
const N = { G3: 196.0, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, Bb4: 466.16, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46 };
// [nota, duración en negras] en 6/8 (negra con puntillo = 1.5)
const MELODY = [
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['D5', 2], ['D5', 1], ['B4', 3],
  ['C5', 2], ['C5', 1], ['G4', 3],
  ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
  ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
  ['D5', 2], ['D5', 1], ['F5', 1.5], ['D5', 0.5], ['B4', 1],
  ['C5', 3], ['E5', 3],
  ['C5', 1], ['G4', 1], ['E4', 1], ['G4', 1.5], ['F4', 0.5], ['D4', 1],
  ['C4', 6],
];
const BASS = { G4: 'C4', E4: 'C4', D5: 'G3', B4: 'G3', C5: 'C4', A4: 'F4', F5: 'G3' };

export class MusicBox {
  constructor() { this.on = false; this.ctx = null; this.timer = null; }
  toggle() { if (this.on) this.stop(); else this.start(); return this.on; }
  start() {
    this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    this.ctx.resume();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.18;
    // reverberación sencilla con eco
    const delay = this.ctx.createDelay(); delay.delayTime.value = 0.33;
    const fb = this.ctx.createGain(); fb.gain.value = 0.32;
    delay.connect(fb); fb.connect(delay);
    this.master.connect(this.ctx.destination); this.master.connect(delay); delay.connect(this.ctx.destination);
    this.on = true; this.loop();
  }
  stop() { this.on = false; clearTimeout(this.timer); if (this.master) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); }
  bell(freq, t, dur, vol = 1) {
    const c = this.ctx;
    for (const [mult, amp] of [[1, 1], [2.01, 0.35], [3.98, 0.12]]) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq * mult;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * amp * vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur + 1.2);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 1.3);
    }
  }
  loop() {
    if (!this.on) return;
    const beat = 0.42; let t = this.ctx.currentTime + 0.1;
    for (const [n, d] of MELODY) {
      this.bell(N[n], t, d * beat);
      if (BASS[n] && d >= 1.5) this.bell(N[BASS[n]] / 2, t, d * beat, 0.45);
      t += d * beat;
    }
    const total = MELODY.reduce((s, m) => s + m[1], 0) * beat;
    this.timer = setTimeout(() => this.loop(), (total + 2) * 1000);
  }
}
