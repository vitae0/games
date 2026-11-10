import test from 'node:test';
import assert from 'node:assert/strict';
import { joystickVector, resolutionCap, touchLookFactor } from '../src/mobile/TouchMath.js';

test('joystick deadzone, diagonals, full displacement and bounds', () => {
  assert.deepEqual(joystickVector(0, 0, 50), {x:0,y:0});
  assert.deepEqual(joystickVector(2, -2, 50), {x:0,y:0});
  assert.deepEqual(joystickVector(0, -50, 50), {x:0,y:-1});
  assert.deepEqual(joystickVector(500,0,50), {x:1,y:0});
  const diagonal=joystickVector(30,-30,50);
  assert.ok(diagonal.x>0 && diagonal.y<0);
  assert.ok(Math.hypot(diagonal.x,diagonal.y) <= 1.00001);
});
test('quality caps are conservative on mobile and upper bounded by physical device ratio',()=>{
  assert.equal(resolutionCap('auto',3,true),1.05);
  assert.equal(resolutionCap('auto',3,false),1.5);
  assert.equal(resolutionCap('low',3,true),0.7);
  assert.equal(resolutionCap('balanced',3,true),1);
  assert.equal(resolutionCap('high',3,true),1.5);
  assert.equal(resolutionCap('high',1,true),1);
  assert.equal(resolutionCap('not-a-mode',3,true),1.05);
});
test('look sensitivity remains bounded for accessibility and stability',()=>{
  assert.ok(touchLookFactor(1) > touchLookFactor(.5));
  assert.ok(touchLookFactor(2) > touchLookFactor(1));
  assert.equal(touchLookFactor(900),touchLookFactor(2));
});
