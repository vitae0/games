import test from 'node:test';
import assert from 'node:assert/strict';
import {stairFlight,stairHeight,stairSupports,pickStairSupport,walkStairs,STAIR,STAIR_RISE,STAIR_RUN} from '../src/world/Stairwell.js';
import {landingFootprint,UPPER_DECK} from '../src/world/FloorPlan.js';
import {HOTEL} from '../src/config.js';
const collisions={move:(_floor,x,z,dx,dz)=>({x:x+dx,z:z+dz})};
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const travel=(x,z,ground,dx,dz)=>walkStairs(collisions,x,z,ground,dx,dz,.33);
const go=(p,x,z,n=120)=>{
  for(let i=0;i<n;i++){
    const r=travel(p.x,p.z,p.ground,(x-p.x)/(n-i),(z-p.z)/(n-i));
    p.x=r.x;p.z=r.z;p.ground=r.ground;
  }
  close(p.x,x);close(p.z,z);
};

test('every rotated physical stair top agrees with a numbered rise',()=>{
  for(let f=0;f<3;f++){
    const q=stairFlight(f);
    close(stairHeight(f,q.xStart,q.z),f*HOTEL.floorHeight);
    close(stairHeight(f,q.xEnd,q.z),(f+1)*HOTEL.floorHeight);
    for(let i=0;i<STAIR.steps;i++){
      const x=q.forward?STAIR.xNear-(i+.5)*STAIR_RUN:STAIR.xFar+(i+.5)*STAIR_RUN;
      close(stairHeight(f,x,q.z),f*HOTEL.floorHeight+(i+1)*STAIR_RISE);
    }
  }
});

test('shaft centre has no upper-floor ghost deck; perimeter walkway supports upper-floor exit',()=>{
  assert.ok(!stairSupports(-8.0,10.5).some(s=>s.floor===1&&s.type==='deck'));
  assert.ok(stairSupports(-8.0,7.65).some(s=>s.floor===1&&s.type==='deck'));
  assert.equal(pickStairSupport(-8.0,10.5,3.4),null);
  for(const forward of [true,false]){
    const land=landingFootprint(forward);
    for(const deck of UPPER_DECK){
      const overlapX=Math.abs(land.x-deck.x)<(land.width+deck.width)/2;
      const overlapZ=Math.abs(land.z-deck.z)<(land.depth+deck.depth)/2;
      assert.ok(!(overlapX&&overlapZ),'landing must not overlap upper deck surface');
    }
  }
});

test('three rotated flights can be climbed and descended with physical switchback landings',()=>{
  let p={x:STAIR.xNear,z:STAIR.zRight,ground:0};
  for(let f=0;f<3;f++){
    const q=stairFlight(f);
    go(p,q.xEnd,q.z);
    close(p.ground,(f+1)*HOTEL.floorHeight);
    if(f<2){
      const landing=landingFootprint(q.forward);
      go(p,landing.x,landing.z,100);
      go(p,landing.x,stairFlight(f+1).z,100);
      go(p,q.xEnd,stairFlight(f+1).z,60);
    }
  }
  close(p.ground,3*HOTEL.floorHeight);
  for(let f=2;f>=0;f--){
    const q=stairFlight(f);
    go(p,q.xStart,q.z);
    close(p.ground,f*HOTEL.floorHeight);
    if(f>0){
      const landing=landingFootprint(stairFlight(f-1).forward);
      go(p,landing.x,landing.z,80);
      go(p,landing.x,stairFlight(f-1).z,80);
      go(p,q.xStart,stairFlight(f-1).z,55);
    }
  }
  close(p.ground,0);
});

test('cannot cross shafts or enter risers sideways from lower height',()=>{
  const p=travel(-8.0,10.5,3.4,-.4,0);
  close(p.x,-8.0);
  const rail=travel(-8.0,9.0,1.65,0,1.5);
  assert.ok(rail.z<10.5);
  const sprint=travel(STAIR.xNear,STAIR.zRight,0,-5.2,0);
  assert.ok(sprint.x>STAIR.xFar);
});
