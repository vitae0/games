import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Hotel } from '../src/world/Hotel.js';

function suite(side, z, floor = 1) {
  const events = [];
  const record = [];
  const fake = {
    scene: new THREE.Scene(),
    screenGeometry: new THREE.PlaneGeometry(1.76, 1),
    minibarDoorGeometry: new THREE.BoxGeometry(.075, .75, .62),
    bottleGeometry: new THREE.CylinderGeometry(.062, .062, .19, 8),
    materials: { tvOff: new THREE.MeshBasicMaterial(), tvOn: new THREE.MeshBasicMaterial(),
      wood: new THREE.MeshBasicMaterial(), glass: new THREE.MeshBasicMaterial() },
    interactables: [], animations: [], furnitureDynamics: [], walkSurfaces: [],
    box(name, x, y, z, width, height, depth, roomFloor, solid) {
      record.push({name, x, y, z, width, height, depth, floor:roomFloor, solid:!!solid});
    },
    addWalkSurface: Hotel.prototype.addWalkSurface,
    makeBathroom: Hotel.prototype.makeBathroom,
    addProp() {},
    events: { toast: x => events.push(x) },
  };
  Hotel.prototype.makeRoom.call(fake, floor, side, z);
  return { fake, record, events, cleanup() {
    fake.screenGeometry.dispose(); fake.minibarDoorGeometry.dispose(); fake.bottleGeometry.dispose();
    for (const m of Object.values(fake.materials)) m.dispose();
  } };
}

test('every suite has TV, sofa, bed, minibar, raised mattress, and walkable entry', () => {
  for (const side of [-1,1]) for (const z of [-10.5,-3.5,3.5,10.5]) {
    const s = suite(side,z);
    try {
      const labels = s.fake.interactables.map(i=>i.getLabel()).join(' / ');
      for (const word of ['TV', 'Koltuk', 'Yatak', 'Minibar']) assert.ok(labels.includes(word), `${word} missing`);
      assert.equal(s.fake.walkSurfaces.length,1);
      const surface=s.fake.walkSurfaces[0];
      assert.ok(Math.abs(surface.topY - (3.4 + .575)) < .00001);
      // No collision obstacle may overlap the entry clearance corridor 1.9..3.05 m.
      for (const b of s.record.filter(x=>x.solid)) {
        const intersectsX = Math.abs(b.x - side*2.4) < (b.width+.3)/2;
        const intersectsZ = Math.abs(b.z-z) < (b.depth+1.05)/2;
        assert.ok(!(intersectsX&&intersectsZ), `entry blocked by ${JSON.stringify(b)}`);
      }
    } finally {s.cleanup()}
  }
});

test('TV and minibar interactions update scene objects and are reversible', () => {
  const s = suite(1, 3.5);
  try {
    const tv = s.fake.interactables.find(o=>o.getLabel().startsWith('TV'));
    const minibar = s.fake.interactables.find(o=>o.getLabel().startsWith('Minibar'));
    assert.equal(tv.getLabel(), 'TV · Aç');
    tv.activate(); assert.equal(tv.getLabel(), 'TV · Kapat');
    tv.activate(); assert.equal(tv.getLabel(), 'TV · Aç');
    assert.equal(minibar.getLabel(), 'Minibar · Aç');
    minibar.activate(); assert.equal(minibar.getLabel(), 'Minibar · Su al');
    minibar.activate(); assert.equal(minibar.getLabel(), 'Minibar · Kapat');
    minibar.activate(); assert.equal(minibar.getLabel(), 'Minibar · Aç');
    s.fake.animations.forEach(a=>a(1/60));
    assert.ok(s.events.some(x=>x.includes('TV açıldı')));
  } finally {s.cleanup()}
});

test('sofa and bed call the existing Player furniture interactions', () => {
  const s=suite(-1,-3.5);
  try {
    const used=[];
    const actor={useFurniture:(...args)=>used.push(args)};
    s.fake.interactables.find(o=>o.getLabel().startsWith('Koltuk')).activate(actor);
    s.fake.interactables.find(o=>o.getLabel()==='Yatak · Uzan').activate(actor);
    s.fake.interactables.find(o=>o.getLabel()==='Yatak kenarı · Otur').activate(actor);
    assert.deepEqual(used.map(x=>x[0]),['sit','rest','sit']);
  } finally {s.cleanup()}
});
