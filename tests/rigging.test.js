import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Avatar } from '../src/avatar/Avatar.js';
import { poseFor } from '../src/avatar/PoseMath.js';

test('legacy anime figure retains its skinning and detachable cloth layers', () => {
  const scene = new THREE.Scene();
  const avatar = new Avatar(scene, { baseModel: 'vroidMale', skinTone: 'honey', outfit: 'stealth' });
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
  assert.equal(kneeling.hip[0], kneeling.hip[1], 'both knees rest symmetrically');
  assert.equal(kneeling.knee[0], kneeling.knee[1]);
  assert.ok(seated.drop > kneeling.drop, 'pelvis must rest lower when sitting on the floor');
  assert.ok(seated.knee[0] > -0.4, 'floor-seated shins extend forward, not vertically');
  assert.ok(kneeling.knee[0] < -1.5, 'both shins fold back behind ground-contact knees');
  const lying=poseFor('floorLie',0,1.3);
  assert.deepEqual(lying.hip,[.055,.055]);
  assert.ok(lying.drop<.001);
  assert.ok(crouched.knee[0] < -.5);
});


test('furniture poses are distinct from generic sitting and still animate naturally',()=>{
  const common=poseFor('sit',0,1,1.73);
  const desk=poseFor('sit',0,1,1.73,'desk');
  const lounge=poseFor('sit',0,1,1.73,'lounge');
  const stool=poseFor('sit',0,1,1.73,'stool');
  const bathe=poseFor('sit',0,1,1.73,'bathe');
  const sleep=poseFor('rest',0,1,1.73,'sleep');
  assert.ok(desk.arms[0]>common.arms[0]+.2);
  assert.notDeepEqual(lounge.hip,stool.hip);
  assert.notDeepEqual(bathe.knee,stool.knee);
  assert.equal(sleep.drop,0);
  assert.notDeepEqual(sleep.hip,poseFor('rest',0,1,1.73).hip);
});
