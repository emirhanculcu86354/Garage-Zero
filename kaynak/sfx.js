// ================= GARAGE ZERO — SESLER (WebAudio sentez) =================
const SFX = {
  ctx: null, master: null, last: {},
  on() { return !S || !S.settings || S.settings.sound !== false; },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  ok(name, gap = 0.15) {
    if (!this.ctx || !this.on()) return false;
    const t = this.ctx.currentTime;
    if (this.last[name] && t - this.last[name] < gap) return false;
    this.last[name] = t; return true;
  },
  tone(freq, dur, { type = 'sine', vol = 0.3, at = 0, slide = 0, attack = 0.005 } = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, { vol = 0.25, at = 0, freq = 2000, q = 1, type = 'bandpass' } = {}) {
    const c = this.ctx, t = c.currentTime + at, n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
  },
  ring() { if (!this.ok('ring', 2)) return; for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) { this.tone(880, 0.05, { type: 'square', vol: 0.06, at: r * 0.7 + i * 0.06 }); this.tone(660, 0.05, { type: 'square', vol: 0.05, at: r * 0.7 + i * 0.06 + 0.03 }); } },
  cash() { if (!this.ok('cash', 0.4)) return; this.noise(0.08, { vol: 0.2, freq: 3000 }); this.tone(1320, 0.18, { type: 'triangle', vol: 0.18, at: 0.05 }); this.tone(1760, 0.35, { type: 'triangle', vol: 0.15, at: 0.12 }); },
  clink() { if (!this.ok('clink', 0.25)) return; const f = 2200 + Math.random() * 1600; this.tone(f, 0.12, { type: 'triangle', vol: 0.05 }); this.tone(f * 1.5, 0.08, { type: 'sine', vol: 0.03 }); },
  ratchet() { if (!this.ok('ratchet', 0.6)) return; for (let i = 0; i < 6; i++) this.noise(0.025, { vol: 0.12, at: i * 0.05, freq: 3500, q: 4 }); },
  impact() { if (!this.ok('impact', 0.8)) return; this.tone(180, 0.45, { type: 'sawtooth', vol: 0.05, slide: 60 }); this.noise(0.45, { vol: 0.07, freq: 1200, q: 2 }); },
  horn() { if (!this.ok('horn', 1)) return; this.tone(392, 0.22, { type: 'sawtooth', vol: 0.06 }); this.tone(494, 0.22, { type: 'sawtooth', vol: 0.05 }); },
  click() { if (!this.ok('click', 0.3)) return; this.noise(0.03, { vol: 0.3, freq: 1500, q: 3 }); this.noise(0.03, { vol: 0.25, freq: 1500, q: 3, at: 0.35 }); },
  engine(bad) {
    if (!this.ok('engine', 1.5)) return;
    const c = this.ctx, t = c.currentTime;
    // marş
    for (let i = 0; i < (bad ? 9 : 5); i++) this.tone(70, 0.09, { type: 'sawtooth', vol: 0.08, at: i * 0.11 });
    // çalışma
    const st = bad ? 1.0 : 0.55;
    const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(38, t + st); o.frequency.linearRampToValueAtTime(70, t + st + 0.35); o.frequency.linearRampToValueAtTime(42, t + st + 1.6);
    f.type = 'lowpass'; f.frequency.value = 380;
    lfo.frequency.value = bad ? 5 : 18; lg.gain.value = bad ? 0.07 : 0.02; lfo.connect(lg); lg.connect(g.gain);
    g.gain.setValueAtTime(0.0001, t + st); g.gain.exponentialRampToValueAtTime(0.12, t + st + 0.1); g.gain.setValueAtTime(0.12, t + st + 1.5); g.gain.exponentialRampToValueAtTime(0.0001, t + st + 2.2);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t + st); lfo.start(t + st); o.stop(t + st + 2.3); lfo.stop(t + st + 2.3);
  },
  beep() { if (!this.ok('beep', 0.6)) return; this.tone(1000, 0.12, { type: 'square', vol: 0.04 }); this.tone(1000, 0.12, { type: 'square', vol: 0.04, at: 0.25 }); },
  ding() { if (!this.ok('ding', 0.3)) return; this.tone(1046, 0.4, { type: 'sine', vol: 0.12 }); this.tone(1568, 0.5, { type: 'sine', vol: 0.08, at: 0.08 }); },
  motor(v, thr) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (v === null || !this.on()) { if (this._mo) { this._mo.g.gain.setTargetAtTime(0, c.currentTime, 0.15); } return; }
    if (!this._mo) {
      const o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 420; g.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(this.master); o.start(); o2.start();
      this._mo = { o, o2, f, g };
    }
    const sp = Math.abs(v), gearPos = sp < 6 ? sp / 6 : sp < 13 ? (sp - 6) / 7 : (sp - 13) / 11;
    const fq = 34 + gearPos * 46 + (thr > 0 ? 6 : 0);
    this._mo.o.frequency.setTargetAtTime(fq, c.currentTime, 0.08); this._mo.o2.frequency.setTargetAtTime(fq * 0.5, c.currentTime, 0.08);
    this._mo.f.frequency.setTargetAtTime(300 + gearPos * 400 + (thr > 0 ? 200 : 0), c.currentTime, 0.1);
    this._mo.g.gain.setTargetAtTime(0.05 + (thr > 0 ? 0.03 : 0), c.currentTime, 0.1);
  },
  step() { if (!this.ok('step', 0.18)) return; this.noise(0.07, { vol: 0.09, freq: 260 + Math.random() * 120, q: 0.7, type: 'lowpass' }); },
  tick() { if (!this.ok('tick', 0.05)) return; this.tone(900, 0.04, { type: 'square', vol: 0.025 }); },
  hum(up) { if (!this.ok('hum', 0.8)) return; this.tone(up ? 120 : 150, 1.1, { type: 'sawtooth', vol: 0.03, slide: up ? 50 : -40, attack: 0.08 }); this.noise(1.0, { vol: 0.02, freq: 500, q: 0.6 }); },
  scrub() { if (!this.ok('scrub', 0.5)) return; this.noise(0.35, { vol: 0.05, freq: 1100, q: 0.8 }); },
  bad() { if (!this.ok('bad', 0.5)) return; this.tone(300, 0.25, { type: 'triangle', vol: 0.1, slide: -120 }); },
};
document.addEventListener('pointerdown', () => SFX.init(), { passive: true });
document.addEventListener('keydown', () => SFX.init());
