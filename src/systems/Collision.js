import { SHIP } from '../config.js';

// Checks every live rock against the ship. Returns the rock that hit, or null.
// A rock that comes within graze range and leaves without touching calls onGraze once.
export function checkCollisions(ship, debris, onGraze) {
  const sx = ship.position.x;
  const sz = ship.position.z;
  for (const r of debris.all) {
    if (!r.active || r.harmless) continue;
    const dx = r.position.x - sx;
    const dz = r.position.z - sz;
    const d2 = dx * dx + dz * dz;
    const hit = SHIP.hitRadius + r.hitRadius;
    if (d2 < hit * hit) return r;
    const graze = SHIP.grazeRadius + r.hitRadius;
    if (d2 < graze * graze) {
      r.grazing = true;
    } else if (r.grazing && !r.grazed) {
      r.grazed = true;
      onGraze(r);
    }
  }
  return null;
}
