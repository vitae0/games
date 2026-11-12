# Vitae Soft Hair Rig V1: attachment contract

This is a preparation layer, **not a hairstyle release**. The procedural male
and female avatars have identical, empty attachment hierarchies created by
`src/avatar/HairMounts.js`.

## Anchors

`head/hair-root` contains: `scalp`, `fringe`, `left-temple`,
`right-temple`, `crown`, `back`, and `accessory`. Use
`mountHairPiece(avatar.head, slot, object3D)` to mount explicitly supplied
geometry. Head faces local **-Z**, Y is up, and measurements are metres.
Mounts rotate with the existing head/neck animation.

## Next integration

1. Use a verified, redistributable asset license and record attribution.
2. Normalize hair dimensions against the `sphere-head` measured bounds, not
   hard-coded male/female scalp radii.
3. Prefer a single low-poly hair shell with 2-4 detachable groups for
   bangs/side hair/accessories. Aim for one draw call per material.
4. Replace rather than stack previously selected styles. Track ownership and
   dispose only assets owned by the avatar, not shared imported VRM buffers.
5. Add density/length/color controls after asset provenance is checked.
6. Keep the existing VRoid hair pipeline independent of the procedural rig.

The current attachment groups deliberately contain no visible meshes.
