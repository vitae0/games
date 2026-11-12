import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildBar, buildPublicRestrooms } from '../src/world/PublicAmenities.js';
import { PUBLIC_WC } from '../src/world/PublicRestroom.js';
import { FurnitureMotion } from '../src/world/FurnitureMotion.js';

function fakeHotel() {
  const geometry=[], states=new Map(), surfaces=[], events=[], mirrors=[], lights=[];
  let id=0;
  const palette=['black','fabric','wood','warm','glass','trim','ceramic',
    'innerWall','slab','ceiling','cyan','magenta','darkWall'];
  const hotel={
    scene:new THREE.Scene(),suiteMeshes:[],
    materials:Object.fromEntries(palette.map(name=>[name,new THREE.MeshBasicMaterial()])),
    propGeometry:new THREE.BoxGeometry(1,1,1),
    furnitureMotion:new FurnitureMotion(),
    suiteBathroomDoorGeometry:new THREE.BoxGeometry(.06,2.33,1.12),
    animations:[],interactables:[],
    box:(mat,x,y,z,w,h,d,floor,solid)=>geometry.push({mat,x,y,z,w,h,d,floor,solid}),
    rounded:(mat,x,y,z,w,h,d,floor,solid)=>geometry.push({mat,x,y,z,w,h,d,floor,solid}),
    addWalkSurface:(floor,x,z,w,d,y)=>surfaces.push({floor,x,z,w,d,y}),
    climbable:(floor,x,z,w,d,y,label)=>surfaces.push({floor,x,z,w,d,y,label}),
    roomLighting:{register(_floor,x,y,z,name){
      lights.push({x,y,z,name});
      let on=true;
      return {getLabel:()=>on?'Işığı kapat':'Işığı aç',toggle:()=>on= !on};
    }},
    mirrors:{register:(...args)=>mirrors.push(args)},
    collisions:{
      add(_floor,x,z,w,d){states.set(++id,{active:true,x,z,w,d});return id},
      setActive(i,active){states.get(i).active=active},
    },
    events:{toast:msg=>events.push(msg)},
  };
  const frame=(dt=.075)=>{
    for(const animate of hotel.animations)animate(dt);
    hotel.furnitureMotion.update(dt);
  };
  return {hotel,geometry,states,surfaces,events,mirrors,lights,frame,dispose(){
    hotel.suiteBathroomDoorGeometry.dispose();
    hotel.propGeometry.dispose(); hotel.furnitureMotion.dispose();
    Object.values(hotel.materials).forEach(material=>material.dispose());
  }};
}

const findAction=(hotel,fragment)=>hotel.interactables.find(a=>a.getLabel().includes(fragment));
const cabinActions=(hotel,fragment)=>hotel.interactables.filter(a=>a.getLabel().includes(fragment));

test('bar keeps service, seats and walking counter without obstructing entry',()=>{
  const f=fakeHotel();
  try{
    buildBar(f.hotel);
    const labels=f.hotel.interactables.map(a=>a.getLabel());
    assert.ok(labels.some(s=>s.includes('sipariş')));
    assert.ok(labels.filter(s=>s.includes('Bar taburesi')).length>=3);
    assert.ok(f.surfaces.some(s=>Math.abs(s.x-8.4)<.01&&Math.abs(s.y-1.35)<.01));
    const drink=findAction(f.hotel,'sipariş');
    drink.activate(); drink.activate();
    assert.equal(f.events.length,2);
    assert.notEqual(f.events[0],f.events[1]);
    for(const g of f.geometry.filter(s=>s.solid)){
      const nearEntry=Math.abs(g.x-2.6)<(g.w+1.0)/2&&
        Math.abs(g.z+10.5)<(g.d+1.0)/2;
      assert.equal(nearEntry,false,'bar must not obstruct public entrance');
    }
  }finally{f.dispose()}
});

