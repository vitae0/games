import { normalizeAvatar } from '../avatar/AvatarConfig.js';

/**
 * All NPCs use the same licensed VRoid system as the player.
 * Outfit geometry comes from the artist-authored CC0 beta Base/HairSample
 * models, never generated clothing. Each character has its own clothing tint
 * and face/hair customization.
 */
export const NPC_CAST = Object.freeze([
  Object.freeze({
    id: 'mira', name: 'Mira · Resepsiyon',
    x: -7.50, z: -13.78, yaw: Math.PI, anchored: true,
    asset: 'vroidFemale', baseModel: 'vroidFemale',
    skinTone: 'honey', eyeColor: 'hazel', hair: 'sample',
    hairColor: 'chestnut', shirtColor: 0xd4b3a2,
    pantsColor: 0x363b48, shoesColor: 0xeee5db,
  }),
  Object.freeze({
    id: 'nova', name: 'Nova · Otel misafiri',
    x: 0.10, z: -8.40, yaw: Math.PI * .84, anchored: false,
    asset: 'vroidHairMale', baseModel: 'vroidMale',
    skinTone: 'warm', eyeColor: 'green', hair: 'sample',
    hairColor: 'silver', shirtColor: 0x8b95bd,
    pantsColor: 0x39465d, shoesColor: 0xd6d8dd,
  }),
  Object.freeze({
    id: 'deniz', name: 'Deniz · Barmen',
    x: 8.45, z: -13.85, yaw: 0, anchored: true,
    asset: 'vroidMale', baseModel: 'vroidMale',
    skinTone: 'umber', eyeColor: 'brown', hair: 'sample',
    hairColor: 'black', shirtColor: 0x6b7770,
    pantsColor: 0x292c36, shoesColor: 0x52565e,
  }),
  Object.freeze({
    id: 'lina', name: 'Lina · Bar misafiri',
    x: 8.9, z: -9.85, yaw: Math.PI * .25, anchored: false,
    asset: 'vroidHairFemale', baseModel: 'vroidFemale',
    skinTone: 'porcelain', eyeColor: 'violet', hair: 'sample',
    hairColor: 'copper', shirtColor: 0xb785a3,
    pantsColor: 0x5b4b66, shoesColor: 0xded1d4,
  }),
]);

export function npcProfile(spec) {
  return normalizeAvatar({
    baseModel: spec.baseModel,
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
