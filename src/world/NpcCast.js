import { normalizeAvatar } from '../avatar/AvatarConfig.js';

/**
 * Hotel NPCs now use the same procedural soft rig as the player.
 * Original licensed VRoid asset IDs and palettes are retained for the legacy
 * character mode. Soft NPCs have independently adjustable shapes and colours.
 */
export const NPC_CAST = Object.freeze([
  Object.freeze({
    id: 'mira', name: 'Mira · Resepsiyon',
    x: -7.50, z: -13.78, yaw: Math.PI, anchored: true,
    asset: 'vroidFemale', baseModel: 'vroidFemale',
    bodyColor: '#e6a7a9', height: 1.68, headScale: 1.12,
    shoulders: .46, hips: .42, upperArmSize: .88, thighSize: .97,
    skinTone: 'honey', eyeColor: 'hazel', hair: 'sample',
    hairColor: 'chestnut', shirtColor: 0xd4b3a2,
    pantsColor: 0x363b48, shoesColor: 0xeee5db,
  }),
  Object.freeze({
    id: 'nova', name: 'Nova · Otel misafiri',
    x: 0.10, z: -8.40, yaw: Math.PI * .84, anchored: false,
    asset: 'vroidHairMale', baseModel: 'vroidMale',
    bodyColor: '#91b9fa', height: 1.83, headScale: 1.04,
    shoulders: .52, hips: .44, upperArmSize: 1.13, calfSize: .92,
    skinTone: 'warm', eyeColor: 'green', hair: 'sample',
    hairColor: 'silver', shirtColor: 0x8b95bd,
    pantsColor: 0x39465d, shoesColor: 0xd6d8dd,
  }),
  Object.freeze({
    id: 'deniz', name: 'Deniz · Barmen',
    x: 8.45, z: -13.85, yaw: 0, anchored: true,
    asset: 'vroidMale', baseModel: 'vroidMale',
    bodyColor: '#96d5b3', height: 1.78, headScale: .98,
    shoulders: .57, waist: .43, upperArmSize: 1.12, thighSize: 1.13,
    skinTone: 'umber', eyeColor: 'brown', hair: 'sample',
    hairColor: 'black', shirtColor: 0x6b7770,
    pantsColor: 0x292c36, shoesColor: 0x52565e,
  }),
  Object.freeze({
    id: 'lina', name: 'Lina · Bar misafiri',
    x: 8.9, z: -9.85, yaw: Math.PI * .25, anchored: false,
    asset: 'vroidHairFemale', baseModel: 'vroidFemale',
    bodyColor: '#c5acec', height: 1.61, headScale: 1.19,
    shoulders: .42, waist: .32, hips: .38, calfSize: .81,
    skinTone: 'porcelain', eyeColor: 'violet', hair: 'sample',
    hairColor: 'copper', shirtColor: 0xb785a3,
    pantsColor: 0x5b4b66, shoesColor: 0xded1d4,
  }),
]);

export function npcProfile(spec) {
  return normalizeAvatar({
    // Legacy CC0 asset identity stays in the cast; each NPC now uses the
    // corresponding soft rig with its own silhouette and proportions.
    baseModel: spec.baseModel === 'vroidFemale' ? 'softFemale' : 'softMale',
    bodyColor: spec.bodyColor,
    height: spec.height,
    headScale: spec.headScale,
    shoulders: spec.shoulders,
    waist: spec.waist,
    hips: spec.hips,
    upperArmSize: spec.upperArmSize,
    thighSize: spec.thighSize,
    calfSize: spec.calfSize,
    skinTone: spec.skinTone,
    eyeColor: spec.eyeColor,
    hair: spec.hair,
    hairColor: spec.hairColor,
    outfit: 'neon',
    underwear: 'original',
    shirtVisible: true,
    pantsVisible: true,
    shoesVisible: true,
  });
}

export function validateNpcCast(cast = NPC_CAST) {
  const ids = new Set(), allowed = new Set([
    'vroidMale', 'vroidFemale', 'vroidHairMale', 'vroidHairFemale',
  ]);
  for (const npc of cast) {
    if (ids.has(npc.id)) throw new Error(`Duplicate NPC id: ${npc.id}`);
    if (!allowed.has(npc.asset)) throw new Error(`Unknown CC0 asset: ${npc.asset}`);
    if (npc.asset.endsWith('Male') && npc.baseModel !== 'vroidMale')
      throw new Error(`NPC male asset mismatch: ${npc.id}`);
    if (npc.asset.endsWith('Female') && npc.baseModel !== 'vroidFemale')
      throw new Error(`NPC female asset mismatch: ${npc.id}`);
    if (!Number.isFinite(npc.x) || !Number.isFinite(npc.z))
      throw new Error(`Invalid NPC position: ${npc.id}`);
    ids.add(npc.id);
  }
  return true;
}
