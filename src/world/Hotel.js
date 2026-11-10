import * as THREE from 'three';
import { BoxBatch } from '../engine/BoxBatch.js';
import { RoundedBatch } from '../engine/RoundedBatch.js';
import { CollisionWorld } from '../engine/Collision.js';
import { HOTEL, COLORS } from '../config.js';
import { STAIR, STAIR_RISE, STAIR_RUN, stairFlight, resolveGround, walkStairs } from './Stairwell.js';
import { CitySkyline } from './CitySkyline.js';
import { PhysicsWorld } from '../engine/PhysicsWorld.js';
import { Actors } from './Actors.js';
import { createSurfaceTextures, SURFACE_KIND } from './SurfaceTextures.js';
import { UPPER_DECK, landingFootprint } from './FloorPlan.js';
import { buildSuite, makeSuiteMedia } from './SuiteInteriors.js';
import { createBathAssets } from './BathAssets.js';
import { MirrorPool } from './MirrorPool.js';
import { RoomLighting } from './RoomLighting.js';
import { buildBar, buildPublicRestrooms } from './PublicAmenities.js';

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
    this.media = makeSuiteMedia();
    this.suiteScreenGeometry = new THREE.BoxGeometry(1.70, 1.00, .025);
    this.suiteMinibarGlowGeometry = new THREE.BoxGeometry(.54, .72, .032);
    this.suiteBathroomDoorGeometry = new THREE.BoxGeometry(.06, 2.33, 1.12);
    this.batch = new BoxBatch(scene, this.materials);
    this.roundedBatch = new RoundedBatch(scene, this.materials);
    this.bathAssets = createBathAssets();
    this.physics = new PhysicsWorld(this.collisions, HOTEL.floorHeight);
    this.propGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.props = [];
    this.staticGrips = new Map();
    this.walkSurfaces = [];
    this.suiteMeshes = [];
    this.suiteBottleGeometry = new THREE.CylinderGeometry(.063, .063, .20, 8);
    this.mirrors = new MirrorPool(scene);
    this.roomLighting = new RoomLighting(scene);
    this.gripRaycaster = new THREE.Raycaster();
    this.gripRaycaster.far = 3.3;
    this.gripObstacles = [];
    this.build();
    this.city = new CitySkyline(scene);
    this.actors = new Actors(scene, this.collisions, events.toast);
  }
  createMaterials() {
    this.surfaceTextures = createSurfaceTextures();
    const result = {};
    for (const [name, color] of Object.entries(COLORS)) {
      const glow = name === 'warm';
      const textureName = SURFACE_KIND[name];
      const material = new THREE.MeshStandardMaterial({
        color, map: textureName ? this.surfaceTextures[textureName] : null,
        roughness: name === 'ceramic' ? .27 : ['wood', 'black', 'trim'].includes(name) ? .72 : .93,
        metalness: name === 'glass' ? .12 : .012,
        emissive: glow ? color : 0x000000,
        emissiveIntensity: glow ? .46 : 0,
        transparent: name === 'glass', opacity: name === 'glass' ? .14 : 1,
        depthWrite: name !== 'glass',
        side: name === 'glass' ? THREE.DoubleSide : THREE.FrontSide,
      });
      result[name] = material;
    }
    return result;
  }
  /** A deck and its lower-level ceiling have distinct, non-coplanar surfaces.
   * Reuse the identical footprints to preserve every stairwell opening. */
  deck(y, x, z, width, depth) {
    this.box('slab', x, y - .125, z, width, .25, depth);
    this.box('ceiling', x, y - .284, z, width - .025, .038, depth - .025);
  }
  box(mat, x, y, z, w, h, d, floor = null, solid = false, angle = 0) {
    this.batch.add(mat, x, y, z, w, h, d, angle);
    if (solid && floor !== null) this.collisions.add(floor, x, z, w, d);
  }
  /** Soft-edged instanced furniture, kept separate from crisp load-bearing architecture. */
  rounded(mat, x, y, z, w, h, d, floor = null, solid = false) {
    this.roundedBatch.add(mat,x,y,z,w,h,d);
    if (solid && floor !== null) this.collisions.add(floor,x,z,w,d);
  }
  wallX(floor, x, z, depth, mat = 'innerWall') {
    this.box(mat, x, Y(floor) + 1.6, z, 0.17, 3.2, depth, floor, true);
  }
  wallZ(floor, x, z, width, mat = 'innerWall') {
    this.box(mat, x, Y(floor) + 1.6, z, width, 3.2, 0.17, floor, true);
  }
  addWalkSurface(floor, x, z, width, depth, topY) {
    this.walkSurfaces.push({floor, minX:x-width/2,maxX:x+width/2,
      minZ:z-depth/2,maxZ:z+depth/2,topY});
  }
  /** All low furniture uses the same support/action contract. */
  climbable(floor, x, z, width, depth, topY, label, { sit=false }={}) {
    this.addWalkSurface(floor,x,z,width,depth,topY);
    const offset=depth*.5+.42;
    this.interactables.push({
      floor,position:new THREE.Vector3(x, floor*HOTEL.floorHeight+.9,z-offset),
      getLabel:()=>label+' · Üzerine çık',
      activate:player=>player.climbFurniture?.(x,z,topY-floor*HOTEL.floorHeight,floor),
    });
    if(sit){
      this.interactables.push({
        floor,position:new THREE.Vector3(x+.48,floor*HOTEL.floorHeight+.9,z-offset),
        getLabel:()=>label+' · Otur',
        activate:player=>player.useFurniture('sit',x,z,Math.PI,topY-floor*HOTEL.floorHeight-.1),
      });
    }
  }
  inStairArea(x, z) {
    return x >= STAIR.minX - .45 && x <= STAIR.maxX + .45 &&
      z >= STAIR.minZ - .48 && z <= STAIR.maxZ + .48;
  }
  /** Ordinary rooms remain freely walkable, including the raised mattresses. */
  groundHeight(x,z,priorHeight,currentFloor) {
    let raised=null, nearest=Infinity;
    for(const surface of this.walkSurfaces){
      if(surface.floor!==currentFloor)continue;
      if(x<surface.minX||x>surface.maxX||z<surface.minZ||z>surface.maxZ)continue;
      const difference=surface.topY-priorHeight;
      if(difference>1.08 || difference< -1.35)continue;
      const error=Math.abs(difference);
      if(error<nearest){nearest=error;raised=surface.topY;}
    }
    if(raised!==null)return raised;
    return this.inStairArea(x,z)
      ? resolveGround(x,z,priorHeight,currentFloor) : currentFloor*HOTEL.floorHeight;
  }
  /** Physics surface sweep only near the shaft, preserving existing bed controls. */
  movePlayer(floor, x, z, ground, dx, dz, radius) {
    if (this.inStairArea(x, z) || this.inStairArea(x + dx, z + dz))
      return walkStairs(this.collisions, x, z, ground, dx, dz, radius);
    const moved = this.collisions.move(floor,x,z,dx,dz,radius);
    // Tall furniture must not be traversed at ground height. The same support
    // can be reached with E, after which the player may walk across its top.
    for(const surface of this.walkSurfaces){
      if(surface.floor!==floor || surface.topY-ground<=1.08)continue;
      if(moved.x>=surface.minX && moved.x<=surface.maxX &&
         moved.z>=surface.minZ && moved.z<=surface.maxZ)
        return {x,z,ground};
    }
    return {...moved,ground:this.groundHeight(moved.x,moved.z,ground,floor)};
  }
  build() {
    const s = this.scene;
    s.background = new THREE.Color(0x070b17);
    s.fog = new THREE.FogExp2(0x111926, 0.0011);
    s.add(new THREE.HemisphereLight(0xbccce0, 0x64584d, 1.7));
    const moon = new THREE.DirectionalLight(0xc2cce4, 1.0);
    moon.position.set(24, 80, -65); s.add(moon);
    // No exterior spawning surface at hotel level: the podium is 118 m below.
    this.box('cyan', -12.23, 1.6, 0, .08, 3, 30.2);
    this.box('magenta', 12.23, 1.6, 0, .08, 3, 30.2);
    for (let i = 0; i < HOTEL.floors; i++) this.buildFloor(i);
    this.buildStairs();
    this.box('trim', 0, Y(4) + .09, 0, 24.6, .32, 30.8);
    this.box('ceiling', 0, Y(4) - .22, 0, 24.28, .035, 30.48);
    this.box('cyan', 0, Y(4) + .27, -15.1, 24.5, .12, .13);
    this.box('magenta', 0, Y(4) + .27, 15.1, 24.5, .12, .13);
    this.buildSign();
    this.batch.flush();
    this.roundedBatch.flush();
    const lamp = new THREE.PointLight(0xffe4c0, 34, 16, 2);
    lamp.position.set(0, 2.8, -13.5); s.add(lamp);
    const lobbyLight = new THREE.PointLight(0xffeddb, 22, 15, 2);
    lobbyLight.position.set(-6, 2.2, -10); s.add(lobbyLight);
  }
  buildSign() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#292c31'; ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#e8d4af'; ctx.lineWidth = 10; ctx.strokeRect(12, 12, 1000, 232);
    ctx.font = 'bold 132px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff6e5'; ctx.shadowColor = '#d3b692'; ctx.shadowBlur = 8;
    ctx.fillText('VITAE HOTEL', 512, 132);
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
    if (floor === 0) this.box('slab', 0, y - .125, 0, 24.3, .25, 30.5);
    else {
      // Real cut-out for the switchback stairwell, not a staircase through a solid slab.
      for (const deck of UPPER_DECK) {
        this.deck(y, deck.x, deck.z, deck.width, deck.depth);
      }
      // Aperture remains open. Landing geometry belongs exclusively inside this gap.
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
        if (!stairs && !(floor===0 && z===-10.5) &&
            !(floor===0 && side===1 && z===-3.5))this.makeRoom(floor,side,z);
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
    if (floor===0) {this.makeLobby();buildPublicRestrooms(this);}
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
    const publicDoor=floor===0&&(z===-10.5||(side===1&&z===-3.5));
    const initiallyOpen=stairDoor||publicDoor;
    const collision=this.collisions.add(floor,px,z,.12,width,!initiallyOpen);
    const state={open:initiallyOpen,angle:initiallyOpen?side*Math.PI*.52:0};
    const publicLabel=publicDoor
      ? z===-10.5?(side===1?'Bar':'Lobi'):'Ortak tuvalet'
      : null;
    pivot.rotation.y = state.angle;
    this.interactables.push({
      floor,
      position: new THREE.Vector3(px, Y(floor) + 1.1, z),
      getLabel:()=> stairDoor?`Merdiven · Kapıyı ${state.open?'kapat':'aç'}`
        :publicLabel?`${publicLabel} · Kapıyı ${state.open?'kapat':'aç'}`
        :`Oda ${floor*100+Math.round((z+10.5)/7)+1}${side===1?'B':'A'} · Kapıyı ${state.open?'kapat':'aç'}`,
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
    buildSuite(this, floor, side, z);
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
    const floor=0,y=0;
    // Boutique reception on west. East front room is now a real public bar.
    this.box('wood',-6.775,.015,-10.85,10.45,.03,7.5);
    this.box('darkWall',-7.20,1.50,-14.74,6.85,2.75,.065);
    for(let i=0;i<9;i++)
      this.box('wood',-9.60+i*.59,1.51,-14.67,.08,2.52,.055);
    this.rounded('wood',-7.15,.58,-12.68,5.35,1.05,.95,0,true);
    this.rounded('trim',-7.15,1.135,-12.68,5.52,.09,1.05);
    this.rounded('fabric',-7.15,.46,-9.20,2.55,.64,.89);
    this.rounded('fabric',-7.15,.93,-9.53,2.55,.66,.18);
    this.climbable(0,-7.15,-9.20,2.47,.82,.78,'Lobi kanepesi');
    this.rounded('wood',-5.32,.35,-10.02,1.02,.13,.63);
    this.climbable(0,-5.32,-10.02,.96,.56,.42,'Lobi sehpası');
    this.rounded('wood',-9.80,.52,-8.50,1.75,.94,.62,0,true);
    this.interactables.push({
      floor:0,position:new THREE.Vector3(-4.25,1,-12.25),
      getLabel:()=> 'Resepsiyon · Bilgi al',
      activate:()=>this.events.toast('Vitae Hotel: bar sağ kanatta, ortak tuvalet barın arkasında.'),
    });
    this.interactables.push({
      floor:0,position:new THREE.Vector3(-9.0,1,-8.0),
      getLabel:()=> 'Kahve köşesi · Kahve al',
      activate:()=>this.events.toast('Kahve hazır. İçeceklerini bar köşesinden de alabilirsin.'),
    });
    const lamp=this.roomLighting?.register(0,-7.0,3.06,-10.7,'Resepsiyon');
    if(lamp)this.interactables.push({
      floor:0,position:new THREE.Vector3(-3.05,1,-11.6),
      getLabel:lamp.getLabel,activate:()=>{
        const on=lamp.toggle();this.events.toast(on?'Resepsiyon ışığı açıldı':'Resepsiyon ışığı kapandı');
      },
    });
    buildBar(this);
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
  /** Stair meshes are filled physical risers, with actual tread heights matching
   * Stairwell.stairHeight. Rails sit outside the capsule's walking clearance. */
  buildStairs() {
    for (let floor = 0; floor < HOTEL.floors - 1; floor++) {
      const flight = stairFlight(floor);
      const base = Y(floor);
      for (let i = 0; i < STAIR.steps; i++) {
        const rise = (i + 1) * STAIR_RISE;
        const z = flight.forward ? STAIR.zLow + (i + .5) * STAIR_RUN
          : STAIR.zHigh - (i + .5) * STAIR_RUN;
        // The riser extends from the floor below to the top of the tread.
        this.box('slab', flight.x, base + rise / 2, z, STAIR.width, rise, STAIR_RUN);
        this.box('wood', flight.x, base + rise + .010, z,
          STAIR.width - .16, .020, STAIR_RUN - .035);
        for (const side of [-1, 1]) {
          const railX = flight.x + side * (STAIR.width / 2 + .08);
          this.box('trim', railX, base + rise + .95, z, .105, .10, STAIR_RUN - .025);
          if (i % 3 === 0 || i === STAIR.steps - 1)
            this.box('trim', railX, base + rise + .52, z, .095, 1.04, .095);
        }
      }
      // Landing occupies only the true open well; it does not intersect the
      // upper-floor deck or the final stair tread at the same height.
      const landing = landingFootprint(flight.forward);
      this.box('slab', landing.x, Y(floor + 1) - .09, landing.z,
        landing.width, .18, landing.depth);
    }
    // Ground floor already has one structural slab. This threshold does not
    // duplicate the deck surface or overlap the first tread.
    this.box('trim', -6.85, .011, STAIR.zLow - .18, 5.1, .022, .34);
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
          ? 'Mira: Vitae Hotel’in 47-50. katlarındasınız. Şehir aşağıda; merdivenler batı kanadında.'
          : 'Nova: Merhaba! Sol veya sağ tuşla elimi tutabilirsin. Tekerlekle it veya çek.'),
      };
    }
    return found;
  }
  update(dt,player=null) {
    this.mirrors.update(player);
    this.roomLighting.update(player);
    // Shared procedural water animation advances once per frame, not once per suite.
    this.bathAssets.waterMaterial.uniforms.uTime.value =
      (this.bathAssets.waterMaterial.uniforms.uTime.value + Math.max(0,dt)) % 4096;
    for (const fn of this.animations) fn(dt);
    this.physics.step(dt);
    this.actors.update(dt);
  }
  dispose() {
    this.batch.dispose();
    this.roundedBatch.dispose();
    this.bathAssets.dispose();
    this.mirrors.dispose();
    this.roomLighting.dispose();
    this.city.dispose(); this.actors.dispose();
    this.suiteMeshes.forEach(mesh => this.scene.remove(mesh));
    this.media.forEach(({ texture, material }) => { texture.dispose(); material.dispose(); });
    this.suiteScreenGeometry.dispose(); this.suiteMinibarGlowGeometry.dispose();
    this.suiteBathroomDoorGeometry.dispose();
    this.props.forEach(mesh => this.scene.remove(mesh));
    this.suiteBottleGeometry.dispose();
    this.propGeometry.dispose();
    for (const obj of this.dynamic) { obj.geometry?.dispose(); obj.material?.dispose(); obj.texture?.dispose(); }
    Object.values(this.materials).forEach((m) => m.dispose());
    Object.values(this.surfaceTextures).forEach((texture) => texture.dispose());
  }
}
