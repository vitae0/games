import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RoundedBatch } from '../src/engine/RoundedBatch.js';
import { createBathAssets } from '../src/world/BathAssets.js';

test('rounded furniture uses instanced meshes, not a draw call for every object',()=>{
  const scene=new THREE.Scene();
  const material=new THREE.MeshStandardMaterial();
  const batching=new RoundedBatch(scene,{fabric:material});
  try {
    for(let i=0;i<80;i++)batching.add('fabric',i,.5,0,.8,.4,1);
    batching.flush();
    const meshes=scene.children.filter(m=>m.isInstancedMesh);
    assert.equal(meshes.length,1);
    assert.equal(meshes[0].count,80);
    assert.ok(meshes[0].geometry.getAttribute('normal').count>0);
  } finally {batching.dispose();material.dispose();}
});

test('one bathtub geometry and animated transparent water shader are reusable',()=>{
  const a=createBathAssets();
  try {
    assert.ok(a.tubGeometry.getAttribute('position').count>200);
    assert.ok(a.tubGeometry.getAttribute('normal').count>0);
    assert.ok(a.waterMaterial.isShaderMaterial);
    assert.equal(a.waterMaterial.transparent,true);
    assert.equal(a.waterMaterial.depthWrite,false);
    assert.ok(a.waterMaterial.vertexShader.includes('uTime'));
    const m1=new THREE.Mesh(a.waterGeometry,a.waterMaterial);
    const m2=new THREE.Mesh(a.waterGeometry,a.waterMaterial);
    assert.strictEqual(m1.material,m2.material);
    assert.strictEqual(m1.geometry,m2.geometry);
  } finally {a.dispose();}
});
