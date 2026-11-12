# Vitae Soft anatomy, head, hands and clothing: session implementation

Status: implemented on `feat/vitae-soft-complete-session-rework-20261112`. Verified by repository tests and CI when green; still requires visual QA in a browser. Scope is `vitae0/games` (character test world), **not** the separate procedural-building prototype.

## Visual direction
- 2010s social-avatar readability, original rounded Vitae Soft silhouette, not a Roblox clone.
- **Do not enlarge or emphasize the shoulders.** Maintain soft neck, collar and arm transitions.
- Remove boxy torso proportions through near-elliptical loft cross sections.
- Body parts are continuous-looking, gently changing mass; individual muscle lobes are not exposed meshes.
- Geometry is a deliberately stylized game character, not photorealistic muscles/skin.
- Character identity in clothing is driven mostly by head, silhouette, hands, pose and expression.

## Anatomy
1. **Thorax:** independent anterior chest and posterior back surface masks. Gender templates have distinct pectoral vs paired soft tissue structure, with different scapular volume and waist contour. Female bust grows mostly forward, not laterally; sternum separation stays smooth. Both templates remain editable by the same core controls. No gender-locked anatomy sliders.
2. **Abdominal wall:** four conceptual regions, upper/lower, left/right. They are continuous deformation lobes sharing a single connected loft surface; they are not detached spheres, a hard six-pack or four independent user sliders. `abdomenDefinition` changes contour strength. Ribcage, abdominal wall and pelvic girdle remain separately named render segments joined with matching normals.
3. **Pelvis and legs:** hip and waist shapes drive upper-thigh attachment; thigh lateral curves, knee, calf rear mass and taper are redistributed. `legContour` affects intermediate stations but not knee/ankle attachment rings. Knees keep actual bones and tucked cover rather than visually floating spheres. The bony skeleton/IK stays shared.
4. **Hands:** four fingers render as one resting silhouette, thumb remains independent. Finger groups and two phalanges per finger still exist but are hidden until grip, so grasping can articulate each finger without switching character models. First-person hands use the same default-vs-grip policy.
5. **Feet:** one sculpted, heel-narrowed, rounded forefoot dome plus inset sole. Prior individually recognizable pads survive as hidden reference nodes to preserve integrations, not as protruding objects. Foot and shoe sizes follow the same profile.
6. **Glute:** reworked *after* pelvis/thigh sizing. Two pelvis-attached lofts blend to upper legs; projection can change independently of thigh length or girth. No isolated visible hip-side muscle blobs.

## Head and face
- Same underlying spherical topology supports `sphere` (literal sphere), `soft` (organic sphere, default) and `classic` (lightly rounded-cuboid) profiles.
- Roundness is preserved in the classic mode. Neither option becomes square block head.
- Hair mounts remain reused across morphs; geometry does not bake hairstyles.
- Two vertical simple eye marks retain Vitae Soft identity, with blinking.
- Neutral expressions have **no extra mouth displayed**. Subtle happy, sad and surprised mouth curves can be selected and changed without replacing the head.
- Avoid realistic nose, lips, teeth, eyelid rigs, facial bone protrusions, detailed eyebrows and visible muscle borders.

## Presets and customization
- Male/female are **structural morphology starting points**, not a table of scalar size differences; profiles differ in geometry masks even with identical height/waist/hips/chest values.
- They are not fixed biological rules; a user can edit the resulting parameters. Identical profile sliders produce different structural archetypes by design.
- Core morphs remain visible by default; older microcontrols are under the native `details` **İnce ayarlar** disclosure.
- A small group of linked parameters controls numerous internal mesh stations. No per-muscle sliders or per-muscle colliders.
- Old saved values are normalized; new fields have clamped defaults. The legacy VRoid path is intentionally preserved.

## Clothing and interaction
- Soft `neon` attire now uses generated torso, upper/lower leg and pelvis shells with clearance from the *same* body loft stations. `shirt`, `jacket`, `pants`, `shoes` have separate visibility controls.
- Fabric deliberately smooths out abdominal and pectoral micro-relief. The new shell sizes follow revised body morphs and articulate with the same bones. Clothing visuals are generated when the user changes a profile rather than physically simulated every frame.
- First-person occluder policy is preserved: local player torso/head hidden in FPS camera, hands/feet retained; other players and mirrors keep full body layers.
- Visible garment shells are a lightweight procedural starting wardrobe; future fitted pattern libraries, loose fabric, long skirts and dynamic collision-aware tailoring are **not** implemented here.

## Do not add
- Shoulder boosting, large trapezius ridges, disconnected chest balls or a cut-line separating chest from back.
- Dedicated mesh for every muscle, fat parcel, tendon, clavicle, or hand/foot phalanx that is already represented by a cheaper deformation mask.
- Arbitrary independent left/right limb lengths, per-muscle physics and rigid colliders, costly update-per-frame full-surface garment remeshing.
- Hard-edged abdomen blocks, floating knees, visible toe spheres, compulsory realistic nose/lips/eyebrows or a fully cuboid head.

## Review and acceptance
- Both presets: frontal, side, rear, 3/4 views. Check with same numeric measurements to expose pure structural differences.
- Head shape sphere/soft/classic: check eye placement, eye blink, silhouette, hair mount coordinates.
- Female chest: check distinct paired volumes without peaks, outward side expansion or sternum notches. Male chest: confirm pectoral structure.
- Abdomen and waist: no visible cracks between split loft regions, no hexagon/six-pack bubbles.
- Legs: standing, sitting, crouching, wide foot target, knee flexion. No knee clipping or knee-ball silhouette.
- Hands: resting, reach, grasp, drop. FPS/TPS and NPC rigs.
- Garments: naked, shirt-only, pants-only, jacket, full layers across extreme morph ranges. Check clipping/offsets while seated, squatting and walking.
- GL draw calls, CPU geometry rebuild latency, material disposal, FPS culling and NPC render cost.
- Do not interpret unit/CI success as a substitute for a full visual inspection.

## Implementation references
- `src/avatar/AvatarConfig.js` anatomy, bounds and morphological starting profiles
- `src/avatar/SoftAvatar.js` loft stations, shape masks, head, limbs, clothes
- `src/avatar/Avatar.js` visual lifecycle, first-person visibility and expression/grip controls
- `src/player/HandRig.js`, `src/player/Player.js` first-person and object interaction
- `src/ui/Hud.js` grouped customization and wardrobe toggles
- `tests/soft-anatomy-session.test.js` regression and acceptance guards
