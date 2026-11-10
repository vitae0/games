> **Arşiv / V4:** Bu sayfa eski prototipin ürettiği saç ve iç giyim
> geometrilerini anlatır. Bu özellikler artık kullanılmıyor. Güncel
> mimari: [Character Studio V5 — hazır CC0 varlıklar](VROID_PREMADE_ASSETS.md).

# VRoid CC0 Character Studio V4

This implementation replaces the legacy procedural-avatar customization panel
with controls for **only the two pinned CC0 VRoid beta base models**.

## Available controls

- Base model: male/female.
- Head: hairstyle (none, short, layered bob, long, ponytail), hair color.
- Face: original textured VRoid face, adjustable iris tint, skin tone tint.
- Underwear: **none**, **basic** (briefs + top for female), **sport**
  (longer shorts + top for female). Five fabric colors.
- Original example clothing: none or visible. Existing independent VRoid
  garment materials are reused only for the "original example outfit" option.

`none` means no *extra* underwear geometry and original VRoid clothing materials
are hidden. Since early VRoid beta body textures can have clothing imagery baked
into them, **body skin maps are cleared** for the neutral base and the material
is replaced with a simple, flat skin color. The face texture, eyes, brows and lips
are preserved. It is a stylized/non-explicit game avatar; no anatomical detail
is added.

## How underwear is built

Underwear is NOT a floating non-rigged cube/cylinder. We take triangles from
the character's **existing body mesh** around the pelvis (and, for the female
model, the chest), clone the original skin indices/weights, offset surface by
3 mm along normals, and bind them to the **exact original Three.js Skeleton**.
The fabric color/visibility is independent of the body and outerwear.
This is an initial body-conforming trial, not finalized garment topology. Seams
are currently selected by height, so ragged edges or holes can appear.

Crucially, clearing a VRM clothing texture **does not restore missing underlying
body geometry**. The body mesh may omit surface patches under some original
clothing. We do not claim to have reconstructed missing anatomy, eliminated
every intersection, or produced perfect naked bases. That requires inspecting
the source topology and constructing a full neutral game body if necessary.

## Hair, eyes, performance

The beta base male character has only a scalp/hair cap. We therefore add
original lightweight procedural stylized hair meshes attached to the VRM head
bone. Hair and underwear follow the rig, while eyes tint the actual iris
material. No binary hair or underwear asset is required.

Changing hair, eye or underwear appearance reuses the loaded VRM. The render
component does not reconstruct the full avatar rig or download source models
on every selection change. Two base models remain lazy-loaded, as before.

The Character Studio opens with a temporary third-person camera for preview
and restores the prior camera mode on close.

## Known limitations

- A *true* complete unoccluded skin mesh is not proved for these VRoid source
  samples. Nude silhouette should be visually checked at full bend/crouch/sit.
- The skin is flat shaded for consistency and may look simpler than the
  original beta textures.
- Iris tint multiplies the original iris map; colors may vary from swatches.
- Hairstyles are generated geometry, **not** VRoid hair blendshapes.
- Underwear seam selection based on body y-coordinate is a first-pass solution;
  pixel-perfect seam edges, fitted cuffs and morph-compatible seams remain.
- When a source skin region is absent, underwear extraction cannot invent it.
- No NSFW details are synthesized or added.
