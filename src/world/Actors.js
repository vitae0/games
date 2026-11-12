import * as THREE from 'three';
import { Avatar } from '../avatar/Avatar.js';
import { NPC_CAST, npcProfile, validateNpcCast } from './NpcCast.js';
import { loadNpcModel, tintNpcClothing } from './NpcModelPool.js';

const UP = new THREE.Vector3(0, 1, 0);
const LOAD_DISTANCE = 15; // Stream heavy VRMs only when the NPC may enter view.
const DRAW_DISTANCE = 21;

/** Local simulated characters. Multiplayer presence requires a future network transport. */
export class Actors {
  constructor(scene, collisions, toast) {
    this.scene = scene;
    this.collisions = collisions;
    this.toast = toast;
    this.disposed = false;
    validateNpcCast();
    this.people = NPC_CAST.map(spec => this.create(spec));
    this.grips = new Map();
  }

  create(spec) {
    const profile = npcProfile(spec);
    const avatar = new Avatar(this.scene, profile);
    avatar.root.position.set(spec.x, 0, spec.z);
    avatar.root.rotation.y = spec.yaw;
    // Soft characters are ready instantly. Only the optional legacy VRoid
    // variants require distance-triggered network loading.
    const procedural = profile.baseModel === 'soft';
    avatar.body.visible = procedural;
    return {
      id: spec.id, name: spec.name, spec,
      avatar, anchored: spec.anchored,
      start: new THREE.Vector3(spec.x, 0, spec.z),
      position: new THREE.Vector3(spec.x, 0, spec.z),
      yaw: spec.yaw, phase: 0, ready: procedural,
      loading: false, error: null,
    };
  }

  async loadVisual(actor) {
    if (actor.loading || this.disposed) return;
    actor.loading = true;
    try {
      // Clone the SKINNED rig while sharing source geometry and textures.
      // Never assign one mutable material/skeleton to all NPCs.
      const model = await loadNpcModel(actor.spec.asset);
      if (this.disposed || !this.people.includes(actor)) {
        // A scene unload can happen while VRMs load. The pooled geometry
        // survives, but the isolated copy's materials must be discarded.
        model.scene.traverse(obj => {
          if (!obj.isMesh) return;
          for (const m of Array.isArray(obj.material) ? obj.material : [obj.material])
            m?.dispose();
        });
        return;
      }
      actor.avatar.applyExternal(model, `npc:${actor.spec.asset}`);
      tintNpcClothing(actor.avatar.external.group, actor.spec);
      actor.ready = true;
    } catch (error) {
      actor.error = error?.message || String(error);
      // The fallback is deliberate, not a claim of a successful VRM load.
      // Keep the previous geometric character available on failed networks.
      actor.avatar.body.visible = true;
      actor.ready = true;
      console.warn(`NPC ${actor.id} ready-made CC0 VRoid could not load:`, error);
    }
  }

  handPoint(person, side) {
    // Procedural actors expose actual animated hand anchors, so grabbing them
    // remains aligned even after changing arm length or shoulder width.
    if (person.avatar.profile.baseModel === 'soft') {
      const arm = side === 'left' ? person.avatar.leftArm : person.avatar.rightArm;
      const hand = arm?.userData.hand;
      if (hand) return hand.getWorldPosition(new THREE.Vector3());
    }
    const sign = side === 'left' ? -1 : 1;
    const local = new THREE.Vector3(sign * .45, person.avatar.profile.height * .69, -.32);
    local.applyAxisAngle(UP, person.yaw);
    return person.position.clone().add(local);
  }
  nearestHand(origin, direction, maxReach = 3.3) {
    let candidate = null, best = Infinity;
    for (const actor of this.people) if (actor.ready) for (const hand of ['left', 'right']) {
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
      if (!actor.ready) return false;
      const d = actor.position.clone().sub(player.position);
      return d.length() < 2.75 && d.dot(forward) > -.1;
    }) || null;
  }
  update(dt, player = null) {
    for (const actor of this.people) {
      const distance = player && player.floor === 0
        ? Math.hypot(player.position.x - actor.position.x, player.position.z - actor.position.z)
        : player ? Infinity : 0;
      const near = distance <= DRAW_DISTANCE;
      actor.avatar.root.visible = near && actor.ready;
      if (distance <= LOAD_DISTANCE && !actor.ready && !actor.loading) void this.loadVisual(actor);
      if (!near || !actor.ready) continue;
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
  dispose() {
    this.disposed = true;
    this.grips.clear();
    for (const actor of this.people) actor.avatar.dispose();
  }
}
