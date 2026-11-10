import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MirrorPool } from '../src/world/MirrorPool.js';
import { RoomLighting } from '../src/world/RoomLighting.js';

test('one shared 256px reflector handles nearby suite and public mirrors',()=>{
  const scene=new THREE.Scene();
  const mirrors=new MirrorPool(scene);
  try{
    mirrors.register(0,4,1.7,-5,Math.PI);
    mirrors.register(0,8,1.7,-5,-Math.PI/2);
    mirrors.register(1,4,5.1,-5,Math.PI);
    assert.equal(mirrors.locations.length,3);
    assert.equal(mirrors.reflection.getRenderTarget().width,256);
    const avatar={root:{visible:false}};
    mirrors.update({position:new THREE.Vector3(4,0,-6),floor:0,avatar});
    assert.equal(mirrors.reflection.visible,true);
    assert.equal(mirrors.active.x,4);
    mirrors.update({position:new THREE.Vector3(8,0,-5),floor:0,avatar});
    assert.equal(mirrors.active.x,8);
    assert.equal(mirrors.reflection.rotation.y,-Math.PI/2);
    mirrors.update({position:new THREE.Vector3(70,0,70),floor:0,avatar});
    assert.equal(mirrors.reflection.visible,false);
  }finally{mirrors.dispose()}
});

test('room light toggles and only closest enabled light consumes a point light',()=>{
  const scene=new THREE.Scene();
  const lights=new RoomLighting(scene);
  try{
    const a=lights.register(0,4,3,2,'Studio');
    const b=lights.register(0,10,3,2,'Bar');
    const player={floor:0,position:new THREE.Vector3(4,0,2)};
    lights.update(player);
    assert.strictEqual(lights.active,a.room);
    assert.ok(lights.point.intensity>0);
    assert.ok(a.getLabel().includes('kapat'));
    a.toggle();
    assert.ok(a.getLabel().includes('aç'));
    lights.update(player);
    assert.strictEqual(lights.active,null);
    player.position.x=10;
    lights.update(player);
    assert.strictEqual(lights.active,b.room);
    b.toggle();
    lights.update(player);
    assert.equal(lights.point.intensity,0);
    assert.equal(scene.children.filter(obj=>obj.isPointLight).length,1);
  }finally{lights.dispose()}
});
