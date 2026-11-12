import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/player/Player.js';

function makePlayer() {
  const noop = () => {};
  const canvas = { addEventListener: noop, removeEventListener: noop };
  globalThis.document = { pointerLockElement: canvas,
    addEventListener: noop, removeEventListener: noop };
  globalThis.window = { addEventListener: noop, removeEventListener: noop };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1.5, .1, 250);
  scene.add(camera);
  const hotel = {
    tryGrab: () => null, releaseGrip: noop, moveGrip: noop,
    collisions: {
      blocked: () => false,
      move: (_floor, x, z, dx, dz) => ({ x: x + dx, z: z + dz }),
    },
  };
  const events = {
    isModalOpen: () => false, isElevatorOpen: () => false,
    isCustomizerOpen: () => false, toggleCustomizer: noop,
    toast: noop, interact: noop,
  };
  return new Player(canvas, camera, scene, hotel, {}, events);
}
const down = (p, code) => p.keyDown({ code, repeat: false, preventDefault() {} });
const up = (p, code) => p.keyUp({ code });

test('Z+W+D positions only right foot and prevents WASD walking', () => {
  const p = makePlayer();
  try {
    const before = p.position.clone();
    down(p, 'KeyZ'); down(p, 'KeyW'); down(p, 'KeyD');
    p.update(.05);
    assert.ok(p.bodyIK.steps.right);
    assert.equal(p.bodyIK.steps.left, null);
    assert.ok(p.position.distanceTo(before) < .02);
    up(p, 'KeyD'); down(p, 'KeyA');
    p.update(.05);
    assert.ok(p.bodyIK.steps.left);
    up(p, 'KeyZ');
    assert.ok(p.bodyIK.steps.left);
    assert.ok(p.bodyIK.steps.right);
  } finally { p.dispose(); }
});

test('FPS shows actual avatar; wheel can cross FPS/TPS and extend far out', () => {
  const p = makePlayer();
  try {
    p.update(.016);
    assert.equal(p.avatar.root.visible, true);
    assert.equal(p.handRig.root.visible, false);
    assert.equal(p.camera.layers.mask, 1);
    assert.equal(p.thirdPerson, false);
    p.wheel({ deltaY: 100, preventDefault() {} });
    assert.ok(p.thirdPerson);
    assert.ok(p.cameraDistance > .74);
    p.update(.016);
    assert.ok(p.camera.layers.test(p.avatar.head.userData.headMesh.layers));
    for (let i = 0; i < 40; i++) p.wheel({ deltaY: 100, preventDefault() {} });
    assert.ok(p.cameraDistance > 15);
    for (let i = 0; i < 40; i++) p.wheel({ deltaY: -100, preventDefault() {} });
    assert.equal(p.thirdPerson, false);
    assert.equal(p.cameraDistance, 0);
    p.update(.016);
    assert.equal(p.camera.layers.mask, 1);
  } finally { p.dispose(); }
});

test('left and right mouse buttons control separate real arm bones', () => {
  const p = makePlayer();
  try {
    p.mouseDown({ button: 0, preventDefault() {} });
    assert.equal(p.hands.left.pressed, true);
    assert.equal(p.hands.right.pressed, false);
    p.update(.05);
    const left = p.avatar.leftArm.quaternion.clone();
    p.mouseDown({ button: 2, preventDefault() {} });
    p.update(.05);
    assert.equal(p.hands.left.pressed, true);
    assert.equal(p.hands.right.pressed, true);
    assert.ok(p.avatar.leftArm.quaternion.angleTo(left) < 1);
    p.mouseUp({ button: 0 });
    assert.equal(p.hands.left.pressed, false);
    assert.equal(p.hands.right.pressed, true);
  } finally { p.dispose(); }
});

test('precision side controls do not trigger interaction, jump, crouch or hand release',()=>{
  const p=makePlayer();
  try{
    down(p,'KeyZ');down(p,'KeyD');
    p.lookBy(260, -130);
    down(p,'KeyE');down(p,'ControlLeft');
    p.update(.05);
    assert.ok(p.bodyIK.steps.right.sideways>0);
    assert.ok(p.bodyIK.steps.right.height>.37);
    assert.ok(p.bodyIK.steps.right.bend>0);
    assert.equal(p.posture,'stand');
    assert.equal(p.postureControls.crouching,false);
    up(p,'ControlLeft');
    down(p,'Space');
    assert.ok(p.bodyIK.kicks.right);
    assert.equal(p.verticalSpeed,0);
    // Releasing Z while still holding D would start walking and correctly
    // cancel the kick; release movement keys to test stationary continuity.
    up(p,'KeyD'); up(p,'KeyE'); up(p,'KeyZ');
    assert.ok(p.bodyIK.steps.right);
    p.update(.05);
    assert.ok(p.bodyIK.kicks.right);
  } finally{p.dispose();}
});

