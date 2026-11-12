import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Avatar } from '../src/avatar/Avatar.js';
import { HandRig } from '../src/player/HandRig.js';
import { normalizeAvatar, AVATAR_RANGES, SOFT_AVATAR_FIELDS,
  SOFT_MODEL_PRESETS } from '../src/avatar/AvatarConfig.js';

const avatar = input => new Avatar(new THREE.Scene(), input);
const vertices = mesh => Array.from(mesh.geometry.getAttribute('position').array);

test('sphere remains a true sphere; soft/classic vary smoothly without extra rigging', () => {
  const spherical=avatar({baseModel:'softMale',headShape:'sphere'});
  const organic=avatar({baseModel:'softMale',headShape:'soft'});
  const classic=avatar({baseModel:'softMale',headShape:'classic'});
  try {
    const sphere=spherical.head.userData.headMesh.geometry;
    const soft=organic.head.userData.headMesh.geometry;
    const cube=classic.head.userData.headMesh.geometry;
    assert.equal(sphere.type,'SphereGeometry');
    assert.notDeepEqual(vertices(spherical.head.userData.headMesh),vertices(organic.head.userData.headMesh));
    assert.notDeepEqual(vertices(organic.head.userData.headMesh),vertices(classic.head.userData.headMesh));
    const pos=sphere.getAttribute('position');
    for(let i=0;i<pos.count;i++){
      const radius=Math.hypot(pos.getX(i),pos.getY(i),pos.getZ(i));
      assert.ok(Math.abs(radius-1)<1e-5);
    }
    assert.equal(spherical.head.getObjectByName('left-eye-line').isMesh,true);
    assert.equal(organic.head.getObjectByName('right-eye-line').isMesh,true);
    assert.equal(classic.head.userData.hairMounts.name,'hair-root');
  } finally {spherical.dispose();organic.dispose();classic.dispose();}
});

test('neutral face remains two eyes only, and expressions are switchable without rebuild', () => {
  const a=avatar({baseModel:'softFemale'});
  try{
    const mouths=Object.values(a.head.userData.mouths);
    assert.equal(mouths.length,3);
    assert.ok(mouths.every(m=>m.visible===false));
    assert.equal(a.head.getObjectByName('left-eye-line').isMesh,true);
    a.setExpression('happy');
    assert.equal(a.head.userData.mouths.happy.visible,true);
    assert.equal(a.head.userData.mouths.sad.visible,false);
    a.setExpression('surprised');
    assert.equal(a.head.userData.mouths.surprised.visible,true);
    a.update(.016,0,'stand');
    assert.equal(a.head.userData.mouths.surprised.visible,true);
  }finally{a.dispose();}
});

test('abdomen four quadrants share one continuous contour and remain independent of chest', () => {
  const low=avatar({baseModel:'softFemale', abdomenDefinition:.6});
  const high=avatar({baseModel:'softFemale', abdomenDefinition:1.4});
  try {
    assert.deepEqual(high.body.userData.abdomenRegions,
      ['upper-left','upper-right','lower-left','lower-right']);
    assert.notDeepEqual(vertices(low.body.getObjectByName('soft-abdomen')),
      vertices(high.body.getObjectByName('soft-abdomen')));
    assert.deepEqual(vertices(low.body.getObjectByName('soft-chest')),
      vertices(high.body.getObjectByName('soft-chest')));
    assert.deepEqual(high.body.userData.surfaceMasks,{
      anteriorChest:'paired-or-pectoral', posteriorBack:'scapular-and-lumbar',
      abdominalWall:'four-smooth-quadrants',
    });
    assert.equal(high.body.getObjectByName('soft-abdomen').visible,false);
    assert.equal(high.body.getObjectByName('abdominal-wall').visible,true);
  }finally {low.dispose(); high.dispose();}
});

test('limb contours morph independently, knee is recessed and glute tracks leg context',()=>{
  const low=avatar({baseModel:'softFemale',legContour:.7,gluteProjection:1});
  const high=avatar({baseModel:'softFemale',legContour:1.4,gluteProjection:1});
  const proj=avatar({baseModel:'softFemale',legContour:1.4,gluteProjection:1.35});
  try{
    assert.notDeepEqual(vertices(low.leftLeg.getObjectByName('thigh')),
      vertices(high.leftLeg.getObjectByName('thigh')));
    assert.notDeepEqual(vertices(low.leftLeg.userData.knee.getObjectByName('calf')),
      vertices(high.leftLeg.userData.knee.getObjectByName('calf')));
    assert.notDeepEqual(vertices(low.body.getObjectByName('left-glute')),
      vertices(high.body.getObjectByName('left-glute')));
    assert.notDeepEqual(vertices(high.body.getObjectByName('left-glute')),
      vertices(proj.body.getObjectByName('left-glute')));
    assert.deepEqual(vertices(high.leftLeg.getObjectByName('thigh')),
      vertices(proj.leftLeg.getObjectByName('thigh')));
    assert.ok(high.leftLeg.userData.knee.getObjectByName('knee').scale.x>0);
    assert.equal(high.leftArm.getObjectByName('shoulder'),undefined);
  }finally {low.dispose();high.dispose();proj.dispose();}
});

