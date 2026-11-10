/** Pure control geometry, independent of browser APIs and the 3D engine. */
export function joystickVector(dx, dy, radius, deadzone = 0.13) {
  const r = Math.max(radius, 1);
  const distance = Math.hypot(dx, dy) / r;
  if (!Number.isFinite(distance) || distance <= deadzone) return { x: 0, y: 0 };
  const magnitude = Math.min(1, (distance - deadzone) / (1 - deadzone));
  return {
    x: +(dx / Math.max(Math.hypot(dx, dy), 1) * magnitude).toFixed(5),
    y: +(dy / Math.max(Math.hypot(dx, dy), 1) * magnitude).toFixed(5),
  };
}

export const QUALITY_LIMITS = Object.freeze({ low: 0.7, balanced: 1, high: 1.5 });
export function resolutionCap(quality, devicePixelRatio = 1, mobile = false) {
  const requested = quality === 'auto' || !(quality in QUALITY_LIMITS)
    ? (mobile ? 1.05 : 1.5) : QUALITY_LIMITS[quality];
  return Math.max(0.55, Math.min(devicePixelRatio || 1, requested));
}

/** Large enough to keep touch gestures comfortable, small enough to avoid jumpy cameras. */
export function touchLookFactor(sensitivity = 1) {
  return 0.003 * Math.max(0.45, Math.min(2, Number(sensitivity) || 1));
}
