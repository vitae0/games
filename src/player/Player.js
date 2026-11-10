import * as THREE from 'three';
import { PLAYER, HOTEL } from '../config.js';
import { Avatar } from '../avatar/Avatar.js';
import { HandRig } from './HandRig.js';
import { forwardFromYaw, rightFromYaw, viewFromYawPitch, movementFromYaw } from './Orientation.js';
import { isFloorPosture, nextFloorPosture } from './Postures.js';
import { PostureControls } from './PostureControls.js';
import { resolveGround, groundFloor, stairHeight, inStairLane } from '../world/Stairwell.js';

const clamp = THREE.MathUtils.clamp;

export class Player {
  constructor(canvas, camera, scene, hotel, profile, events) {
    this.canvas = canvas; this.camera = camera; this.hotel = hotel; this.events = events;
    this.position = new THREE.Vector3(0, 0, -11.4); // All doors to outside are sealed.
    this.floor = 0; this.yaw = Math.PI; this.pitch = -.04;
    this.keys = new Set(); this.verticalSpeed = 0; this.jumpOffset = 0;
    this.posture = 'stand'; this.thirdPerson = false; this.walkSpeed = 0;
    this.avatar = new Avatar(scene, profile);
    this.handRig = new HandRig(camera, profile);
    this.hands = {
      left: { pressed: false, grip: null, distance: 1.55 },
      right: { pressed: false, grip: null, distance: 1.55 },
    };
    this.savedStanding = null;
    this.postureControls = new PostureControls();
    this.touchEnabled = false;
    this.touch = { forward: 0, strafe: 0, crouch: false, sprint: false };
    this.bindEvents();
  }
  get active() { return (this.touchEnabled || document.pointerLockElement === this.canvas) && !this.events.isModalOpen(); }
  get direction() { const v = forwardFromYaw(this.yaw); return new THREE.Vector3(v.x, 0, v.z); }
  get viewDirection() { const v = viewFromYawPitch(this.yaw, this.pitch); return new THREE.Vector3(v.x, v.y, v.z); }
  releaseHand(side) {
    const hand = this.hands[side];
    hand.pressed = false; hand.grip = null;
    this.hotel.releaseGrip(side);
  }
  releaseHands() { this.releaseHand('left'); this.releaseHand('right'); }
  setTouchEnabled(enabled) {
    this.touchEnabled = !!enabled;
    if (!enabled) this.setTouchMovement(0, 0);
  }
  setTouchMovement(forward, strafe) {
    this.touch.forward = clamp(Number(forward) || 0, -1, 1);
    this.touch.strafe = clamp(Number(strafe) || 0, -1, 1);
  }
  lookDelta(dx, dy, factor = 0.0021) {
    if (!this.active) return;
    this.yaw -= dx * factor;
    this.pitch = clamp(this.pitch - dy * factor * .9, -1.43, 1.43);
  }
  toggleCamera() {
    this.thirdPerson = !this.thirdPerson;
    this.events.toast(this.thirdPerson ? 'Üçüncü şahıs kamerası' : 'Birinci şahıs kamerası');
  }
  toggleTouchCrouch() {
    if (this.posture !== 'stand') { this.standUp(); return; }
    this.touch.crouch = !this.touch.crouch;
    if (this.touch.crouch) this.touch.sprint = false;
  }
  toggleTouchSprint() {
    if (this.posture !== 'stand') return;
    this.touch.sprint = !this.touch.sprint;
    if (this.touch.sprint) this.touch.crouch = false;
  }
  touchJump() {
    if (!this.active || this.posture !== 'stand' || this.jumpOffset > .001) return;
    this.touch.crouch = false;
    this.verticalSpeed = PLAYER.jumpSpeed;
  }
  grabHand(side) {
    if (!this.active || this.posture !== 'stand' || !this.hands[side]) return;
    this.releaseHand(side);
    const hand = this.hands[side];
    hand.pressed = true;
    const result = this.hotel.tryGrab(side, this.eyePosition(), this.viewDirection, this.floor);
    if (result) {
      hand.grip = result;
      hand.distance = clamp(result.distance, .65, 3);
      this.events.toast(`${side === 'left' ? 'Sol' : 'Sağ'} el: ${result.label}`);
    }
  }
  shiftGrip(direction) {
    let changed = false;
    for (const hand of Object.values(this.hands)) if (hand.grip) {
      hand.distance = clamp(hand.distance + Math.sign(direction) * .19, .6, 3.3);
      changed = true;
    }
    return changed;
  }

