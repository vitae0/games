import test from 'node:test';
import assert from 'node:assert/strict';
import {isCloseShortcut,installBrowserShortcutGuard} from '../src/input/BrowserShortcutGuard.js';

const shortcut = (code='KeyW',ctrlKey=true) => {
  const event=new Event('keydown',{cancelable:true});
  Object.assign(event,{code,ctrlKey,metaKey:false,altKey:false});
  return event;
};

test('close shortcut protection is scoped to actual game play and the W key',()=>{
  assert.equal(isCloseShortcut(shortcut(),true),true);
  assert.equal(isCloseShortcut(shortcut(),false),false);
  assert.equal(isCloseShortcut(shortcut('KeyS'),true),false);
  assert.equal(isCloseShortcut({code:'KeyW',metaKey:true,altKey:false},true),true);
});

test('game Ctrl+W calls preventDefault when dispatchable without blocking movement',()=>{
  const win=new EventTarget(),doc=new EventTarget();
  let playing=true,entered=false;
  const guard=installBrowserShortcutGuard({
    win,doc,nav:{},isPlaying:()=>playing,hasEntered:()=>entered,
  });
  try{
    const ctrlW=shortcut();
    let bubbled=false;
    win.addEventListener('keydown',()=>{bubbled=true},{once:true});
    win.dispatchEvent(ctrlW);
    assert.equal(ctrlW.defaultPrevented,true);
    assert.equal(bubbled,true,'game movement receives the key normally');
    playing=false;
    const outside=shortcut();
    win.dispatchEvent(outside);
    assert.equal(outside.defaultPrevented,false);
    const early=new Event('beforeunload',{cancelable:true});
    win.dispatchEvent(early);
    assert.equal(early.defaultPrevented,false);
    entered=true;
    const active=new Event('beforeunload',{cancelable:true});
    win.dispatchEvent(active);
    assert.equal(active.defaultPrevented,true,'ask browser before losing the game tab');
  }finally{guard.dispose()}
});

test('explicit fullscreen tries keyboard lock and unlocks on exit',async()=>{
  const win=new EventTarget(),doc=new EventTarget(),button=new EventTarget();
  const calls=[];
  button.setAttribute=(key,value)=>calls.push([key,value]);
  const nav={keyboard:{
    async lock(keys){calls.push(['lock',...keys]);},
    unlock(){calls.push(['unlock']);},
  }};
  doc.fullscreenElement=null;
  doc.documentElement={
    async requestFullscreen(options){
      calls.push(['fullscreen',options.keyboardLock]);
      doc.fullscreenElement=doc.documentElement;
      doc.dispatchEvent(new Event('fullscreenchange'));
    },
  };
  doc.exitFullscreen=async()=>{
    doc.fullscreenElement=null;
    doc.dispatchEvent(new Event('fullscreenchange'));
  };
  const guard=installBrowserShortcutGuard({
    win,doc,nav,button,isPlaying:()=>true,hasEntered:()=>true,
  });
  try{
    assert.equal(await guard.toggleFullscreen(),true);
    assert.equal(doc.fullscreenElement,doc.documentElement);
    assert.equal(button.textContent,'PENCERE MODU');
    assert.ok(calls.some(call=>call[0]==='fullscreen'&&call[1]==='browser'));
    assert.ok(calls.some(call=>call[0]==='lock'&&call[1]==='KeyW'));
    assert.equal(await guard.toggleFullscreen(),false);
    assert.equal(doc.fullscreenElement,null);
    assert.equal(button.textContent,'TAM EKRAN');
    assert.ok(calls.some(call=>call[0]==='unlock'));
  }finally{guard.dispose()}
});
