import test from 'node:test';
import assert from 'node:assert/strict';
import { TouchControls } from '../src/input/TouchControls.js';

class FakeElement {
  constructor(action='') {
    this.dataset = { touchAction:action };
    this.listeners = new Map();
    this.attributes = new Map();
    this.classNames = new Set(['hidden']);
    this.classList = {
      add: name => this.classNames.add(name),
      remove: name => this.classNames.delete(name),
      toggle: (name, desired) => {
        const next = desired === undefined ? !this.classNames.has(name) : desired;
        if (next) this.classNames.add(name); else this.classNames.delete(name);
        return next;
      },
      contains: name => this.classNames.has(name),
    };
    this.style = {};
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatch(type, values={}) {
    const event={ pointerId: 0, clientX:0, clientY:0, preventDefault() {}, ...values };
    for (const fn of this.listeners.get(type) ?? []) fn(event);
  }
  setAttribute(name, value) { this.attributes.set(name,value); }
  setPointerCapture() {}
  getBoundingClientRect() { return {left:0,top:0,width:140,height:140}; }
}
function buildControls() {
  const root = new FakeElement();
  const stick = new FakeElement();
  const knob = new FakeElement();
  const look = new FakeElement();
  const extra = new FakeElement();
  const buttons = Object.fromEntries(['run','crouch','left-hand','right-hand','push','pull','jump','sit','kneel','camera','release','avatar','more'].map(action => [action, new FakeElement(action)]));
  root.querySelector = selector => ({'#touch-joystick':stick,'#touch-knob':knob,'#touch-look':look,'#touch-extra':extra,'[data-touch-action="more"]':buttons.more})[selector];
  root.querySelectorAll = selector => selector==='[data-touch-action]' ? Object.values(buttons) : [];
  const calls=[];
  let modal=false;
  const player={
    touchRun:false, touchCrouch:false, touchGripAdjustment:0, touchActive:false,
    events:{isModalOpen:()=>modal},
    setTouchMove:(x,forward)=>calls.push(['move',x,forward]),
    lookBy:(dx,dy,s)=>calls.push(['look',dx,dy,s]),
    pressHand:side=>calls.push(['hand',side]),releaseHand:side=>calls.push(['release',side]),releaseHands:()=>calls.push('releaseHands'),
    adjustGripDistance:d=>calls.push(['distance',d]),jump:()=>calls.push('jump'),setFloorPosture:p=>calls.push(p),toggleCamera:()=>calls.push('camera'),
  };
  const oldWindow=globalThis.window, oldDocument=globalThis.document;
  globalThis.window=new FakeElement();globalThis.document=new FakeElement();
  const controls=new TouchControls(root,player,{onCustomizer:()=>calls.push('customizer')});
  function cleanup(){ controls.dispose(); globalThis.window=oldWindow; globalThis.document=oldDocument; }
  return {root,stick,look,buttons,controls,player,calls,setModal:value=>{modal=value;},cleanup};
}

test('touch joystick and right-side camera support simultaneous independent pointers', () => {
  const w=buildControls();
  try {
    w.controls.setEnabled(true);
    assert.equal(w.player.touchActive, true);
    w.stick.dispatch('pointerdown',{pointerId:1,clientX:70,clientY:0});
    w.look.dispatch('pointerdown',{pointerId:2,clientX:200,clientY:120});
    w.stick.dispatch('pointermove',{pointerId:1,clientX:140,clientY:70});
    w.look.dispatch('pointermove',{pointerId:2,clientX:234,clientY:105});
    assert.ok(w.calls.some(x=>Array.isArray(x)&&x[0]==='move'&&x[1]>.95));
    assert.deepEqual(w.calls.find(x=>Array.isArray(x)&&x[0]==='look'),['look',34,-15,1]);
    w.stick.dispatch('pointerup',{pointerId:1});
    assert.deepEqual(w.calls.at(-1), ['move',0,0]);
    w.look.dispatch('pointercancel',{pointerId:2});
    assert.equal(w.controls.lookId,null);
  } finally {w.cleanup();}
});

test('buttons work without keyboard/pointer-lock and can be used concurrently', () => {
  const w=buildControls();
  try {
    w.controls.setEnabled(true);
    w.buttons.run.dispatch('pointerdown',{pointerId:12});
    w.buttons['left-hand'].dispatch('pointerdown',{pointerId:13});
    w.buttons.crouch.dispatch('pointerdown',{pointerId:14});
    assert.equal(w.player.touchRun,true);
    assert.equal(w.player.touchCrouch,true);
    assert.ok(w.calls.some(x=>Array.isArray(x)&&x[0]==='hand'&&x[1]==='left'));
    w.buttons.run.dispatch('pointerup',{pointerId:12});
    w.buttons.crouch.dispatch('pointercancel',{pointerId:14});
    w.buttons['left-hand'].dispatch('pointerup',{pointerId:13});
    assert.equal(w.player.touchRun,false);
    assert.equal(w.player.touchCrouch,false);
    w.buttons.jump.dispatch('click');
    w.buttons.sit.dispatch('click');
    w.buttons.kneel.dispatch('click');
    w.buttons.camera.dispatch('click');
    assert.deepEqual(w.calls.filter(x=>typeof x==='string'&&['jump','floorSit','kneel','camera'].includes(x)),['jump','floorSit','kneel','camera']);
  } finally {w.cleanup();}
});

test('leaving a game or opening a modal safely clears all held touch inputs', () => {
  const w=buildControls();
  try {
    w.controls.setEnabled(true);
    w.buttons.push.dispatch('pointerdown',{pointerId:3});
    w.buttons.run.dispatch('pointerdown',{pointerId:4});
    assert.equal(w.player.touchGripAdjustment,1);
    w.setModal(true);
    w.controls.suspend();
    assert.equal(w.player.touchGripAdjustment,0);
    assert.equal(w.player.touchRun,false);
    assert.equal(w.controls.pressed.size,0);
    assert.ok(w.calls.includes('releaseHands'));
    w.buttons.jump.dispatch('click');
    assert.ok(!w.calls.includes('jump'));
    w.controls.setEnabled(false);
    assert.equal(w.player.touchActive,false);
  } finally {w.cleanup();}
});