test('public restroom provides three private cubicles and a genuinely clear corridor entry',()=>{
  const f=fakeHotel();
  try{
    const result=buildPublicRestrooms(f.hotel);
    assert.strictEqual(result.layout,PUBLIC_WC);
    const doors=cabinActions(f.hotel,'Kapıyı');
    assert.equal(doors.length,3);
    assert.equal(cabinActions(f.hotel,' · Kullan').length,3);
    assert.equal(cabinActions(f.hotel,' · Sifonu çek').length,3);
    assert.equal(cabinActions(f.hotel,' · Kilitle').length,3);
    assert.equal(cabinActions(f.hotel,' · Kapağı kaldır').length,3);
    assert.ok(f.geometry.some(g=>g.mat==='innerWall'&&g.x>11.5&&g.d>6.5&&g.h>3),
      'external glass windows have an opaque privacy screen');
    assert.ok(f.geometry.some(g=>g.mat==='innerWall'&&g.x===PUBLIC_WC.stallDoorX&&
      g.h>.5&&g.y>2.5),'doors have real wall headers above');
    assert.ok(f.geometry.filter(g=>g.solid&&g.z>-6.55&&g.z<-.4).length>=10);
    for(const g of f.geometry.filter(g=>g.solid)){
      const entranceX=2.33,entranceZ=-3.5,clearance=.35;
      const blocked=Math.abs(entranceX-g.x)<g.w/2+clearance&&
        Math.abs(entranceZ-g.z)<g.d/2+clearance;
      assert.equal(blocked,false,'entrance clear of new solid walls');
    }
    assert.ok(f.geometry.filter(g=>g.mat==='trim'&&g.h<.01).length>=11,
      'tile joints and directional floor pattern are actually modeled');
    assert.equal(f.mirrors.length,3);
    assert.ok(f.mirrors.every(args=>args.at(-1)===0),
      'sink mirrors point into the bathroom instead of into the wall');
    assert.equal(f.lights.length,1);
    const handles=f.hotel.suiteMeshes.filter(m=>m.name.startsWith('public-stall-door-'));
    assert.equal(handles.length,3);
    assert.ok(f.geometry.filter(g=>g.mat==='trim'&&g.z>-.8&&g.y===.76).length>=1,
      'accessible cubicle includes support rails');
  }finally{f.dispose()}
});

test('cubicle doors, locks, privacy indicator and occupancy operate independently',()=>{
  const f=fakeHotel();
  try{
    buildPublicRestrooms(f.hotel);
    const d1=findAction(f.hotel,'Kabin 1 · Kapıyı');
    const d2=findAction(f.hotel,'Kabin 2 · Kapıyı');
    const lock1=findAction(f.hotel,'Kabin 1 · Kilitle');
    const use1=findAction(f.hotel,'Klozet 1 · Kullan');
    const pivot=f.hotel.suiteMeshes.find(m=>m.name==='public-stall-door-1');
    const indicator=f.hotel.suiteMeshes.find(m=>m.name==='public-stall-occupancy-1');
    assert.ok(pivot && indicator);
    assert.notEqual(d1.groupId,use1.groupId,'door and bowl are separate clickable objects');
    assert.notDeepEqual(d1.labelPosition.toArray(),use1.labelPosition.toArray());
    assert.equal(d1.isAvailable(),true);
    assert.equal(use1.isAvailable(),false,'closed toilet cannot be clicked through the door');
    use1.activate({useFurniture:()=>assert.fail('closed stall cannot be occupied')});
    assert.ok(f.events.at(-1).includes('kapısını aç'));
    d1.activate();
    assert.equal(use1.isAvailable(),true,'open stall exposes its independently clickable toilet');
    for(let i=0;i<24;i++)f.frame();
    assert.ok(pivot.rotation.y>1.0,'actual hinged door swings into cubicle');
    assert.equal([...f.states.values()].filter(s=>!s.active).length,1,
      'one opened door disables only its own collider');
    assert.equal(d2.getLabel(),'Kabin 2 · Kapıyı aç');
    d1.activate();
    lock1.activate();
    assert.equal(indicator.material,f.hotel.materials.magenta);
    d1.activate();
    assert.ok(f.events.at(-1).includes('kilitli'));
    lock1.activate();
    assert.equal(indicator.material,f.hotel.materials.cyan);

    d1.activate();
    const records=[];
    use1.activate({useFurniture:(...args)=>records.push(args)});
    assert.equal(records.length,1);
    assert.equal(records[0][0],'sit');
    assert.equal(records[0][5].style,'stool');
    records[0][5].onEnter();
    assert.equal(indicator.material,f.hotel.materials.magenta);
    assert.equal([...f.states.values()].filter(s=>!s.active).length,0,
      'occupied cubicle is automatically closed');
    records[0][5].onExit();
    assert.equal(indicator.material,f.hotel.materials.cyan);
    assert.equal([...f.states.values()].filter(s=>!s.active).length,1,
      'leaving a cubicle unlocks and reopens the door');
  }finally{f.dispose()}
});

