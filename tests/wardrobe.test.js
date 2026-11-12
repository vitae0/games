import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAvatar } from '../src/avatar/AvatarConfig.js';
import { visibleGarmentLayers } from '../src/avatar/ClothingLayers.js';

test('Vitae Soft male/female are distinct while original VRoid bases remain selectable', () => {
  assert.equal(normalizeAvatar({}).baseModel, 'softMale');
  assert.equal(normalizeAvatar({ baseModel: 'invalid' }).baseModel, 'softMale');
  assert.equal(normalizeAvatar({ baseModel: 'vroidFemale' }).baseModel, 'vroidFemale');
  assert.equal(normalizeAvatar({ baseModel: 'procedural' }).baseModel, 'softMale');
});
test('none removes all visual garment layers, not anatomy', () => {
  assert.deepEqual(visibleGarmentLayers(normalizeAvatar({ outfit: 'none' })), {
    shirt: false, jacket: false, pants: false, shoes: false,
  });
});
test('each garment layer has an independent visibility toggle', () => {
  const p = normalizeAvatar({ outfit: 'neon', jacketVisible: false, pantsVisible: false });
  assert.deepEqual(visibleGarmentLayers(p), {
    shirt: true, jacket: false, pants: false, shoes: true,
  });
});
test('bad garment values cannot corrupt controls', () => {
  const p = normalizeAvatar({ shirtVisible: 'no', shoesVisible: null, outfit: 'invalid' });
  assert.equal(p.shirtVisible, true);
  assert.equal(p.shoesVisible, true);
  assert.equal(p.outfit, 'none');
});
