import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Player } from '../src/player/Player.js';

function createPlayer() {
  const noop = () => {};
  const canvas = { addEventListener:noop, removeEventListener:noop };
  globalThis.document = { pointerLockElement: canvas, addEventListener:noop, removeEventListener:noop };
  globalThis.window = { addEventListener:noop, removeEventListener:noop };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1.5, .1, 250);
  scene.add(camera);
  const hotel = {
    releaseGrip:noop, moveGrip:noop,
    collisions: {
      blocked:() => false,
      move:(_floor, x,z,dx,dz) => ({x:x+dx, z:z+dz}),
    },
  };
  const events = {
    isModalOpen: () => false, isElevatorOpen: () => false,
    isCustomizerOpen: () => false, toggleCustomizer:noop,
    toast:noop, interact:noop,
  };
  return new Player(canvas, camera, scene, hotel, {}, events);
}
const key = (p, code) => p.keyDown({ code, repeat:false, preventDefault(){} });
const up = (p, code) => p.keyUp({ code });

test('real Player: Ctrl crouches with leg bones and returns to standing', () => {
  const p = createPlayer();
  try {
    key(p, 'ControlLeft');
    p.update(.08);
    assert.ok(p.avatar.leftLeg.rotation.x > 0.05);
    assert.ok(p.eyePosition().y < p.avatar.profile.height * .75);
    up(p, 'ControlLeft');
    for(let i=0;i<12;i++) p.update(.05);
    assert.ok(Math.abs(p.avatar.leftLeg.rotation.x) < 0.08);
  } finally { p.dispose(); }
});

test('real Player: double Ctrl makes floor sitting visible in FPS and second double stands', () => {
  const p = createPlayer();
  try {
    key(p,'ControlLeft'); up(p,'ControlLeft');
    key(p,'ControlLeft');
    assert.equal(p.posture, 'floorSit');
    p.update(.08);
    assert.equal(p.avatar.root.visible, true);
    assert.ok(p.avatar.leftLeg.userData.knee.rotation.x < -.1);
    up(p,'ControlLeft');
    key(p,'ControlLeft'); up(p,'ControlLeft');
    key(p,'ControlLeft');
    assert.equal(p.posture, 'stand');
  } finally { p.dispose(); }
});

test('real Player: Ctrl+Space kneels without pending jump', () => {
  const p = createPlayer();
  try {
    key(p, 'ControlLeft');key(p, 'Space');
    assert.equal(p.posture, 'kneel');
    p.update(.08);
    assert.equal(p.avatar.root.visible, true);
    assert.ok(p.avatar.rightLeg.rotation.x > p.avatar.leftLeg.rotation.x);
    assert.equal(p.verticalSpeed,0);
    up(p,'ControlLeft');up(p,'Space');
    key(p,'KeyN');
    assert.equal(p.posture,'stand');
  } finally { p.dispose(); }
});
