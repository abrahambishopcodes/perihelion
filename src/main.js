import * as THREE from 'three';
import { COLORS, INPUT, LOOP, RENDER } from './config.js';
import { CameraRig } from './render/CameraRig.js';
import { Starfield } from './render/Starfield.js';
import { OrbitRings } from './render/OrbitRings.js';
import { verticalGradientTexture } from './render/textures.js';
import { Planet } from './entities/Planet.js';
import { Game } from './Game.js';
import './style.css';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, RENDER.maxPixelRatio));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = RENDER.toneMappingExposure;

const scene = new THREE.Scene();
scene.background = verticalGradientTexture(COLORS.bgTop, COLORS.bgBottom);
scene.fog = new THREE.FogExp2(COLORS.fog, RENDER.fogDensity);

const rig = new CameraRig(innerWidth / innerHeight);
const starfield = new Starfield(scene, renderer.getPixelRatio());
const rings = new OrbitRings(scene);
const planet = new Planet(scene);
const game = new Game({ scene, rig, planet, rings });
if (import.meta.env.DEV) window.__game = game; // for poking at the game from the console

function resize() {
  const pr = Math.min(devicePixelRatio, RENDER.maxPixelRatio);
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  rig.setAspect(innerWidth / innerHeight);
  starfield.setPixelRatio(pr);
}
addEventListener('resize', resize);
addEventListener('orientationchange', resize);

// Input: pointerdown for instant touch response, plus keys. Buttons in the HUD handle themselves.
addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, a')) return;
  e.preventDefault();
  game.press();
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.repeat || !INPUT.keys.includes(e.code)) return;
  e.preventDefault();
  game.press();
});
for (const type of ['touchmove', 'gesturestart', 'dblclick', 'contextmenu']) {
  addEventListener(type, (e) => e.preventDefault(), { passive: false });
}

// Pause when the tab loses focus.
document.addEventListener('visibilitychange', () => document.hidden && game.pause());
addEventListener('blur', () => game.pause());

// Fixed-timestep simulation, variable-rate rendering.
let last = performance.now();
let acc = 0;
let time = 0;

function step(dt) {
  time += dt;
  game.step(dt);
  planet.update(dt, time);
  rings.update(dt);
  starfield.update(dt, time);
}

function frame(now) {
  const frameDt = Math.min((now - last) / 1000, LOOP.maxFrameDt);
  last = now;
  if (!game.paused) {
    acc += frameDt;
    let steps = 0;
    while (acc >= LOOP.fixedDt && steps < LOOP.maxStepsPerFrame) {
      step(LOOP.fixedDt);
      acc -= LOOP.fixedDt;
      steps++;
    }
    if (steps === LOOP.maxStepsPerFrame) acc = 0;
    game.frame(frameDt, time);
  }
  renderer.render(scene, rig.camera);
  requestAnimationFrame(frame);
}

document.body.classList.add('loaded');
requestAnimationFrame((now) => {
  last = now;
  frame(now);
});
