/** Pure keyboard/posture rules, independent of Three.js and DOM. */
export const DOUBLE_CONTROL_INTERVAL_MS = 330;
export const FLOOR_POSTURES = Object.freeze(['floorSit', 'kneel', 'floorLie']);

/** Legacy two-tap helper; the input FSM additionally tracks the third tap. */
export function controlTap(previousTapAt, now, interval = DOUBLE_CONTROL_INTERVAL_MS) {
  const double = Number.isFinite(previousTapAt) && now >= previousTapAt && now - previousTapAt <= interval;
  return { double, nextTapAt: double ? null : now };
}

/** The posture itself is not a chair: floor sitting has its own leg geometry. */
export function nextRisePosture(current) {
  if (current === 'floorLie' || current === 'kneel') return 'floorSit';
  return 'stand';
}

export function nextFloorPosture(current, requested) {
  if (!FLOOR_POSTURES.includes(requested))
    throw new RangeError(`Unknown floor posture: ${requested}`);
  // A repeat command is an incremental exit; lying must never pop to standing.
  return current === requested ? nextRisePosture(current) : requested;
}

export function isFloorPosture(posture) { return FLOOR_POSTURES.includes(posture); }
