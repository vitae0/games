/** One room is 10 m wide (x) and 7 m deep (z). Each mirrored suite keeps a clear entry aisle. */
export function suitePlan(side, z) {
  if (side !== -1 && side !== 1) throw new RangeError('Suite side must be -1 or 1');
  return {
    bed: { x: side * 8.83, z: z + 1.55, w: 2.65, d: 2.65 },
    bath: { x: side * 10.48, z: z - 2.05, w: 2.60, d: 2.80 },
    desk: { x: side * 6.55, z: z - 2.20, w: 1.55, d: .65 },
    chair: { x: side * 5.15, z: z - 2.25, w: .70, d: .73 },
    sofa: { x: side * 4.95, z: z + .79, w: 1.48, d: .79 },
    table: { x: side * 4.95, z: z + 1.78, w: .83, d: .45 },
    tv: { x: side * 4.95, z: z + 3.27, w: 1.82, d: .11 },
    wardrobe: { x: side * 11.15, z: z + 2.78, w: .72, d: 1.04 },
    minibar: { x: side * 3.24, z: z - 2.38, w: .72, d: .76 },
    entry: { x: side * 2.60, z, w: 1.15, d: 1.25 },
  };
}
export function overlaps2D(a, b, padding = 0) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + padding && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + padding;
}
