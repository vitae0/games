/** Dependency-free wardrobe visibility rules for procedural layer testing. */
export const GARMENT_LAYER_FIELDS = Object.freeze({
  shirt: 'shirtVisible',
  jacket: 'jacketVisible',
  pants: 'pantsVisible',
  shoes: 'shoesVisible',
});
export function visibleGarmentLayers(profile) {
  const naked = profile.outfit === 'none';
  return Object.fromEntries(Object.entries(GARMENT_LAYER_FIELDS).map(
    ([layer, field]) => [layer, !naked && profile[field] !== false]
  ));
}
