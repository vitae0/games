import * as THREE from 'three';
import { HOTEL } from '../config.js';
import { furnitureSeat } from './FurnitureMotion.js';
import { buildPublicRestroom } from './PublicRestroom.js';

/** Public areas occupy reserved first-floor rooms, not hotel guest rooms. */
export function buildBar(hotel) {
  const y=0,floor=0,box=(...args)=>hotel.box(...args);
  const round=(...args)=>hotel.rounded?hotel.rounded(...args):box(...args);
  const put=(x,z,label,activate)=>hotel.interactables.push({
    floor,position:new THREE.Vector3(x,y+1,z),getLabel:label,activate,
  });
  // Guests enter from the east corridor through a permanently open public doorway.
  // Stools face the counter at z=-12.55, rather than facing a wall.
  box('wood',6.8,y+.018,-10.68,10.45,.035,6.95);
  box('darkWall',8.55,y+1.38,-14.73,6.1,2.65,.09);
  for(let i=0;i<8;i++)box('wood',5.9+i*.72,y+1.32,-14.63,.08,2.35,.075);
  round('black',8.40,y+.62,-12.75,5.7,1.20,.82);
  round('wood',8.40,y+1.28,-12.75,5.86,.14,1.00);
  hotel.addWalkSurface(0,8.40,-12.75,5.7,.8,1.35);
  box('glass',8.40,y+1.81,-14.53,4.6,.05,.42);
  box('glass',8.40,y+2.29,-14.53,4.6,.05,.42);
  for(let i=0;i<7;i++){
    const x=6.55+i*.62;
    round('glass',x,y+1.72,-14.49,.12,.26,.12);
    round('glass',x,y+2.20,-14.49,.13,.24,.13);
  }
  let serviceCount=0;
  put(5.15,-12.06,()=> 'Bar · İçecek sipariş et',()=>{
    hotel.events.toast(['Maden suyu hazır','Soğuk kahve hazır','Meyve kokteyli hazır'][serviceCount++%3]);
  });
  for(const x of [6.25,8.35,10.45]){
    round('black',x,y+.31,-11.35,.55,.62,.55);
    const stool=furnitureSeat(hotel,{
      x,y:y+.66,z:-11.35,width:.64,height:.15,depth:.60,
      name:'bar-stool-seat',compression:.022,
    });
    hotel.addWalkSurface(0,x,-11.35,.56,.56,.74);
    put(x,-10.65,()=> 'Bar taburesi · Otur',p=>p.useFurniture('sit',x,-11.35,0,.62,
      {style:'stool',onEnter:()=>stool.setOccupied(true),onExit:()=>stool.setOccupied(false)}));

  }
  // Lounge zone along the north side, leaving a clear public entrance x=2..4.
  const loungeSeat=furnitureSeat(hotel,{
    x:7.0,y:y+.41,z:-8.38,width:2.8,height:.72,depth:.80,
    name:'bar-lounge-seat',compression:.045,
  });
  round('fabric',7.0,y+.85,-8.72,2.8,.59,.18);
  hotel.addWalkSurface(0,7.0,-8.38,2.72,.76,.54);
  put(6.9,-9.10,()=> 'Bar kanepesi · Otur',p=>p.useFurniture('sit',7,-8.40,Math.PI,.52,
    {style:'lounge',onEnter:()=>loungeSeat.setOccupied(true),onExit:()=>loungeSeat.setOccupied(false)}));

  const lamp=hotel.roomLighting?.register(0,8.15,3.08,-10.9,'Bar');
  if(lamp)put(4.45,-12.30,lamp.getLabel,()=>{
    const on=lamp.toggle();hotel.events.toast(on?'Bar ışıkları açıldı':'Bar ışıkları kapandı');
  });
}
/** Public WC is kept in its own module for independent layout and state tests. */
export function buildPublicRestrooms(hotel) {
  return buildPublicRestroom(hotel);
}
