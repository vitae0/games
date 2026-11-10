import test from 'node:test';
import assert from 'node:assert/strict';
import { stairFlight, stairHeight, resolveGround, groundFloor, STAIR } from '../src/world/Stairwell.js';
import { HOTEL } from '../src/config.js';

test('three stairs join four actual heights without elevator teleportation', () => {
  assert.equal(stairFlight(3), null);
  assert.equal(stairFlight(1).forward, false);
  assert.equal(stairHeight(0, STAIR.xLeft, STAIR.zLow), 0);
  assert.equal(stairHeight(0, STAIR.xLeft, STAIR.zHigh), HOTEL.floorHeight);
  assert.equal(stairHeight(1, STAIR.xRight, STAIR.zHigh), HOTEL.floorHeight);
  assert.equal(stairHeight(1, STAIR.xRight, STAIR.zLow), 2 * HOTEL.floorHeight);
  assert.equal(stairHeight(2, STAIR.xLeft, STAIR.zHigh), 3 * HOTEL.floorHeight);
  assert.equal(groundFloor(3 * HOTEL.floorHeight), 3);
});
test('grounding follows one stair flight continuously from foot to landing', () => {
  let y = 0, floor = 0;
  for (let step = 0; step <= 140; step++) {
    const z = STAIR.zLow + (STAIR.zHigh - STAIR.zLow) * step / 140;
    y = resolveGround(STAIR.xLeft, z, y, floor);
    floor = groundFloor(y);
    assert.ok(Math.abs(y - step / 140 * HOTEL.floorHeight) < .00001);
  }
  assert.equal(floor, 1);
});
test('stair lanes and floor labels never escape playable bounds', () => {
  assert.equal(stairHeight(2, 0, 10), null);
  assert.equal(groundFloor(-3), 0);
  assert.equal(groundFloor(9999), 3);
});
