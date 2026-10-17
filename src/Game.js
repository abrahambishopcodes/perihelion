import { DIFFICULTY, GRAZE, PLANET, SCORE, SHIP, STATES } from './config.js';
import { Ship } from './entities/Ship.js';
import { Debris } from './entities/Debris.js';
import { Spawner } from './systems/Spawner.js';
import { checkCollisions } from './systems/Collision.js';
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

export class Game {
  constructor({ scene, rig, planet, rings }) {
    this.rig = rig;
    this.planet = planet;
    this.rings = rings;
    this.ship = new Ship(scene);
    this.debris = new Debris(scene);
    this.spawner = new Spawner(this.debris);
    this.hud = new Hud();

    this.best = loadBest();
    this.hud.setBest(this.best);
    this.onRunOver = null; // (run) => void, for start.ng
    this.paused = false;
    this.pressedAt = -Infinity; // real time of a buffered tap
    this.realTime = 0;

    this.handleGraze = this.handleGraze.bind(this);
    this.setState(State.READY);
    this.resetRun();
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
    this.slowmo = 0;
    this.orbitScale = 1;
    this.nextPop = SCORE.popEvery;
    this.ship.reset(this.ship.angle ?? SHIP.startAngle);
    this.debris.clear();
    this.spawner.reset(this.ship.angle, this.angularSpeed());
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
    if (this.paused) {
      this.paused = false;
      this.hud.setPaused(false);
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
  }

  start() {
    this.resetRun();
    this.setState(State.PLAYING);
  }

  handleGraze() {
    this.multiplier = Math.min(this.multiplier + 1, GRAZE.multiplierCap);
    this.bestMultiplier = Math.max(this.bestMultiplier, this.multiplier);
    this.sinceGraze = 0;
    this.slowmo = GRAZE.slowmoDuration;
  }

  die() {
    this.setState(State.DYING);
    this.ship.group.visible = false;
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

  // Slow-mo is measured in real time so it feels the same at any speed.
  timeScale() {
    return this.slowmo > 0 ? GRAZE.slowmoScale : 1;
  }

  // Fixed simulation step. realDt is wall-clock time; the world runs at realDt * timeScale.
  step(realDt) {
    this.realTime += realDt;
    this.stateTime += realDt;
    const dt = realDt * this.timeScale();
    this.slowmo = Math.max(0, this.slowmo - realDt);

    if (this.state === State.PLAYING) {
      if (this.realTime - this.pressedAt <= SHIP.inputBuffer) {
        this.pressedAt = -Infinity;
        this.ship.toggle();
        this.planet.pulse(PLANET.switchPulse);
      }

      this.elapsed += dt;
      const speed = this.angularSpeed();
      this.ship.update(dt, speed, this.orbitScale, this.realTime);
      this.spawner.update(this.ship.angle, speed, this.difficulty());
      this.debris.update(dt, this.ship.angle, this.orbitScale);

      if (checkCollisions(this.ship, this.debris, this.handleGraze)) {
        this.die();
        return;
      }

      this.sinceGraze += dt;
      if (this.multiplier > 1 && this.sinceGraze >= GRAZE.decayAfter) {
        this.multiplier--;
        this.sinceGraze = 0;
      }

      this.score += SCORE.perSecond * this.multiplier * dt;
      this.hud.setScore(this.score);
      this.hud.setMultiplier(this.multiplier);
      if (this.score >= this.nextPop) {
        this.nextPop = (Math.floor(this.score / SCORE.popEvery) + 1) * SCORE.popEvery;
        this.hud.pop();
      }
      this.rings.setActive(this.ship.lane);
    } else if (this.state === State.DYING) {
      // The world keeps drifting while the wreck settles.
      this.ship.angle += this.angularSpeed() * dt;
      this.debris.update(dt, this.ship.angle, this.orbitScale);
      if (this.stateTime >= STATES.dyingDuration) this.gameOver();
    } else if (this.state === State.READY) {
      // Idle lap on the outer orbit behind the title.
      this.ship.update(dt, SHIP.speedStart, this.orbitScale, this.realTime);
      this.rings.setActive(-1);
    } else {
      this.rings.setActive(-1);
    }
  }

  // Once per rendered frame.
  frame(frameDt, time) {
    this.rig.update(frameDt, time, this.state === State.READY);
  }
}
