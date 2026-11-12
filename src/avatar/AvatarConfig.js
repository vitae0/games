/** Renderer-independent avatar profiles. Metres, ratios and multipliers. */
export const SOFT_MODELS = Object.freeze(['softMale', 'softFemale']);
export const isSoftModel = baseModel => SOFT_MODELS.includes(baseModel) || baseModel === 'soft';

/**
 * Two different silhouettes and two independent starting morphologies.
 * Every measurement remains editable on both models.
 */
export const SOFT_MODEL_PRESETS = Object.freeze({
  softMale: Object.freeze({
    height: 1.78, shoulders: .51, waist: .38, hips: .41,
    legRatio: .49, armRatio: .36, headScale: 1.08,
    torsoDepth: 1.05, chestWidth: 1.09, chestDepth: 1.05,
    chestFullness: 1.0, abdomenWidth: .98, abdomenDepth: 1.0,
    abdomenFullness: .98, chestRatio: .57, neckSize: 1.0,
    upperArmSize: 1.05, forearmSize: 1.0, handSize: 1.0,
    upperArmRatio: .49, thighSize: 1.05, calfSize: 1,
    thighRatio: .53, legSpacing: 1, footSize: .96, footLength: 1,
    eyeSpacing: 1, eyeLength: 1,
    upperChestWidth: 1.04, upperChestDepth: 1.0, upperChestFullness: 1.0,
    hipSize: 1.0, gluteSize: .96, armSpread: .11,
    clavicleDefinition: .66, trapeziusVolume: 1.08, neckBaseWidth: 1,
  }),
  softFemale: Object.freeze({
    height: 1.73, shoulders: .44, waist: .335, hips: .47,
    legRatio: .515, armRatio: .355, headScale: 1.10,
    torsoDepth: .99, chestWidth: 1.10, chestDepth: 1.08,
    chestFullness: 1.13, abdomenWidth: .91, abdomenDepth: 1.02,
    abdomenFullness: 1, chestRatio: .62, neckSize: .91,
    upperArmSize: .89, forearmSize: .9, handSize: .9,
    upperArmRatio: .49, thighSize: 1.07, calfSize: .95,
    thighRatio: .55, legSpacing: 1, footSize: .89, footLength: .93,
    eyeSpacing: 1, eyeLength: 1,
    upperChestWidth: .88, upperChestDepth: .84, upperChestFullness: .88,
    hipSize: 1.08, gluteSize: 1.06, armSpread: .15,
    clavicleDefinition: .32, trapeziusVolume: .82, neckBaseWidth: .92,
  }),
});

/** Keep old CC0 VRoid models accessible; no asset removal/migration. */
export const AVATAR_DEFAULTS = Object.freeze({
  ...SOFT_MODEL_PRESETS.softMale,
  bodyColor: '#a9c4fb', profileVersion: 4,
  baseModel: 'softMale', outfit: 'none', hair: 'sample', hairColor: 'original', visor: false,
  skinTone: 'warm', eyeColor: 'brown', underwear: 'none',
  shirtVisible: true, jacketVisible: true, pantsVisible: true, shoesVisible: true,
});

export const AVATAR_RANGES = Object.freeze({
  height: [1.45, 2.08], shoulders: [.32, .67], waist: [.25, .56],
  hips: [.30, .64], legRatio: [.42, .56], armRatio: [.30, .42],
  headScale: [.82, 1.30], torsoDepth: [.70, 1.45],
  chestWidth: [.72, 1.43], chestDepth: [.70, 1.44],
  chestFullness: [.70, 1.4], abdomenWidth: [.67, 1.45],
  abdomenDepth: [.70, 1.5], abdomenFullness: [.72, 1.45],
  chestRatio: [.40, .68], neckSize: [.72, 1.4],
  upperChestWidth: [.70, 1.45], upperChestDepth: [.70, 1.45],
  upperChestFullness: [.75, 1.45], hipSize: [.70, 1.50],
  gluteSize: [.65, 1.65], armSpread: [0, .34],
  clavicleDefinition: [0, 1.5], trapeziusVolume: [.55, 1.6],
  neckBaseWidth: [.70, 1.45],
  upperArmSize: [.65, 1.55], forearmSize: [.65, 1.55],
  handSize: [.70, 1.50], upperArmRatio: [.40, .60],
  thighSize: [.65, 1.55], calfSize: [.65, 1.55],
  thighRatio: [.44, .63], legSpacing: [.75, 1.30],
  footSize: [.55, 1.45], footLength: [.68, 1.55],
  eyeSpacing: [.70, 1.40], eyeLength: [.65, 1.45],
});

