import { COMET, DEBRIS, ORBIT, PICKUP, SHIP, SPAWNER } from '../config.js';

const lerp = (a, b, t) => a + (b - a) * t;
const rand = (range) => lerp(range[0], range[1], Math.random());
const PLAN_CAPACITY = 64;

// Hand-authored patterns. Lanes are relative: 'A' is picked at random, 'B' is the other one.
// A suffix picks the kind: r = retrograde, c = comet, p = pincer (none = drifter).
// Blocks on opposite lanes are always spaced so a switch fits between them, so one lane is always open.
const PATTERNS = [
  { weight: 3, minDifficulty: 0, steps: ['A'] },
  { weight: 3, minDifficulty: 0, steps: ['A', 'B'] },
  { weight: 2, minDifficulty: 0.05, steps: ['A', 'A'] },
  { weight: 2, minDifficulty: 0.12, steps: ['A', 'B', 'A'] },
  { weight: 2, minDifficulty: 0.2, steps: ['A', 'A', 'A'] },
  { weight: 2, minDifficulty: 0.25, steps: ['A', 'B', 'B'] },
  { weight: 2, minDifficulty: 0.35, steps: ['A', 'B', 'A', 'B'] },
  { weight: 1, minDifficulty: 0.5, steps: ['A', 'A', 'B', 'A', 'A'] },
  { weight: 3, needs: 'retro', steps: ['Ar'] },
  { weight: 2, needs: 'retro', steps: ['A', 'Br'] },
  { weight: 2, needs: 'retro', steps: ['Ar', 'B', 'Ar'] },
  { weight: 3, needs: 'comet', steps: ['Ac'] },
  { weight: 2, needs: 'comet', steps: ['A', 'Bc'] },
  { weight: 1, needs: 'comet', steps: ['Ac', 'Br', 'A'] },
  { weight: 3, needs: 'pincer', steps: ['Ap'] },
  { weight: 2, needs: 'pincer', steps: ['Ap', 'B'] },
  { weight: 1, needs: 'pincer', steps: ['A', 'Bp', 'Ar'] },
].map((p) => ({
  minDifficulty: 0,
  ...p,
  steps: p.steps.map((s) => ({
    lane: s[0],
    kind: { r: 'retro', c: 'comet', p: 'pincer' }[s[1]] ?? 'drifter',
  })),
}));

export class Spawner {
  constructor(debris, pickups) {
    this.debris = debris;
    this.pickups = pickups;
    this.plan = Array.from({ length: PLAN_CAPACITY }, () => ({
      used: false, kind: '', encounter: 0, lane: 0, ratio: 0, radialSpeed: 0,
    }));
  }

  reset(shipAngle, angularSpeed) {
    for (const p of this.plan) p.used = false;
    this.lastEncounter = shipAngle + SPAWNER.firstPatternDelay * angularSpeed;
    this.lastLane = -1;
    this.lastHalfWindow = 0;
    this.first = true;
    this.wellFrom = Infinity; // phase range planned around a shrunken orbit
    this.wellUntil = -Infinity;
    this.lastWellTime = -Infinity;
  }

  // Angle of ship travel during which a rock on `lane` overlaps the ship.
  halfWindow(lane, ratio, scale) {
    const r = (lane === 0 ? ORBIT.innerRadius : ORBIT.outerRadius) * scale;
    const reach = SHIP.hitRadius + DEBRIS.sizeMax * DEBRIS.hitScale;
    return reach / (r * Math.max(Math.abs(1 - ratio), 0.1));
  }

  switchPhase(angularSpeed, difficulty) {
    return (SHIP.switchDuration + lerp(SPAWNER.minSwitchGap, SPAWNER.minSwitchGapEnd, difficulty)) * angularSpeed;
  }

  take(kind, lane, encounter) {
    for (const p of this.plan) {
      if (p.used) continue;
      p.used = true;
      p.kind = kind;
      p.lane = lane;
      p.encounter = encounter;
      return p;
    }
    return null;
  }

  // Plans one block (a drifter, retrograde rock, comet or pincer pair) after the previous one.
  queue(lane, kind, gapSeconds, angularSpeed, difficulty, elapsed) {
    const scale = this.lastEncounter >= this.wellFrom && this.lastEncounter <= this.wellUntil ? PICKUP.wellScale : 1;
    // Shrunken orbits put the lanes too close for a comet's second crossing to clear the ship.
    if (kind === 'comet' && scale < 1) kind = 'drifter';
    let ratio = 0;
    let ratio2 = 0;
    let hw;
    if (kind === 'drifter') ratio = rand(DEBRIS.drifterRatio);
    else if (kind === 'retro') ratio = rand(DEBRIS.retroRatio);
    if (kind === 'pincer') {
      ratio = rand(DEBRIS.retroRatio);
      ratio2 = rand(DEBRIS.chaserRatio);
      hw = Math.max(this.halfWindow(lane, ratio, scale), this.halfWindow(lane, ratio2, scale));
    } else {
      hw = this.halfWindow(lane, ratio, scale);
    }

    let gap = 0;
    if (this.lastLane !== -1) {
      gap = lane !== this.lastLane
        ? this.lastHalfWindow + hw + this.switchPhase(angularSpeed, difficulty)
        : Math.max(this.lastHalfWindow, hw) * 2;
    }
    const encounter = this.lastEncounter + gap + gapSeconds * angularSpeed;

    if (kind === 'comet') {
      const p = this.take('comet', lane, encounter);
      if (!p) return false;
      // After crossing the blocked lane it crosses the other one; cap its speed so that
      // happens far enough from a ship that dodged correctly.
      const reach = SHIP.hitRadius + DEBRIS.sizeMax * DEBRIS.hitScale;
      const maxSpeed = ((ORBIT.outerRadius - ORBIT.innerRadius) * ORBIT.innerRadius) / (reach * COMET.crossingMargin);
      p.radialSpeed = Math.min(maxSpeed, (COMET.startRadius - ORBIT.outerRadius) / (COMET.travelTime * angularSpeed));
    } else {
      const p = this.take('rock', lane, encounter);
      if (!p) return false;
      p.ratio = ratio;
      if (kind === 'pincer') {
        const chaser = this.take('rock', lane, encounter);
        if (chaser) chaser.ratio = ratio2;
      }
    }

    // A shard just behind the rock, on its lane: switching back early pays.
    if (elapsed >= PICKUP.shardMinTime && Math.random() < PICKUP.shardChance) {
      const at = encounter + hw + (SHIP.switchDuration + PICKUP.shardOffset) * angularSpeed;
      this.take('shard', lane, at);
    }

    this.lastEncounter = encounter;
    this.lastLane = lane;
    this.lastHalfWindow = hw;
    return true;
  }

