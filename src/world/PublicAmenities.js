import * as THREE from 'three';
import { HOTEL } from '../config.js';

/** Public areas occupy reserved first-floor rooms, not hotel guest rooms. */
export function buildBar(hotel) {
  const y=0,floor=0,box=(...args)=>hotel.box(...args);
  const round=(...args)=>hotel.rounded?hotel.rounded(...args):box(...args);
  const put=(x,z,label,activate)=>hotel.interactables.push({
    floor,position:new THREE.Vector3(x,y+1,z),getLabel:label,activate,
  });
  // Guests enter from the east corridor through a permanently open public doorway.
  // Stools face the counter at z=-12.55, rather than facing a wall.
  box('wood',6.8,y+.018,-10.68,9.8,.035,6.45);
  box('darkWall',8.55,y+1.38,-14.73,6.1,2.65,.09);
  for(let i=0;i<8;i++)box('wood',5.9+i*.72,y+1.32,-14.63,.08,2.35,.075);
  round('black',8.40,y+.62,-12.75,5.7,1.20,.82);
  round('wood',8.40,y+1.28,-12.75,5.86,.14,1.00);
  hotel.climbable?.(0,8.40,-12.75,5.7,.8,1.35,'Bar tezgâhı');
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
    round('fabric',x,y+.66,-11.35,.64,.15,.60);
    hotel.addWalkSurface(0,x,-11.35,.56,.56,.74);
    put(x,-10.65,()=> 'Bar taburesi · Otur',p=>p.useFurniture('sit',x,-11.35,0,.62));
    put(x,-10.91,()=> 'Bar taburesi · Üstüne çık',p=>p.climbFurniture?.(x,-11.35,.74,0));
  }
  // Lounge zone along the north side, leaving a clear public entrance x=2..4.
  round('fabric',7.0,y+.41,-8.38,2.8,.72,.80);
  round('fabric',7.0,y+.85,-8.72,2.8,.59,.18);
  hotel.addWalkSurface(0,7.0,-8.38,2.72,.76,.54);
  put(6.9,-9.10,()=> 'Bar kanepesi · Otur',p=>p.useFurniture('sit',7,-8.40,Math.PI,.52));
  put(7.5,-9.04,()=> 'Bar kanepesi · Üzerine çık',p=>p.climbFurniture?.(7,-8.38,.54,0));
  const lamp=hotel.roomLighting?.register(0,8.15,3.08,-10.9,'Bar');
  if(lamp)put(4.45,-12.30,lamp.getLabel,()=>{
    const on=lamp.toggle();hotel.events.toast(on?'Bar ışıkları açıldı':'Bar ışıkları kapandı');
  });
}
export function buildPublicRestrooms(hotel) {
  const floor=0,y=0,box=(...args)=>hotel.box(...args);
  const round=(...args)=>hotel.rounded?hotel.rounded(...args):box(...args);
  const put=(x,z,label,activate)=>hotel.interactables.push({
    floor,position:new THREE.Vector3(x,y+1,z),getLabel:label,activate,
  });
  // Separate public WC area behind bar; room door is open at x=1.7,z=-3.5.
  box('slab',7.30,.037,-3.5,9.0,.045,6.45);
  box('darkWall',10.99,1.47,-6.70,.12,2.9,.16);
  // Sink bank is against the north wall; access lane remains clear.
  for(const z of [-5.25,-3.55,-1.85]){
    round('ceramic',5.38,.69,z,.88,.23,.52);
    round('glass',5.38,.86,z,.66,.045,.35);
    box('warm',5.37,2.49,z,.71,.04,.10);
    hotel.climbable?.(0,5.38,z,.74,.44,.84,'Lavabo bankosu');
    // Individual wall-mounted mirrors use the same nearby Reflector as suites.
    box('trim',6.04,1.73,z,.032,1.06,.80);
    box('black',6.00,1.73,z,.017,.98,.73);
    hotel.mirrors?.register(0,5.983,1.73,z,-Math.PI/2);
  }
  const stalls=[-5.20,-1.80];
  for(const z of stalls){
    // Two private cubicles to the east; central aisle x=2..7.7 stays clear.
    for(const edgeZ of [z-1.02,z+1.02])
      box('innerWall',9.83,1.48,edgeZ,3.30,2.95,.10,0,true);
    box('innerWall',11.50,1.48,z,.10,2.95,1.98,0,true);
    box('innerWall',8.16,1.48,z-.77,.10,2.95,.47,0,true);
    box('innerWall',8.16,1.48,z+.77,.10,2.95,.47,0,true);
    round('ceramic',10.53,.35,z,.57,.46,.56,0,true);
    const door=new THREE.Mesh(hotel.suiteBathroomDoorGeometry,hotel.materials.black);
    door.position.set(8.16,1.19,z);
    hotel.scene.add(door);hotel.suiteMeshes.push(door);
    const collider=hotel.collisions.add(0,8.16,z,.12,1.06);
    let open=false;
    put(7.15,z,()=>`Ortak tuvalet · Kapıyı ${open?'kapat':'aç'}`,()=>{
      open=!open;hotel.collisions.setActive(collider,!open);
      hotel.events.toast(open?'Tuvalet kabini açıldı':'Tuvalet kabini kapandı');
    });
    hotel.animations.push(dt=>{door.position.z=THREE.MathUtils.damp(door.position.z,z-(open ? 1.03 : 0),8,dt)});
  }
  let taps=false;
  put(9.3,-3.40,()=>`Lavabolar · Suyu ${taps?'kapat':'aç'}`,()=>{
    taps=!taps;hotel.events.toast(taps?'Musluklar açıldı':'Musluklar kapatıldı');
  });
  const lamp=hotel.roomLighting?.register(0,6.8,3.05,-3.5,'Ortak tuvalet');
  if(lamp)put(4.25,-3.85,lamp.getLabel,()=>{
    const on=lamp.toggle();hotel.events.toast(on?'Tuvalet ışığı açıldı':'Tuvalet ışığı kapandı');
  });
}
