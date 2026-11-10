import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Avatar } from '../src/avatar/Avatar.js';
import { poseFor } from '../src/avatar/PoseMath.js';

test('default anime figure has real skinning, two leg joints and detachable cloth layers', () => {
  const scene = new THREE.Scene();
  const avatar = new Avatar(scene, { skinTone: 'honey', outfit: 'stealth' });
  assert.equal(avatar.leftLeg.isBone, true);
  assert.equal(avatar.rightLeg.userData.knee.isBone, true);
  assert.ok(avatar.skinnedLayers.length >= 8);
  assert.ok(avatar.skinnedLayers.every(layer => layer.isSkinnedMesh && layer.skeleton.bones.length === 2));
  assert.ok(avatar.skinnedLayers.every(layer => layer.geometry.getAttribute('skinWeight').count > 0));
  assert.ok(avatar.eyeParts.length === 2);
  const leg = avatar.leftLeg;
  avatar.update(0.05, 0, 'crouch');
  assert.ok(leg.rotation.x > .01);
  avatar.update(0.05, 0, 'floorSit');
  assert.ok(avatar.body.position.y < 0);
  avatar.update(0.05, 0, 'kneel');
  assert.ok(avatar.leftLeg.userData.knee.rotation.x < 0);
  avatar.dispose();
  assert.ok(!scene.children.includes(avatar.root));
});

test('floor poses bend joints rather than scaling the entire avatar', () => {
  const seated = poseFor('floorSit', 0, 1.3);
  const kneeling = poseFor('kneel', 0, 1.3);
  const crouched = poseFor('crouch', 0, 1.3);
  assert.ok(seated.drop > crouched.drop);
  assert.notEqual(kneeling.hip[0], kneeling.hip[1]);
  assert.ok(crouched.knee[0] < -.5);
});
