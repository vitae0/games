import * as THREE from 'three';
import { Avatar } from '../avatar/Avatar.js';
import { normalizeAvatar } from '../avatar/AvatarConfig.js';

const UP = new THREE.Vector3(0, 1, 0);

/** Local simulated characters. Multiplayer presence requires a future network transport. */
export class Actors {
  constructor(scene, collisions, toast) {
    this.scene = scene; this.collisions = collisions; this.toast = toast;
    this.people = [
      this.create('Mira · Resepsiyon', -5.1, -13.05, Math.PI, 'chrome', 'bob', true, 'honey', 'hazel'),
      this.create('Nova · Otel misafiri', 0.0, -8.4, Math.PI, 'neon', 'long', false, 'warm', 'green'),
    ];
    this.grips = new Map();
  }
  create(name, x, z, yaw, outfit, hair, anchored, skinTone, eyeColor) {
    const avatar = new Avatar(this.scene, normalizeAvatar({ outfit, hair, visor: false, skinTone, eyeColor }));
    avatar.root.position.set(x, 0, z);
    avatar.root.rotation.y = yaw;
    return { name, avatar, anchored, start: new THREE.Vector3(x, 0, z), position: new THREE.Vector3(x, 0, z), yaw, phase: 0 };
  }
  handPoint(person, side) {
    const sign = side === 'left' ? -1 : 1;
    const local = new THREE.Vector3(sign * .45, person.avatar.profile.height * .69, -.32);
    local.applyAxisAngle(UP, person.yaw);
    return person.position.clone().add(local);
  }
  nearestHand(origin, direction, maxReach = 3.3) {
    let candidate = null, best = Infinity;
    for (const actor of this.people) for (const hand of ['left', 'right']) {
      const handPos = this.handPoint(actor, hand);
      const offset = handPos.sub(origin);
      const along = offset.dot(direction);
      if (along < .1 || along > maxReach) continue;
      const offAxis = offset.addScaledVector(direction, -along).length();
      if (offAxis > .53 || along > best) continue;
      candidate = { actor, hand }; best = along;
    }
    return candidate;
  }
  grab(localHand, actor, remoteHand) {
    if (Array.from(this.grips.values()).some(g => g.actor === actor && g.remoteHand === remoteHand)) return false;
    this.grips.set(localHand, { actor, remoteHand, target: this.handPoint(actor, remoteHand) });
    return true;
  }
  setTarget(localHand, target) {
    const grip = this.grips.get(localHand);
    if (grip) grip.target.copy(target);
  }
  release(localHand) { this.grips.delete(localHand); }
  getNearby(player) {
    if (player.floor !== 0) return null;
    const forward = player.direction;
    return this.people.find(actor => {
      const d = actor.position.clone().sub(player.position);
      return d.length() < 2.75 && d.dot(forward) > -.1;
    }) || null;
  }
  update(dt) {
    for (const actor of this.people) {
      const active = [...this.grips.values()].filter(g => g.actor === actor);
      if (active.length) {
        let pullX = 0, pullZ = 0;
        for (const grip of active) {
          const offset = grip.target.clone().sub(this.handPoint(actor, grip.remoteHand));
          pullX += offset.x; pullZ += offset.z;
        }
        // The receptionist remains behind the counter; guests can be moved gently.
        const max = actor.anchored ? .32 : 4;
        const nextX = actor.position.x + THREE.MathUtils.clamp(pullX * dt * 2.6, -.12, .12);
        const nextZ = actor.position.z + THREE.MathUtils.clamp(pullZ * dt * 2.6, -.12, .12);
        const radius = .28;
        const moved = this.collisions.move(0, actor.position.x, actor.position.z,
          nextX - actor.position.x, nextZ - actor.position.z, radius);
        const clamped = new THREE.Vector3(moved.x, 0, moved.z).sub(actor.start).clampLength(0, max).add(actor.start);
        actor.position.lerp(clamped, Math.min(1, dt * 12));
      } else if (!actor.anchored) {
        actor.position.lerp(actor.start, Math.min(1, dt * .08));
      }
      actor.avatar.root.position.copy(actor.position);
      actor.avatar.root.rotation.y = actor.yaw;
      actor.avatar.update(dt, 0, 'stand');
      actor.avatar.leftArm.rotation.x = THREE.MathUtils.damp(actor.avatar.leftArm.rotation.x,
        active.some(g => g.remoteHand === 'left') ? 1.2 : .17, 10, dt);
      actor.avatar.rightArm.rotation.x = THREE.MathUtils.damp(actor.avatar.rightArm.rotation.x,
        active.some(g => g.remoteHand === 'right') ? 1.2 : .12, 10, dt);
    }
  }
  dispose() { for (const actor of this.people) actor.avatar.dispose(); }
}
