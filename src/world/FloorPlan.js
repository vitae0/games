/** Shared upper-floor deck footprints in metres. Stair opening is intentional. */
export const UPPER_DECK = Object.freeze([
  { x: -10.905, z: 0, width: 2.49, depth: 30.5 },
  { x: 4.005, z: 0, width: 16.29, depth: 30.5 },
  { x: -6.90, z: -3.94, width: 5.46, depth: 22.62 },
  { x: -6.90, z: 14.42, width: 5.46, depth: 1.63 },
]);
export const DECK_THICKNESS = .25;
export const CEILING_GAP = .015;
export function rectanglesOverlap(a, b, clearance = 0) {
  return Math.abs(a.x - b.x) < (a.width + b.width) / 2 + clearance &&
    Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + clearance;
}

/** Landing fits inside the exact stair void; no overlapping coplanar decks. */
export function landingFootprint(forward) {
  // A 1–2 cm visual seam prevents coplanar faces with neighbouring floor plates.
  // The capsule keeps physical support across these seams.
  return { x: -6.90, z: forward ? 13.43 : 7.56, width: 5.50, depth: forward ? .33 : .36 };
}
