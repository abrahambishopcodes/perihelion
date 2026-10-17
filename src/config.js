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
  minAspect: 0.95, // narrower screens (portrait phones) pull the camera back to keep both orbits in view
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
  glowOpacity: 0.38,
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
  // Speed ratios per kind. Retrograde runs backwards; a pincer's chaser closes from behind.
  drifterRatio: [0.15, 0.55],
  retroRatio: [-0.75, -0.45],
  chaserRatio: [1.45, 1.7],
  maxAhead: 3.6, // radians ahead of the ship a rock may appear
  maxBehind: 1.6, // radians behind (chasers)
  unlock: { retro: 15, comet: 30, pincer: 50 }, // seconds into a run
};

export const COMET = {
  startRadius: 14, // where it appears, outside the outer orbit
  travelTime: 0.4, // seconds from appearing to the outer orbit
  telegraphTime: 0.8, // warning streak shows this long before it reaches the outer orbit
  stretch: 2.4, // length / width of the body
  tailLength: 3.6,
  tailWidth: 0.6,
  tailIntensity: 2.4,
  telegraphWidth: 0.12,
  telegraphOpacity: 0.55,
  telegraphBlink: 9, // rad/s
  capacity: 4,
  impactPulse: 0.35, // planet flash when a comet lands
  crossingMargin: 1.4, // clearance factor when it crosses the lane the ship dodged into
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
  planExtra: 1.2, // radians planned beyond the lookahead, so comets get their full warning
  wellPlanMargin: 1.25, // plan extra-wide gaps a little past the well's expected end
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

export const PICKUP = {
  shardCapacity: 16,
  shardSize: 0.16,
  shardChance: 0.35, // per rock, after the first few seconds
  shardMinTime: 4,
  shardSpin: 2.4,
  shardBob: 0.08,
  shardOffset: 0.12, // seconds after its rock passes (plus the switch time)
  magnetRadius: 1.5, // starts pulling into the ship inside this distance
  magnetTime: 0.14, // seconds to fly into the ship
  collectRadius: 0.2,
  glow: 1.8,
  wellChance: 0.08, // per pattern
  wellMinTime: 22,
  wellCooldown: 25, // seconds between wells
  wellSize: 0.42,
  wellTumble: 1.3,
  wellDuration: 6,
  wellScale: 0.72, // both orbits shrink to this
  wellEase: 0.5, // seconds to shrink and to grow back
  wellCalm: 1.4, // seconds with no rocks after the well so the shrink is safe
  wellScoreMultiplier: 2,
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

export const POSTFX = {
  multisampling: 4,
  bloomIntensity: 1.2,
  bloomThreshold: 0.2,
  bloomSmoothing: 0.35,
  bloomRadius: 0.72,
  caBase: 0.0006, // chromatic aberration offset at rest
  caMultiplier: 0.00035, // extra per multiplier step above x4
  caMultiplierFrom: 4,
  caModulationOffset: 0.25,
  vignetteOffset: 0.32,
  vignetteDarkness: 0.72,
  grainOpacity: 0.07,
};

export const QUALITY = {
  slowFrameMs: 20, // step down when frames stay slower than this...
  slowFor: 2, // ...for this many seconds
  warmup: 3, // ignore the first seconds after load or a step-down
  storageKey: 'perihelion.quality',
};

export const TRAIL = {
  segments: 56,
  sampleInterval: 1 / 90, // seconds between trail points
  width: 0.17,
  intensity: 1.4,
  coreWhite: 0.6, // white-hot core near the ship
  widthPerMultiplier: 0.08, // extra width per multiplier step
  intensityPerMultiplier: 0.09,
  fadeOutTime: 0.5, // after death
};

export const PARTICLES = {
  capacity: 600,
  size: 9, // pixels at 1x pixel ratio, scaled by distance
  drag: 2.2,
  grazeCount: 18,
  grazeSpeed: [2.5, 6],
  grazeLife: [0.25, 0.5],
  deathCount: 160,
  deathSpeed: [2, 11],
  deathLife: [0.6, 1.4],
  shardCount: 14,
  shardSpeed: [1.5, 4],
  shardLife: [0.25, 0.5],
  wellCount: 60,
  impactCount: 30,
  impactSpeed: [1, 5],
  impactLife: [0.3, 0.7],
};

export const JUICE = {
  hitStop: 0.06, // seconds frozen on impact
  deathSlowmo: 0.3, // time scale while the wreck flies apart
  deathTrauma: 0.9,
  shardTrauma: 0.12,
  grazeTrauma: 0.08,
  traumaDecay: 1.6, // per second
  shakeMax: 0.55, // world units at full trauma
  shakeFrequency: 26,
  caSpikeDeath: 0.012,
  caSpikeGraze: 0.0025,
  caDecay: 7,
  speedPushIn: 0.1, // camera moves in by this fraction at top speed
  deathKickBack: 0.12, // and kicks back by this on death
  kickDecay: 2.5,
};

export const AUDIO = {
  master: 0.7,
  muteKey: 'perihelion.muted',
  padVolume: 0.13,
  padFreqs: [55, 55.45, 82.6], // two detuned roots and a soft fifth
  padFilter: 520,
  padFilterLfoDepth: 260,
  padFilterLfoRate: 0.07,
  duckLevel: 0.25,
  duckTime: 0.25,
  beatInterval: 0.75, // seconds; the planet breathes on this beat
  beatVolume: 0.1,
  beatPulse: 0.12,
  switchVolume: 0.22,
  switchTime: 0.12,
  grazeVolume: 0.2,
  grazeBase: 523.25, // C5
  pentatonic: [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24],
  shardVolume: 0.18,
  shardNotes: [1318.5, 1975.5], // E6, B6
  deathVolume: 0.5,
  wellVolume: 0.3,
};