export const SOFT_AVATAR_FIELDS = Object.freeze([
  ['height', 'Boy', 'm', .01],
  ['headScale', 'Kafa büyüklüğü', '×', .01],
  ['eyeSpacing', 'Göz aralığı', '×', .01],
  ['eyeLength', 'Göz çizgisi uzunluğu', '×', .01],
  ['shoulders', 'Omuzlar arası genişlik', 'm', .01],
  ['waist', 'Bel genişliği', 'm', .01],
  ['hips', 'Kalça genişliği', 'm', .01],
  ['torsoDepth', 'Genel gövde derinliği', '×', .01],
  ['chestWidth', 'Göğüs genişliği', '×', .01],
  ['chestDepth', 'Göğüs derinliği', '×', .01],
  ['chestFullness', 'Göğüs dolgunluğu', '×', .01],
  ['chestRatio', 'Göğüs / gövde oranı', '', .005],
  // Existing upperChest* keys remain to preserve saved v3 customizations.
  // These controls now shape the collarbone and neck-shoulder transition.
  ['upperChestWidth', 'Klaviküler bölge genişliği', '×', .01],
  ['upperChestDepth', 'Klaviküler bölge derinliği', '×', .01],
  ['upperChestFullness', 'Klaviküler bölge hacmi', '×', .01],
  ['clavicleDefinition', 'Köprücük kemiği belirginliği', '×', .01],
  ['trapeziusVolume', 'Trapez / boyun-omuz geçişi', '×', .01],
  ['neckBaseWidth', 'Boyun tabanı genişliği', '×', .01],
  ['abdomenWidth', 'Karın genişliği', '×', .01],
  ['abdomenDepth', 'Karın derinliği', '×', .01],
  ['abdomenFullness', 'Karın dolgunluğu', '×', .01],
  ['neckSize', 'Boyun kalınlığı', '×', .01],
  ['armRatio', 'Kol uzunluğu', '', .005],
  ['armSpread', 'Kolların yana açıklığı', 'rad', .01],
  ['upperArmRatio', 'Üst kol / kol oranı', '', .005],
  ['upperArmSize', 'Üst kol kalınlığı', '×', .01],
  ['forearmSize', 'Ön kol kalınlığı', '×', .01],
  ['handSize', 'El büyüklüğü', '×', .01],
  ['legRatio', 'Bacak uzunluğu', '', .005],
  ['hipSize', 'Kalça yan genişliği (hip)', '×', .01],
  ['gluteSize', 'Kalça arkası dolgunluğu (glute)', '×', .01],
  ['legSpacing', 'Bacak aralığı', '×', .01],
  ['thighRatio', 'Uyluk / bacak oranı', '', .005],
  ['thighSize', 'Uyluk kalınlığı', '×', .01],
  ['calfSize', 'Baldır kalınlığı', '×', .01],
  ['footSize', 'Ayak büyüklüğü', '×', .01],
  ['footLength', 'Ayak uzunluğu', '×', .01],
]);

export const SKIN_TONES = Object.freeze({
  porcelain: 0xf1d6c5, warm: 0xe4bda3, honey: 0xc99065,
  umber: 0x9b614a, deep: 0x683f36,
});
export const EYE_COLORS = Object.freeze({
  brown: 0x69412d, hazel: 0x958052, blue: 0x598ec8, green: 0x6f9d83,
  gray: 0x9198a6, violet: 0x9276b9,
});
export const HAIR_COLORS = Object.freeze({
  original: null, black: 0x23242b, chestnut: 0x594033, brown: 0x382721,
  blonde: 0xd9b47b, copper: 0xb36844, silver: 0xbdc0c5,
  pink: 0xd58da6, blue: 0x55769e,
});
export const AVATAR_FIELDS = SOFT_AVATAR_FIELDS;

