import * as THREE from 'three';
import { COLORS, COMET, DEBRIS, ORBIT, PLANET } from '../config.js';
import { polar } from './Ship.js';

const smooth = (t) => t * t * (3 - 2 * t);
const laneRadius = (lane, scale) => (lane === 0 ? ORBIT.innerRadius : ORBIT.outerRadius) * scale;

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

// A flat strip lying on the orbit plane, running outward from z = 0 to z = 1 in its group.
function radialStrip() {
  return new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
}

const stripVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Telegraph: dashes racing toward the planet. vUv.y is 1 at the planet end.
const telegraphFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float dash = step(0.5, fract((1.0 - vUv.y) * 14.0 + uTime * 3.0));
    float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
    gl_FragColor = vec4(uColor, uOpacity * (0.35 + 0.65 * dash) * edge);
  }
`;

// Tail: bright at the comet, fading outward.
const tailFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float along = vUv.y;
    float across = 1.0 - abs(vUv.x - 0.5) * 2.0;
    gl_FragColor = vec4(uColor, uOpacity * along * along * across * across);
  }
`;

function stripMaterial(fragmentShader, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(COLORS.debrisRim) },
      uOpacity: { value: opacity },
      uTime: { value: 0 },
    },
    vertexShader: stripVertex,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

class Rock {
  constructor() {
    this.active = false;
    this.axis = new THREE.Vector3();
    this.quat = new THREE.Quaternion();
    this.position = new THREE.Vector3();
  }
}

class Comet {
  constructor(scene, material) {
    this.active = false;
    this.position = new THREE.Vector3();
    this.group = new THREE.Group();
    this.body = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), material);
    this.tail = new THREE.Mesh(radialStrip(), stripMaterial(tailFragment, 1));
    this.telegraph = new THREE.Mesh(radialStrip(), stripMaterial(telegraphFragment, COMET.telegraphOpacity));
    this.group.add(this.body, this.tail, this.telegraph);
    this.group.visible = false;
    scene.add(this.group);
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

export class Debris {
  constructor(scene) {
    const material = rimMaterial();
    this.rocks = Array.from({ length: DEBRIS.capacity }, () => new Rock());
    this.comets = Array.from({ length: COMET.capacity }, () => new Comet(scene, material));
    this.all = [...this.rocks, ...this.comets]; // for collision
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), material, DEBRIS.capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.onCometImpact = null;
  }

  clear() {
    for (const r of this.all) r.active = false;
    for (const c of this.comets) c.group.visible = false;
    this.mesh.count = 0;
  }

  init(r, lane, encounter) {
    r.active = true;
    r.lane = lane;
    r.encounter = encounter;
    r.size = DEBRIS.sizeMin + Math.random() * (DEBRIS.sizeMax - DEBRIS.sizeMin);
    r.hitRadius = r.size * DEBRIS.hitScale;
    r.age = 0;
    r.fade = 0; // 0 alive, rises to 1 while despawning
    r.grazing = false;
    r.grazed = false;
    r.harmless = false;
    return r;
  }

  // encounter: the ship angle at which this rock meets the ship. ratio: its speed / ship speed.
  spawn(lane, encounter, ratio) {
    let r = null;
    for (const x of this.rocks) if (!x.active) { r = x; break; }
    if (!r) return null;
    this.init(r, lane, encounter);
    r.ratio = ratio;
    r.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    r.tumble = DEBRIS.tumbleMin + Math.random() * (DEBRIS.tumbleMax - DEBRIS.tumbleMin);
    r.quat.setFromAxisAngle(r.axis, Math.random() * Math.PI * 2);
    return r;
  }

  // A comet falls straight at the planet along the encounter angle.
  // radialSpeed: radius lost per radian the ship travels.
  spawnComet(lane, encounter, radialSpeed) {
    let c = null;
    for (const x of this.comets) if (!x.active) { c = x; break; }
    if (!c) return null;
    this.init(c, lane, encounter);
    c.radialSpeed = radialSpeed;
    c.group.visible = true;
    c.group.rotation.y = encounter + Math.PI / 2; // local +z points away from the planet
    return c;
  }

  update(dt, shipAngle, orbitScale, time) {
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
      polar(angle, laneRadius(r.lane, orbitScale), r.position);

      _q.setFromAxisAngle(r.axis, r.tumble * dt);
      r.quat.multiply(_q);
      const grow = smooth(Math.min(1, r.age / DEBRIS.spawnInTime));
      _s.setScalar(r.size * grow * (1 - smooth(Math.min(1, r.fade))));
      _m.compose(r.position, r.quat, _s);
      this.mesh.setMatrixAt(n++, _m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;

    for (const c of this.comets) {
      if (!c.active) continue;
      const radius = laneRadius(c.lane, orbitScale) + (c.encounter - shipAngle) * c.radialSpeed;
      const outer = ORBIT.outerRadius * orbitScale;
      const start = COMET.startRadius;

      if (radius <= PLANET.radius) {
        c.active = false;
        c.group.visible = false;
        this.onCometImpact?.(c);
        continue;
      }
      polar(c.encounter, radius, c.position);

      // Warning streak until the comet reaches the outer orbit.
      const warn = c.telegraph;
      warn.visible = radius > outer;
      if (warn.visible) {
        warn.position.z = PLANET.radius;
        warn.scale.set(COMET.telegraphWidth, 1, start - PLANET.radius);
        const u = warn.material.uniforms;
        u.uTime.value = time;
        u.uOpacity.value = COMET.telegraphOpacity * (0.6 + 0.4 * Math.sin(time * COMET.telegraphBlink));
      }

      const shown = radius < start;
      c.body.visible = shown;
      c.tail.visible = shown;
      if (shown) {
        c.body.position.z = radius;
        c.body.scale.set(c.size, c.size, c.size * COMET.stretch);
        c.tail.position.z = radius;
        c.tail.scale.set(COMET.tailWidth, 1, COMET.tailLength);
      }
    }
  }
}
