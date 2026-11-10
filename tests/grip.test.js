import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Hotel } from '../src/world/Hotel.js';
import { HandRig } from '../src/player/HandRig.js';

test('static grip picks closest hotel surface, not an infinite-distance building', () => {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 3, .25), new THREE.MeshBasicMaterial());
  wall.position.set(0, 1, 0);
  wall.updateMatrixWorld(true);
  const grip = { gripRaycaster: new THREE.Raycaster(), batch: { meshes: [wall] }, gripObstacles: [] };
  grip.gripRaycaster.far = 3.3;
  const near = Hotel.prototype.nearestStaticSurface.call(grip,
    new THREE.Vector3(0, 1, 2), new THREE.Vector3(0, 0, -1));
  assert.ok(near && near.distance < 3);
  const far = Hotel.prototype.nearestStaticSurface.call(grip,
    new THREE.Vector3(0, 1, 8), new THREE.Vector3(0, 0, -1));
  assert.equal(far, null);
  wall.geometry.dispose(); wall.material.dispose();
});

test('static surface offset is calculated for player translation', () => {
  const hotel = { staticGrips: new Map([['left', new THREE.Vector3(1, 1, 1)]]) };
  const delta = Hotel.prototype.staticGripOffset.call(hotel, 'left', new THREE.Vector3(0, 1, 1));
  assert.equal(delta.x, 1);
  assert.equal(Hotel.prototype.staticGripOffset.call(hotel, 'right', new THREE.Vector3()), null);
});

test('the two first-person hands remain separately addressable', () => {
  const camera = new THREE.PerspectiveCamera();
  const rig = new HandRig(camera);
  assert.notEqual(rig.arms.left.group, rig.arms.right.group);
  rig.update(1 / 60, { pressed: true, grip: {} }, { pressed: false, grip: null }, true);
  assert.equal(rig.root.visible, true);
  rig.dispose();
  assert.equal(camera.children.includes(rig.root), false);
});
