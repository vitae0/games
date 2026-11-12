import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Avatar } from '../src/avatar/Avatar.js';
import { softLoftGeometry } from '../src/avatar/SoftAvatar.js';
import {
  normalizeAvatar, AVATAR_RANGES, SOFT_AVATAR_FIELDS,
  SOFT_MODEL_PRESETS, switchSoftModel, isSoftModel, migrateSoftProfile,
} from '../src/avatar/AvatarConfig.js';
import { NPC_CAST, npcProfile } from '../src/world/NpcCast.js';

test('both soft models have exact spherical heads, two line eyes, and no hair', () => {
  for (const baseModel of ['softMale', 'softFemale']) {
    const scene = new THREE.Scene();
    const avatar = new Avatar(scene, { baseModel });
    try {
      assert.equal(avatar.profile.baseModel, baseModel);
      assert.equal(avatar.softAvatar, true);
      const head = avatar.head.userData.headMesh;
      assert.equal(head.geometry.type, 'SphereGeometry');
      assert.equal(head.scale.x, head.scale.y);
      assert.equal(head.scale.y, head.scale.z);
      const marks = avatar.head.children.filter(child => child.name.endsWith('-eye-line'));
      assert.deepEqual(marks.map(mark => mark.name).sort(), ['left-eye-line','right-eye-line']);
      assert.ok(marks.every(mark => mark.scale.y > mark.scale.x));
      assert.equal(avatar.head.children.length, 3, 'head + two eyes, no hair, ears or facial details');
    } finally {
      avatar.dispose();
    }
  }
});

test('chest and abdomen are separate deformable polygon meshes', () => {
  const avatar = new Avatar(new THREE.Scene(), { baseModel:'softMale' });
  try {
    assert.equal(avatar.body.getObjectByName('soft-torso'), undefined);
    const chest = avatar.body.getObjectByName('soft-chest');
    const abdomen = avatar.body.getObjectByName('soft-abdomen');
    assert.ok(chest?.isMesh);
    assert.ok(abdomen?.isMesh);
    assert.notEqual(chest.geometry, abdomen.geometry);
    assert.ok(chest.geometry.getAttribute('normal'));
    assert.ok(abdomen.geometry.getAttribute('normal'));
    const chestBefore = chest.geometry.getAttribute('position').array.slice();
    const abdomenBefore = abdomen.geometry.getAttribute('position').array.slice();
    avatar.updateStyle({ ...avatar.profile, chestFullness:1.3 });
    assert.notDeepEqual(
      Array.from(avatar.body.getObjectByName('soft-chest').geometry.getAttribute('position').array),
      Array.from(chestBefore),
    );
    assert.deepEqual(
      Array.from(avatar.body.getObjectByName('soft-abdomen').geometry.getAttribute('position').array),
      Array.from(abdomenBefore),
      'changing chest fullness must not reshape the abdomen',
    );
    const chestNext = avatar.body.getObjectByName('soft-chest').geometry.getAttribute('position').array.slice();
    avatar.updateStyle({ ...avatar.profile, abdomenFullness:1.35 });
    assert.notDeepEqual(
      Array.from(avatar.body.getObjectByName('soft-abdomen').geometry.getAttribute('position').array),
      Array.from(abdomenBefore),
    );
    assert.deepEqual(
      Array.from(avatar.body.getObjectByName('soft-chest').geometry.getAttribute('position').array),
      Array.from(chestNext),
      'changing abdomen fullness must not reshape chest',
    );
  } finally { avatar.dispose(); }
});

