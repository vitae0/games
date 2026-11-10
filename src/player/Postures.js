/** Pure keyboard/posture rules, independent of Three.js and DOM. */
export const DOUBLE_CONTROL_INTERVAL_MS = 330;
export const FLOOR_POSTURES = Object.freeze(['floorSit', 'kneel']);

export function controlTap(previousTapAt, now, interval = DOUBLE_CONTROL_INTERVAL_MS) {
  const double = Number.isFinite(previousTapAt) && now >= previousTapAt && now - previousTapAt <= interval;
  return { double, nextTapAt: double ? null : now };
}

export function nextFloorPosture(current, requested) {
  if (!FLOOR_POSTURES.includes(requested)) throw new RangeError(`Unknown floor posture: ${requested}`);
  return current === requested ? 'stand' : requested;
}

export function isFloorPosture(posture) { return FLOOR_POSTURES.includes(posture); }
