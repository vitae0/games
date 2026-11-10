import test from 'node:test';
import assert from 'node:assert/strict';
import { TouchControls } from '../src/mobile/TouchControls.js';

class FakeNode {
  constructor(dataset={}){this.dataset=dataset;this.handlers=new Map();this.style={};this.pressed=false;this.classList={add:()=>{this.pressed=true},remove:()=>{this.pressed=false},toggle:(key,on)=>{this.pressed=on}};}
  addEventListener(type,fn){const a=this.handlers.get(type)||[];a.push(fn);this.handlers.set(type,a);}
  removeEventListener(type,fn){this.handlers.set(type,(this.handlers.get(type)||[]).filter(x=>x!==fn));}
  setPointerCapture(){}
  getBoundingClientRect(){return {left:0,top:0,width:140,height:140}}
  emit(type,props={}){const event={pointerId:1,pointerType:'touch',clientX:70,clientY:70,button:0,preventDefault(){},stopPropagation(){},...props};for(const cb of this.handlers.get(type)||[])cb(event);return event;}
}
function harness(){
 const joystick=new FakeNode(),thumb=new FakeNode(),canvas=new FakeNode(),left=new FakeNode({touchHold:'left'}),right=new FakeNode({touchHold:'right'});
 const actions=new Map(['jump','crouch','sit','kneel','sprint','interact','camera','avatar','release','push','pull'].map(a=>[a,new FakeNode({touchAction:a})]));
 globalThis.window=new FakeNode();window.innerWidth=500;
 globalThis.document=new FakeNode();document.visibilityState='visible';
 document.querySelector=selector=>selector==='#touch-joystick'?joystick:selector==='#touch-stick-thumb'?thumb:selector==='[data-touch-action="crouch"]'?actions.get('crouch'):selector==='[data-touch-action="sprint"]'?actions.get('sprint'):null;
 document.querySelectorAll=selector=>selector==='[data-touch-action]'?[...actions.values()]:selector==='[data-touch-hold]'?[left,right]:[];
 const calls=[];
 const player={touchEnabled:true,touch:{crouch:false,sprint:false},hands:{left:{},right:{}},setTouchMovement:(f,s)=>calls.push(['walk',f,s]),lookDelta:(dx,dy,k)=>calls.push(['look',dx,dy,k]),grabHand:side=>calls.push(['grab',side]),releaseHand:side=>calls.push(['release',side]),releaseHands:()=>calls.push(['releaseAll']),touchJump:()=>calls.push(['jump']),setFloorPosture:x=>calls.push(['posture',x]),toggleTouchCrouch:()=>{player.touch.crouch=!player.touch.crouch},toggleTouchSprint:()=>{player.touch.sprint=!player.touch.sprint},toggleCamera:()=>calls.push(['camera']),shiftGrip:x=>calls.push(['grip',x]),events:{interact:()=>calls.push(['interact'])}};
 const hud={isModalOpen:()=>false,touchSensitivity:1,toggleCustomizer:()=>calls.push(['customizer'])};
 const controller=new TouchControls(canvas,player,hud);
 return {controller,calls,joystick,thumb,canvas,left,right,actions,player,hud};
}
test('simultaneous multi-touch: joystick, right-side camera, two held hands',()=>{
 const h=harness();
 try {
  h.joystick.emit('pointerdown',{pointerId:11,clientX:70,clientY:30});
  h.canvas.emit('pointerdown',{pointerId:12,clientX:350,clientY:170});
  h.canvas.emit('pointermove',{pointerId:12,clientX:370,clientY:183});
  h.left.emit('pointerdown',{pointerId:13});
  h.right.emit('pointerdown',{pointerId:14});
  assert.ok(h.calls.some(c=>c[0]==='walk'&&c[1]>0));
  assert.ok(h.calls.some(c=>c[0]==='look'&&c[1]===20&&c[2]===13));
  assert.equal(h.calls.filter(c=>c[0]==='grab').length,2);
  h.left.emit('pointerup',{pointerId:13});
  assert.equal(h.calls.filter(c=>c[0]==='release').length,1);
  h.joystick.emit('pointercancel',{pointerId:11});
  assert.deepEqual(h.calls.at(-1),['walk',0,0]);
  h.controller.reset();
  assert.equal(h.right.pressed,false);
 } finally {h.controller.dispose();}
});
test('mobile actions are independent of keyboard and modal state',()=>{
 const h=harness();
 try {
  h.actions.get('sit').emit('click');
  h.actions.get('kneel').emit('click');
  h.actions.get('push').emit('click');
  h.actions.get('pull').emit('click');
  h.actions.get('jump').emit('click');
  assert.deepEqual(h.calls.filter(x=>x[0]==='posture').map(x=>x[1]),['floorSit','kneel']);
  assert.deepEqual(h.calls.filter(x=>x[0]==='grip').map(x=>x[1]),[1,-1]);
  assert.ok(h.calls.some(x=>x[0]==='jump'));
  const oldLength=h.calls.length;
  h.hud.isModalOpen=()=>true;
  h.actions.get('camera').emit('click');
  h.joystick.emit('pointerdown',{pointerId:7});
  assert.equal(h.calls.length,oldLength);
 } finally {h.controller.dispose();}
});
