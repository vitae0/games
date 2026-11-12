import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/player/Player.js';

function createPlayer() {
  const noop = () => {};
  const canvas = { addEventListener:noop, removeEventListener:noop };
  globalThis.document = { pointerLockElement: canvas, addEventListener:noop, removeEventListener:noop };
  globalThis.window = { addEventListener:noop, removeEventListener:noop };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1.5, .1, 250);
  scene.add(camera);
  const hotel = {
    releaseGrip:noop, moveGrip:noop,
    collisions: {
      blocked:() => false,
      move:(_floor, x,z,dx,dz) => ({x:x+dx, z:z+dz}),
    },
  };
  const events = {
    isModalOpen: () => false, isElevatorOpen: () => false,
    isCustomizerOpen: () => false, toggleCustomizer:noop,
    toast:noop, interact:noop,
  };
  return new Player(canvas, camera, scene, hotel, {}, events);
}
const key = (p, code) => p.keyDown({ code, repeat:false, preventDefault(){} });
const up = (p, code) => p.keyUp({ code });

test('real Player: Ctrl crouches with leg bones and returns to standing', () => {
  const p = createPlayer();
  try {
    key(p, 'ControlLeft');
    p.update(.08);
    assert.ok(p.avatar.leftLeg.rotation.x > 0.05);
    assert.ok(p.eyePosition().y < p.avatar.profile.height * .75);
    up(p, 'ControlLeft');
    for(let i=0;i<12;i++) p.update(.05);
    assert.ok(Math.abs(p.avatar.leftLeg.rotation.x) < 0.08);
  } finally { p.dispose(); }
});

test('real Player: double Ctrl seats on floor and the rise action restores standing', () => {
  const p = createPlayer();
  try {
    key(p,'ControlLeft'); up(p,'ControlLeft');
    key(p,'ControlLeft');
    assert.equal(p.posture, 'floorSit');
    p.update(.08);
    assert.equal(p.avatar.root.visible, true);
    assert.ok(p.avatar.leftLeg.userData.knee.rotation.x < -.05);
    up(p,'ControlLeft');
    p.standUp();
    assert.equal(p.posture, 'stand');
    assert.equal(p.verticalSpeed, 0);
  } finally { p.dispose(); }
});

test('real Player: Ctrl+Space kneels without pending jump', () => {
  const p = createPlayer();
  try {
    key(p, 'ControlLeft');key(p, 'Space');
    assert.equal(p.posture, 'kneel');
    p.update(.08);
    assert.equal(p.avatar.root.visible, true);
    assert.ok(Math.abs(p.avatar.rightLeg.rotation.x-p.avatar.leftLeg.rotation.x)<.002,
      'both knees bend into the same kneeling posture');
    assert.equal(p.verticalSpeed,0);
    up(p,'ControlLeft');up(p,'Space');
    key(p,'KeyN');
    assert.equal(p.posture,'floorSit','kneeling exits through floor sitting');
    p.standUp();
    assert.equal(p.posture,'stand');
  } finally { p.dispose(); }
});

test('real Player: three Ctrl taps lie on back, then each E exit rises one stage',()=>{
  const p=createPlayer();
  try{
    key(p,'ControlLeft'); up(p,'ControlLeft');
    key(p,'ControlLeft'); up(p,'ControlLeft');
    assert.equal(p.posture,'floorSit');
    key(p,'ControlLeft'); up(p,'ControlLeft');
    assert.equal(p.posture,'floorLie');
    for(let i=0;i<24;i++)p.update(.05);
    assert.ok(p.floorLieLean>.98);
    assert.ok(p.avatar.root.rotation.x>1.38, 'avatar rests on its back rather than reclining in a chair');
    assert.ok(p.avatar.root.position.y>.15, 'reclining figure stays above the floor');
    assert.equal(p.avatar.leftLeg.rotation.x,p.avatar.rightLeg.rotation.x);
    p.standUp();
    assert.equal(p.posture,'floorSit','first exit sits on ground instead of standing');
    for(let i=0;i<18;i++)p.update(.05);
    assert.ok(p.avatar.root.rotation.x<.12,'reclined root pose unwinds on sitting');
    p.standUp();
    assert.equal(p.posture,'stand','second exit restores walking');
    p.update(.05);
    assert.equal(p.verticalSpeed,0);
  } finally {p.dispose()}
});

test('real Player: floor sit hips are near ground and kneeling uses both knees',()=>{
  const p=createPlayer();
  try{
    p.touchActive=true;
    p.setFloorPosture('floorSit');
    for(let i=0;i<25;i++)p.update(.05);
    assert.ok(p.avatar.body.position.y < -p.avatar.profile.height*.32);
    assert.ok(p.avatar.leftLeg.userData.knee.rotation.x>-.3,
      'floor sitting must not use chair-shaped knees');
    p.setFloorPosture('kneel');
    for(let i=0;i<25;i++)p.update(.05);
    assert.ok(p.avatar.leftLeg.userData.knee.rotation.x<-1.45);
    assert.ok(p.avatar.rightLeg.userData.knee.rotation.x<-1.45);
    assert.ok(Math.abs(p.avatar.leftLeg.rotation.x-p.avatar.rightLeg.rotation.x)<.001);
    p.standUp();
    assert.equal(p.posture,'floorSit');
  } finally {p.dispose()}
});

