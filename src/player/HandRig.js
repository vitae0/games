import * as THREE from 'three';
import { normalizeAvatar, SKIN_TONES } from '../avatar/AvatarConfig.js';
import { softLoftGeometry } from '../avatar/SoftAvatar.js';

/** Low-cost first-person hands with fingers. Cosmetic only: the physics grip stays in Player. */
export class HandRig {
  constructor(camera, profile = {}) {
    this.camera = camera;
    this.root = new THREE.Group();
    camera.add(this.root);
    this.geometries = [new THREE.SphereGeometry(1, 12, 10), softLoftGeometry([
      { y: -.50, rx: .73, rz: .77 }, { y: -.42, rx: .92, rz: .93 },
      { y: -.08, rx: 1.02, rz: 1.0 }, { y: .34, rx: .87, rz: .92 },
      { y: .50, rx: .65, rz: .73 },
    ], 12, 2.25)];
    this.sleeveMaterial = new THREE.MeshBasicMaterial({ color: 0x9b968e, depthTest: false, depthWrite: false });
    this.skinMaterial = new THREE.MeshBasicMaterial({ color: SKIN_TONES[normalizeAvatar(profile).skinTone], depthTest: false, depthWrite: false });
    this.materials = [this.sleeveMaterial, this.skinMaterial];
    this.arms = {};
    for (const [side, sign] of [['left', -1], ['right', 1]]) {
      const group = new THREE.Group();
      group.position.set(sign * .35, -.49, -.74);
      group.rotation.z = -sign * .23;
      const sleeve = this.add(group, 1, this.sleeveMaterial, 0, -.19, .018, .089, .38, .09);
      const wrist = this.add(group, 0, this.skinMaterial, 0, .04, -.006, .074, .11, .073);
      const palm = this.add(group, 0, this.skinMaterial, 0, .14, -.018, .101, .13, .053);
      const digits = [];
      for (let f = 0; f < 4; f++) {
        const digit = this.add(group, 0, this.skinMaterial,
          (f - 1.5) * .046, .25 + (1.5 - Math.abs(f - 1.5)) * .012, -.014,
          .022, .078 - Math.abs(f - 1.5) * .010, .024);
        digits.push(digit);
      }
      const thumb = this.add(group, 0, this.skinMaterial,
        -sign * .112, .115, -.045, .033, .071, .030);
      thumb.rotation.z = sign * .54;
      group.add(sleeve, wrist); // re-parent no-op, preserves explicit assembly
      this.root.add(group);
      group.traverse(child => { if (child.isMesh) child.renderOrder = 100; });
      this.arms[side] = { group, sleeve, wrist, palm, digits, thumb, sign };
    }
    this.setProfile(profile);
  }
  add(group, geometryIndex, mat, x,y,z,sx,sy,sz) {
    const mesh = new THREE.Mesh(this.geometries[geometryIndex], mat);
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz);group.add(mesh);return mesh;
  }
  setProfile(profile) {
    const p = normalizeAvatar(profile);
    const soft = p.baseModel === 'soft';
    this.skinMaterial.color.set(soft ? p.bodyColor : SKIN_TONES[p.skinTone]);
    this.sleeveMaterial.color.set(soft ? p.bodyColor : { neon:0xcac5bc, stealth:0x343d47, chrome:0x977c81 }[p.outfit]);
    for (const arm of Object.values(this.arms)) {
      arm.wrist.visible = !soft;
      arm.thumb.visible = !soft;
      for (const digit of arm.digits) digit.visible = !soft;
      arm.palm.scale.setScalar(soft ? .092 * p.handSize : 1);
      if (!soft) arm.palm.scale.set(.101, .13, .053);
      arm.sleeve.scale.set(.089 * (soft ? p.forearmSize : 1), .38, .09 * (soft ? p.forearmSize : 1));
    }
  }
  update(dt, left, right, visible) {
    this.root.visible = visible;
    for (const [side, data] of Object.entries(this.arms)) {
      const input = side === 'left' ? left : right;
      const reached = input.pressed ? 1 : 0;
      data.group.position.z = THREE.MathUtils.damp(data.group.position.z, reached ? -1.14 : -.74, 12, dt);
      data.group.position.y = THREE.MathUtils.damp(data.group.position.y, reached ? -.28 : -.49, 12, dt);
      data.palm.rotation.x = THREE.MathUtils.damp(data.palm.rotation.x, input.grip ? -.27 : 0, 13, dt);
      for (const f of data.digits) {
        f.rotation.x = THREE.MathUtils.damp(f.rotation.x, input.grip ? -.65 : 0, 12, dt);
      }
    }
  }
  dispose() {
    this.camera.remove(this.root);
    this.geometries.forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose());
  }
}
