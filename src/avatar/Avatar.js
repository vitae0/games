import * as THREE from 'three';
import { normalizeAvatar, isSoftModel, SKIN_TONES, EYE_COLORS } from './AvatarConfig.js';
import { createSkinnedLimb } from './SkinnedLimb.js';
import { poseFor } from './PoseMath.js';
import { visibleGarmentLayers } from './ClothingLayers.js';
import { applyVRoidWardrobe } from './VRoidLayers.js';
import { applyVRoidColors, disposeVRoidStyle } from './VRoidStyle.js';
import { loadPremadeHair, clonePremadeHair, discardPremadeHair } from './VRoidPremadeHair.js';
import { buildSoftAvatar } from './SoftAvatar.js';

/**
 * Stylised human with exposed skin anatomy and detachable visual clothing layers.
 * Shapes are shared per avatar, not recreated for every finger, eyelid and garment.
 * The negative Z axis is the character's face/forward axis, just like a Three.js camera.
 * This is an anime-influenced procedural mesh, NOT a rigged photorealistic human.
 */
export class Avatar {
  constructor(scene, profile, { localPlayer = false } = {}) {
    this.scene = scene;
    // Only the camera owner's avatar needs a first-person visibility mask.
    // NPCs, previews and other characters must retain every body part.
    this.localPlayer = !!localPlayer;
    this.firstPersonActive = false;
    this.root = new THREE.Group();
    this.root.name = 'avatar';
    scene.add(this.root);
    this.clock = 0;
    this.profile = normalizeAvatar(profile);
    this.external = null;
    this.materials = [];
    this.geometry = [];
    this.rebuild();
  }
  mat(color, roughness = .8, metalness = 0) {
    const material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    this.materials.push(material);
    return material;
  }
  shape(group, type, material, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(this.shapes[type], material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(rx, ry, rz);
    group.add(mesh);
    this.registerGarmentMesh(mesh, material);
    return mesh;
  }
  limb(group, material, fromY, toY, radiusTop, radiusBottom, z = 0) {
    // Round skin/fabric joints rather than exposed mechanical hinges.
    const h = fromY - toY;
    this.shape(group, 'taper', material, 0, (fromY + toY) / 2, z,
      radiusTop, h, radiusBottom);
  }
  createShapes() {
    this.shapes = {
      sphere: new THREE.SphereGeometry(1, 16, 12),
      face: new THREE.SphereGeometry(1, 24, 18),
      box: new THREE.BoxGeometry(1, 1, 1),
      taper: new THREE.CylinderGeometry(.82, 1, 1, 14, 1),
      cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
      cone: new THREE.ConeGeometry(1, 1, 9),
    };
    this.geometry = Object.values(this.shapes);
  }
  rebuild(profile = this.profile) {
    this.profile = normalizeAvatar(profile);
    // Returning from an imported VRoid to the procedural rig releases only
    // its live instance; the bundled asset files remain available.
    if (isSoftModel(this.profile.baseModel)) this.clearExternal();
    this.root.clear();
    this.geometry.forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose());
    this.geometry = []; this.materials = [];
    this.softAvatar = false;
    this.firstPersonOccluders = [];
    if (isSoftModel(this.profile.baseModel)) {
      buildSoftAvatar(this, this.profile);
      this.setupFirstPersonVisibility();
      return;
    }
    this.createShapes();
    const p = this.profile;
    const LOOK = {
      neon: { jacket: 0xd6d1c9, shirt: 0xf9f7f1, pants: 0x626c78, shoes: 0xe7e1d7, accent: 0xa48f75, hair: 0x46352f },
      stealth: { jacket: 0x37404b, shirt: 0xd8d8d2, pants: 0x242c35, shoes: 0x1e2229, accent: 0xaab0ac, hair: 0x29252b },
      chrome: { jacket: 0x947b83, shirt: 0xf4dedb, pants: 0x55515b, shoes: 0xebdfda, accent: 0xcaa799, hair: 0x82504c },
    }[p.outfit === 'none' ? 'neon' : p.outfit];
    this.material = {
      skin: this.mat(SKIN_TONES[p.skinTone], .93),
      lip: this.mat(new THREE.Color(SKIN_TONES[p.skinTone]).lerp(new THREE.Color(0xa15263), .30), .92),
      blush: this.mat(new THREE.Color(SKIN_TONES[p.skinTone]).lerp(new THREE.Color(0xee8e9a), .42), 1),
      hair: this.mat(LOOK.hair, .95),
      hairHighlight: this.mat(new THREE.Color(LOOK.hair).lerp(new THREE.Color(0xf3d0ad), .13), .88),
      eyeWhite: this.mat(0xfff9ef, .35),
      iris: this.mat(EYE_COLORS[p.eyeColor], .32),
      pupil: this.mat(0x211c1c, .32),
      shine: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      shirt: this.mat(LOOK.shirt, .9),
      jacket: this.mat(LOOK.jacket, .87),
      seam: this.mat(LOOK.accent, .82),
      pants: this.mat(LOOK.pants, .92),
      shoes: this.mat(LOOK.shoes, .78),
    };
    this.materials.push(this.material.shine);
    const legLength = p.height * p.legRatio;
    const headHeight = p.height * .145 * p.headScale;
    const shoulderY = p.height - headHeight - .035;
    const torsoHeight = shoulderY - legLength;
    const armLength = p.height * p.armRatio;
    this.body = new THREE.Group(); this.root.add(this.body);
    this.skinnedLayers = [];
    this.layerMeshes = { shirt: [], jacket: [], pants: [], shoes: [] };
    this.eyeParts = [];
    this.body.name = 'anatomy';
    this.buildAnatomy(p, legLength, torsoHeight, shoulderY);
    this.buildGarments(p, legLength, torsoHeight, shoulderY);
    this.buildFace(p, headHeight);
    this.leftArm = this.buildArm(-1, shoulderY, p.shoulders, armLength);
    this.rightArm = this.buildArm(1, shoulderY, p.shoulders, armLength);
    this.leftLeg = this.buildLeg(-1, legLength, p.hips);
    this.rightLeg = this.buildLeg(1, legLength, p.hips);
    this.updateGarmentVisibility();
    if (this.external) {
      this.root.add(this.external.wrapper);
      this.body.visible = false;
      this.refreshExternalScale();
      if (this.external.vrm) this.updateVRoidStyle();
    }
    this.setupFirstPersonVisibility();
    this.root.userData.height = p.height;
  }
  buildAnatomy(p, legs, torsoH, shoulderY) {
    const S = this.material.skin;
    // Distinct anatomical volumes beneath clothing. The clothing meshes are
    // slightly larger and can be replaced independently later by skinned GLBs.
    this.shape(this.body, 'sphere', S, 0, legs + torsoH * .68, 0,
      p.shoulders * .46, torsoH * .37, .145);
    this.shape(this.body, 'sphere', S, 0, legs + torsoH * .32, .008,
      p.waist * .48, torsoH * .31, .123);
    this.shape(this.body, 'sphere', S, 0, legs + .05, .012, p.hips * .49, .145, .16);
    this.shape(this.body, 'cylinder', S, 0, shoulderY + .045, 0, .060, .11, .061);
    // Collarbone/neck remain visible above separate top and outer layer.
  }
  buildGarments(p, legs, torsoH, shoulderY) {
    const { shirt, jacket, seam } = this.material;
    // Inner knit top, independent from the jacket and skin.
    this.shape(this.body, 'sphere', shirt, 0, legs + torsoH * .50, -.015,
      p.waist * .50, torsoH * .42, .148);
    this.shape(this.body, 'sphere', shirt, 0, legs + torsoH * .83, -.008,
      p.shoulders * .42, torsoH * .19, .148);
    // Two open jacket lapels do not hide the full central shirt panel.
    for (const sign of [-1, 1]) {
      this.shape(this.body, 'sphere', jacket, sign * p.shoulders * .355, legs + torsoH * .59,
        -.02, p.shoulders * .16, torsoH * .39, .166, 0, 0, sign * .055);
      this.shape(this.body, 'sphere', seam, sign * p.shoulders * .19, legs + torsoH * .83,
        -.158, .025, torsoH * .19, .021, 0, 0, sign * .25);
    }
    this.shape(this.body, 'sphere', jacket, 0, legs + .08, .08,
      p.hips * .50, .14, .143);
    this.shape(this.body, 'sphere', seam, 0, legs + torsoH * .36, -.163,
      .022, .016, .011); // small jacket fastening
  }
  buildFace(p, headH) {
    const M = this.material;
    const xRadius = headH * .42;
    const depth = headH * .41;
    this.head = new THREE.Group();
    this.head.position.y = p.height - headH / 2;
    this.body.add(this.head);
    this.head.name = 'face';
    // Soft jaw and rounded cheekbones; anime-inspired eye placement.
    this.shape(this.head, 'face', M.skin, 0, 0, 0, xRadius, headH * .51, depth);
    this.shape(this.head, 'face', M.skin, 0, -headH * .29, -.017,
      xRadius * .68, headH * .24, depth * .78);
    for (const sign of [-1, 1]) {
      this.shape(this.head, 'sphere', M.skin, sign * xRadius * 1.03,
        -headH * .045, -.005, .025, .041, .019);
      const ex = sign * xRadius * .44;
      const ey = headH * .025;
      // Eye sockets follow the contour of the face. White sclera, iris, pupil,
      // upper eyelids and tiny catchlight are separate selectable meshes.
      const sclera = this.shape(this.head, 'sphere', M.eyeWhite, ex, ey, -depth * .96,
        headH * .123, headH * .153, .020);
      const iris = this.shape(this.head, 'sphere', M.iris, ex, ey - .004, -depth * 1.105,
        headH * .074, headH * .105, .010);
      const pupil = this.shape(this.head, 'sphere', M.pupil, ex, ey - .004, -depth * 1.16,
        headH * .042, headH * .075, .006);
      this.eyeParts.push([sclera, iris, pupil].map(mesh => ({ mesh, y: mesh.scale.y })));
      this.shape(this.head, 'sphere', M.shine, ex - .009, ey + .014, -depth * 1.2,
        .007, .009, .004);
      this.shape(this.head, 'sphere', M.hair, ex, ey + headH * .15, -depth * 1.00,
        headH * .145, .009, .010, 0, 0, sign * .1); // brows
      this.shape(this.head, 'sphere', M.hair, ex, ey + headH * .107, -depth * 1.06,
        headH * .13, .008, .009, 0, 0, sign * .08); // eyelids
      this.shape(this.head, 'sphere', M.blush, sign * xRadius * .64,
        -headH * .18, -depth * .84, .031, .012, .008);
    }
    this.shape(this.head, 'sphere', M.skin, 0, -headH * .115,
      -depth * 1.075, .018, .024, .026); // small nose
    this.shape(this.head, 'sphere', M.lip, 0, -headH * .265,
      -depth * 1.015, .033, .008, .010); // mouth
    this.buildHair(p, headH, xRadius, depth);
    if (p.visor) {
      // Thin optional eyewear: transparent lenses, not a face-obscuring robot visor.
      const lens = this.mat(0xb5beca, .2, .02);
      lens.transparent = true; lens.opacity = .23; lens.depthWrite = false;
      for (const sign of [-1, 1]) this.shape(this.head, 'sphere', lens,
        sign * xRadius * .45, headH * .03, -depth * 1.24,
        .047, .045, .005);
      this.shape(this.head, 'box', M.seam, 0, headH * .041, -depth * 1.27, .022, .008, .008);
    }
  }
  buildHair(p, headH, width, depth) {
    if (p.hair === 'none') return;
    const { hair, hairHighlight } = this.material;
    this.shape(this.head, 'sphere', hair, 0, headH * .315, .027,
      width * 1.05, headH * .27, depth * 1.07);
    this.shape(this.head, 'sphere', hair, 0, headH * .225, depth * .63,
      width * .99, headH * .34, depth * .50);
    // Individual tapered fringe tufts wrap around the forehead.
    for (let i = -2; i <= 2; i++) {
      const material = i % 2 === 0 ? hair : hairHighlight;
      this.shape(this.head, 'cone', material, i * width * .36,
        headH * .18 - Math.abs(i) * .008, -depth * .87,
        headH * .084, headH * (.27 + (i===0 ? .05 : 0)), headH * .07,
        .12, 0, -i * .15);
    }
    if (['bob', 'long', 'ponytail'].includes(p.hair)) {
      for (const sign of [-1, 1]) {
        const len = p.hair === 'bob' ? headH * .48 : headH * 1.12;
        this.shape(this.head, 'sphere', hair, sign * width * .94,
          headH * .01 - len / 2, .035, width * .24, len * .66, depth * .40,
          0, 0, -sign * .08);
      }
    }
    if (p.hair === 'ponytail') {
      this.shape(this.head, 'sphere', hair, 0, headH * .28, depth * 1.3,
        headH * .18, headH * .52, .063, -.36);
      this.shape(this.head, 'sphere', this.material.seam, 0,
        headH * .35, depth * 1.26, .05, .027, .045);
    }
    if (p.hair === 'mohawk') {
      for (let i = 0; i < 4; i++) this.shape(this.head, 'cone', hair,
        0, headH * (.48 + i * .04), (i - 1.5) * .06,
        headH * .14, headH * .28, headH * .14);
    }
  }
  skinned(upper, lower, material, options) {
    const layer = createSkinnedLimb(this.body, upper, lower, material, options);
    this.geometry.push(layer.geometry);
    this.skinnedLayers.push(layer.mesh);
    this.registerGarmentMesh(layer.mesh, material);
    return layer.mesh;
  }
  buildArm(sign, y, shoulder, length) {
    const upper = new THREE.Bone(); upper.name = sign < 0 ? 'leftUpperArm' : 'rightUpperArm';
    upper.position.set(sign * shoulder * .49, y, 0); this.body.add(upper);
    const lower = new THREE.Bone(); lower.name = sign < 0 ? 'leftLowerArm' : 'rightLowerArm';
    lower.position.y = -length * .47; upper.add(lower);
    const rad = Math.max(.052, shoulder * .142);
    const options = { x: upper.position.x, topY: y, length: length * .94,
      radiusX: rad * .92, radiusZ: rad * .87, middle: .5 };
    this.skinned(upper, lower, this.material.skin, options);
    // Sleeves are actually separate skinned garments; under-layer remains skin.
    this.skinned(upper, lower, this.material.jacket,
      { ...options, length: length * .76, radiusX: rad, radiusZ: rad, layer: 1.13 });
    const handY = -length * .47;
    const hand = new THREE.Group(); hand.position.y = -length * .44; lower.add(hand);
    this.shape(hand, 'sphere', this.material.skin, 0, -.015, -.016,
      rad * .88, .073, rad * .49);
    for (let f = 0; f < 4; f++) this.shape(hand, 'sphere', this.material.skin,
      (f - 1.5) * .027, -.075, -.030, .014, .060 - Math.abs(f - 1.5) * .006, .015);
    this.shape(hand, 'sphere', this.material.skin, -sign * .071, -.025, -.048,
      .020, .050, .023, 0, 0, sign * .48);
    upper.userData.elbow = lower;
    upper.userData.hand = hand;
    return upper;
  }
  buildLeg(sign, length, hips) {
    const upper = new THREE.Bone(); upper.name = sign < 0 ? 'leftUpperLeg' : 'rightUpperLeg';
    upper.position.set(sign * hips * .29, length, 0); this.body.add(upper);
    const lower = new THREE.Bone(); lower.name = sign < 0 ? 'leftLowerLeg' : 'rightLowerLeg';
    lower.position.y = -length * .52; upper.add(lower);
    const rad = Math.max(.082, hips * .195);
    const options = { x: upper.position.x, topY: length, length: length * .98,
      radiusX: rad * .88, radiusZ: rad * .95, middle: .53 };
    this.skinned(upper, lower, this.material.skin, options);
    this.skinned(upper, lower, this.material.pants,
      { ...options, radiusX: rad * .98, radiusZ: rad * 1.02, layer: 1.045 });
    // Shoes are attached to the lower-leg bone and move with the ankle.
    this.shape(lower, 'sphere', this.material.shoes, 0, -length * .44, -.050,
      rad * 1.2, .063, rad * 1.53);
    this.shape(lower, 'sphere', this.material.seam, 0, -length * .38, -.008,
      rad * 1.02, .025, rad * .95);
    upper.userData.knee = lower;
    return upper;
  }
  registerGarmentMesh(mesh, material) {
    if (!this.layerMeshes || !this.material) return;
    const key = Object.entries({
      shirt: this.material.shirt, jacket: this.material.jacket,
      pants: this.material.pants, shoes: this.material.shoes,
    }).find(([, value]) => material === value)?.[0];
    if (key) this.layerMeshes[key].push(mesh);
    if (material === this.material.seam) this.layerMeshes.jacket.push(mesh);
  }
  updateGarmentVisibility() {
    const layers = visibleGarmentLayers(this.profile);
    for (const [key, meshes] of Object.entries(this.layerMeshes)) {
      for (const mesh of meshes) mesh.visible = layers[key];
    }
  }
  refreshExternalScale() {
    if (!this.external) return;
    const factor = this.profile.height / this.external.sourceHeight;
    this.external.group.scale.setScalar(factor);
    this.external.group.position.y = -this.external.sourceMinY * factor;
  }
  updateStyle(profile) {
    // Body sliders update the native model immediately without asset loading.
    if (isSoftModel(this.profile.baseModel)) {
      this.rebuild(profile);
      return;
    }
    // Recolor and layer existing CC0 source assets without rebuilding the rig.
    this.profile = normalizeAvatar(profile);
    if (this.external?.vrm) this.updateVRoidStyle();
    else this.updateGarmentVisibility();
  }
  updateVRoidStyle() {
    const ext = this.external;
    if (!ext?.vrm) return;
    ext.style ||= { materialCache: new Map(), hairRoot: null, hairKey: null, hairRequest: 0 };
    const style = ext.style;
    style.keepSourceHair = !!ext.preserveSourceHair;
    applyVRoidColors(ext.vrm, this.profile, style);
    ext.wardrobeState = applyVRoidWardrobe(ext.group, this.profile);
    // Wardrobe updates may attach new meshes after the owner mask was built.
    if (this.localPlayer) this.setupFirstPersonVisibility();

    // Changing clothing, eyes or skin must not reload a hairstyle.
    const key = `${this.profile.baseModel}:${this.profile.hair}:${this.profile.hairColor}`;
    if (style.hairKey === key) return;
    style.hairKey = key;
    if (ext.preserveSourceHair) {
      // The CC0 HairSample model already includes the artist's hairstyle.
      // Do not load or construct another hair object on top of it.
      const ticket = ++style.hairRequest;
      discardPremadeHair(style.hairRoot);
      style.hairRoot = null;
      style.hairStatus = this.profile.hair === 'none' ? 'hidden' : 'ready';
      return;
    }
    const ticket = ++style.hairRequest;
    discardPremadeHair(style.hairRoot);
    style.hairRoot = null;
    style.hairStatus = this.profile.hair === 'none' ? 'hidden' : 'loading';
    if (this.profile.hair === 'none') return;

    void loadPremadeHair(this.profile.baseModel).then(template => {
      if (this.external !== ext || style.hairRequest !== ticket || style.hairKey !== key) return;
      const head = ext.vrm.humanoid?.getNormalizedBoneNode('head');
      if (!head) throw new Error('VRoid hedef modelinde kafa kemiği bulunamadı.');
      const hair = clonePremadeHair(template, this.profile.hairColor);
      head.add(hair);
      style.hairRoot = hair;
      style.hairStatus = 'ready';
      // Asynchronous hairstyles are also local-only FPS occluders.
      if (this.localPlayer) this.setupFirstPersonVisibility();
      this.onStyleLoad?.();
    }).catch(error => {
      if (this.external !== ext || style.hairRequest !== ticket) return;
      style.hairStatus = 'error';
      this.onStyleLoad?.();
      console.warn('CC0 hazır saç yüklenemedi:', error);
    });
  }
  setupFirstPersonVisibility() {
    this.firstPersonOccluders = [];
    // Never change an NPC's, remote avatar's or studio preview's layers.
    // All of their geometry remains visible to ordinary layer-0 cameras.
    if (!this.localPlayer) return;
    const limbs = [this.leftArm, this.rightArm, this.leftLeg, this.rightLeg];
    const isLimb = object => {
      // Legacy/VRoid-preview procedural arms and legs use SkinnedMesh objects
      // attached to the BODY for two-bone skinning rather than to their bones.
      if (this.skinnedLayers?.includes(object)) return true;
      for (let parent = object.parent; parent; parent = parent.parent) {
        if (limbs.includes(parent)) return true;
        if (parent === this.body) break;
      }
      return false;
    };
    this.body?.traverse(mesh => {
      if (!mesh.isMesh) return;
      // Upper/lower arms, hands, fingers, thighs, calves and feet keep layer 0.
      // Only this avatar's head, pelvis, chest and abdomen use layer 1.
      if (isLimb(mesh)) mesh.layers.set(0);
      else {
        mesh.layers.set(1);
        this.firstPersonOccluders.push(mesh);
      }
    });
    // Imported models can contain a single skinned full-body mesh. Hide it
    // only from the owner's FPS camera; the procedural limbs remain as a
    // lightweight local fallback. Third-person and mirrors show the model.
    this.external?.wrapper?.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.layers.set(1);
      this.firstPersonOccluders.push(mesh);
    });
  }
  setFirstPersonMode(enabled) {
    if (!this.localPlayer) return;
    this.firstPersonActive = !!enabled;
    // An imported model replaces the procedural body in third-person. In FPS,
    // show the procedural limb rig only, not the overlapping imported torso.
    if (this.external && this.body) this.body.visible = this.firstPersonActive;
  }
  headWorldHeight() {
    return this.profile.height + this.body.position.y - this.profile.height * .08;
  }
  update(dt, locomotion, posture = 'stand', furnitureStyle = null, poseVariant = null) {
    this.clock += dt;
    const pose = poseFor(posture, locomotion, this.clock, this.profile.height, furnitureStyle, poseVariant);
    const damp = (v, target, rate = 10) => THREE.MathUtils.damp(v, target, rate, dt);
    // Translate the pelvis in metres. Crucially, don't shrink the entire person:
    // actual thigh and knee joints bend to create crouch/kneel/sitting poses.
    this.body.position.y = damp(this.body.position.y, -pose.drop + pose.bob, 11);
    this.body.rotation.x = damp(this.body.rotation.x, pose.spine * .22, 8);
    this.body.scale.y = 1;
    const legs = [this.leftLeg, this.rightLeg];
    for (let i = 0; i < legs.length; i++) {
      legs[i].rotation.x = damp(legs[i].rotation.x, pose.hip[i], 11);
      legs[i].rotation.y = damp(legs[i].rotation.y, pose.hipYaw?.[i] ?? 0, 11);
      legs[i].rotation.z = damp(legs[i].rotation.z, pose.hipRoll?.[i] ?? 0, 11);
      legs[i].userData.knee.rotation.x = damp(legs[i].userData.knee.rotation.x, pose.knee[i], 11);
      legs[i].userData.knee.rotation.y = damp(legs[i].userData.knee.rotation.y, pose.kneeYaw?.[i] ?? 0, 11);
    }
    this.leftArm.rotation.x = damp(this.leftArm.rotation.x, pose.arms[0], 9);
    this.rightArm.rotation.x = damp(this.rightArm.rotation.x, pose.arms[1], 9);
    this.head.rotation.y = Math.sin(this.clock * .42) * .028;
    this.head.rotation.x = pose.spine * .25 + Math.sin(this.clock * .66) * .012;
    for (const eye of this.eyeParts) for (const part of eye) {
      part.mesh.scale.y = part.y * (1 - pose.blink * .92);
    }
    this.updateExternal?.(dt, locomotion, posture, pose);
  }
  clearExternal() {
    if (!this.external) return;
    this.root.remove(this.external.wrapper);
    disposeVRoidStyle(this.external.style);
    // Imported or bundled file owns its own geometries; dispose on replacement.
    this.external.group.traverse(obj => {
      if (!obj.isMesh) return;
      if (!this.external.sharedGeometry) obj.geometry?.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of materials) mat?.dispose();
    });
    this.external = null;
    if (this.body) this.body.visible = true;
    // Drop references to disposed external mesh instances in the mirror list.
    if (this.localPlayer) this.setupFirstPersonVisibility();
  }
  applyExternal(model, source = 'upload') {
    this.clearExternal();
    // File is attached only to this avatar and never uploaded to a server.
    const wrapper = new THREE.Group();
    const visual = model.scene;
    visual.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(visual);
    const height = Math.max(bounds.max.y - bounds.min.y, .1);
    visual.scale.setScalar(this.profile.height / height);
    visual.position.y = -bounds.min.y * (this.profile.height / height);
    wrapper.add(visual);
    this.root.add(wrapper);
    this.body.visible = false;
    const mixer = model.clips?.length ? new THREE.AnimationMixer(visual) : null;
    const actions = new Map();
    for (const clip of model.clips || []) {
      const action = mixer.clipAction(clip);
      actions.set(clip.name.toLowerCase(), action);
    }
    const parts = [];
    visual.traverse(obj => {
      if (obj.isMesh && parts.length < 150) {
        parts.push({ mesh: obj, name: obj.name || obj.parent?.name || `Parça ${parts.length + 1}` });
      }
    });
    this.external = { wrapper, group: visual, vrm: model.vrm, mixer, actions, source, parts,
      sharedGeometry: !!model.sharedGeometry,
      preserveSourceHair: !!model.preserveSourceHair,
      sourceHeight: height, sourceMinY: bounds.min.y,
      boneMap: model.boneMap || {}, baseRotations: new Map() };
    this.refreshExternalScale();
    if (model.vrm) this.updateVRoidStyle();
    this.setupFirstPersonVisibility();
    this.setFirstPersonMode(this.firstPersonActive);
  }
  listExternalParts() {
    return (this.external?.parts || []).map(({ mesh, name }, index) => ({
      index, name, visible: mesh.visible,
    }));
  }
  setExternalPartVisible(index, visible) {
    const part = this.external?.parts?.[index];
    if (!part || typeof visible !== 'boolean') return false;
    part.mesh.visible = visible;
    return true;
  }
  updateExternal(dt, speed, posture, pose) {
    const ext = this.external;
    if (!ext) return;
    if (ext.mixer && ext.actions.size) {
      const motion = posture === 'stand' && speed > .1 ? 'walk' : posture;
      let selected = [...ext.actions.entries()].find(([key]) => key.includes(motion));
      if (!selected) selected = [...ext.actions.entries()].find(([key]) => key.includes('idle'));
      for (const [name, action] of ext.actions) {
        const weight = name === selected?.[0] ? 1 : 0;
        if (weight && !action.isRunning()) action.reset().play();
        action.setEffectiveWeight(weight);
      }
      ext.mixer.update(dt);
    }
    // Apply explicit posture to humanoid bones even when a model has only an idle clip.
    const joint = (name, angle, axis = 'x') => {
      const bone = ext.vrm?.humanoid?.getNormalizedBoneNode(name) || ext.boneMap[name];
      if (!bone) return;
      if (!ext.baseRotations.has(bone)) ext.baseRotations.set(bone, bone.rotation.clone());
      const baseline = ext.baseRotations.get(bone);
      bone.rotation[axis] = THREE.MathUtils.damp(bone.rotation[axis], baseline[axis] + angle, 10, dt);
    };
    joint('leftUpperLeg', pose.hip[0]); joint('rightUpperLeg', pose.hip[1]);
    joint('leftLowerLeg', pose.knee[0]); joint('rightLowerLeg', pose.knee[1]);
    joint('leftUpperArm', pose.arms[0] * .6); joint('rightUpperArm', pose.arms[1] * .6);
    const pelvis = ext.vrm?.humanoid?.getNormalizedBoneNode('hips') || ext.boneMap.hips;
    if (pelvis) {
      if (!ext.baseRotations.has(pelvis)) ext.baseRotations.set(pelvis, pelvis.position.clone());
      pelvis.position.y = dampPosition(pelvis.position.y,
        ext.baseRotations.get(pelvis).y - pose.drop, dt);
    }
    ext.vrm?.update(dt);
  }
  dispose() {
    this.clearExternal();
    this.scene.remove(this.root);
    this.geometry.forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose());
  }
}

function dampPosition(current, target, dt) { return THREE.MathUtils.damp(current, target, 10, dt); }
