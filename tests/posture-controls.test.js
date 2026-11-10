import test from 'node:test';
import assert from 'node:assert/strict';
import { PostureControls, JUMP_COMBO_GRACE_MS } from '../src/player/PostureControls.js';

test('double Ctrl only counts two distinct presses and can repeat after reset', () => {
  const p = new PostureControls();
  assert.equal(p.press('ControlLeft', 1000), null);
  assert.equal(p.press('ControlLeft', 1050), null); // hold repeat
  p.release('ControlLeft');
  assert.equal(p.press('ControlLeft', 1200), 'floorSit');
  p.release('ControlLeft');
  assert.equal(p.press('ControlLeft', 1400), null);
  p.release('ControlLeft');
  assert.equal(p.press('ControlLeft', 1600), 'floorSit');
});

test('Ctrl + Space and Space then Ctrl both kneel without jumping', () => {
  const p = new PostureControls();
  p.press('ControlLeft', 1000);
  assert.equal(p.press('Space', 1010), 'kneel');
  assert.equal(p.consumeJump(2000), false);
  p.reset();
  p.press('Space', 3000);
  assert.equal(p.press('ControlRight', 3060), 'kneel');
  assert.equal(p.consumeJump(3600), false);
});

test('ordinary Space still jumps, Ctrl crouch toggles with keyup', () => {
  const p = new PostureControls();
  p.press('Space', 1000);
  p.release('Space');
  assert.equal(p.consumeJump(1000 + JUMP_COMBO_GRACE_MS - 1), false);
  assert.equal(p.consumeJump(1000 + JUMP_COMBO_GRACE_MS), true);
  assert.equal(p.consumeJump(1500), false);
  p.press('ControlRight', 1700);
  assert.equal(p.crouching, true);
  p.release('ControlRight');
  assert.equal(p.crouching, false);
  p.reset();
  assert.equal(p.crouching, false);
});
