import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Hotel } from '../src/world/Hotel.js';
import { suitePlan } from '../src/world/SuitePlan.js';
import { createBathAssets } from '../src/world/BathAssets.js';
import { FurnitureMotion } from '../src/world/FurnitureMotion.js';

function suite(side, z, floor = 1) {
  const events = [], geometry = [], doors = new Map();
  let nextCollider = 0;
  const geometries = [new THREE.BoxGeometry(1.70, 1, .025), new THREE.BoxGeometry(.54,.72,.032),
    new THREE.BoxGeometry(.06,2.33,1.12),new THREE.BoxGeometry(.025,.74,.025),
    new THREE.CylinderGeometry(.063,.063,.20,8)];
  const mats = Object.fromEntries(
    ['warm','glass','wood','fabric','trim','black'].map(name=>[name,new THREE.MeshBasicMaterial()]));
  const media = Array.from({length:3}, () => ({material:new THREE.MeshBasicMaterial()}));
  const bathAssets = createBathAssets();
  const fake = {
    scene: new THREE.Scene(), suiteScreenGeometry:geometries[0], suiteMinibarGlowGeometry:geometries[1],
    suiteBathroomDoorGeometry:geometries[2], suiteWaterGeometry:geometries[3], suiteBottleGeometry:geometries[4],
    media, materials:mats, bathAssets, suiteMeshes:[], interactables:[], animations:[], walkSurfaces:[],
    furnitureMotion:new FurnitureMotion(), propGeometry:new THREE.BoxGeometry(1,1,1),
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
    Object.values(mats).forEach(m=>m.dispose()); bathAssets.dispose();
    fake.propGeometry.dispose(); fake.furnitureMotion.dispose();
  }};
}

