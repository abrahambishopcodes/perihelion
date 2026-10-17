import * as THREE from 'three';
import { PARTICLES } from '../config.js';

const particleVertex = /* glsl */ `
  attribute vec3 aColor;
  attribute float aLife; // 1 at birth, 0 when gone
  uniform float uSize;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vLife;
  void main() {
    vColor = aColor;
    vLife = aLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uPixelRatio * (0.35 + 0.65 * aLife) * (12.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const particleFragment = /* glsl */ `
  varying vec3 vColor;
  varying float vLife;
  void main() {
    if (vLife <= 0.0) discard;
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vLife;
    gl_FragColor = vec4(vColor * (1.0 + vLife), a);
  }
`;

const rand = (r) => r[0] + Math.random() * (r[1] - r[0]);
const _c = new THREE.Color();

// One pooled, additive point cloud for every spark, debris shard and explosion.
export class Particles {
  constructor(scene, pixelRatio) {
    const n = PARTICLES.capacity;
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n); // seconds left
    this.maxLife = new Float32Array(n);
    this.next = 0;

    this.geometry = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.col = new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.lifeAttr = new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.pos);
    this.geometry.setAttribute('aColor', this.col);
    this.geometry.setAttribute('aLife', this.lifeAttr);

    this.material = new THREE.ShaderMaterial({
      uniforms: { uSize: { value: PARTICLES.size }, uPixelRatio: { value: pixelRatio } },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  setPixelRatio(pr) {
    this.material.uniforms.uPixelRatio.value = pr;
  }

  clear() {
    this.life.fill(0);
    this.lifeAttr.array.fill(0);
    this.lifeAttr.needsUpdate = true;
  }

  // Burst of `count` particles from `at`. dir (optional) biases them along a direction in the orbit plane.
  burst(at, count, color, speed, life, dir = null, spread = 1) {
    _c.set(color);
    const n = PARTICLES.capacity;
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % n;
      const a = Math.random() * Math.PI * 2;
      const up = (Math.random() - 0.5) * 0.8;
      const s = rand(speed);
      let vx = Math.cos(a) * s;
      let vz = Math.sin(a) * s;
      if (dir) {
        vx = vx * spread + dir.x * s;
        vz = vz * spread + dir.z * s;
      }
      this.vel[i * 3] = vx;
      this.vel[i * 3 + 1] = up * s;
      this.vel[i * 3 + 2] = vz;
      this.pos.array[i * 3] = at.x;
      this.pos.array[i * 3 + 1] = at.y;
      this.pos.array[i * 3 + 2] = at.z;
      this.col.array[i * 3] = _c.r;
      this.col.array[i * 3 + 1] = _c.g;
      this.col.array[i * 3 + 2] = _c.b;
      this.life[i] = this.maxLife[i] = rand(life);
    }
    this.col.needsUpdate = true;
  }

  update(dt) {
    const drag = Math.exp(-PARTICLES.drag * dt);
    const p = this.pos.array;
    const l = this.lifeAttr.array;
    for (let i = 0; i < PARTICLES.capacity; i++) {
      if (this.life[i] <= 0) {
        l[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      this.vel[i * 3] *= drag;
      this.vel[i * 3 + 1] *= drag;
      this.vel[i * 3 + 2] *= drag;
      p[i * 3] += this.vel[i * 3] * dt;
      p[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      p[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      l[i] = Math.max(0, this.life[i] / this.maxLife[i]);
    }
    this.pos.needsUpdate = true;
    this.lifeAttr.needsUpdate = true;
  }
}
