import * as THREE from 'three';
import { COLORS, TRAIL } from '../config.js';

const trailVertex = /* glsl */ `
  attribute float aSide; // -1 or 1 across the ribbon
  attribute float aT;    // 0 at the ship, 1 at the tail
  varying float vSide;
  varying float vT;
  void main() {
    vSide = aSide;
    vT = aT;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const trailFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uCoreWhite;
  varying float vSide;
  varying float vT;
  void main() {
    float head = 1.0 - vT;
    float across = 1.0 - abs(vSide);
    float edge = smoothstep(0.0, 0.85, across);
    float core = pow(across, 3.0) * pow(head, 4.0) * uCoreWhite;
    vec3 col = mix(uColor, vec3(1.0), core);
    float alpha = pow(head, 1.6) * edge;
    gl_FragColor = vec4(col * uIntensity * alpha, alpha);
  }
`;

// Ribbon behind the ship: a fading additive quad strip that follows the path it flew.
export class Trail {
  constructor(scene) {
    const n = TRAIL.segments;
    this.points = Array.from({ length: n }, () => new THREE.Vector3());
    this.head = 0; // index of the newest sample
    this.filled = 0;
    this.sinceSample = 0;
    this.opacity = 1;

    const positions = new Float32Array(n * 2 * 3);
    const sides = new Float32Array(n * 2);
    const ts = new Float32Array(n * 2);
    const index = [];
    for (let i = 0; i < n; i++) {
      sides[i * 2] = -1;
      sides[i * 2 + 1] = 1;
      ts[i * 2] = ts[i * 2 + 1] = i / (n - 1);
      if (i < n - 1) {
        const a = i * 2;
        index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    this.geometry = new THREE.BufferGeometry();
    this.position = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.position);
    this.geometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
    this.geometry.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
    this.geometry.setIndex(index);

    this.uniforms = {
      uColor: { value: new THREE.Color(COLORS.ship) },
      uIntensity: { value: TRAIL.intensity },
      uCoreWhite: { value: TRAIL.coreWhite },
    };
    this.mesh = new THREE.Mesh(
      this.geometry,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: trailVertex,
        fragmentShader: trailFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.width = TRAIL.width;
  }

  reset(at) {
    for (const p of this.points) p.copy(at);
    this.filled = this.points.length;
    this.opacity = 1;
  }

  // multiplier widens and brightens the ribbon.
  setMultiplier(m) {
    this.width = TRAIL.width * (1 + (m - 1) * TRAIL.widthPerMultiplier);
    this.uniforms.uIntensity.value = TRAIL.intensity * (1 + (m - 1) * TRAIL.intensityPerMultiplier) * this.opacity;
  }

  fade(dt) {
    this.opacity = Math.max(0, this.opacity - dt / TRAIL.fadeOutTime);
  }

  // Sample the ship position on a fixed interval; the newest point always tracks the ship.
  update(dt, shipPos) {
    const pts = this.points;
    const n = pts.length;
    this.sinceSample += dt;
    if (this.sinceSample >= TRAIL.sampleInterval) {
      this.sinceSample %= TRAIL.sampleInterval;
      this.head = (this.head + 1) % n;
    }
    pts[this.head].copy(shipPos);

    const arr = this.position.array;
    for (let i = 0; i < n; i++) {
      const p = pts[(this.head - i + n) % n];
      const q = pts[(this.head - Math.min(i + 1, n - 1) + n) % n];
      const o = pts[(this.head - Math.max(i - 1, 0) + n) % n];
      // Perpendicular to the path in the orbit plane.
      let dx = o.x - q.x;
      let dz = o.z - q.z;
      const len = Math.hypot(dx, dz) || 1;
      const taper = 1 - i / (n - 1);
      const w = this.width * (0.25 + 0.75 * taper);
      dx = (-dz / len) * w;
      dz = ((o.x - q.x) / len) * w;
      arr[i * 6] = p.x - dx;
      arr[i * 6 + 1] = p.y;
      arr[i * 6 + 2] = p.z - dz;
      arr[i * 6 + 3] = p.x + dx;
      arr[i * 6 + 4] = p.y;
      arr[i * 6 + 5] = p.z + dz;
    }
    this.position.needsUpdate = true;
  }
}
