import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { normalizeAvatar } from '../src/avatar/AvatarConfig.js';
import {
  applyVRoidColors, buildVRoidHair, buildVRoidUnderwear,
  disposeVRoidStyle, styleMaterialClass,
} from '../src/avatar/VRoidStyle.js';

test('only two VRoid bases and validated hair/underwear palettes are selectable', () => {
  const a=normalizeAvatar({baseModel:'vroidFemale',hair:'ponytail',hairColor:'blue',
    underwear:'sport',underwearColor:'slate',eyeColor:'violet'});
  assert.equal(a.baseModel,'vroidFemale');
  assert.equal(a.hairColor,'blue');
  assert.equal(a.underwear,'sport');
  assert.equal(a.underwearColor,'slate');
  assert.equal(a.eyeColor,'violet');
  const bad=normalizeAvatar({baseModel:'procedural',underwear:'wrong',hairColor:'wrong',eyeColor:'wrong'});
  assert.equal(bad.baseModel,'vroidMale');
  assert.equal(bad.underwear,'none');
  assert.equal(bad.hairColor,'chestnut');
  assert.equal(bad.eyeColor,'brown');
});
test('VRoid materials are classified without hiding face or iris detail',()=>{
  assert.equal(styleMaterialClass('M00_001_01_Body_00_SKIN'),'body');
  assert.equal(styleMaterialClass('F00_001_01_Face_00_SKIN'),'face');
  assert.equal(styleMaterialClass('EyeIris'),'iris');
  assert.equal(styleMaterialClass('HairBack'),'hair');
  assert.equal(styleMaterialClass('M00_001_Tops_01_CLOTH'),'other');
});
test('VRoid nude base clears baked body texture but preserves face and recolors iris',()=>{
  const body=new THREE.MeshStandardMaterial({name:'M00_001_Body_00_SKIN'});
  const texture=new THREE.Texture();
  body.map=texture;
  const face=new THREE.MeshStandardMaterial({name:'F00_001_Face_00_SKIN'});
  const iris=new THREE.MeshStandardMaterial({name:'EyeIris'});
  const hair=new THREE.MeshStandardMaterial({name:'HairBack'});
  const obj={isMesh:true,material:[body,face,iris,hair]};
  const vrm={scene:{traverse(cb){cb(obj)}}},state={materialCache:new Map()};
  applyVRoidColors(vrm,normalizeAvatar({eyeColor:'blue',skinTone:'honey'}),state);
  assert.equal(body.map,null);
  assert.equal(body.visible,true);
  assert.equal(iris.color.getHex(),0x598ec8);
  assert.equal(hair.visible,false);
  assert.equal(face.visible,true);
  [body,face,iris,hair].forEach(m=>m.dispose());texture.dispose();
});
test('procedural VRoid hairstyles attach only to the head bone and clean up',()=>{
  const head=new THREE.Bone();
  const root=new THREE.Group();root.add(head);
  const vrm={humanoid:{getNormalizedBoneNode(k){return k==='head'?head:null}}};
  const hair=buildVRoidHair(vrm,normalizeAvatar({hair:'long',hairColor:'copper'}));
  assert.ok(hair);
  assert.equal(hair.parent,head);
  assert.ok(hair.children.length>8);
  const state={hairRoot:hair,underwearMeshes:[]};
  disposeVRoidStyle(state);
  assert.equal(head.children.length,0);
  assert.equal(buildVRoidHair(vrm,normalizeAvatar({hair:'none'})),null);
});
test('underwear extracts body triangles and uses the exact original skin skeleton',()=>{
  const root=new THREE.Group(),hips=new THREE.Bone(),chest=new THREE.Bone();
  chest.position.y=.35;root.add(hips,chest);
  const g=new THREE.CylinderGeometry(.17,.20,1.4,12,18);
  const count=g.getAttribute('position').count;
  const indices=new Float32Array(count*4), weights=new Float32Array(count*4);
  for(let i=0;i<count;i++) weights[i*4]=1;
  g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
  g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const material=new THREE.MeshStandardMaterial({name:'M00_001_Body_00_SKIN'});
  const source=new THREE.SkinnedMesh(g,material);
  const bone=new THREE.Bone();root.add(bone);
  source.bind(new THREE.Skeleton([bone]));
  root.add(source);
  const vrm={scene:root,humanoid:{getNormalizedBoneNode(k){
    return k==='hips'?hips:k==='chest'?chest:null;
  }}};
  const nude=buildVRoidUnderwear(vrm,normalizeAvatar({underwear:'none'}));
  assert.deepEqual(nude,[]);
  const items=buildVRoidUnderwear(vrm,normalizeAvatar({underwear:'sport',baseModel:'vroidFemale'}));
  assert.ok(items.length>0,'must create real separate skinned garment meshes');
  assert.ok(items.every(mesh=>mesh.skeleton===source.skeleton));
  assert.equal(material.visible,true);
  disposeVRoidStyle({underwearMeshes:items,hairRoot:null});
  assert.equal(root.children.some(x=>x.name.startsWith('VitaeUnderwear')),false);
  g.dispose();material.dispose();
});