test('upper/lower arms and legs articulate without shoulder and elbow ball meshes', () => {
  const avatar = new Avatar(new THREE.Scene(), { baseModel:'softFemale' });
  try {
    for (const arm of [avatar.leftArm, avatar.rightArm]) {
      assert.ok(arm.isBone);
      assert.ok(arm.userData.elbow.isBone);
      assert.ok(arm.getObjectByName('upper-arm')?.isMesh);
      assert.ok(arm.userData.elbow.getObjectByName('forearm')?.isMesh);
      assert.equal(arm.getObjectByName('shoulder'), undefined);
      assert.equal(arm.getObjectByName('elbow'), undefined);
      const hand = arm.userData.hand;
      assert.equal(hand.children.length, 1);
      assert.equal(hand.children[0].geometry.type, 'SphereGeometry');
    }
    for (const leg of [avatar.leftLeg, avatar.rightLeg]) {
      assert.ok(leg.userData.knee.isBone);
      assert.ok(leg.getObjectByName('thigh'));
      assert.ok(leg.userData.knee.getObjectByName('calf'));
      const foot = leg.getObjectByName('hemisphere-foot');
      assert.equal(foot.getObjectByName('hemisphere-dome').geometry.parameters.thetaLength, Math.PI / 2);
      assert.ok(foot.getObjectByName('flat-sole'));
      assert.ok(foot.getObjectByName('hemisphere-dome').scale.x < .113 * avatar.profile.footSize);
      assert.ok(foot.getObjectByName('hemisphere-dome').scale.z < .155 * avatar.profile.footSize);
    }
    avatar.update(.05, 0, 'crouch');
    assert.ok(avatar.leftLeg.rotation.x > 0);
    avatar.update(.05, 0, 'kneel');
    assert.ok(avatar.leftLeg.userData.knee.rotation.x < 0);
  } finally { avatar.dispose(); }
});

test('male and female models have distinct polygonal silhouettes and free parameters', () => {
  const male = new Avatar(new THREE.Scene(), { baseModel:'softMale' });
  const female = new Avatar(new THREE.Scene(), { baseModel:'softFemale' });
  try {
    assert.notEqual(male.profile.shoulders, female.profile.shoulders);
    assert.notEqual(male.profile.hips, female.profile.hips);
    const m = male.body.getObjectByName('soft-chest').geometry.getAttribute('position');
    const f = female.body.getObjectByName('soft-chest').geometry.getAttribute('position');
    assert.notDeepEqual(Array.from(m.array), Array.from(f.array));
    assert.equal(isSoftModel(male.profile.baseModel), true);
    assert.equal(isSoftModel(female.profile.baseModel), true);
    assert.equal(isSoftModel('vroidFemale'), false);
    assert.ok(SOFT_MODEL_PRESETS.softFemale.chestRatio !== SOFT_MODEL_PRESETS.softMale.chestRatio);
    const custom = switchSoftModel({
      ...female.profile,
      chestWidth: 1.44,
      bodyColor: '#44dd99',
    }, 'softMale');
    assert.equal(custom.baseModel, 'softMale');
    assert.equal(custom.bodyColor, '#44dd99');
    assert.equal(custom.chestWidth, SOFT_MODEL_PRESETS.softMale.chestWidth);
    const independentlyEdited = normalizeAvatar({ ...custom, chestWidth:.78 });
    assert.equal(independentlyEdited.chestWidth, .78);
    assert.equal(normalizeAvatar({ baseModel:'soft' }).baseModel, 'softMale');
  } finally { male.dispose(); female.dispose(); }
});

test('every exposed morph is clamped and a soft profile rebuilds correctly', () => {
  const fields = SOFT_AVATAR_FIELDS.map(field => field[0]);
  assert.equal(fields.length, new Set(fields).size);
  for (const key of fields) assert.ok(AVATAR_RANGES[key], key);
  assert.ok(fields.length >= 25);
  const p = normalizeAvatar({
    bodyColor: '#Ff00aB', headScale: 1.22, forearmSize: 1.5,
    upperArmSize: .78, thighSize: 1.35, abdomenDepth: 1.24,
    chestWidth: 1.17, calfSize: .8, footLength: 1.13,
  });
  assert.equal(p.bodyColor, '#ff00ab');
  assert.equal(p.forearmSize, 1.5);
  assert.equal(p.abdomenDepth, 1.24);
  assert.equal(p.chestWidth, 1.17);
  assert.equal(normalizeAvatar({ bodyColor:'invalid' }).bodyColor, normalizeAvatar().bodyColor);
  assert.equal(normalizeAvatar({ thighSize:100 }).thighSize, AVATAR_RANGES.thighSize[1]);
  const avatar = new Avatar(new THREE.Scene(), p);
  try {
    const oldHead = avatar.head.userData.headMesh.scale.x;
    const oldForearm = avatar.leftArm.userData.elbow.getObjectByName('forearm').geometry;
    avatar.updateStyle({ ...p, headScale:.84, forearmSize:.69, bodyColor:'#31c9a4' });
    assert.ok(avatar.head.userData.headMesh.scale.x < oldHead);
    assert.notEqual(avatar.leftArm.userData.elbow.getObjectByName('forearm').geometry, oldForearm);
    assert.equal(avatar.material.skin.color.getHexString(), '31c9a4');
  } finally { avatar.dispose(); }
});

