import * as THREE from 'three';
import { PLAYER, HOTEL } from '../config.js';
import { Avatar } from '../avatar/Avatar.js';
import { HandRig } from './HandRig.js';
import { BodyIK } from './BodyIK.js';
import { scrollZoomDistance, orbitFocusHeight, orbitVerticalOffset, orbitHorizontalDistance } from './CameraOrbit.js';
import { alignAvatarToFurniture } from './FurnitureFit.js';
import { forwardFromYaw, rightFromYaw, viewFromYawPitch, movementFromYaw, yawFromDisplacement, approachYaw } from './Orientation.js';
import { isFloorPosture, nextFloorPosture, nextRisePosture } from './Postures.js';
import { PostureControls } from './PostureControls.js';
import { cycleFloorVariant, floorVariant, lyingDirection } from './PoseVariants.js';
import { resolveGround, groundFloor } from '../world/Stairwell.js';

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
    this.avatar = new Avatar(scene, profile, { localPlayer: true });
    this.handRig = new HandRig(camera, profile);
    this.bodyIK = new BodyIK(this.avatar);
    this.cameraDistance = 0; // zero is FPS; positive values orbit the avatar
    this.lastThirdPersonDistance = 3.8;
    this.hands = {
      left: { pressed: false, grip: null, distance: 1.55 },
      right: { pressed: false, grip: null, distance: 1.55 },
    };
    this.savedStanding = null;
    this.furnitureStyle = null;
    this.furnitureExit = null;
    this.furnitureSurfaceHeight = null;
    this.sleepLean = 0;
    this.floorLieLean = 0;
    this.floorVariantIndex = 0;
    this.lyingQuarterTurns = 0;
    this.lyingRoll = 0;
    this.avatar.root.rotation.order = 'YXZ';
    this.postureControls = new PostureControls();
    this.bindEvents();
  }
  get active() { return (document.pointerLockElement === this.canvas || this.touchActive) && !this.events.isModalOpen(); }
  get direction() { const v = forwardFromYaw(this.yaw); return new THREE.Vector3(v.x, 0, v.z); }
  get viewDirection() {
    if (this.posture === 'stand') {
      const v = viewFromYawPitch(this.yaw,this.pitch);
      return new THREE.Vector3(v.x,v.y,v.z);
    }
    return new THREE.Vector3(0,0,-1).applyQuaternion(this.poseCameraQuaternion());
  }
  /** Full pose-relative camera orientation, preserving independent mouse yaw. */
  poseCameraQuaternion() {
    if (this.posture === 'stand') return new THREE.Quaternion().setFromEuler(
      new THREE.Euler(this.pitch,this.yaw,0,'YXZ'));
    const local=new THREE.Quaternion().setFromEuler(new THREE.Euler(
      this.pitch,this.yaw-this.bodyYaw,0,'YXZ'));
    return this.avatar.root.quaternion.clone().multiply(local);
  }
  get currentFloorVariant() { return floorVariant(this.posture,this.floorVariantIndex); }
  changeFloorVariant(direction, vertical = false) {
    if (!isFloorPosture(this.posture) || !Number.isFinite(direction)) return;
    if (this.posture === 'floorLie' && !vertical) {
      this.lyingQuarterTurns += Math.sign(direction);
      this.events.toast('Yatış · '+lyingDirection(this.lyingQuarterTurns));
      return;
    }
    this.floorVariantIndex=cycleFloorVariant(this.posture,this.floorVariantIndex,
      Math.sign(direction));
    this.events.toast(this.currentFloorVariant.label);
  }
  /** CSS pixel deltas, shared by mouse and mobile swipe gestures. */
  lookBy(dx, dy, multiplier = 1) {
    this.yaw -= dx * .00245 * multiplier;
    this.pitch = clamp(this.pitch - dy * .0022 * multiplier, -1.54, 1.54);
  }
  setTouchMove(right, forward) {
    this.touchMove.x = clamp(right, -1, 1);
    this.touchMove.forward = clamp(forward, -1, 1);
  }
  jump() {
    if (!this.active || this.posture !== 'stand' || this.postureControls.crouching || this.touchCrouch || this.jumpOffset > .0001) return;
    this.postureControls.cancelJump();
    this.bodyIK.clearSteps();
    this.bodyIK.cancelKicks();
    this.verticalSpeed = PLAYER.jumpSpeed;
  }
  toggleCamera() {
    if (!this.active) return;
    if (this.thirdPerson) {
      if (this.cameraDistance >= 1.5) this.lastThirdPersonDistance = this.cameraDistance;
      this.thirdPerson = false;
      this.cameraDistance = 0;
    } else {
      this.thirdPerson = true;
      this.cameraDistance = Math.max(1.5, this.lastThirdPersonDistance);
    }
    // Camera transitions never change the body's facing direction.
    this.events.toast(this.thirdPerson ? 'Üçüncü şahıs kamerası' : 'Birinci şahıs kamerası');
  }
  adjustGripDistance(delta) {
    if (!this.active) return;
    for (const hand of Object.values(this.hands)) {
      if (hand.grip) hand.distance = clamp(hand.distance + delta, .6, 3.3);
    }
  }
  pressHand(side) {
    if (!this.active || this.posture !== 'stand' || this.keys.has('KeyZ')) return;
    this.releaseHand(side);
    const hand = this.hands[side];
    hand.pressed = true;
    this.avatar?.setHandDetail(true,side);
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
    this.avatar?.setHandDetail(false,side);
    this.hotel.releaseGrip(side);
  }
  releaseHands() { this.releaseHand('left'); this.releaseHand('right'); }
  eyePosition() {
    if (this.posture !== 'stand') {
      this.avatar.root.updateWorldMatrix(true,true);
      const eye=this.avatar.head.localToWorld(new THREE.Vector3(0,0,-.095));
      eye.y=clamp(eye.y,this.floor*HOTEL.floorHeight+.16,
        (this.floor+1)*HOTEL.floorHeight-.20);
      return eye;
    }
    const eye=(this.postureControls.crouching || this.touchCrouch)
      ? this.avatar.profile.height*.69 : this.avatar.profile.height-.12;
    return new THREE.Vector3(this.position.x,this.position.y+eye,this.position.z);
  }
  rightVector() {
    if (this.posture !== 'stand')
      return new THREE.Vector3(1,0,0).applyQuaternion(this.poseCameraQuaternion());
    const v=rightFromYaw(this.yaw);
    return new THREE.Vector3(v.x,0,v.z);
  }
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
      if (!this.active || this.posture !== 'stand' || this.keys.has('KeyZ') ||
          (this.touchActive && document.pointerLockElement !== this.canvas)) return;
      if (event.button !== 0 && event.button !== 2) return;
      event.preventDefault();
      this.pressHand(event.button === 0 ? 'left' : 'right');
    };
    this.mouseUp = (event) => {
      if (event.button === 0 || event.button === 2) this.releaseHand(event.button === 0 ? 'left' : 'right');
    };
    this.contextMenu = (event) => event.preventDefault();
    this.wheel = (event) => {
      if (!this.active || !Number.isFinite(event.deltaY) || !event.deltaY) return;
      event.preventDefault();
      // Shift+wheel retains the precise grab-distance adjustment; bare wheel
      // always controls the orbit, including the FPS/TPS handoff.
      if (event.shiftKey && Object.values(this.hands).some(h => h.grip)) {
        this.adjustGripDistance(Math.sign(event.deltaY) * .19);
        return;
      }
      const oldDistance = this.thirdPerson ? this.cameraDistance : 0;
      const next = scrollZoomDistance(oldDistance, event.deltaY);
      this.thirdPerson = next > 0;
      this.cameraDistance = next;
      if (next >= 1.5) this.lastThirdPersonDistance = next;
    };
    this.keyDown = (event) => {
      if (!this.active) {
        if (event.code === 'KeyK' && !event.repeat && !this.events.isElevatorOpen()) {
          this.releaseHands(); this.events.toggleCustomizer();
        }
        return;
      }
      // Prevent native browser shortcuts from hijacking combinations while in pointer lock.
      if (['Space', 'ControlLeft', 'ControlRight', 'ArrowUp', 'ArrowDown', 'Tab'].includes(event.code) ||
          (event.code === 'KeyW' && (event.ctrlKey || this.postureControls.crouching)))
        event.preventDefault();
      if (event.repeat || this.keys.has(event.code)) return;
      this.keys.add(event.code);
      if (event.code === 'KeyZ') {
        this.releaseHands();
        this.postureControls.reset();
        this.events.toast('Z+W+A/D bacak · Z+S+A/D kol · Z+Q+A/D el · Ctrl bük');
        return;
      }
      if (this.keys.has('KeyZ')) {
        const precisionKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ',
          'KeyE', 'KeyR', 'KeyF', 'Space', 'ControlLeft', 'ControlRight'];
        if (precisionKeys.includes(event.code)) {
          const legSelection = !this.keys.has('KeyS') && !this.keys.has('KeyQ');
          if (event.code === 'Space' && legSelection && this.posture === 'stand') {
            if (this.keys.has('KeyA')) this.bodyIK.kick('left', this.viewDirection, this.bodyYaw);
            if (this.keys.has('KeyD')) this.bodyIK.kick('right', this.viewDirection, this.bodyYaw);
          }
          if (['KeyA', 'KeyD'].includes(event.code) && this.keys.has('Space') &&
              legSelection && this.posture === 'stand') {
            this.bodyIK.kick(event.code === 'KeyA' ? 'left' : 'right',
              this.viewDirection, this.bodyYaw);
          }
          return;
        }
      }
      // Pose A/D is contextual. The precision hold intercepts the same keys
      // before this branch, so no additional global key bindings are needed.
      if (isFloorPosture(this.posture) && ['KeyA','KeyD'].includes(event.code)) {
        this.changeFloorVariant(event.code==='KeyD'?1:-1);
        return;
      }
      if (this.posture === 'floorLie' && ['KeyW','KeyS'].includes(event.code)) {
        this.changeFloorVariant(event.code==='KeyW'?1:-1,true);
        return;
      }
      const action = this.postureControls.press(event.code, performance.now());
      if (action === 'floorSit' || action === 'kneel' || action === 'floorLie') {
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
      // Releasing the precision key freezes the foot targets in place.
      this.postureControls.release(event.code);
    };
    this.blur = () => {
      this.keys.clear(); this.postureControls.reset(); this.setTouchMove(0, 0); this.releaseHands();
      // A loss of pointer lock is not walking: preserve planted limb targets.
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
    this.bodyIK.clearPoseTargets();
    this.postureControls.cancelJump();
    if (this.posture !== next) this.floorVariantIndex=0;
    if (next === 'floorLie' && this.posture !== 'floorLie') {
      this.lyingQuarterTurns=0;
      this.lyingRoll=0;
    }
    this.posture = next;
    this.walkSpeed = 0;
    this.verticalSpeed = 0;
    const labels = {
      floorSit:'Yere oturdun · E ile ayağa kalk',
      kneel:'İki dizinin üstündesin · E ile önce otur',
      floorLie:'Yere uzandın · E ile önce otur',
    };
    this.events.toast(labels[next]);
  }
  teleport(floor) {
    if (!Number.isInteger(floor) || floor < 0 || floor >= HOTEL.floors) return;
    this.furnitureExit?.();
    this.furnitureExit = null;
    this.furnitureStyle = null;
    this.furnitureSurfaceHeight = null;
    this.releaseHands();
    this.bodyIK.clearSteps();
    this.bodyIK.cancelKicks();
    this.floor = floor;
    this.position.set(0, floor * HOTEL.floorHeight, 12.1);
    this.jumpOffset = 0; this.verticalSpeed = 0; this.posture = 'stand';
    this.floorLieLean = 0; this.sleepLean = 0;
    this.lyingQuarterTurns=0;this.lyingRoll=0;this.floorVariantIndex=0;
    this.furnitureHeight = 0; this.savedStanding = null;
    this.postureControls.reset();
    this.bodyIK.clearSteps();
    this.keys.clear(); this.setTouchMove(0, 0);
    this.yaw = Math.PI; this.bodyYaw = this.yaw; this.walkSpeed = 0;
  }
  useFurniture(mode, x, z, yaw, surfaceHeight = 0, options = {}) {
    if (this.posture !== 'stand' || !['sit', 'rest'].includes(mode)) return;
    this.releaseHands();
    this.bodyIK.clearSteps();
    this.bodyIK.cancelKicks();
    this.savedStanding = {
      x: this.position.x, y: this.position.y, z: this.position.z,
      yaw: this.yaw, bodyYaw: this.bodyYaw, pitch: this.pitch,
    };
    this.posture = mode;
    this.furnitureStyle = options.style ?? mode;
    this.furnitureExit = typeof options.onExit === 'function' ? options.onExit : null;
    this.furnitureSurfaceHeight = typeof options.getSurfaceHeight === 'function'
      ? options.getSurfaceHeight : null;
    const measuredSurface = this.furnitureSurfaceHeight?.();
    this.furnitureHeight = Number.isFinite(measuredSurface) ? measuredSurface : surfaceHeight;
    this.position.set(x, this.floor * HOTEL.floorHeight + this.furnitureHeight, z);
    this.yaw = yaw; this.bodyYaw = yaw; this.pitch = mode === 'rest' ? -.23 : 0;
    this.jumpOffset = 0; this.verticalSpeed = 0;
    options.onEnter?.();
    this.events.toast(mode === 'sit' ? 'Oturuyorsun · E ile kalk' : 'Dinleniyorsun · E ile kalk');
  }
  standUp() {
    if (this.posture === 'stand') return;
    if (isFloorPosture(this.posture)) {
      this.posture = nextRisePosture(this.posture);
      this.floorVariantIndex=0;
      if (this.posture !== 'floorLie') this.lyingQuarterTurns=0;
      this.walkSpeed = 0;
      this.bodyIK.clearPoseTargets();
      this.postureControls.cancelJump();
      this.events.toast(this.posture === 'floorSit'
        ? 'Önce yere oturdun · Bir kez daha E ile kalk'
        : 'Ayağa kalktın');
      return;
    }
    this.furnitureExit?.();
    this.furnitureExit = null;
    this.furnitureStyle = null;
    this.furnitureSurfaceHeight = null;
    if (this.savedStanding) {
      this.position.set(this.savedStanding.x, this.savedStanding.y, this.savedStanding.z);
      this.yaw = this.savedStanding.yaw;
      this.bodyYaw = this.savedStanding.bodyYaw;
      this.pitch = this.savedStanding.pitch;
      this.floor = groundFloor(this.position.y);
    }
    this.posture = 'stand'; this.furnitureHeight = 0; this.savedStanding = null;
    this.events.toast('Ayağa kalktın');
  }
  update(dt) {
    dt = Math.min(dt, .05);
    const active = this.active;
    const forward = this.direction;
    const startingX = this.position.x, startingZ = this.position.z;
    let mx = 0, mz = 0;
    let movedX = 0, movedZ = 0;
    let surfaceGround = null;
    const crouching = this.postureControls.crouching || this.touchCrouch;
    const precision = active && this.keys.has('KeyZ');
    if (this.postureControls.consumeJump(performance.now()) &&
      this.jumpOffset <= .0001 && this.posture === 'stand' && !crouching && !precision) {
      this.verticalSpeed = PLAYER.jumpSpeed;
      this.bodyIK.clearSteps();
      this.bodyIK.cancelKicks();
    }
    if (active && this.posture === 'stand' && !precision) {
      const f = clamp(Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) + this.touchMove.forward, -1, 1);
      const r = clamp(Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) + this.touchMove.x, -1, 1);
      const movement = movementFromYaw(this.yaw, f, r);
      const intensity = Math.min(1, Math.hypot(f, r));
      mx = movement.x * intensity; mz = movement.z * intensity;
      const sprinting = this.touchRun || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const speed = crouching ? PLAYER.crouchSpeed : sprinting ? PLAYER.sprintSpeed : PLAYER.walkingSpeed;
      const traveled = this.hotel.movePlayer
        ? this.hotel.movePlayer(this.floor, this.position.x, this.position.z,
          this.position.y - this.jumpOffset, mx * speed * dt, mz * speed * dt,
          PLAYER.radius,this.position.y+Math.max(0,this.verticalSpeed)*dt)
        : this.hotel.collisions.move(this.floor, this.position.x, this.position.z,
          mx * speed * dt, mz * speed * dt, PLAYER.radius);
      if (Number.isFinite(traveled.ground)) surfaceGround = traveled.ground;
      movedX = traveled.x - this.position.x;
      movedZ = traveled.z - this.position.z;
      this.walkSpeed = Math.hypot(movedX, movedZ) / Math.max(dt, .001);
      this.position.x = traveled.x; this.position.z = traveled.z;
    } else this.walkSpeed = 0;
    // Keep the world-space feet continuous while stepping onto/off raised objects.
    // A surface is reachable only after a physical jump clears its top face.
    const oldFeet=this.position.y;
    const oldBase=this.position.y-this.jumpOffset;
    if(this.jumpOffset>0||this.verticalSpeed>0){
      this.verticalSpeed-=PLAYER.gravity*dt;
      this.jumpOffset=Math.max(0,this.jumpOffset+this.verticalSpeed*dt);
      if(this.jumpOffset===0)this.verticalSpeed=0;
    }
    if(this.posture==='stand'){
      const feet=oldBase+this.jumpOffset;
      const candidate=surfaceGround??(this.hotel.groundHeight
        ?this.hotel.groundHeight(this.position.x,this.position.z,oldBase,this.floor,
          Math.max(feet,oldFeet))
        :resolveGround(this.position.x,this.position.z,oldBase,this.floor));
      let nextBase=candidate, nextFeet=feet;
      if(candidate>oldBase+.025){
        // Invisible stair ramps and tiny thresholds are walked, not jumped.
        // The step allowance is deliberately lower than chairs/mattresses.
        if(this.jumpOffset<.0001&&this.verticalSpeed<=0&&candidate-oldBase<=.20){
          nextFeet=candidate;this.jumpOffset=0;this.verticalSpeed=0;
        }else if(Math.max(oldFeet,feet)+.025<candidate)nextBase=oldBase;
        else if(this.verticalSpeed<=0&&feet<=candidate){
          nextFeet=candidate;this.jumpOffset=0;this.verticalSpeed=0;
        }else this.jumpOffset=Math.max(0,feet-candidate);
      }else if(candidate<oldBase-.025){
        if(this.jumpOffset<.0001&&this.verticalSpeed<=0&&oldBase-candidate<=.20){
          // Small down-steps track the invisible ramp instead of triggering
          // a tiny fall after every individual visual tread.
          nextFeet=candidate;this.jumpOffset=0;this.verticalSpeed=0;
        }else{
          // Leaving a high surface still falls under gravity, never teleports.
          this.jumpOffset+=oldBase-candidate;
          if(this.verticalSpeed>=0)this.verticalSpeed=0;
          nextFeet=candidate+this.jumpOffset;
        }
      }
      this.position.y=nextFeet;
      this.floor=groundFloor(nextBase);
    }else {
      const measuredSurface = this.furnitureSurfaceHeight?.();
      if (Number.isFinite(measuredSurface)) this.furnitureHeight = measuredSurface;
      this.position.y = this.floor * HOTEL.floorHeight + (this.furnitureHeight || 0);
    }
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
      const mx = clamp(offset.x * power, -.1, .1);
      const mz = clamp(offset.z * power, -.1, .1);
      const shift = this.hotel.movePlayer
        ? this.hotel.movePlayer(this.floor, this.position.x, this.position.z,
          this.position.y - this.jumpOffset, mx, mz, PLAYER.radius)
        : this.hotel.collisions.move(this.floor, this.position.x, this.position.z, mx, mz, PLAYER.radius);
      this.position.x = shift.x;
      this.position.z = shift.z;
      if (Number.isFinite(shift.ground)) {
        this.position.y = shift.ground + this.jumpOffset;
        this.floor = groundFloor(shift.ground);
      }
    }
    // FPS and TPS obey the same facing rule. Looking around never rotates the
    // model, including while sitting, bathing, reclining, or holding a foot pose.
    // Only actual horizontal displacement (not an attempted blocked step) moves it.
    if (this.posture === 'stand' && !precision) {
      const actualDx = this.position.x - startingX;
      const actualDz = this.position.z - startingZ;
      const desiredFacing = yawFromDisplacement(actualDx, actualDz);
      if (desiredFacing !== null) {
        this.bodyIK.clearSteps();
        this.bodyIK.cancelKicks();
        this.bodyYaw = approachYaw(this.bodyYaw, desiredFacing, dt, 14);
      }
    }
    this.avatar.root.position.copy(this.position);
    this.avatar.root.rotation.set(0,this.bodyYaw,0,'YXZ');
    // Furniture poses turn around the real hip/back contact, not around the
    // foot-level player controller, so small/tall avatars rest on the surface.
    this.sleepLean = THREE.MathUtils.damp(this.sleepLean,
      this.posture === 'rest' && this.furnitureStyle === 'sleep' ? 1 : 0, 7, dt);
    this.floorLieLean = THREE.MathUtils.damp(this.floorLieLean,
      this.posture === 'floorLie' ? 1 : 0, 8, dt);
    // Roll the entire skeleton onto the back; keep shoulders and head above
    // the floor without changing their bone lengths or the foot planting logic.
    this.avatar.root.rotation.x = -1.52 * this.sleepLean + 1.47 * this.floorLieLean;
    this.lyingRoll=THREE.MathUtils.damp(this.lyingRoll,
      this.posture === 'floorLie' ? this.lyingQuarterTurns*Math.PI/2 : 0,8,dt);
    // Rotating around the reclining body's longitudinal local Y axis rolls
    // 90° onto either side and 180° completely face-down.
    if (Math.abs(this.lyingRoll)>1e-7)
      this.avatar.root.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0,1,0),this.lyingRoll));
    this.avatar.root.position.y += .19 * this.floorLieLean;
    this.avatar.update(dt, this.walkSpeed,
      this.posture === 'stand' && crouching ? 'crouch' : this.posture,
      this.furnitureStyle, this.currentFloorVariant?.id ?? null);
    if (this.savedStanding) alignAvatarToFurniture(this.avatar, this.position, this.furnitureStyle);
    for (const side of ['left', 'right']) {
      const hand = this.hands[side];
      if (hand.grip) this.hotel.moveGrip(side, this.anchor(side, hand.distance));
    }
    this.bodyIK.update(dt, {
      hands: this.hands, eye: this.eyePosition(), look: this.viewDirection,
      right: this.rightVector(), posture: this.posture, precision,
      keys: this.keys, bodyYaw: this.bodyYaw,
    });
    // FPS exposes only this avatar's actual limb bones. Other characters
    // remain complete: their layer masks are never modified.
    const orbitCamera = this.thirdPerson || this.events.isCustomizerOpen();
    this.avatar.setFirstPersonMode(!orbitCamera);
    this.avatar.root.visible = true;
    this.handRig.update(dt, this.hands.left, this.hands.right, false);
    this.camera.layers.set(0);
    if (orbitCamera) this.camera.layers.enable(1);
    if (orbitCamera) {
      // Forced furniture/floor orbit works even when normal camera mode is FPS.
      const distance = this.events.isCustomizerOpen() ? 3.1
        : this.thirdPerson ? this.cameraDistance : this.lastThirdPersonDistance;
      const head = this.avatar.headWorldHeight?.() ?? this.avatar.profile.height * .82;
      const targetHeight = this.posture === 'floorLie' ? .24
        : isFloorPosture(this.posture) ? Math.max(.57, head - .20)
          : orbitFocusHeight(this.avatar.profile.height,
            this.avatar.profile.height - .12, distance);
      // Furniture pivots around the visible torso, not the avatar's old foot origin.
      const target = this.savedStanding
        ? this.avatar.body.localToWorld(new THREE.Vector3(0,
          this.avatar.profile.height * (this.furnitureStyle === 'sleep' ? .63 : .69), 0))
        : this.posture === 'floorLie'
          ? this.avatar.body.localToWorld(new THREE.Vector3(0,this.avatar.profile.height*.57,0))
          : new THREE.Vector3(this.position.x, this.position.y + targetHeight, this.position.z);
      const behind = this.events.isCustomizerOpen()
        ? this.direction.clone().multiplyScalar(-1) : forward.clone().multiplyScalar(-1);
      const horizontal = orbitHorizontalDistance(distance, this.pitch);
      const vertical = orbitVerticalOffset(distance, this.pitch);
      const camPos = target.clone();
      const floorBound = this.floor * HOTEL.floorHeight + .10;
      const ceiling = (this.floor + 1) * HOTEL.floorHeight - .18;
      for (let d = .2; d <= distance + .2; d += .2) {
        const ratio = Math.min(1, d / Math.max(.01, distance));
        const test = target.clone().addScaledVector(behind, horizontal * ratio);
        test.y = clamp(target.y + vertical * ratio, floorBound, ceiling);
        if (this.hotel.collisions.blocked(this.floor, test.x, test.z, .19)) break;
        camPos.copy(test);
      }
      this.camera.position.copy(camPos);
      this.camera.lookAt(target);
    } else {
      this.camera.position.copy(this.eyePosition());
      this.camera.quaternion.copy(this.poseCameraQuaternion());
    }
    return this.walkSpeed;
  }
  dispose() {
    this.furnitureExit?.();
    this.furnitureExit = null;
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
