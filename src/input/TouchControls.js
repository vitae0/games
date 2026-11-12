import { normalizeStick, clampTouchSensitivity } from './TouchMath.js';

/** Multi-pointer, no-pointer-lock controls. Input logic stays in Player, not in CSS or HTML. */
export class TouchControls {
  constructor(root, player, { toast = () => {}, onCustomizer = () => {} } = {}) {
    this.root = root;
    this.player = player;
    this.toast = toast;
    this.onCustomizer = onCustomizer;
    this.enabled = false;
    this.sensitivity = 1;
    this.stick = root.querySelector('#touch-joystick');
    this.knob = root.querySelector('#touch-knob');
    this.look = root.querySelector('#touch-look');
    this.extra = root.querySelector('#touch-extra');
    this.more = root.querySelector('[data-touch-action="more"]');
    this.stickId = null;
    this.lookId = null;
    this.lookX = 0;
    this.lookY = 0;
    this.pressed = new Map();
    this.handlers = [];
    this.bind();
  }
  on(node, event, fn, options) {
    node.addEventListener(event, fn, options);
    this.handlers.push([node, event, fn, options]);
  }
  canPlay() { return this.enabled && !this.player.events.isModalOpen(); }
  setEnabled(enabled) {
    this.enabled = !!enabled;
    this.root.classList.toggle('hidden', !this.enabled);
    this.root.setAttribute('aria-hidden', String(!this.enabled));
    this.player.touchActive = this.enabled;
    if (!this.enabled) this.suspend();
  }
  setSensitivity(value) { this.sensitivity = clampTouchSensitivity(value); }
  updateStick(event) {
    const rect = this.stick.getBoundingClientRect();
    const radius = Math.min(rect.width, rect.height) * .39;
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    const v = normalizeStick(x, y, radius);
    this.player.setTouchMove(v.x, -v.y);
    // The knob follows the finger even inside the input dead zone.
    const length = Math.hypot(x, y);
    const scale = length > radius ? radius / length : 1;
    this.knob.style.transform = `translate(calc(-50% + ${x * scale}px), calc(-50% + ${y * scale}px))`;
  }
  resetStick() {
    this.stickId = null;
    this.player.setTouchMove(0, 0);
    this.knob.style.transform = 'translate(-50%, -50%)';
  }
  bind() {
    this.on(this.stick, 'pointerdown', event => {
      if (!this.canPlay() || this.stickId !== null) return;
      event.preventDefault();
      this.stickId = event.pointerId;
      this.stick.setPointerCapture?.(event.pointerId);
      this.updateStick(event);
    });
    this.on(this.stick, 'pointermove', event => {
      if (event.pointerId !== this.stickId) return;
      event.preventDefault(); this.updateStick(event);
    });
    const stopStick = event => { if (event.pointerId === this.stickId) this.resetStick(); };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(this.stick, event, stopStick);

    this.on(this.look, 'pointerdown', event => {
      if (!this.canPlay() || this.lookId !== null) return;
      event.preventDefault();
      this.lookId = event.pointerId;
      this.lookX = event.clientX;
      this.lookY = event.clientY;
      this.look.setPointerCapture?.(event.pointerId);
    });
    this.on(this.look, 'pointermove', event => {
      if (event.pointerId !== this.lookId || !this.canPlay()) return;
      event.preventDefault();
      const dx = event.clientX - this.lookX;
      const dy = event.clientY - this.lookY;
      this.lookX = event.clientX;
      this.lookY = event.clientY;
      this.player.lookBy(dx, dy, this.sensitivity);
    });
    const stopLook = event => { if (event.pointerId === this.lookId) this.lookId = null; };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(this.look, event, stopLook);

    for (const button of this.root.querySelectorAll('[data-touch-action]')) {
      const action = button.dataset.touchAction;
      if (['run', 'crouch', 'left-hand', 'right-hand', 'push', 'pull'].includes(action)) {
        this.on(button, 'pointerdown', event => {
          if (!this.canPlay() || this.pressed.has(button)) return;
          event.preventDefault();
          button.setPointerCapture?.(event.pointerId);
          this.pressed.set(button, event.pointerId);
          button.classList.add('is-held');
          this.hold(action, true);
        });
        const stop = event => {
          if (this.pressed.get(button) !== event.pointerId) return;
          this.pressed.delete(button);
          button.classList.remove('is-held');
          this.hold(action, false);
        };
        for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(button, event, stop);
      } else {
        this.on(button, 'click', event => {
          if (!this.canPlay()) return;
          event.preventDefault();
          this.action(action);
        });
      }
    }
    this.on(window, 'blur', () => this.suspend());
    this.on(document, 'visibilitychange', () => { if (document.hidden) this.suspend(); });
    this.on(window, 'orientationchange', () => this.suspend());
  }
  hold(action, down) {
    switch (action) {
      case 'run': this.player.touchRun = down; break;
      case 'crouch': this.player.touchCrouch = down; break;
      case 'left-hand': if (down) this.player.pressHand('left'); else this.player.releaseHand('left'); break;
      case 'right-hand': if (down) this.player.pressHand('right'); else this.player.releaseHand('right'); break;
      case 'push': if (down) this.player.adjustGripDistance(.12); this.player.touchGripAdjustment = down ? 1 : 0; break;
      case 'pull': if (down) this.player.adjustGripDistance(-.12); this.player.touchGripAdjustment = down ? -1 : 0; break;
      default: break;
    }
  }
  action(action) {
    switch (action) {
      case 'jump': this.player.jump(); break;
      case 'sit': this.player.setFloorPosture('floorSit'); break;
      case 'kneel': this.player.setFloorPosture('kneel'); break;
      case 'lie': this.player.setFloorPosture('floorLie'); break;
      case 'rise': this.player.standUp(); break;
      case 'camera': this.player.toggleCamera(); break;
      case 'release': this.player.releaseHands(); break;
      case 'avatar': this.suspend(); this.onCustomizer(); break;
      case 'more': {
        const open = this.extra.classList.toggle('hidden');
        this.more.setAttribute('aria-expanded', String(!open));
        break;
      }
      default: break;
    }
  }
  suspend() {
    this.resetStick(); this.lookId = null;
    for (const [button] of [...this.pressed]) {
      this.hold(button.dataset.touchAction, false);
      button.classList.remove('is-held');
    }
    this.pressed.clear();
    this.player.touchRun = false;
    this.player.touchCrouch = false;
    this.player.touchGripAdjustment = 0;
    this.player.releaseHands();
  }
  dispose() {
    this.suspend();
    for (const [node, event, callback, options] of this.handlers) node.removeEventListener(event, callback, options);
    this.handlers.length = 0;
  }
}
