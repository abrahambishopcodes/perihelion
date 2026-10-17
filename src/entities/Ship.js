import * as THREE from 'three';
import { COLORS, ORBIT, SHIP } from '../config.js';

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

function arrowGeometry(len) {
  const w = len * 0.42;
  const h = len * 0.22;
  const nose = [0, 0, len * 0.6];
  const left = [-w, 0, -len * 0.4];
  const right = [w, 0, -len * 0.4];
  const notch = [0, 0, -len * 0.2];
  const top = [0, h, -len * 0.15];
  const bottom = [0, -h * 0.5, -len * 0.15];
  // Non-indexed so every face is flat-shaded.
  const tris = [
    nose, left, top, nose, top, right, left, notch, top, notch, right, top,
    nose, bottom, left, nose, right, bottom, left, bottom, notch, notch, bottom, right,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}

export class Ship {
  constructor(scene) {
    this.group = new THREE.Group();
    this.body = new THREE.Group(); // banks inside the heading group
    this.group.add(this.body);

    const hull = new THREE.Mesh(
      arrowGeometry(SHIP.size),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(COLORS.ship).multiplyScalar(SHIP.glow) }),
    );
    this.body.add(hull);

    // Small marking in the player's start.ng colour, on the dorsal ridge.
    this.accent = new THREE.Mesh(
      new THREE.BoxGeometry(SHIP.size * 0.1, SHIP.size * 0.05, SHIP.size * 0.3),
      new THREE.MeshBasicMaterial({ color: COLORS.ship }),
    );
    this.accent.position.set(0, SHIP.size * 0.16, -SHIP.size * 0.12);
    this.accent.visible = false;
    this.body.add(this.accent);

    scene.add(this.group);

    this.position = new THREE.Vector3(); // world position, read by collision and effects
    this.reset();
  }

  setAccentColor(hex) {
    this.accent.material.color.set(hex);
    this.accent.visible = true;
  }

  reset(angle = SHIP.startAngle) {
    this.angle = angle; // also the "phase" debris timing is measured in
    this.lane = 1; // 0 inner, 1 outer
    this.u = 1; // 0 = inner orbit, 1 = outer orbit
    this.fromU = 1;
    this.switchT = 1;
    this.switchDur = 0;
    this.roll = 0;
    this.radius = ORBIT.outerRadius;
    polar(this.angle, this.radius, this.position);
    this.group.visible = true;
  }

  get switching() {
    return this.switchT < this.switchDur;
  }

  // Toggle the target lane. Mid-switch this reverses from wherever the ship is.
  toggle() {
    this.lane = 1 - this.lane;
    this.fromU = this.u;
    this.switchDur = SHIP.switchDuration * Math.abs(this.lane - this.u);
    this.switchT = 0;
  }

  update(dt, angularSpeed, orbitScale, time) {
    this.angle += angularSpeed * dt;

    if (this.switching) {
      this.switchT = Math.min(this.switchT + dt, this.switchDur);
      this.u = this.fromU + (this.lane - this.fromU) * easeOutCubic(this.switchT / this.switchDur);
    } else {
      this.u = this.lane;
    }

    // Bank toward the switch: outward is a roll one way, inward the other.
    const remaining = this.switching ? 1 - this.switchT / this.switchDur : 0;
    const targetRoll = Math.sign(this.lane - this.fromU) * SHIP.bankAngle * remaining;
    this.roll += (targetRoll - this.roll) * (1 - Math.exp(-dt * SHIP.bankResponse));

    this.radius = (ORBIT.innerRadius + (ORBIT.outerRadius - ORBIT.innerRadius) * this.u) * orbitScale;
    polar(this.angle, this.radius, this.position);
    this.position.y = Math.sin(time * SHIP.hoverSpeed) * SHIP.hoverAmp;

    this.group.position.copy(this.position);
    // Face along the orbit (counter-clockwise on screen).
    this.group.rotation.set(0, this.angle + Math.PI, 0);
    this.body.rotation.z = this.roll;
  }
}

// Polar (angle, radius) on the XZ plane; angle grows counter-clockwise seen from above.
export function polar(angle, radius, out) {
  out.x = Math.cos(angle) * radius;
  out.y = 0;
  out.z = -Math.sin(angle) * radius;
  return out;
}
