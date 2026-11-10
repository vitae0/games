import test from 'node:test';
import assert from 'node:assert/strict';
import {UPPER_DECK,DECK_THICKNESS,CEILING_GAP,rectanglesOverlap,landingFootprint} from '../src/world/FloorPlan.js';
import {STAIR} from '../src/world/Stairwell.js';
test('four upper floor panels form disjoint pieces with a physical 90-degree shaft',()=>{
  for(let a=0;a<UPPER_DECK.length;a++)for(let b=a+1;b<UPPER_DECK.length;b++)
    assert.equal(rectanglesOverlap(UPPER_DECK[a],UPPER_DECK[b]),false,`overlap ${a} ${b}`);
  assert.ok(!UPPER_DECK.some(a=>rectanglesOverlap(a,{x:-8,z:10.5,width:.7,depth:.7})));
  assert.ok(DECK_THICKNESS>0&&CEILING_GAP>0);
});
test('near and far landings sit in opening without z-fighting',()=>{
  for(const forward of [true,false]){
    const landing=landingFootprint(forward);
    assert.ok(landing.x<STAIR.xNear+.25&&landing.x>STAIR.xFar-.25);
    assert.ok(!UPPER_DECK.some(deck=>rectanglesOverlap(landing,deck)));
  }
});
