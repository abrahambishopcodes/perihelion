// Every tunable number in the game lives here.

export const COLORS = {
  bgTop: '#05060f',
  bgBottom: '#0b1030',
  fog: '#070a1c',
  planetCore: '#ff5a3c',
  planetHot: '#ffb347',
  planetBody: '#1a0a12',
  ship: '#4df2ff',
  debris: '#6b7390',
  debrisRim: '#ff2e88',
  pickup: '#b6ff4d',
};

export const RENDER = {
  maxPixelRatio: 2,
  fov: 50,
  near: 0.1,
  far: 200,
  fogDensity: 0.018,
  toneMappingExposure: 1.0,
};

export const CAMERA = {
  distance: 17,
  pitchDeg: 55, // angle down toward the planet
  lookAtY: 0,
  breatheAmp: 0.35, // world units of slow drift
  breatheSpeed: 0.18, // rad/s
  readyOrbitSpeed: 0.05, // rad/s of slow idle yaw on READY
};

export const PLANET = {
  radius: 1.8,
  segments: 64,
  rimPower: 2.6,
  rimStrength: 1.6,
  pulseSpeed: 0.6,
  noiseScale: 2.2,
  noiseSpeed: 0.12,
  rotationSpeed: 0.08,
  glowSize: 9, // additive sprite behind the planet
  glowOpacity: 0.55,
  lightIntensity: 40,
  lightDistance: 30,
  pulseDecay: 5, // per second, exponential
  glowPulseBoost: 0.6,
  switchPulse: 0.5, // pulse added on every lane switch
};

export const RINGS = {
  innerRadius: 4.0,
  outerRadius: 6.5,
  width: 0.035,
  segments: 256,
  baseOpacity: 0.25,
  activeOpacity: 0.6,
  dashCount: 90,
  dashScrollSpeed: 0.04, // fraction of a dash per second
  fadeSpeed: 6, // how fast the active ring brightens/dims
};

export const STARFIELD = {
  layers: [
    { count: 1300, radius: 70, size: 1.1, rotationSpeed: 0.004, opacity: 0.6 },
    { count: 700, radius: 45, size: 1.8, rotationSpeed: 0.009, opacity: 0.9 },
  ],
  twinkleSpeed: 1.6,
};

export const LOOP = {
  fixedDt: 1 / 120, // simulation step in seconds
  maxFrameDt: 0.1, // clamp long frames (tab switches, hitches)
  maxStepsPerFrame: 12,
};

// Orbits and the ship. Angles are radians, speeds rad/s.
export const ORBIT = {
  innerRadius: RINGS.innerRadius,
  outerRadius: RINGS.outerRadius,
};

export const SHIP = {
  speedStart: 1.2,
  speedMax: 2.4,
  switchDuration: 0.18, // seconds for a full lane change, easeOutCubic
  inputBuffer: 0.12, // seconds a tap is remembered while input can't be taken
  hitRadius: 0.22,
  grazeRadius: 0.9,
  size: 0.32, // visual length of the arrowhead
  glow: 1.6, // colour multiplier so the hull blooms
  bankAngle: 0.7, // max roll while switching
  bankResponse: 14, // how quickly roll follows the switch
  startAngle: Math.PI / 2,
  hoverAmp: 0.04,
  hoverSpeed: 3,
};

// Debris angles follow the ship's travelled angle ("phase"), so timing stays exact as speed rises.
// ratio = debris angular speed / ship angular speed.
export const DEBRIS = {
  capacity: 64,
  sizeMin: 0.28,
  sizeMax: 0.46,
  hitScale: 0.85, // collision radius as a fraction of visual size
  tumbleMin: 0.6,
  tumbleMax: 2.2,
  spawnInTime: 0.35, // scale-in seconds
  despawnPhase: 1.3, // radians past the ship before fading out
  despawnTime: 0.35,
  rimPower: 2.2,
  rimStrength: 1.4,
  drifterRatio: [0.15, 0.55],
};

export const SPAWNER = {
  lookaheadStart: 2.6, // radians of ship travel ahead that are planned and visible
  lookaheadMax: 3.4,
  minLeadPhase: 1.0, // never place debris closer than this ahead of the ship
  // Reaction time allowed on top of the switch itself, between blocks on opposite lanes.
  minSwitchGap: 0.42, // seconds at the start
  minSwitchGapEnd: 0.16, // ...and at full difficulty
  patternGapStart: 1.05, // seconds of breathing room between patterns
  patternGapEnd: 0.35,
  firstPatternDelay: 1.4, // seconds after start before the first block
};

export const DIFFICULTY = {
  timeConstant: 45, // d(t) = 1 - exp(-t / timeConstant)
};

export const STATES = {
  dyingDuration: 0.6,
  restartLockout: 0.25, // ignore taps right after game over appears
};

export const INPUT = {
  keys: ['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'Enter'],
};

export const SCORE = {
  perSecond: 10,
  shard: 50,
  closeToBest: 0.2, // show "missed your best by N" within this fraction of the best
  popEvery: 100, // score counter pops each time it passes a multiple of this
  storageKey: 'perihelion.best',
};

export const GRAZE = {
  multiplierCap: 8,
  decayAfter: 4, // seconds without a graze before the multiplier drops a step
  slowmoDuration: 0.15, // real seconds
  slowmoScale: 0.4,
};
