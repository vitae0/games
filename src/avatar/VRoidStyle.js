import * as THREE from 'three';
import { EYE_COLORS, SKIN_TONES, HAIR_COLORS } from './AvatarConfig.js';
import { discardPremadeHair } from './VRoidPremadeHair.js';

const isBodySkin = name => /body.*skin|body_skin/i.test(name.toLowerCase());
const isFaceSkin = name => /face.*skin|face_skin/i.test(name.toLowerCase());
const isHair = name => /hair/i.test(name.toLowerCase());
const isIris = name => /iris/i.test(name.toLowerCase());

export function styleMaterialClass(name) {
  if (isBodySkin(name)) return 'body';
  if (isFaceSkin(name)) return 'face';
  if (isHair(name)) return 'hair';
  if (isIris(name)) return 'iris';
  return 'other';
}

/** Only recolor authentic source assets. Never generate hair or clothing shapes. */
export function applyVRoidColors(vrm, profile, state) {
  const cache = state.materialCache ||= new Map();
  vrm.scene.traverse(obj => {
    if (!obj.isMesh || obj.name?.startsWith('VRoid_CC0_')) return;
    for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      if (!material) continue;
      if (!cache.has(material)) {
        cache.set(material, {
          color: material.color?.clone(), map: material.map,
          alphaTest: material.alphaTest, transparent: material.transparent,
          opacity: material.opacity,
        });
      }
      const original = cache.get(material);
      const type = styleMaterialClass(material.name);
      if (type === 'body') {
        // "Underwear: source texture" restores VRoid's actual prepared body
        // texture. It is a baked source texture, NOT a modular underwear mesh.
        const useOriginal = profile.underwear === 'original';
        const desiredMap = useOriginal ? original.map : null;
        if (material.map !== desiredMap) {
          material.map = desiredMap;
          material.needsUpdate = true;
        }
        const newAlpha = useOriginal ? original.alphaTest : 0;
        if (material.alphaTest !== newAlpha) {
          material.alphaTest = newAlpha;
          material.needsUpdate = true;
        }
        material.transparent = useOriginal ? original.transparent : false;
        material.opacity = useOriginal ? original.opacity : 1;
        if (original.color && material.color) {
          if (useOriginal) material.color.copy(original.color);
          else material.color.setHex(SKIN_TONES[profile.skinTone]);
        }
        material.visible = true;
      } else if (type === 'face') {
        if (original.color && material.color) {
          material.color.copy(original.color).multiply(
            new THREE.Color(SKIN_TONES[profile.skinTone]).lerp(new THREE.Color(0xffffff), .7)
          );
        }
      } else if (type === 'iris') {
        material.color?.setHex(EYE_COLORS[profile.eyeColor]);
      } else if (type === 'hair') {
        // HairSample NPCs already carry the authored, rigged hair mesh.
        // The base models need a separate CC0 HairSample hair transplant.
        const keep = state.keepSourceHair && profile.hair !== 'none';
        material.visible = Boolean(keep);
        if (keep && material.color) {
          if (profile.hairColor === 'original') {
            if (material.map !== original.map) { material.map = original.map; material.needsUpdate = true; }
            if (original.color) material.color.copy(original.color);
          } else {
            if (material.map) { material.map = null; material.needsUpdate = true; }
            material.color.setHex(HAIR_COLORS[profile.hairColor] ?? HAIR_COLORS.chestnut);
          }
        }
      }
    }
  });
}

export function disposeVRoidStyle(state) {
  if (!state) return;
  state.hairRequest = (state.hairRequest || 0) + 1;
  discardPremadeHair(state.hairRoot);
  state.hairRoot = null;
  state.hairKey = null;
}
