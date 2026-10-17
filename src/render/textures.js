import * as THREE from 'three';

const GLOW_TEXTURE_SIZE = 256;
const GRADIENT_TEXTURE_HEIGHT = 512;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Soft additive glow: hot center fading through `outer` to transparent.
export function radialGlowTexture(inner, outer) {
  const s = GLOW_TEXTURE_SIZE;
  const c = canvas(s, s);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.18, outer);
  grad.addColorStop(0.45, hexAlpha(outer, 0.25));
  grad.addColorStop(1, hexAlpha(outer, 0));
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Screen-space vertical gradient for scene.background.
export function verticalGradientTexture(top, bottom) {
  const c = canvas(2, GRADIENT_TEXTURE_HEIGHT);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, GRADIENT_TEXTURE_HEIGHT);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, GRADIENT_TEXTURE_HEIGHT);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function hexAlpha(hex, a) {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
}
