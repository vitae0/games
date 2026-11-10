import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStick, clampTouchSensitivity, isTouchCapable } from '../src/input/TouchMath.js';

test('mobile joystick: circular magnitude, dead zone and bounded values', () => {
  assert.deepEqual(normalizeStick(0, 0, 65), { x: 0, y: 0 });
  assert.deepEqual(normalizeStick(3, 3, 65), { x: 0, y: 0 });
  const right = normalizeStick(1000, 0, 65);
  assert.equal(right.x, 1);
  assert.equal(right.y, 0);
  const diagonal = normalizeStick(65, 65, 65);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9);
  const half = normalizeStick(0, -35, 65);
  assert.ok(half.y < -0.4 && half.y > -0.6);
  assert.deepEqual(normalizeStick(NaN, 2, 65), { x: 0, y: 0 });
  assert.deepEqual(normalizeStick(10, 10, 0), { x: 0, y: 0 });
});

test('touch hardware detection includes coarse pointer and hybrid touch devices', () => {
  assert.equal(isTouchCapable({matchMedia:() => ({ matches:false }),navigator:{maxTouchPoints:0}}), false);
  assert.equal(isTouchCapable({matchMedia:() => ({ matches:true }),navigator:{maxTouchPoints:0}}), true);
  assert.equal(isTouchCapable({matchMedia:() => ({ matches:false }),navigator:{maxTouchPoints:5}}), true);
  assert.equal(isTouchCapable({matchMedia:() => ({ matches:false }),navigator:{maxTouchPoints:0},location:{search:'?touch'}}), true);
  assert.equal(isTouchCapable({matchMedia:() => {throw new Error('privacy')} }), false);
});

test('invalid sensitivity values clamp safely', () => {
  assert.equal(clampTouchSensitivity('9'), 2);
  assert.equal(clampTouchSensitivity(.12), .45);
  assert.equal(clampTouchSensitivity('wrong'), 1);
});
