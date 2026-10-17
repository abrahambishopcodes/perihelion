import * as THREE from 'three';
import { COLORS, PLANET } from '../config.js';
import { planetVertex, planetFragment } from '../render/shaders/planet.js';
import { radialGlowTexture } from '../render/textures.js';

export class Planet {
  constructor(scene) {
    this.group = new THREE.Group();

    this.uniforms = {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uBody: { value: new THREE.Color(COLORS.planetBody) },
      uCore: { value: new THREE.Color(COLORS.planetCore) },
      uHot: { value: new THREE.Color(COLORS.planetHot) },
      uRimPower: { value: PLANET.rimPower },
      uRimStrength: { value: PLANET.rimStrength },
      uNoiseScale: { value: PLANET.noiseScale },
      uNoiseSpeed: { value: PLANET.noiseSpeed },
      uPulseSpeed: { value: PLANET.pulseSpeed },
    };

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(PLANET.radius, PLANET.segments, PLANET.segments / 2),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
      }),
    );
    this.group.add(this.mesh);

    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: radialGlowTexture(COLORS.planetHot, COLORS.planetCore),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: PLANET.glowOpacity,
        fog: false,
      }),
    );
    this.glow.scale.setScalar(PLANET.glowSize);
    this.glow.renderOrder = -1;
    this.group.add(this.glow);

    // The planet is the scene's light source.
    this.light = new THREE.PointLight(COLORS.planetHot, PLANET.lightIntensity, PLANET.lightDistance, 1.6);
    this.group.add(this.light);

    scene.add(this.group);
  }

  // amount 0..1, decays in update()
  pulse(amount) {
    this.uniforms.uPulse.value = Math.min(1, this.uniforms.uPulse.value + amount);
  }

  update(dt, time) {
    this.uniforms.uTime.value = time;
    this.uniforms.uPulse.value *= Math.exp(-dt * PLANET.pulseDecay);
    this.mesh.rotation.y += PLANET.rotationSpeed * dt;
    const p = this.uniforms.uPulse.value;
    this.glow.material.opacity = PLANET.glowOpacity * (1 + p * PLANET.glowPulseBoost);
  }
}
