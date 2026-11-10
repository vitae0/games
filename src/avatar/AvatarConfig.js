/** The public avatar profile has no dependency on the renderer. Measurements are metres. */
export const AVATAR_DEFAULTS = Object.freeze({
  height: 1.73, shoulders: .43, waist: .32, hips: .39,
  legRatio: .49, armRatio: .35, headScale: 1.09,
  baseModel: 'vroidMale', outfit: 'neon', hair: 'bob', visor: false, skinTone: 'warm', eyeColor: 'brown',
  shirtVisible: true, jacketVisible: true, pantsVisible: true, shoesVisible: true,
});
export const AVATAR_RANGES = Object.freeze({
  height: [1.45, 2.08], shoulders: [.32, .67], waist: [.25, .56],
  hips: [.30, .64], legRatio: [.42, .55], armRatio: [.30, .42],
  headScale: [.82, 1.22],
});
export const SKIN_TONES = Object.freeze({
  porcelain: 0xf1d6c5,
  warm: 0xe4bda3,
  honey: 0xc99065,
  umber: 0x9b614a,
  deep: 0x683f36,
});
export const EYE_COLORS = Object.freeze({ brown: 0x553b30, hazel: 0x8c633f, blue: 0x476d91, green: 0x62816b });
export const AVATAR_FIELDS = [
  ['height', 'Boy', 'm', .01], ['shoulders', 'Omuz genişliği', 'm', .01],
  ['waist', 'Bel genişliği', 'm', .01], ['hips', 'Kalça genişliği', 'm', .01],
  ['legRatio', 'Bacak / boy oranı', '', .005],
  ['armRatio', 'Kol / boy oranı', '', .005],
  ['headScale', 'Baş oranı', '×', .01],
];
export function normalizeAvatar(input = {}) {
  const p = { ...AVATAR_DEFAULTS };
  for (const [key, [min, max]] of Object.entries(AVATAR_RANGES)) {
    const value = Number(input[key]);
    if (Number.isFinite(value)) p[key] = Math.max(min, Math.min(max, value));
  }
  if (['vroidMale', 'vroidFemale', 'quaternius', 'procedural'].includes(input.baseModel)) p.baseModel = input.baseModel;
  if (['none', 'neon', 'stealth', 'chrome'].includes(input.outfit)) p.outfit = input.outfit;
  for (const key of ['shirtVisible', 'jacketVisible', 'pantsVisible', 'shoesVisible']) {
    if (typeof input[key] === 'boolean') p[key] = input[key];
  }
  if (['short', 'bob', 'long', 'ponytail', 'mohawk', 'none'].includes(input.hair)) p.hair = input.hair;
  if (typeof input.visor === 'boolean') p.visor = input.visor;
  if (Object.hasOwn(SKIN_TONES, input.skinTone)) p.skinTone = input.skinTone;
  if (Object.hasOwn(EYE_COLORS, input.eyeColor)) p.eyeColor = input.eyeColor;
  return p;
}
