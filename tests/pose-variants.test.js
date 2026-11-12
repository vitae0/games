import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Avatar} from '../src/avatar/Avatar.js';
import {FLOOR_VARIANTS, floorVariant, cycleFloorVariant, lyingDirection} from '../src/player/PoseVariants.js';
import {poseFor} from '../src/avatar/PoseMath.js';

test('floor poses form independent nested menus with deterministic wraparound',()=>{
  assert.equal(FLOOR_VARIANTS.floorSit.length,7);
  assert.equal(FLOOR_VARIANTS.kneel.length,4);
  assert.equal(FLOOR_VARIANTS.floorLie.length,4);
  assert.equal(floorVariant('floorSit').id,'legsForward');
  assert.equal(floorVariant('floorSit',1).id,'crossLegged');
  assert.equal(floorVariant('kneel',0).id,'bothKnees');
  assert.equal(floorVariant('floorLie',2).id,'raisedKnee');
  assert.equal(cycleFloorVariant('floorSit',0,-1),6);
  assert.equal(cycleFloorVariant('floorSit',6,1),0);
  assert.equal(cycleFloorVariant('kneel',3,1),0);
  assert.equal(floorVariant('stand'),null);
  assert.equal(lyingDirection(0),'Sırtüstü');
  assert.equal(lyingDirection(1),'Sol yan');
  assert.equal(lyingDirection(2),'Yüzüstü');
  assert.equal(lyingDirection(-1),'Sağ yan');
  assert.equal(lyingDirection(6),'Yüzüstü');
});

test('cross-legged/butterfly/side seated poses use genuine hip y/z and knee rotations',()=>{
  const baseline=poseFor('floorSit',0,1,1.73);
  const cross=poseFor('floorSit',0,1,1.73,null,'crossLegged');
  const butterfly=poseFor('floorSit',0,1,1.73,null,'butterfly');
  const left=poseFor('floorSit',0,1,1.73,null,'sideLeft');
  const right=poseFor('floorSit',0,1,1.73,null,'sideRight');
  const knees=poseFor('floorSit',0,1,1.73,null,'hugKnees');
  assert.deepEqual(baseline.hipYaw,[0,0]);
  assert.ok(cross.hipYaw[0]<-.4&&cross.hipYaw[1]>.4);
  assert.ok(cross.knee[0]<-1.6&&cross.knee[1]<-1.6);
  assert.ok(butterfly.hipYaw[0]<-.7&&butterfly.hipYaw[1]>.7);
  assert.ok(left.hipYaw.every(v=>v<-.5));
  assert.ok(right.hipYaw.every(v=>v>.5));
  assert.ok(knees.arms.every(v=>v>.8));
  assert.notDeepEqual(cross.hipRoll,butterfly.hipRoll);
  assert.ok(cross.drop>0.60&&cross.drop<0.71);
});

test('kneel and recline variants preserve their parent posture and symmetric base',()=>{
  const standard=poseFor('kneel',0,1,1.73);
  const seiza=poseFor('kneel',0,1,1.73,null,'seiza');
  const lean=poseFor('kneel',0,1,1.73,null,'forwardKneel');
  const fetal=poseFor('floorLie',0,1,1.73,null,'fetal');
  const raised=poseFor('floorLie',0,1,1.73,null,'raisedKnee');
  assert.equal(standard.knee[0],standard.knee[1]);
  assert.ok(seiza.drop>standard.drop);
  assert.ok(lean.spine>.5);
  assert.ok(fetal.knee.every(v=>v<-1.7));
  assert.notEqual(raised.hip[0],raised.hip[1]);
  assert.equal(fetal.drop,0);
  const standing=poseFor('stand',0,1,1.73,null,'crossLegged');
  assert.equal(standing.drop,0,'floor variants never alter a standing player');
});

test('cross-legged yaw actually changes both knee world coordinates, not just mesh twist',()=>{
  const avatar=new Avatar(new THREE.Scene(),{baseModel:'softFemale'});
  const kneePositions=()=> {
    avatar.root.updateWorldMatrix(true,true);
    return ['leftLeg','rightLeg'].map(name=>
      avatar[name].userData.knee.getWorldPosition(new THREE.Vector3()));
  };
  try{
    for(let i=0;i<32;i++)avatar.update(.05,0,'floorSit',null,'legsForward');
    const before=kneePositions();
    for(let i=0;i<32;i++)avatar.update(.05,0,'floorSit',null,'crossLegged');
    const after=kneePositions();
    assert.equal(avatar.leftLeg.rotation.order,'YXZ');
    assert.equal(avatar.rightLeg.rotation.order,'YXZ');
    assert.ok(Math.abs(after[0].x-before[0].x)>.075,'left knee moves laterally');
    assert.ok(Math.abs(after[1].x-before[1].x)>.075,'right knee moves laterally');
    assert.ok(after[0].x>before[0].x && after[1].x<before[1].x,
      'legs fold towards each other rather than twisting in place');
  }finally{avatar.dispose();}
});
