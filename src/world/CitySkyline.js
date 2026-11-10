import * as THREE from 'three';
import { BoxBatch } from '../engine/BoxBatch.js';

// A deterministic, low-draw-call skyline. It is decorative, never loaded as game physics.
function randomGenerator(seed) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
}

export class CitySkyline {
  constructor(scene) {
    this.scene = scene;
    this.materials = {
      facade: new THREE.MeshBasicMaterial({ color: 0x17233d }),
      tower: new THREE.MeshBasicMaterial({ color: 0x202e50 }),
      black: new THREE.MeshBasicMaterial({ color: 0x090e1a }),
      road: new THREE.MeshBasicMaterial({ color: 0x0a1020 }),
      sidewalk: new THREE.MeshBasicMaterial({ color: 0x263044 }),
      cyan: new THREE.MeshBasicMaterial({ color: 0x2eece8 }),
      pink: new THREE.MeshBasicMaterial({ color: 0xe936a2 }),
      yellow: new THREE.MeshBasicMaterial({ color: 0xf7c865 }),
      red: new THREE.MeshBasicMaterial({ color: 0xd42d5a }),
    };
    this.batch = new BoxBatch(scene, this.materials);
    this.build();
  }
  build() {
    const b = this.batch;
    const random = randomGenerator(50171);
    const base = -118;
    b.add('road', 0, base - .3, 0, 1200, .5, 1200);
    // Street grid. Roads are far below the playable hotel, not traversable.
    for (let axis = -4; axis <= 4; axis++) {
      const p = axis * 68;
      b.add('sidewalk', p, base + .01, 0, 55, .04, 1000);
      b.add('road', p + 29, base + .04, 0, 12, .055, 1000);
      b.add('sidewalk', 0, base + .01, p, 1000, .04, 55);
      b.add('road', 0, base + .04, p + 29, 1000, .055, 12);
      for (let q = -4; q <= 4; q++) {
        // Road markings at intersections are cheap instances.
        b.add('yellow', p + 29, base + .075, q * 68 + 14, .13, .015, 4.4);
        b.add('yellow', q * 68 + 14, base + .075, p + 29, 4.4, .015, .13);
      }
    }
    // 81 city blocks. No textures, no network transfers, mostly 9 instanced draw calls.
    for (let ix = -4; ix <= 4; ix++) for (let iz = -4; iz <= 4; iz++) {
      const x = ix * 68 + (random() - .5) * 12;
      const z = iz * 68 + (random() - .5) * 12;
      if (Math.abs(x) < 42 && Math.abs(z) < 43) continue;
      const w = 21 + random() * 20, d = 19 + random() * 20;
      const h = 32 + random() * 90 + (random() > .82 ? 57 : 0);
      const m = random() > .5 ? 'facade' : 'tower';
      b.add(m, x, base + h / 2, z, w, h, d);
      b.add(random() > .5 ? 'pink' : 'cyan', x, base + h + .32, z, w + .25, .50, d + .25);
      for (let level = 0; level < Math.floor(h / 6); level++) {
        const y = base + level * 6 + 3.2;
        const lit = random() > .28;
        if (!lit) continue;
        const glow = random() < .45 ? 'cyan' : random() < .65 ? 'pink' : 'yellow';
        b.add(glow, x, y, z - d / 2 - .035, Math.min(w * .7, 15), .11, .07);
        if (level % 3 === 0) b.add(glow, x + w / 2 + .045, y, z, .07, .10, d * .65);
      }
      if (random() > .72) b.add('pink', x, base + h * .55, z - d / 2 - .12, w * .48, 2.5, .12);
    }
    // A visible high-rise podium below the inaccessible playable floors.
    b.add('black', 0, -59, 0, 24, 118, 30);
    for (let y = -112; y < -2; y += 3.6) {
      b.add('cyan', -12.2, y, 0, .13, .09, 30.3);
      b.add('pink', 12.2, y, 0, .13, .09, 30.3);
      b.add('tower', 0, y, -15.1, 24.4, 2.8, .17);
      for (const x of [-8, -3, 3, 8]) {
        b.add((y / 3.6 | 0) % 3 === 0 ? 'pink' : 'cyan', x, y + .9, -15.23, 2.5, .14, .06);
      }
    }
    // Traffic signals at four junctions. Their red/amber/green lenses are modeled.
    for (const x of [-39, 39]) for (const z of [-39, 39]) {
      b.add('tower', x, base + 3.1, z, .23, 6.2, .23);
      b.add('black', x, base + 5.9, z, .9, 1.8, .62);
      for (const [i, name] of ['red', 'yellow', 'cyan'].entries()) {
        b.add(name, x, base + 6.40 - i * .5, z - .34, .45, .29, .08);
      }
    }
    b.flush();
    // One stars buffer instead of hundreds of star meshes.
    const starRandom = randomGenerator(958);
    const positions = [];
    for (let i = 0; i < 360; i++) {
      const theta = starRandom() * Math.PI * 2;
      const phi = .08 + starRandom() * Math.PI * .43;
      const rad = 490;
      positions.push(Math.cos(theta) * Math.cos(phi) * rad, Math.sin(phi) * rad, Math.sin(theta) * Math.cos(phi) * rad);
    }
    this.starGeometry = new THREE.BufferGeometry();
    this.starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.starMaterial = new THREE.PointsMaterial({ color: 0xa7bfe8, size: 1.7, sizeAttenuation: false });
    this.stars = new THREE.Points(this.starGeometry, this.starMaterial);
    this.scene.add(this.stars);
  }
  dispose() {
    this.batch.dispose();
    this.scene.remove(this.stars);
    this.starGeometry.dispose(); this.starMaterial.dispose();
    Object.values(this.materials).forEach(m => m.dispose());
  }
}
