# VitaeWorld NPC cast: shared CC0 VRoid avatars

The first floor now has **four NPCs**: Mira (reception), Nova (guest in
hallway), Deniz (bartender) and Lina (bar guest).

NPCs use the **same CC0 VRoid beta character engine** as the player. They are
not independent hand-built/procedural NPC models. All source meshes already
exist in the CC0 VRoid beta base and HairSample asset bundle used by Character
Studio V5. See [Premade Assets](VROID_PREMADE_ASSETS.md).

## Appearance

| NPC | Prepared VRM | Hair source | Outfit |
| --- | --- | --- | --- |
| Mira (reception) | Base Female | CC0 HairSample Female hair transplant | Original prepared formal clothing, warm pink upper + dark pants |
| Nova (hotel guest) | HairSample Male | Original sculpted HairSample Male | Original casual clothing, blue-grey palette |
| Deniz (bartender) | Base Male | CC0 HairSample Male hair transplant | Original prepared uniform, green upper + charcoal pants |
| Lina (bar guest) | HairSample Female | Original sculpted HairSample Female | Original casual clothing, mauve upper + purple pants |

Each NPC also has a different skin/iris tint and hair color. Colors modify
**individual cloned material instances**. Clothing category meshes are
existing VRoid source garments, not newly modeled geometric approximations.
The two HairSample source models already contain alternate ready-made outfits
compared with the Base models.

## Cache and performance

- NPCs load lazily within 15 m of the first-floor player and are not rendered
  beyond 21 m or when the player is on another floor.
- Four source VRMs are cached by asset ID, so each specific model is fetched
  and parsed once per browser session (instead of once per NPC).
- Three.js SkeletonUtils clones each skeleton independently. Geometry and
  texture objects are shared; clone materials are separate so recoloring one
  NPC never recolors another NPC or the player.
- Disposing an NPC does **not** destroy its shared geometry in the model pool.
- HairSample characters use their **original skinned hair**. Base characters
  attach the ready-made CC0 HairSample hairstyle to the head using the
  existing Character Studio importer.
- Loaded VRM clones keep the hotel's existing NPC grabbing and nearby
  interaction behavior, while using the player's external rig pose driver.
- If downloading an avatar fails, an old procedural fallback is allowed
  temporarily; a console warning identifies the failed NPC. This is a
  resilience path, not the intended asset design.

## Known limitations

- The character palette is four deliberately placed local NPCs, not an
  infinite simulated crowd. No multiplayer transport is included.
- NPCs do not currently roam. Existing gentle grab/pull behavior is preserved.
- Additional CC0 outfit or hair packages can be added only after license,
  rig compatibility, visual fit and runtime performance checks.
- Mesh and hair fit on all four source combinations should still be manually
  tested in-browser; the CI build does not take actual 3D screenshots.
- LOD and GPU skinning budgets will need work for crowds of dozens of NPCs.
