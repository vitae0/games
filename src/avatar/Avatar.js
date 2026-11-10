import * as THREE from 'three';

import { normalizeAvatar } from './AvatarConfig.js';

/** Meter-scaled procedural avatar, independent of the hotel and controller. */
export class Avatar {
  constructor(scene, profile) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.clock = 0;
    this.profile = normalizeAvatar(profile);
    this.parts = [];
    this.rebuild();
  }
  mat(color, metalness = .15, emissive = 0x000000) {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness: .55, emissive, emissiveIntensity: .75 });
    this.materials.push(m);
    return m;
  }
  part(group, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    group.add(mesh);
    this.parts.push(geometry);
    return mesh;
  }
  rebuild(profile = this.profile) {
    this.profile = normalizeAvatar(profile);
    this.root.clear();
    this.parts.forEach((g) => g.dispose());
    this.materials?.forEach((m) => m.dispose());
    this.parts = []; this.materials = [];
    const p = this.profile;
    const theme = {
      neon: { coat: 0x15283c, edge: 0x55f6ef, pants: 0x101d32, hair: 0x90e9f8 },
      stealth: { coat: 0x20232d, edge: 0xb8a1e6, pants: 0x11141c, hair: 0x292b37 },
      chrome: { coat: 0x66778b, edge: 0xff5cb0, pants: 0x243047, hair: 0xe9b5dc },
    }[p.outfit];
    const coat = this.mat(theme.coat, .3);
    const trim = this.mat(theme.edge, .4, theme.edge);
    const pants = this.mat(theme.pants, .18);
    const skin = this.mat(0xd6a68f, .05);
    const hair = this.mat(theme.hair, .15);
    const shoe = this.mat(0x080f1c, .25);
    const legLength = p.height * p.legRatio;
    const headHeight = p.height * .145 * p.headScale;
    const shoulderY = p.height - headHeight - .065;
    const torsoHeight = shoulderY - legLength;
    const hipWidth = p.hips;
    const armLength = p.height * p.armRatio;
    this.body = new THREE.Group(); this.root.add(this.body);
    // Torso and broad-shouldered cyberpunk jacket, in true world-meter dimensions.
    const torso = new THREE.Group(); torso.position.y = legLength; this.body.add(torso);
    this.part(torso, new THREE.CylinderGeometry(p.shoulders * .49, p.waist * .49, torsoHeight, 10), coat,
      0, torsoHeight / 2, 0, 1, 1, .75);
    this.part(torso, new THREE.BoxGeometry(p.shoulders + .1, .085, .23), coat,
      0, torsoHeight - .03, -.03);
    this.part(torso, new THREE.BoxGeometry(p.waist + .04, .065, .3), trim,
      0, .08, -.01);
    this.part(torso, new THREE.BoxGeometry(.035, torsoHeight * .86, .015), trim,
      0, torsoHeight / 2, -p.shoulders * .35);
    this.torso = torso;
    const headY = p.height - headHeight / 2;
    this.head = new THREE.Group(); this.head.position.y = headY; this.body.add(this.head);
    const headWidth = headHeight * .72;
    this.part(this.head, new THREE.IcosahedronGeometry(1, 2), skin, 0, 0, 0, headWidth * .54, headHeight * .52, headWidth * .53);
    if (p.hair !== 'none') {
      this.part(this.head, new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hair,
        0, headHeight * .19, 0, headWidth * .54, headHeight * .34, headWidth * .55);
      if (p.hair === 'mohawk') this.part(this.head, new THREE.BoxGeometry(.07, .12, .28), trim, 0, headHeight * .54, 0);
    }
    if (p.visor) {
      this.part(this.head, new THREE.BoxGeometry(headWidth * 1.01, headHeight * .19, .032), trim,
        0, headHeight * .015, -headWidth * .48);
    }
    this.leftArm = this.arm(-1, shoulderY, p.shoulders, armLength, coat, skin, trim);
    this.rightArm = this.arm(1, shoulderY, p.shoulders, armLength, coat, skin, trim);
    this.leftLeg = this.leg(-1, legLength, hipWidth, pants, shoe, trim);
    this.rightLeg = this.leg(1, legLength, hipWidth, pants, shoe, trim);
    this.root.userData.height = p.height;
  }
  arm(side, shoulderY, shoulderWidth, length, coat, skin, trim) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (shoulderWidth / 2 + .01), shoulderY, 0);
    this.body.add(pivot);
    const r = Math.max(.065, shoulderWidth * .17);
    this.part(pivot, new THREE.CylinderGeometry(r, r * .77, length * .80, 9), coat, 0, -length * .40, 0);
    this.part(pivot, new THREE.CylinderGeometry(r * 1.05, r * 1.05, .065, 9), trim, 0, -length * .75, 0);
    this.part(pivot, new THREE.IcosahedronGeometry(.065, 1), skin, 0, -length * .98, 0);
    return pivot;
  }
  leg(side, length, hipWidth, pants, shoe, trim) {
    const pivot = new THREE.Group();
    pivot.position.set(side * hipWidth * .29, length, 0);
    this.body.add(pivot);
    const r = Math.max(.09, hipWidth * .21);
    // Split into thigh and shin so the knee bends in floor postures.
    this.part(pivot, new THREE.CylinderGeometry(r, r * .84, length * .49, 9), pants, 0, -length * .245, 0);
    const knee = new THREE.Group();
    knee.position.y = -length * .5;
    pivot.add(knee);
    this.part(knee, new THREE.IcosahedronGeometry(r * .85, 1), trim, 0, 0, 0);
    this.part(knee, new THREE.CylinderGeometry(r * .82, r * .72, length * .5, 9), pants, 0, -length * .25, 0);
    this.part(knee, new THREE.BoxGeometry(r * 2.3, .10, .34), shoe,
      0, -length + length * .5 + .055, -.075);
    this.part(knee, new THREE.BoxGeometry(r * 2.1, .035, .35), trim,
      0, -length + length * .5 + .026, -.075);
    pivot.userData.knee = knee;
    return pivot;
  }
  update(dt, locomotion, posture = 'stand') {
    this.clock += dt;
    const walking = locomotion > .1 && posture === 'stand';
    const speed = Math.min(1.6, locomotion / 4.2);
    const wave = this.clock * (7 + speed * 2);
    const swing = walking ? Math.sin(wave) * Math.min(.7, speed * .6) : 0;
    const hipBend = posture === 'floorSit' ? 1.25 : posture === 'kneel' ? .65 : 0;
    const kneeBend = posture === 'floorSit' ? -1.65 : posture === 'kneel' ? -1.48 : 0;
    this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, hipBend + swing, 9, dt);
    this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, hipBend - swing, 9, dt);
    this.leftLeg.userData.knee.rotation.x = THREE.MathUtils.damp(this.leftLeg.userData.knee.rotation.x, kneeBend, 9, dt);
    this.rightLeg.userData.knee.rotation.x = THREE.MathUtils.damp(this.rightLeg.userData.knee.rotation.x, kneeBend, 9, dt);
    this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, -swing * .7, 9, dt);
    this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, swing * .7, 9, dt);
    const targetY = posture === 'sit' ? .68 : posture === 'rest' ? .32 :
      posture === 'floorSit' ? .50 : posture === 'kneel' ? .71 : 1;
    this.body.scale.y = THREE.MathUtils.damp(this.body.scale.y, targetY, 7, dt);
    this.torso.rotation.z = Math.sin(this.clock * 1.3) * .008;
    this.body.position.y = walking ? Math.abs(Math.sin(wave)) * .025 : Math.sin(this.clock * 1.4) * .007;
    this.head.rotation.y = Math.sin(this.clock * .42) * .025;
  }
  dispose() {
    this.scene.remove(this.root);
    this.parts.forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose());
  }
}
