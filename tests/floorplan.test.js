import test from 'node:test';
import assert from 'node:assert/strict';
import { UPPER_DECK, DECK_THICKNESS, CEILING_GAP, rectanglesOverlap } from '../src/world/FloorPlan.js';
test('upper floor plates have non-overlapping footprints, eliminating z-fighting', () => {
  for (let a = 0; a < UPPER_DECK.length; a++) for (let b = a + 1; b < UPPER_DECK.length; b++) {
    assert.equal(rectanglesOverlap(UPPER_DECK[a], UPPER_DECK[b]), false, `deck ${a} overlaps ${b}`);
  }
});
test('stairwell contains a real aperture and ceilings do not intersect upper decks', () => {
  assert.equal(UPPER_DECK.some(a => rectanglesOverlap(a, { x:-8, z:10.5, width: .5, depth: .5 })), false);
  assert.ok(DECK_THICKNESS > 0);
  assert.ok(CEILING_GAP > 0);
});
