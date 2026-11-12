import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/player/Player.js';

function makePlayer() {
  const no = () => {};
  const canvas = {addEventListener:no,removeEventListener:no};
  globalThis.document={pointerLockElement:canvas,addEventListener:no,removeEventListener:no};
  globalThis.window={addEventListener:no,removeEventListener:no};
  const camera=new THREE.PerspectiveCamera(70,1.3,.1,300);
  const scene=new THREE.Scene();scene.add(camera);
  const hotel={releaseGrip:no,moveGrip:no,tryGrab:()=>null,groundHeight:()=>0,
    collisions:{blocked:()=>false,move:(f,x,z,dx,dz)=>({x:x+dx,z:z+dz})}};
  const events={toast:no,interact:no,isModalOpen:()=>false,isCustomizerOpen:()=>false,
    isElevatorOpen:()=>false,toggleCustomizer:no};
  return new Player(canvas,camera,scene,hotel,{},events);
}

test('bed rest and edge sitting honor the furniture height and standing restores previous location',()=>{
  const p=makePlayer();
  try {
    const start=p.position.clone();
    p.useFurniture('rest',8,3,0,.62);
    p.update(1/60);
    assert.equal(p.position.y,.62);
    assert.equal(p.posture,'rest');
    p.standUp();
    assert.equal(p.posture,'stand');
    assert.ok(p.position.distanceTo(start)<1e-9);
    p.useFurniture('sit',8,3,0,.61);
    p.update(1/60);
    assert.equal(p.position.y,.61);
    p.standUp();
    assert.equal(p.furnitureHeight,0);
  } finally {p.dispose()}
});

test('specific furniture style drives pose, activates and releases responsive furniture',()=>{
  const p=makePlayer();
  try{
    let enters=0,exits=0;
    p.pitch=.24;
    p.useFurniture('sit',3,1,Math.PI,.44,{
      style:'desk',onEnter:()=>enters++,onExit:()=>exits++,
    });
    assert.equal(enters,1);
    assert.equal(p.furnitureStyle,'desk');
    p.update(.08);
    assert.ok(p.avatar.leftArm.rotation.x>.1,'desk pose begins moving hands forward');
    assert.equal(p.avatar.root.visible,true,'furniture animations are visible');
    p.standUp();
    assert.equal(exits,1);
    assert.equal(p.furnitureStyle,null);
    assert.equal(p.pitch,.24,'camera pitch restores on standing');
    p.standUp();
    assert.equal(exits,1,'exit callback is executed only once');
    p.useFurniture('rest',4,2,0,.62,{style:'sleep',onEnter:()=>enters++,onExit:()=>exits++});
    for(let i=0;i<15;i++)p.update(.05);
    assert.ok(p.avatar.root.rotation.x< -1.1,'bed rest rotates the body toward a reclined pose');
    assert.equal(p.posture,'rest');
    p.standUp();
    assert.equal(exits,2);
  } finally {p.dispose()}
});
