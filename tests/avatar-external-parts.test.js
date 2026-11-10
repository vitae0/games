import test from 'node:test';
import assert from 'node:assert/strict';
import { Avatar } from '../src/avatar/Avatar.js';

test('imported mesh visibility toggles each model part independently', () => {
  const avatar = Object.create(Avatar.prototype);
  const skin = { visible: true }, outerwear = { visible: true };
  avatar.external = { parts: [
    { name: 'Body', mesh: skin }, { name: 'Jacket', mesh: outerwear },
  ] };
  assert.deepEqual(avatar.listExternalParts(), [
    { index: 0, name: 'Body', visible: true },
    { index: 1, name: 'Jacket', visible: true },
  ]);
  assert.equal(avatar.setExternalPartVisible(1, false), true);
  assert.equal(outerwear.visible, false);
  assert.equal(skin.visible, true);
  assert.equal(avatar.setExternalPartVisible(400, false), false);
  assert.equal(avatar.setExternalPartVisible(0, 'false'), false);
  assert.equal(skin.visible, true);
  assert.equal(avatar.setExternalPartVisible(1, true), true);
  assert.equal(outerwear.visible, true);
});

test('no imported model yields an empty part list', () => {
  const avatar = Object.create(Avatar.prototype);
  avatar.external = null;
  assert.deepEqual(avatar.listExternalParts(), []);
  assert.equal(avatar.setExternalPartVisible(0, false), false);
});
