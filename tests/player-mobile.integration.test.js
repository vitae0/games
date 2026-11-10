import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/player/Player.js';

function playerFixture() {
  const noop=()=>{};
  const canvas={addEventListener:noop,removeEventListener:noop};
  globalThis.document={pointerLockElement:null,addEventListener:noop,removeEventListener:noop};
  globalThis.window={addEventListener:noop,removeEventListener:noop};
  const camera=new THREE.PerspectiveCamera(70,1.4,.1,300);
  const scene=new THREE.Scene();scene.add(camera);
  const hotel={
    releaseGrip:noop,moveGrip:noop,
    tryGrab:()=>null,
    collisions:{ blocked:()=>false,move:(floor,x,z,dx,dz)=>({x:x+dx,z:z+dz}) }
  };
  const events={toast:noop,interact:noop,isModalOpen:()=>false,isCustomizerOpen:()=>false,isElevatorOpen:()=>false,toggleCustomizer:noop};
  return new Player(canvas,camera,scene,hotel,{},events);
}

test('mobile player moves analog without requiring desktop pointer lock', () => {
  const p=playerFixture();
  try {
    assert.equal(p.active,false);
    p.touchActive=true;
    assert.equal(p.active,true);
    p.setTouchMove(.5,.5);
    p.update(.05);
    const distance=Math.hypot(p.position.x,p.position.z+11.4);
    assert.ok(distance > .08 && distance < .20, `analog travel ${distance}`);
    p.setTouchMove(0,0);
    p.update(.05);
    assert.equal(p.walkSpeed,0);
  } finally {p.dispose();}
});

test('mobile posture and hands stay accessible without physical keys', () => {
  const p=playerFixture();
  try {
    p.touchActive=true;
    p.touchCrouch=true;
    p.update(.05);
    assert.ok(p.eyePosition().y < p.avatar.profile.height * .75);
    assert.ok(p.avatar.leftLeg.rotation.x > 0.03);
    p.touchCrouch=false;
    p.setFloorPosture('floorSit');
    p.update(.05);
    assert.equal(p.posture,'floorSit');
    assert.equal(p.avatar.root.visible,true);
    p.setFloorPosture('floorSit');
    assert.equal(p.posture,'stand');
    p.toggleCamera();
    assert.equal(p.thirdPerson,true);
    p.pressHand('left');
    assert.equal(p.hands.left.pressed,true);
    p.releaseHand('left');
    assert.equal(p.hands.left.pressed,false);
  } finally {p.dispose();}
});

test('third-person camera orbit never rotates stationary avatar, movement rotates avatar toward travel', () => {
  const p=playerFixture();
  try {
    p.touchActive=true;
    p.toggleCamera();
    p.update(.05);
    const initialFacing=p.avatar.root.rotation.y;
    const cameraBefore=p.camera.position.clone();
    p.lookBy(550,-60);
    p.update(.05);
    assert.ok(Math.abs(p.yaw-initialFacing)>.5, 'camera orientation changed');
    assert.equal(p.avatar.root.rotation.y,initialFacing,'idle character kept facing');
    assert.ok(p.camera.position.distanceTo(cameraBefore)>.05,'camera orbited around stationary character');

    p.setTouchMove(0,1);
    for(let i=0;i<20;i++) p.update(.05);
    const movementFacing=p.avatar.root.rotation.y;
    assert.ok(Math.abs(Math.atan2(Math.sin(movementFacing-p.yaw),Math.cos(movementFacing-p.y)))<.02,
      'walking forward turns avatar to actual heading');
    p.setTouchMove(0,0);
    p.lookBy(-350,0);
    p.update(.05);
    assert.equal(p.avatar.root.rotation.y,movementFacing,'facing persists after stopping even if camera turns');
    p.toggleCamera();
    p.update(.05);
    assert.equal(p.avatar.root.rotation.y,p.yaw,'first-person restores camera-aligned facing');
  } finally {p.dispose();}
});

test('third-person blocked movement does not rotate avatar', () => {
  const p=playerFixture();
  try {
    p.touchActive=true;
    p.toggleCamera();
    p.hotel.collisions.move=(_floor,x,z)=>({x,z});
    const initial=p.avatar.root.rotation.y;
    p.lookBy(500,0);
    p.setTouchMove(0,1);
    p.update(.05);
    assert.equal(p.walkSpeed,0);
    assert.equal(p.avatar.root.rotation.y,initial);
  } finally {p.dispose();}
});