test('resting fingers are unified; grab enables existing individually articulated digits',()=>{
  const a=avatar({baseModel:'softMale'});
  try{
    for(const arm of [a.leftArm,a.rightArm]){
      const hand=arm.userData.hand;
      assert.ok(hand.userData.relaxedFingers.visible);
      assert.ok(hand.userData.fingers.slice(0,4).every(f=>!f.visible));
      assert.ok(hand.getObjectByName('thumb').visible);
    }
    a.setHandDetail(true,'left');
    assert.equal(a.leftArm.userData.hand.userData.relaxedFingers.visible,false);
    assert.ok(a.leftArm.userData.hand.userData.fingers.slice(0,4).every(f=>f.visible));
    assert.ok(a.rightArm.userData.hand.userData.relaxedFingers.visible);
    a.setHandDetail(false,'left');
    assert.ok(a.leftArm.userData.hand.userData.relaxedFingers.visible);
  }finally{a.dispose();}
});

test('first-person hands expose detailed fingers only during reach/grip',()=>{
  const camera=new THREE.PerspectiveCamera();
  const h=new HandRig(camera,{baseModel:'softFemale'});
  try{
    assert.ok(h.arms.left.relaxedDigits.visible);
    assert.ok(h.arms.left.digits.every(f=>!f.visible));
    h.update(.016,{pressed:true,grip:{}},{pressed:false,grip:null},true);
    assert.ok(h.arms.left.digits.every(f=>f.visible));
    assert.ok(h.arms.right.relaxedDigits.visible);
    h.update(.016,{pressed:false,grip:null},{pressed:false,grip:null},true);
    assert.ok(h.arms.left.relaxedDigits.visible);
  }finally{h.dispose();}
});

test('soft garments follow body and limb morphs and respect layer switches',()=>{
  const dressed=avatar({baseModel:'softFemale',outfit:'neon'});
  const larger=avatar({baseModel:'softFemale',outfit:'neon',chestFullness:1.4,thighSize:1.4});
  try {
    for(const key of ['shirt','jacket','pants','shoes']){
      assert.ok(dressed.layerMeshes[key].length>0,key+' layer exists');
      assert.ok(dressed.layerMeshes[key].every(mesh=>mesh.visible),key+' is visible');
    }
    assert.notDeepEqual(vertices(dressed.body.getObjectByName('soft-shirt')),
      vertices(larger.body.getObjectByName('soft-shirt')));
    assert.notDeepEqual(vertices(dressed.leftLeg.getObjectByName('soft-pants-thigh')),
      vertices(larger.leftLeg.getObjectByName('soft-pants-thigh')));
    dressed.updateStyle({...dressed.profile,jacketVisible:false,pantsVisible:false});
    assert.ok(dressed.layerMeshes.jacket.every(mesh=>!mesh.visible));
    assert.ok(dressed.layerMeshes.pants.every(mesh=>!mesh.visible));
    assert.ok(dressed.layerMeshes.shirt.every(mesh=>mesh.visible));
    const undressed=avatar({baseModel:'softFemale',outfit:'none'});
    try {assert.equal(undressed.layerMeshes.shirt.length,0);}
    finally{undressed.dispose();}
  }finally{dressed.dispose();larger.dispose();}
});

test('new customization fields clamp and enum selections survive normalization',()=>{
  const p=normalizeAvatar({
    baseModel:'softFemale',headShape:'classic',faceExpression:'happy',
    abdomenDefinition:99,gluteProjection:-10,legContour:99,
  });
  assert.equal(p.headShape,'classic');
  assert.equal(p.faceExpression,'happy');
  assert.equal(p.abdomenDefinition,AVATAR_RANGES.abdomenDefinition[1]);
  assert.equal(p.gluteProjection,AVATAR_RANGES.gluteProjection[0]);
  assert.equal(p.legContour,AVATAR_RANGES.legContour[1]);
  for(const key of ['headAspect','cheekFullness','abdomenDefinition',
    'gluteProjection','legContour']) {
    assert.ok(SOFT_AVATAR_FIELDS.some(x=>x[0]===key));
    assert.ok(Number.isFinite(SOFT_MODEL_PRESETS.softFemale[key]));
  }
});
