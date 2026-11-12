import test from 'node:test';
import assert from 'node:assert/strict';
import { controlTap, nextFloorPosture, nextRisePosture, isFloorPosture } from '../src/player/Postures.js';

test('two distinct Ctrl presses within 330 ms count as a double tap', () => {
  assert.deepEqual(controlTap(null, 1000), { double: false, nextTapAt: 1000 });
  assert.deepEqual(controlTap(1000, 1300), { double: true, nextTapAt: null });
  assert.equal(controlTap(1000, 1400).double, false);
  assert.equal(controlTap(1000, 900).double, false);
});

test('sitting and kneeling each toggle back to standing', () => {
  assert.equal(nextFloorPosture('stand', 'floorSit'), 'floorSit');
  assert.equal(nextFloorPosture('floorSit', 'floorSit'), 'stand');
  assert.equal(nextFloorPosture('stand', 'kneel'), 'kneel');
  assert.equal(nextFloorPosture('kneel', 'kneel'), 'floorSit');
  assert.equal(nextFloorPosture('floorSit', 'kneel'), 'kneel');
  assert.equal(isFloorPosture('rest'), false);
  assert.throws(() => nextFloorPosture('stand', 'fly'), RangeError);
});

test('getting up from floor positions always uses an intermediate seated stage',()=>{
  assert.equal(nextFloorPosture('stand','floorLie'),'floorLie');
  assert.equal(nextFloorPosture('floorSit','floorLie'),'floorLie');
  assert.equal(nextFloorPosture('floorLie','floorLie'),'floorSit');
  assert.equal(nextRisePosture('floorLie'),'floorSit');
  assert.equal(nextRisePosture('kneel'),'floorSit');
  assert.equal(nextRisePosture('floorSit'),'stand');
  assert.equal(isFloorPosture('floorLie'),true);
  assert.equal(isFloorPosture('sit'),false);
});
