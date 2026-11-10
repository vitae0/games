import * as THREE from 'three';
import { PLAYER, HOTEL } from '../config.js';
import { Avatar } from '../avatar/Avatar.js';
import { HandRig } from './HandRig.js';
import { forwardFromYaw, rightFromYaw, viewFromYawPitch, movementFromYaw, yawFromDisplacement, approachYaw } from './Orientation.js';
import { isFloorPosture, nextFloorPosture } from './Postures.js';
import { PostureControls } from './PostureControls.js';
import { resolveGround, groundFloor, stairHeight, inStairLane } from '../world/Stairwell.js';

const clamp = THREE.MathUtils.clamp;

export class Player {
  constructor(canvas, camera, scene, hotel, profile, events) {
    this.canvas = canvas; this.camera = camera; this.hotel = hotel; this.events = events;
    this.position = new THREE.Vector3(0, 0, -11.4); // All doors to outside are sealed.
    this.floor = 0; this.yaw = Math.PI; this.bodyYaw = this.yaw; this.pitch = -.04;
    this.keys = new Set(); this.verticalSpeed = 0; this.jumpOffset = 0;
    this.posture = 'stand'; this.thirdPerson = false; this.walkSpeed = 0;
    this.touchActive = false; this.touchMove = { x: 0, forward: 0 };
    this.touchRun = false; this.touchCrouch = false; this.touchGripAdjustment = 0;
    this.avatar = new Avatar(scene, profile);
    this.handRig = new HandRig(camera, profile);
    this.hands = {
      left: { pressed: false, grip: null, distance: 1.55 },
      right: { pressed: false, grip: null, distance: 1.55 },
    };
    this.savedStanding = null;
    this.postureControls = new PostureControls();
    this.bindEvents();
  }
  get active() { return (document.pointerLockElement === this.canvas || this.touchActive) && !this.events.isModalOpen(); }
  get direction() { const v = forwardFromYaw(this.yaw); return new THREE.Vector3(v.x, 0, v.z); }
  get viewDirection() { const v = viewFromYawPitch(this.yaw, this.pitch); return new THREE.Vector3(v.x, v.y, v.z); }
  /** CSS pixel deltas, shared by mouse and mobile swipe gestures. */
  lookBy(dx, dy, multiplier = 1) {
    this.yaw -= dx * .00245 * multiplier;
    this.pitch = clamp(this.pitch - dy * .0022 * multiplier, -1.43, 1.43);
  }
  setTouchMove(right, forward) {
    this.touchMove.x = clamp(right, -1, 1);
    this.touchMove.forward = clamp(forward, -1, 1);
  }
  jump() {
    if (!this.active || this.posture !== 'stand' || this.postureControls.crouching || this.touchCrouch || this.jumpOffset > .0001) return;
    this.postureControls.cancelJump();
    this.verticalSpeed = PLAYER.jumpSpeed;
  }
  toggleCamera() {
    if (!this.active) return;
    this.thirdPerson = !this.thirdPerson;
    if (this.thirdPerson) this.bodyYaw = this.yaw;
    this.events.toast(this.thirdPerson ? 'Üçüncü şahıs kamerası' : 'Birinci şahıs kamerası');
  }
  adjustGripDistance(delta) {
    if (!this.active) return;
    for (const hand of Object.values(this.hands)) {
      if (hand.grip) hand.distance = clamp(hand.distance + delta, .6, 3.3);
    }
  }
  pressHand(side) {
    if (!this.active || this.posture !== 'stand') return;
    this.releaseHand(side);
    const hand = this.hands[side];
    hand.pressed = true;
    const result = this.hotel.tryGrab(side, this.eyePosition(), this.viewDirection, this.floor);
    if (result) {
      hand.grip = result;
      hand.distance = clamp(result.distance, .65, 3.0);
      this.events.toast(`${side === 'left' ? 'Sol' : 'Sağ'} el: ${result.label} · it / çek`);
    }
  }
  releaseHand(side) {
    const hand = this.hands[side];
    hand.pressed = false; hand.grip = null;
    this.hotel.releaseGrip(side);
  }
  releaseHands() { this.releaseHand('left'); this.releaseHand('right'); }
  eyePosition() {
    const eye = this.posture === 'sit' ? .99 : this.posture === 'rest' ? .55 :
      this.posture === 'floorSit' ? this.avatar.profile.height * .43 :
      this.posture === 'kneel' ? this.avatar.profile.height * .57 :
      (this.postureControls.crouching || this.touchCrouch) ? this.avatar.profile.height * .69 : this.avatar.profile.height - .12;
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
      if (!this.active || document.pointerLockElement !== this.canvas) return;
      this.lookBy(event.movementX, event.movementY);
    };
    this.mouseDown = (event) => {
      if (!this.active || this.posture !== 'stand' || (this.touchActive && document.pointerLockElement !== this.canvas)) return;
      if (event.button !== 0 && event.button !== 2) return;
      event.preventDefault();
      this.pressHand(event.button === 0 ? 'left' : 'right');
    };
    this.mouseUp = (event) => {
      if (event.button === 0 || event.button === 2) this.releaseHand(event.button === 0 ? 'left' : 'right');
    };
    this.contextMenu = (event) => event.preventDefault();
    this.wheel = (event) => {
      if (!this.active || !Object.values(this.hands).some(h => h.grip)) return;
      event.preventDefault();
      this.adjustGripDistance(Math.sign(event.deltaY) * .19);
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
      this.keys.clear(); this.postureControls.reset(); this.setTouchMove(0, 0); this.releaseHands();
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
    this.furnitureHeight = 0; this.savedStanding = null;
    this.postureControls.reset();
    this.keys.clear(); this.setTouchMove(0, 0);
    this.yaw = Math.PI; this.bodyYaw = this.yaw; this.walkSpeed = 0;
  }
  useFurniture(mode, x, z, yaw, surfaceHeight = 0) {
    if (this.posture !== 'stand') return;
    this.releaseHands();
    this.savedStanding = { x: this.position.x, y: this.position.y, z: this.position.z, yaw: this.yaw, bodyYaw: this.bodyYaw };
    this.posture = mode;
    this.furnitureHeight = surfaceHeight;
    this.position.set(x, this.floor * HOTEL.floorHeight + surfaceHeight, z);
    this.yaw = yaw; this.bodyYaw = yaw; this.pitch = mode === 'rest' ? -.23 : 0;
    this.jumpOffset = 0; this.verticalSpeed = 0;
    this.events.toast(mode === 'sit' ? 'Oturuyorsun · E ile kalk' : 'Dinleniyorsun · E ile kalk');
  }
  standUp() {
    if (this.posture === 'stand') return;
    if (this.savedStanding) {
      this.position.set(this.savedStanding.x, this.savedStanding.y, this.savedStanding.z);
      this.yaw = this.savedStanding.yaw;
      this.bodyYaw = this.savedStanding.bodyYaw;
      this.floor = groundFloor(this.position.y);
    }
    this.posture = 'stand'; this.furnitureHeight = 0; this.savedStanding = null;
    this.events.toast('Ayağa kalktın');
  }
  update(dt) {
    dt = Math.min(dt, .05);
    const active = this.active;
    const forward = this.direction;
    let mx = 0, mz = 0;
    let movedX = 0, movedZ = 0;
    const crouching = this.postureControls.crouching || this.touchCrouch;
    if (this.postureControls.consumeJump(performance.now()) &&
      this.jumpOffset <= .0001 && this.posture === 'stand' && !crouching) {
      this.verticalSpeed = PLAYER.jumpSpeed;
    }
    if (active && this.posture === 'stand') {
      const f = clamp(Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) + this.touchMove.forward, -1, 1);
      const r = clamp(Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) + this.touchMove.x, -1, 1);
      const movement = movementFromYaw(this.yaw, f, r);
      const intensity = Math.min(1, Math.hypot(f, r));
      mx = movement.x * intensity; mz = movement.z * intensity;
      const sprinting = this.touchRun || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const speed = crouching ? PLAYER.crouchSpeed : sprinting ? PLAYER.sprintSpeed : PLAYER.walkingSpeed;
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
      movedX = traveled.x - this.position.x;
      movedZ = traveled.z - this.position.z;
      this.walkSpeed = Math.hypot(movedX, movedZ) / Math.max(dt, .001);
      this.position.x = traveled.x; this.position.z = traveled.z;
    } else this.walkSpeed = 0;
    if (this.jumpOffset > 0 || this.verticalSpeed > 0) {
      this.verticalSpeed -= PLAYER.gravity * dt;
      this.jumpOffset = Math.max(0, this.jumpOffset + this.verticalSpeed * dt);
      if (this.jumpOffset === 0) this.verticalSpeed = 0;
    }
    if (this.posture === 'stand') {
      const ground = this.hotel.groundHeight
        ? this.hotel.groundHeight(this.position.x, this.position.z, this.position.y - this.jumpOffset, this.floor)
        : resolveGround(this.position.x, this.position.z, this.position.y - this.jumpOffset, this.floor);
      // On stairs, feet follow the actual rise. Colliders switch floor at landing.
      this.position.y = ground + this.jumpOffset;
      this.floor = groundFloor(ground);
    } else this.position.y = this.floor * HOTEL.floorHeight + (this.furnitureHeight || 0);
    // A held touch control adjusts the grip continuously; short taps nudge it.
    if (active && this.touchGripAdjustment) this.adjustGripDistance(this.touchGripAdjustment * dt * 1.05);
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
    // Camera yaw is independent from avatar facing in third-person mode.
    // Rotate only after genuine horizontal locomotion; camera orbit while idle is free.
    if (!this.thirdPerson) this.bodyYaw = this.yaw;
    else if (this.posture === 'stand') {
      const desiredFacing = yawFromDisplacement(movedX, movedZ);
      if (desiredFacing !== null) this.bodyYaw = approachYaw(this.bodyYaw, desiredFacing, dt, 14);
    }
    this.avatar.root.position.copy(this.position);
    this.avatar.root.rotation.y = this.bodyYaw;
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