test('polygon loft has smooth normals and capped ends', () => {
  const geometry = softLoftGeometry([
    { y:-.5, rx:.13, rz:.11 }, { y:0, rx:.23, rz:.16 },
    { y:.5, rx:.19, rz:.12 },
  ], 12, 2.8);
  assert.ok(geometry.getAttribute('normal').count > 0);
  assert.ok(geometry.index.count >= 12*2*6);
  assert.equal(geometry.getAttribute('position').count, 12*3+2);
  geometry.dispose();
});

test('hotel NPCs use sex-specific soft rigs while keeping licensed VRoid originals', () => {
  assert.equal(new Set(NPC_CAST.map(n => n.bodyColor)).size, NPC_CAST.length);
  for (const npc of NPC_CAST) {
    assert.equal(npcProfile(npc).baseModel,
      npc.baseModel === 'vroidFemale' ? 'softFemale' : 'softMale');
    assert.match(npc.asset, /^vroid/);
  }
});


test('female starts taller than v2 yet remains below male and enlarges chest evenly', () => {
  const malePreset = SOFT_MODEL_PRESETS.softMale;
  const femalePreset = SOFT_MODEL_PRESETS.softFemale;
  assert.equal(femalePreset.height, 1.73);
  assert.ok(femalePreset.height < malePreset.height);
  assert.ok(femalePreset.chestWidth > .97, 'horizontal bust proportion is larger than v2');
  assert.ok(femalePreset.chestDepth > 1.03, 'front-to-back bust proportion is larger than v2');
  assert.ok(femalePreset.chestFullness > 1.08);
  assert.ok(femalePreset.chestRatio > .52);
  const upgraded = new Avatar(new THREE.Scene(), { baseModel: 'softFemale' });
  const previous = new Avatar(new THREE.Scene(), {
    baseModel: 'softFemale', height: 1.68, chestWidth: .97,
    chestDepth: 1.03, chestFullness: 1.08, chestRatio: .52,
  });
  try {
    const span = (avatar, axis) => {
      const geometry = avatar.body.getObjectByName('soft-chest').geometry;
      geometry.computeBoundingBox();
      return geometry.boundingBox.max[axis] - geometry.boundingBox.min[axis];
    };
    assert.ok(span(upgraded, 'x') > span(previous, 'x'), 'female chest expanded horizontally');
    assert.ok(span(upgraded, 'z') > span(previous, 'z'), 'female chest expanded in depth');
    assert.ok(span(upgraded, 'y') > span(previous, 'y'), 'female chest grew vertically');
  } finally { upgraded.dispose(); previous.dispose(); }
});

