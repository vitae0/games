import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Avatar } from '../src/avatar/Avatar.js';
import { softLoftGeometry } from '../src/avatar/SoftAvatar.js';
import { normalizeAvatar, AVATAR_RANGES } from '../src/avatar/AvatarConfig.js';
import { NPC_CAST, npcProfile } from '../src/world/NpcCast.js';

test('native soft avatar uses a perfect sphere head, two line eyes and no hair', () => {
  const scene = new THREE.Scene();
  const avatar = new Avatar(scene, {});
  try {
    assert.equal(avatar.profile.baseModel, 'soft');
    assert.equal(avatar.softAvatar, true);
    const head = avatar.head.userData.headMesh;
    assert.equal(head.geometry.type, 'SphereGeometry');
    assert.equal(head.scale.x, head.scale.y);
    assert.equal(head.scale.y, head.scale.z);
    const marks = avatar.head.children.filter(child => child.name.endsWith('-eye-line'));
    assert.deepEqual(marks.map(mark => mark.name).sort(), ['left-eye-line','right-eye-line']);
    assert.ok(marks.every(mark => mark.scale.y > mark.scale.x));
    assert.equal(avatar.head.children.length, 3, 'head + two marks, no ears or hair');
  } finally {
    avatar.dispose();
  }
});

test('arms, hands, legs and flat-soled hemispheres are independently articulated', () => {
  const avatar = new Avatar(new THREE.Scene(), { baseModel:'soft' });
  try {
    for (const arm of [avatar.leftArm, avatar.rightArm]) {
      assert.ok(arm.isBone);
      assert.ok(arm.userData.elbow.isBone);
      assert.equal(arm.getObjectByName('upper-arm').geometry.type, 'BufferGeometry');
      assert.ok(arm.userData.elbow.getObjectByName('forearm'));
      const hand = arm.userData.hand;
      assert.equal(hand.children.length, 1);
      assert.equal(hand.children[0].name, 'hand');
      assert.equal(hand.children[0].geometry.type, 'SphereGeometry');
    }
    for (const leg of [avatar.leftLeg, avatar.rightLeg]) {
      assert.ok(leg.userData.knee.isBone);
      assert.ok(leg.getObjectByName('thigh'));
      assert.ok(leg.userData.knee.getObjectByName('calf'));
      const foot = leg.getObjectByName('hemisphere-foot');
      assert.ok(foot);
      assert.equal(foot.getObjectByName('hemisphere-dome').geometry.parameters.phiLength, 2*Math.PI);
      assert.equal(foot.getObjectByName('hemisphere-dome').geometry.parameters.thetaLength, Math.PI/2);
      assert.ok(foot.getObjectByName('flat-sole'));
    }
    assert.ok(avatar.body.getObjectByName('soft-torso').geometry.getAttribute('normal'));
    avatar.update(.05, 0, 'crouch');
    assert.ok(avatar.leftLeg.rotation.x > 0);
    avatar.update(.05, 0, 'kneel');
    assert.ok(avatar.leftLeg.userData.knee.rotation.x < 0);
  } finally {
    avatar.dispose();
  }
});

test('every soft body scale is independent, clamped and rebuilds the mesh', () => {
  const p = normalizeAvatar({
    bodyColor: '#Ff00aB', headScale: 1.22, forearmSize: 1.5,
    upperArmSize: .78, shoulderSize: 1.3, thighSize: 1.35,
    calfSize: .8, handSize: 1.2, footSize: 1.37,
  });
  assert.equal(p.bodyColor, '#ff00ab');
  assert.equal(p.forearmSize, 1.5);
  assert.equal(p.upperArmSize, .78);
  assert.equal(p.shoulderSize, 1.3);
  assert.equal(p.thighSize, 1.35);
  assert.equal(p.calfSize, .8);
  assert.equal(p.handSize, 1.2);
  assert.equal(p.footSize, 1.37);
  assert.equal(normalizeAvatar({ bodyColor:'not-a-colour' }).bodyColor, normalizeAvatar().bodyColor);
  assert.equal(normalizeAvatar({ thighSize:100 }).thighSize, AVATAR_RANGES.thighSize[1]);
  const avatar = new Avatar(new THREE.Scene(), p);
  try {
    const oldHead = avatar.head.userData.headMesh.scale.x;
    const oldForearm = avatar.leftArm.userData.elbow.getObjectByName('forearm').geometry;
    avatar.updateStyle({ ...p, headScale:.84, forearmSize:.69, bodyColor:'#31c9a4' });
    assert.ok(avatar.head.userData.headMesh.scale.x < oldHead);
    assert.notEqual(avatar.leftArm.userData.elbow.getObjectByName('forearm').geometry, oldForearm);
    assert.equal(avatar.material.skin.color.getHexString(), '31c9a4');
  } finally {
    avatar.dispose();
  }
});

test('polygon loft has soft normals and closed ends', () => {
  const geometry = softLoftGeometry([
    { y:-.5, rx:.13, rz:.11 }, { y:0, rx:.23, rz:.16 },
    { y:.5, rx:.19, rz:.12 },
  ], 12, 2.8);
  assert.ok(geometry.getAttribute('normal').count > 0);
  assert.ok(geometry.index.count >= 12*2*6);
  assert.equal(geometry.getAttribute('position').count, 12*3+2);
  geometry.dispose();
});

test('all hotel NPCs default to the soft rig without losing their source assets', () => {
  assert.equal(new Set(NPC_CAST.map(n => n.bodyColor)).size, NPC_CAST.length);
  for (const npc of NPC_CAST) {
    assert.equal(npcProfile(npc).baseModel, 'soft');
    assert.match(npc.asset, /^vroid/);
  }
});
