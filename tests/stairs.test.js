import test from 'node:test';
import assert from 'node:assert/strict';
import {stairFlight,stairHeight,resolveGround,groundFloor,STAIR,STAIR_RISE,STAIR_RUN} from '../src/world/Stairwell.js';
import {HOTEL} from '../src/config.js';
import {Hotel} from '../src/world/Hotel.js';
import * as THREE from 'three';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);

test('rotated narrow stairs run horizontally, with an open entrance and right-hand first lane',()=>{
  assert.equal(stairFlight(3),null);
  assert.ok(STAIR.width<1.7);
  assert.ok(STAIR.xNear<-4.0,'entrance x=-1.7 remains clear');
  assert.ok(stairFlight(0).z<10.5,'ascending side is right (-Z) of inward-facing door');
  for(let f=0;f<3;f++){
    const q=stairFlight(f);
    near(stairHeight(f,q.xStart,q.z),f*HOTEL.floorHeight);
    near(stairHeight(f,q.xEnd,q.z),(f+1)*HOTEL.floorHeight);
    for(let i=0;i<STAIR.steps;i++){
      const x=q.forward?STAIR.xNear-(i+.5)*STAIR_RUN:STAIR.xFar+(i+.5)*STAIR_RUN;
      near(stairHeight(f,x,q.z),f*HOTEL.floorHeight+(i+1)*STAIR_RISE);
    }
  }
});

test('ground support is reversible for each riser in both directions',()=>{
  for(let f=0;f<3;f++){
    const q=stairFlight(f);let y=f*HOTEL.floorHeight;
    for(let i=0;i<=240;i++){
      const x=q.xStart+(q.xEnd-q.xStart)*i/240;
      y=resolveGround(x,q.z,y);
      near(y,stairHeight(f,x,q.z));
    }
    for(let i=240;i>=0;i--){
      const x=q.xStart+(q.xEnd-q.xStart)*i/240;
      y=resolveGround(x,q.z,y);
      near(y,stairHeight(f,x,q.z));
    }
    near(y,f*HOTEL.floorHeight);
  }
  assert.equal(groundFloor(999),3);
});

test('no extra overlapping first floor and render height matches rotated treads',()=>{
  const boxes=[];
  Hotel.prototype.buildStairs.call({box:(mat,x,y,z,w,h,d)=>boxes.push({mat,x,y,z,w,h,d})});
  assert.ok(boxes.some(b=>b.mat==='trim'&&b.x===-3.95));
  assert.equal(boxes.filter(b=>b.mat==='slab'&&Math.abs(b.y+b.h/2)<1e-8).length,0);
  for(let f=0;f<3;f++){
    const q=stairFlight(f);
    for(let i=0;i<STAIR.steps;i++){
      const x=q.forward?STAIR.xNear-(i+.5)*STAIR_RUN:STAIR.xFar+(i+.5)*STAIR_RUN;
      const slab=boxes.find(b=>b.mat==='slab'&&Math.abs(b.x-x)<1e-8&&Math.abs(b.z-q.z)<1e-8&&Math.abs((b.y-b.h/2)-f*HOTEL.floorHeight)<1e-8);
      assert.ok(slab);
      near(slab.y+slab.h/2,stairHeight(f,x,q.z));
    }
  }
});

test('reception and bar finishes sit above the common uninterrupted ground slab',()=>{
  const boxes=[];
  const seatMaterial=new THREE.MeshBasicMaterial();
  const geometry=new THREE.BoxGeometry(1,1,1);
  const fake={
    scene:new THREE.Scene(),materials:{fabric:seatMaterial},
    suiteMeshes:[],propGeometry:geometry,
    box:(mat,x,y,z,w,h,d)=>boxes.push({mat,x,y,z,w,h,d}),
    rounded:(mat,x,y,z,w,h,d)=>boxes.push({mat,x,y,z,w,h,d}),
    climbable(){},addWalkSurface(){},interactables:[],events:{toast(){}},roomLighting:null,
    mirrors:null,addProp(){},
  };
  Hotel.prototype.makeLobby.call(fake);
  const reception=boxes.find(b=>b.mat==='wood'&&Math.abs(b.y-.015)<1e-8&&Math.abs(b.z+10.85)<1e-8);
  assert.ok(reception);
  near(reception.y+reception.h/2,.03);
  assert.ok(boxes.some(b=>b.mat==='wood'&&Math.abs(b.z+10.68)<1e-8),
    'bar finishes also exist above shared first-floor deck');
  seatMaterial.dispose(); geometry.dispose();
});
