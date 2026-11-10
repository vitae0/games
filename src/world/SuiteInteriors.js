import * as THREE from 'three';
import { HOTEL } from '../config.js';
import { suitePlan } from './SuitePlan.js';
import { buildBathroom } from './SuiteBathroom.js';

const baseY = floor => floor * HOTEL.floorHeight;

/** Reusable, network-free 256×128 artwork for all TV screens; only the mesh/material
 * changes per suite. We intentionally do not create 30 video streams or canvas updates. */
export function makeSuiteMedia() {
  const art = [];
  for (let channel = 0; channel < 3; channel++) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const c = canvas.getContext('2d');
    const backgrounds = [['#0d2135', '#244d6a'], ['#25253a', '#81566c'], ['#25322c', '#6d887a']];
    const g = c.createLinearGradient(0, 0, 256, 128);
    g.addColorStop(0, backgrounds[channel][0]); g.addColorStop(1, backgrounds[channel][1]);
    c.fillStyle = g; c.fillRect(0, 0, 256, 128);
    c.strokeStyle = ['#d4c1a6', '#f1cdb8', '#d3edda'][channel];
    c.globalAlpha = .52; c.lineWidth = 1.5;
    if (channel === 0) {
      for (let j = 0; j < 28; j++) {
        const h = 9 + (j * 47 % 58);
        c.strokeRect(j * 10, 109 - h, 8, h);
        for (let k = 0; k < h / 13; k++) c.fillRect(j * 10 + 2, 109 - k * 13, 2, 3);
      }
    } else if (channel === 1) {
      for (let j = 0; j < 8; j++) {
        c.beginPath(); c.arc(125 + j * 5, 58, 12 + j * 12, .1 * j, Math.PI * 1.4); c.stroke();
      }
    } else {
      for (let j = 0; j < 12; j++) {
        c.beginPath(); c.moveTo(-20 + j * 27, 120); c.bezierCurveTo(30 + j * 11, 30, 80 + j * 9, 80, 300, j * 11); c.stroke();
      }
    }
    c.globalAlpha = 1;
    c.fillStyle = '#f3ede1'; c.font = 'bold 13px system-ui';
    c.fillText(['VITAE  /  CITY', 'VITAE  /  ART', 'VITAE  /  RELAX'][channel], 14, 20);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    art.push({ texture, material: new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }) });
  }
  return art;
}

