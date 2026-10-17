import { AUDIO } from '../config.js';

const semis = (base, n) => base * 2 ** (n / 12);

// Every sound is synthesized with the Web Audio API. Nothing plays until the first tap.
export class Audio {
  constructor() {
    this.ctx = null;
    try {
      this.muted = localStorage.getItem(AUDIO.muteKey) === '1';
    } catch {
      this.muted = false;
    }
  }

  // Call from a user gesture (browsers block audio before one).
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : AUDIO.master;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);

    // White noise, reused by every noisy sound.
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.startPad();
  }

  setMuted(muted) {
    this.muted = muted;
    try {
      localStorage.setItem(AUDIO.muteKey, muted ? '1' : '0');
    } catch {
      // not persisted
    }
    if (this.master) this.master.gain.setTargetAtTime(muted ? 0 : AUDIO.master, this.ctx.currentTime, 0.05);
  }

  suspend() {
    this.ctx?.suspend();
  }

  resume() {
    this.ctx?.resume();
  }

  // Low evolving pad: detuned oscillators through a slowly swept low-pass.
  startPad() {
    const ctx = this.ctx;
    this.pad = ctx.createGain();
    this.pad.gain.value = 0;
    this.pad.gain.setTargetAtTime(AUDIO.padVolume, ctx.currentTime, 1.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = AUDIO.padFilter;
    filter.Q.value = 2;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = AUDIO.padFilterLfoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = AUDIO.padFilterLfoDepth;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    AUDIO.padFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sawtooth';
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.5 : 1;
      osc.connect(g).connect(filter);
      osc.start();
    });
    filter.connect(this.pad).connect(this.master);
  }

  duck(down) {
    if (!this.ctx) return;
    this.pad.gain.setTargetAtTime(AUDIO.padVolume * (down ? AUDIO.duckLevel : 1), this.ctx.currentTime, AUDIO.duckTime);
  }

  env(gain, t, attack, peak, decay) {
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  noiseSource(duration) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.start(this.ctx.currentTime, Math.random() * 0.5, duration);
    return src;
  }

  tone(type, freq, t, attack, peak, decay, dest = this.master) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    const g = this.ctx.createGain();
    this.env(g, t, attack, peak, decay);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + attack + decay + 0.02);
    return osc;
  }

  // Soft filtered-noise whoosh.
  switchWhoosh() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.noiseSource(AUDIO.switchTime + 0.05);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(500, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + AUDIO.switchTime);
    const g = this.ctx.createGain();
    this.env(g, t, 0.02, AUDIO.switchVolume, AUDIO.switchTime);
    src.connect(bp).connect(g).connect(this.master);
  }

  // Sine blip that climbs the pentatonic scale with the combo.
  graze(step) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const scale = AUDIO.pentatonic;
    const note = semis(AUDIO.grazeBase, scale[Math.min(step, scale.length - 1)]);
    this.tone('sine', note, t, 0.005, AUDIO.grazeVolume, 0.16);
    this.tone('triangle', note * 2, t, 0.002, AUDIO.grazeVolume * 0.25, 0.05);
  }

  shard() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone('triangle', AUDIO.shardNotes[0], t, 0.004, AUDIO.shardVolume, 0.12);
    this.tone('sine', AUDIO.shardNotes[1], t + 0.07, 0.004, AUDIO.shardVolume, 0.25);
  }

  well() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.tone('sine', 220, t, 0.02, AUDIO.wellVolume, 0.9);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.9);
    this.tone('triangle', 440, t, 0.01, AUDIO.wellVolume * 0.3, 0.5);
  }

  // Quiet sub thump the planet pulses to.
  beat() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.tone('sine', 70, t, 0.01, AUDIO.beatVolume, 0.25);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.25);
  }

  // Low thud plus descending filtered noise, then the pad ducks.
  death() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const thud = this.tone('sine', 130, t, 0.005, AUDIO.deathVolume, 0.6);
    thud.frequency.exponentialRampToValueAtTime(38, t + 0.5);
    const src = this.noiseSource(1);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4000, t);
    lp.frequency.exponentialRampToValueAtTime(160, t + 0.9);
    const g = this.ctx.createGain();
    this.env(g, t, 0.005, AUDIO.deathVolume * 0.6, 0.9);
    src.connect(lp).connect(g).connect(this.master);
    this.duck(true);
  }
}
