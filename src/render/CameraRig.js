import * as THREE from 'three';
import { CAMERA, RENDER } from '../config.js';

const DEG = Math.PI / 180;

// Perspective camera angled down at the planet, with a slow breathing drift.
export class CameraRig {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(RENDER.fov, aspect, RENDER.near, RENDER.far);
    this.yaw = 0;
    this.distanceScale = 1; // <1 pushes in, >1 kicks back
    this.offset = new THREE.Vector3(); // shake, added on top
    this.target = new THREE.Vector3(0, CAMERA.lookAtY, 0);
    this.update(0, 0, false);
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt, time, idleOrbit) {
    if (idleOrbit) this.yaw += CAMERA.readyOrbitSpeed * dt;

    const pitch = CAMERA.pitchDeg * DEG;
    const d = CAMERA.distance * this.distanceScale;
    const horiz = Math.cos(pitch) * d;
    const b = time * CAMERA.breatheSpeed;

    this.camera.position.set(
      Math.sin(this.yaw) * horiz + Math.sin(b * 1.3) * CAMERA.breatheAmp,
      Math.sin(pitch) * d + Math.sin(b) * CAMERA.breatheAmp,
      Math.cos(this.yaw) * horiz + Math.cos(b * 0.7) * CAMERA.breatheAmp,
    );
    this.camera.position.add(this.offset);
    this.camera.lookAt(this.target);
  }
}
