import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {collectWorldActions} from '../src/ui/WorldActionLabels.js';

test('world actions project onto object anchors and exclude distant/other floor actions',()=>{
  const camera=new THREE.PerspectiveCamera(70,1,.1,100);
  camera.position.set(0,1.5,0);
  camera.lookAt(0,1.5,-5);
  camera.updateMatrixWorld();
  const player={position:new THREE.Vector3(0,0,0),floor:0};
  const make=(x,z,f=0)=>({
    floor:f,position:new THREE.Vector3(x,1,z),
    getLabel:()=> 'Kapıyı aç',activate(){}
  });
  const front=make(0,-2);
  front.labelPosition=new THREE.Vector3(.5,1,-2);
  const selected=collectWorldActions([front,make(0,-4),make(0,2),make(0,-2,1)],player,camera);
  assert.equal(selected.length,1);
  assert.equal(selected[0].action,front);
  assert.ok(selected[0].x>.5,'label uses actual object anchor not approach point');
  assert.ok(selected[0].y>.05 && selected[0].y<.95);
});