  eyePosition() {
    const eye = this.posture === 'sit' ? .99 : this.posture === 'rest' ? .55 :
      this.posture === 'floorSit' ? this.avatar.profile.height * .43 :
      this.posture === 'kneel' ? this.avatar.profile.height * .57 :
      (this.postureControls.crouching || this.touch.crouch) ? this.avatar.profile.height * .69 : this.avatar.profile.height - .12;
    return new THREE.Vector3(this.position.x, this.position.y + eye, this.position.z);
  }
  rightVector() { const v = rightFromYaw(this.yaw); return new THREE.Vector3(v.x, 0, v.z); }
  anchor(side, distance) {
    const sign = side === 'left' ? -1 : 1;
    return this.eyePosition().addScaledVector(this.viewDirection, distance)
      .addScaledVector(this.rightVector(), sign * .32)
      .add(new THREE.Vector3(0, -.24, 0));
  }
  bindEvents() {
    this.mouseMove = (event) => {
      if (!this.active) return;
      if (document.pointerLockElement === this.canvas) this.lookDelta(event.movementX, event.movementY);
    };
    this.mouseDown = (event) => {
      if (!this.active || this.posture !== 'stand' || (this.touchEnabled && document.pointerLockElement !== this.canvas)) return;
      if (event.button !== 0 && event.button !== 2) return;
      event.preventDefault();
      this.grabHand(event.button === 0 ? 'left' : 'right');
    };
    this.mouseUp = (event) => {
      if (event.button === 0 || event.button === 2) this.releaseHand(event.button === 0 ? 'left' : 'right');
    };
    this.contextMenu = (event) => event.preventDefault();
    this.wheel = (event) => {
      if (!this.active || !Object.values(this.hands).some(h => h.grip)) return;
      event.preventDefault();
      this.shiftGrip(event.deltaY);
    };
    this.keyDown = (event) => {
      if (!this.active) {
        if (event.code === 'KeyK' && !event.repeat && !this.events.isElevatorOpen()) {
          this.releaseHands(); this.events.toggleCustomizer();
        }
        return;
      }
      // Prevent native browser shortcuts from hijacking combinations while in pointer lock.
      if (['Space', 'ControlLeft', 'ControlRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(event.code)) event.preventDefault();
      if (event.repeat || this.keys.has(event.code)) return;
      this.keys.add(event.code);
      const action = this.postureControls.press(event.code, performance.now());
      if (action === 'floorSit' || action === 'kneel') {
        this.setFloorPosture(action);
        return;
      }
      // Some desktop IMEs reserve Ctrl+Space. N is an always-available fallback.
      if (event.code === 'KeyN') { this.setFloorPosture('kneel'); return; }
      if (event.code === 'KeyO' || event.code === 'KeyV') {
        this.toggleCamera();
      }
      if (event.code === 'KeyK' && !this.events.isElevatorOpen()) {
        this.releaseHands(); this.events.toggleCustomizer();
      }
      if (event.code === 'KeyE') this.events.interact();
      if (event.code === 'KeyF') this.releaseHands();
    };
    this.keyUp = (event) => {
      this.keys.delete(event.code);
      this.postureControls.release(event.code);
    };
    this.blur = () => {
      this.keys.clear(); this.postureControls.reset(); this.setTouchMovement(0, 0); this.releaseHands();
    };
    this.onUnlock = () => { if (!this.active) this.blur(); };
    document.addEventListener('mousemove', this.mouseMove);
    document.addEventListener('pointerlockchange', this.onUnlock);
    this.canvas.addEventListener('mousedown', this.mouseDown);
    window.addEventListener('mouseup', this.mouseUp);
    this.canvas.addEventListener('contextmenu', this.contextMenu);
    this.canvas.addEventListener('wheel', this.wheel, { passive: false });
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
  }
  /** Floor seating and kneeling don't relocate the player or interfere with stair altitude. */
  setFloorPosture(requested) {
    if ((!isFloorPosture(this.posture) && this.posture !== 'stand') || this.jumpOffset > .02) return;
    const next = nextFloorPosture(this.posture, requested);
    if (next === 'stand') { this.standUp(); return; }
    this.releaseHands();
    this.postureControls.cancelJump();
    this.touch.crouch = false; this.touch.sprint = false;
    this.posture = next;
    this.walkSpeed = 0;
    this.verticalSpeed = 0;
    this.events.toast(next === 'floorSit' ? 'Yere oturdun · Çift Ctrl ile kalk' : 'Diz çöktün · Ctrl + Space ile kalk');
  }
  teleport(floor) {
    if (!Number.isInteger(floor) || floor < 0 || floor >= HOTEL.floors) return;
    this.releaseHands();
    this.floor = floor;
    this.position.set(0, floor * HOTEL.floorHeight, 12.1);
    this.jumpOffset = 0; this.verticalSpeed = 0; this.posture = 'stand';
    this.postureControls.reset();
    this.keys.clear(); this.setTouchMovement(0, 0);
    this.yaw = Math.PI; this.walkSpeed = 0;
  }
  useFurniture(mode, x, z, yaw) {
    if (this.posture !== 'stand') return;
    this.releaseHands();
    this.savedStanding = { x: this.position.x, y: this.position.y, z: this.position.z, yaw: this.yaw };
    this.posture = mode;
    this.position.set(x, this.floor * HOTEL.floorHeight, z);
    this.yaw = yaw; this.pitch = mode === 'rest' ? -.23 : 0;
    this.jumpOffset = 0; this.verticalSpeed = 0;
    this.events.toast(mode === 'sit' ? 'Oturuyorsun · E ile kalk' : 'Dinleniyorsun · E ile kalk');
  }
  standUp() {
    if (this.posture === 'stand') return;
    if (this.savedStanding) {
      this.position.set(this.savedStanding.x, this.savedStanding.y, this.savedStanding.z);
      this.yaw = this.savedStanding.yaw;
      this.floor = groundFloor(this.position.y);
    }
    this.posture = 'stand'; this.savedStanding = null;
    this.events.toast('Ayağa kalktın');
  }
  update(dt) {
    dt = Math.min(dt, .05);
    const active = this.active;
    const forward = this.direction;
    let mx = 0, mz = 0;
    const crouching = this.postureControls.crouching || this.touch.crouch;
    if (this.postureControls.consumeJump(performance.now()) &&
      this.jumpOffset <= .0001 && this.posture === 'stand' && !crouching) {
      this.verticalSpeed = PLAYER.jumpSpeed;
    }
    if (active && this.posture === 'stand') {
      const f = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) + this.touch.forward;
      const r = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) + this.touch.strafe;
      const movement = movementFromYaw(this.yaw, f, r);
      mx = movement.x; mz = movement.z;
      const speed = crouching ? PLAYER.crouchSpeed : this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touch.sprint ? PLAYER.sprintSpeed : PLAYER.walkingSpeed;
      const traveled = this.hotel.collisions.move(this.floor, this.position.x, this.position.z,
        mx * speed * dt, mz * speed * dt, PLAYER.radius);
      // No stepping sideways off a staircase mid-air. Only the two landings
      // connect the switchback to the adjacent floor.
      const grounded = this.position.y - this.jumpOffset;
      const onFlight = [0, 1, 2].find(f => {
        const h = stairHeight(f, this.position.x, this.position.z);
        return h !== null && Math.abs(h - grounded) < .25 &&
          Math.abs(h - f * HOTEL.floorHeight) > .22 &&
          Math.abs(h - (f + 1) * HOTEL.floorHeight) > .22;
      });
      if (onFlight !== undefined && !inStairLane(onFlight, traveled.x, traveled.z, .08)) {
        traveled.x = this.position.x; traveled.z = this.position.z;
      }
      this.walkSpeed = Math.hypot(traveled.x - this.position.x, traveled.z - this.position.z) / Math.max(dt, .001);
      this.position.x = traveled.x; this.position.z = traveled.z;
    } else this.walkSpeed = 0;
    if (this.jumpOffset > 0 || this.verticalSpeed > 0) {
      this.verticalSpeed -= PLAYER.gravity * dt;
      this.jumpOffset = Math.max(0, this.jumpOffset + this.verticalSpeed * dt);
      if (this.jumpOffset === 0) this.verticalSpeed = 0;
    }
    if (this.posture === 'stand') {
      const ground = resolveGround(this.position.x, this.position.z,
        this.position.y - this.jumpOffset, this.floor);
      // On stairs, feet follow the actual rise. Colliders switch floor at landing.
      this.position.y = ground + this.jumpOffset;
      this.floor = groundFloor(ground);
    } else this.position.y = this.floor * HOTEL.floorHeight;
    // Pulling on a wall/railing moves the player, not the static world.
    // Re-apply hotel collision to avoid dragging through the facade.
    for (const side of ['left', 'right']) {
      const hand = this.hands[side];
      if (!hand.grip || hand.grip.kind !== 'static') continue;
      const offset = this.hotel.staticGripOffset(side, this.anchor(side, hand.distance));
      if (!offset) continue;
      const power = Math.min(1, dt * 7);
      const shift = this.hotel.collisions.move(this.floor, this.position.x, this.position.z,
        clamp(offset.x * power, -.1, .1), clamp(offset.z * power, -.1, .1), PLAYER.radius);
      this.position.x = shift.x;
      this.position.z = shift.z;
    }
    this.avatar.root.position.copy(this.position);
    this.avatar.root.rotation.y = this.yaw;
    this.avatar.update(dt, this.walkSpeed, this.posture === 'stand' && crouching ? 'crouch' : this.posture);
    for (const side of ['left', 'right']) {
      const hand = this.hands[side];
      if (hand.grip) this.hotel.moveGrip(side, this.anchor(side, hand.distance));
      const arm = side === 'left' ? this.avatar.leftArm : this.avatar.rightArm;
      if (hand.pressed) arm.rotation.x = THREE.MathUtils.damp(arm.rotation.x, 1.28, 13, dt);
    }
    // Floor postures need a visible character even when the user normally plays in FPS.
    const showingCharacter = this.thirdPerson || this.events.isCustomizerOpen() || isFloorPosture(this.posture);
    this.avatar.root.visible = showingCharacter;
    this.handRig.update(dt, this.hands.left, this.hands.right,
      !showingCharacter && this.posture === 'stand');
    if (showingCharacter) {
      const distance = this.events.isCustomizerOpen() ? 3.1 : 3.8;
      const head = this.avatar.headWorldHeight?.() ?? this.avatar.profile.height * .82;
      const target = new THREE.Vector3(this.position.x, this.position.y + (isFloorPosture(this.posture) ? Math.max(.57, head - .20) : this.avatar.profile.height * .6), this.position.z);
      const behind = this.events.isCustomizerOpen() ? this.direction.clone().multiplyScalar(-1) : forward.clone().multiplyScalar(-1);
      const camPos = target.clone();
      for (let d = .2; d < distance; d += .2) {
        const test = target.clone().addScaledVector(behind, d);
        if (this.hotel.collisions.blocked(this.floor, test.x, test.z, .19)) break;
        camPos.copy(test);
      }
      camPos.y += (isFloorPosture(this.posture) ? .54 : 1.0) - this.pitch * 1.3;
      const ceiling = (this.floor + 1) * HOTEL.floorHeight - .32;
      camPos.y = Math.min(camPos.y, ceiling);
      this.camera.position.copy(camPos);
      this.camera.lookAt(target);
    } else {
      this.camera.position.copy(this.eyePosition());
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.set(this.pitch, this.yaw, 0);
    }
    return this.walkSpeed;
  }
  dispose() {
    this.releaseHands();
    document.removeEventListener('mousemove', this.mouseMove);
    document.removeEventListener('pointerlockchange', this.onUnlock);
    this.canvas.removeEventListener('mousedown', this.mouseDown);
    this.canvas.removeEventListener('contextmenu', this.contextMenu);
    this.canvas.removeEventListener('wheel', this.wheel);
    window.removeEventListener('mouseup', this.mouseUp);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.blur);
    this.handRig.dispose(); this.avatar.dispose();
  }
}
