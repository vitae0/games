import * as THREE from 'three';
import { HOTEL } from '../config.js';
import { suitePlan, suiteTheme } from './SuitePlan.js';
import { buildBathroom } from './SuiteBathroom.js';
import { furnitureDoor, furnitureDrawer, furnitureSeat } from './FurnitureMotion.js';

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
  const theme=suiteTheme(floor,side,z);
  const q = suitePlan(side, z, theme);
  const y = baseY(floor);
  const box = (...args) => hotel.box(...args);
  const round = (...args) => hotel.rounded ? hotel.rounded(...args) : box(...args);
  const interact = (position,label,activate,anchor=position,groupId=null) => hotel.interactables.push({
    floor,position:new THREE.Vector3(position.x,y+.95,position.z),
    labelPosition:new THREE.Vector3(anchor.x,y+(anchor.y??1.0),anchor.z),
    groupId,getLabel:label,activate,
  });

  // Warm layered flooring & timber acoustic wall panels.
  box('wood',side*6.8,y+.016,z,10.45,.028,6.95);
  box('fabric', side * 6.62, y + .037, z + .6, 5.9, .020, 3.94);
  box('darkWall', side * 8.8, y + 1.40, z + 3.38, 5.8, 2.68, .085);
  for (let j = 0; j < 9; j++) box('wood', side * (6.65 + j * .46), y + 1.38, z + 3.32, .08, 2.55, .055);
  box('warm', side * 8.92, y + 2.84, z + 3.24, 3.9, .06, .075);

  const b = q.bed;
  // Raised mattress is an actual walkable surface; the slab is NOT an impassable wall.
  round('wood', b.x, y + .165, b.z, b.w + .18, .33, b.d + .12);
  round('black', b.x, y + .33, b.z, b.w + .02, .12, b.d + .05);
  const mattress = furnitureSeat(hotel, {
    x: b.x, y: y + .495, z: b.z, width: b.w - .20, height: .25,
    depth: b.d - .18, name: 'bed-mattress', compression: .028,
  });
  round('warm', b.x, y + .645, b.z + .83, b.w - .50, .07, .48);
  round('fabric', b.x, y + .66, b.z - .35, b.w - .25, .06, .96);
  box('darkWall', b.x, y + 1.03, b.z + b.d / 2 + .06, b.w + .34, 1.32, .18);
  if(hotel.climbable) hotel.climbable(floor,b.x,b.z,b.w-.28,b.d-.22,y+.62,'Yatak');
  else hotel.addWalkSurface(floor,b.x,b.z,b.w-.28,b.d-.22,y+.62);
  for (const sign of [-1, 1]) {
    const nx = b.x + sign * (b.w / 2 + .28);
    box('wood',nx,y+.27,b.z+.72,.44,.54,.48);
    hotel.addWalkSurface(floor,nx,b.z+.72,.39,.44,y+.54);
    box('warm', nx, y + .81, b.z + .68, .22, .32, .22);
    const nightDrawer = furnitureDrawer(hotel, {
      x: nx, y: y + .37, z: b.z + .72 - .255,
      width: .34, height: .16, reach: .20, name: 'bedside-drawer',
    });
    let drawerOpen = false;
    interact({ x: nx, z: b.z + .14 },
      () => drawerOpen ? 'Komodin · Çekmeceyi kapat' : 'Komodin · Çekmeceyi aç', () => {
        drawerOpen = !drawerOpen;
        nightDrawer.setOpen(drawerOpen);
      }, {x:nx,z:b.z+.48,y:.42});
  }
  const bedActions = `bed:${floor}:${side}:${z}`;
  interact({ x: side * 7.18, z: b.z - .5 }, () => 'Yatak · Uzan', player => {
    player.useFurniture('rest', b.x, b.z - .18, side === -1 ? -Math.PI / 2 : Math.PI / 2, .62,
      {style:'sleep', getSurfaceHeight:()=>mattress.surfaceY()-y,
        onEnter:()=>mattress.setOccupied(true), onExit:()=>mattress.setOccupied(false)});
  },{x:b.x,z:b.z,y:.65},bedActions);
  interact({ x: side * 8.10, z: b.z - 1.04 }, () => 'Yatak kenarı · Otur', player => {
    player.useFurniture('sit', b.x, b.z - .87, side * Math.PI / 2, .61,
      {style:'bedEdge', getSurfaceHeight:()=>mattress.surfaceY()-y,
        onEnter:()=>mattress.setOccupied(true), onExit:()=>mattress.setOccupied(false)});
  },{x:b.x,z:b.z-.65,y:.66},bedActions);

  const sofa = q.sofa;
  round('black', sofa.x, y + .24, sofa.z, sofa.w + .06, .34, sofa.d + .12);
  const sofaSeat = furnitureSeat(hotel, {
    x: sofa.x, y: y + .49, z: sofa.z, width: sofa.w,
    height: .23, depth: sofa.d, name: 'sofa-cushion', compression: .042,
  });
  // The back is on the -Z side, so the seat and avatar face the TV at +Z.
  round('fabric', sofa.x, y + .93, sofa.z - .31, sofa.w, .71, .17);
  hotel.climbable?.(floor,sofa.x,sofa.z+.12,sofa.w-.14,sofa.d-.21,y+.605,'Koltuk');
  for (const sideSign of [-1, 1]) box('wood', sofa.x + sideSign * .72, y + .64, sofa.z, .14, .37, .68);
  const ct = q.table;
  round('wood', ct.x, y + .35, ct.z, ct.w, .10, ct.d);
  hotel.climbable?.(floor,ct.x,ct.z,ct.w-.08,ct.d-.06,y+.40,'Sehpa');
  box('trim', ct.x, y + .16, ct.z, .12, .30, .12);
  interact({ x: sofa.x, z: sofa.z - .75 }, () => 'Koltuk · Otur', player => {
    player.useFurniture('sit', sofa.x, sofa.z - .03, Math.PI, .44,
      {style:'lounge', getSurfaceHeight:()=>sofaSeat.surfaceY()-y,
        onEnter:()=>sofaSeat.setOccupied(true), onExit:()=>sofaSeat.setOccupied(false)});
  },{x:sofa.x,z:sofa.z,y:.68});

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
  },{x:tv.x,z:tv.z-.16,y:1.67});

  // A compact workstation beside the entry, without blocking the central circulation path.
  const d = q.desk;
  round('wood', d.x, y + .77, d.z, d.w, .11, d.d);
  hotel.climbable?.(floor,d.x,d.z,d.w-.12,d.d-.07,y+.825,'Çalışma masası');
  for (const dx of [-.57, .57]) box('trim', d.x + dx, y + .36, d.z, .075, .67, .51);
  const deskDrawer = furnitureDrawer(hotel, {
    x: d.x, y: y + .58, z: d.z - d.d / 2 - .055,
    width: Math.min(.58, d.w * .48), height: .18, reach: .28, name: 'desk-drawer',
  });
  let deskOpen = false;
  interact({x:d.x,z:d.z-.73},
    () => deskOpen ? 'Masa çekmecesi · Kapat' : 'Masa çekmecesi · Aç', () => {
      deskOpen = !deskOpen;
      deskDrawer.setOpen(deskOpen);
    },{x:d.x,z:d.z-d.d/2,y:.58});
  // Monitor normal points toward chair (the corridor-side -X or +X).
  box('black', d.x+side*.18, y+1.11, d.z, .75,.45,.06,null,false,side*Math.PI/2);
  box('glass', d.x+side*.142, y+1.11, d.z, .65,.35,.017,null,false,side*Math.PI/2);
  const ch = q.chair;
  const chairSeat = furnitureSeat(hotel, {
    x: ch.x, y: y + .39, z: ch.z, width: ch.w,
    height: .14, depth: ch.d, material:'wood', name:'office-chair-seat',
    compression: .032, swivel: side * -.10,
  });
  // Chair back is behind the sitter, opposite the desk on ±X.
  round('fabric', ch.x-side*.29,y+.73,ch.z,.15,.65,ch.d);
  hotel.climbable?.(floor,ch.x,ch.z,ch.w-.1,ch.d-.1,y+.46,'Çalışma sandalyesi');
  box('trim', ch.x, y + .21, ch.z, .15, .36, .15);
  interact({ x: ch.x, z: ch.z + .7 }, () => 'Çalışma sandalyesi · Otur', player => {
    player.useFurniture('sit', ch.x, ch.z, -side*Math.PI/2, .43,
      {style:'desk', getSurfaceHeight:()=>chairSeat.surfaceY()-y,
        onEnter:()=>chairSeat.setOccupied(true), onExit:()=>chairSeat.setOccupied(false)});
  },{x:ch.x,z:ch.z,y:.55});

  // Separate minibar and hanging wardrobe. Their doors are functional and cheap to animate.
  const mini = q.minibar;
  round('wood',mini.x,y+.54,mini.z,mini.w,1.08,mini.d);
  hotel.climbable?.(floor,mini.x,mini.z,mini.w-.09,mini.d-.09,y+1.08,'Minibar');
  // This minibar sits by the -Z wall, so its usable facade faces +Z.
  box('black', mini.x, y + .55, mini.z + mini.d / 2 + .04, mini.w - .10, .92, .04);
  const fridgeDoor = furnitureDoor(hotel, {
    x:mini.x, y:y+.55, z:mini.z+mini.d/2+.074,
    width:mini.w-.10, height:.92, material:'wood', hinge:'left', toward:1,
    angle:Math.PI*.49, name:'minibar-door',
  });
  const glow = new THREE.Mesh(hotel.suiteMinibarGlowGeometry, hotel.materials.warm);
  glow.position.set(mini.x, y + .52, mini.z + mini.d / 2 + .068);
  glow.visible = false; hotel.scene.add(glow); hotel.suiteMeshes.push(glow);
  const waterBottle = new THREE.Mesh(hotel.suiteBottleGeometry, hotel.materials.glass);
  waterBottle.position.set(mini.x, y + .82, mini.z + mini.d / 2 + .13);
  waterBottle.visible = false; hotel.scene.add(waterBottle); hotel.suiteMeshes.push(waterBottle);
  let fridgeOpen = false, waterAvailable = true;
  interact({ x: mini.x, z: mini.z + .68 }, () => !fridgeOpen ? 'Minibar · Aç' :
    waterAvailable ? 'Minibar · Su al' : 'Minibar · Kapat', () => {
    if (!fridgeOpen) { fridgeOpen = true; fridgeDoor.setOpen(true);
      glow.visible = true; waterBottle.visible = waterAvailable;
      hotel.events.toast('Minibar açıldı'); }
    else if (waterAvailable) { waterAvailable = false; waterBottle.visible = false;
      hotel.events.toast('Minibardan su aldın'); }
    else { fridgeOpen = false; fridgeDoor.setOpen(false); glow.visible = false;
      hotel.events.toast('Minibar kapandı'); }
  },{x:mini.x,z:mini.z,y:1.05});
  const wardrobe = q.wardrobe;
  // Full-height wardrobe is a solid fixture, not a safe standing surface.
  round('wood', wardrobe.x, y + 1.32, wardrobe.z, wardrobe.w, 2.62, wardrobe.d, floor, true);
  box('black', wardrobe.x, y + 1.32, wardrobe.z - wardrobe.d / 2 - .024, wardrobe.w - .08, 2.44, .024);
  const wardrobeDoorWidth = (wardrobe.w - .08) * .5;
  const wardrobeLeft = furnitureDoor(hotel, {
    x: wardrobe.x-wardrobeDoorWidth*.5, y:y+1.32,
    z:wardrobe.z-wardrobe.d/2-.048, width:wardrobeDoorWidth,
    height:2.46, material:'wood', hinge:'left', angle:1.35, name:'wardrobe-left-door',
  });
  const wardrobeRight = furnitureDoor(hotel, {
    x: wardrobe.x+wardrobeDoorWidth*.5, y:y+1.32,
    z:wardrobe.z-wardrobe.d/2-.048, width:wardrobeDoorWidth,
    height:2.46, material:'wood', hinge:'right', angle:1.35, name:'wardrobe-right-door',
  });
  let wardrobeOpen = false;
  interact({x:wardrobe.x,z:wardrobe.z-.80},
    () => wardrobeOpen ? 'Gardırop · Kapat' : 'Gardırop · Aç', () => {
      wardrobeOpen = !wardrobeOpen;
      wardrobeLeft.setOpen(wardrobeOpen);
      wardrobeRight.setOpen(wardrobeOpen);
    },{x:wardrobe.x,z:wardrobe.z-wardrobe.d/2,y:1.45});

  // Actual closed room, with a sculpted bathtub and one shared water shader.
  buildBathroom(hotel,floor,side,z);

  // Four interior schemes alter furnishing arrangement, palette and activity props.
  if(theme==='panorama'){
    round('fabric',side*6.35,y+.35,z+2.64,1.28,.51,.45);
    hotel.climbable?.(floor,side*6.35,z+2.64,1.14,.4,y+.605,'Pencere bankı');
  }else if(theme==='executive'){
    round('wood',side*7.45,y+.53,z-1.15,.72,.86,.53);
    hotel.climbable?.(floor,side*7.45,z-1.15,.66,.47,y+.96,'Yan dolap');
  }else if(theme==='wellness'){
    round('fabric',side*6.60,y+.19,z+2.55,1.52,.23,.57);
  }
  const light=hotel.roomLighting?.register(floor,side*5.9,y+3.04,z+.36,'Süit');
  if(light)interact({x:side*3.25,z:z+.74},light.getLabel,()=>{
    const on=light.toggle();
    hotel.events.toast(on?'Oda ışığı açıldı':'Oda ışığı kapandı');
  });

  // Plants, prints and soft indirect lighting are lightweight geometry only.
  box('wood', side * 3.06, y + .47, z + 2.58, .48, .72, .48);
  box('fabric', side * 3.06, y + 1.02, z + 2.58, .69, .62, .69);
  box('warm', side * 2.16, y + 2.52, z - 2.22, .07, .73, .64);
  box('trim', side * 2.16, y + 1.75, z - 2.22, .065, .88, .62);
  box('warm', side * 6.25, y + 3.07, z + .25, 1.32, .045, .28);
  hotel.addProp(floor, side * 3.37, z + 1.54, 'Çanta', 'pink');
}
