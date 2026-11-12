import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollZoomDistance, orbitFocusHeight, orbitVerticalOffset, orbitHorizontalDistance, MAX_ORBIT_DISTANCE } from '../src/player/CameraOrbit.js';

test('scrolling spans first-person, near body framing and extended orbit distances', () => {
  let value = 0;
  value = scrollZoomDistance(value, 100);
  assert.ok(value > .74 && value < 1.3);
  for (let i = 0; i < 90; i++) value = scrollZoomDistance(value, 100);
  assert.equal(value, MAX_ORBIT_DISTANCE);
  for (let i = 0; i < 90; i++) value = scrollZoomDistance(value, -100);
  assert.equal(value, 0);
  assert.equal(scrollZoomDistance(0, -100), 0);
  assert.equal(scrollZoomDistance(0, 0), 0);
});

test('orbit focus stays at torso until zoom approaches head height', () => {
  const height = 1.76, eye = 1.64;
  const wide = orbitFocusHeight(height, eye, 6);
  const close = orbitFocusHeight(height, eye, .78);
  assert.ok(Math.abs(wide - height * .53) < 1e-10);
  assert.ok(close > wide + .4);
  assert.ok(Math.abs(close - eye) < .05);
  assert.ok(orbitVerticalOffset(4, .9) > 2);
  assert.ok(orbitVerticalOffset(4, -.9) < -2);
  assert.ok(orbitHorizontalDistance(4, 1.45) < orbitHorizontalDistance(4, 0));
});

test('fine wheel and touchpad deltas create distinct intermediate zoom levels',()=>{
  const near=4, fine=scrollZoomDistance(near,15),normal=scrollZoomDistance(near,100);
  assert.ok(fine>near && fine<normal);
  assert.ok(normal-near<.40);
  assert.ok(scrollZoomDistance(fine,-15)<fine);
});
