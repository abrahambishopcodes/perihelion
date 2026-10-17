import { DEBRIS, ORBIT, SHIP, SPAWNER } from '../config.js';

const lerp = (a, b, t) => a + (b - a) * t;
const PLAN_CAPACITY = 48;

// Hand-authored patterns. Lanes are relative: 'A' is picked at random, 'B' is the other one.
// Consecutive blocks on opposite lanes are always spaced so a switch fits between them.
const PATTERNS = [
  { weight: 3, minDifficulty: 0, steps: ['A'] },
  { weight: 3, minDifficulty: 0, steps: ['A', 'B'] },
  { weight: 2, minDifficulty: 0.05, steps: ['A', 'A'] },
  { weight: 2, minDifficulty: 0.12, steps: ['A', 'B', 'A'] },
  { weight: 2, minDifficulty: 0.2, steps: ['A', 'A', 'A'] },
  { weight: 2, minDifficulty: 0.25, steps: ['A', 'B', 'B'] },
  { weight: 2, minDifficulty: 0.35, steps: ['A', 'B', 'A', 'B'] },
  { weight: 1, minDifficulty: 0.5, steps: ['A', 'A', 'B', 'A', 'A'] },
];

export class Spawner {
  constructor(debris) {
    this.debris = debris;
    this.plan = Array.from({ length: PLAN_CAPACITY }, () => ({ used: false, encounter: 0, lane: 0, ratio: 0 }));
  }

  reset(shipAngle, angularSpeed) {
    for (const p of this.plan) p.used = false;
    this.lastEncounter = shipAngle + SPAWNER.firstPatternDelay * angularSpeed;
    this.lastLane = -1;
    this.lastHalfWindow = 0;
    this.first = true;
  }

  // Angle of ship travel during which a rock on `lane` overlaps the ship.
  halfWindow(lane, ratio) {
    const r = lane === 0 ? ORBIT.innerRadius : ORBIT.outerRadius;
    const reach = SHIP.hitRadius + DEBRIS.sizeMax * DEBRIS.hitScale;
    return reach / (r * Math.max(Math.abs(1 - ratio), 0.1));
  }

  queue(lane, gapSeconds, angularSpeed, difficulty) {
    const ratio = lerp(DEBRIS.drifterRatio[0], DEBRIS.drifterRatio[1], Math.random());
    const hw = this.halfWindow(lane, ratio);
    let gap;
    if (this.lastLane === -1) {
      gap = 0;
    } else if (lane !== this.lastLane) {
      const switchTime = SHIP.switchDuration + lerp(SPAWNER.minSwitchGap, SPAWNER.minSwitchGapEnd, difficulty);
      gap = this.lastHalfWindow + hw + switchTime * angularSpeed;
    } else {
      gap = Math.max(this.lastHalfWindow, hw) * 2;
    }
    const encounter = this.lastEncounter + gap + gapSeconds * angularSpeed;

    let slot = null;
    for (const p of this.plan) if (!p.used) { slot = p; break; }
    if (!slot) return false;
    slot.used = true;
    slot.encounter = encounter;
    slot.lane = lane;
    slot.ratio = ratio;
    this.lastEncounter = encounter;
    this.lastLane = lane;
    this.lastHalfWindow = hw;
    return true;
  }

  pickPattern(difficulty) {
    let total = 0;
    for (const p of PATTERNS) if (p.minDifficulty <= difficulty) total += p.weight;
    let roll = Math.random() * total;
    for (const p of PATTERNS) {
      if (p.minDifficulty > difficulty) continue;
      roll -= p.weight;
      if (roll <= 0) return p;
    }
    return PATTERNS[0];
  }

  update(shipAngle, angularSpeed, difficulty) {
    const lookahead = lerp(SPAWNER.lookaheadStart, SPAWNER.lookaheadMax, difficulty);

    // Plan whole patterns while the end of the plan is inside the lookahead window.
    while (this.lastEncounter - shipAngle < lookahead) {
      const pattern = this.pickPattern(difficulty);
      const a = Math.random() < 0.5 ? 0 : 1;
      const breathe = this.first ? 0 : lerp(SPAWNER.patternGapStart, SPAWNER.patternGapEnd, difficulty);
      this.first = false;
      let ok = true;
      for (let i = 0; i < pattern.steps.length && ok; i++) {
        const lane = pattern.steps[i] === 'A' ? a : 1 - a;
        ok = this.queue(lane, i === 0 ? breathe : 0, angularSpeed, difficulty);
      }
      if (!ok) break;
    }

    // Planned rocks appear once they're close enough, never right on top of the ship.
    for (const p of this.plan) {
      if (!p.used || p.encounter - shipAngle > lookahead) continue;
      p.used = false;
      if (p.encounter - shipAngle < SPAWNER.minLeadPhase) continue;
      this.debris.spawn(p.lane, p.encounter, p.ratio);
    }
  }
}
