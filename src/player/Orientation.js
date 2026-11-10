/** Three.js cameras and avatars use local -Z as forward. Horizontal +X is right. */
export function forwardFromYaw(yaw) {
  return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
}
export function rightFromYaw(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) };
}
export function viewFromYawPitch(yaw, pitch) {
  const forward = forwardFromYaw(yaw);
  return { x: forward.x * Math.cos(pitch), y: Math.sin(pitch), z: forward.z * Math.cos(pitch) };
}
export function movementFromYaw(yaw, forwardInput, rightInput) {
  const f = forwardFromYaw(yaw);
  const r = rightFromYaw(yaw);
  const x = f.x * forwardInput + r.x * rightInput;
  const z = f.z * forwardInput + r.z * rightInput;
  const magnitude = Math.hypot(x, z);
  return magnitude ? { x: x / magnitude, z: z / magnitude } : { x: 0, z: 0 };
}

/** Avatar yaw for actual horizontal movement, null when movement is too small. */
export function yawFromDisplacement(dx, dz) {
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx, dz) < 1e-5) return null;
  return Math.atan2(-dx, -dz);
}

/** Frame-rate independent shortest-arc body turning; camera yaw stays independent. */
export function approachYaw(current, target, dt, responsiveness = 14) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * (1 - Math.exp(-responsiveness * Math.max(0, dt)));
}
