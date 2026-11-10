import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Hotel } from '../src/world/Hotel.js';
import { suitePlan } from '../src/world/SuitePlan.js';

function suite(side, z, floor = 1) {
  const events = [], geometry = [], doors = new Map();
  let nextCollider = 0;
  const geometries = [new THREE.BoxGeometry(1.70, 1, .025), new THREE.BoxGeometry(.54,.72,.032),
    new THREE.BoxGeometry(.06,2.33,1.12),new THREE.BoxGeometry(.025,.74,.025),
    new THREE.CylinderGeometry(.063,.063,.20,8)];
  const mats = {warm:new THREE.MeshBasicMaterial(), glass:new THREE.MeshBasicMaterial()};
  const media = Array.from({length:3}, () => ({material:new THREE.MeshBasicMaterial()}));
  const fake = {
    scene: new THREE.Scene(), suiteScreenGeometry:geometries[0], suiteMinibarGlowGeometry:geometries[1],
    suiteBathroomDoorGeometry:geometries[2], suiteWaterGeometry:geometries[3], suiteBottleGeometry:geometries[4],
    media, materials:mats, suiteMeshes:[], interactables:[], animations:[], walkSurfaces:[],
    box(name, x, y, z, width, height, depth, roomFloor, solid) {
      geometry.push({name,x,y,z,width,height,depth,floor:roomFloor,solid:!!solid});
    },
    addWalkSurface:Hotel.prototype.addWalkSurface,
    addProp(){},
    collisions:{add(){const id=++nextCollider;doors.set(id,true);return id;},setActive(id,v){doors.set(id,v)}},
    events:{toast:x=>events.push(x)},
  };
  Hotel.prototype.makeRoom.call(fake, floor, side, z);
  return {fake,geometry,doors,events,cleanup(){
    geometries.forEach(g=>g.dispose());media.forEach(m=>m.material.dispose());
    Object.values(mats).forEach(m=>m.dispose());
  }};
}

test('all mirrored suites include usable TV, bathroom, minibar, seating, and raised mattress', () => {
  for(const side of [-1,1]) for(const z of [-10.5,-3.5,3.5,10.5]) {
    const s=suite(side,z);
    try {
      const labels=s.fake.interactables.map(o=>o.getLabel()).join(' / ');
      for(const text of ['TV','Koltuk','Yatak','Minibar','Banyo kapısı','Duş'])
        assert.ok(labels.includes(text),`${text} missing for side ${side} z ${z}`);
      assert.equal(s.fake.walkSurfaces.length,1);
      assert.equal(s.fake.walkSurfaces[0].topY,3.4+.62);
      const p=suitePlan(side,z);
      assert.ok(Math.abs(p.entry.x-side*2.6)<.000001);
    }finally{s.cleanup()}
  }
});

test('TV cycles city, art, relax then switches off',()=>{
  const s=suite(1,3.5);
  try {
    const tv=s.fake.interactables.find(o=>o.getLabel().startsWith('TV'));
    assert.equal(tv.getLabel(),'TV · Aç');
    tv.activate(); assert.ok(tv.getLabel().includes('City'));
    tv.activate(); assert.ok(tv.getLabel().includes('Art'));
    tv.activate(); assert.ok(tv.getLabel().includes('Relax'));
    tv.activate(); assert.equal(tv.getLabel(),'TV · Aç');
    assert.equal(s.fake.suiteMeshes[0].visible,false);
  }finally{s.cleanup()}
});

test('minibar and bath doors, shower and water each toggle their state',()=>{
  const s=suite(-1,-3.5);
  try {
    const get=key=>s.fake.interactables.find(o=>o.getLabel().startsWith(key));
    const minibar=get('Minibar');
    minibar.activate(); assert.ok(minibar.getLabel().includes('Su al'));
    minibar.activate(); assert.ok(minibar.getLabel().includes('Kapat'));
    minibar.activate(); assert.ok(minibar.getLabel().includes('Aç'));
    const bath=get('Banyo kapısı');
    assert.equal([...s.doors.values()].at(-1),true);
    bath.activate(); assert.equal([...s.doors.values()].at(-1),false);
    s.fake.animations.forEach(fn=>fn(1/60));
    bath.activate(); assert.equal([...s.doors.values()].at(-1),true);
    const shower=get('Duş');
    shower.activate(); assert.ok(shower.getLabel().includes('Kapat'));
    shower.activate(); assert.ok(shower.getLabel().includes('Aç'));
  }finally{s.cleanup()}
});

test('bed edge, bed resting, lounge sofa and desk chair use Player furniture API',()=>{
  const s=suite(1,-3.5);
  try {
    const calls=[],player={useFurniture:(...args)=>calls.push(args)};
    for(const key of ['Yatak · Uzan','Yatak kenarı','Koltuk','Çalışma sandalyesi'])
      s.fake.interactables.find(o=>o.getLabel().startsWith(key)).activate(player);
    assert.deepEqual(calls.map(c=>c[0]),['rest','sit','sit','sit']);
    assert.equal(calls[0][4],.62);
    assert.equal(calls[1][4],.61);
  }finally{s.cleanup()}
});
