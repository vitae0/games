export const AVATAR_DEFAULTS = Object.freeze({
  height: 1.76, shoulders: .47, waist: .33, hips: .39,
  legRatio: .48, armRatio: .36, headScale: 1.0,
  outfit: 'neon', hair: 'short', visor: true,
});
export const AVATAR_RANGES = Object.freeze({
  height: [1.45, 2.08], shoulders: [.32, .67], waist: [.25, .56],
  hips: [.30, .64], legRatio: [.42, .55], armRatio: [.30, .42],
  headScale: [.82, 1.22],
});
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
  if (['neon', 'stealth', 'chrome'].includes(input.outfit)) p.outfit = input.outfit;
  if (['short', 'mohawk', 'none'].includes(input.hair)) p.hair = input.hair;
  if (typeof input.visor === 'boolean') p.visor = input.visor;
  return p;
}
