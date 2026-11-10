import { joystickVector, touchLookFactor } from './TouchMath.js';

/** Standalone pointer-event adapter. All game logic remains inside Player. */
export class TouchControls {
  constructor(canvas, player, hud) {
    this.canvas = canvas;
    this.player = player;
    this.hud = hud;
    this.joystick = document.querySelector('#touch-joystick');
    this.thumb = document.querySelector('#touch-stick-thumb');
    this.joyPointer = null;
    this.lookPointer = null;
    this.lastLook = null;
    this.handPointers = new Map();
    this.listeners = [];
    this.listen(this.joystick, 'pointerdown', e => this.startJoystick(e));
    this.listen(this.joystick, 'pointermove', e => this.moveJoystick(e));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.listen(this.joystick, type, e => this.endJoystick(e));
    }
    this.listen(canvas, 'pointerdown', e => this.startLook(e));
    this.listen(canvas, 'pointermove', e => this.moveLook(e));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      this.listen(canvas, type, e => this.endLook(e));
    }
    this.listen(canvas, 'contextmenu', e => { if (this.player.touchEnabled) e.preventDefault(); });
    this.listen(document, 'visibilitychange', () => {
      if (document.visibilityState !== 'visible') this.reset();
    });
    this.listen(window, 'blur', () => this.reset());
    for (const button of document.querySelectorAll('[data-touch-action]')) {
      this.listen(button, 'click', () => this.action(button.dataset.touchAction));
    }
    for (const button of document.querySelectorAll('[data-touch-hold]')) {
      const side = button.dataset.touchHold;
      this.listen(button, 'pointerdown', event => {
        if (!this.canUse() || this.handPointers.has(side)) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        event.preventDefault(); event.stopPropagation();
        button.setPointerCapture?.(event.pointerId);
        this.handPointers.set(side, event.pointerId);
        button.classList.add('pressed');
        this.player.grabHand(side);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        this.listen(button, type, event => {
          if (this.handPointers.get(side) !== event.pointerId) return;
          this.handPointers.delete(side);
          button.classList.remove('pressed');
          this.player.releaseHand(side);
        });
      }
    }
  }
  listen(node, type, fn) { node.addEventListener(type, fn); this.listeners.push([node, type, fn]); }
  canUse() { return this.player.touchEnabled && !this.hud.isModalOpen(); }
  startJoystick(e) {
    if (!this.canUse() || this.joyPointer !== null) return;
    e.preventDefault(); e.stopPropagation();
    this.joyPointer = e.pointerId;
    this.joystick.setPointerCapture?.(e.pointerId);
    this.moveJoystick(e);
  }
  moveJoystick(e) {
    if (e.pointerId !== this.joyPointer) return;
    e.preventDefault();
    const bounds = this.joystick.getBoundingClientRect();
    const radius = Math.min(bounds.width, bounds.height) * 0.36;
    const dx = e.clientX - (bounds.left + bounds.width * .5);
    const dy = e.clientY - (bounds.top + bounds.height * .5);
    const v = joystickVector(dx, dy, radius);
    this.player.setTouchMovement(-v.y, v.x);
    const factor = Math.min(1, radius / Math.max(1, Math.hypot(dx, dy)));
    this.thumb.style.transform = `translate(calc(-50% + ${Math.round(dx * factor)}px), calc(-50% + ${Math.round(dy * factor)}px))`;
  }
  endJoystick(e) {
    if (e.pointerId !== this.joyPointer) return;
    this.joyPointer = null;
    this.player.setTouchMovement(0, 0);
    this.thumb.style.transform = 'translate(-50%, -50%)';
  }
  startLook(e) {
    if (!this.canUse() || e.pointerType === 'mouse' || this.lookPointer !== null) return;
    // The left part of the screen remains free for the movement thumb.
    if (e.clientX < window.innerWidth * .37) return;
    e.preventDefault();
    this.lookPointer = e.pointerId;
    this.lastLook = { x: e.clientX, y: e.clientY };
    this.canvas.setPointerCapture?.(e.pointerId);
  }
  moveLook(e) {
    if (e.pointerId !== this.lookPointer || !this.lastLook) return;
    e.preventDefault();
    const dx = e.clientX - this.lastLook.x;
    const dy = e.clientY - this.lastLook.y;
    this.lastLook = { x: e.clientX, y: e.clientY };
    this.player.lookDelta(dx, dy, touchLookFactor(this.hud.touchSensitivity));
  }
  endLook(e) {
    if (e.pointerId === this.lookPointer) { this.lookPointer = null; this.lastLook = null; }
  }
  action(name) {
    if (!this.canUse()) return;
    if (name === 'jump') this.player.touchJump();
    else if (name === 'crouch') this.player.toggleTouchCrouch();
    else if (name === 'sit') this.player.setFloorPosture('floorSit');
    else if (name === 'kneel') this.player.setFloorPosture('kneel');
    else if (name === 'sprint') this.player.toggleTouchSprint();
    else if (name === 'interact') this.player.events.interact();
    else if (name === 'camera') this.player.toggleCamera();
    else if (name === 'avatar') this.hud.toggleCustomizer();
    else if (name === 'release') { this.player.releaseHands(); this.releaseHoldUI(); }
    else if (name === 'push') this.player.shiftGrip(+1);
    else if (name === 'pull') this.player.shiftGrip(-1);
    this.updateButtons();
  }
  releaseHoldUI() {
    this.handPointers.clear();
    for (const button of document.querySelectorAll('[data-touch-hold]')) button.classList.remove('pressed');
  }
  updateButtons() {
    const crouch = document.querySelector('[data-touch-action="crouch"]');
    const sprint = document.querySelector('[data-touch-action="sprint"]');
    crouch?.classList.toggle('selected', this.player.touch.crouch);
    sprint?.classList.toggle('selected', this.player.touch.sprint);
  }
  reset() {
    this.joyPointer = null;
    this.lookPointer = null;
    this.lastLook = null;
    this.player.setTouchMovement(0, 0);
    this.player.releaseHands();
    this.releaseHoldUI();
    if (this.thumb) this.thumb.style.transform = 'translate(-50%, -50%)';
  }
  dispose() { this.reset(); for (const [node, type, fn] of this.listeners) node.removeEventListener(type, fn); }
}
