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
test('grounding follows discrete physical treads uphill and downhill', () => {
  let y = 0, floor = 0;
  for (let i = 0; i <= 140; i++) {
    const z = STAIR.zLow + (STAIR.zHigh - STAIR.zLow) * i / 140;
    y = resolveGround(STAIR.xLeft, z, y, floor);
    floor = groundFloor(y);
    assert.ok(Math.abs(y - stairHeight(0, STAIR.xLeft, z)) < .000001);
  }
  assert.equal(floor, 1);
  for (let i = 140; i >= 0; i--) {
    const z = STAIR.zLow + (STAIR.zHigh - STAIR.zLow) * i / 140;
    y = resolveGround(STAIR.xLeft, z, y, floor);
    floor = groundFloor(y);
    assert.ok(Math.abs(y - stairHeight(0, STAIR.xLeft, z)) < .000001);
  }
  assert.equal(floor, 0);
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
  const threshold = geometry.find(b => b.material === 'trim' && Math.abs(b.z - (STAIR.zLow - .18)) < 1e-8);
  assert.ok(threshold && threshold.y - threshold.h / 2 >= 0, 'threshold rests on top of main slab');
  assert.ok(geometry.filter(b=>b.material==='slab').length>=STAIR.steps*3, 'all three flights are kept');
});

test('first-floor reception finish meets corridor carpet and is not laid on top of an identical slab', () => {
  const geometry = [];
  const fake = {
    box: (material,x,y,z,w,h,d)=>geometry.push({material,x,y,z,w,h,d}),
    addProp() {}, interactables:[], events:{toast(){}},
    rounded(material,x,y,z,w,h,d){geometry.push({material,x,y,z,w,h,d})},
    climbable(){},addWalkSurface(){},roomLighting:null,
  };
  Hotel.prototype.makeLobby.call(fake);
  const lobby=geometry.filter(b=>b.material==='wood'&&Math.abs(b.y-.015)<1e-8
    &&Math.abs(b.z+10.85)<1e-8&&Math.abs(b.d-7.5)<1e-8);
  assert.equal(lobby.length,1,'west reception retains its own finish');
  assert.ok(Math.abs(lobby[0].x+lobby[0].w/2+1.55)<1e-8);
  assert.ok(Math.abs(lobby[0].y+lobby[0].h/2-.03)<1e-8);
  const bar=geometry.find(b=>b.material==='wood'&&Math.abs(b.x-6.8)<1e-8
    &&Math.abs(b.z+10.68)<1e-8&&Math.abs(b.d-6.45)<1e-8);
  assert.ok(bar,'bar takes east-front lobby footprint');
  assert.ok(Math.abs((bar.y+bar.h/2)-.0355)<1e-8,'bar has a raised floor finish');
});

test('rendered riser tops agree with physical support at every tread centre', () => {
  const boxes=[];
  Hotel.prototype.buildStairs.call({box:(material,x,y,z,w,h,d)=>boxes.push({material,x,y,z,w,h,d})});
  for (let f=0;f<3;f++) {
    const flight=stairFlight(f);
    for (let i=0;i<STAIR.steps;i++) {
      const z=flight.forward
        ? STAIR.zLow+(i+.5)*(STAIR.zHigh-STAIR.zLow)/STAIR.steps
        : STAIR.zHigh-(i+.5)*(STAIR.zHigh-STAIR.zLow)/STAIR.steps;
      const slab=boxes.find(b=>b.material==='slab' && Math.abs(b.x-flight.x)<1e-8 && Math.abs(b.z-z)<1e-8 && Math.abs((b.y-b.h/2)-f*HOTEL.floorHeight)<1e-8);
      assert.ok(slab, 'stair step not rendered');
      assert.ok(Math.abs(slab.y+slab.h/2-stairHeight(f,flight.x,z))<1e-8);
    }
  }
});
