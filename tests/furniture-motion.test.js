import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  FurnitureMotion, furniturePart, furnitureDoor, furnitureDrawer, furnitureSeat,
} from '../src/world/FurnitureMotion.js';

function fixture() {
  const materials=Object.fromEntries(['wood','fabric','warm','trim','black','glass'].map(name=>
    [name,new THREE.MeshBasicMaterial()]));
  const hotel={
    scene:new THREE.Scene(),suiteMeshes:[],
    materials,propGeometry:new THREE.BoxGeometry(1,1,1),
    furnitureMotion:new FurnitureMotion(),
  };
  return {hotel,dispose(){
    hotel.furnitureMotion.dispose();hotel.propGeometry.dispose();
    Object.values(materials).forEach(mat=>mat.dispose());
  }};
}

test('only active furniture tracks are updated; motion reverses without snapping',()=>{
  const motion=new FurnitureMotion();
  let visits=0;
  const track=motion.create(()=>{visits++},9);
  assert.equal(visits,1);
  motion.update(.1);
  assert.equal(visits,1,'idle track is not ticked');
  track.set(1);
  motion.update(.05);
  assert.ok(track.value>0 && track.value<1);
  track.set(0);
  for(let i=0;i<30;i++)motion.update(.075);
  assert.equal(track.value,0);
  assert.equal(motion.active.size,0);
  assert.throws(()=>track.set(Number.NaN),TypeError);
  motion.dispose();
});

test('wardrobe hinges, minibar reverse facing and drawers use one shared box mesh',()=>{
  const f=fixture(),h=f.hotel;
  try{
    const left=furnitureDoor(h,{x:0,y:1,z:0,width:.5,height:2,hinge:'left'});
    const right=furnitureDoor(h,{x:1,y:1,z:0,width:.5,height:2,hinge:'right'});
    const reversed=furnitureDoor(h,{x:2,y:1,z:0,width:.5,height:1,hinge:'left',toward:1});
    const drawer=furnitureDrawer(h,{x:0,y:.5,z:.5,width:.5,height:.2});
    const seat=furnitureSeat(h,{x:1,y:.4,z:1,width:1,height:.2,depth:1,compression:.04,swivel:.1});
    const plain=furniturePart(h,'wood',0,1,1,.2,.2,.2);
    assert.strictEqual(left.pivot.children[0].geometry,h.propGeometry);
    assert.strictEqual(drawer.group.children[0].geometry,h.propGeometry);
    assert.strictEqual(seat.part.geometry,plain.geometry);
    left.setOpen(true);right.setOpen(true);reversed.setOpen(true);
    drawer.setOpen(true);seat.setOccupied(true);
    for(let i=0;i<25;i++)h.furnitureMotion.update(.075);
    assert.ok(left.pivot.rotation.y>1);
    assert.ok(right.pivot.rotation.y< -1);
    assert.ok(reversed.pivot.rotation.y< -1);
    assert.ok(drawer.group.position.z<.25);
    assert.ok(seat.part.scale.y<.17);
    assert.ok(seat.surfaceY() < .5);
    assert.ok(Math.abs(seat.surfaceY() - (seat.part.position.y + seat.part.scale.y / 2)) < 1e-10);
    assert.ok(seat.part.rotation.y>.08);
    left.setOpen(false);right.setOpen(false);
    drawer.setOpen(false);seat.setOccupied(false);
    for(let i=0;i<25;i++)h.furnitureMotion.update(.075);
    assert.ok(Math.abs(left.pivot.rotation.y)<.001);
    assert.ok(Math.abs(right.pivot.rotation.y)<.001);
    assert.ok(Math.abs(drawer.group.position.z-.5)<.001);
    assert.ok(Math.abs(seat.part.scale.y-.2)<.001);
    assert.equal(h.furnitureMotion.active.size,0);
  }finally{f.dispose()}
});
