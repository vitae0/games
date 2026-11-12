import * as THREE from 'three';
import { HOTEL } from '../config.js';
import { suitePlan } from './SuitePlan.js';
import { furniturePart } from './FurnitureMotion.js';

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
  const interact=(pos,label,activate,anchor=pos)=>hotel.interactables.push({
    floor,position:new THREE.Vector3(pos.x,y+.95,pos.z),
    labelPosition:new THREE.Vector3(anchor.x,y+(anchor.y??1),anchor.z),
    getLabel:label,activate,
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
  box('innerWall',wallX,y+2.755,z-1.89,.13,.80,1.20);
  const door=new THREE.Mesh(hotel.suiteBathroomDoorGeometry,hotel.materials.black);
  door.position.set(wallX+side*.045,y+1.19,z-1.89);
  add(hotel,door);
  const doorCollider=hotel.collisions.add(floor,wallX,z-1.89,.11,1.15);
  let open=false;
  interact({x:side*8.57,z:z-1.89},()=>open?'Banyo kapısı · Kapat':'Banyo kapısı · Aç',()=>{
    open=!open;
    hotel.collisions.setActive(doorCollider,!open);
    hotel.events.toast(open?'Banyo kapısı açıldı':'Banyo kapısı kapatıldı');
  },{x:wallX,z:z-1.89,y:1.8});
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
  // The tub shell blocks walking through its rim; an interaction places the
  // avatar safely inside at the basin floor, then E exits to its previous spot.
  // The tub has a real rim and support, not a full-footprint invisible wall.
  hotel.addWalkSurface?.(floor,tub.x,tub.z,tub.w-.13,tub.d-.13,y+.52);
  const water=new THREE.Mesh(hotel.bathAssets.waterGeometry,hotel.bathAssets.waterMaterial);
  water.rotation.x=-Math.PI/2;
  water.scale.set(.53,.61,1);
  water.position.set(tub.x,y+.335,tub.z);
  water.renderOrder=1;
  water.visible=false;
  add(hotel,water);
  let filled=false;
  const waterMotion=hotel.furnitureMotion?.create(level=>{
    // Existing shared water shader supplies ripples; the surface actually rises
    // and lowers as the bath fills and drains, rather than snapping instantly.
    water.position.y=y+.13+level*.205;
    water.scale.x=.50+level*.03;
    water.scale.y=.56+level*.05;
    water.visible=filled||level>.003;
  },2.7);
  const stream=furniturePart(hotel,'glass',side*11.0,y+.80,z-1.58,
    .024,.26,.024,'tub-faucet-stream');
  stream.visible=false;
  const streamMotion=hotel.furnitureMotion?.create(level=>{
    stream.visible=filled&&level<.98;
    stream.scale.y=.05+.21*(1-level);
  },3);
  interact({x:side*9.80,z:z-2.65},()=> 'Küvet · İçine gir',player=>{
    player.useFurniture('sit',tub.x,tub.z,side*Math.PI/2,.17,
      {style:'bathe'});
  },{x:tub.x,z:tub.z,y:.55});
  interact({x:side*9.75,z:z-2.21},()=>filled?'Küvet · Suyu boşalt':'Küvet · Suyu doldur',()=>{
    filled=!filled;
    if(filled) water.visible=true;
    if(waterMotion) waterMotion.set(filled?1:0);
    else water.visible=filled;
    streamMotion?.set(filled?1:0);
    if(!filled)stream.visible=false;
    hotel.events.toast(filled?'Küvet dolduruluyor':'Küvet boşaltılıyor');
  });
  // Faucet is a compact brushed-metal bridge with no overlapping surfaces.
  round('trim',side*11.12,y+.75,z-1.50,.055,.50,.07);
  round('trim',side*11.00,y+.97,z-1.58,.27,.055,.07);
  round('warm',side*10.87,y+.76,z-1.51,.075,.08,.075);

  // Vanity, wall mirror and toilet remain separated from the tub and doorway.
  const sinkX=side*11.22;
  round('wood',sinkX,y+.78,z-.98,.82,.22,.46);
  round('ceramic',sinkX,y+.89,z-.98,.66,.13,.33);
  hotel.addWalkSurface?.(floor,sinkX,z-.98,.66,.33,y+.955);
  round('trim',sinkX,y+1.09,z-.98,.045,.27,.04);
  const tapStream=furniturePart(hotel,'glass',sinkX,y+.965,z-.98,
    .018,.20,.018,'sink-water-stream');
  tapStream.visible=false;
  let tapOn=false;
  const sinkMotion=hotel.furnitureMotion?.create(level=>{
    tapStream.scale.y=.20*level;
    tapStream.position.y=y+1.04-.10*level;
    tapStream.visible=level>.004;
  },12);
  interact({x:sinkX,z:z-1.35},()=>tapOn?'Lavabo · Musluğu kapat':'Lavabo · Musluğu aç',()=>{
    tapOn=!tapOn;
    if(sinkMotion)sinkMotion.set(tapOn?1:0);
    else tapStream.visible=tapOn;
    hotel.events.toast(tapOn?'Lavabo açıldı':'Lavabo kapatıldı');
  },{x:sinkX,z:z-.98,y:1.06});
  // Real planar reflection is active only for the nearest bathroom, through
  // a single reusable 256px Reflector. This frame stays visible otherwise.
  box('trim',sinkX,y+1.75,z-.742,.91,1.16,.028);
  box('black',sinkX,y+1.75,z-.780,.84,1.10,.015);
  hotel.mirrors?.register(floor,sinkX,y+1.75,z-.807);
  round('ceramic',side*9.90,y+.35,z-.99,.50,.44,.51);
  round('ceramic',side*9.90,y+.61,z-.79,.48,.11,.34);
  box('warm',side*10.46,y+2.65,z-.72,.56,.045,.10);
}
