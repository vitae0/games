import * as THREE from 'three';

/**
 * Event-driven, allocation-free furniture tweening. Only moving objects are
 * visited on each frame; thousands of closed doors cost zero animation work.
 * Values are normalized (0 closed / unoccupied, 1 opened / occupied).
 */
export class FurnitureMotion {
  constructor() {
    this.active = new Set();
  }

  create(apply, rate = 11) {
    if (typeof apply !== 'function' || !Number.isFinite(rate) || rate <= 0)
      throw new TypeError('Furniture motion needs a callback and a positive rate');
    const rig = {
      value: 0,
      target: 0,
      set: (target) => {
        if (!Number.isFinite(target)) throw new TypeError('Invalid furniture target');
        rig.target = THREE.MathUtils.clamp(target, 0, 1);
        if (Math.abs(rig.value - rig.target) > 1e-4) this.active.add(rig);
      },
      apply,
      rate,
    };
    apply(0);
    return rig;
  }

  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const step = Math.min(dt, .075);
    for (const rig of this.active) {
      rig.value += (rig.target - rig.value) * (1 - Math.exp(-rig.rate * step));
      if (Math.abs(rig.value - rig.target) < .0008) {
        rig.value = rig.target;
        this.active.delete(rig);
      }
      rig.apply(rig.value);
    }
  }

  dispose() {
    this.active.clear();
  }
}

function unitCube(hotel) {
  // Production uses Hotel's existing shared unit box (one GPU buffer).
  // Lightweight fixture tests can create a single lazy fallback box.
  if (hotel.propGeometry) return hotel.propGeometry;
  return hotel._furnitureUnitCube ||= new THREE.BoxGeometry(1, 1, 1);
}

/** Dynamic box, sharing both geometry and material with ordinary furnishings. */
export function furniturePart(hotel, material, x, y, z, w, h, d, name = '') {
  const part = new THREE.Mesh(unitCube(hotel), hotel.materials[material]);
  part.name = name;
  part.position.set(x, y, z);
  part.scale.set(w, h, d);
  hotel.scene.add(part);
  hotel.suiteMeshes.push(part);
  return part;
}

/** Actual hinged facade in a stable pivot group. Hinges on either edge. */
export function furnitureDoor(hotel, {
  x, y, z, width, height, thickness = .045,
  hinge = 'left', material = 'wood', angle = Math.PI * .48, name = 'furniture-door',
}) {
  const sign = hinge === 'left' ? -1 : 1;
  const pivot = new THREE.Group();
  pivot.name = name;
  pivot.position.set(x + sign * width * .5, y, z);
  const leaf = new THREE.Mesh(unitCube(hotel), hotel.materials[material]);
  leaf.scale.set(width, height, thickness);
  leaf.position.x = -sign * width * .5;
  leaf.name = name + '-leaf';
  pivot.add(leaf);
  const handle = new THREE.Mesh(unitCube(hotel), hotel.materials.warm ?? hotel.materials[material]);
  handle.position.set(-sign * (width - .07), -.04, -thickness * .54);
  handle.scale.set(.025, Math.min(height * .24, .22), .025);
  pivot.add(handle);
  hotel.scene.add(pivot);
  hotel.suiteMeshes.push(pivot);
  const motion = hotel.furnitureMotion?.create(t => {
    // Both edges swing toward the room (-Z) instead of clipping into the case.
    pivot.rotation.y = (hinge === 'left' ? 1 : -1) * angle * t;
  }, 10);
  return { pivot, motion, setOpen(open) {
    if (motion) motion.set(open ? 1 : 0);
    else pivot.rotation.y = (hinge === 'left' ? 1 : -1) * angle * (open ? 1 : 0);
  } };
}

/** Sliding drawer facade with a small solid tray and an attached handle. */
export function furnitureDrawer(hotel, {
  x, y, z, width = .42, height = .18, reach = .30, name = 'drawer',
}) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  const box = unitCube(hotel);
  const front = new THREE.Mesh(box, hotel.materials.wood);
  front.scale.set(width, height, .045);
  group.add(front);
  const handle = new THREE.Mesh(box, hotel.materials.warm ?? hotel.materials.trim);
  handle.position.set(0, 0, -.035);
  handle.scale.set(width * .30, .028, .022);
  group.add(handle);
  const tray = new THREE.Mesh(box, hotel.materials.black);
  tray.position.set(0, -height * .37, reach * .38);
  tray.scale.set(width * .89, .027, reach * .76);
  group.add(tray);
  hotel.scene.add(group);
  hotel.suiteMeshes.push(group);
  const motion = hotel.furnitureMotion?.create(t => {
    group.position.z = z - reach * t;
    group.position.y = y - .006 * Math.sin(Math.PI * t);
  }, 10.5);
  return { group, motion, setOpen(open) {
    if (motion) motion.set(open ? 1 : 0);
    else group.position.z = z - reach * (open ? 1 : 0);
  } };
}

/** Reusable compression tween for a movable rounded seat or mattress segment. */
export function furnitureSeat(hotel, {
  x, y, z, width, height, depth, material = 'fabric', name = 'seat',
  compression = .055, swivel = 0,
}) {
  const part = new THREE.Mesh(
    hotel.roundedBatch?.geometry ?? unitCube(hotel), hotel.materials[material],
  );
  part.name = name;
  part.position.set(x, y, z);
  part.scale.set(width, height, depth);
  hotel.scene.add(part);
  hotel.suiteMeshes.push(part);
  const motion = hotel.furnitureMotion?.create(t => {
    part.position.y = y - compression * t * .52;
    part.scale.y = height - compression * t;
    part.rotation.y = swivel * t;
  }, 8);
  return { part, motion, setOccupied(occupied) {
    if (motion) motion.set(occupied ? 1 : 0);
    else {
      part.position.y = y - compression * (occupied ? .52 : 0);
      part.scale.y = height - compression * (occupied ? 1 : 0);
      part.rotation.y = swivel * (occupied ? 1 : 0);
    }
  } };
}
