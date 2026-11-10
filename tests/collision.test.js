import test from 'node:test';
import assert from 'node:assert/strict';
import { CollisionWorld } from '../src/engine/Collision.js';

test('disc blocks on wall, with corner clearance', () => {
  const w = new CollisionWorld();
  w.add(0, 2, 0, 0.2, 3);
  assert.equal(w.blocked(0, 1.75, 0, 0.3), true);
  assert.equal(w.blocked(0, 1.0, 0, 0.3), false);
  assert.equal(w.blocked(0, 1.75, 2.5, 0.3), false);
});
test('separate-axis move slides along walls', () => {
  const w = new CollisionWorld();
  w.add(0, 2, 0, 0.2, 6);
  const pos = w.move(0, 1.5, 0, 0.4, 0.5, 0.3);
  assert.equal(pos.x, 1.5);
  assert.equal(pos.z, 0.5);
});
test('interactive doors can unblock path', () => {
  const w = new CollisionWorld();
  const id = w.add(1, 0, 0, 2, 0.1);
  assert.equal(w.blocked(1, 0, 0, 0.3), true);
  w.setActive(id, false);
  assert.equal(w.blocked(1, 0, 0, 0.3), false);
  assert.equal(w.blocked(0, 0, 0, 0.3), false);
});
