import test from 'node:test';
import assert from 'node:assert/strict';
import { forwardFromYaw, rightFromYaw, movementFromYaw, viewFromYawPitch } from '../src/player/Orientation.js';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} ≠ ${b}`);
test('view, movement and avatar -Z axes agree at every cardinal yaw', () => {
  for (const yaw of [0, Math.PI/2, Math.PI, -Math.PI/2, .6, 4.2]) {
    const f = forwardFromYaw(yaw);
    const r = rightFromYaw(yaw);
    const m = movementFromYaw(yaw, 1, 0);
    const v = viewFromYawPitch(yaw, 0);
    close(m.x, f.x); close(m.z, f.z);
    close(v.x, f.x); close(v.z, f.z);
    close(f.x*r.x + f.z*r.z, 0);
    const strafe = movementFromYaw(yaw, 0, 1);
    close(strafe.x, r.x); close(strafe.z, r.z);
  }
});
test('diagonal travel is normalized and vertical look does not affect travel', () => {
  const m = movementFromYaw(1.4, 1, 1);
  close(Math.hypot(m.x, m.z), 1);
  const camera = viewFromYawPitch(1.4, .7);
  close(camera.y, Math.sin(.7));
  close(Math.hypot(camera.x, camera.z), Math.cos(.7));
});
