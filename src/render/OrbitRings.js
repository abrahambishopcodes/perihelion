import * as THREE from 'three';
import { COLORS, RINGS } from '../config.js';

const ringVertex = /* glsl */ `
  varying vec2 vPos;
  void main() {
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Dashes are laid out by angle so they scroll around the ring.
const ringFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uDashCount;
  uniform float uScroll;
  varying vec2 vPos;

  void main() {
    float a = atan(vPos.y, vPos.x) / 6.2831853 + 0.5;
    float d = fract(a * uDashCount - uScroll);
    float dash = smoothstep(0.0, 0.08, d) * (1.0 - smoothstep(0.55, 0.63, d));
    gl_FragColor = vec4(uColor, uOpacity * (0.35 + 0.65 * dash));
  }
`;

export class OrbitRings {
  constructor(scene) {
    this.rings = [RINGS.innerRadius, RINGS.outerRadius].map((r, i) => {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(COLORS.ship) },
          uOpacity: { value: RINGS.baseOpacity },
          uDashCount: { value: Math.round(RINGS.dashCount * (r / RINGS.outerRadius)) },
          uScroll: { value: 0 },
        },
        vertexShader: ringVertex,
        fragmentShader: ringFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(r - RINGS.width / 2, r + RINGS.width / 2, RINGS.segments, 1),
        material,
      );
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      // Inner and outer dashes scroll in opposite directions.
      return { mesh, material, direction: i === 0 ? 1 : -1 };
    });
    this.active = -1; // 0 inner, 1 outer, -1 none
  }

  setScale(scale) {
    for (const ring of this.rings) ring.mesh.scale.setScalar(scale);
  }

  setActive(index) {
    this.active = index;
  }

  update(dt) {
    const k = 1 - Math.exp(-dt * RINGS.fadeSpeed);
    for (let i = 0; i < this.rings.length; i++) {
      const ring = this.rings[i];
      const u = ring.material.uniforms;
      u.uScroll.value += ring.direction * RINGS.dashScrollSpeed * dt;
      const target = i === this.active ? RINGS.activeOpacity : RINGS.baseOpacity;
      u.uOpacity.value += (target - u.uOpacity.value) * k;
    }
  }
}
