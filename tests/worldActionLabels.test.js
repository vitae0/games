import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { collectWorldActions, groupWorldActions } from '../src/ui/WorldActionLabels.js';

const player = { floor: 0, position: new THREE.Vector3(0, 0, 0) };
function camera() {
  const result = new THREE.PerspectiveCamera(74, 1, .08, 100);
  result.position.set(0, 1.6, 0);
  result.lookAt(0, 1.25, -3);
  result.updateMatrixWorld();
  result.updateProjectionMatrix();
  return result;
}
function object(x, z, { floor = 0, available = true } = {}) {
  return {
    floor, position: new THREE.Vector3(x, 1, z),
    isAvailable: () => available, getLabel: () => 'Test', activate() {},
  };
}

test('action labels favor a centered object over a slightly nearer object on the edge', () => {
  const aligned = object(0, -2.5);
  const offAxis = object(1.05, -1.7);
  const visible = collectWorldActions([offAxis, aligned], player, camera());
  assert.equal(visible[0].action, aligned);
  assert.ok(visible.some(item => item.action === offAxis));
});

test('action labels exclude items on another floor, behind camera, unavailable or out of reach', () => {
  const valid = object(0, -1.8);
  const visible = collectWorldActions([
    object(0, -1.8, { floor: 1 }),
    object(0, 1.5),
    object(0, -1.8, { available: false }),
    object(0, -4),
    valid,
  ], player, camera());
  assert.deepEqual(visible.map(item => item.action), [valid]);
});

test('action labels honor the visible-item limit', () => {
  const candidates = Array.from({ length: 12 }, (_, i) => object((i - 6) * .07, -1.8));
  const visible = collectWorldActions(candidates, player, camera(), 4);
  assert.equal(visible.length, 4);
  assert.ok(visible.every(item => item.x >= 0 && item.x <= 1 && item.y >= 0 && item.y <= 1));
});

test('explicit multi-action objects consolidate without reassigning clicked targets',()=>{
  const a=object(0,-1.8),b=object(.15,-1.83),c=object(.75,-2.1);
  a.groupId='bed:1'; b.groupId='bed:1'; c.groupId='cabinet:2';
  a.getLabel=()=> 'Yatak · Uzan';
  b.getLabel=()=> 'Yatak · Kenara otur';
  c.getLabel=()=> 'Gardırop · Aç';
  const raw=collectWorldActions([a,b,c],player,camera(),8);
  const groups=groupWorldActions(raw);
  assert.equal(groups.length,2);
  const bed=groups.find(g=>g.actions.includes(a));
  assert.deepEqual(bed.actions.map(x=>x.getLabel()).sort(),
    ['Yatak · Kenara otur','Yatak · Uzan']);
  assert.ok(groups.some(g=>g.actions.length===1&&g.actions[0]===c));
  assert.equal(groupWorldActions(raw,1).length,1);
});
