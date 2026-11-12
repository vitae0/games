import { DOUBLE_CONTROL_INTERVAL_MS } from './Postures.js';

/** Deterministic input state machine. No DOM or Three.js dependencies. */
export const JUMP_COMBO_GRACE_MS = 95;

export class PostureControls {
  constructor() { this.reset(); }
  reset() {
    this.held = new Set();
    this.lastCtrl = null;
    this.ctrlCount = 0;
    this.jumpArmed = null;
  }
  get crouching() { return this.held.has('ControlLeft') || this.held.has('ControlRight'); }
  press(code, now) {
    if (this.held.has(code)) return null; // key-repeat and two Ctrl keys cannot simulate a double tap
    this.held.add(code);
    if (code === 'ControlLeft' || code === 'ControlRight') {
      if (this.held.has('Space') || this.jumpArmed !== null) {
        this.lastCtrl = null;
        this.ctrlCount = 0;
        this.jumpArmed = null;
        return 'kneel';
      }
      const withinSequence = Number.isFinite(this.lastCtrl) &&
        now >= this.lastCtrl && now - this.lastCtrl <= DOUBLE_CONTROL_INTERVAL_MS;
      this.ctrlCount = withinSequence ? this.ctrlCount + 1 : 1;
      this.lastCtrl = now;
      if (this.ctrlCount >= 3) {
        // Double Ctrl already seated the player; the next tap reclines.
        this.lastCtrl = null;
        this.ctrlCount = 0;
        return 'floorLie';
      }
      return this.ctrlCount === 2 ? 'floorSit' : null;
    }
    if (code === 'Space') {
      if (this.crouching) {
        this.lastCtrl = null;
        this.ctrlCount = 0;
        this.jumpArmed = null;
        return 'kneel';
      }
      this.jumpArmed = now;
    }
    return null;
  }
  release(code) { this.held.delete(code); }
  consumeJump(now) {
    if (this.jumpArmed === null || now - this.jumpArmed < JUMP_COMBO_GRACE_MS) return false;
    this.jumpArmed = null;
    return true;
  }
  cancelJump() { this.jumpArmed = null; }
}
