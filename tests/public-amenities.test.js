import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildBar, buildPublicRestrooms } from '../src/world/PublicAmenities.js';

function fakeHotel(){
  const geometry=[],states=new Map(),surfaces=[],events=[];
  let id=0;
  const hotel={
    scene:new THREE.Scene(),suiteMeshes:[],
    materials:{black:new THREE.MeshBasicMaterial()},
    suiteBathroomDoorGeometry:new THREE.BoxGeometry(.06,2.33,1.12),
    animations:[],interactables:[],
    box:(mat,x,y,z,w,h,d,floor,solid)=>geometry.push({mat,x,y,z,w,h,d,floor,solid}),
    rounded:(mat,x,y,z,w,h,d,floor,solid)=>geometry.push({mat,x,y,z,w,h,d,floor,solid}),
    addWalkSurface:(floor,x,z,w,d,y)=>surfaces.push({floor,x,z,w,d,y}),
    climbable:(floor,x,z,w,d,y,label)=>surfaces.push({floor,x,z,w,d,y,label}),
    roomLighting:{register(){return {getLabel:()=> 'Işığı kapat',toggle:()=>false}}},
    mirrors:{register(){}},
    collisions:{add(){states.set(++id,true);return id},setActive(i,on){states.set(i,on)}},
    events:{toast:msg=>events.push(msg)}
  };
  return {hotel,geometry,states,surfaces,events,dispose(){
    hotel.suiteBathroomDoorGeometry.dispose();hotel.materials.black.dispose();
  }};
}

test('bar has working service, seats, counter surface and a clear entry',()=>{
  const f=fakeHotel();
  try{
    buildBar(f.hotel);
    const labels=f.hotel.interactables.map(x=>x.getLabel());
    assert.ok(labels.some(x=>x.includes('sipariş')));
    assert.ok(labels.filter(x=>x.includes('Bar taburesi')).length>=3);
    assert.ok(f.surfaces.some(x=>x.label==='Bar tezgâhı'));
    const drink=f.hotel.interactables.find(x=>x.getLabel().includes('sipariş'));
    drink.activate();drink.activate();
    assert.equal(f.events.length,2);
    assert.notEqual(f.events[0],f.events[1]);
    for(const obj of f.geometry.filter(x=>x.solid)){
      const nearEntry=Math.abs(obj.x-2.6)<(obj.w+1.0)/2&&Math.abs(obj.z+10.5)<(obj.d+1.0)/2;
      assert.equal(nearEntry,false,'bar obstructs corridor entrance');
    }
  }finally{f.dispose()}
});

test('public toilet cabins independently open and washbasins respond',()=>{
  const f=fakeHotel();
  try{
    buildPublicRestrooms(f.hotel);
    const doors=f.hotel.interactables.filter(x=>x.getLabel().startsWith('Ortak tuvalet'));
    assert.equal(doors.length,2);
    doors[0].activate();
    assert.ok([...f.states.values()].some(v=>v===false));
    doors[1].activate();
    assert.ok([...f.states.values()].filter(v=>v===false).length>=2);
    doors[0].activate();
    const taps=f.hotel.interactables.find(x=>x.getLabel().startsWith('Lavabolar'));
    taps.activate();
    assert.ok(taps.getLabel().includes('kapat'));
    assert.equal(f.hotel.suiteMeshes.length,2);
    assert.ok(f.surfaces.length>=3);
  }finally{f.dispose()}
});
