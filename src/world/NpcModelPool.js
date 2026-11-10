import { loadBundledCharacterModel } from '../avatar/ModelImporter.js';
import { classifyVRoidMaterial } from '../avatar/VRoidLayers.js';

/**
 * Shared CPU/GPU geometry and texture cache for NPCs.
 * Each NPC gets its own cloned rig, skeleton and MATERIALS.
 * Source geometry/texture objects are NOT disposed with individual NPCs.
 * Fetching each model remains lazy and deduplicated by immutable asset ID.
 */
const templates = new Map();
const JOINT_KEYS = Object.freeze([
  'hips','spine','chest','upperChest','neck','head',
  'leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm',
  'leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg',
]);

export function npcPreparedAsset(assetId) {
  return assetId === 'vroidHairMale' || assetId === 'vroidHairFemale';
}

function isolateMaterials(scene) {
  const cloned = new Map();
  scene.traverse(obj => {
    if (!obj.isMesh || !obj.material) return;
    const isolate = material => {
      if (!cloned.has(material)) cloned.set(material, material.clone());
      return cloned.get(material);
    };
    obj.material = Array.isArray(obj.material)
      ? obj.material.map(isolate) : isolate(obj.material);
  });
  return cloned.size;
}

export function mapClonedHumanoid(sourceVrm, clonedScene) {
  const original = [], duplicate = [];
  sourceVrm.scene.traverse(obj => original.push(obj));
  clonedScene.traverse(obj => duplicate.push(obj));
  if (original.length !== duplicate.length)
    throw new Error('The cloned VRoid hierarchy does not match its original');
  const map = new Map(original.map((obj, index) => [obj, duplicate[index]]));
  return {
    getNormalizedBoneNode(key) {
      const originalBone = sourceVrm.humanoid?.getNormalizedBoneNode(key)
        || sourceVrm.humanoid?.getRawBoneNode(key);
      return (originalBone && map.get(originalBone)) || null;
    },
  };
}

export async function loadNpcModel(assetId) {
  if (!['vroidMale','vroidFemale','vroidHairMale','vroidHairFemale'].includes(assetId))
    throw new Error(`Unknown licensed NPC asset ${assetId}`);
  if (!templates.has(assetId)) {
    templates.set(assetId, loadBundledCharacterModel(assetId).catch(error => {
      templates.delete(assetId);
      throw error;
    }));
  }
  const [source, { clone }] = await Promise.all([
    templates.get(assetId), import('three/addons/utils/SkeletonUtils.js'),
  ]);
  const scene = clone(source.scene);
  isolateMaterials(scene);
  const vrm = {
    scene,
    meta: source.vrm?.meta,
    humanoid: mapClonedHumanoid(source.vrm, scene),
    update() {}, // No shared SpringBone manager: head/bones are updated individually.
  };
  return {
    scene, clips: source.clips || [], vrm, boneMap: {},
    sharedGeometry: true,
    preserveSourceHair: npcPreparedAsset(assetId),
  };
}

/** Tint only the ORIGINAL clothes with material overrides; no clothing meshes are generated. */
export function tintNpcClothing(scene, palette) {
  const colors = {
    shirt: palette.shirtColor,
    pants: palette.pantsColor,
    shoes: palette.shoesColor,
  };
  let changed = 0;
  const seen = new Set();
  scene.traverse(obj => {
    if (!obj.isMesh) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      if (!material || seen.has(material)) continue;
      seen.add(material);
      const color = colors[classifyVRoidMaterial(material.name)];
      if (typeof color !== 'number' || !material.color) continue;
      material.color.setHex(color);
      changed++;
    }
  });
  return changed;
}
