import * as THREE from 'three';
import { furniturePart } from './FurnitureMotion.js';

/** Shared spatial contract for the first-floor public bathroom.
 * The corridor doorway is at x=1.7, z=-3.5. There is no furniture within
 * its 1.5 m entrance opening. All dimensions are world-space metres.
 */
export const PUBLIC_WC = Object.freeze({
  floor: 0,
  entry: Object.freeze({ x: 1.7, z: -3.5 }),
  sinks: Object.freeze([3.56, 5.18, 6.80]),
  stalls: Object.freeze([
    Object.freeze({ id: '1', z: -5.44, accessible: false }),
    Object.freeze({ id: '2', z: -3.50, accessible: false }),
    Object.freeze({ id: '3', z: -1.56, accessible: true }),
  ]),
  stallDoorX: 8.18,
  stallBackX: 11.68,
});

/** One coherent, navigable, gender-neutral restroom. The opaque cubicles,
 * three independent sinks and operational accessories use the hotel's
 * existing batched materials and event-driven furniture animation system.
 */
export function buildPublicRestroom(hotel) {
  const floor = PUBLIC_WC.floor;
  const box = (...args) => hotel.box(...args);
  const round = (...args) => hotel.rounded ? hotel.rounded(...args) : box(...args);
  const sharedCube = hotel.propGeometry ??
    (hotel._furnitureUnitCube ||= new THREE.BoxGeometry(1, 1, 1));
  const meshBox = (name, mat, parent, px, py, pz, w, h, d) => {
    const mesh = new THREE.Mesh(sharedCube, hotel.materials[mat]);
    mesh.name = name;
    mesh.position.set(px, py, pz);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  };
  const action = (x, z, label, activate, {
    groupId = null, anchorX = x, anchorZ = z, anchorY = 1.30,
    available = () => true,
  } = {}) => hotel.interactables.push({
    floor,
    position: new THREE.Vector3(x, 1, z),
    labelPosition: new THREE.Vector3(anchorX, anchorY, anchorZ),
    groupId,
    isAvailable: available,
    getLabel: label,
    activate,
  });

  // Solid privacy wall against the exterior window, uninterrupted partition
  // above all three doors, an actual ceiling, and hygienic stone floor.
  box('slab', 6.76, .029, -3.50, 10.06, .045, 6.83);
  // The tile top is 0.0515 m above the structural floor. Register that
  // exact contact plane so the character's toes do not shimmer IN the tiles.
  hotel.addWalkSurface?.(floor,6.76,-3.50,10.06,6.83,.0515);
  // Drop the new ceiling beneath the existing structural soffit, avoiding
  // z-fighting with the upper floor's underside.
  box('ceiling', 6.76, 3.075, -3.50, 10.06, .034, 6.83);
  box('innerWall', 11.70, 1.55, -3.50, .16, 3.08, 6.66, floor, true);
  box('darkWall', 11.59, .24, -3.50, .032, .46, 6.52);
  box('trim', 11.59, 2.97, -3.50, .04, .035, 6.52);

  // Thin tile joints are lifted above the stone surface, not coplanar with it.
  // They are static instances, not individual GPU draw calls.
  for (let x = 2.50; x <= 11.2; x += 1.18)
    box('trim', x, .054, -3.50, .008, .004, 6.72);
  for (let z = -6.43; z <= -.57; z += 1.05)
    box('trim', 6.76, .054, z, 9.94, .004, .008);

  // Floating vanity on the south partition: access is from +Z. The mirrors
  // face inward (+Z), unlike the previous incorrectly oriented side mirrors.
  box('innerWall', 5.13, 1.54, -6.73, 5.13, 3.04, .10);
  round('darkWall', 5.18, .67, -6.15, 5.00, .36, .88);
  round('wood', 5.18, .895, -6.15, 5.07, .072, .96);
  hotel.addWalkSurface?.(floor, 5.18, -6.15, 5.05, .94, .94);
  box('trim', 5.18, .50, -5.71, 4.96, .055, .065);
  box('warm', 5.18, 2.65, -6.66, 4.73, .065, .075);
  box('black', 5.18, 2.58, -6.63, 4.91, .035, .065);
  for (const [index, x] of PUBLIC_WC.sinks.entries()) {
    const groupId = 'public-wc:sink:' + index;
    // Inset basin, overflow, faucet with spout, soap pump, one proper mirror.
    round('ceramic', x, .941, -6.14, 1.13, .092, .63);
    round('black', x, .969, -6.14, .76, .021, .40);
    round('glass', x, .981, -6.13, .53, .008, .26);
    round('warm', x, .999, -6.48, .067, .16, .072);
    box('warm', x, 1.083, -6.405, .036, .035, .20);
    box('warm', x, 1.083, -6.315, .059, .044, .045);
    box('trim', x - .45, 1.02, -6.47, .11, .10, .11);
    box('warm', x - .45, 1.085, -6.47, .065, .025, .07);
    box('trim', x, 1.83, -6.675, 1.22, 1.26, .035);
    box('black', x, 1.83, -6.646, 1.14, 1.17, .019);
    hotel.mirrors?.register(floor, x, 1.83, -6.615, 0);
    const stream = furniturePart(hotel, 'glass', x, 1.011, -6.31,
      .018, .15, .018, 'public-sink-water');
    stream.visible = false;
    let running = false, remaining = 0;
    const water = hotel.furnitureMotion?.create(v => {
      stream.visible = v > .005;
      stream.scale.y = .15 * v;
      stream.position.y = 1.079 - .075 * v;
    }, 13);
    const syncWater = () => {
      if (water) water.set(running ? 1 : 0);
      else stream.visible = running;
    };
    const soap = furniturePart(hotel, 'warm', x - .45, 1.13, -6.45,
      .035, .038, .035, 'public-soap-pump');
    let soapTimer = 0;
    const pump = hotel.furnitureMotion?.create(v => {
      soap.position.y = 1.13 - .028 * v;
    }, 16);
    hotel.animations.push(dt => {
      if (running && remaining > 0) {
        remaining = Math.max(0, remaining - dt);
        if (remaining === 0) {
          running = false; syncWater();
        }
      }
      if (soapTimer > 0) {
        soapTimer = Math.max(0, soapTimer - dt);
        if (soapTimer === 0) pump?.set(0);
      }
    });
    action(x, -5.37, () => `Lavabo ${index + 1} · Musluğu ${running ? 'kapat' : 'aç'}`, () => {
      running = !running;
      remaining = running ? 12 : 0;
      syncWater();
      hotel.events.toast(running ? `Lavabo ${index + 1}: su açıldı` : 'Musluk kapatıldı');
    }, { groupId, anchorX: x, anchorZ: -6.07, anchorY: 1.08 });
    action(x - .30, -5.37, () => `Lavabo ${index + 1} · Sabun al`, () => {
      soapTimer = .40;
      pump?.set(1);
      hotel.events.toast('Sıvı sabun verildi');
    }, { groupId, anchorX: x, anchorZ: -6.07, anchorY: 1.08 });
  }

  // Three private individual cubicles. The third has a wider circulation
  // space and grab rails. No full-height glass walls or transparent doors.
  for (const boundary of [-6.48, -4.47, -2.53, -.52])
    box('innerWall', 9.96, 1.48, boundary, 3.54, 2.93, .105, floor, true);

  for (const [index, spec] of PUBLIC_WC.stalls.entries()) {
    const z = spec.z;
    // Door and toilet are distinct click targets; no shared action menu.
    const doorGroup = 'public-wc:door:' + spec.id;
    const toiletGroup = 'public-wc:toilet:' + spec.id;
    const doorX = PUBLIC_WC.stallDoorX;
    // Proper opaque entrance, door header and unobstructed 1.10 m opening.
    box('innerWall', doorX, 1.49, z - .79, .14, 2.97, .45, floor, true);
    box('innerWall', doorX, 1.49, z + .79, .14, 2.97, .45, floor, true);
    box('innerWall', doorX, 2.79, z, .14, .62, 1.13);
    const pivot = new THREE.Group();
    pivot.name = 'public-stall-door-' + spec.id;
    pivot.position.set(doorX, 1.29, z - .545);
    meshBox('public-stall-door-leaf-' + spec.id, 'black',
      pivot, 0, 0, .545, .070, 2.34, 1.09);
    meshBox('public-stall-door-handle-' + spec.id, 'warm',
      pivot, -.065, -.06, .945, .070, .035, .17);
    meshBox('public-stall-door-sign-' + spec.id, 'trim',
      pivot, -.048, .63, .54, .024, .16, .20);
    hotel.scene.add(pivot);
    hotel.suiteMeshes.push(pivot);
    const blocker = hotel.collisions.add(floor, doorX, z, .13, 1.09);
    const status = furniturePart(hotel, 'cyan', doorX - .105, 2.50, z,
      .015, .085, .22, 'public-stall-occupancy-' + spec.id);
    let open = false, occupied = false, locked = false;
    const doorMotion = hotel.furnitureMotion?.create(t => {
      pivot.rotation.y = t * 1.18; // Swing into the cubicle, away from the wash aisle.
    }, 10.5);
    const updateStatus = () => {
      status.material = hotel.materials[occupied || locked ? 'magenta' : 'cyan'];
    };
    const setOpen = value => {
      open = !!value;
      hotel.collisions.setActive(blocker, !open);
      if (doorMotion) doorMotion.set(open ? 1 : 0);
      else pivot.rotation.y = open ? 1.18 : 0;
    };
    // Toilet bowl/tank, seat and hinged lid. Facing toward the corridor (-X).
    round('ceramic', 10.66, .355, z, .72, .53, .63);
    hotel.addWalkSurface?.(floor, 10.66, z, .76, .66, .62);
    round('ceramic', 10.64, .56, z, .77, .12, .68);
    round('black', 10.64, .617, z, .48, .018, .43);
    round('ceramic', 11.29, .66, z, .35, .54, .69);
    box('warm', 11.115, .81, z + .18, .025, .060, .11);
    const lidPivot = new THREE.Group();
    lidPivot.name = 'public-toilet-lid-' + spec.id;
    lidPivot.position.set(10.99, .631, z);
    meshBox('public-toilet-lid-leaf-' + spec.id, 'ceramic',
      lidPivot, -.32, 0, 0, .64, .050, .56);
    hotel.scene.add(lidPivot);
    hotel.suiteMeshes.push(lidPivot);
    let lidRaised = false;
    const lidMotion = hotel.furnitureMotion?.create(t => {
      lidPivot.rotation.z = -1.48 * t;
    }, 9);
    const setLid = value => {
      lidRaised = !!value;
      if (lidMotion) lidMotion.set(lidRaised ? 1 : 0);
      else lidPivot.rotation.z = lidRaised ? -1.48 : 0;
    };
    const ripple = furniturePart(hotel, 'glass', 10.63, .634, z,
      .41, .014, .35, 'public-toilet-flush-' + spec.id);
    ripple.visible = false;
    let flushTime = 0;
    const flushMotion = hotel.furnitureMotion?.create(v => {
      ripple.visible = v > .005;
      ripple.scale.x = .41 + .14 * v;
      ripple.scale.z = .35 + .12 * v;
      ripple.position.y = .642 + .012 * v;
    }, 18);
    hotel.animations.push(dt => {
      if (flushTime <= 0) return;
      flushTime = Math.max(0, flushTime - dt);
      if (flushTime === 0) {
        if (flushMotion) flushMotion.set(0);
        else ripple.visible = false;
      }
    });
    // Hardware and a visible paper dispenser; last stall receives support rails.
    box('trim', 9.87, .96, z + .87, .18, .17, .10);
    round('ceramic', 9.88, .90, z + .79, .16, .18, .20);
    if (spec.accessible) {
      for (const side of [-1, 1]) {
        box('trim', 10.35, .76, z + side * .78, 1.25, .046, .070);
        box('trim', 10.85, .60, z + side * .78, .045, .34, .07);
      }
    }
    const name = spec.accessible ? 'Erişilebilir kabin' : `Kabin ${spec.id}`;
    const toiletName = 'Klozet ' + spec.id;
    action(doorX - .12, z, () => `${name} · Kapıyı ${open ? 'kapat' : 'aç'}`, () => {
      if (occupied || locked) {
        hotel.events.toast('Kabin kilitli');
        return;
      }
      setOpen(!open);
      hotel.events.toast(open ? name + ' açıldı' : name + ' kapatıldı');
    }, { groupId:doorGroup, anchorX: doorX -.07, anchorZ: z, anchorY: 1.60 });
    action(doorX + .09, z, () => `${name} · ${locked ? 'Kilidi aç' : 'Kilitle'}`, () => {
      if (occupied) { hotel.events.toast('Kabin kullanımda'); return; }
      if (open) { hotel.events.toast('Kilitlemek için kapıyı kapat'); return; }
      locked = !locked;
      updateStatus();
      hotel.events.toast(locked ? 'Kapı kilitlendi' : 'Kapı kilidi açıldı');
    }, { groupId:doorGroup, anchorX: doorX -.07, anchorZ: z, anchorY: 1.60 });
    action(9.92, z, () => `${toiletName} · Kullan`, player => {
      if (!open || locked || occupied) {
        hotel.events.toast('Kullanmak için boş kabinin kapısını aç');
        return;
      }
      player?.useFurniture?.('sit', 10.63, z, Math.PI / 2, .626, {
        style: 'stool',
        onEnter: () => {
          occupied = true; locked = true;
          setOpen(false); updateStatus(); setLid(true);
        },
        onExit: () => {
          occupied = false; locked = false;
          setOpen(true); updateStatus(); setLid(false);
        },
      });
    }, { groupId:toiletGroup, anchorX: 10.43, anchorZ: z, anchorY: .77,
      available:()=>open || occupied });
    action(9.94, z, () => `${toiletName} · Sifonu çek`, () => {
      if (!open && !occupied) {
        hotel.events.toast('Sifon için kabine gir');
        return;
      }
      flushTime = 1.35;
      if (flushMotion) flushMotion.set(1);
      else ripple.visible = true;
      hotel.events.toast('Sifon çalışıyor');
    }, { groupId:toiletGroup, anchorX: 10.43, anchorZ: z, anchorY: .77,
      available:()=>open || occupied });
    action(9.96, z, () => `${toiletName} · Kapağı ${lidRaised ? 'indir' : 'kaldır'}`, () => {
      if (!open && !occupied) {
        hotel.events.toast('Kapağa ulaşmak için kabini aç');
        return;
      }
      setLid(!lidRaised);
    }, { groupId:toiletGroup, anchorX: 10.43, anchorZ: z, anchorY: .77,
      available:()=>open || occupied });
    updateStatus();
  }

  // A real corridor-facing sign rather than another unlabeled door mesh.
  // Browser-only CanvasTexture, with one shared draw call and tracked cleanup.
  if (typeof document !== 'undefined' && hotel.dynamic) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#242628'; ctx.fillRect(0, 0, 512, 160);
      ctx.strokeStyle = '#c7ae84'; ctx.lineWidth = 8;
      ctx.strokeRect(7, 7, 498, 146);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f6efe1'; ctx.font = 'bold 88px sans-serif';
      ctx.fillText('WC', 130, 78);
      ctx.fillStyle = '#d6c4a6'; ctx.font = 'bold 28px sans-serif';
      ctx.fillText('UMUMİ', 352, 83);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({map:texture});
      const geometry = new THREE.PlaneGeometry(1.26, .40);
      const sign = new THREE.Mesh(geometry, material);
      sign.name = 'public-restroom-wayfinding';
      sign.position.set(1.594, 2.81, -3.50);
      sign.rotation.y = -Math.PI / 2;
      hotel.scene.add(sign); hotel.suiteMeshes.push(sign);
      hotel.dynamic.push({geometry,material,texture});
    }
  }

  // The dryer, towel unit, bin and wall switch form a compact service zone
  // opposite the sinks, clear of the central entrance and cubicle aisle.
  box('black', 3.45, 1.43, -.42, .53, .77, .22);
  box('ceramic', 3.45, 1.37, -.571, .40, .44, .075);
  box('trim', 3.45, 1.56, -.624, .31, .08, .016);
  const dryerAir = furniturePart(hotel, 'glass', 3.45, 1.08, -.74,
    .36, .28, .028, 'public-hand-dryer-air');
  dryerAir.visible = false;
  let dryerTime = 0;
  const dryerMotion = hotel.furnitureMotion?.create(v => {
    dryerAir.visible = v > .01;
    dryerAir.scale.y = .28 * v;
    dryerAir.position.y = 1.23 - .14 * v;
  }, 13);
  hotel.animations.push(dt => {
    if (dryerTime <= 0) return;
    dryerTime = Math.max(0, dryerTime - dt);
    if (dryerTime === 0) {
      if (dryerMotion) dryerMotion.set(0);
      else dryerAir.visible = false;
    }
  });
  action(3.45, -1.10, () => 'El kurutucu · Çalıştır', () => {
    dryerTime = 4;
    if (dryerMotion) dryerMotion.set(1);
    else dryerAir.visible = true;
    hotel.events.toast('El kurutucu çalışıyor');
  }, { anchorZ: -.57, anchorY: 1.42 });

  round('black', 5.64, .35, -.81, .46, .68, .45);
  hotel.addWalkSurface?.(floor, 5.64, -.81, .48, .49, .80);
  box('trim', 5.64, .73, -.81, .50, .055, .49);
  const binLid = furniturePart(hotel, 'black', 5.64, .775, -.81,
    .43, .038, .40, 'public-restroom-bin-lid');
  let binOpen = false;
  const binMotion = hotel.furnitureMotion?.create(v => {
    binLid.rotation.z = -.70 * v;
    binLid.position.x = 5.64 + .07 * v;
    binLid.position.y = .775 + .06 * v;
  }, 10);
  action(5.66, -1.43, () => `Çöp kutusu · Kapağı ${binOpen ? 'kapat' : 'aç'}`, () => {
    binOpen = !binOpen;
    binMotion?.set(binOpen ? 1 : 0);
    hotel.events.toast(binOpen ? 'Çöp kutusu açıldı' : 'Çöp kutusu kapatıldı');
  }, { anchorX: 5.64, anchorZ: -.81, anchorY: .85 });

  box('black', 2.16, 1.36, -5.04, .12, .49, .42);
  box('ceramic', 2.20, 1.37, -5.04, .025, .31, .31);
  box('warm', 2.24, 1.23, -5.04, .06, .075, .24);

  for (const x of [4.02, 7.20, 9.75]) {
    box('warm', x, 3.010, -3.47, 1.26, .05, .11);
    box('trim', x, 3.039, -3.47, 1.35, .022, .14);
  }
  box('trim', 2.01, 1.38, -2.61, .15, .29, .22);
  box('warm', 1.918, 1.38, -2.61, .027, .13, .09);
  const lamp = hotel.roomLighting?.register(floor, 6.15, 3.02, -3.33, 'Umumi tuvalet');
  if (lamp) action(2.22, -2.60, lamp.getLabel, () => {
    const lit = lamp.toggle();
    hotel.events.toast(lit ? 'Tuvalet ışıkları açıldı' : 'Tuvalet ışıkları kapatıldı');
  }, { anchorX: 2.01, anchorZ: -2.61, anchorY: 1.40 });

  return { layout: PUBLIC_WC };
}
