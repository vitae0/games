import * as THREE from 'three';

/** Contact position in the deformable body, independent of the foot-level origin. */
export function furnitureContactAnchor(profile, style) {
  const height = profile.height, leg = height * profile.legRatio;
  if (style === 'sleep' || style === 'rest') {
    return { localY: height * .63, localZ: .075, clearance: .035 };
  }
  return { localY: leg - height * .068, localZ: .065, clearance: .018 };
}

/** Align pelvis/back to the actual seat or mattress top every frame.
 * Profile morphs, procedural knee articulation and seat compression stay in sync.
 */
export function alignAvatarToFurniture(avatar, target, style) {
  if (!avatar?.body || !avatar?.root) return null;
  const a = furnitureContactAnchor(avatar.profile, style);
  const measured = avatar.body.localToWorld(new THREE.Vector3(0, a.localY, a.localZ));
  const delta = target.clone().add(new THREE.Vector3(0, a.clearance, 0)).sub(measured);
  avatar.root.position.add(delta);
  avatar.root.updateWorldMatrix(true, true);
  return delta;
}
