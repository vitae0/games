import * as THREE from 'three';

/** Tiny, fixed-step constrained rigid-body solver for light movable props.
 * Not a replacement for Rapier: no rotational contacts or network prediction.
 * Each body is an independent sphere/cylinder approximation with mass, damping,
 * gravity, static-world collision and a damped spring per grabbing hand.
 */
export class PhysicsWorld {
  constructor(collisions, floorHeight) {
    this.collisions = collisions;
    this.floorHeight = floorHeight;
    this.bodies = [];
    this.grabs = new Map();
    this.accumulator = 0;
  }
  add(mesh, { mass = 2, radius = .25, height = .5, floor = 0 } = {}) {
    const body = { mesh, mass, radius, height, floor, position: mesh.position.clone(),
      velocity: new THREE.Vector3(), damping: .90 };
    this.bodies.push(body);
    return body;
  }
  grab(hand, body, target) {
    if (!this.bodies.includes(body)) return false;
    this.grabs.set(hand, { body, target: target.clone() });
    return true;
  }
  setTarget(hand, target) {
    const grip = this.grabs.get(hand);
    if (grip) grip.target.copy(target);
  }
  release(hand) { this.grabs.delete(hand); }
  nearest(origin, direction, floor, reach = 2.8) {
    let best = null, score = Infinity;
    for (const body of this.bodies) {
      if (body.floor !== floor) continue;
      const offset = body.position.clone().sub(origin);
      const along = offset.dot(direction);
      if (along < .1 || along > reach) continue;
      const offRay = offset.addScaledVector(direction, -along).length();
      const tolerance = Math.max(.32, body.radius + .2);
      if (offRay > tolerance || along > score) continue;
      best = body; score = along;
    }
    return best;
  }
  step(dt) {
    this.accumulator = Math.min(.1, this.accumulator + Math.max(0, dt));
    const fixed = 1 / 90;
    let substeps = 0;
    while (this.accumulator >= fixed && substeps++ < 9) {
      this.integrate(fixed);
      this.accumulator -= fixed;
    }
  }
  integrate(dt) {
    for (const body of this.bodies) {
      const acceleration = new THREE.Vector3(0, -19, 0);
      for (const { body: attached, target } of this.grabs.values()) {
        if (attached !== body) continue;
        // Spring-damper: two hands may constrain the same prop simultaneously.
        const displacement = target.clone().sub(body.position);
        acceleration.addScaledVector(displacement, Math.min(170, 105 / body.mass));
        acceleration.addScaledVector(body.velocity, -Math.min(23, 16 / body.mass));
      }
      body.velocity.addScaledVector(acceleration, dt);
      body.velocity.multiplyScalar(Math.pow(body.damping, dt * 60));
      body.velocity.clampLength(0, 9);
      const nx = body.position.x + body.velocity.x * dt;
      const nz = body.position.z + body.velocity.z * dt;
      const walk = this.collisions.move(body.floor, body.position.x, body.position.z,
        nx - body.position.x, nz - body.position.z, body.radius);
      if (Math.abs(walk.x - nx) > .001) body.velocity.x *= -.16;
      if (Math.abs(walk.z - nz) > .001) body.velocity.z *= -.16;
      body.position.x = walk.x; body.position.z = walk.z;
      body.position.y += body.velocity.y * dt;
      const base = body.floor * this.floorHeight + body.height / 2;
      if (body.position.y < base) {
        body.position.y = base;
        if (body.velocity.y < 0) body.velocity.y *= -.18;
        if (Math.abs(body.velocity.y) < .2) body.velocity.y = 0;
      }
      body.mesh.position.copy(body.position);
    }
  }
}
