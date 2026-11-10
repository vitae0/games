import * as THREE from 'three';
import { BoxBatch } from '../engine/BoxBatch.js';
import { CollisionWorld } from '../engine/Collision.js';
import { HOTEL, COLORS } from '../config.js';
import { STAIR, stairFlight } from './Stairwell.js';
import { CitySkyline } from './CitySkyline.js';
import { PhysicsWorld } from '../engine/PhysicsWorld.js';
import { Actors } from './Actors.js';

const HALF = HOTEL.corridorHalfWidth;
const Y = (floor) => floor * HOTEL.floorHeight;

export class Hotel {
  constructor(scene, events) {
    this.scene = scene;
    this.events = events;
    this.collisions = new CollisionWorld();
    this.interactables = [];
    this.animations = [];
    this.dynamic = [];
    this.materials = this.createMaterials();
    this.batch = new BoxBatch(scene, this.materials);
    this.physics = new PhysicsWorld(this.collisions, HOTEL.floorHeight);
    this.propGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.props = [];
    this.staticGrips = new Map();
    this.gripRaycaster = new THREE.Raycaster();
    this.gripRaycaster.far = 3.3;
    this.gripObstacles = [];
    this.build();
    this.city = new CitySkyline(scene);
    this.actors = new Actors(scene, this.collisions, events.toast);
  }
  createMaterials() {
    const result = {};
    for (const [name, color] of Object.entries(COLORS)) {
      const glow = name === 'cyan' || name === 'magenta' || name === 'warm';
      result[name] = new THREE.MeshStandardMaterial({
        color, roughness: glow ? 0.37 : 0.85,
        metalness: ['black', 'trim', 'glass'].includes(name) ? 0.45 : 0.06,
        emissive: glow ? color : 0x000000,
        emissiveIntensity: glow ? 0.92 : 0,
        transparent: name === 'glass', opacity: name === 'glass' ? .20 : 1,
        depthWrite: name !== 'glass', side: name === 'glass' ? THREE.DoubleSide : THREE.FrontSide,
      });
    }
    return result;
  }
  box(mat, x, y, z, w, h, d, floor = null, solid = false, angle = 0) {
    this.batch.add(mat, x, y, z, w, h, d, angle);
    if (solid && floor !== null) this.collisions.add(floor, x, z, w, d);
  }
  wallX(floor, x, z, depth, mat = 'innerWall') {
    this.box(mat, x, Y(floor) + 1.6, z, 0.17, 3.2, depth, floor, true);
  }
  wallZ(floor, x, z, width, mat = 'innerWall') {
    this.box(mat, x, Y(floor) + 1.6, z, width, 3.2, 0.17, floor, true);
  }
  build() {
    const s = this.scene;
    s.background = new THREE.Color(0x02030b);
    s.fog = new THREE.FogExp2(0x071125, 0.0022);
    s.add(new THREE.HemisphereLight(0x6475bb, 0x191329, 1.55));
    const moon = new THREE.DirectionalLight(0x8f9cf5, 1.15);
    moon.position.set(24, 80, -65); s.add(moon);
    // No exterior spawning surface at hotel level: the podium is 118 m below.
    this.box('cyan', -12.23, 1.6, 0, .08, 3, 30.2);
    this.box('magenta', 12.23, 1.6, 0, .08, 3, 30.2);
    for (let i = 0; i < HOTEL.floors; i++) this.buildFloor(i);
    this.buildStairs();
    this.box('trim', 0, Y(4) + .09, 0, 24.6, .32, 30.8);
    this.box('cyan', 0, Y(4) + .27, -15.1, 24.5, .12, .13);
    this.box('magenta', 0, Y(4) + .27, 15.1, 24.5, .12, .13);
    this.buildSign();
    this.batch.flush();
    const lamp = new THREE.PointLight(0x30edff, 65, 17, 2);
    lamp.position.set(0, 2.8, -13.5); s.add(lamp);
    const lobbyLight = new THREE.PointLight(0xec66bc, 28, 13, 2);
    lobbyLight.position.set(-6, 2.2, -10); s.add(lobbyLight);
  }
  buildSign() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#07162c'; ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#55ffff'; ctx.lineWidth = 10; ctx.strokeRect(12, 12, 1000, 232);
    ctx.font = 'bold 132px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#9cffff'; ctx.shadowColor = '#21cbdf'; ctx.shadowBlur = 28;
    ctx.fillText('NEON HOTEL', 512, 132);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.5), material);
    sign.position.set(0, 14.9, -15.28);
    this.scene.add(sign);
    this.dynamic.push({ geometry: sign.geometry, material, texture });
  }
  buildFloor(floor) {
    const y = Y(floor);
    if (floor === 0) this.box('slab', 0, y - .16, 0, 24.3, .32, 30.5);
    else {
      // Real cut-out for the switchback stairwell, not a staircase through a solid slab.
      this.box('slab', -10.88, y - .16, 0, 2.54, .32, 30.5);
      this.box('slab', 4.0, y - .16, 0, 16.3, .32, 30.5);
      this.box('slab', -6.85, y - .16, -3.94, 5.55, .32, 22.62);
      this.box('slab', -6.85, y - .16, 14.42, 5.55, .32, 1.63);
      // Narrow floor-level access to both landing ends from the corridor door.
      this.box('slab', -3.8, y - .10, 10.45, 1.5, .18, 6.1);
    }
    this.box('carpet', 0, y + .012, 0, 3.1, .035, 28.8);
    this.box('cyan', -HALF + .12, y + .09, 0, .035, .12, 29.3);
    this.box('magenta', HALF - .12, y + .09, 0, .035, .12, 29.3);
    // A sealed glass front: players cannot step outside at roof height.
    this.wallZ(floor, -6.75, -15, 10.5, 'outerWall');
    this.wallZ(floor, 6.75, -15, 10.5, 'outerWall');
    this.wallZ(floor, 0, -15, 3.0, 'glass');
    this.box('cyan', -1.5, y + 1.45, -15, .11, 2.9, .12);
    this.box('cyan', 1.5, y + 1.45, -15, .11, 2.9, .12);
    this.box('cyan', 0, y + 2.9, -15, 3.0, .1, .12);
    this.wallZ(floor, 0, 15, 24, 'outerWall');
    // Window bands must have actual clear sight lines to the skyline.
    for (const side of [-1, 1]) {
      this.collisions.add(floor, side * 12, 0, .17, 30);
      for (const z of HOTEL.roomCenters) {
        this.box('outerWall', side * 12, y + .45, z, .18, .9, 6.94);
        this.box('outerWall', side * 12, y + 2.98, z, .18, .46, 6.94);
        this.box('glass', side * 12, y + 1.83, z, .13, 1.9, 6.44);
        this.box('cyan', side * 12.11, y + 2.80, z, .08, .07, 6.9);
      }
    }
    // Room partitions at -7, 0, +7. Corridor remains open.
    for (const z of [-7, 0, 7]) {
      this.wallZ(floor, -6.85, z, 10.3);
      this.wallZ(floor, 6.85, z, 10.3);
    }
    for (const side of [-1, 1]) {
      for (const z of HOTEL.roomCenters) {
        const a = z - 3.5;
        const b = z + 3.5;
        const doorHalf = HOTEL.doorWidth / 2;
        this.wallX(floor, side * HALF, (a + z - doorHalf) / 2, (z - doorHalf) - a);
        this.wallX(floor, side * HALF, (z + doorHalf + b) / 2, b - (z + doorHalf));
        const stairs = side === -1 && z === 10.5;
        this.makeDoor(floor, side, z, stairs);
        if (!stairs) this.makeRoom(floor, side, z);
        // Window strips use the same material batch as the other facade lights.
      }
    }
    for (const z of [-12, -5, 2, 9]) {
      this.box('warm', 0, y + 3.08, z, 1.0, .06, .32);
      this.box('trim', 0, y + 3.13, z, 1.2, .05, .42);
    }
    this.makeElevator(floor);
    // Floor indicators on the corridor.
    this.box('magenta', -1.47, y + 1.65, 13.6, .055, .56, .56);
    if (floor === 0) this.makeLobby();
  }
  makeDoor(floor, side, z, stairDoor = false) {
    const width = HOTEL.doorWidth - .08;
    const pivot = new THREE.Group();
    const px = side * HALF;
    pivot.position.set(px, Y(floor) + 1.22, z - width / 2);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(.11, 2.42, width), this.materials.black);
    slab.position.z = width / 2; pivot.add(slab);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.13, .035, width - .15), this.materials.cyan);
    strip.position.set(0, .84, width / 2); pivot.add(strip);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.21, .08, .18), this.materials.warm);
    handle.position.set(0, -.25, width - .16); pivot.add(handle);
    this.scene.add(pivot);
    this.gripObstacles.push(slab);
    const collision = this.collisions.add(floor, px, z, .12, width, !stairDoor);
    const state = { open: stairDoor, angle: stairDoor ? side * Math.PI * .52 : 0 };
    pivot.rotation.y = state.angle;
    this.interactables.push({
      floor,
      position: new THREE.Vector3(px, Y(floor) + 1.1, z),
      getLabel: () => stairDoor ? `Merdiven · Kapıyı ${state.open ? 'kapat' : 'aç'}` : `Oda ${floor * 100 + Math.round((z + 10.5) / 7) + 1}${side === 1 ? 'B' : 'A'} · Kapıyı ${state.open ? 'kapat' : 'aç'}`,
      activate: () => {
        state.open = !state.open;
        this.collisions.setActive(collision, !state.open);
        this.events.toast(state.open ? 'Kapı açıldı' : 'Kapı kapandı');
      },
    });
    this.animations.push((dt) => {
      const target = state.open ? side * Math.PI * .52 : 0;
      state.angle = THREE.MathUtils.damp(state.angle, target, 11, dt);
      pivot.rotation.y = state.angle;
    });
    this.dynamic.push({ geometry: slab.geometry, material: null }, { geometry: strip.geometry, material: null }, { geometry: handle.geometry, material: null });
  }
  makeRoom(floor, side, z) {
    const y = Y(floor);
    const bedX = side * 8.6;
    const bedZ = z + 1.15;
    this.box('wood', bedX, y + .21, bedZ, 2.55, .4, 2.65, floor, true);
    this.box('fabric', bedX, y + .45, bedZ, 2.32, .20, 2.40);
    this.box('warm', bedX, y + .59, bedZ + .85, 2.02, .08, .42);
    this.box('darkWall', bedX, y + .83, bedZ + 1.36, 2.65, .9, .18);
    this.box('magenta', bedX, y + .65, bedZ - 1.3, 2.6, .055, .08);
    // Desk and adjustable-looking office chair.
    const deskX = side * 8.7;
    const deskZ = z - 2.03;
    this.box('wood', deskX, y + .83, deskZ, 2.25, .12, .70, floor, true);
    for (const dx of [-.92, .92]) this.box('trim', deskX + dx, y + .42, deskZ, .10, .75, .63);
    this.box('glass', deskX, y + 1.12, deskZ, .84, .52, .07);
    this.box('cyan', deskX, y + 1.35, deskZ + .04, .71, .045, .03);
    const chairX = side * 6.4;
    const chairZ = z - 2.05;
    this.box('black', chairX, y + .49, chairZ, .68, .17, .68);
    this.box('fabric', chairX, y + .90, chairZ + .27, .69, .80, .13);
    this.box('trim', chairX, y + .24, chairZ, .16, .40, .16);
    this.box('warm', side * 3.9, y + 2.56, z + 2.55, .8, .06, .1);
    this.box('magenta', side * 3.85, y + 1.4, z - 2.8, .09, .92, .08);
    this.addProp(floor, side * 4.15, z + .30, 'Valiz', 'pink');
    this.interactables.push({
      floor,
      position: new THREE.Vector3(side * 7.0, y + .8, bedZ - .5),
      getLabel: () => 'Yatak · Uzan',
      activate: (player) => player.useFurniture('rest', bedX, bedZ - .3, -Math.PI / 2),
    });
    this.interactables.push({
      floor,
      position: new THREE.Vector3(chairX, y + .8, chairZ),
      getLabel: () => 'Sandalye · Otur',
      activate: (player) => player.useFurniture('sit', chairX, chairZ, Math.PI),
    });
  }
  makeElevator(floor) {
    const y = Y(floor);
    this.box('black', 0, y + 1.48, 14.88, 2.7, 2.95, .19);
    this.box('glass', 0, y + 1.46, 14.72, 2.35, 2.58, .055);
    this.box('cyan', -1.32, y + 1.50, 14.64, .08, 2.8, .14);
    this.box('cyan', 1.32, y + 1.50, 14.64, .08, 2.8, .14);
    this.box('magenta', 0, y + 2.9, 14.58, 2.75, .08, .13);
    this.box('warm', 1.53, y + 1.1, 14.46, .15, .25, .12);
    this.interactables.push({
      floor,
      position: new THREE.Vector3(0, y + 1.3, 14.1),
      getLabel: () => 'Asansör · Kat seç',
      activate: () => this.events.openElevator(),
    });
  }
  makeLobby() {
    const y = Y(0);
    this.box('wood', -6.6, y + .54, -11.8, 5, 1.08, 1.0, 0, true);
    this.box('magenta', -6.6, y + 1.07, -11.27, 5.0, .08, .08);
    this.box('cyan', -6.6, y + 1.22, -14.65, 4.2, .08, .06);
    this.box('fabric', 7, y + .35, -11.8, 3.4, .70, 1.0, 0, true);
    this.box('glass', 7, y + .25, -10.5, 1.5, .05, 1.0);
    this.addProp(0, 1.15, -9.5, 'Çanta', 'cyan');
    this.addProp(0, 2.5, -11.5, 'Kutu', 'pink');
    this.interactables.push({
      floor: 0,
      position: new THREE.Vector3(-4.1, 1, -11.8),
      getLabel: () => 'Resepsiyon · Bilgi al',
      activate: () => this.events.toast('Neon Hotel’e hoş geldiniz. 4 kat · 32 oda · Asansör koridorun sonunda.'),
    });
  }
  addProp(floor, x, z, label, color) {
    const mat = this.materials[color === 'pink' ? 'magenta' : 'cyan'];
    const mesh = new THREE.Mesh(this.propGeometry, mat);
    mesh.scale.set(.52, .49, .38);
    mesh.position.set(x, Y(floor) + .245, z);
    this.scene.add(mesh);
    const body = this.physics.add(mesh, { mass: 2.4, radius: .28, height: .49, floor });
    body.label = label;
    this.props.push(mesh);
  }
  buildStairs() {
    const count = STAIR.steps;
    for (let floor = 0; floor < HOTEL.floors - 1; floor++) {
      const flight = stairFlight(floor);
      for (let i = 0; i < count; i++) {
        const fraction = (i + .5) / count;
        const z = flight.forward
          ? STAIR.zLow + fraction * (STAIR.zHigh - STAIR.zLow)
          : STAIR.zHigh - fraction * (STAIR.zHigh - STAIR.zLow);
        const y = Y(floor) + fraction * HOTEL.floorHeight;
        // Each stair is a visible tread, while movement uses a smooth grounded ramp.
        this.box('slab', flight.x, y - .07, z, STAIR.width, .15, (STAIR.zHigh - STAIR.zLow) / count + .018);
        this.box('cyan', flight.x, y + .02, z + (flight.forward ? -.13 : .13), STAIR.width - .15, .04, .035);
      }
      // Landing, located at the next floor, bridges the two side-by-side flights.
      const landingZ = flight.forward ? STAIR.zHigh : STAIR.zLow;
      this.box('slab', -6.85, Y(floor + 1) - .09, landingZ, 5.7, .18, .82);
      for (const x of [STAIR.xLeft - 1.2, STAIR.xRight + 1.2]) {
        this.box('magenta', x, Y(floor) + 1.8, (STAIR.zLow + STAIR.zHigh) / 2, .06, .09, 4.8);
      }
    }
    this.box('slab', -6.85, -.055, STAIR.zLow, 5.6, .11, .85);
  }
  nearestStaticSurface(origin, direction) {
    this.gripRaycaster.set(origin, direction);
    // Only hotel interior geometry and physical doors are selectable, never the city.
    const collidables = [...this.batch.meshes, ...this.gripObstacles];
    const hits = this.gripRaycaster.intersectObjects(collidables, false);
    return hits.find(hit => hit.distance > .16 && hit.distance <= 3.3) ?? null;
  }
  tryGrab(side, origin, direction, floor) {
    const surface = this.nearestStaticSurface(origin, direction);
    const occluderDistance = surface?.distance ?? Infinity;
    const prop = this.physics.nearest(origin, direction, floor, 3.3);
    const person = floor === 0 ? this.actors.nearestHand(origin, direction) : null;
    const propDistance = prop ? prop.position.clone().sub(origin).dot(direction) : Infinity;
    const personDistance = person
      ? this.actors.handPoint(person.actor, person.hand).sub(origin).dot(direction)
      : Infinity;
    // A solid wall or closed door cannot be bypassed by clicking through it.
    if (person && personDistance <= occluderDistance + .07 &&
      personDistance < propDistance + .15 &&
      this.actors.grab(side, person.actor, person.hand)) {
      return { kind: 'character', label: `${person.actor.name} · el tutuşu`, distance: personDistance };
    }
    if (prop && propDistance <= occluderDistance + .07 &&
      this.physics.grab(side, prop, prop.position)) {
      return { kind: 'prop', label: prop.label, distance: propDistance };
    }
    if (surface) {
      this.staticGrips.set(side, surface.point.clone());
      return { kind: 'static', label: 'Sabit yüzey', distance: surface.distance };
    }
    return null;
  }
  moveGrip(side, target) {
    this.physics.setTarget(side, target);
    this.actors.setTarget(side, target);
  }
  staticGripOffset(side, target) {
    const anchor = this.staticGrips.get(side);
    return anchor ? anchor.clone().sub(target) : null;
  }
  releaseGrip(side) {
    this.physics.release(side); this.actors.release(side);
    this.staticGrips.delete(side);
  }
  closestInteraction(player, direction) {
    if (player.posture !== 'stand') return {
      getLabel: () => 'Mobilyadan kalk', activate: () => player.standUp(),
    };
    let found = null;
    let best = Infinity;
    for (const obj of this.interactables) {
      if (obj.floor !== player.floor) continue;
      const dx = obj.position.x - player.position.x;
      const dz = obj.position.z - player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance > 2.35 || distance < .01) continue;
      const facing = (dx * direction.x + dz * direction.z) / distance;
      if (facing < 0.16) continue;
      const score = distance - facing * .6;
      if (score < best) { best = score; found = obj; }
    }
    if (!found) {
      const person = this.actors.getNearby(player);
      if (person) return {
        getLabel: () => person.anchored ? 'Mira · Resepsiyonla konuş' : 'Nova · Konuş',
        activate: () => this.events.toast(person.anchored
          ? 'Mira: Neon Hotel’in 47-50. katlarındasınız. Şehir aşağıda; merdivenler batı kanadında.'
          : 'Nova: Merhaba! Sol veya sağ tuşla elimi tutabilirsin. Tekerlekle it veya çek.'),
      };
    }
    return found;
  }
  update(dt) {
    for (const fn of this.animations) fn(dt);
    this.physics.step(dt);
    this.actors.update(dt);
  }
  dispose() {
    this.batch.dispose();
    this.city.dispose(); this.actors.dispose();
    this.props.forEach(mesh => this.scene.remove(mesh));
    this.propGeometry.dispose();
    for (const obj of this.dynamic) { obj.geometry?.dispose(); obj.material?.dispose(); obj.texture?.dispose(); }
    Object.values(this.materials).forEach((m) => m.dispose());
  }
}
