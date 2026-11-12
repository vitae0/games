import * as THREE from 'three';

/** Empty attachment points for future licensed / user-provided hairstyles.
 * They are transforms only: no placeholder polygons, no external fetches,
 * no licensing assumptions, and no extra draw calls on the hairless avatar.
 */
export const HAIR_SLOTS = Object.freeze([
  'scalp', 'fringe', 'left-temple', 'right-temple', 'crown', 'back', 'accessory',
]);

export function createHairMounts(head, radius) {
  if (!head?.isObject3D || !Number.isFinite(radius) || radius <= 0)
    throw new TypeError('A head Object3D and positive radius are required');
  const existing = head.getObjectByName('hair-root');
  if (existing) return existing;
  const root = new THREE.Group();
  root.name = 'hair-root';
  root.userData.kind = 'hair-attachment-rig';
  const positions = {
    scalp: [0, radius * .76, 0],
    fringe: [0, radius * .62, -radius * .68],
    'left-temple': [-radius * .83, radius * .25, -radius * .20],
    'right-temple': [radius * .83, radius * .25, -radius * .20],
    crown: [0, radius * .96, 0],
    back: [0, radius * .32, radius * .86],
    accessory: [0, radius * .98, -radius * .08],
  };
  for (const name of HAIR_SLOTS) {
    const slot = new THREE.Group();
    slot.name = 'hair-slot-' + name;
    slot.position.set(...positions[name]);
    slot.userData.hairSlot = name;
    root.add(slot);
  }
  head.add(root);
  return root;
}

/** Attach explicitly supplied hair geometry, not an invented or bundled asset. */
export function mountHairPiece(head, slotName, object) {
  if (!HAIR_SLOTS.includes(slotName) || !object?.isObject3D)
    throw new TypeError('Unknown hair attachment or invalid hair object');
  const slot = head.getObjectByName('hair-slot-' + slotName);
  if (!slot) throw new Error('Hair rig has not been initialized');
  slot.add(object);
  return object;
}
