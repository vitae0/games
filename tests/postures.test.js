import test from 'node:test';
import assert from 'node:assert/strict';
import { controlTap, nextFloorPosture, isFloorPosture } from '../src/player/Postures.js';

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
  assert.equal(nextFloorPosture('kneel', 'kneel'), 'stand');
  assert.equal(nextFloorPosture('floorSit', 'kneel'), 'kneel');
  assert.equal(isFloorPosture('rest'), false);
  assert.throws(() => nextFloorPosture('stand', 'fly'), RangeError);
});
