import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Avatar } from '../src/avatar/Avatar.js';
import { BodyIK, solveTwoBone, footStepOffset, aimFootTarget, kickFootPose, KICK_DURATION } from '../src/player/BodyIK.js';

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

test('mouse yaw moves foot target sideways, and pitch raises and lowers it',()=>{
  const forward=new THREE.Vector3(0,0,-1);
  const right=new THREE.Vector3(.8,0,-.6);
  const up=new THREE.Vector3(0,.65,-.76);
  const down=new THREE.Vector3(0,-.65,-.76);
  const baseline=aimFootTarget(forward,0,'right');
  assert.ok(baseline.forward < -.8);
  const outward=aimFootTarget(right,0,'right');
  assert.ok(outward.sideways > .50);
  assert.ok(aimFootTarget(right,0,'left').sideways <= .19);
  assert.ok(aimFootTarget(up,0,'right').height > baseline.height);
  assert.ok(aimFootTarget(down,0,'right').height < baseline.height);
  const relative=aimFootTarget(forward,Math.PI/2,'right');
  assert.ok(relative.sideways > .5);
});

test('held Ctrl bends selected knee while mouse continues steering foot',()=>{
  const scene=new THREE.Scene(), avatar=new Avatar(scene,{baseModel:'softMale'});
  const ik=new BodyIK(avatar);
  try {
    const keys=new Set(['KeyA','ControlLeft']);
    ik.controlLegs(.05, keys, new THREE.Vector3(0,0,-1), 0);
    for(let i=0;i<20;i++)ik.controlLegs(.05,keys,new THREE.Vector3(0,0,-1),0);
    assert.ok(ik.steps.left.bend>.9);
    const forward=ik.steps.left.forward;
    ik.controlLegs(.1,keys,new THREE.Vector3(-.85,0,-.527),0);
    assert.ok(ik.steps.left.sideways < -.5);
    assert.ok(ik.steps.left.forward > forward);
    keys.delete('ControlLeft');
    for(let i=0;i<20;i++)ik.controlLegs(.05,keys,new THREE.Vector3(-.85,0,-.527),0);
    assert.ok(ik.steps.left.bend < .01);
  } finally {avatar.dispose();}
});

test('kick phases chamber, extend and smoothly return to rest',()=>{
  const chamber=kickFootPose(.20,'right'), extended=kickFootPose(.40,'right');
  assert.ok(chamber.height > .4 && chamber.forward > 0);
  assert.ok(extended.forward < -.7 && extended.height > .5);
  assert.ok(kickFootPose(.20,'left').sideways < 0);
  assert.ok(kickFootPose(.20,'right').sideways > 0);
  const target = { sideways: .5, forward: -.24, height: .77, bend: 0 };
  const aimed = kickFootPose(.40,'right',target);
  assert.ok(Math.abs(aimed.sideways - .5) < .001);
  assert.ok(Math.abs(aimed.height - .77) < .001);
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

test('reversed manual knee pole bends on the opposite side of its old plane',()=>{
  const hip=new THREE.Vector3(0,.89,0),foot=new THREE.Vector3(0,.45,-.28);
  const previous=solveTwoBone(hip,foot,.46,.44,new THREE.Vector3(.15,.12,-1));
  const reversed=solveTwoBone(hip,foot,.46,.44,new THREE.Vector3(.15,.12,1));
  assert.ok(reversed.elbow.z > previous.elbow.z + .10);
});
