import * as THREE from 'three';
import { COLORS, INPUT, LOOP, QUALITY, RENDER } from './config.js';
import { CameraRig } from './render/CameraRig.js';
import { Starfield } from './render/Starfield.js';
import { OrbitRings } from './render/OrbitRings.js';
import { Postfx } from './render/Postfx.js';
import { verticalGradientTexture } from './render/textures.js';
import { Planet } from './entities/Planet.js';
import { Game } from './Game.js';
import { PlayerCard } from './ui/PlayerCard.js';
import { cleanAddress, saveRun, signIn, whoami } from './startng.js';
import './style.css';

const canvas = document.getElementById('game');
// Antialiasing comes from the composer's multisampling instead.
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NoToneMapping; // tone mapping runs in the post-processing chain

// Quality levels: 0 full, 1 bloom only, 2 bloom only at pixel ratio 1.
let quality = 0;
try {
  quality = Number(localStorage.getItem(QUALITY.storageKey)) || 0;
} catch {
  // default to full quality
}
if (new URLSearchParams(location.search).has('low')) quality = Math.max(quality, 1);

const pixelRatio = () => Math.min(devicePixelRatio, quality >= 2 ? 1 : RENDER.maxPixelRatio);
renderer.setPixelRatio(pixelRatio());
renderer.setSize(innerWidth, innerHeight, false);

const scene = new THREE.Scene();
scene.background = verticalGradientTexture(COLORS.bgTop, COLORS.bgBottom);
scene.fog = new THREE.FogExp2(COLORS.fog, RENDER.fogDensity);

const rig = new CameraRig(innerWidth / innerHeight);
const postfx = new Postfx(renderer, scene, rig.camera);
const starfield = new Starfield(scene, renderer.getPixelRatio());
const rings = new OrbitRings(scene);
const planet = new Planet(scene);
const game = new Game({ scene, rig, planet, rings, postfx, pixelRatio: renderer.getPixelRatio() });
if (import.meta.env.DEV) window.__game = game; // for poking at the game from the console

function resize() {
  const pr = pixelRatio();
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  postfx.setSize(innerWidth, innerHeight);
  rig.setAspect(innerWidth / innerHeight);
  starfield.setPixelRatio(pr);
  game.particles.setPixelRatio(pr);
}
addEventListener('resize', resize);
addEventListener('orientationchange', resize);

function setQuality(level, remember) {
  quality = level;
  postfx.setLowQuality(level >= 1);
  game.hud.setQuality(level >= 1);
  resize();
  slowTime = 0;
  warmup = QUALITY.warmup;
  if (remember) {
    try {
      localStorage.setItem(QUALITY.storageKey, String(level));
    } catch {
      // not persisted
    }
  }
}
game.hud.onQuality = () => setQuality(quality >= 1 ? 0 : 1, true);

// Step down automatically when frames stay slow.
let slowTime = 0;
let warmup = QUALITY.warmup;
function watchFrameTime(frameDt) {
  if (warmup > 0) {
    warmup -= frameDt;
    return;
  }
  slowTime = frameDt * 1000 > QUALITY.slowFrameMs ? slowTime + frameDt : 0;
  if (slowTime >= QUALITY.slowFor && quality < 2) setQuality(quality + 1, true);
}

// start.ng: who's playing, their colour on the ship, and saving runs to the leaderboard.
cleanAddress();
const card = new PlayerCard(game.hud.root);
card.onSignIn = signIn;
let who = null;
async function refreshPlayer() {
  const reply = await whoami();
  if (!reply) return; // not on start.ng (e.g. local dev): play without a player
  who = reply;
  card.show(who);
  const color = (who.user ?? who.guest)?.style?.primaryColor;
  if (/^#[0-9a-f]{6}$/i.test(color ?? '')) game.ship.setAccentColor(color);
}
refreshPlayer();
document.addEventListener('visibilitychange', () => !document.hidden && refreshPlayer());
addEventListener('focus', refreshPlayer);

game.onRunOver = async (run) => {
  if (!who) return;
  if (!who.user) {
    game.hud.setRank('Sign in to put your runs on the leaderboard');
    return;
  }
  const saved = await saveRun(run);
  if (game.state !== 'gameover') return; // already playing again
  if (saved?.ok) {
    const { improved, rank } = saved.result;
    game.hud.setRank(improved ? `New leaderboard best · #${rank}` : `Leaderboard #${rank}`);
  } else if (saved?.error) {
    game.hud.setRank(saved.error);
  }
};

// Input: pointerdown for instant touch response, plus keys. Buttons in the HUD handle themselves.
addEventListener('pointerdown', (e) => {
  if (e.target.closest('button, a')) return;
  e.preventDefault();
  game.press();
}, { passive: false });
addEventListener('keydown', (e) => {
  if (e.repeat || !INPUT.keys.includes(e.code)) return;
  if (e.target.closest?.('button, a') && (e.code === 'Space' || e.code === 'Enter')) return;
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
    watchFrameTime(frameDt);
  }
  postfx.render(frameDt);
  requestAnimationFrame(frame);
}

setQuality(quality, false);
document.body.classList.add('loaded');
requestAnimationFrame((now) => {
  last = now;
  frame(now);
});
