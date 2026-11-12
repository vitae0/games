import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { normalizeAvatar } from '../src/avatar/AvatarConfig.js';
import { applyVRoidColors, disposeVRoidStyle, styleMaterialClass } from '../src/avatar/VRoidStyle.js';
import {
  clonePremadeHair, discardPremadeHair, extractPremadeHair,
  HAIR_SAMPLE_FILES, isPremadeHairMaterial,
} from '../src/avatar/VRoidPremadeHair.js';

test('only licensed ready-made hair and the existing VRoid body texture are selectable', () => {
  const selected = normalizeAvatar({
    baseModel:'vroidFemale', hair:'sample', hairColor:'original', underwear:'original',
    eyeColor:'violet',
  });
  assert.equal(selected.baseModel,'vroidFemale');
  assert.equal(selected.hairColor,'original');
  assert.equal(selected.hair,'sample');
  assert.equal(selected.underwear,'original');
  const invalid = normalizeAvatar({
    hair:'ponytail', underwear:'sport', hairColor:'invalid', baseModel:'procedural',
  });
  assert.equal(invalid.hair,'sample');
  assert.equal(invalid.underwear,'none');
  assert.equal(invalid.hairColor,'original');
  assert.equal(invalid.baseModel,'softMale');
  assert.deepEqual(Object.keys(HAIR_SAMPLE_FILES).sort(),['vroidFemale','vroidMale']);
});

test('pre-made VRoid hair groups are distinct from clothes and skin',()=>{
  assert.equal(styleMaterialClass('M00_001_01_Body_00_SKIN'),'body');
  assert.equal(styleMaterialClass('F00_001_01_Face_00_SKIN'),'face');
  assert.equal(styleMaterialClass('EyeIris'),'iris');
  assert.equal(styleMaterialClass('HairBack'),'hair');
  assert.equal(isPremadeHairMaterial('M00_HairFront_01_HAIR'),true);
  assert.equal(isPremadeHairMaterial('Tops_CLOTH'),false);
});

test('source body texture switches reversibly without creating underwear meshes',()=>{
  const body = new THREE.MeshStandardMaterial({name:'M00_001_Body_00_SKIN'});
  const texture = new THREE.Texture();
  body.map = texture;
  const face = new THREE.MeshStandardMaterial({name:'F00_001_Face_00_SKIN'});
  const iris = new THREE.MeshStandardMaterial({name:'EyeIris'});
  const hair = new THREE.MeshStandardMaterial({name:'HairBack'});
  const mesh = {isMesh:true,material:[body,face,iris,hair]};
  const state = {materialCache:new Map()};
  const vrm = {scene:{traverse(cb){cb(mesh)}}};
  applyVRoidColors(vrm,normalizeAvatar({eyeColor:'blue',skinTone:'honey',underwear:'none'}),state);
  assert.equal(body.map,null);
  assert.equal(body.visible,true);
  assert.equal(iris.color.getHex(),0x598ec8);
  assert.equal(hair.visible,false);
  applyVRoidColors(vrm,normalizeAvatar({underwear:'original'}),state);
  assert.equal(body.map,texture,'the pre-made VRoid body texture must be restored exactly');
  assert.equal(body.visible,true);
  assert.equal(face.visible,true);
  [body,face,iris,hair].forEach(m=>m.dispose());
  texture.dispose();
});

test('ready-made hair extraction copies actual source triangles into head coordinates',()=>{
  const scene=new THREE.Group();
  const head=new THREE.Bone();
  head.name='J_Bip_C_Head';
  head.position.set(0,1,0);
  scene.add(head);
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute([
    0,1,0, .1,1,0, .05,1.2,0,
  ],3));
  geom.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));
  geom.setIndex([0,1,2]);
  geom.addGroup(0,3,0);
  const material=new THREE.MeshStandardMaterial({name:'HairFront'});
  const mesh=new THREE.Mesh(geom,material);scene.add(mesh);
  const source={
    scene,humanoid:{getNormalizedBoneNode(k){return k==='head'?head:null}},
  };
  const extracted=extractPremadeHair(source);
  assert.equal(extracted.userData.triangles,1);
  assert.equal(extracted.children.length,1);
  const p=extracted.children[0].geometry.getAttribute('position');
  assert.ok(Math.abs(p.getY(0))<.00001);
  assert.ok(Math.abs(p.getY(2)-.2)<.00001);
  const instance=clonePremadeHair(extracted,'blue');
  assert.equal(instance.children[0].geometry,extracted.children[0].geometry);
  assert.notEqual(instance.children[0].material,extracted.children[0].material);
  assert.equal(instance.children[0].material.color.getHex(),0x55769e);
  discardPremadeHair(instance);
  const noHair=new THREE.Group();
  const notHair=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({name:'Shirt'}));
  noHair.add(head,notHair);
  assert.throws(()=>extractPremadeHair({
    scene:noHair,humanoid:{getNormalizedBoneNode(){return head}},
  }),/ayrı hazır saç/);
  extracted.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();obj.material.dispose();}});
  geom.dispose();material.dispose();notHair.material.dispose();
});

test('style cleanup never destroys shared source geometry and cancels late hair updates',()=>{
  const hair=new THREE.Group();
  const geom=new THREE.BufferGeometry();
  const material=new THREE.MeshStandardMaterial();
  hair.add(new THREE.Mesh(geom,material));
  const state={hairRoot:hair,hairRequest:4,hairKey:'vroidMale:sample:original'};
  disposeVRoidStyle(state);
  assert.equal(state.hairRoot,null);
  assert.equal(state.hairKey,null);
  assert.equal(state.hairRequest,5);
  assert.ok(geom!==undefined,'shared geometry remains available to the cache');
  geom.dispose();
});
