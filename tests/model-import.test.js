import test from 'node:test';
import assert from 'node:assert/strict';
import { validateModelFile, MAX_AVATAR_BYTES } from '../src/avatar/ModelImporter.js';

test('only bounded local glb/vrm models are accepted', () => {
  assert.equal(validateModelFile({ name:'anime.vrm', size: 13000 }), true);
  assert.equal(validateModelFile({ name:'avatar.glb', size: 34000 }), false);
  assert.throws(() => validateModelFile({ name:'models.zip', size: 10 }));
  assert.throws(() => validateModelFile({ name:'huge.vrm', size: MAX_AVATAR_BYTES + 1 }));
});
