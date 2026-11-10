import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAvatar } from '../src/avatar/AvatarConfig.js';
import { classifyVRoidMaterial, vroidMaterialVisibility, applyVRoidWardrobe } from '../src/avatar/VRoidLayers.js';
import { SOURCES, gitBlobSha, inspectVrm } from '../scripts/fetch-vroid-bases.mjs';

test('both CC0 beta base genders and legacy fallback are accepted', () => {
  assert.equal(normalizeAvatar().baseModel, 'vroidMale');
  assert.equal(normalizeAvatar({baseModel:'vroidFemale'}).baseModel, 'vroidFemale');
  assert.equal(normalizeAvatar({baseModel:'quaternius'}).baseModel, 'quaternius');
  assert.equal(normalizeAvatar({baseModel:'procedural'}).baseModel, 'procedural');
  assert.equal(normalizeAvatar({baseModel:'unlicensed'}).baseModel, 'vroidMale');
});
test('VRoid garment classification leaves body, face, eyes and hair untouched', () => {
  for (const n of ['M00_Body_00_SKIN', 'Face', 'EyeIris', 'HairFront'])
    assert.equal(classifyVRoidMaterial(n),'body',n);
  assert.equal(classifyVRoidMaterial('M00_001_Tops_01_CLOTH'),'shirt');
  assert.equal(classifyVRoidMaterial('M00_001_Bottoms_01_CLOTH'),'pants');
  assert.equal(classifyVRoidMaterial('M00_001_Shoes_01_CLOTH'),'shoes');
});
test('Yok removes garment materials without affecting skin materials', () => {
  const profile = normalizeAvatar({outfit:'none'});
  assert.equal(vroidMaterialVisibility('M00_Body_00_SKIN',profile),true);
  assert.equal(vroidMaterialVisibility('M00_Tops_01_CLOTH',profile),false);
  assert.equal(vroidMaterialVisibility('M00_Bottoms_01_CLOTH',profile),false);
  assert.equal(vroidMaterialVisibility('M00_Shoes_01_CLOTH',profile),false);
});
test('specific garment toggles are independent of each other', () => {
  const profile = normalizeAvatar({shirtVisible:false,pantsVisible:true,shoesVisible:false});
  assert.equal(vroidMaterialVisibility('Shirt',profile),false);
  assert.equal(vroidMaterialVisibility('Pants',profile),true);
  assert.equal(vroidMaterialVisibility('Shoes',profile),false);
});
test('real material visibility toggles are reversible, preserving mesh', () => {
  const skin = {name:'M00_Body_SKIN',visible:true};
  const shirt = {name:'M00_Tops_01_CLOTH',visible:true};
  const pants = {name:'M00_Bottoms_01_CLOTH',visible:true};
  const mesh = {isMesh:true,material:[skin,shirt,pants]};
  const root = {traverse(callback){callback(mesh)}};
  const a=applyVRoidWardrobe(root,normalizeAvatar({outfit:'none'}));
  assert.deepEqual(a,{garments:2,hidden:2,skin:1});
  assert.equal(skin.visible,true);
  assert.equal(shirt.visible,false);
  assert.equal(pants.visible,false);
  const b=applyVRoidWardrobe(root,normalizeAvatar({outfit:'neon'}));
  assert.equal(b.hidden,0);
  assert.equal(shirt.visible,true);
  assert.equal(pants.visible,true);
});
test('source integrity checks are fixed and a GLB manifest can be inspected', () => {
  assert.equal(SOURCES.length,2);
  for(const x of SOURCES) assert.match(x.blob,/^[a-f0-9]{40}$/);
  assert.equal(gitBlobSha(Buffer.from('hi')),'32f95c0d1244a78b2be1bab8de17906fabb2c4a8');
  const json=Buffer.from(JSON.stringify({
    extensions:{VRM:{meta:{licenseName:'CC0'}}},
    meshes:[{name:'body'}],skins:[{}],
    materials:[{name:'Body_SKIN'},{name:'Tops_CLOTH'}],
  }));
  const pad=(4-json.length%4)%4;
  const bytes=Buffer.alloc(20+json.length+pad);
  bytes.write('glTF',0);
  bytes.writeUInt32LE(2,4);
  bytes.writeUInt32LE(bytes.length,8);
  bytes.writeUInt32LE(json.length+pad,12);
  bytes.write('JSON',16);
  json.copy(bytes,20);
  assert.equal(inspectVrm(bytes).license,'CC0');
});
