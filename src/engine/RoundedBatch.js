import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Shared rounded unit mesh, instanced per finish to keep mobile draw calls bounded.
 * Round only furniture, not load-bearing floors, collision walls or door frames.
 */
export class RoundedBatch {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials;
    this.geometry = new RoundedBoxGeometry(1, 1, 1, 3, .09);
    this.dummy = new THREE.Object3D();
    this.groups = new Map();
    this.meshes = [];
  }
  add(name, x, y, z, w, h, d) {
    if (!this.materials[name] || ![x,y,z,w,h,d].every(Number.isFinite) || Math.min(w,h,d) <= 0) {
      throw new Error('Rounded furniture requires a known material and positive dimensions');
    }
    if (!this.groups.has(name)) this.groups.set(name, []);
    this.groups.get(name).push({x,y,z,w,h,d});
  }
  flush() {
    for (const [name, objects] of this.groups) {
      const mesh = new THREE.InstancedMesh(this.geometry, this.materials[name], objects.length);
      mesh.name = 'rounded:' + name;
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      objects.forEach((box, index) => {
        this.dummy.position.set(box.x, box.y, box.z);
        this.dummy.rotation.set(0,0,0);
        this.dummy.scale.set(box.w,box.h,box.d);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(index,this.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      this.scene.add(mesh);
      this.meshes.push(mesh);
    }
    this.groups.clear();
  }
  dispose() {
    for (const mesh of this.meshes) this.scene.remove(mesh);
    this.meshes.length = 0;
    this.geometry.dispose();
  }
}
