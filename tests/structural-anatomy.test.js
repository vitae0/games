import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Avatar } from '../src/avatar/Avatar.js';
import { SOFT_MODEL_PRESETS, SOFT_STRUCTURAL_PROFILES, normalizeAvatar } from '../src/avatar/AvatarConfig.js';

const avatar = input => new Avatar(new THREE.Scene(), input);
const positions = mesh => Array.from(mesh.geometry.getAttribute('position').array);

test('equal dimensions retain distinct structural chest, back, waist and limb contours', () => {
  const measurements = { ...SOFT_MODEL_PRESETS.softMale };
  const male = avatar({ ...measurements, baseModel: 'softMale' });
  const female = avatar({ ...measurements, baseModel: 'softFemale' });
  try {
    assert.notEqual(SOFT_STRUCTURAL_PROFILES.softMale.chestType,
      SOFT_STRUCTURAL_PROFILES.softFemale.chestType);
    assert.equal(male.profile.waist, female.profile.waist);
    assert.equal(male.profile.hips, female.profile.hips);
    assert.notDeepEqual(positions(male.body.getObjectByName('soft-chest')),
      positions(female.body.getObjectByName('soft-chest')));
    assert.notDeepEqual(positions(male.body.getObjectByName('soft-abdomen')),
      positions(female.body.getObjectByName('soft-abdomen')));
    assert.notDeepEqual(positions(male.leftLeg.getObjectByName('thigh')),
      positions(female.leftLeg.getObjectByName('thigh')));
    assert.notDeepEqual(positions(male.leftLeg.userData.knee.getObjectByName('calf')),
      positions(female.leftLeg.userData.knee.getObjectByName('calf')));
    assert.notDeepEqual(positions(male.leftArm.getObjectByName('upper-arm')),
      positions(female.leftArm.getObjectByName('upper-arm')));
  } finally { male.dispose(); female.dispose(); }
});

test('back fullness changes only posterior chest geometry, not the anterior profile', () => {
  const low = avatar({ baseModel:'softFemale', backFullness: .7 });
  const high = avatar({ baseModel:'softFemale', backFullness: 1.45 });
  try {
    const a = low.body.getObjectByName('soft-chest').geometry.getAttribute('position');
    const b = high.body.getObjectByName('soft-chest').geometry.getAttribute('position');
    const sides = low.body.getObjectByName('soft-chest').geometry.userData.loft.sides;
    assert.equal(a.count, b.count);
    let rearMoved = false;
    for(let i=0;i<a.count;i++){
      assert.equal(a.getX(i), b.getX(i));
      assert.equal(a.getY(i), b.getY(i));
      const j = i % sides;
      const rear = Math.sin(2*Math.PI*j/sides) > 1e-6;
      if(!rear) assert.equal(a.getZ(i), b.getZ(i), 'front chest remains unchanged');
      else if(Math.abs(a.getZ(i)-b.getZ(i)) > 1e-5) rearMoved=true;
    }
    assert.ok(rearMoved, 'back slider deforms the posterior chest');
    assert.deepEqual(positions(low.body.getObjectByName('soft-abdomen')),
      positions(high.body.getObjectByName('soft-abdomen')));
  } finally { low.dispose(); high.dispose(); }
});

test('structural profiles keep mesh count and rig ownership fixed', () => {
  for(const model of ['softMale','softFemale']){
    const a=avatar({baseModel:model});
    try{
      assert.equal(a.body.userData.structuralProfile,
        SOFT_STRUCTURAL_PROFILES[model].chestType);
      assert.ok(a.leftArm.userData.elbow.isBone);
      assert.ok(a.leftLeg.userData.knee.isBone);
      assert.ok(a.body.getObjectByName('pectoral-chest').isMesh);
      assert.ok(a.body.getObjectByName('abdominal-wall').isMesh);
      assert.equal(a.body.getObjectByName('soft-chest').visible, false);
    } finally { a.dispose(); }
  }
  assert.equal(normalizeAvatar({baseModel:'softMale',backFullness:999}).backFullness,1.45);
  assert.equal(normalizeAvatar({baseModel:'softFemale',backFullness:-999}).backFullness,.7);
});
