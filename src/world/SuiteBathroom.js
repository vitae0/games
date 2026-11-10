import * as THREE from 'three';
import { HOTEL } from '../config.js';
import { suitePlan } from './SuitePlan.js';

const Y=floor=>floor*HOTEL.floorHeight;
const add=(hotel,mesh)=>{hotel.scene.add(mesh);hotel.suiteMeshes.push(mesh);return mesh;};

/** Closed, full-height bathroom inside each suite; physically separate from the bedroom.
 * The inner doorway is 1.16 m wide and leaves a clear walking lane to the oval bathtub.
 */
export function buildBathroom(hotel,floor,side,z) {
  const p=suitePlan(side,z);
  const bath=p.bath, tub=p.tub, y=Y(floor);
  const box=(...args)=>hotel.box(...args);
  const round=(...args)=>hotel.rounded?hotel.rounded(...args):box(...args);
  const interact=(pos,label,activate)=>hotel.interactables.push({
    floor,position:new THREE.Vector3(pos.x,y+.95,pos.z),getLabel:label,activate,
  });
  const wallX=side*9.14;
  // Stone-tile finish sits above timber by 24 mm. Never draw two coplanar top faces.
  box('slab',bath.x,y+.051,bath.z,bath.w-.12,.045,bath.d-.12);
  // Enclosed outer-wall treatment, inner wall with exact door opening, and end wall.
  box('innerWall',side*11.86,y+1.58,bath.z,.13,3.15,2.74,floor,true);
  box('innerWall',wallX,y+1.58,z-2.95,.13,3.15,.96,floor,true);
  box('innerWall',wallX,y+1.58,z-.975,.13,3.15,.65,floor,true);
  box('innerWall',side*10.50,y+1.58,z-.65,2.70,3.15,.12,floor,true);
  // Closed ceiling makes this an actual room rather than a glass partition.
  box('ceiling',bath.x,y+3.016,bath.z,bath.w-.20,.055,bath.d-.20);
  box('trim',wallX,y+2.69,z-1.89,.11,.07,1.19);
  const door=new THREE.Mesh(hotel.suiteBathroomDoorGeometry,hotel.materials.black);
  door.position.set(wallX+side*.045,y+1.19,z-1.89);
  add(hotel,door);
  const doorCollider=hotel.collisions.add(floor,wallX,z-1.89,.11,1.15);
  let open=false;
  interact({x:side*8.57,z:z-1.89},()=>open?'Banyo kapısı · Kapat':'Banyo kapısı · Aç',()=>{
    open=!open;
    hotel.collisions.setActive(doorCollider,!open);
    hotel.events.toast(open?'Banyo kapısı açıldı':'Banyo kapısı kapatıldı');
  });
  hotel.animations.push(dt=>{
    const target=z-(open?2.82:1.89);
    door.position.z=THREE.MathUtils.damp(door.position.z,target,9,dt);
  });

  // Sculpted freestanding bathtub. Position and ellipse are fully contained
  // within the enclosed bathroom; no glass shower column crosses the tub.
  const bathtub=new THREE.Mesh(hotel.bathAssets.tubGeometry,hotel.bathAssets.porcelain);
  bathtub.scale.set(1.36,1,1.54);
  bathtub.position.set(tub.x,y+.03,tub.z);
  add(hotel,bathtub);
  hotel.collisions.add(floor,tub.x,tub.z,tub.w,tub.d);
  const water=new THREE.Mesh(hotel.bathAssets.waterGeometry,hotel.bathAssets.waterMaterial);
  water.rotation.x=-Math.PI/2;
  water.scale.set(.53,.61,1);
  water.position.set(tub.x,y+.335,tub.z);
  water.renderOrder=1;
  water.visible=false;
  add(hotel,water);
  let filled=false;
  interact({x:side*9.75,z:z-2.21},()=>filled?'Küvet · Suyu boşalt':'Küvet · Suyu doldur',()=>{
    filled=!filled;
    water.visible=filled;
    hotel.events.toast(filled?'Küvet doldu':'Küvet boşaltıldı');
  });
  // Faucet is a compact brushed-metal bridge with no overlapping surfaces.
  round('trim',side*11.12,y+.75,z-1.50,.055,.50,.07);
  round('trim',side*11.00,y+.97,z-1.58,.27,.055,.07);
  round('warm',side*10.87,y+.76,z-1.51,.075,.08,.075);

  // Vanity, wall mirror and toilet remain separated from the tub and doorway.
  const sinkX=side*11.22;
  round('wood',sinkX,y+.78,z-.98,.82,.22,.46,floor,true);
  round('ceramic',sinkX,y+.89,z-.98,.66,.13,.33);
  round('trim',sinkX,y+1.09,z-.98,.045,.27,.04);
  // Reflective *looking* panel: no expensive real-time planar reflection.
  // Both decorative layers sit in FRONT of the wall's interior face (z-.71).
  // A flush mirror/wall pair would flicker or disappear at grazing camera angles.
  box('trim',sinkX,y+1.75,z-.742,.91,1.16,.028);
  box('glass',sinkX,y+1.75,z-.780,.84,1.10,.016);
  round('ceramic',side*9.90,y+.35,z-.99,.50,.44,.51,floor,true);
  round('ceramic',side*9.90,y+.61,z-.79,.48,.11,.34);
  box('warm',side*10.46,y+2.65,z-.72,.56,.045,.10);
}
