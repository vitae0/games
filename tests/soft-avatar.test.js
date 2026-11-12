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
      assert.equal(avatar.head.children.length, 7, 'head, eyes, three lightweight mouth expressions and empty hair mounts');
      assert.equal(avatar.head.userData.hairMounts.name,'hair-root');
      assert.ok(avatar.head.userData.hairMounts.children.length>=7);
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
      assert.ok(hand.getObjectByName('palm')?.isMesh);
      assert.equal(hand.userData.fingers.length,5);
      assert.equal(hand.getObjectByName('thumb')?.children.length,2);
      for(const finger of hand.userData.fingers)
        assert.equal(finger.children.length,2);
    }
    for (const leg of [avatar.leftLeg, avatar.rightLeg]) {
      assert.ok(leg.userData.knee.isBone);
      assert.ok(leg.getObjectByName('thigh'));
      assert.ok(leg.userData.knee.getObjectByName('calf'));
      const foot = leg.getObjectByName('hemisphere-foot');
      assert.equal(foot.getObjectByName('hemisphere-dome').geometry.parameters.thetaLength, Math.PI / 2);
      assert.ok(foot.getObjectByName('flat-sole'));
      for(const part of ['heel-pad','instep','medial-toes','central-toes','lateral-toes'])
        assert.ok(foot.getObjectByName(part)?.isMesh,part+' exists');
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

test('glute fullness changes only posterior pelvic meshes and hip width stays independent', () => {
  const avatar = new Avatar(new THREE.Scene(), { baseModel: 'softFemale' });
  try {
    assert.ok(avatar.leftArm.rotation.z < 0);
    assert.ok(avatar.rightArm.rotation.z > 0);
    assert.ok(Math.abs(avatar.leftArm.rotation.z + avatar.rightArm.rotation.z) < 1e-9);
    const abdomen = () => avatar.body.getObjectByName('soft-abdomen').geometry.getAttribute('position');
    const thigh = () => avatar.leftLeg.getObjectByName('thigh').geometry.getAttribute('position');
    const glute = () => avatar.body.getObjectByName('left-glute').geometry.getAttribute('position');
    const posterior = 4 * 24 + 6;
    const beforeBack = glute().getZ(posterior);
    const beforeThigh = Array.from(thigh().array);
    const beforeAbdomen = Array.from(abdomen().array);
    const beforeHip = abdomen().getX(24);
    avatar.updateStyle({ ...avatar.profile, gluteSize: 1.55 });
    assert.ok(glute().getZ(posterior) > beforeBack, 'rear glute depth increases');
    assert.deepEqual(Array.from(thigh().array), beforeThigh,
      'glute setting must not swell or reshape the animated thigh');
    assert.deepEqual(Array.from(abdomen().array), beforeAbdomen,
      'glute setting must not reshape the abdomen');
    avatar.updateStyle({ ...avatar.profile, hipSize: 1.4 });
    assert.ok(abdomen().getX(24) > beforeHip, 'hips gain lateral width');
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
  assert.equal(migrated.profileVersion, 5);
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
    const ring = 2, sides = 24;
    const front = ring * sides + 16; // anterior, left of the midline
    const back = ring * sides + 8; // posterior, equally far from midline
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

test('female chest is longer and rounder, with paired anterior lobes, not a peak', () => {
  const preset = SOFT_MODEL_PRESETS.softFemale;
  assert.equal(preset.height, 1.73);
  assert.ok(preset.height < SOFT_MODEL_PRESETS.softMale.height);
  assert.equal(preset.chestDepth, 1.08);
  assert.ok(preset.chestRatio > .585);
  const female = new Avatar(new THREE.Scene(), { baseModel: 'softFemale' });
  const oldDepth = new Avatar(new THREE.Scene(), { baseModel: 'softFemale', chestDepth: 1.12 });
  try {
    const chest = female.body.getObjectByName('soft-chest').geometry;
    assert.ok(chest.getAttribute('position').count > 10 * 24,
      'female chest has extra stations for a rounded shape');
    const vertex = chest.getAttribute('position');
    const ring = 5 * 24; // broadest front section
    assert.ok(Math.abs(vertex.getZ(ring + 17) - vertex.getZ(ring + 19)) < 1e-6,
      'left and right bust contours are symmetric');
    assert.ok(vertex.getZ(ring + 17) < vertex.getZ(ring + 16),
      'a rounded lobe curves back toward the outer side');
    const depthOf = avatar => {
      const g = avatar.body.getObjectByName('soft-chest').geometry;
      g.computeBoundingBox();
      return g.boundingBox.min.z;
    };
    assert.ok(depthOf(female) > depthOf(oldDepth),
      'female front depth is slightly reduced from the previous preset');
  } finally { female.dispose(); oldDepth.dispose(); }
});

test('female clavicular collar stays tucked within chest and is a shorter transition', () => {
  const female = new Avatar(new THREE.Scene(), { baseModel:'softFemale' });
  const oldCollar = new Avatar(new THREE.Scene(), {
    baseModel:'softFemale', upperChestWidth: .98, upperChestDepth: 1.0,
    upperChestFullness: 1.03, clavicleDefinition: .49,
    trapeziusVolume: .96, neckBaseWidth: .95,
  });
  try {
    const chest = female.body.getObjectByName('soft-chest').geometry;
    const collar = female.body.getObjectByName('soft-clavicular').geometry;
    chest.computeBoundingBox();
    collar.computeBoundingBox();
    const cx = chest.boundingBox.max.x;
    const ux = collar.boundingBox.max.x;
    assert.ok(ux < cx, 'collar width fits inside the bust/chest');
    assert.ok(collar.boundingBox.min.z >= chest.boundingBox.min.z,
      'collar never protrudes further forward than chest');
    assert.ok(collar.boundingBox.max.z <= chest.boundingBox.max.z,
      'collar never extends further backward than chest');
    const clavicleY = collar.getAttribute('position').getY(0);
    const shoulder = female.leftArm.position.y;
    assert.ok(shoulder - clavicleY < .08, 'clavicle begins close to shoulder level');
    const original = oldCollar.body.getObjectByName('soft-clavicular').geometry;
    original.computeBoundingBox();
    assert.ok(collar.boundingBox.max.x < original.boundingBox.max.x,
      'the new default clavicle is narrower');
  } finally { female.dispose(); oldCollar.dispose(); }
});

test('pelvis-bound paired glutes blend into higher-resolution upper legs', () => {
  for (const model of ['softFemale', 'softMale']) {
    const avatar = new Avatar(new THREE.Scene(), { baseModel: model });
    try {
      const left = avatar.body.getObjectByName('left-glute');
      const right = avatar.body.getObjectByName('right-glute');
      assert.ok(left?.isMesh && right?.isMesh, 'both independent lobes exist');
      assert.equal(left.parent, avatar.body, 'glutes follow pelvis, not leg bones');
      assert.equal(right.parent, avatar.body);
      assert.notEqual(left.geometry, right.geometry);
      assert.equal(left.geometry.userData.loft.stationCount, 8);
      assert.equal(left.geometry.userData.loft.sides, 24);
      const leftPosition = left.geometry.getAttribute('position');
      const rightPosition = right.geometry.getAttribute('position');
      assert.ok(leftPosition.getX(0) < 0 && rightPosition.getX(0) > 0);
      assert.ok(leftPosition.getY(0) < avatar.leftLeg.position.y,
        'lower glute tip is tucked into the thigh below pelvis');
      assert.ok(leftPosition.getY(7 * 24) > avatar.leftLeg.position.y,
        'upper glute tip meets pelvis behind the abdomen');
      assert.ok(leftPosition.getZ(4 * 24 + 6) > leftPosition.getZ(6),
        'round rear bulge falls away smoothly toward the lower glute tip');
      const thigh = avatar.leftLeg.getObjectByName('thigh').geometry;
      const calf = avatar.leftLeg.userData.knee.getObjectByName('calf').geometry;
      assert.equal(thigh.userData.loft.stationCount, 10);
      assert.equal(calf.userData.loft.stationCount, 8);
      assert.equal(thigh.userData.loft.sides, 20);
      assert.equal(calf.userData.loft.sides, 20);
      assert.ok(Math.abs(thigh.getAttribute('position').getX(0) -
        calf.getAttribute('position').getX(7 * 20)) < 1e-6,
      'knee-facing contour radii match between thigh and calf');
      const before = Array.from(thigh.getAttribute('position').array);
      const rearBefore = leftPosition.getZ(4 * 24 + 6);
      avatar.updateStyle({ ...avatar.profile, gluteSize: 1.52 });
      assert.deepEqual(Array.from(avatar.leftLeg.getObjectByName('thigh')
        .geometry.getAttribute('position').array), before);
      assert.ok(avatar.body.getObjectByName('left-glute')
        .geometry.getAttribute('position').getZ(4 * 24 + 6) > rearBefore);
    } finally { avatar.dispose(); }
  }
});

test('v3 saved female defaults upgrade to v4 without overwriting user edits', () => {
  const v3 = {
    profileVersion: 3, baseModel:'softFemale',
    height:1.73, chestDepth:1.12, chestFullness:1.15,
    chestRatio:.585, upperChestWidth:.98, upperChestDepth:1,
    upperChestFullness:1.03, gluteSize:1.12,
    clavicleDefinition:.49, trapeziusVolume:.96, neckBaseWidth:.95,
    abdomenFullness:1.23, bodyColor:'#4488cc',
  };
  const newer = migrateSoftProfile(v3);
  assert.equal(newer.profileVersion, 5);
  assert.equal(newer.chestDepth, 1.08);
  assert.equal(newer.chestRatio, .62);
  assert.equal(newer.upperChestWidth, .88);
  assert.equal(newer.gluteSize, 1.06);
  assert.equal(newer.abdomenFullness,1.23);
  assert.equal(newer.bodyColor,'#4488cc');
  const edited = migrateSoftProfile({ ...v3, chestDepth: .91, gluteSize: 1.43 });
  assert.equal(edited.chestDepth,.91);
  assert.equal(edited.gluteSize,1.43);
  assert.equal(migrateSoftProfile(newer).chestRatio,.62);
});

test('female bust fullness moves only anterior vertices forward, never sideways or backward', () => {
  const low = new Avatar(new THREE.Scene(), {
    baseModel: 'softFemale', chestFullness: .75,
  });
  const high = new Avatar(new THREE.Scene(), {
    baseModel: 'softFemale', chestFullness: 1.4,
  });
  const male = new Avatar(new THREE.Scene(), { baseModel: 'softMale' });
  try {
    const a = low.body.getObjectByName('soft-chest').geometry.getAttribute('position');
    const b = high.body.getObjectByName('soft-chest').geometry.getAttribute('position');
    assert.equal(a.count, b.count);
    const S = 24;
    const rings = low.body.getObjectByName('soft-chest').geometry.userData.loft.stationCount;
    let movedForward = 0;
    for (let ring = 0; ring < rings; ring++) {
      for (let i = 0; i < S; i++) {
        const index = ring * S + i;
        assert.ok(Math.abs(a.getX(index) - b.getX(index)) < 1e-7,
          'bust fullness must not widen any X coordinate');
        assert.ok(Math.abs(a.getY(index) - b.getY(index)) < 1e-7,
          'bust fullness must not alter the vertical chest silhouette');
        if (i <= 10) {
          assert.ok(Math.abs(a.getZ(index) - b.getZ(index)) < 1e-7,
            'rear hemisphere must not grow with female bust fullness');
        } else if (b.getZ(index) < a.getZ(index) - 1e-7) {
          movedForward++;
        }
      }
    }
    assert.ok(movedForward > 5, 'several anterior vertices should move toward negative Z');
    const left = 5 * S + 17, right = 5 * S + 19;
    assert.ok(Math.abs(b.getZ(left) - b.getZ(right)) < 1e-6,
      'paired bust lobes remain symmetric');
    assert.equal(male.body.getObjectByName('soft-chest').geometry.userData.loft.stationCount, 8,
      'male chest uses its original unmodified loft');
  } finally {
    low.dispose();
    high.dispose();
    male.dispose();
  }
});

test('anatomical chest and abdominal regions form real open-ended visible meshes',()=>{
  for(const baseModel of ['softMale','softFemale']){
    const avatar=new Avatar(new THREE.Scene(),{baseModel});
    try{
      const names=['pelvic-girdle','abdominal-wall','upper-abdomen',
        'lower-ribcage','pectoral-chest','upper-thorax'];
      const parts=names.map(n=>avatar.body.getObjectByName(n));
      assert.ok(parts.every(p=>p?.isMesh&&p.visible),'all anatomy regions render');
      assert.equal(avatar.body.getObjectByName('soft-chest').visible,false,
        'legacy geometry reference must not z-fight visible anatomy');
      assert.equal(avatar.body.getObjectByName('soft-abdomen').visible,false);
      for(let i=1;i<parts.length;i++){
        const a=parts[i-1].geometry,b=parts[i].geometry;
        const count=a.userData.loft.stationCount,sides=a.userData.loft.sides;
        const ap=a.getAttribute('position'),bp=b.getAttribute('position');
        for(let j=0;j<sides;j++){
          const k=(count-1)*sides+j;
          assert.ok(Math.abs(ap.getX(k)-bp.getX(j))<1e-5);
          assert.ok(Math.abs(ap.getY(k)-bp.getY(j))<1e-5);
          assert.ok(Math.abs(ap.getZ(k)-bp.getZ(j))<1e-5);
        }
      }
      const cranium=avatar.head.userData.headMesh.geometry;
      assert.equal(cranium.parameters.widthSegments,20);
      assert.equal(cranium.parameters.heightSegments,9);
      assert.equal(avatar.head.userData.hairMounts.children.every(g=>g.children.length===0),true);
    } finally {avatar.dispose();}
  }
});

test('glute profile stays adjustable but is subdued for both body models',()=>{
  for(const baseModel of ['softMale','softFemale']){
    const low=new Avatar(new THREE.Scene(),{baseModel,gluteSize:.95});
    const high=new Avatar(new THREE.Scene(),{baseModel,gluteSize:1.45});
    try{
      const depth=avatar=>{
        const g=avatar.body.getObjectByName('left-glute').geometry;
        const a=g.getAttribute('position');
        return a.getZ(4*24+6);
      };
      assert.ok(depth(high)>depth(low),'posterior volume remains adjustable');
      const thigh=high.leftLeg.getObjectByName('thigh').geometry;
      assert.ok(high.body.getObjectByName('left-glute').parent===high.body);
      assert.ok(thigh.userData.loft.stationCount>=10);
    } finally {low.dispose();high.dispose()}
  }
});


test('hair rig is an empty reusable set of attachment transforms',async()=>{
  const {mountHairPiece,HAIR_SLOTS}=await import('../src/avatar/HairMounts.js');
  const a=new Avatar(new THREE.Scene(),{baseModel:'softFemale'});
  try{
    const root=a.head.userData.hairMounts;
    assert.equal(root.children.length,HAIR_SLOTS.length);
    const attachment=new THREE.Group();
    assert.strictEqual(mountHairPiece(a.head,'fringe',attachment),attachment);
    assert.strictEqual(attachment.parent,a.head.getObjectByName('hair-slot-fringe'));
    assert.throws(()=>mountHairPiece(a.head,'unknown',new THREE.Group()),TypeError);
    assert.ok(a.head.getObjectByName('hair-slot-crown'));
  } finally {a.dispose()}
});

test('both feet have inset soles and toe clearance to prevent z-fighting',()=>{
  for(const baseModel of ['softMale','softFemale']){
    const avatar=new Avatar(new THREE.Scene(),{baseModel});
    try{
      for(const leg of [avatar.leftLeg,avatar.rightLeg]){
        const foot=leg.getObjectByName('hemisphere-foot');
        const dome=foot.getObjectByName('hemisphere-dome');
        const sole=foot.getObjectByName('flat-sole');
        assert.ok(sole.position.y>.004,'sole must not share dome equator or floor plane');
        assert.ok(sole.scale.x<dome.scale.x*.98,'sole edge stays inside the curved foot');
        assert.ok(sole.scale.y<dome.scale.z*.98);
        assert.ok(foot.position.y+(-leg.userData.knee.position.y)>0,
          'foot rig is lifted slightly above geometric zero');
        for(const name of ['medial-toes','central-toes','lateral-toes']){
          const toe=foot.getObjectByName(name);
          assert.ok(toe.position.y-toe.scale.y>.001,
            'toe pads may not share flat-sole/floor coplanar faces');
        }
      }
    }finally{avatar.dispose()}
  }
});
