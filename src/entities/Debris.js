import * as THREE from 'three';
import { COLORS, DEBRIS, ORBIT } from '../config.js';
import { polar } from './Ship.js';

const smooth = (t) => t * t * (3 - 2 * t);

// Flat-shaded slate with a magenta fresnel rim so threats read instantly.
function rimMaterial() {
  const material = new THREE.MeshStandardMaterial({
    color: COLORS.debris,
    flatShading: true,
    roughness: 0.85,
    metalness: 0.1,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: new THREE.Color(COLORS.debrisRim) };
    shader.uniforms.uRimPower = { value: DEBRIS.rimPower };
    shader.uniforms.uRimStrength = { value: DEBRIS.rimStrength };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uRim;\nuniform float uRimPower;\nuniform float uRimStrength;',
      )
      .replace(
        '#include <opaque_fragment>',
        `float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), uRimPower);
        outgoingLight += uRim * rimF * uRimStrength;
        #include <opaque_fragment>`,
      );
  };
  return material;
}

class Rock {
  constructor() {
    this.active = false;
    this.axis = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.position = new THREE.Vector3();
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

export class Debris {
  constructor(scene) {
    this.rocks = Array.from({ length: DEBRIS.capacity }, () => new Rock());
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), rimMaterial(), DEBRIS.capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  clear() {
    for (const r of this.rocks) r.active = false;
    this.mesh.count = 0;
  }

  // encounter: the ship angle at which this rock meets the ship. ratio: its speed / ship speed.
  spawn(lane, encounter, ratio) {
    let r = null;
    for (const x of this.rocks) if (!x.active) { r = x; break; }
    if (!r) return null;
    r.active = true;
    r.lane = lane;
    r.encounter = encounter;
    r.ratio = ratio;
    r.size = DEBRIS.sizeMin + Math.random() * (DEBRIS.sizeMax - DEBRIS.sizeMin);
    r.hitRadius = r.size * DEBRIS.hitScale;
    r.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    r.tumble = DEBRIS.tumbleMin + Math.random() * (DEBRIS.tumbleMax - DEBRIS.tumbleMin);
    r.quat.setFromAxisAngle(r.axis, Math.random() * Math.PI * 2);
    r.age = 0;
    r.fade = 0; // 0 alive, rises to 1 while despawning
    r.grazing = false;
    r.grazed = false;
    r.harmless = false;
    return r;
  }

  update(dt, shipAngle, orbitScale) {
    let n = 0;
    for (const r of this.rocks) {
      if (!r.active) continue;
      r.age += dt;
      if (shipAngle - r.encounter > DEBRIS.despawnPhase) {
        r.harmless = true;
        r.fade += dt / DEBRIS.despawnTime;
        if (r.fade >= 1) {
          r.active = false;
          continue;
        }
      }

      const angle = r.encounter + r.ratio * (shipAngle - r.encounter);
      const radius = (r.lane === 0 ? ORBIT.innerRadius : ORBIT.outerRadius) * orbitScale;
      polar(angle, radius, r.position);

      _q.setFromAxisAngle(r.axis, r.tumble * dt);
      r.quat.multiply(_q);
      const grow = smooth(Math.min(1, r.age / DEBRIS.spawnInTime));
      _s.setScalar(r.size * grow * (1 - smooth(Math.min(1, r.fade))));
      _m.compose(r.position, r.quat, _s);
      this.mesh.setMatrixAt(n++, _m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
