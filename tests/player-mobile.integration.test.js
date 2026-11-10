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
