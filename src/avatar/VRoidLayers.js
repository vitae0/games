/**
 * VRoid beta base models export some clothing as independently named materials.
 * Hiding a MATERIAL (rather than deleting a skinned mesh) preserves skeleton,
 * vertex weights and body meshes, but cannot reconstruct missing skin geometry.
 */
export function classifyVRoidMaterial(name = '') {
  const s = String(name).toLowerCase();
  if (/shoe|footwear|boot|sock|sneaker/.test(s)) return 'shoes';
  if (/bottom|pants|trouser|skirt|jeans|legwear/.test(s)) return 'pants';
  if (/tops|outerwear|upper.?cloth|shirt|jacket|hood|sweat|suit|vest|coat|tie|ribbon|cloth/.test(s)) return 'shirt';
  if (/body|skin|face|eye|iris|brow|lash|mouth|hair|nail|lip/.test(s)) return 'body';
  return 'other';
}

export function vroidMaterialVisibility(materialName, profile = {}) {
  const category = classifyVRoidMaterial(materialName);
  if (category === 'body' || category === 'other') return true;
  if (profile.outfit === 'none') return false;
  const flags = { shirt: 'shirtVisible', pants: 'pantsVisible', shoes: 'shoesVisible' };
  return profile[flags[category]] !== false;
}

export function applyVRoidWardrobe(scene, profile) {
  let garments = 0, hidden = 0, skin = 0;
  const seen = new Set();
  scene.traverse(obj => {
    if (!obj.isMesh) return;
    for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      if (!material || seen.has(material)) continue;
      seen.add(material);
      const category = classifyVRoidMaterial(material.name);
      if (category === 'body') skin++;
      if (category === 'shirt' || category === 'pants' || category === 'shoes') {
        garments++;
        material.visible = vroidMaterialVisibility(material.name, profile);
        if (!material.visible) hidden++;
      }
    }
  });
  return { garments, hidden, skin };
}
