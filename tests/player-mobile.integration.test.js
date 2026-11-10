import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/player/Player.js';

function playerHarness(){
 const noop=()=>{};
 const canvas={addEventListener:noop,removeEventListener:noop};
 globalThis.document={pointerLockElement:null,addEventListener:noop,removeEventListener:noop};
 globalThis.window={addEventListener:noop,removeEventListener:noop};
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,1,.1,250);scene.add(camera);
 const hotel={releaseGrip:noop,moveGrip:noop,tryGrab:()=>({kind:'prop',distance:1.2,label:'Kutu'}),collisions:{blocked:()=>false,move:(floor,x,z,dx,dz)=>({x:x+dx,z:z+dz})}};
 const events={isModalOpen:()=>false,isElevatorOpen:()=>false,isCustomizerOpen:()=>false,toggleCustomizer:noop,toast:noop,interact:noop};
 return {p:new Player(canvas,camera,scene,hotel,{},events),events};
}
test('mobile starts without pointer lock, moves with virtual axes, and looks with swipe',()=>{
 const {p}=playerHarness();
 try{
  assert.equal(p.active,false);
  p.setTouchEnabled(true);
  assert.equal(p.active,true);
  const before=p.position.z;
  p.setTouchMovement(1,0);
  p.update(.05);
  assert.notEqual(p.position.z,before);
  const yaw=p.yaw;
  p.lookDelta(60,-25,.003);
  assert.notEqual(p.yaw,yaw);
  p.setTouchMovement(0,0);
  p.touchJump();
  assert.ok(p.verticalSpeed>0);
 }finally{p.dispose()}
});
test('mobile crouch, sit, kneel and camera controls animate actual player',()=>{
 const {p}=playerHarness();
 try{
  p.setTouchEnabled(true);
  p.toggleTouchCrouch();p.update(.05);
  assert.ok(p.eyePosition().y<p.avatar.profile.height*.75);
  assert.ok(p.avatar.leftLeg.rotation.x>0);
  p.setFloorPosture('floorSit');p.update(.05);
  assert.equal(p.posture,'floorSit');assert.equal(p.avatar.root.visible,true);
  p.setFloorPosture('floorSit');assert.equal(p.posture,'stand');
  p.setFloorPosture('kneel');p.update(.05);assert.equal(p.posture,'kneel');
  p.setFloorPosture('kneel');assert.equal(p.posture,'stand');
  p.toggleCamera();assert.equal(p.thirdPerson,true);
 }finally{p.dispose()}
});
test('mobile hands support two grips independently',()=>{
 const {p}=playerHarness();
 try{
  p.setTouchEnabled(true);
  p.grabHand('left');p.grabHand('right');
  assert.ok(p.hands.left.grip && p.hands.right.grip);
  const distance=p.hands.left.distance;
  assert.equal(p.shiftGrip(1),true);
  assert.ok(p.hands.left.distance>distance);
  p.releaseHand('left');assert.equal(p.hands.left.grip,null);
  assert.ok(p.hands.right.grip);
 }finally{p.dispose()}
});
