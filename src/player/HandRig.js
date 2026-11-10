import * as THREE from 'three';

/** Low-cost visible hands in first-person view. Scene-owned camera must be attached. */
export class HandRig {
  constructor(camera) {
    this.camera = camera;
    this.root = new THREE.Group();
    camera.add(this.root);
    this.arms = {};
    this.geometries = [new THREE.BoxGeometry(.12, .39, .13), new THREE.BoxGeometry(.15, .16, .18)];
    this.materials = [
      new THREE.MeshBasicMaterial({ color: 0x24314c, depthTest: false, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: 0x83e8db, depthTest: false, depthWrite: false }),
    ];
    for (const [side, sign] of [['left', -1], ['right', 1]]) {
      const group = new THREE.Group();
      group.position.set(sign * .37, -.47, -.73);
      group.rotation.z = -sign * .28;
      const sleeve = new THREE.Mesh(this.geometries[0], this.materials[0]);
      sleeve.position.y = -.13;
      const palm = new THREE.Mesh(this.geometries[1], this.materials[1]);
      palm.position.y = .12;
      group.add(sleeve, palm);
      this.root.add(group);
      group.traverse(child => { if (child.isMesh) child.renderOrder = 100; });
      this.arms[side] = { group, palm, sign };
    }
  }
  update(dt, left, right, visible) {
    this.root.visible = visible;
    for (const [side, data] of Object.entries(this.arms)) {
      const input = side === 'left' ? left : right;
      const reached = input.pressed ? 1 : 0;
      const targetZ = reached ? -1.17 : -.73;
      data.group.position.z = THREE.MathUtils.damp(data.group.position.z, targetZ, 12, dt);
      data.group.position.y = THREE.MathUtils.damp(data.group.position.y, reached ? -.27 : -.47, 12, dt);
      data.palm.rotation.x = THREE.MathUtils.damp(data.palm.rotation.x, input.grip ? -.7 : 0, 13, dt);
      data.palm.scale.x = THREE.MathUtils.damp(data.palm.scale.x, input.grip ? .72 : 1, 13, dt);
    }
  }
  dispose() {
    this.camera.remove(this.root);
    this.geometries.forEach(g => g.dispose());
    this.materials.forEach(m => m.dispose());
  }
}
