import test from 'node:test';
import assert from 'node:assert/strict';
import { stairFlight, stairHeight, resolveGround, groundFloor, STAIR } from '../src/world/Stairwell.js';
import { HOTEL } from '../src/config.js';
import { Hotel } from '../src/world/Hotel.js';

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


test('hotel walk surfaces can override flat room ground for raised furniture tops', () => {
  const fake = { walkSurfaces:[{ floor:1, minX:-1, maxX:1, minZ:-1, maxZ:1, topY:4.0 }] };
  const h = Hotel.prototype.groundHeight.call(fake, 0, 0, 3.52, 1);
  assert.equal(h, 4.0);
  const base = Hotel.prototype.groundHeight.call(fake, 2, 0, 3.52, 1);
  assert.ok(Math.abs(base - resolveGround(2, 0, 3.52, 1)) < 1e-9);
});

test('first-floor stair entrance does not duplicate the structural deck face', () => {
  const geometry = [];
  const fake = { box: (material, x, y, z, w, h, d) => geometry.push({material,x,y,z,w,h,d}) };
  Hotel.prototype.buildStairs.call(fake);
  const firstFloorCoplanar = geometry.filter(b =>
    b.x > -12 && b.x < 12 && b.z > -15 && b.z < 15 &&
    Math.abs(b.y + b.h / 2) < 1e-8);
  assert.equal(firstFloorCoplanar.length, 0, 'stair geometry must not have a top face at y=0');
  const threshold = geometry.find(b => b.material === 'trim' && Math.abs(b.z - STAIR.zLow) < 1e-8);
  assert.ok(threshold && threshold.y - threshold.h / 2 >= 0, 'threshold rests on top of main slab');
  assert.ok(geometry.filter(b=>b.material==='slab').length>=STAIR.steps*3, 'all three flights are kept');
});

test('first-floor reception finish meets corridor carpet and is not laid on top of an identical slab', () => {
  const geometry = [];
  const fake = {
    box: (material,x,y,z,w,h,d)=>geometry.push({material,x,y,z,w,h,d}),
    addProp() {}, interactables:[], events:{toast(){}},
  };
  Hotel.prototype.makeLobby.call(fake);
  const finish = geometry.filter(b => b.material === 'wood' && Math.abs(b.y-.015)<1e-8 && Math.abs(b.z+10.85)<1e-8 && Math.abs(b.d-7.5)<1e-8);
  assert.equal(finish.length, 2, 'reception has two independent finishes');
  const left = finish.find(b => b.x < 0);
  const right = finish.find(b => b.x > 0);
  assert.ok(left && right);
  assert.ok(Math.abs((left.x+left.w/2) + 1.55) < 1e-8);
  assert.ok(Math.abs((right.x-right.w/2) - 1.55) < 1e-8);
  assert.ok(finish.every(b => Math.abs(b.y+b.h/2-.03) < 1e-8));
});