test('abdomen, chest and clavicular collar have watertight shared loft seams', () => {
  for (const model of ['softMale', 'softFemale']) {
    const avatar = new Avatar(new THREE.Scene(), { baseModel: model });
    try {
      const torso = avatar.body;
      const abdomen = torso.getObjectByName('soft-abdomen');
      const chest = torso.getObjectByName('soft-chest');
      const upper = torso.getObjectByName('soft-clavicular');
      for (const segment of [abdomen, chest, upper]) {
        assert.ok(segment?.isMesh);
        assert.ok(segment.geometry.getAttribute('normal'));
      }
      for (const [a, b] of [[abdomen, chest], [chest, upper]]) {
        const count = a.geometry.userData.loft.stationCount;
        const sides = a.geometry.userData.loft.sides;
        assert.equal(sides, b.geometry.userData.loft.sides);
        const aPos = a.geometry.getAttribute('position');
        const bPos = b.geometry.getAttribute('position');
        const aNorm = a.geometry.getAttribute('normal');
        const bNorm = b.geometry.getAttribute('normal');
        for (let i = 0; i < sides; i++) {
          for (const axis of ['X', 'Y', 'Z']) {
            const upperEnd = (count - 1) * sides + i;
            assert.ok(Math.abs(aPos['get' + axis](upperEnd) - bPos['get' + axis](i)) < 1e-5,
              model + ' seams share exact positions in ' + axis);
            assert.ok(Math.abs(aNorm['get' + axis](upperEnd) - bNorm['get' + axis](i)) < 1e-5,
              model + ' seams share smooth normals in ' + axis);
          }
        }
      }
      assert.equal(chest.geometry.getAttribute('position').count,
        chest.geometry.userData.loft.stationCount * chest.geometry.userData.loft.sides,
        'no internal cap polygons at chest junctions');
      const upperBefore = upper.geometry.getAttribute('position').array.slice();
      const chestBefore = chest.geometry.getAttribute('position').array.slice();
      avatar.updateStyle({ ...avatar.profile, upperChestFullness: 1.36 });
      assert.notDeepEqual(Array.from(avatar.body.getObjectByName('soft-clavicular').geometry.getAttribute('position').array),
        Array.from(upperBefore));
      assert.deepEqual(Array.from(avatar.body.getObjectByName('soft-chest').geometry.getAttribute('position').array),
        Array.from(chestBefore));
    } finally { avatar.dispose(); }
  }
});

test('hip width, rear glute and outward arm stance deform the intended axes', () => {
  const avatar = new Avatar(new THREE.Scene(), { baseModel: 'softFemale' });
  try {
    assert.ok(avatar.leftArm.rotation.z < 0);
    assert.ok(avatar.rightArm.rotation.z > 0);
    assert.ok(Math.abs(avatar.leftArm.rotation.z + avatar.rightArm.rotation.z) < 1e-9);
    const abdomen = () => avatar.body.getObjectByName('soft-abdomen').geometry.getAttribute('position');
    const beforeBack = abdomen().getZ(25); // ring 1, 90deg, rear (+Z)
    const beforeFront = abdomen().getZ(35); // ring 1, 270deg, front (-Z)
    const beforeHip = abdomen().getX(20); // ring 1, lateral (+X)
    avatar.updateStyle({ ...avatar.profile, gluteSize: 1.55 });
    assert.ok(abdomen().getZ(25) > beforeBack, 'rear contour increases with glute setting');
    assert.ok(Math.abs(abdomen().getZ(35) - beforeFront) < 1e-6,
      'glute setting does not bulge the front of the body');
    avatar.updateStyle({ ...avatar.profile, hipSize: 1.4 });
    assert.ok(abdomen().getX(20) > beforeHip, 'hips gain lateral width');
    avatar.updateStyle({ ...avatar.profile, armSpread: 0 });
    assert.ok(Math.abs(avatar.leftArm.rotation.z) < 1e-12);
    assert.ok(Math.abs(avatar.rightArm.rotation.z) < 1e-12);
  } finally { avatar.dispose(); }
});

test('saved v2 female profiles receive new baseline without erasing user edits', () => {
  const old = {
    baseModel: 'softFemale', height: 1.68, chestWidth: .97,
    chestDepth: 1.03, chestFullness: 1.08, chestRatio: .52,
    shoulders: .435, hips: .46, legRatio: .52, torsoDepth: .97,
    bodyColor: '#44aacc', forearmSize: 1.32, abdomenFullness: 1.20,
  };
  const migrated = migrateSoftProfile(old);
  assert.equal(migrated.height, 1.73);
  assert.equal(migrated.chestWidth, SOFT_MODEL_PRESETS.softFemale.chestWidth);
  assert.equal(migrated.chestDepth, SOFT_MODEL_PRESETS.softFemale.chestDepth);
  assert.equal(migrated.chestRatio, SOFT_MODEL_PRESETS.softFemale.chestRatio);
  assert.equal(migrated.forearmSize, 1.32);
  assert.equal(migrated.abdomenFullness, 1.20);
  assert.equal(migrated.bodyColor, '#44aacc');
  assert.equal(migrated.profileVersion, 3);
  const edited = migrateSoftProfile({ ...old, height: 1.65, chestDepth: 1.25 });
  assert.equal(edited.height, 1.65);
  assert.equal(edited.chestDepth, 1.25);
  assert.equal(migrateSoftProfile(migrated).height, 1.73);
});