/** Builds an upscale, mirrored studio suite from a tested layout plan. */
export function buildSuite(hotel, floor, side, z) {
  const q = suitePlan(side, z);
  const y = baseY(floor);
  const box = (...args) => hotel.box(...args);
  const round = (...args) => hotel.rounded ? hotel.rounded(...args) : box(...args);
  const interact = (position, label, activate) => hotel.interactables.push({
    floor, position: new THREE.Vector3(position.x, y + .95, position.z), getLabel: label, activate,
  });

  // Warm layered flooring & timber acoustic wall panels.
  box('wood', side * 7.2, y + .016, z, 8.98, .028, 6.87);
  box('fabric', side * 6.62, y + .037, z + .6, 5.9, .020, 3.94);
  box('darkWall', side * 8.8, y + 1.40, z + 3.38, 5.8, 2.68, .085);
  for (let j = 0; j < 9; j++) box('wood', side * (6.65 + j * .46), y + 1.38, z + 3.32, .08, 2.55, .055);
  box('warm', side * 8.92, y + 2.84, z + 3.24, 3.9, .06, .075);

  const b = q.bed;
  // Raised mattress is an actual walkable surface; the slab is NOT an impassable wall.
  round('wood', b.x, y + .165, b.z, b.w + .18, .33, b.d + .12);
  round('black', b.x, y + .33, b.z, b.w + .02, .12, b.d + .05);
  round('fabric', b.x, y + .495, b.z, b.w - .20, .25, b.d - .18);
  round('warm', b.x, y + .645, b.z + .83, b.w - .50, .07, .48);
  round('fabric', b.x, y + .66, b.z - .35, b.w - .25, .06, .96);
  box('darkWall', b.x, y + 1.03, b.z + b.d / 2 + .06, b.w + .34, 1.32, .18);
  hotel.addWalkSurface(floor, b.x, b.z, b.w - .28, b.d - .22, y + .62);
  for (const sign of [-1, 1]) {
    const nx = b.x + sign * (b.w / 2 + .28);
    box('wood', nx, y + .27, b.z + .72, .44, .54, .48, floor, true);
    box('warm', nx, y + .81, b.z + .68, .22, .32, .22);
  }
  interact({ x: side * 7.18, z: b.z - .5 }, () => 'Yatak · Uzan', player => {
    player.useFurniture('rest', b.x, b.z - .18, side === -1 ? -Math.PI / 2 : Math.PI / 2, .62);
  });
  interact({ x: side * 8.10, z: b.z - 1.04 }, () => 'Yatak kenarı · Otur', player => {
    player.useFurniture('sit', b.x, b.z - .87, side * Math.PI / 2, .61);
  });

  const sofa = q.sofa;
  round('black', sofa.x, y + .24, sofa.z, sofa.w + .06, .34, sofa.d + .12, floor, true);
  round('fabric', sofa.x, y + .49, sofa.z, sofa.w, .23, sofa.d);
  round('fabric', sofa.x, y + .93, sofa.z + .31, sofa.w, .71, .17);
  for (const sideSign of [-1, 1]) box('wood', sofa.x + sideSign * .72, y + .64, sofa.z, .14, .37, .68);
  const ct = q.table;
  round('wood', ct.x, y + .35, ct.z, ct.w, .10, ct.d, floor, true);
  box('trim', ct.x, y + .16, ct.z, .12, .30, .12);
  interact({ x: sofa.x, z: sofa.z - .75 }, () => 'Koltuk · Otur', player => {
    player.useFurniture('sit', sofa.x, sofa.z - .03, Math.PI, .44);
  });

  const tv = q.tv;
  box('darkWall', tv.x, y + 1.67, tv.z + .02, 2.23, 1.45, .14);
  box('black', tv.x, y + 1.67, tv.z - .09, tv.w + .08, 1.12, .10);
  const screenGeo = hotel.suiteScreenGeometry;
  const screen = new THREE.Mesh(screenGeo, hotel.media[0].material);
  screen.position.set(tv.x, y + 1.68, tv.z - .160);
  hotel.scene.add(screen); hotel.suiteMeshes.push(screen);
  // Shared geometry is owned by Hotel to avoid per-room GPU buffer allocation.
  const television = { powered: false, channel: 0 };
  screen.visible = television.powered;
  interact({ x: tv.x, z: tv.z - .95 }, () => television.powered
    ? `TV · ${['City', 'Art', 'Relax'][television.channel]} · Kanal değiştir`
    : 'TV · Aç', () => {
    if (!television.powered) television.powered = true;
    else if (television.channel === 2) { television.channel = 0; television.powered = false; }
    else television.channel += 1;
    screen.visible = television.powered;
    screen.material = hotel.media[television.channel].material;
    hotel.events.toast(television.powered ? `TV: ${['CITY', 'ART', 'RELAX'][television.channel]}` : 'TV kapatıldı');
  });

  // A compact workstation beside the entry, without blocking the central circulation path.
  const d = q.desk;
  round('wood', d.x, y + .77, d.z, d.w, .11, d.d, floor, true);
  for (const dx of [-.57, .57]) box('trim', d.x + dx, y + .36, d.z, .075, .67, .51);
  box('black', d.x, y + 1.11, d.z + .18, .75, .45, .06);
  box('glass', d.x, y + 1.11, d.z + .133, .67, .36, .017);
  const ch = q.chair;
  round('wood', ch.x, y + .39, ch.z, ch.w, .14, ch.d);
  round('fabric', ch.x, y + .73, ch.z + .25, ch.w, .65, .15);
  box('trim', ch.x, y + .21, ch.z, .15, .36, .15);
  interact({ x: ch.x, z: ch.z + .7 }, () => 'Çalışma sandalyesi · Otur', player => {
    player.useFurniture('sit', ch.x, ch.z, Math.PI, .43);
  });

  // Separate minibar and hanging wardrobe. Their doors are functional and cheap to animate.
  const mini = q.minibar;
  round('wood', mini.x, y + .54, mini.z, mini.w, 1.08, mini.d, floor, true);
  box('black', mini.x, y + .55, mini.z - mini.d / 2 - .04, mini.w - .10, .92, .04);
  const glow = new THREE.Mesh(hotel.suiteMinibarGlowGeometry, hotel.materials.warm);
  glow.position.set(mini.x, y + .52, mini.z - mini.d / 2 - .075);
  glow.visible = false; hotel.scene.add(glow); hotel.suiteMeshes.push(glow);
  const waterBottle = new THREE.Mesh(hotel.suiteBottleGeometry, hotel.materials.glass);
  waterBottle.position.set(mini.x, y + .82, mini.z - mini.d / 2 - .13);
  waterBottle.visible = false; hotel.scene.add(waterBottle); hotel.suiteMeshes.push(waterBottle);
  let fridgeOpen = false, waterAvailable = true;
  interact({ x: mini.x, z: mini.z + .68 }, () => !fridgeOpen ? 'Minibar · Aç' :
    waterAvailable ? 'Minibar · Su al' : 'Minibar · Kapat', () => {
    if (!fridgeOpen) { fridgeOpen = true; glow.visible = true; waterBottle.visible = true;
      hotel.events.toast('Minibar açıldı'); }
    else if (waterAvailable) { waterAvailable = false; waterBottle.visible = false;
      hotel.events.toast('Minibardan su aldın'); }
    else { fridgeOpen = false; glow.visible = false;
      hotel.events.toast('Minibar kapandı'); }
  });
  const wardrobe = q.wardrobe;
  round('wood', wardrobe.x, y + 1.32, wardrobe.z, wardrobe.w, 2.62, wardrobe.d, floor, true);
  box('trim', wardrobe.x, y + 1.32, wardrobe.z - wardrobe.d / 2 - .016, wardrobe.w - .06, 2.48, .025);
  box('warm', wardrobe.x, y + 1.28, wardrobe.z - wardrobe.d / 2 - .045, .06, .32, .04);

  // Actual closed room, with a sculpted bathtub and one shared water shader.
  buildBathroom(hotel,floor,side,z);

  // Plants, prints and soft indirect lighting are lightweight geometry only.
  box('wood', side * 3.06, y + .47, z + 2.58, .48, .72, .48);
  box('fabric', side * 3.06, y + 1.02, z + 2.58, .69, .62, .69);
  box('warm', side * 2.16, y + 2.52, z - 2.22, .07, .73, .64);
  box('trim', side * 2.16, y + 1.75, z - 2.22, .065, .88, .62);
  box('warm', side * 6.25, y + 3.07, z + .25, 1.32, .045, .28);
  hotel.addProp(floor, side * 3.37, z + 1.54, 'Çanta', 'pink');
}
