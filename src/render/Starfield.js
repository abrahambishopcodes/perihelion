import * as THREE from 'three';
import { STARFIELD } from '../config.js';

const starVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uTwinkleSpeed;
  varying float vTwinkle;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vTwinkle = 0.65 + 0.35 * sin(uTime * uTwinkleSpeed * (0.5 + aSeed) + aSeed * 40.0);
    gl_PointSize = uSize * uPixelRatio * (0.6 + aSeed * 0.8);
    gl_Position = projectionMatrix * mv;
  }
`;

const starFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vTwinkle;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), a * vTwinkle * uOpacity);
  }
`;

// Points on a sphere shell around the scene, in parallax layers that rotate at different speeds.
export class Starfield {
  constructor(scene, pixelRatio) {
    this.layers = STARFIELD.layers.map((layer) => {
      const positions = new Float32Array(layer.count * 3);
      const seeds = new Float32Array(layer.count);
      for (let i = 0; i < layer.count; i++) {
        const u = Math.random() * 2 - 1;
        const theta = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const r = layer.radius * (0.85 + Math.random() * 0.15);
        positions[i * 3] = s * Math.cos(theta) * r;
        positions[i * 3 + 1] = u * r;
        positions[i * 3 + 2] = s * Math.sin(theta) * r;
        seeds[i] = Math.random();
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: layer.size },
          uPixelRatio: { value: pixelRatio },
          uTwinkleSpeed: { value: STARFIELD.twinkleSpeed },
          uOpacity: { value: layer.opacity },
        },
        vertexShader: starVertex,
        fragmentShader: starFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      scene.add(points);
      return { points, material, speed: layer.rotationSpeed };
    });
  }

  setPixelRatio(pr) {
    for (const l of this.layers) l.material.uniforms.uPixelRatio.value = pr;
  }

  update(dt, time) {
    for (const l of this.layers) {
      l.points.rotation.y += l.speed * dt;
      l.material.uniforms.uTime.value = time;
    }
  }
}
