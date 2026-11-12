import { MathUtils } from 'three';

/** Roblox-style wheel zoom: 0 is first-person; orbit distances grow gradually.
 * The ceiling is deliberately spacious; geometry collision clips the *actual* camera.
 */
export const FIRST_PERSON_CUTOFF = .74;
export const MAX_ORBIT_DISTANCE = 30;
export function scrollZoomDistance(current, deltaY) {
  if (!Number.isFinite(deltaY) || deltaY === 0) return current;
  if (deltaY > 0 && current <= FIRST_PERSON_CUTOFF) return .82;
  // Fine-grained zoom respects wheel amount and touchpad micro-scroll events.
  const ticks = MathUtils.clamp(Math.abs(deltaY) / 100, .08, 3);
  const step = (.13 + Math.max(0, current) * .045) * ticks;
  const next = current + Math.sign(deltaY) * step;
  return next <= FIRST_PERSON_CUTOFF ? 0
    : MathUtils.clamp(next, FIRST_PERSON_CUTOFF, MAX_ORBIT_DISTANCE);
}

/** Keep the avatar's torso centered until very close, then glide toward eye height. */
export function orbitFocusHeight(bodyHeight, eyeHeight, distance) {
  const center = bodyHeight * .53;
  const t = MathUtils.clamp((1.75 - distance) / 1.05, 0, 1);
  const smooth = t * t * (3 - 2 * t);
  return MathUtils.lerp(center, eyeHeight, smooth);
}

/** True spherical orbit allows both steep overhead and low-angle viewpoints. */
export function orbitVerticalOffset(distance, pitch) {
  return Math.sin(MathUtils.clamp(pitch, -1.54, 1.54)) * distance;
}
export function orbitHorizontalDistance(distance, pitch) {
  return Math.cos(MathUtils.clamp(pitch, -1.54, 1.54)) * distance;
}
