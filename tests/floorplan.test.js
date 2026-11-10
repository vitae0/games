import test from 'node:test';
import assert from 'node:assert/strict';
import { UPPER_DECK, DECK_THICKNESS, CEILING_GAP, rectanglesOverlap, landingFootprint } from '../src/world/FloorPlan.js';
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

test('all alternating staircase landings fit entirely in the open deck aperture', () => {
  for (const forward of [true, false]) {
    const landing = landingFootprint(forward);
    for (const deck of UPPER_DECK)
      assert.equal(rectanglesOverlap(landing, deck), false, `landing overlaps deck ${JSON.stringify(deck)}`);
  }
});

test('landing gaps avoid coplanar deck and step geometry', () => {
  const high=landingFootprint(true), low=landingFootprint(false);
  const frontDeckMax=UPPER_DECK[2].z+UPPER_DECK[2].depth/2;
  const backDeckMin=UPPER_DECK[3].z-UPPER_DECK[3].depth/2;
  assert.ok(low.z-low.depth/2>frontDeckMax);
  assert.ok(low.z+low.depth/2<7.75);
  assert.ok(high.z-high.depth/2>13.25);
  assert.ok(high.z+high.depth/2<backDeckMin);
});
