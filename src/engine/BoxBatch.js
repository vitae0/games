import * as THREE from 'three';

/** Groups static unit cubes by material. Thousands of boxes can be drawn in a few calls. */
export class BoxBatch {
  constructor(scene, materialPalette) {
    this.scene = scene;
    this.palette = materialPalette;
    this.groups = new Map();
    this.meshes = [];
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.dummy = new THREE.Object3D();
  }
  add(material, x, y, z, w, h, d, angle = 0) {
    if (!this.palette[material]) throw new Error(`Unknown material: ${material}`);
    if (Math.min(w, h, d) <= 0) throw new Error('A box dimension must be positive.');
    let list = this.groups.get(material);
    if (!list) { list = []; this.groups.set(material, list); }
    list.push({ x, y, z, w, h, d, angle });
  }
  flush() {
    for (const [key, boxes] of this.groups) {
      const mesh = new THREE.InstancedMesh(this.geometry, this.palette[key], boxes.length);
      mesh.name = `batch:${key}`;
      mesh.frustumCulled = false; // instance bounding sphere may be stale after dynamic additions
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      boxes.forEach((b, i) => {
        this.dummy.position.set(b.x, b.y, b.z);
        this.dummy.scale.set(b.w, b.h, b.d);
        this.dummy.rotation.set(0, b.angle, 0);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.frustumCulled = true;
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
    this.groups.clear();
  }
  dispose() {
    for (const mesh of this.meshes) this.scene.remove(mesh);
    this.geometry.dispose();
  }
}
