import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CharacterStage, studioFrameBounds, STUDIO_VIEWS, STUDIO_INITIAL_VIEW } from '../src/ui/CharacterStage.js';
import { STUDIO_TABS, CHARACTER_CONTROL_IDS } from '../src/ui/Hud.js';
import { SOFT_AVATAR_FIELDS, AVATAR_RANGES } from '../src/avatar/AvatarConfig.js';

test('immersive editor exposes seven distinct sculpt categories and all model controls', () => {
  assert.deepEqual(Object.keys(STUDIO_TABS), [
    'model','face','body','chest','arms','legs','style',
  ]);
  assert.ok(CHARACTER_CONTROL_IDS.includes('baseModel'));
  const fields = SOFT_AVATAR_FIELDS.map(([key]) => key);
  assert.equal(fields.length, new Set(fields).size);
  for (const key of fields) {
    assert.ok(AVATAR_RANGES[key], 'every morph has a valid range: ' + key);
  }
});

test('character editor includes a transparent 3D stage and accessible controls', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of [
    'customizer','studio-viewport','studio-zoom-in','studio-zoom-out',
    'studio-undo','studio-redo','studio-search','avatar-fields',
    'avatar-reset','avatar-save','close-customizer',
  ]) assert.match(html, new RegExp('id="' + id + '"'), id);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /aria-labelledby="studio-main-title"/);
  for (const tab of Object.keys(STUDIO_TABS))
    assert.match(html, new RegExp('data-studio-tab="' + tab + '"'), tab);
  for (const view of Object.keys(STUDIO_VIEWS))
    assert.match(html, new RegExp('data-studio-view="' + view + '"'), view);
  assert.equal((html.match(/id="studio-viewport"/g) || []).length, 1);
  assert.match(html, /id="customizer" class="studio-overlay hidden"/,
    'the editor must not block the world on startup');
});

test('scissored WebGL editor viewport respects DPR and bottom-up GL coordinates', () => {
  const canvas = { left:0, top:0, right:1280, bottom:720, width:1280, height:720 };
  const stage = { left:96, top:76, right:900, bottom:689, width:804, height:613 };
  assert.deepEqual(studioFrameBounds(stage, canvas, 2560, 1440),
    { x:192, y:62, width:1608, height:1226 });
  assert.deepEqual(studioFrameBounds(stage, canvas, 1280, 720),
    { x:96, y:31, width:804, height:613 });
});

test('scissored viewport clips to mobile browser canvas bounds', () => {
  const canvas = { left:0, top:0, right:390, bottom:840, width:390, height:840 };
  const stage = { left:-10, top:60, right:410, bottom:500, width:420, height:440 };
  const result = studioFrameBounds(stage, canvas, 390, 840);
  assert.deepEqual(result, { x:0, y:340, width:390, height:440 });
  const hidden = studioFrameBounds(
    {left:500, top:0, right:600, bottom:200, width:100,height:200},
    canvas, 390, 840,
  );
  assert.equal(hidden.width,0);
});

test('studio opens in three-quarter view while Front stays straight ahead', () => {
  assert.equal(STUDIO_INITIAL_VIEW.yaw, -.55);
  assert.equal(STUDIO_INITIAL_VIEW.pitch, -.16);
  assert.equal(STUDIO_VIEWS.front.yaw, 0);
  assert.equal(STUDIO_VIEWS.front.pitch, 0);
  const stage = {
    active: false, targetYaw: 2, yaw: 2, pitch: .4,
    focusRatio: 0, targetDistance: 5, distance: 5,
    onZoom() {}, setProfile(profile) { this.currentProfile = profile; },
  };
  CharacterStage.prototype.open.call(stage, { baseModel: 'softFemale' });
  assert.equal(stage.active, true);
  assert.equal(stage.targetYaw, STUDIO_INITIAL_VIEW.yaw);
  assert.equal(stage.yaw, STUDIO_INITIAL_VIEW.yaw);
  assert.equal(stage.pitch, STUDIO_INITIAL_VIEW.pitch);
  assert.equal(stage.targetDistance, STUDIO_INITIAL_VIEW.distance);
  assert.equal(stage.currentProfile.baseModel, 'softFemale');
  CharacterStage.prototype.setView.call(stage, 'front');
  assert.ok(Math.abs(stage.targetYaw) < 1e-9);
  assert.equal(stage.pitch, 0);
});
