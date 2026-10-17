import { GRAZE, JUICE } from '../config.js';

// Screen shake (trauma-based), hit-stop, slow-mo, aberration pulses and camera kick.
export class Juice {
  constructor(rig, postfx) {
    this.rig = rig;
    this.postfx = postfx;
    this.reset();
  }

  reset() {
    this.trauma = 0;
    this.hitStop = 0; // real seconds of full freeze
    this.slowmo = 0; // real seconds of slow-mo
    this.slowmoScale = 1;
    this.ca = 0;
    this.kick = 0;
    this.shakeTime = 0;
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  aberration(amount) {
    this.ca = Math.max(this.ca, amount);
  }

  slowMotion(seconds, scale) {
    this.slowmo = Math.max(this.slowmo, seconds);
    this.slowmoScale = scale;
  }

  freeze(seconds) {
    this.hitStop = Math.max(this.hitStop, seconds);
  }

  kickBack(amount) {
    this.kick = Math.max(this.kick, amount);
  }

  graze() {
    this.slowMotion(GRAZE.slowmoDuration, GRAZE.slowmoScale);
    this.addTrauma(JUICE.grazeTrauma);
    this.aberration(JUICE.caSpikeGraze);
  }

  // World time scale this step.
  timeScale() {
    if (this.hitStop > 0) return 0;
    return this.slowmo > 0 ? this.slowmoScale : 1;
  }

  // Real time keeps ticking through freezes and slow-mo.
  step(realDt) {
    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - realDt);
      return;
    }
    this.slowmo = Math.max(0, this.slowmo - realDt);
  }

  // Per rendered frame: camera shake and push, aberration.
  frame(dt, speed01, baseAberration) {
    this.shakeTime += dt;
    this.trauma = Math.max(0, this.trauma - JUICE.traumaDecay * dt);
    this.ca *= Math.exp(-JUICE.caDecay * dt);
    this.kick *= Math.exp(-JUICE.kickDecay * dt);

    const shake = this.trauma * this.trauma * JUICE.shakeMax;
    const t = this.shakeTime * JUICE.shakeFrequency;
    // Layered sines: smooth, cheap, no allocations.
    this.rig.offset.set(
      shake * (Math.sin(t * 1.1) * 0.6 + Math.sin(t * 2.3 + 1.7) * 0.4),
      shake * (Math.sin(t * 1.3 + 4.1) * 0.6 + Math.sin(t * 2.9 + 0.3) * 0.4),
      shake * (Math.sin(t * 0.9 + 2.2) * 0.6 + Math.sin(t * 2.1 + 5.3) * 0.4),
    );
    this.rig.distanceScale = 1 - JUICE.speedPushIn * speed01 + this.kick;
    this.postfx?.setAberration(baseAberration + this.ca);
  }
}
