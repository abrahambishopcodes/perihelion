import * as THREE from 'three';
import {
  AUDIO, COLORS, COMET, DIFFICULTY, GRAZE, JUICE, PARTICLES, PICKUP, PLANET, POSTFX, SCORE, SHIP, STATES,
} from './config.js';
import { Ship } from './entities/Ship.js';
import { Debris } from './entities/Debris.js';
import { Pickups } from './entities/Pickup.js';
import { Spawner } from './systems/Spawner.js';
import { checkCollisions } from './systems/Collision.js';
import { Juice } from './systems/Juice.js';
import { Audio } from './systems/Audio.js';
import { Trail } from './render/Trail.js';
import { Particles } from './render/Particles.js';
import { Hud } from './ui/Hud.js';

const lerp = (a, b, t) => a + (b - a) * t;

export const State = {
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  DYING: 'dying',
  GAMEOVER: 'gameover',
};

function loadBest() {
  try {
    return Number(localStorage.getItem(SCORE.storageKey)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(best) {
  try {
    localStorage.setItem(SCORE.storageKey, String(Math.floor(best)));
  } catch {
    // storage unavailable (private mode): the best only lasts this session
  }
}

const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();

export class Game {
  constructor({ scene, rig, planet, rings, postfx = null, pixelRatio = 1 }) {
    this.rig = rig;
    this.planet = planet;
    this.rings = rings;
    this.trail = new Trail(scene);
    this.ship = new Ship(scene);
    this.debris = new Debris(scene);
    this.pickups = new Pickups(scene);
    this.particles = new Particles(scene, pixelRatio);
    this.spawner = new Spawner(this.debris, this.pickups);
    this.juice = new Juice(rig, postfx);
    this.audio = new Audio();
    this.hud = new Hud();

    this.pickups.onCollect = (kind, item) => this.collect(kind, item);
    this.debris.onCometImpact = (comet) => this.cometImpact(comet);
    this.hud.onMute = () => {
      this.audio.unlock();
      this.audio.setMuted(!this.audio.muted);
      this.hud.setMuted(this.audio.muted);
    };
    this.hud.setMuted(this.audio.muted);

    this.best = loadBest();
    this.hud.setBest(this.best);
    this.onRunOver = null; // (run) => void, for start.ng
    this.paused = false;
    this.pressedAt = -Infinity; // real time of a buffered tap
    this.realTime = 0;
    this.beatTime = 0;

    this.handleGraze = this.handleGraze.bind(this);
    this.setState(State.READY);
    this.resetRun();
    this.trail.reset(this.ship.position);
  }

  setState(state) {
    this.state = state;
    this.stateTime = 0;
    this.hud.setState(state);
  }

  resetRun() {
    this.elapsed = 0;
    this.score = 0;
    this.multiplier = 1;
    this.bestMultiplier = 1;
    this.sinceGraze = 0;
    this.orbitScale = 1;
    this.wellTime = -1; // seconds into an active gravity well, -1 = none
    this.exploded = false;
    this.nextPop = SCORE.popEvery;
    this.ship.reset(this.ship.angle ?? SHIP.startAngle);
    this.debris.clear();
    this.pickups.clear();
    this.juice.reset();
    this.rings.setScale(1);
    this.spawner.reset(this.ship.angle, this.angularSpeed());
    this.trail.setMultiplier(1);
    this.hud.setScore(0);
    this.hud.setMultiplier(1);
  }

  difficulty() {
    return 1 - Math.exp(-this.elapsed / DIFFICULTY.timeConstant);
  }

  angularSpeed() {
    return lerp(SHIP.speedStart, SHIP.speedMax, this.difficulty());
  }

  // Any tap, click or key.
  press() {
    this.audio.unlock();
    if (this.paused) {
      this.paused = false;
      this.hud.setPaused(false);
      this.audio.resume();
      return;
    }
    switch (this.state) {
      case State.READY:
        this.start();
        break;
      case State.PLAYING:
        this.pressedAt = this.realTime;
        break;
      case State.GAMEOVER:
        if (this.stateTime >= STATES.restartLockout) this.start();
        break;
    }
  }

  pause() {
    if (this.state !== State.PLAYING || this.paused) return;
    this.paused = true;
    this.hud.setPaused(true);
    this.audio.suspend();
  }

  start() {
    const wasOver = this.state === State.GAMEOVER;
    this.resetRun();
    if (wasOver) this.trail.reset(this.ship.position);
    this.audio.duck(false);
    this.setState(State.PLAYING);
  }

  handleGraze(rock) {
    this.multiplier = Math.min(this.multiplier + 1, GRAZE.multiplierCap);
    this.bestMultiplier = Math.max(this.bestMultiplier, this.multiplier);
    this.sinceGraze = 0;
    this.juice.graze();
    this.audio.graze(this.multiplier - 2);
    // Sparks fly from the gap between ship and rock, away from the rock.
    _mid.lerpVectors(this.ship.position, rock.position, 0.5);
    _dir.subVectors(this.ship.position, rock.position).normalize();
    this.particles.burst(_mid, PARTICLES.grazeCount, COLORS.ship, PARTICLES.grazeSpeed, PARTICLES.grazeLife, _dir, 0.7);
    this.particles.burst(_mid, PARTICLES.grazeCount / 3, '#ffffff', PARTICLES.grazeSpeed, PARTICLES.grazeLife, _dir, 0.4);
  }

  scoreRate() {
    return this.multiplier * (this.wellTime >= 0 ? PICKUP.wellScoreMultiplier : 1);
  }

  collect(kind, item) {
    if (kind === 'shard') {
      this.score += SCORE.shard * this.scoreRate();
      this.hud.pop();
      this.juice.addTrauma(JUICE.shardTrauma);
      this.audio.shard();
      this.particles.burst(item.position, PARTICLES.shardCount, COLORS.pickup, PARTICLES.shardSpeed, PARTICLES.shardLife);
    } else if (kind === 'well') {
      this.wellTime = 0;
      this.audio.well();
      this.juice.addTrauma(JUICE.shardTrauma * 2);
      this.planet.pulse(1);
      this.particles.burst(item.position, PARTICLES.wellCount, COLORS.pickup, PARTICLES.deathSpeed, PARTICLES.deathLife);
    }
  }

  cometImpact(comet) {
    this.planet.pulse(COMET.impactPulse);
    _dir.copy(comet.position).normalize();
    this.particles.burst(comet.position, PARTICLES.impactCount, COLORS.debrisRim, PARTICLES.impactSpeed, PARTICLES.impactLife, _dir, 1);
    this.particles.burst(comet.position, PARTICLES.impactCount / 2, COLORS.planetHot, PARTICLES.impactSpeed, PARTICLES.impactLife, _dir, 1);
  }

  // Shrinks both orbits toward the planet, holds, then lets them back out.
  updateWell(dt) {
    if (this.wellTime < 0) return;
    this.wellTime += dt;
    const total = PICKUP.wellDuration;
    const t = this.wellTime;
    const ease = Math.min(1, t / PICKUP.wellEase, (total - t) / PICKUP.wellEase);
    const k = Math.max(0, ease);
    this.orbitScale = 1 + (PICKUP.wellScale - 1) * k * k * (3 - 2 * k);
    if (t >= total) {
      this.wellTime = -1;
      this.orbitScale = 1;
    }
  }

  // Impact: freeze for a beat, then the ship comes apart in slow motion.
  die() {
    this.setState(State.DYING);
    this.juice.freeze(JUICE.hitStop);
    this.juice.aberration(JUICE.caSpikeDeath);
  }

  explode() {
    this.exploded = true;
    this.ship.group.visible = false;
    const at = this.ship.position;
    this.particles.burst(at, PARTICLES.deathCount, COLORS.ship, PARTICLES.deathSpeed, PARTICLES.deathLife);
    this.particles.burst(at, PARTICLES.deathCount / 2, COLORS.debrisRim, PARTICLES.deathSpeed, PARTICLES.deathLife);
    this.particles.burst(at, PARTICLES.deathCount / 4, '#ffffff', PARTICLES.deathSpeed, PARTICLES.grazeLife);
    this.juice.addTrauma(JUICE.deathTrauma);
    this.juice.kickBack(JUICE.deathKickBack);
    this.juice.slowMotion(STATES.dyingDuration, JUICE.deathSlowmo);
    this.planet.pulse(1);
    this.audio.death();
  }

  gameOver() {
    this.setState(State.GAMEOVER);
    const previous = this.best;
    const isNewBest = this.score > previous;
    if (isNewBest) {
      this.best = this.score;
      saveBest(this.best);
      this.hud.setBest(this.best);
    }
    const missedBy = !isNewBest && previous - this.score <= previous * SCORE.closeToBest ? previous - this.score : 0;
    this.hud.showGameOver(this.score, this.best, isNewBest, missedBy);
    this.onRunOver?.({
      score: Math.floor(this.score),
      multiplier: this.bestMultiplier,
      time: Math.floor(this.elapsed),
    });
  }

  timeScale() {
    return this.juice.timeScale();
  }

  // A soft beat the planet breathes to.
  updateBeat(realDt) {
    this.beatTime += realDt;
    if (this.beatTime < AUDIO.beatInterval) return;
    this.beatTime -= AUDIO.beatInterval;
    if (this.state !== State.PLAYING && this.state !== State.READY) return;
    this.planet.pulse(AUDIO.beatPulse);
    if (this.state === State.PLAYING) this.audio.beat();
  }

  // Fixed simulation step. realDt is wall-clock time; the world runs at realDt * timeScale.
  step(realDt) {
    this.realTime += realDt;
    this.stateTime += realDt;
    const dt = realDt * this.timeScale();
    this.juice.step(realDt);
    this.updateBeat(realDt);

    if (this.state === State.PLAYING) {
      if (this.realTime - this.pressedAt <= SHIP.inputBuffer && dt > 0) {
        this.pressedAt = -Infinity;
        this.ship.toggle();
        this.planet.pulse(PLANET.switchPulse);
        this.audio.switchWhoosh();
      }

      this.elapsed += dt;
      const speed = this.angularSpeed();
      this.ship.update(dt, speed, this.orbitScale, this.realTime);
      this.updateWell(dt);
      this.spawner.update(this.ship.angle, speed, this.difficulty(), this.elapsed);
      this.debris.update(dt, this.ship.angle, this.orbitScale, this.realTime);
      this.pickups.update(dt, this.ship, this.orbitScale, this.realTime);

      if (checkCollisions(this.ship, this.debris, this.handleGraze)) {
        this.die();
        return;
      }

      this.sinceGraze += dt;
      if (this.multiplier > 1 && this.sinceGraze >= GRAZE.decayAfter) {
        this.multiplier--;
        this.sinceGraze = 0;
      }

      this.score += SCORE.perSecond * this.scoreRate() * dt;
      this.hud.setScore(this.score);
      this.hud.setMultiplier(this.multiplier);
      if (this.score >= this.nextPop) {
        this.nextPop = (Math.floor(this.score / SCORE.popEvery) + 1) * SCORE.popEvery;
        this.hud.pop();
      }
      this.trail.setMultiplier(this.multiplier);
      this.trail.update(dt, this.ship.position);
      this.rings.setActive(this.ship.lane);
      this.rings.setScale(this.orbitScale);
    } else if (this.state === State.DYING) {
      if (!this.exploded && this.juice.hitStop <= 0) this.explode();
      // The world keeps drifting while the wreck settles.
      this.ship.angle += this.angularSpeed() * dt;
      this.debris.update(dt, this.ship.angle, this.orbitScale, this.realTime);
      this.trail.fade(realDt);
      this.trail.setMultiplier(this.multiplier);
      if (this.stateTime >= STATES.dyingDuration + JUICE.hitStop) this.gameOver();
    } else if (this.state === State.READY) {
      // Idle lap on the outer orbit behind the title.
      this.ship.update(dt, SHIP.speedStart, this.orbitScale, this.realTime);
      this.trail.update(dt, this.ship.position);
      this.rings.setActive(-1);
    } else {
      this.rings.setActive(-1);
    }
    this.particles.update(dt);
  }

  // Once per rendered frame.
  frame(frameDt, time) {
    const speed01 = this.state === State.PLAYING ? this.difficulty() : 0;
    const extra = Math.max(0, this.multiplier - POSTFX.caMultiplierFrom) * POSTFX.caMultiplier;
    this.juice.frame(frameDt, speed01, this.state === State.PLAYING ? extra : 0);
    this.rig.update(frameDt, time, this.state === State.READY);
  }
}
