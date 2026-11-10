import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CollisionWorld } from '../src/engine/Collision.js';
import { PhysicsWorld } from '../src/engine/PhysicsWorld.js';

test('grabbed movable props move toward hand target and remain on floor', () => {
  const collisions = new CollisionWorld();
  const physics = new PhysicsWorld(collisions, 3.4);
  const mesh = { position: new THREE.Vector3(0, .25, 0) };
  const body = physics.add(mesh, { mass: 2, height: .5 });
  assert.ok(physics.grab('left', body, new THREE.Vector3(2, 1, 0)));
  for (let i = 0; i < 100; i++) physics.step(1 / 60);
  assert.ok(body.position.x > 1.1);
  assert.ok(body.position.y >= .25);
  physics.release('left');
  assert.equal(physics.grabs.size, 0);
});
test('static obstacles stop dragged props', () => {
  const collisions = new CollisionWorld();
  collisions.add(0, 1, 0, .2, 4);
  const physics = new PhysicsWorld(collisions, 3.4);
  const body = physics.add({ position: new THREE.Vector3(0, .25, 0) }, { radius: .25, height: .5 });
  physics.grab('right', body, new THREE.Vector3(3, .25, 0));
  for (let i = 0; i < 150; i++) physics.step(1 / 60);
  assert.ok(body.position.x < .75);
});