/** Apply a selected body preset without discarding colour/legacy wardrobe choices. */
export function switchSoftModel(profile, model) {
  if (!SOFT_MODELS.includes(model)) return normalizeAvatar({ ...profile, baseModel: model });
  return normalizeAvatar({
    ...profile,
    ...SOFT_MODEL_PRESETS[model],
    baseModel: model,
  });
}

/** Legacy 'soft' saves automatically upgrade to the original male silhouette. */
export function normalizeAvatar(input = {}) {
  const incomingModel = input.baseModel === 'soft' ? 'softMale' : input.baseModel;
  const model = SOFT_MODELS.includes(incomingModel) ? incomingModel : AVATAR_DEFAULTS.baseModel;
  const p = { ...AVATAR_DEFAULTS, ...SOFT_MODEL_PRESETS[model] };
  for (const [key, [min, max]] of Object.entries(AVATAR_RANGES)) {
    const value = Number(input[key]);
    if (Number.isFinite(value)) p[key] = Math.max(min, Math.min(max, value));
  }
  if (typeof input.bodyColor === 'string' && /^#[\da-fA-F]{6}$/.test(input.bodyColor))
    p.bodyColor = input.bodyColor.toLowerCase();
  if (['softMale', 'softFemale', 'vroidMale', 'vroidFemale'].includes(incomingModel))
    p.baseModel = incomingModel;
  if (['none', 'neon'].includes(input.outfit)) p.outfit = input.outfit;
  if (['none', 'original'].includes(input.underwear)) p.underwear = input.underwear;
  for (const key of ['shirtVisible', 'jacketVisible', 'pantsVisible', 'shoesVisible']) {
    if (typeof input[key] === 'boolean') p[key] = input[key];
  }
  if (['sample', 'none'].includes(input.hair)) p.hair = input.hair;
  if (Object.hasOwn(HAIR_COLORS, input.hairColor)) p.hairColor = input.hairColor;
  if (typeof input.visor === 'boolean') p.visor = input.visor;
  if (Object.hasOwn(SKIN_TONES, input.skinTone)) p.skinTone = input.skinTone;
  if (Object.hasOwn(EYE_COLORS, input.eyeColor)) p.eyeColor = input.eyeColor;
  return p;
}

/** Upgrade female presets across v2/v3 -> v4 without touching custom sliders.
 * Each generation upgrades only exact former defaults; edited values survive.
 * Male and VRoid profiles are normalized unchanged.
 */
export function migrateSoftProfile(input = {}) {
  if (!input || typeof input !== 'object') return normalizeAvatar();
  if (input.profileVersion >= 4 || input.baseModel !== 'softFemale')
    return normalizeAvatar(input);

  const v2Female = {
    height: 1.68, shoulders: .435, hips: .46,
    legRatio: .52, headScale: 1.12, torsoDepth: .97,
    chestWidth: .97, chestDepth: 1.03,
    chestFullness: 1.08, chestRatio: .52,
  };
  const v3Female = {
    height: 1.73, shoulders: .44, hips: .47,
    legRatio: .515, headScale: 1.10, torsoDepth: .99,
    chestWidth: 1.10, chestDepth: 1.12,
    chestFullness: 1.15, chestRatio: .585,
    upperChestWidth: .98, upperChestDepth: 1,
    upperChestFullness: 1.03, gluteSize: 1.12,
    clavicleDefinition: .49, trapeziusVolume: .96, neckBaseWidth: .95,
  };
  const replacement = {};
  for (const [key, current] of Object.entries(input)) {
    const oldValue = input.profileVersion >= 3 ? v3Female[key] : v2Female[key];
    if (oldValue !== undefined && current === oldValue)
      replacement[key] = SOFT_MODEL_PRESETS.softFemale[key];
  }
  return normalizeAvatar({ ...input, ...replacement });
}
