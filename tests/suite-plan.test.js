import test from 'node:test';
import assert from 'node:assert/strict';
import { suitePlan, overlaps2D } from '../src/world/SuitePlan.js';

const fixtures = ['bed','bath','desk','chair','sofa','table','tv','wardrobe','minibar'];

test('mirrored rooms preserve dimensions and bounds of 7m-deep suites', () => {
  for (const z of [-10.5, -3.5, 3.5, 10.5]) {
    const right = suitePlan(1,z), left = suitePlan(-1,z);
    for (const key of fixtures) {
      assert.equal(left[key].x, -right[key].x);
      assert.equal(left[key].z, right[key].z);
      assert.ok(right[key].z + right[key].d/2 <= z + 3.50, `${key} near far partition`);
      assert.ok(right[key].z - right[key].d/2 >= z - 3.50, `${key} near near partition`);
      assert.ok(Math.abs(right[key].x) + right[key].w/2 < 11.94, `${key} inside window`);
    }
  }
});

test('large room footprints do not intersect each other or entry path', () => {
  for (const side of [-1,1]) {
    const p = suitePlan(side, -3.5);
    const keys = ['bed','bath','desk','chair','sofa','table','tv','wardrobe','minibar'];
    for (let i=0;i<keys.length;i++) for (let j=i+1;j<keys.length;j++) {
      assert.equal(overlaps2D(p[keys[i]],p[keys[j]]),false,`${keys[i]} overlaps ${keys[j]}`);
    }
    for (const key of keys) assert.equal(overlaps2D(p.entry,p[key]),false,`door blocked by ${key}`);
  }
});

test('invalid room orientations rejected', () => {
  assert.throws(() => suitePlan(0,3.5));
});


test('bathtubs are contained in bathroom enclosure without obstructing the room entry',()=>{
  for(const side of [-1,1])for(const z of [-10.5,-3.5,3.5,10.5]){
    const p=suitePlan(side,z);
    assert.ok(Math.abs(p.tub.x-p.bath.x)+(p.tub.w/2) < p.bath.w/2+.000001);
    assert.ok(Math.abs(p.tub.z-p.bath.z)+(p.tub.d/2) < p.bath.d/2+.000001);
    assert.equal(overlaps2D(p.entry,p.bath),false);
    assert.equal(overlaps2D(p.bed,p.bath),false);
    assert.equal(overlaps2D(p.desk,p.bath),false);
  }
});
