import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Hotel } from '../src/world/Hotel.js';

function suite(side, z, floor = 1) {
  const events = [];
  const record = [];
  const makeGeometry = () => new THREE.BoxGeometry(.1, .1, .1);
  const geometries = [makeGeometry(),makeGeometry(),makeGeometry(),makeGeometry(),
    new THREE.CylinderGeometry(.063,.063,.2,8)];
  const mats = [new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial(),
    new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial()];
  const fake = {
    scene: new THREE.Scene(),
    suiteScreenGeometry: geometries[0], suiteMinibarGlowGeometry: geometries[1],
    suiteBathroomDoorGeometry: geometries[2], suiteWaterGeometry: geometries[3],
    suiteBottleGeometry: geometries[4],
    media: [{material:mats[0]}, {material:mats[1]}, {material:mats[2]}],
    materials: {glass:mats[3],warm:mats[4]},
    interactables: [], animations: [], suiteMeshes: [], walkSurfaces: [],
    box(name, x, y, z, width, height, depth, roomFloor, solid) {
      record.push({name, x, y, z, width, height, depth, floor:roomFloor, solid:!!solid});
    },
    addWalkSurface: Hotel.prototype.addWalkSurface,
    collisions: { add:()=>1, setActive:()=>{} },
    addProp() {},
    events: { toast: x => events.push(x) },
  };
  Hotel.prototype.makeRoom.call(fake, floor, side, z);
  return {fake, record, events, cleanup() {
    geometries.forEach(g=>g.dispose()); mats.forEach(m=>m.dispose());
  }};
}

test('all mirrored suites include TV, sofa, bed, bath, minibar and raised mattress', () => {
  for (const side of [-1,1]) for (const z of [-10.5,-3.5,3.5,10.5]) {
    const s = suite(side,z);
    try {
      const labels = s.fake.interactables.map(i=>i.getLabel()).join(' / ');
      for (const word of ['TV','Koltuk','Yatak','Minibar','Banyo','Duş']) {
        assert.ok(labels.includes(word), `${word} missing`);
      }
      assert.equal(s.fake.walkSurfaces.length,1);
      assert.ok(Math.abs(s.fake.walkSurfaces[0].topY-(3.4+.62))<1e-10);
      for (const b of s.record.filter(x=>x.solid)) {
        const crossesDoor = Math.abs(b.x-side*2.4)<(b.width+.35)/2 &&
          Math.abs(b.z-z)<(b.depth+1.0)/2;
        assert.ok(!crossesDoor,`entry blocked by ${JSON.stringify(b)}`);
      }
    } finally {s.cleanup();}
  }
});

test('TV channel cycle and minibar door remain independent and reversible', () => {
  const s=suite(1,3.5);
  try {
    const tv=s.fake.interactables.find(x=>x.getLabel().startsWith('TV'));
    const minibar=s.fake.interactables.find(x=>x.getLabel().startsWith('Minibar'));
    assert.equal(tv.getLabel(),'TV · Aç');
    tv.activate(); assert.match(tv.getLabel(),/City/);
    tv.activate(); assert.match(tv.getLabel(),/Art/);
    tv.activate(); assert.match(tv.getLabel(),/Relax/);
    tv.activate(); assert.equal(tv.getLabel(),'TV · Aç');
    assert.equal(minibar.getLabel(),'Minibar · Aç');
    minibar.activate(); assert.equal(minibar.getLabel(),'Minibar · Su al');
    minibar.activate(); assert.equal(minibar.getLabel(),'Minibar · Kapat');
    minibar.activate(); assert.equal(minibar.getLabel(),'Minibar · Aç');
    assert.ok(s.events.some(x=>x.includes('TV kapatıldı')));
    assert.ok(s.events.some(x=>x.includes('su aldın')));
  } finally {s.cleanup();}
});

test('bed rest, bed edge and sofa all use physical furniture interaction heights', () => {
  const s=suite(-1,-3.5);
  try {
    const used=[];
    const actor={useFurniture:(...args)=>used.push(args)};
    for (const prefix of ['Koltuk','Yatak · Uzan','Yatak kenarı']) {
      const obj=s.fake.interactables.find(x=>x.getLabel().startsWith(prefix));
      assert.ok(obj,`missing ${prefix}`); obj.activate(actor);
    }
    assert.deepEqual(used.map(x=>x[0]),['sit','rest','sit']);
    assert.ok(used.every(x=>x[4]>.3));
  } finally {s.cleanup();}
});
