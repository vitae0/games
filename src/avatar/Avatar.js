import * as THREE from 'three';
import { normalizeAvatar, SKIN_TONES, EYE_COLORS } from './AvatarConfig.js';

/**
 * Stylised human with exposed skin anatomy and detachable visual clothing layers.
 * Shapes are shared per avatar, not recreated for every finger, eyelid and garment.
 * The negative Z axis is the character's face/forward axis, just like a Three.js camera.
 * This is an anime-influenced procedural mesh, NOT a rigged photorealistic human.
 */
export class Avatar {
  constructor(scene, profile) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'avatar';
    scene.add(this.root);
    this.clock = 0;
    this.profile = normalizeAvatar(profile);
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
    this.root.clear();
    this.geometry.forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose());
    this.geometry = []; this.materials = [];
    this.createShapes();
    const p = this.profile;
    const LOOK = {
      neon: { jacket: 0xd6d1c9, shirt: 0xf9f7f1, pants: 0x626c78, shoes: 0xe7e1d7, accent: 0xa48f75, hair: 0x46352f },
      stealth: { jacket: 0x37404b, shirt: 0xd8d8d2, pants: 0x242c35, shoes: 0x1e2229, accent: 0xaab0ac, hair: 0x29252b },
      chrome: { jacket: 0x947b83, shirt: 0xf4dedb, pants: 0x55515b, shoes: 0xebdfda, accent: 0xcaa799, hair: 0x82504c },
    }[p.outfit];
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
    this.body.name = 'anatomy';
    this.buildAnatomy(p, legLength, torsoHeight, shoulderY);
    this.buildGarments(p, legLength, torsoHeight, shoulderY);
    this.buildFace(p, headHeight);
    this.leftArm = this.buildArm(-1, shoulderY, p.shoulders, armLength);
    this.rightArm = this.buildArm(1, shoulderY, p.shoulders, armLength);
    this.leftLeg = this.buildLeg(-1, legLength, p.hips);
    this.rightLeg = this.buildLeg(1, legLength, p.hips);
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
      this.shape(this.head, 'sphere', M.eyeWhite, ex, ey, -depth * .96,
        headH * .123, headH * .153, .020);
      this.shape(this.head, 'sphere', M.iris, ex, ey - .004, -depth * 1.105,
        headH * .074, headH * .105, .010);
      this.shape(this.head, 'sphere', M.pupil, ex, ey - .004, -depth * 1.16,
        headH * .042, headH * .075, .006);
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
  buildArm(sign, y, shoulder, length) {
    const pivot = new THREE.Group();
    pivot.position.set(sign * shoulder * .49, y, 0);
    this.body.add(pivot);
    pivot.name = sign < 0 ? 'leftArm' : 'rightArm';
    const rad = Math.max(.058, shoulder * .148);
    const sleeve = new THREE.Group(); pivot.add(sleeve);
    this.shape(sleeve, 'sphere', this.material.skin, 0, -length * .27, 0,
      rad * .92, length * .32, rad * .94); // anatomical upper arm
    this.shape(sleeve, 'sphere', this.material.jacket, 0, -length * .24, .005,
      rad * 1.21, length * .29, rad * 1.17); // detachable sleeve
    const elbow = new THREE.Group(); elbow.position.y = -length * .47; pivot.add(elbow);
    this.shape(elbow, 'sphere', this.material.skin, 0, -.045, 0, rad * .85, .09, rad * .85);
    this.shape(elbow, 'sphere', this.material.jacket, 0, -length * .13, .01,
      rad, length * .22, rad);
    this.shape(elbow, 'sphere', this.material.skin, 0, -length * .35, -.005,
      rad * .74, length * .14, rad * .80); // exposed wrist
    const handY = -length * .48;
    this.shape(elbow, 'sphere', this.material.skin, 0, handY, -.012, rad * .82, .075, rad * .45);
    // Fingers are slightly separated, with a prominent opposable thumb.
    for (let f = 0; f < 4; f++) {
      this.shape(elbow, 'sphere', this.material.skin,
        (f - 1.5) * .027, handY - .064, -.027,
        .013, .058 - Math.abs(f - 1.5) * .006, .016);
    }
    this.shape(elbow, 'sphere', this.material.skin,
      -sign * .071, handY - .01, -.048, .020, .048, .024, 0, 0, sign * .55);
    pivot.userData.elbow = elbow;
    return pivot;
  }
  buildLeg(sign, length, hips) {
    const pivot = new THREE.Group();
    pivot.position.set(sign * hips * .29, length, 0);
    this.body.add(pivot);
    pivot.name = sign < 0 ? 'leftLeg' : 'rightLeg';
    const r = Math.max(.085, hips * .19);
    this.shape(pivot, 'sphere', this.material.skin, 0, -length * .22, 0,
      r * .89, length * .29, r * .94);
    this.shape(pivot, 'sphere', this.material.pants, 0, -length * .22, -.003,
      r * 1.07, length * .29, r * 1.09);
    const knee = new THREE.Group(); knee.position.y = -length * .52; pivot.add(knee);
    this.shape(knee, 'sphere', this.material.skin, 0, -.012, 0, r * .86, .076, r * .86);
    this.shape(knee, 'sphere', this.material.pants, 0, -length * .22, 0,
      r * .95, length * .26, r * .92);
    this.shape(knee, 'sphere', this.material.seam, 0, -length * .43, .00,
      r * .95, .024, r * .93);
    this.shape(knee, 'sphere', this.material.shoes, 0, -length * .45, -.055,
      r * 1.19, .063, r * 1.55);
    pivot.userData.knee = knee;
    return pivot;
  }
  update(dt, locomotion, posture = 'stand') {
    this.clock += dt;
    const moving = locomotion > .1 && posture === 'stand';
    const speed = Math.min(1.6, locomotion / 4.2);
    const wave = this.clock * (7 + speed * 2);
    const swing = moving ? Math.sin(wave) * Math.min(.7, speed * .6) : 0;
    const hip = posture === 'floorSit' ? 1.25 : posture === 'kneel' ? .65 : 0;
    const knee = posture === 'floorSit' ? -1.65 : posture === 'kneel' ? -1.48 : 0;
    for (const [leg, v] of [[this.leftLeg, 1], [this.rightLeg, -1]]) {
      leg.rotation.x = THREE.MathUtils.damp(leg.rotation.x, hip + v * swing, 9, dt);
      leg.userData.knee.rotation.x = THREE.MathUtils.damp(leg.userData.knee.rotation.x, knee, 9, dt);
    }
    this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, -swing * .7, 9, dt);
    this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, swing * .7, 9, dt);
    const targetY = posture === 'sit' ? .68 : posture === 'rest' ? .32 :
      posture === 'floorSit' ? .50 : posture === 'kneel' ? .71 : 1;
    this.body.scale.y = THREE.MathUtils.damp(this.body.scale.y, targetY, 7, dt);
    this.body.position.y = moving ? Math.abs(Math.sin(wave)) * .018 : Math.sin(this.clock * 1.4) * .006;
    this.head.rotation.y = Math.sin(this.clock * .42) * .025;
    this.head.rotation.x = Math.sin(this.clock * .66) * .014;
  }
  dispose() {
    this.scene.remove(this.root);
    this.geometry.forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose());
  }
}
