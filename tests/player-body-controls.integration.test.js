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
    assert.equal(p.bodyIK.steps.left, null);
    assert.equal(p.bodyIK.steps.right, null);
  } finally { p.dispose(); }
});

test('FPS uses the real avatar; TPS wheel changes zoom only in TPS', () => {
  const p = makePlayer();
  try {
    p.update(.016);
    assert.equal(p.avatar.root.visible, true);
    assert.equal(p.handRig.root.visible, false);
    assert.equal(p.camera.layers.mask, 1);
    const originalDistance = p.cameraDistance;
    p.wheel({ deltaY: 100, preventDefault() {} });
    assert.equal(p.cameraDistance, originalDistance);
    p.toggleCamera();
    p.update(.016);
    assert.ok(p.camera.layers.test(p.avatar.head.userData.headMesh.layers));
    p.wheel({ deltaY: -100, preventDefault() {} });
    assert.ok(p.cameraDistance < originalDistance);
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
    up(p,'KeyZ');
    assert.equal(p.bodyIK.steps.right,null);
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
    up(p,'KeyZ');
    p.update(.05);
    assert.equal(p.bodyYaw,p.yaw);
  } finally{p.dispose();}
});