test('mouse freely aims one foot without rotating the FPS torso while Z is held',()=>{
  const p=makePlayer();
  try {
    p.update(.016);
    down(p,'KeyZ');down(p,'KeyD');
    const lockedBodyYaw=p.bodyYaw;
    p.lookBy(250,-180);
    p.update(.05);
    assert.equal(p.bodyYaw,lockedBodyYaw);
    assert.ok(p.bodyIK.steps.right.sideways>.3);
    assert.ok(p.bodyIK.steps.right.height>.4);
    const first=p.bodyIK.steps.right.sideways;
    p.lookBy(-450,280);
    for(let i=0;i<6;i++)p.update(.05);
    assert.ok(p.bodyIK.steps.right.sideways < first-.2);
    assert.ok(p.bodyIK.steps.right.height<.4);
    up(p,'KeyD'); up(p,'KeyZ');
    p.update(.05);
    assert.equal(p.bodyYaw,lockedBodyYaw);
    assert.notEqual(p.bodyYaw,p.yaw);
  } finally{p.dispose();}
});

test('foot IK pose persists after Z, camera look and idle time; walking clears it', () => {
  const p = makePlayer();
  try {
    p.update(.05);
    down(p,'KeyZ'); down(p,'KeyD');
    p.lookBy(270,-130);
    for(let i=0;i<8;i++)p.update(.05);
    up(p,'KeyD'); up(p,'KeyZ');
    const original = {...p.bodyIK.steps.right};
    const beforeAngle = p.bodyYaw;
    p.lookBy(-450,140);
    for(let i=0;i<12;i++)p.update(.05);
    assert.equal(p.bodyYaw,beforeAngle);
    assert.deepEqual(p.bodyIK.steps.right,original);
    assert.ok(Math.abs(p.avatar.rightLeg.rotation.z) > .05);
    // A blocked movement is not walking and must not erase the manually placed foot.
    p.hotel.collisions.move = (_floor,x,z)=>({x,z});
    down(p,'KeyW'); p.update(.05);
    assert.ok(p.bodyIK.steps.right);
    up(p,'KeyW');
    p.hotel.collisions.move = (_floor,x,z,dx,dz)=>({x:x+dx,z:z+dz});
    down(p,'KeyW'); p.update(.05);
    assert.equal(p.bodyIK.steps.right,null);
  } finally {p.dispose();}
});

test('furniture prevents idle body rotation in FPS and forced orbit', () => {
  const p=makePlayer();
  try {
    p.update(.05);
    p.useFurniture('sit', 2, 3, .6, .4, {style:'desk'});
    p.update(.05);
    const facing=p.bodyYaw;
    p.lookBy(320,90);
    for(let i=0;i<8;i++)p.update(.05);
    assert.equal(p.bodyYaw,facing);
    assert.equal(p.avatar.root.rotation.y,facing);
    assert.ok(p.camera.position.distanceTo(p.position)>.8);
    p.standUp();p.update(.05);
    const facingAfter=p.bodyYaw;
    p.lookBy(100,0);p.update(.05);
    assert.equal(p.bodyYaw,facingAfter);
  } finally {p.dispose();}
});

test('O switches camera without snapping facing, wheel zoom survives grip modifier', () => {
  const p=makePlayer();
  try {
    p.update(.05);
    p.lookBy(340,0);
    const facing=p.bodyYaw;
    p.toggleCamera(); p.update(.05);
    assert.equal(p.bodyYaw,facing);
    assert.ok(p.cameraDistance>=3);
    p.toggleCamera(); p.update(.05);
    assert.equal(p.bodyYaw,facing);
    assert.equal(p.cameraDistance,0);
    p.hands.left.grip={kind:'held'};
    p.hands.left.distance=1.55;
    p.wheel({deltaY:100,shiftKey:true,preventDefault(){}});
    assert.ok(p.hands.left.distance>1.55);
    assert.equal(p.thirdPerson,false);
    p.wheel({deltaY:100,preventDefault(){}});
    assert.equal(p.thirdPerson,true);
  } finally {p.dispose();}
});

test('third-person pitch orbits upward and downward without changing the root facing',()=>{
  const p=makePlayer();
  try{
    p.toggleCamera();p.update(.016);
    const base=p.camera.position.y,facing=p.avatar.root.rotation.y;
    p.lookBy(0,-380);
    p.update(.016);
    const high=p.camera.position.y;
    p.lookBy(0,760);
    p.update(.016);
    const low=p.camera.position.y;
    assert.ok(high>base+.35,`high=${high} base=${base}`);
    assert.ok(low<base-.35,`low=${low} base=${base}`);
    assert.equal(p.avatar.root.rotation.y,facing);
  }finally{p.dispose();}
});
