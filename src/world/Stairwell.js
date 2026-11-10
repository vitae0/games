import { HOTEL } from '../config.js';
import { UPPER_DECK, landingFootprint } from './FloorPlan.js';

/** Physical switchback stairwell. Geometry and walking share every tread index. */
export const STAIR = Object.freeze({
  xLeft: -8.35, xRight: -5.35, width: 2.25,
  zLow: 7.75, zHigh: 13.25, steps: 19,
  minX: -9.66, maxX: -4.14, minZ: 7.37, maxZ: 13.605,
});
export const STAIR_RISE = HOTEL.floorHeight / STAIR.steps;
export const STAIR_RUN = (STAIR.zHigh - STAIR.zLow) / STAIR.steps;
const TOLERANCE = 1e-7;
const DECK_SEAM_SUPPORT = .025; // Capsule bridges 1–2 cm visual floor seams.

export function stairFlight(floor) {
  if (!Number.isInteger(floor) || floor < 0 || floor >= HOTEL.floors - 1) return null;
  return { floor, x: floor % 2 ? STAIR.xRight : STAIR.xLeft, forward: floor % 2 === 0 };
}

/** Body centre stays inside the railing with clearance for its capsule. */
export function inStairLane(floor, x, z, radius = 0) {
  const flight = stairFlight(floor);
  if (!flight) return false;
  const inset = Math.max(0, radius) * .48;
  return Math.abs(x - flight.x) <= STAIR.width / 2 - inset + TOLERANCE &&
    z >= STAIR.zLow - TOLERANCE && z <= STAIR.zHigh + TOLERANCE;
}
export function stairProgress(floor, z) {
  const f = stairFlight(floor);
  if (!f) return null;
  const t = Math.max(0, Math.min(1, (z - STAIR.zLow) / (STAIR.zHigh - STAIR.zLow)));
  return f.forward ? t : 1 - t;
}
export function stairStepIndex(floor, z) {
  const t = stairProgress(floor, z);
  if (t === null) return null;
  return Math.max(0, Math.min(STAIR.steps, Math.ceil(t * STAIR.steps - 1e-9)));
}
/** Discrete real top face of a staircase step, not an interpolated ramp. */
export function stairHeight(floor, x, z) {
  if (!inStairLane(floor, x, z)) return null;
  return floor * HOTEL.floorHeight + stairStepIndex(floor, z) * STAIR_RISE;
}
export function groundFloor(y) {
  return Math.max(0, Math.min(HOTEL.floors - 1, Math.floor((y + .055) / HOTEL.floorHeight)));
}

function inRect(rect, x, z) {
  return Math.abs(x - rect.x) <= rect.width / 2 + DECK_SEAM_SUPPORT &&
    Math.abs(z - rect.z) <= rect.depth / 2 + DECK_SEAM_SUPPORT;
}
function flatSupport(floor, x, z) {
  if (floor === 0) return x >= -12.15 && x <= 12.15 && z >= -15.25 && z <= 15.25;
  return UPPER_DECK.some(r => inRect(r, x, z)) ||
    inRect(landingFootprint(stairFlight(floor - 1).forward), x, z);
}
/** Only real deck, landing, and stair-top surfaces support the player. */
export function stairSupports(x, z, radius = 0) {
  const found = [];
  for (let f = 0; f < HOTEL.floors; f++) {
    if (flatSupport(f, x, z)) found.push({ y: f * HOTEL.floorHeight, floor: f, type: 'deck' });
  }
  for (let f = 0; f < HOTEL.floors - 1; f++) {
    if (inStairLane(f, x, z, radius))
      found.push({ y: stairHeight(f, x, z), floor: f, type: 'step' });
  }
  return found;
}
/** Riser walls and step-up/down constraints work identically in both directions. */
export function pickStairSupport(x, z, previousHeight, radius = 0, maxRise = .24, maxDrop = .24) {
  const candidates = stairSupports(x, z, radius);
  for (let f = 0; f < HOTEL.floors - 1; f++) {
    if (!inStairLane(f, x, z, radius)) continue;
    const tread = stairHeight(f, x, z);
    const base = f * HOTEL.floorHeight;
    // A stair block is solid from its parent floor up to the actual tread.
    // Entering from the side beneath a higher step cannot select a ghost deck.
    if (previousHeight >= base - .035 && previousHeight <= tread + .035 &&
      tread - previousHeight > maxRise + TOLERANCE) return null;
  }
  return candidates
    .filter(s => s.y - previousHeight <= maxRise + TOLERANCE && previousHeight - s.y <= maxDrop + TOLERANCE)
    .sort((a,b) => (a.type === 'step' ? -1 : 1) - (b.type === 'step' ? -1 : 1) ||
      Math.abs(a.y-previousHeight) - Math.abs(b.y-previousHeight))[0] ?? null;
}
export function resolveGround(x, z, priorHeight, currentFloor) {
  const found = pickStairSupport(x, z, priorHeight, 0);
  return found ? found.y : priorHeight;
}

/** Substep horizontal motion so sprinting never tunnels through risers or railings. */
export function walkStairs(collisions, x, z, groundY, dx, dz, radius = .33) {
  let px = x, pz = z, py = groundY;
  const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .08));
  const sx = dx / count, sz = dz / count;
  for (let i = 0; i < count; i++) {
    const xStep = collisions.move(groundFloor(py), px, pz, sx, 0, radius);
    const xSupport = pickStairSupport(xStep.x, pz, py, radius);
    if (xSupport) { px = xStep.x; py = xSupport.y; }
    const zStep = collisions.move(groundFloor(py), px, pz, 0, sz, radius);
    const zSupport = pickStairSupport(px, zStep.z, py, radius);
    if (zSupport) { pz = zStep.z; py = zSupport.y; }
  }
  return { x: px, z: pz, ground: py, floor: groundFloor(py) };
}
