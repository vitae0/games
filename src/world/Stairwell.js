import { HOTEL } from '../config.js';

// Three alternating flights between four playable floors. One stairwell replaces
// the west-side suite; the hotel levels appear to be floors 47-50 of a tall tower.
export const STAIR = Object.freeze({
  xLeft: -8.35, xRight: -5.35, width: 2.25, zLow: 7.75, zHigh: 13.25,
  steps: 19, minX: -9.55, maxX: -4.17, minZ: 7.35, maxZ: 13.68,
});

export function stairFlight(floor) {
  if (!Number.isInteger(floor) || floor < 0 || floor >= HOTEL.floors - 1) return null;
  return { floor, x: floor % 2 ? STAIR.xRight : STAIR.xLeft, forward: floor % 2 === 0 };
}
export function inStairLane(floor, x, z, radius = 0) {
  const f = stairFlight(floor);
  if (!f) return false;
  return Math.abs(x - f.x) < STAIR.width / 2 - radius && z >= STAIR.zLow && z <= STAIR.zHigh;
}
export function stairHeight(floor, x, z) {
  const f = stairFlight(floor);
  if (!f || !inStairLane(floor, x, z)) return null;
  const t = (z - STAIR.zLow) / (STAIR.zHigh - STAIR.zLow);
  return (floor + (f.forward ? t : 1 - t)) * HOTEL.floorHeight;
}

// Pick a walkable surface near the player's last ground level. This avoids
// snapping between vertically overlapping flights in the same XY footprint.
export function resolveGround(x, z, priorHeight, currentFloor) {
  const flat = currentFloor * HOTEL.floorHeight;
  let height = flat;
  let best = Infinity;
  for (let f = 0; f < HOTEL.floors - 1; f++) {
    const h = stairHeight(f, x, z);
    if (h === null) continue;
    const error = Math.abs(priorHeight - h);
    // Step-up tolerance allows movement onto the flight without flying between levels.
    if (error < best && error < .65) { best = error; height = h; }
  }
  return height;
}
export function groundFloor(y) {
  return Math.max(0, Math.min(HOTEL.floors - 1, Math.floor((y + .055) / HOTEL.floorHeight)));
}
