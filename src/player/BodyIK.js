import * as THREE from 'three';

const DOWN = new THREE.Vector3(0, -1, 0);
const IDENTITY = new THREE.Quaternion();
const clamp = THREE.MathUtils.clamp;

/** Pole is a world-space bend DIRECTION. Both segments preserve their lengths. */
export function solveTwoBone(start, target, upperLength, lowerLength, pole) {
  if (!(upperLength > 0 && lowerLength > 0)) return null;
  const delta = target.clone().sub(start);
  const rawDistance = delta.length();
  if (rawDistance < 1e-6) return null;
  const direction = delta.divideScalar(rawDistance);
  const minimum = Math.abs(upperLength - lowerLength) + .002;
  const distance = clamp(rawDistance, minimum, Math.max(minimum, upperLength + lowerLength - .006));
  const along = (distance ** 2 + upperLength ** 2 - lowerLength ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
  let bend = pole.clone().addScaledVector(direction, -pole.dot(direction));
  if (bend.lengthSq() < 1e-6) {
    bend = new THREE.Vector3(0, 0, -1).addScaledVector(direction, direction.z);
    if (bend.lengthSq() < 1e-6) bend.set(1, 0, 0);
  }
  bend.normalize();
  return {
    elbow: start.clone().addScaledVector(direction, along).addScaledVector(bend, height),
    end: start.clone().addScaledVector(direction, distance),
  };
}

/** Camera heading changes the foot destination slightly, without extreme sideways spread. */
export function footStepOffset(viewYaw, bodyYaw) {
  const difference = Math.atan2(Math.sin(viewYaw - bodyYaw), Math.cos(viewYaw - bodyYaw));
  const turn = clamp(difference, -.48, .48);
  return { sideways: clamp(-Math.sin(turn) * .27, -.12, .12) || 0,
    forward: -.29 * Math.cos(turn), height: .095 };
}

/** Mouse-directed foot destination in avatar-local metres. The head/camera
 * can swivel while the torso remains planted during the precision hold.
 * The inside limit avoids a leg crossing through the opposite thigh.
 */
export function aimFootTarget(look, bodyYaw, side) {
  const c = Math.cos(bodyYaw), s = Math.sin(bodyYaw);
  const lateral = c * look.x - s * look.z;
  const forward = s * look.x + c * look.z;
  const sideMin = side === 'left' ? -.62 : -.19;
  const sideMax = side === 'left' ? .19 : .62;
  return {
    sideways: clamp(lateral * .83, sideMin, sideMax) || 0,
    forward: clamp(forward * .85, -.82, .45),
    height: clamp(.37 + look.y * .53, .025, .78),
    bend: 0,
  };
}

export const KICK_DURATION = .72;
const smooth = t => { const v = clamp(t, 0, 1); return v * v * (3 - 2 * v); };
const between = (start, end, t) => ({
  forward: THREE.MathUtils.lerp(start.forward, end.forward, smooth(t)),
  sideways: THREE.MathUtils.lerp(start.sideways, end.sideways, smooth(t)),
  height: THREE.MathUtils.lerp(start.height, end.height, smooth(t)),
  bend: THREE.MathUtils.lerp(start.bend, end.bend, smooth(t)),
});

/** Wind-up -> forward extension -> recovery. No collision/damage is implied. */
export function kickFootPose(seconds, side, aimed = null) {
  if (seconds >= KICK_DURATION) return null;
  const sign = side === 'left' ? -1 : 1;
  const rest = { sideways: 0, forward: 0, height: .025, bend: 0 };
  const chamber = { sideways: sign * .075, forward: .14, height: .45, bend: .85 };
  const extended = aimed ? { sideways: aimed.sideways, forward: aimed.forward,
    height: aimed.height, bend: 0 }
    : { sideways: sign * .12, forward: -.78, height: .55, bend: 0 };
  if (seconds < .20) return between(rest, chamber, seconds / .20);
  if (seconds < .40) return between(chamber, extended, (seconds - .20) / .20);
  return between(extended, rest, (seconds - .40) / .32);
}

function orient(bone, worldDirection, dt) {
  if (!bone?.parent || worldDirection.lengthSq() < 1e-9) return;
  const parentWorld = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  const local = worldDirection.clone().applyQuaternion(parentWorld).normalize();
  const rotation = new THREE.Quaternion().setFromUnitVectors(DOWN, local);
  bone.quaternion.slerp(rotation, 1 - Math.exp(-20 * dt));
  bone.updateWorldMatrix(true, false);
}

export function applyTwoBoneIK(upper, lower, lowerLength, target, pole, dt) {
  if (!upper || !lower || !(lowerLength > 0)) return false;
  upper.updateWorldMatrix(true, true);
  const start = upper.getWorldPosition(new THREE.Vector3());
  const solved = solveTwoBone(start, target, lower.position.length(), lowerLength, pole);
  if (!solved) return false;
  orient(upper, solved.elbow.clone().sub(start), dt);
  const actualElbow = lower.getWorldPosition(new THREE.Vector3());
  orient(lower, solved.end.clone().sub(actualElbow), dt);
  return true;
}

/** Procedural-avatar IK overlay: locomotion continues controlling unselected limbs. */
export class BodyIK {
  constructor(avatar) {
    this.avatar = avatar;
    this.steps = { left: null, right: null };
    this.kicks = { left: null, right: null };
    this.armTargets = { left: null, right: null };
    this.wristTargets = { left: null, right: null };
  }
  clearSteps() {
    this.steps.left = null;
    this.steps.right = null;
  }
  cancelKicks() {
    this.kicks.left = null;
    this.kicks.right = null;
  }
  clearPoseTargets() {
    this.clearSteps();
    this.cancelKicks();
    this.armTargets.left = this.armTargets.right = null;
    this.wristTargets.left = this.wristTargets.right = null;
  }
  placeFoot(side, viewYaw, bodyYaw) {
    if (side !== 'left' && side !== 'right') return;
    this.steps[side] = { ...footStepOffset(viewYaw, bodyYaw), bend: 0 };
  }
  kick(side, look = null, bodyYaw = 0) {
    if (side !== 'left' && side !== 'right') return;
    this.kicks[side] = { elapsed: 0,
      aimed: look ? aimFootTarget(look, bodyYaw, side) : null };
  }
  controlLegs(dt, keys, look, bodyYaw) {
    if (!keys || !look) return;
    const bendHeld = keys.has('ControlLeft') || keys.has('ControlRight');
    for (const [side, selection] of [['left', 'KeyA'], ['right', 'KeyD']]) {
      if (!keys.has(selection)) continue;
      const aimed = aimFootTarget(look, bodyYaw, side);
      const previous = this.steps[side] || aimed;
      this.steps[side] = {
        sideways: THREE.MathUtils.damp(previous.sideways, aimed.sideways, 18, dt),
        forward: THREE.MathUtils.damp(previous.forward, aimed.forward, 18, dt),
        height: THREE.MathUtils.damp(previous.height, aimed.height, 18, dt),
        bend: THREE.MathUtils.damp(previous.bend ?? 0, bendHeld ? 1 : 0,
          bendHeld ? 12 : 9, dt),
      };
    }
  }
  /** Z+S+A/D: aim arms at the camera reticle, regardless of sitting,
   * kneeling or lying. Targets persist in BODY-local space on key release.
   */
  controlArms(keys, eye, look, right) {
    if (!keys || !look || !eye || !right) return;
    this.avatar.root.updateWorldMatrix(true, true);
    for (const [side, code, sign] of [['left','KeyA',-1],['right','KeyD',1]]) {
      if (!keys.has(code)) continue;
      const target = eye.clone().addScaledVector(look, .46)
        .addScaledVector(right, sign * .17)
        .add(new THREE.Vector3(0, -.15, 0));
      // Held Ctrl folds the selected elbow without changing the hand aim.
      if (keys.has('ControlLeft') || keys.has('ControlRight'))
        target.lerp((side==='left'?this.avatar.leftArm:this.avatar.rightArm)
          .getWorldPosition(new THREE.Vector3()), .42);
      this.armTargets[side] = this.avatar.body.worldToLocal(target);
    }
  }
  /** Z+Q+A/D: wrist orientation and finger flexion are persistent edits. */
  controlWrists(keys, look) {
    if (!keys || !look) return;
    for (const [side, code] of [['left','KeyA'],['right','KeyD']]) {
      if (!keys.has(code)) continue;
      this.wristTargets[side] = {
        pitch: clamp(-look.y*.82, -.85,.85),
        yaw: clamp(look.x*.62, -.63,.63),
        curl: keys.has('ControlLeft') || keys.has('ControlRight') ? .64 : 0,
      };
    }
  }
  updateWrists(dt) {
    for (const side of ['left','right']) {
      const wrist = (side==='left'?this.avatar.leftArm:this.avatar.rightArm)?.userData.hand;
      const target=this.wristTargets[side];
      if (!wrist || !target) continue;
      wrist.rotation.x=THREE.MathUtils.damp(wrist.rotation.x,target.pitch,14,dt);
      wrist.rotation.y=THREE.MathUtils.damp(wrist.rotation.y,target.yaw,14,dt);
      for (const finger of wrist.userData.fingers ?? [])
        finger.rotation.x=THREE.MathUtils.damp(finger.rotation.x,target.curl,13,dt);
    }
  }
  update(dt, { hands, eye, look, right, posture, precision, keys, bodyYaw = 0 }) {
    // Arbitrary VRM/GLB bind axes require an explicit source-specific retargeter.
    if (this.avatar.external) return;
    if (posture !== 'stand') this.cancelKicks();
    if (precision && keys?.has('KeyS')) this.controlArms(keys, eye, look, right);
    else if (precision && keys?.has('KeyQ')) this.controlWrists(keys, look);
    else if (precision) this.controlLegs(dt, keys, look, bodyYaw);
    this.updateArms(dt, hands, eye, look, right, posture === 'stand' && !precision);
    this.updateLegs(dt, posture === 'stand', precision);
    this.updateWrists(dt);
  }
  updateArms(dt, hands, eye, look, right, enabled) {
    for (const [side, sign] of [['left', -1], ['right', 1]]) {
      const upper = side === 'left' ? this.avatar.leftArm : this.avatar.rightArm;
      const lower = upper?.userData.elbow, wrist = upper?.userData.hand;
      if (!upper || !lower || !wrist) continue;
      if (enabled && hands[side]?.pressed) {
        const grip = hands[side];
        const reach = clamp(.47 + (grip.distance - 1.55) * .10, .35, .58);
        const target = eye.clone().addScaledVector(look, reach)
          .addScaledVector(right, sign * .15).add(new THREE.Vector3(0, -.19, 0));
        const pole = right.clone().multiplyScalar(sign * .75)
          .add(new THREE.Vector3(0, -.28, .18)).normalize();
        applyTwoBoneIK(upper, lower, -wrist.position.y, target, pole, dt);
      } else if (this.armTargets[side]) {
        this.avatar.root.updateWorldMatrix(true, true);
        const target = this.avatar.body.localToWorld(this.armTargets[side].clone());
        const pole = right.clone().multiplyScalar(sign * .75)
          .add(new THREE.Vector3(0,-.25,.22)).normalize();
        applyTwoBoneIK(upper, lower, -wrist.position.y, target, pole, dt);
      } else {
        const spread = this.avatar.softAvatar ? sign * this.avatar.profile.armSpread : 0;
        upper.rotation.y = THREE.MathUtils.damp(upper.rotation.y, 0, 13, dt);
        upper.rotation.z = THREE.MathUtils.damp(upper.rotation.z, spread, 13, dt);
        for (const axis of ['x', 'y', 'z']) {
          lower.rotation[axis] = THREE.MathUtils.damp(lower.rotation[axis], 0, 13, dt);
        }
      }
    }
  }
  updateLegs(dt, standing, precision) {
    const avatar = this.avatar;
    avatar.root.updateWorldMatrix(true, true);
    for (const side of ['left', 'right']) {
      const upper = side === 'left' ? avatar.leftLeg : avatar.rightLeg;
      const knee = upper?.userData.knee;
      if (!upper || !knee) continue;
      const foot = knee.children.find(obj => obj.name === 'hemisphere-foot');
      const kick = this.kicks[side];
      const kickPose = standing && kick ? kickFootPose(kick.elapsed, side, kick.aimed) : null;
      if (kick) {
        kick.elapsed += dt;
        if (!standing || kick.elapsed >= KICK_DURATION) this.kicks[side] = null;
      }
      // Retain the last user-directed target when Z is released. Locomotion
      // clears the targets explicitly in Player; idle frames never do.
      const step = kickPose || this.steps[side];
      if (step) {
        // Ctrl pulls the foot closer to the thigh, causing a pronounced knee fold.
        const bend = step.bend ?? 0;
        const target = avatar.body.localToWorld(new THREE.Vector3(
          upper.position.x + step.sideways,
          Math.max(step.height, .40 * bend + .02),
          THREE.MathUtils.lerp(step.forward, .12, bend * .72)));
        // Reverse the previously incorrect manual knee bend plane without
        // inverting the seated/posture animation angles.
        const bendPole = new THREE.Vector3(
          (side === 'left' ? -1 : 1) * .15 + step.sideways * .38,
          .12, 1).normalize();
        const pole = bendPole.applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion()));
        const length = foot ? -foot.position.y :
          avatar.profile.height * avatar.profile.legRatio + knee.position.y;
        if (applyTwoBoneIK(upper, knee, length, target, pole, dt) && foot) {
          const parent = knee.getWorldQuaternion(new THREE.Quaternion()).invert();
          const upright = avatar.root.getWorldQuaternion(new THREE.Quaternion());
          foot.quaternion.slerp(parent.multiply(upright), 1 - Math.exp(-15 * dt));
        }
      } else {
        // Nonstanding variants set hip yaw/roll and knee yaw. Do not erase
        // those angles just because no precision target is active.
        if (standing) {
          upper.rotation.y = THREE.MathUtils.damp(upper.rotation.y, 0, 12, dt);
          upper.rotation.z = THREE.MathUtils.damp(upper.rotation.z, 0, 12, dt);
          knee.rotation.y = THREE.MathUtils.damp(knee.rotation.y, 0, 12, dt);
          knee.rotation.z = THREE.MathUtils.damp(knee.rotation.z, 0, 12, dt);
        }
        if (foot) foot.quaternion.slerp(IDENTITY, 1 - Math.exp(-12 * dt));
      }
    }
  }
}