test('all mirrored suites include usable TV, bathroom, minibar, seating, and raised mattress', () => {
  for(const side of [-1,1]) for(const z of [-10.5,-3.5,3.5,10.5]) {
    const s=suite(side,z);
    try {
      const labels=s.fake.interactables.map(o=>o.getLabel()).join(' / ');
      for(const text of ['TV','Koltuk','Yatak','Minibar','Banyo kapısı','Küvet'])
        assert.ok(labels.includes(text),`${text} missing for side ${side} z ${z}`);
      assert.ok(s.fake.walkSurfaces.length>=2,'bed and other furniture surfaces are physically available');
      assert.ok(s.fake.walkSurfaces.some(item=>Math.abs(item.topY-(3.4+.62))<1e-8));
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
    const screen=s.fake.suiteMeshes.find(mesh=>mesh.geometry===s.fake.suiteScreenGeometry);
    assert.equal(screen.visible,false);
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
    assert.ok([...s.doors.values()].every(Boolean));
    bath.activate(); assert.ok([...s.doors.values()].some(active=>!active));
    s.fake.animations.forEach(fn=>fn(1/60));
    bath.activate(); assert.ok([...s.doors.values()].every(Boolean));
    const tub=s.fake.interactables.find(o=>o.getLabel().startsWith('Küvet · Suyu'));
    const water=s.fake.suiteMeshes.find(mesh=>mesh.material.isShaderMaterial);
    assert.ok(water && water.visible===false);
    tub.activate(); assert.ok(tub.getLabel().includes('boşalt'));
    assert.equal(water.visible,true);
    for(let i=0;i<35;i++)s.fake.furnitureMotion.update(.075);
    const raised=water.position.y;
    assert.ok(raised>3.4+.30,'bath water rose inside the tub');
    tub.activate(); assert.ok(tub.getLabel().includes('doldur'));
    for(let i=0;i<35;i++)s.fake.furnitureMotion.update(.075);
    assert.equal(water.visible,false);
    assert.ok(water.position.y<raised,'bath drained smoothly');
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


test('bath is a full-height room with continuous wall segments, a door, and a non-overlapping tub', () => {
  for(const side of [-1,1]){
    const s=suite(side,3.5);
    try {
      const q=suitePlan(side,3.5);
      const wallX=side*9.14;
      const partitions=s.geometry.filter(b=>b.name==='innerWall'&&Math.abs(b.x-wallX)<1e-5&&b.height>3);
      assert.equal(partitions.length,2,'both sides of bathroom door must be full height');
      assert.ok(s.geometry.some(b=>b.name==='ceiling'&&Math.abs(b.x-q.bath.x)<1e-5),'bathroom has separate ceiling');
      assert.ok(s.geometry.some(b=>b.name==='innerWall'&&Math.abs(b.z-(3.5-.65))<1e-5),'bathroom closed at its front');
      assert.ok(s.fake.suiteMeshes.some(mesh=>mesh.geometry===s.fake.bathAssets.tubGeometry),'oval tub exists');
      const tile=s.geometry.find(b=>b.name==='slab'&&Math.abs(b.x-q.bath.x)<1e-5);
      assert.ok(tile&&Math.abs((tile.y+tile.height/2)-(3.4+.0735))<1e-5,'tile raised above wood floor');
    }finally{s.cleanup()}
  }
});


test('tub offers a separate enter action with a seated posture inside its basin',()=>{
  const s=suite(1,3.5);
  try{
    const tub=s.fake.interactables.find(o=>o.getLabel().startsWith('Küvet · İçine gir'));
    assert.ok(tub);
    const args=[];
    tub.activate({useFurniture:(...x)=>args.push(x)});
    assert.equal(args[0][0],'sit');
    assert.equal(args[0][4],.17);
  }finally{s.cleanup()}
});


test('sofa faces the TV and desk chair faces the workstation in both mirrored suites',()=>{
  for(const side of [-1,1]){
    const s=suite(side,3.5);
    try{
      const commands=[];
      const actor={useFurniture:(...args)=>commands.push(args)};
      s.fake.interactables.find(i=>i.getLabel()==='Koltuk · Otur').activate(actor);
      s.fake.interactables.find(i=>i.getLabel()==='Çalışma sandalyesi · Otur').activate(actor);
      assert.equal(commands[0][3],Math.PI,'sofa must point toward north-facing TV');
      assert.equal(commands[1][3],-side*Math.PI/2,'chair must point toward its workstation');
    }finally{s.cleanup()}
  }
});

test('wardrobe, minibar and drawer interactions move real meshes independently',()=>{
  const s=suite(-1,3.5);
  try{
    const hotel=s.fake;
    const get=text=>hotel.interactables.find(i=>i.getLabel().startsWith(text));
    const wardrobe=get('Gardırop');
    const drawer=get('Masa çekmecesi');
    const night=get('Komodin');
    const fridge=get('Minibar');
    assert.ok(wardrobe&&drawer&&night&&fridge);
    const left=hotel.suiteMeshes.find(mesh=>mesh.name==='wardrobe-left-door');
    const right=hotel.suiteMeshes.find(mesh=>mesh.name==='wardrobe-right-door');
    const tray=hotel.suiteMeshes.find(mesh=>mesh.name==='desk-drawer');
    const minibar=hotel.suiteMeshes.find(mesh=>mesh.name==='minibar-door');
    assert.ok(left&&right&&tray&&minibar);
    wardrobe.activate();
    drawer.activate();
    fridge.activate();
    for(let i=0;i<18;i++)hotel.furnitureMotion.update(.075);
    assert.ok(left.rotation.y>.5);
    assert.ok(right.rotation.y<-.5);
    assert.ok(tray.position.z<s.fake.interactables.find(i=>i.getLabel().startsWith('Masa çekmecesi')).position.z+.73);
    assert.ok(minibar.rotation.y<-.4,'minibar swings toward the usable +Z face');
    assert.ok(night.getLabel().includes('kapat')===false);
    night.activate();
    assert.ok(night.getLabel().includes('kapat'));
    wardrobe.activate();
    for(let i=0;i<35;i++)hotel.furnitureMotion.update(.075);
    assert.ok(Math.abs(left.rotation.y)<.01);
    assert.ok(Math.abs(right.rotation.y)<.01);
  }finally{s.cleanup()}
});

test('cushions respond to furniture enter and release callbacks',()=>{
  const s=suite(1,3.5);
  try{
    const hotel=s.fake, calls=[];
    const makePlayer={useFurniture:(...args)=>calls.push(args)};
    hotel.interactables.find(i=>i.getLabel()==='Koltuk · Otur').activate(makePlayer);
    const args=calls[0];
    assert.equal(args[5].style,'lounge');
    const seat=hotel.suiteMeshes.find(mesh=>mesh.name==='sofa-cushion');
    const original=seat.scale.y;
    args[5].onEnter();
    for(let i=0;i<18;i++)hotel.furnitureMotion.update(.075);
    assert.ok(seat.scale.y<original);
    args[5].onExit();
    for(let i=0;i<30;i++)hotel.furnitureMotion.update(.075);
    assert.ok(Math.abs(seat.scale.y-original)<.001);
  }finally{s.cleanup()}
});
