import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAvatar } from '../src/avatar/AvatarConfig.js';
import { visibleGarmentLayers } from '../src/avatar/ClothingLayers.js';

test('soft is default while both original VRoid bases remain selectable', () => {
  assert.equal(normalizeAvatar({}).baseModel, 'soft');
  assert.equal(normalizeAvatar({ baseModel: 'invalid' }).baseModel, 'soft');
  assert.equal(normalizeAvatar({ baseModel: 'vroidFemale' }).baseModel, 'vroidFemale');
  assert.equal(normalizeAvatar({ baseModel: 'procedural' }).baseModel, 'soft');
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
