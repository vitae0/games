import test from 'node:test';
import assert from 'node:assert/strict';
import { validateModelFile, MAX_AVATAR_BYTES, MAX_FBX_BYTES, isFbxFile } from '../src/avatar/ModelImporter.js';

test('only bounded local glb/vrm models are accepted', () => {
  assert.equal(validateModelFile({ name:'anime.vrm', size: 13000 }), true);
  assert.equal(validateModelFile({ name:'avatar.glb', size: 34000 }), false);
  assert.throws(() => validateModelFile({ name:'models.zip', size: 10 }));
  assert.throws(() => validateModelFile({ name:'huge.vrm', size: MAX_AVATAR_BYTES + 1 }));
});

test('extracted local FBX character is supported without extracting archives on server', () => {
  assert.equal(isFbxFile({ name: 'TajSensei_Male.fbx' }), true);
  assert.equal(validateModelFile({ name: 'TajSensei_Male.fbx', size: 4_000_000 }), false);
  assert.throws(() => validateModelFile({ name: 'Free Male Character.rar', size: 4_000_000 }), /FBX/);
  assert.throws(() => validateModelFile({ name: 'TajSensei_Male.fbx', size: MAX_FBX_BYTES + 1 }), /75 MB/);
});
