# Character Studio V5: ready-made licensed hair and clothing

## Policy

**No custom/procedural hair or apparel modeling is used for the two current
VRoid characters.** The earlier `hairStrand`, `ellipsoid` and copied-skin
underwear generators are deleted from the active VRoid feature code.

Only **specifically licensed** VRoid Studio **old beta** CC0 sample models are
used. The current VRoid Studio default assets are NOT categorically CC0.

Official FAQ (authoritative):
https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use

The two new ready-made hair source files are *artist-made rigged sample VRMs*:

| Purpose | Licensed source | Git mirror and pinned revision | Git blob SHA-1 |
| --- | --- | --- | --- |
| Ready-made male hairstyle | `HairSample_Male.vrm` | `madjin/vrm-samples@e16eb187100149a315ad92c3c9968f1d5baa6c7d/vroid/beta/HairSample_Male.vrm` | `46e8c583ce5df3b8ee167141b59ba3ad583a2687` |
| Ready-made female hairstyle | `HairSample_Female.vrm` | `madjin/vrm-samples@e16eb187100149a315ad92c3c9968f1d5baa6c7d/vroid/beta/HairSample_Female.vrm` | `0e5235f9a7972fbcbceb74960479b208c27a8707` |

The pinned files are fetched during build with `npm run assets:download`.
The download script verifies Git blob SHA-1, size, **embedded CC0** VRM
metadata, humanoid skin and at least one real hair material. Both samples are
17–19 MB original VRMs. In the browser, only the selected sex's hair sample is
lazily downloaded and parsed, and only on selecting the pre-made hairstyle.

## How ready-made hair works

`src/avatar/VRoidPremadeHair.js` extracts **existing source triangles**
with hair-named materials, applies the source model's skin bind rest transform
once, and attaches the resulting real mesh to the destination VRoid head bone.
Materials and UVs are preserved for the original appearance. Recoloring is a
material override, not newly modeled hair.

This is a one-time transfer of artist-authored geometry, **not generated
strands**, and is cached per sex. Hair follows the head; the original hair
spring simulation is **not** transplanted. Visual alignment and clipping still
need human testing on both selected character heads.

Available hair choices: authentic CC0 HairSample or none. We intentionally
removed unlicensed/unverified bob/long/ponytail placeholders. More styles
require independently licensed source models and alignment testing.

## Clothing: only source VRoid meshes

- Upper: original CC0 VRoid top/vest/shirt mesh and source material.
- Lower: original CC0 VRoid trousers mesh and source material.
- Shoes: original CC0 VRoid shoes mesh and source material.
- Each can be hidden independently when **Original Outfit** is selected.
- These are the models *already present in the CC0 base VRM*, not handmade
  geometric stand-ins or an arbitrary third-party outfit forced onto the rig.
- **Clothing: none** hides them all.

## Underwear realism: explicit limit

The previous V4 `buildVRoidUnderwear` assembled body triangles into
fabric-shaped geometry. **This was removed by user request.**

The only supported 'underwear' appearance right now is the **original
VRoid body texture**, which may have ready-made undergarment details painted
onto the skin. It is a **baked texture**, NOT a separate independently removable,
animated underwear garment. The other option clears that body map to a plain
skin material. The UI states this limitation plainly.

We will not present fake "sport underwear" or "independent fabric meshes"
unless we obtain actual suitably licensed, fitting clothing assets.

## Performance and status

- Do not preload both 17–19 MB hair samples. Download one only on demand.
- Cache extracted hair geometry and maps within the browser session.
- Switching eye, clothing and skin controls does not redownload hair.
- Recolor/none toggles clone the cached source geometry, not generate geometry.
- VRM body and hair source texture/geometry completeness and fit remain
  subject to browser-level visual verification. No claim of perfect fit or
  missing-skin reconstruction is made.
