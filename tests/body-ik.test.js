import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Avatar } from '../src/avatar/Avatar.js';
import { BodyIK, solveTwoBone, footStepOffset, advanceFootTarget, kickFootPose, KICK_DURATION } from '../src/player/BodyIK.js';

test('IK solver preserves lengths for an unreachable target', () => {
  const start = new THREE.Vector3(0, 1, 0);
  const result = solveTwoBone(start, new THREE.Vector3(0, 1, -8), .46, .42,
    new THREE.Vector3(.3, -1, 0));
  assert.ok(result);
  assert.ok(Math.abs(start.distanceTo(result.elbow) - .46) < 1e-6);
  assert.ok(Math.abs(result.elbow.distanceTo(result.end) - .42) < 1e-6);
  assert.ok(start.distanceTo(result.end) < .88);
});

test('foot placement allows forward stepping and limits lateral spread', () => {
  assert.ok(footStepOffset(0, 0).forward < -.25);
  assert.equal(footStepOffset(0, 0).sideways, 0);
  for (const yaw of [-Math.PI, -.8, 0, .8, Math.PI]) {
    const step = footStepOffset(yaw, 0);
    assert.ok(Math.abs(step.sideways) <= .120001);
    assert.ok(step.forward < 0);
  }
});

test('left hand IK leaves the right shoulder in its idle pose', () => {
  const scene = new THREE.Scene();
  const avatar = new Avatar(scene, { baseModel: 'softMale' });
  const ik = new BodyIK(avatar);
  try {
    avatar.update(.016, 0);
    const left = avatar.leftArm.quaternion.clone();
    const right = avatar.rightArm.quaternion.clone();
    ik.update(.05, {
      hands: { left: { pressed: true, distance: 1.55 }, right: { pressed: false } },
      eye: new THREE.Vector3(0, 1.65, 0),
      look: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0),
      posture: 'stand', precision: false,
    });
    assert.ok(left.angleTo(avatar.leftArm.quaternion) > .05);
    assert.ok(right.angleTo(avatar.rightArm.quaternion) < .01);
    assert.ok(avatar.leftArm.userData.elbow.quaternion.angleTo(new THREE.Quaternion()) > .01);
  } finally { avatar.dispose(); }
});

test('right leg control does not move the left leg, and local FPS hides only occluders', () => {
  const scene = new THREE.Scene();
  const avatar = new Avatar(scene, { baseModel: 'softMale' }, { localPlayer: true });
  const ik = new BodyIK(avatar);
  try {
    avatar.update(.02, 0);
    const left = avatar.leftLeg.quaternion.clone();
    ik.placeFoot('right', .8, 0);
    ik.update(.05, {
      hands: { left: { pressed: false }, right: { pressed: false } },
      eye: new THREE.Vector3(0, 1.65, 0),
      look: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0),
      posture: 'stand', precision: true,
    });
    assert.ok(avatar.rightLeg.quaternion.angleTo(new THREE.Quaternion()) > .01);
    assert.ok(avatar.leftLeg.quaternion.angleTo(left) < .01);
    const camera = new THREE.PerspectiveCamera();
    camera.layers.set(0);
    assert.ok(avatar.firstPersonOccluders.length > 0);
    assert.ok(avatar.firstPersonOccluders.every(mesh => !camera.layers.test(mesh.layers)));
    camera.layers.enable(1);
    assert.ok(avatar.firstPersonOccluders.every(mesh => camera.layers.test(mesh.layers)));
  } finally { avatar.dispose(); }
});

test('manual foot movement opens far wider while respecting side and height limits', () => {
  const neutral = {sideways:0,forward:0,height:.025,bend:0};
  const held = new Set(['KeyQ', 'KeyW', 'KeyR']);
  let right = neutral;
  let left = neutral;
  for (let i = 0; i < 70; i++) {
    right = advanceFootTarget(right,held,'right',.05);
    left = advanceFootTarget(left,held,'left',.05);
  }
  assert.ok(right.sideways > .50);
  assert.ok(left.sideways < -.50);
  assert.equal(right.forward, -.82);
  assert.equal(right.height, .77);
  const inside = advanceFootTarget(right, new Set(['KeyE','KeyS','KeyF']), 'right', .05);
  assert.ok(inside.sideways < right.sideways && inside.forward > right.forward);
  assert.ok(inside.height < right.height);
});

test('holding Ctrl bends knee without disabling independent leg translation', () => {
  let step = {sideways: .25,forward:-.45,height:.10,bend:0};
  for (let i=0;i<20;i++) step=advanceFootTarget(step,new Set(['ControlLeft']),'right',.05);
  assert.ok(step.bend > .9);
  assert.equal(step.sideways,.25);
  assert.equal(step.forward,-.45);
  for(let i=0;i<20;i++)step=advanceFootTarget(step,new Set(),'right',.05);
  assert.ok(step.bend < .01);
});

test('kick phases chamber, extend and smoothly return to rest',()=>{
  const chamber=kickFootPose(.20,'right'), extended=kickFootPose(.40,'right');
  assert.ok(chamber.height > .4 && chamber.forward > 0);
  assert.ok(extended.forward < -.7 && extended.height > .5);
  assert.ok(kickFootPose(.20,'left').sideways < 0);
  assert.ok(kickFootPose(.20,'right').sideways > 0);
  assert.equal(kickFootPose(KICK_DURATION,'right'),null);
});

test('leg kick continues after precision release and ends on its own',()=>{
  const scene=new THREE.Scene(),avatar=new Avatar(scene,{baseModel:'softFemale'});
  const ik=new BodyIK(avatar);
  try{
    ik.kick('right');
    ik.clearSteps();
    const input={hands:{left:{pressed:false},right:{pressed:false}},eye:new THREE.Vector3(0,1.6,0),
      look:new THREE.Vector3(0,0,-1),right:new THREE.Vector3(1,0,0),posture:'stand',precision:false};
    for(let i=0;i<6;i++){avatar.update(.05,0);ik.update(.05,input);}
    assert.ok(ik.kicks.right);
    assert.ok(avatar.rightLeg.rotation.x < 0 || Math.abs(avatar.rightLeg.rotation.z)>.05);
    for(let i=0;i<20;i++){avatar.update(.05,0);ik.update(.05,input);}
    assert.equal(ik.kicks.right,null);
  } finally{avatar.dispose();}
});