test('grounded A/D cycles seated poses and their visible hip rotation',()=>{
  const p=createPlayer();
  try{
    p.setFloorPosture('floorSit');
    assert.equal(p.currentFloorVariant.id,'legsForward');
    key(p,'KeyD');up(p,'KeyD');
    assert.equal(p.currentFloorVariant.id,'crossLegged');
    for(let i=0;i<28;i++)p.update(.05);
    assert.ok(p.avatar.leftLeg.rotation.y<-.45);
    assert.ok(p.avatar.rightLeg.rotation.y>.45);
    key(p,'KeyD');up(p,'KeyD');
    assert.equal(p.currentFloorVariant.id,'butterfly');
    for(let i=0;i<28;i++)p.update(.05);
    assert.ok(p.avatar.leftLeg.rotation.z<-.25);
    key(p,'KeyA');up(p,'KeyA');
    assert.equal(p.currentFloorVariant.id,'crossLegged');
    p.setFloorPosture('kneel');
    assert.equal(p.currentFloorVariant.id,'bothKnees');
    key(p,'KeyD');up(p,'KeyD');
    assert.equal(p.currentFloorVariant.id,'seiza');
    p.update(.05);
    assert.equal(p.posture,'kneel');
  }finally{p.dispose()}
});

test('A/D rolls a reclined body 90 degrees and twice onto stomach',()=>{
  const p=createPlayer();
  try {
    p.setFloorPosture('floorLie');
    for(let i=0;i<35;i++)p.update(.05);
    assert.ok(p.viewDirection.y>.88,'lying on back looks toward ceiling');
    key(p,'KeyD');up(p,'KeyD');
    assert.equal(p.lyingQuarterTurns,1);
    for(let i=0;i<34;i++)p.update(.05);
    assert.ok(Math.abs(p.lyingRoll-Math.PI/2)<.01);
    assert.ok(Math.abs(p.viewDirection.y)<.20,'side lying looks toward wall');
    key(p,'KeyD');up(p,'KeyD');
    for(let i=0;i<34;i++)p.update(.05);
    assert.ok(Math.abs(p.lyingRoll-Math.PI)<.02);
    assert.ok(p.viewDirection.y<-.88,'two quarter turns lie face-down');
    key(p,'KeyA');up(p,'KeyA');
    for(let i=0;i<34;i++)p.update(.05);
    assert.ok(Math.abs(p.lyingRoll-Math.PI/2)<.02);
    key(p,'KeyW');up(p,'KeyW');
    assert.equal(p.currentFloorVariant.id,'fetal');
    for(let i=0;i<30;i++)p.update(.05);
    assert.ok(p.avatar.leftLeg.userData.knee.rotation.x<-1.60);
    p.standUp();
    assert.equal(p.posture,'floorSit');
    p.standUp();
    assert.equal(p.posture,'stand');
  }finally{p.dispose()}
});

test('first person is user-selectable in lying, seated, kneeling and furniture poses',()=>{
  const p=createPlayer();
  try {
    for(const posture of ['floorSit','kneel','floorLie']){
      p.setFloorPosture(posture);
      for(let i=0;i<30;i++)p.update(.05);
      assert.equal(p.thirdPerson,false);
      assert.equal(p.camera.layers.mask,1,'FPS masks only the local torso/head');
      assert.ok(p.camera.position.distanceTo(p.eyePosition())<.00001,
        'FPS tracks actual animated head, not fixed eye height');
      assert.ok(p.camera.position.y>=p.floor*3.4+.159,
        'eye is never placed below floor');
      p.toggleCamera();
      p.update(.05);
      assert.equal(p.camera.layers.mask,3,'third-person shows the complete local avatar');
      p.toggleCamera();
      p.update(.05);
      assert.equal(p.camera.layers.mask,1);
    }
    p.standUp();
    p.standUp();
  }finally{p.dispose()}
});

test('Z precision controls legs, arms, wrist and fingers while seated and lying',()=>{
  const p=createPlayer();
  try {
    p.setFloorPosture('floorSit');
    key(p,'KeyZ'); key(p,'KeyS'); key(p,'KeyA');
    for(let i=0;i<14;i++)p.update(.05);
    assert.ok(p.bodyIK.armTargets.left,'Z+S+A must aim left arm while seated');
    assert.equal(p.bodyIK.armTargets.right,null);
    assert.ok(p.avatar.leftArm.quaternion.angleTo(new THREE.Quaternion())>.04);
    up(p,'KeyA');up(p,'KeyS');
    key(p,'KeyQ');key(p,'KeyD'); key(p,'ControlLeft');
    for(let i=0;i<18;i++)p.update(.05);
    assert.ok(p.bodyIK.wristTargets.right);
    assert.ok(p.bodyIK.wristTargets.right.curl>.5);
    assert.ok(p.avatar.rightArm.userData.hand.userData.fingers
      .some(f=>f.rotation.x>.4));
    up(p,'ControlLeft');up(p,'KeyD');up(p,'KeyQ');up(p,'KeyZ');
    p.update(.05);
    assert.ok(p.bodyIK.armTargets.left,'arm pose remains after releasing Z');

    p.setFloorPosture('floorLie');
    key(p,'KeyZ');key(p,'KeyD');
    for(let i=0;i<18;i++)p.update(.05);
    assert.ok(p.bodyIK.steps.right,'Z+D must adjust a leg even on the floor');
    assert.equal(p.lyingQuarterTurns,0,'precision A/D cannot accidentally roll');
    up(p,'KeyD');up(p,'KeyZ');
  }finally{p.dispose()}
});