test('clavicular collar is above pectoral chest, reaches neck root and has distinct controls', () => {
  const avatar = new Avatar(new THREE.Scene(), { baseModel: 'softFemale' });
  try {
    const collar = avatar.body.getObjectByName('soft-clavicular');
    const chest = avatar.body.getObjectByName('soft-chest');
    assert.ok(collar?.isMesh);
    assert.equal(avatar.body.getObjectByName('soft-upper-chest'), undefined,
      'the previous broad upper-pectoral piece is replaced by a clavicular neck-base zone');
    chest.geometry.computeBoundingBox();
    collar.geometry.computeBoundingBox();
    assert.ok(collar.geometry.boundingBox.min.y > chest.geometry.boundingBox.min.y + .11);
    assert.ok(collar.geometry.boundingBox.max.y > chest.geometry.boundingBox.max.y);
    assert.ok(collar.geometry.boundingBox.max.y > avatar.leftArm.position.y,
      'collar extends from shoulders toward the neck beneath the sphere head');
    const p = avatar.profile;
    assert.ok(p.upperChestWidth > 0 && p.clavicleDefinition > 0);
    assert.ok(p.neckBaseWidth > 0 && p.trapeziusVolume > 0);
    const position = () => avatar.body.getObjectByName('soft-clavicular')
      .geometry.getAttribute('position');
    const ring = 2, sides = 20;
    const front = ring * sides + 13; // anterior, left of the midline
    const back = ring * sides + 7; // posterior, equally far from midline
    const frontZ = position().getZ(front);
    const frontY = position().getY(front);
    const backZ = position().getZ(back);
    const chestBefore = chest.geometry.getAttribute('position').array.slice();
    avatar.updateStyle({ ...p, clavicleDefinition: 1.45 });
    assert.ok(position().getZ(front) < frontZ, 'clavicle definition creates an anterior ridge');
    assert.ok(position().getY(front) > frontY, 'collarbone ridge is subtly raised');
    assert.ok(Math.abs(position().getZ(back) - backZ) < 1e-6,
      'the collarbone setting does not raise the back of the neck');
    assert.deepEqual(Array.from(avatar.body.getObjectByName('soft-chest')
      .geometry.getAttribute('position').array), Array.from(chestBefore),
      'clavicle definition does not deform the pectoral chest');
    const neckRing = 5 * sides;
    const oldNeckWidth = position().getX(neckRing);
    avatar.updateStyle({ ...avatar.profile, neckBaseWidth: 1.4 });
    assert.ok(position().getX(neckRing) > oldNeckWidth,
      'neck base grows without altering head dimensions');
    const rearBefore = position().getZ(back);
    avatar.updateStyle({ ...avatar.profile, trapeziusVolume: 1.48 });
    assert.ok(position().getZ(back) > rearBefore, 'rear trapezius gains volume');
  } finally { avatar.dispose(); }
});

test('new clavicular slider values clamp and v3 upperChest settings stay compatible', () => {
  const p = normalizeAvatar({
    baseModel: 'softFemale', upperChestWidth: 1.27, upperChestDepth: 1.21,
    upperChestFullness: .91, clavicleDefinition: 99, trapeziusVolume: -.8,
    neckBaseWidth: 1.21,
  });
  assert.equal(p.upperChestWidth, 1.27);
  assert.equal(p.upperChestDepth, 1.21);
  assert.equal(p.upperChestFullness, .91);
  assert.equal(p.clavicleDefinition, AVATAR_RANGES.clavicleDefinition[1]);
  assert.equal(p.trapeziusVolume, AVATAR_RANGES.trapeziusVolume[0]);
  assert.equal(p.neckBaseWidth, 1.21);
  assert.ok(SOFT_AVATAR_FIELDS.some(([key, label]) =>
    key === 'upperChestWidth' && label.includes('Klaviküler')));
  assert.ok(SOFT_AVATAR_FIELDS.some(([key]) => key === 'clavicleDefinition'));
});
