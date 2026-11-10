/** AABB static/dynamic obstacles in world coordinates. Collision is per current floor. */
export class CollisionWorld {
  constructor() { this.colliders = new Map(); this.nextId = 1; }
  add(floor, x, z, width, depth, active = true) {
    const id = this.nextId++;
    this.colliders.set(id, { id, floor, minX: x - width / 2, maxX: x + width / 2, minZ: z - depth / 2, maxZ: z + depth / 2, active });
    return id;
  }
  setActive(id, active) { const box = this.colliders.get(id); if (box) box.active = active; }
  /** Disc-AABB collision, avoids sticking on corners. */
  blocked(floor, x, z, radius) {
    for (const b of this.colliders.values()) {
      if (!b.active || b.floor !== floor) continue;
      const nearX = Math.max(b.minX, Math.min(x, b.maxX));
      const nearZ = Math.max(b.minZ, Math.min(z, b.maxZ));
      if ((x - nearX) ** 2 + (z - nearZ) ** 2 < radius ** 2) return true;
    }
    return false;
  }
  /** Separate-axis movement provides wall sliding rather than all-or-nothing motion. */
  move(floor, x, z, dx, dz, radius) {
    let nx = x;
    let nz = z;
    if (!this.blocked(floor, x + dx, z, radius)) nx = x + dx;
    if (!this.blocked(floor, nx, z + dz, radius)) nz = z + dz;
    return { x: nx, z: nz };
  }
}
