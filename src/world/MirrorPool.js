import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

/** Exactly one low-resolution real-time reflection for the nearest bathroom.
 * All other rooms keep a light frame; no dozens of offscreen render passes.
 */
export class MirrorPool {
  constructor(scene) {
    this.scene = scene;
    this.locations = [];
    this.active = null;
    this.player = null;
    this.reflection = new Reflector(new THREE.PlaneGeometry(.86, 1.10), {
      textureWidth: 256, textureHeight: 256,
      clipBias: .006, color: 0xaebabb, multisample: 0,
    });
    this.reflection.name = 'active-bathroom-mirror';
    this.reflection.rotation.y = Math.PI; // Faces the bathroom interior (-Z).
    this.reflection.visible = false;
    const render = this.reflection.onBeforeRender;
    this.reflection.onBeforeRender = (...args) => {
      // Reflect the player in first person, too. Restore visibility afterwards.
      const avatar = this.player?.avatar?.root;
      const previous = avatar?.visible;
      if (avatar) avatar.visible = true;
      try { render.call(this.reflection, ...args); }
      finally { if (avatar) avatar.visible = previous; }
    };
    scene.add(this.reflection);
  }
  register(floor, x, y, z) {
    const place = { floor, x, y, z };
    this.locations.push(place);
    return place;
  }
  update(player) {
    this.player = player ?? null;
    if (!player) { this.reflection.visible = false; return; }
    const y = player.position.y + 1.3;
    let nearest = null, distanceSq = 18; // 4.24 m effective reflection range.
    for (const loc of this.locations) {
      if (loc.floor !== player.floor) continue;
      const distance = (loc.x-player.position.x)**2+
        (loc.y-y)**2+(loc.z-player.position.z)**2;
      if (distance < distanceSq) { distanceSq = distance; nearest = loc; }
    }
    this.active = nearest;
    this.reflection.visible = !!nearest;
    if (nearest) this.reflection.position.set(nearest.x,nearest.y,nearest.z);
  }
  dispose() {
    this.scene.remove(this.reflection);
    this.reflection.geometry.dispose();
    this.reflection.getRenderTarget().dispose();
    // Reflector owns a ShaderMaterial with the render-target texture.
    this.reflection.material.dispose();
  }
}
