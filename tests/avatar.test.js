import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAvatar, AVATAR_DEFAULTS } from '../src/avatar/AvatarConfig.js';

test('default measurements stay anatomically plausible', () => {
  const p = normalizeAvatar();
  assert.ok(p.height * p.legRatio < p.height);
  assert.ok(p.shoulders > p.waist * .8);
  assert.equal(p.height, AVATAR_DEFAULTS.height);
});
test('invalid or out-of-range values cannot corrupt rig', () => {
  const p = normalizeAvatar({ height: Infinity, shoulders: 999, hips: -5, outfit: '???', visor: false });
  assert.equal(p.height, AVATAR_DEFAULTS.height);
  assert.equal(p.shoulders, .67);
  assert.equal(p.hips, .30);
  assert.equal(p.outfit, 'neon');
  assert.equal(p.visor, false);
});
