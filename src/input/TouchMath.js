/** Renderer-free input math: reuse it in touch tests without a DOM. */
export const STICK_DEAD_ZONE = .10;

/** Displacement in CSS pixels -> normalized, circular joystick deflection. */
export function normalizeStick(dx, dy, radius, deadZone = STICK_DEAD_ZONE) {
  if (!(radius > 0) || !Number.isFinite(dx) || !Number.isFinite(dy)) return { x: 0, y: 0 };
  const length = Math.hypot(dx, dy);
  const magnitude = Math.min(1, length / radius);
  if (magnitude <= deadZone || length === 0) return { x: 0, y: 0 };
  const strength = (magnitude - deadZone) / (1 - deadZone);
  return { x: dx / length * strength, y: dy / length * strength };
}

export function clampTouchSensitivity(value) {
  return Math.min(2, Math.max(.45, Number.isFinite(Number(value)) ? Number(value) : 1));
}

export function isTouchCapable(environment = globalThis) {
  try {
    return !!(environment.matchMedia?.('(pointer: coarse)')?.matches ||
      environment.navigator?.maxTouchPoints > 0);
  } catch { return false; }
}
