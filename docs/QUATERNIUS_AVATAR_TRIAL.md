# Quaternius rigged avatar trial

This is a temporary model and wardrobe experiment, not a complete modular clothing system.

- Author: Quaternius
- Original pack: https://quaternius.com/packs/universalbasecharacters.html
- Official free Standard pack: https://quaternius.itch.io/universal-base-characters
- Source asset: `Base Characters/Godot - UE/Superhero_Male_FullBody.gltf`
- License: CC0 1.0 Universal, included in `public/assets/characters/QUATERNIUS-LICENSE.txt`
- Bundled trial file: `public/assets/characters/quaternius-superhero-male.glb`
- GLB mirror: https://github.com/programasweights/avatar/blob/main/public/assets/character.glb
- Preparation notes: https://github.com/programasweights/avatar/blob/main/ASSETS.md

The third-party ~741 KB GLB preserves skinned geometry and the original armature,
but replaces textures with a flat jade-colored material. It contains no external
animation clips. Our existing custom posture solver drives identified humanoid
bones, subject to model-specific verification.

The **Temel karakter** selector offers the bundled Quaternius base or the earlier
procedural avatar. **Kıyafet stili > Yok** and the shirt, jacket, pants, shoes
toggles change visual garment meshes on the **procedural avatar only**.
These garments have not been fitted/rigged to Quaternius. The two systems are
deliberately kept separate to avoid claiming false compatibility.

Next steps: female base, fitted outfit meshes for each body, cloth clipping tests,
skin and face materials, improved animation calibration and LOD.
