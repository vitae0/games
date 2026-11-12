import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Avatar } from '../src/avatar/Avatar.js';

const meshes = root => {
  const result = [];
  root.traverse(object => { if (object.isMesh) result.push(object); });
  return result;
};

test('NPC avatars keep full head and torso while the local player only renders limbs in FPS', () => {
  const scene = new THREE.Scene();
  const local = new Avatar(scene, { baseModel: 'softMale' }, { localPlayer: true });
  const npc = new Avatar(scene, { baseModel: 'softFemale' });
  try {
    assert.equal(local.localPlayer, true);
    assert.equal(npc.localPlayer, false);
    assert.ok(local.firstPersonOccluders.length > 0);
    assert.equal(npc.firstPersonOccluders.length, 0,
      'remote avatars are never included in the first-person mask');

    const localHead = meshes(local.head);
    const npcHead = meshes(npc.head);
    assert.ok(localHead.length >= 3 && npcHead.length >= 3);
    assert.ok(localHead.every(m => m.layers.mask === 2));
    assert.ok(npcHead.every(m => m.layers.mask === 1),
      'all NPC face parts remain visible in the ordinary camera layer');

    for (const model of [local, npc]) {
      const torso = model.body.getObjectByName('pectoral-chest');
      assert.ok(torso?.isMesh);
      assert.equal(torso.layers.mask, model === local ? 2 : 1);
      for (const limb of [model.leftArm, model.rightArm, model.leftLeg, model.rightLeg]) {
        const limbMeshes = meshes(limb);
        assert.ok(limbMeshes.length > 0);
        assert.ok(limbMeshes.every(m => m.layers.mask === 1),
          'all hands/fingers/upper and lower limbs stay in ordinary layer');
      }
    }

    const localCamera = new THREE.PerspectiveCamera();
    localCamera.layers.set(0);
    assert.equal(localCamera.layers.test(localHead[0].layers), false);
    assert.equal(localCamera.layers.test(npcHead[0].layers), true);
    assert.equal(localCamera.layers.test(local.leftArm.getObjectByName('upper-arm').layers), true);

    localCamera.layers.enable(1);
    assert.equal(localCamera.layers.test(localHead[0].layers), true,
      'local third-person camera reveals complete avatar');
    assert.equal(localCamera.layers.test(npcHead[0].layers), true);
  } finally {
    local.dispose();
    npc.dispose();
  }
});

test('local rebuild retains mask but all newly created NPC meshes stay complete', () => {
  const scene = new THREE.Scene();
  const local = new Avatar(scene, { baseModel: 'softFemale' }, { localPlayer: true });
  const npc = new Avatar(scene, { baseModel: 'softMale' });
  try {
    local.rebuild({ baseModel: 'softMale', abdomenFullness: 1.1 });
    npc.rebuild({ baseModel: 'softFemale', abdomenFullness: 1.1 });
    assert.equal(local.body.getObjectByName('abdominal-wall').layers.mask, 2);
    assert.equal(npc.body.getObjectByName('abdominal-wall').layers.mask, 1);
    assert.ok(meshes(npc.body).every(m => m.layers.mask === 1),
      'a remote profile update must not inherit owner camera filtering');
  } finally {
    local.dispose();
    npc.dispose();
  }
});

test('legacy skinned limbs and hands remain visible through a local external model fallback', () => {
  const scene = new THREE.Scene();
  const local = new Avatar(scene, { baseModel: 'vroidFemale' }, { localPlayer: true });
  const remote = new Avatar(scene, { baseModel: 'vroidMale' });
  try {
    assert.ok(local.skinnedLayers.length >= 4);
    assert.ok(local.skinnedLayers.every(mesh => mesh.layers.mask === 1),
      'body-attached skinned limb meshes are still limbs');
    assert.ok(meshes(remote.body).every(mesh => mesh.layers.mask === 1));
    assert.equal(local.head.children[0].layers.mask, 2);
    assert.equal(remote.head.children[0].layers.mask, 1);

    const imported = new THREE.Group();
    const fullModel = new THREE.Mesh(new THREE.BoxGeometry(.6, 1.8, .3),
      new THREE.MeshBasicMaterial({ color: 0xbcbcbc }));
    imported.add(fullModel);
    local.applyExternal({ scene: imported, clips: [], vrm: null, boneMap: {} });
    assert.equal(fullModel.layers.mask, 2);
    local.setFirstPersonMode(true);
    assert.equal(local.body.visible, true,
      'local procedural limbs are a first-person fallback when VRM has a single body mesh');
    assert.equal(local.leftArm.userData.hand.children[0].layers.mask, 1);
    local.setFirstPersonMode(false);
    assert.equal(local.body.visible, false,
      'external model replaces procedural fallback in third-person');
    assert.equal(fullModel.layers.mask, 2);

    // Clearing an imported model restores the original local procedural rig.
    local.clearExternal();
    assert.equal(local.body.visible, true);
    assert.equal(local.head.children[0].layers.mask, 2);
  } finally {
    local.dispose();
    remote.dispose();
  }
});
