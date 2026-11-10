import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAvatar, AVATAR_DEFAULTS, SKIN_TONES, EYE_COLORS } from '../src/avatar/AvatarConfig.js';
test('skin colour and eye colour are validated and safe to save', () => {
  const avatar = normalizeAvatar({ skinTone:'umber', eyeColor:'green', hair:'sample', hairColor:'pink', underwear:'original' });
  assert.equal(avatar.skinTone, 'umber');assert.equal(avatar.eyeColor, 'green');
  assert.equal(avatar.hair, 'sample');
  assert.equal(avatar.hairColor,'pink');
  assert.equal(avatar.underwear,'original');
  assert.equal(normalizeAvatar({ skinTone:'invalid', eyeColor:'yellow' }).skinTone, AVATAR_DEFAULTS.skinTone);
  assert.equal(normalizeAvatar({ skinTone:'invalid', eyeColor:'yellow' }).eyeColor, AVATAR_DEFAULTS.eyeColor);
  assert.ok(Object.keys(SKIN_TONES).length >= 5);
  assert.ok(Object.keys(EYE_COLORS).length >= 4);
});
