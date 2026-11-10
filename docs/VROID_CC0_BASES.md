# VRoid Studio old beta: Base Male / Base Female (CC0)

## Source provenance

These are VRoid Studio 0.14.0 **old beta** base-model exports, published as
**CC0 1.0** by VRoid Project / pixiv Inc. The official VRoid FAQ explicitly
identifies old beta base models as CC0. These terms **do not** apply to all
modern VRoid Studio presets or VRoid Hub uploads.

- VRoid official CC0 FAQ:
  https://vroid.pixiv.help/hc/en-us/articles/4402614652569-Do-VRoid-Studio-s-sample-models-come-with-conditions-of-use
- Old beta base model (Japanese, explicit CC0):
  https://vroid.pixiv.help/hc/ja/articles/900000088126
- OpenGameArt CC0 archive (2024-12-24):
  https://opengameart.org/content/vroid-studio-cc0-models
  (files: `base_male.zip` and `base_female.zip`).
- CC0 dedication: https://creativecommons.org/publicdomain/zero/1.0/

Because large binaries inflate git, production builds retrieve **pinned copies**
of the *same OpenGameArt CC0 VRM exports*, checking exact Git blob object IDs.

| Game ID | GitHub source, commit | File | Git blob SHA-1 |
| --- | --- | --- | --- |
| vroidMale | zz85/midiviz @ 419ef25fd70465da066e4411f26f47f661411989 | `violinist/assets/models/vroid-base-male.vrm` | `a7de1fd8e1e5787704d995cfddacd7b2e4f29bde` |
| vroidFemale | wmehobbs/Abbott-game @ 0796b0a859aded9629cd802a0c132993b0c6e091 | `content/meshes/raw/vroid_base_female/unzipped/Base_Female.vrm` | `1bdb2cafb3076523eed1890c66343a7e6a825bbc` |

The build script checks the embedded `VRM.meta.licenseName === 'CC0'`, the
binary signature, and existence of a skeleton and body material. It aborts
publishing on any unexpected binary change.

Use `npm run assets:download` before `npm run dev` locally. In GitHub Pages
CI the models are included in `dist/assets/characters/`, not stored in git.

## Current character architecture

- Two distinct full VRM humanoid characters (male/female), rigged, selectable
  via **Karakter > Temel karakter**.
- The chosen model loads on demand, using three-vrm. Sources are 17.9 MB and
  16.3 MB, respectively, so the browser pays a meaningful first-load cost.
- Previous procedural and Quaternius test bases are preserved.
- **Kıyafet stili: Yok** and upper/lower/shoe toggles act on known VRoid
  *clothing materials* and do not remove the body and face materials.
  A shared material can cover multiple garment regions.
- The current VRM samples may include a shirt, vest, pants and shoes despite
  their **Base** names. Some underlying body surfaces might be missing where
  clothing originally covered them. Hiding the garment does NOT restore those
  surfaces. Do not advertise these as proven garment-ready bare meshes.
- External wardrobe accessories cannot yet be retargeted automatically:
  correct weight painting, skeleton compatibility, morphs, collision masks
  and mobile-friendly LODs must be validated per outfit.
- Old appearance sliders controlling the procedural avatar's shoulder/waist,
  for example, do not reshape imported VRM geometry. VRM height scaling works.

## Technical goals for the next milestone

1. Verify true skin coverage through the whole body in Blender/VRM editor.
2. Extract or reconstruct a complete neutral bodysuit base geometry (CC0).
3. Create **two independently skinned clothing sets** for each skeleton.
4. Verify fit through crouch, sit, bend, jump and walk in Playwright/browser.
5. Compress source 2K textures to mobile-friendly WebP/KTX2 and add LODs.

No changes in this experiment grant a right to distribute arbitrary VRoid
Hub characters, third-party clothing, or current VRoid preset models.
