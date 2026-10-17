import * as THREE from 'three';
import { COLORS, DEBRIS, ORBIT, PICKUP } from '../config.js';
import { polar } from './Ship.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

class Item {
  constructor() {
    this.active = false;
    this.position = new THREE.Vector3();
    this.from = new THREE.Vector3(); // where the magnet pull started
  }
}

// Lime rewards: core shards (instanced) and the rare gravity well. Both sit still on a lane.
export class Pickups {
  constructor(scene) {
    const lime = new THREE.Color(COLORS.pickup).multiplyScalar(PICKUP.glow);
    this.shards = Array.from({ length: PICKUP.shardCapacity }, () => new Item());
    this.shardMesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(PICKUP.shardSize, 0),
      new THREE.MeshBasicMaterial({ color: lime }),
      PICKUP.shardCapacity,
    );
    this.shardMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shardMesh.count = 0;
    this.shardMesh.frustumCulled = false;
    scene.add(this.shardMesh);

    this.well = new Item();
    this.wellMesh = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: lime, wireframe: true });
    this.wellMesh.add(
      new THREE.Mesh(new THREE.TorusGeometry(PICKUP.wellSize, PICKUP.wellSize * 0.18, 6, 18), ringMat),
      new THREE.Mesh(new THREE.TorusGeometry(PICKUP.wellSize * 0.55, PICKUP.wellSize * 0.12, 6, 14), ringMat),
      new THREE.Mesh(new THREE.OctahedronGeometry(PICKUP.wellSize * 0.3, 0), new THREE.MeshBasicMaterial({ color: lime })),
    );
    this.wellMesh.visible = false;
    scene.add(this.wellMesh);

    this.onCollect = null; // (kind, item) => void
  }

  clear() {
    for (const s of this.shards) s.active = false;
    this.well.active = false;
    this.wellMesh.visible = false;
    this.shardMesh.count = 0;
  }

  init(item, lane, angle, kind) {
    item.active = true;
    item.kind = kind;
    item.lane = lane;
    item.angle = angle;
    item.age = 0;
    item.pull = -1; // seconds into the magnet pull, -1 = not pulled yet
    return item;
  }

  spawnShard(lane, angle) {
    for (const s of this.shards) if (!s.active) return this.init(s, lane, angle, 'shard');
    return null;
  }

  spawnWell(lane, angle) {
    if (this.well.active) return null;
    this.wellMesh.visible = true;
    return this.init(this.well, lane, angle, 'well');
  }

  // Returns nothing; collected items go to onCollect.
  updateItem(item, dt, ship, orbitScale, time) {
    item.age += dt;
    if (ship.angle - item.angle > DEBRIS.despawnPhase) {
      item.active = false;
      return;
    }
    if (item.pull < 0) {
      polar(item.angle, (item.lane === 0 ? ORBIT.innerRadius : ORBIT.outerRadius) * orbitScale, item.position);
      item.position.y = Math.sin(time * PICKUP.shardSpin + item.angle * 3) * PICKUP.shardBob;
      if (item.position.distanceTo(ship.position) < PICKUP.magnetRadius) {
        item.pull = 0;
        item.from.copy(item.position);
      }
    } else {
      // Magnetic pull: accelerate into the ship.
      item.pull += dt;
      const t = Math.min(1, item.pull / PICKUP.magnetTime);
      item.position.lerpVectors(item.from, ship.position, t * t);
      if (t >= 1 || item.position.distanceTo(ship.position) < PICKUP.collectRadius) {
        item.active = false;
        this.onCollect?.(item.kind, item);
      }
    }
  }

  update(dt, ship, orbitScale, time) {
    let n = 0;
    for (const s of this.shards) {
      if (!s.active) continue;
      this.updateItem(s, dt, ship, orbitScale, time);
      if (!s.active) continue;
      _q.setFromAxisAngle(_up, time * PICKUP.shardSpin + s.angle);
      _s.setScalar(Math.min(1, s.age / DEBRIS.spawnInTime));
      _m.compose(s.position, _q, _s);
      this.shardMesh.setMatrixAt(n++, _m);
    }
    this.shardMesh.count = n;
    this.shardMesh.instanceMatrix.needsUpdate = true;

    if (this.well.active) {
      this.updateItem(this.well, dt, ship, orbitScale, time);
      this.wellMesh.visible = this.well.active;
      this.wellMesh.position.copy(this.well.position);
      this.wellMesh.rotation.set(time * PICKUP.wellTumble, time * PICKUP.shardSpin, 0);
    }
  }
}