  // A gravity well in open space, then calm while the orbits shrink.
  queueWell(angularSpeed, difficulty, elapsed) {
    const lane = Math.random() < 0.5 ? 0 : 1;
    const at = this.lastEncounter + this.lastHalfWindow + this.switchPhase(angularSpeed, difficulty);
    if (!this.take('well', lane, at)) return;
    this.lastWellTime = elapsed;
    this.wellFrom = at;
    this.wellUntil = at + (PICKUP.wellDuration + PICKUP.wellEase * 2) * angularSpeed * SPAWNER.wellPlanMargin;
    this.lastEncounter = at + PICKUP.wellCalm * angularSpeed;
    this.lastLane = -1; // the calm gap is long enough for any lane
  }

  pickPattern(difficulty, elapsed) {
    let total = 0;
    for (const p of PATTERNS) if (this.allowed(p, difficulty, elapsed)) total += p.weight;
    let roll = Math.random() * total;
    for (const p of PATTERNS) {
      if (!this.allowed(p, difficulty, elapsed)) continue;
      roll -= p.weight;
      if (roll <= 0) return p;
    }
    return PATTERNS[0];
  }

  allowed(pattern, difficulty, elapsed) {
    if (pattern.minDifficulty > difficulty) return false;
    return !pattern.needs || elapsed >= DEBRIS.unlock[pattern.needs];
  }

  // How far ahead (in ship travel) a planned item should appear.
  spawnWindow(p, lookahead) {
    if (p.kind === 'comet') {
      const r = p.lane === 0 ? ORBIT.innerRadius : ORBIT.outerRadius;
      return (COMET.startRadius - r) / p.radialSpeed + COMET.telegraphTime * this.angularSpeed;
    }
    if (p.kind !== 'rock') return lookahead;
    return p.ratio < 1
      ? Math.min(lookahead, DEBRIS.maxAhead / (1 - p.ratio))
      : Math.min(lookahead, DEBRIS.maxBehind / (p.ratio - 1));
  }

  update(shipAngle, angularSpeed, difficulty, elapsed) {
    this.angularSpeed = angularSpeed;
    const lookahead = lerp(SPAWNER.lookaheadStart, SPAWNER.lookaheadMax, difficulty);

    // Plan whole patterns a little beyond what's visible.
    while (this.lastEncounter - shipAngle < lookahead + SPAWNER.planExtra) {
      const wellReady = elapsed >= PICKUP.wellMinTime && elapsed - this.lastWellTime >= PICKUP.wellCooldown;
      if (!this.first && wellReady && Math.random() < PICKUP.wellChance) {
        this.queueWell(angularSpeed, difficulty, elapsed);
        continue;
      }
      const pattern = this.pickPattern(difficulty, elapsed);
      const a = Math.random() < 0.5 ? 0 : 1;
      const breathe = this.first ? 0 : lerp(SPAWNER.patternGapStart, SPAWNER.patternGapEnd, difficulty);
      this.first = false;
      let ok = true;
      for (let i = 0; i < pattern.steps.length && ok; i++) {
        const step = pattern.steps[i];
        const lane = step.lane === 'A' ? a : 1 - a;
        ok = this.queue(lane, step.kind, i === 0 ? breathe : 0, angularSpeed, difficulty, elapsed);
      }
      if (!ok) break;
    }

    for (const p of this.plan) {
      if (!p.used) continue;
      const lead = p.encounter - shipAngle;
      if (lead > this.spawnWindow(p, lookahead)) continue;
      p.used = false;
      if (p.kind === 'comet') this.debris.spawnComet(p.lane, p.encounter, p.radialSpeed);
      else if (lead < SPAWNER.minLeadPhase) continue; // too close to appear fairly: skip it
      else if (p.kind === 'rock') this.debris.spawn(p.lane, p.encounter, p.ratio);
      else if (p.kind === 'shard') this.pickups.spawnShard(p.lane, p.encounter);
      else if (p.kind === 'well') this.pickups.spawnWell(p.lane, p.encounter);
    }
  }
}