test('each lavabo has separately timed water and interactive soap',()=>{
  const f=fakeHotel();
  try{
    buildPublicRestrooms(f.hotel);
    const streams=f.hotel.suiteMeshes.filter(m=>m.name==='public-sink-water');
    const soap=f.hotel.suiteMeshes.filter(m=>m.name==='public-soap-pump');
    assert.equal(streams.length,3);
    assert.equal(soap.length,3);
    assert.ok(streams.every(m=>m.visible===false));
    const taps=cabinActions(f.hotel,'Musluğu');
    assert.equal(taps.length,3);
    const soapActions=cabinActions(f.hotel,'Sabun al');
    assert.equal(soapActions.length,3);
    assert.equal(taps[0].groupId,soapActions[0].groupId);
    taps[0].activate();
    for(let i=0;i<18;i++)f.frame();
    assert.ok(streams[0].visible&&streams[0].scale.y>.14);
    assert.ok(!streams[1].visible&&!streams[2].visible,
      'neighboring washbasins do not switch on together');
    soapActions[1].activate();
    for(let i=0;i<2;i++)f.frame();
    assert.ok(soap[1].position.y<1.13);
    for(let i=0;i<170;i++)f.frame();
    assert.ok(!streams[0].visible,
      'water shuts itself off after twelve seconds');
    assert.ok(Math.abs(soap[1].position.y-1.13)<.002);
  }finally{f.dispose()}
});

test('flushing, independent lid, timed hand dryer, bin and switch work',()=>{
  const f=fakeHotel();
  try{
    buildPublicRestrooms(f.hotel);
    const open=findAction(f.hotel,'Kabin 3 · Kapıyı') ??
      findAction(f.hotel,'Erişilebilir kabin · Kapıyı');
    open.activate();
    const flush=findAction(f.hotel,'Klozet 3 · Sifonu');
    const lid=findAction(f.hotel,'Klozet 3 · Kapağı');
    assert.ok(flush && lid);
    lid.activate();
    for(let i=0;i<19;i++)f.frame();
    const lidPivot=f.hotel.suiteMeshes.find(m=>m.name==='public-toilet-lid-3');
    assert.ok(lidPivot.rotation.z< -1.3);
    flush.activate();
    for(let i=0;i<9;i++)f.frame();
    const ripple=f.hotel.suiteMeshes.find(m=>m.name==='public-toilet-flush-3');
    assert.equal(ripple.visible,true);
    for(let i=0;i<28;i++)f.frame();
    assert.equal(ripple.visible,false);

    const dryer=findAction(f.hotel,'El kurutucu');
    dryer.activate();
    const airflow=f.hotel.suiteMeshes.find(m=>m.name==='public-hand-dryer-air');
    for(let i=0;i<14;i++)f.frame();
    assert.equal(airflow.visible,true);
    for(let i=0;i<75;i++)f.frame();
    assert.equal(airflow.visible,false);

    const bin=findAction(f.hotel,'Çöp kutusu');
    const lidMesh=f.hotel.suiteMeshes.find(m=>m.name==='public-restroom-bin-lid');
    bin.activate();
    for(let i=0;i<20;i++)f.frame();
    assert.ok(lidMesh.rotation.z<-.6);
    bin.activate();
    for(let i=0;i<25;i++)f.frame();
    assert.ok(Math.abs(lidMesh.rotation.z)<.005);
    const lamp=findAction(f.hotel,'Işığı kapat');
    lamp.activate();
    assert.equal(lamp.getLabel(),'Işığı aç');
  }finally{f.dispose()}
});

test('bar stool compresses and reverses when player stands',()=>{
  const f=fakeHotel();
  try{
    buildBar(f.hotel);
    const chair=findAction(f.hotel,'Bar taburesi · Otur');
    const calls=[];
    chair.activate({useFurniture:(...args)=>calls.push(args)});
    const options=calls[0][5];
    assert.equal(options.style,'stool');
    const seat=f.hotel.suiteMeshes.find(mesh=>mesh.name==='bar-stool-seat');
    const previous=seat.scale.y;
    options.onEnter();
    for(let i=0;i<15;i++)f.frame();
    assert.ok(seat.scale.y<previous);
    options.onExit();
    for(let i=0;i<25;i++)f.frame();
    assert.ok(Math.abs(seat.scale.y-previous)<.001);
  }finally{f.dispose()}
});

test('toilet lid/flush/use are grouped at bowl, door and lock at the entrance',()=>{
  const f=fakeHotel();
  try{
    buildPublicRestrooms(f.hotel);
    for(const id of ['1','2','3']){
      const doorGroup=f.hotel.interactables.filter(x=>x.groupId===`public-wc:door:${id}`);
      const bowlGroup=f.hotel.interactables.filter(x=>x.groupId===`public-wc:toilet:${id}`);
      assert.equal(doorGroup.length,2);
      assert.equal(bowlGroup.length,3);
      assert.ok(doorGroup.every(x=>x.getLabel().toLowerCase().includes('kabin')));
      assert.ok(bowlGroup.every(x=>x.getLabel().startsWith('Klozet')));
      assert.ok(doorGroup[0].labelPosition.x<bowlGroup[0].labelPosition.x-1);
      assert.ok(bowlGroup.every(x=>!x.isAvailable()),'no through-door action');
      doorGroup[0].activate();
      assert.ok(bowlGroup.every(x=>x.isAvailable()),'inside bowl is now independently reachable');
    }
  } finally {f.dispose()}
});
