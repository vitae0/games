import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { NPC_CAST, npcProfile, validateNpcCast } from '../src/world/NpcCast.js';
import {
  npcPreparedAsset, mapClonedHumanoid, isolateMaterials, tintNpcClothing,
} from '../src/world/NpcModelPool.js';
import { Avatar } from '../src/avatar/Avatar.js';

test('four named hotel NPCs have distinct ready-made VRoid outfits and palette', () => {
  assert.equal(validateNpcCast(), true);
  assert.equal(NPC_CAST.length, 4);
  assert.equal(new Set(NPC_CAST.map(c => c.asset)).size, 4);
  assert.equal(new Set(NPC_CAST.map(c => c.hairColor)).size, 4);
  assert.equal(new Set(NPC_CAST.map(c => c.shirtColor)).size, 4);
  assert.ok(NPC_CAST.some(c => c.baseModel === 'vroidMale'));
  assert.ok(NPC_CAST.some(c => c.baseModel === 'vroidFemale'));
  for (const spec of NPC_CAST) {
    const profile=npcProfile(spec);
    assert.equal(profile.outfit,'neon');
    assert.equal(profile.hair,'sample');
    assert.equal(profile.baseModel,spec.baseModel);
    assert.equal(profile.shirtVisible,true);
    assert.equal(profile.pantsVisible,true);
    assert.equal(profile.shoesVisible,true);
  }
  assert.equal(npcPreparedAsset('vroidHairMale'),true);
  assert.equal(npcPreparedAsset('vroidHairFemale'),true);
  assert.equal(npcPreparedAsset('vroidMale'),false);
  assert.throws(()=>validateNpcCast([NPC_CAST[0],NPC_CAST[0]]),/Duplicate/);
  assert.throws(()=>validateNpcCast([{...NPC_CAST[0],asset:'unknown'}]),/Unknown/);
});

test('cloned VRoid skeleton is distinct but geometry shared, materials isolated',()=>{
  const source=new THREE.Group();
  const hips=new THREE.Bone(); hips.name='Hips'; source.add(hips);
  const head=new THREE.Bone(); head.name='Head'; head.position.y=1.5; hips.add(head);
  const geom=new THREE.BoxGeometry(1,1,1);
  const mat=new THREE.MeshStandardMaterial({name:'Tops_CLOTH',color:0xffffff});
  const mesh=new THREE.Mesh(geom,mat); source.add(mesh);
  const sourceVrm={scene:source,humanoid:{
    getNormalizedBoneNode(key){return {hips,head}[key]||null;},
    getRawBoneNode(key){return {hips,head}[key]||null;},
  }};
  const duplicate=cloneSkeleton(source);
  assert.notEqual(duplicate,source);
  const humanoid=mapClonedHumanoid(sourceVrm,duplicate);
  assert.notEqual(humanoid.getNormalizedBoneNode('head'),head);
  assert.notEqual(humanoid.getNormalizedBoneNode('hips'),hips);
  assert.equal(humanoid.getNormalizedBoneNode('head').parent,humanoid.getNormalizedBoneNode('hips'));
  assert.equal(isolateMaterials(duplicate),1);
  const copiedMesh=duplicate.children.find(o=>o.isMesh);
  assert.equal(copiedMesh.geometry,geom);
  assert.notEqual(copiedMesh.material,mat);
  tintNpcClothing(duplicate,{shirtColor:0x639caf});
  assert.equal(copiedMesh.material.color.getHex(),0x639caf);
  assert.equal(mat.color.getHex(),0xffffff);
  geom.dispose();mat.dispose();copiedMesh.material.dispose();
});

test('two NPCs with cloned textures and geometry can vary outfit colors',()=>{
  const root=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({name:'Tops_CLOTH'});
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat);
  root.add(mesh);
  const a=cloneSkeleton(root), b=cloneSkeleton(root);
  isolateMaterials(a);isolateMaterials(b);
  tintNpcClothing(a,{shirtColor:0x779966});
  tintNpcClothing(b,{shirtColor:0xc77292});
  assert.equal(a.children[0].material.color.getHex(),0x779966);
  assert.equal(b.children[0].material.color.getHex(),0xc77292);
  assert.equal(root.children[0].material.color.getHex(),0xffffff);
  assert.equal(a.children[0].geometry,b.children[0].geometry);
  mesh.geometry.dispose();mat.dispose();
  a.children[0].material.dispose();b.children[0].material.dispose();
});

test('removing one NPC does not dispose geometry reused by another NPC',()=>{
  const avatar=Object.create(Avatar.prototype);
  const geom=new THREE.BoxGeometry(1,1,1);
  const material=new THREE.MeshStandardMaterial();
  const group=new THREE.Group();
  const mesh=new THREE.Mesh(geom,material);
  group.add(mesh);
  const wrapper=new THREE.Group();wrapper.add(group);
  avatar.root=new THREE.Group();avatar.root.add(wrapper);
  avatar.body=new THREE.Group();avatar.body.visible=false;
  avatar.external={wrapper,group,style:null,sharedGeometry:true};
  let disposed=false;
  const dispose=geom.dispose.bind(geom);
  geom.dispose=()=>{disposed=true;dispose();};
  avatar.clearExternal();
  assert.equal(disposed,false);
  assert.equal(avatar.external,null);
  assert.equal(avatar.body.visible,true);
  geom.dispose();
});
