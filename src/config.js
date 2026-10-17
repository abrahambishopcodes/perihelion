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
