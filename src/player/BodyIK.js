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
  return { sideways: clamp(-Math.sin(turn) * .27, -.12, .12),
    forward: -.29 * Math.cos(turn), height: .095 };
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
  }
  clearSteps() {
    this.steps.left = null;
    this.steps.right = null;
  }
  placeFoot(side, viewYaw, bodyYaw) {
    if (side === 'left' || side === 'right') this.steps[side] = footStepOffset(viewYaw, bodyYaw);
  }
  update(dt, { hands, eye, look, right, posture, precision }) {
    // Arbitrary VRM/GLB bind axes require an explicit source-specific retargeter.
    if (this.avatar.external) return;
    this.updateArms(dt, hands, eye, look, right, posture === 'stand' && !precision);
    this.updateLegs(dt, posture === 'stand' && precision);
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
  updateLegs(dt, enabled) {
    const avatar = this.avatar;
    avatar.root.updateWorldMatrix(true, true);
    for (const side of ['left', 'right']) {
      const upper = side === 'left' ? avatar.leftLeg : avatar.rightLeg;
      const knee = upper?.userData.knee;
      if (!upper || !knee) continue;
      const foot = knee.children.find(obj => obj.name === 'hemisphere-foot');
      const step = enabled ? this.steps[side] : null;
      if (step) {
        const target = avatar.body.localToWorld(new THREE.Vector3(
          upper.position.x + step.sideways, step.height, step.forward));
        const pole = new THREE.Vector3(0, .1, -1)
          .applyQuaternion(avatar.root.getWorldQuaternion(new THREE.Quaternion())).normalize();
        const length = foot ? -foot.position.y :
          avatar.profile.height * avatar.profile.legRatio + knee.position.y;
        if (applyTwoBoneIK(upper, knee, length, target, pole, dt) && foot) {
          const parent = knee.getWorldQuaternion(new THREE.Quaternion()).invert();
          const upright = avatar.root.getWorldQuaternion(new THREE.Quaternion());
          foot.quaternion.slerp(parent.multiply(upright), 1 - Math.exp(-15 * dt));
        }
      } else {
        upper.rotation.y = THREE.MathUtils.damp(upper.rotation.y, 0, 12, dt);
        upper.rotation.z = THREE.MathUtils.damp(upper.rotation.z, 0, 12, dt);
        knee.rotation.y = THREE.MathUtils.damp(knee.rotation.y, 0, 12, dt);
        knee.rotation.z = THREE.MathUtils.damp(knee.rotation.z, 0, 12, dt);
        if (foot) foot.quaternion.slerp(IDENTITY, 1 - Math.exp(-12 * dt));
      }
    }
  }
}
