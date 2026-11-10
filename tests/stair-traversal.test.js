import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stairFlight, stairStepIndex, stairHeight, stairSupports, pickStairSupport,
  walkStairs, STAIR, STAIR_RISE, STAIR_RUN,
} from '../src/world/Stairwell.js';
import { HOTEL } from '../src/config.js';

const collisions = { move: (_floor,x,z,dx,dz) => ({x:x+dx,z:z+dz}) };
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-6, String(a)+' != '+String(b));
const travel = (x,z,ground,dx,dz) => walkStairs(collisions,x,z,ground,dx,dz,.33);

test('each physical tread top matches its numbered 17.9 cm riser', () => {
  for(let f=0;f<3;f++){
    const flight=stairFlight(f);
    close(stairHeight(f,flight.x,flight.forward?STAIR.zLow:STAIR.zHigh),f*HOTEL.floorHeight);
    close(stairHeight(f,flight.x,flight.forward?STAIR.zHigh:STAIR.zLow),(f+1)*HOTEL.floorHeight);
    for(let i=0;i<STAIR.steps;i++){
      const z=flight.forward ? STAIR.zLow+(i+.5)*STAIR_RUN : STAIR.zHigh-(i+.5)*STAIR_RUN;
      assert.equal(stairStepIndex(f,z),i+1);
      close(stairHeight(f,flight.x,z),f*HOTEL.floorHeight+(i+1)*STAIR_RISE);
    }
  }
});

test('empty upper stairwell has no imaginary flat floor', () => {
  assert.ok(!stairSupports(-6.90,10.5).some(s=>s.floor===1 && s.type==='deck'));
  assert.ok(stairSupports(-6.90,13.43).some(s=>s.floor===1 && s.type==='deck'));
  assert.ok(stairSupports(-6.90,7.56).some(s=>s.floor===2 && s.type==='deck'));
  assert.equal(pickStairSupport(-6.90,10.5,3.4),null);
});

test('all flights and both switchback landings work while climbing and descending', () => {
  let p={x:STAIR.xLeft,z:STAIR.zLow,ground:0};
  const moveTo=(targetX,targetZ,count=120)=>{
    for(let i=0;i<count;i++)p=travel(p.x,p.z,p.ground,
      (targetX-p.x)/(count-i),(targetZ-p.z)/(count-i));
    close(p.x,targetX);close(p.z,targetZ);
  };
  moveTo(STAIR.xLeft,STAIR.zHigh);close(p.ground,3.4);
  moveTo(STAIR.xLeft,13.43,24);
  moveTo(STAIR.xRight,13.43,96);
  moveTo(STAIR.xRight,STAIR.zHigh,24);
  moveTo(STAIR.xRight,STAIR.zLow);close(p.ground,6.8);
  moveTo(STAIR.xRight,7.56,24);
  moveTo(STAIR.xLeft,7.56,96);
  moveTo(STAIR.xLeft,STAIR.zLow,24);
  moveTo(STAIR.xLeft,STAIR.zHigh);close(p.ground,10.2);
  moveTo(STAIR.xLeft,STAIR.zLow);close(p.ground,6.8);
  moveTo(STAIR.xLeft,7.56,24);
  moveTo(STAIR.xRight,7.56,96);
  moveTo(STAIR.xRight,STAIR.zLow,24);
  moveTo(STAIR.xRight,STAIR.zHigh);close(p.ground,3.4);
  moveTo(STAIR.xRight,13.43,24);
  moveTo(STAIR.xLeft,13.43,96);
  moveTo(STAIR.xLeft,STAIR.zHigh,24);
  moveTo(STAIR.xLeft,STAIR.zLow);close(p.ground,0);
});

test('solid risers and rails prevent side entry, void walking, and sprint tunnelling', () => {
  const mid=(STAIR.zLow+STAIR.zHigh)/2;
  const side=travel(STAIR.xLeft,mid,1.7,1.45,0);
  assert.ok(side.x <= STAIR.xLeft+STAIR.width/2-.33*.48+1e-6);
  close(travel(-7.0,mid,3.4,.1,0).x,-7);
  assert.ok(travel(-7,mid,0,-1.3,0).x > STAIR.xLeft+.7);
  const sprint=travel(STAIR.xLeft,STAIR.zLow,0,0,4.8);
  assert.ok(sprint.z < STAIR.zHigh);
});
