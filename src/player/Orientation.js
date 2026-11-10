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
