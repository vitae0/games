import { HOTEL } from '../config.js';
import { UPPER_DECK, landingFootprint } from './FloorPlan.js';

/** Rotated 90° stair system: two narrow parallel lanes run east-west.
 * Entering the west stair room from the corridor, the ascending lane is
 * on the entrant's right (-Z). The doorway and near turning apron stay clear.
 */
export const STAIR = Object.freeze({
  xNear:-4.30, xFar:-11.0, zRight:9.0, zLeft:11.4,
  width:1.52, steps:19, xLeft:-4.30, xRight:-11.0,
  minX:-11.22,maxX:-4.075,minZ:8.23,maxZ:12.23,
  // Legacy properties retained for general room checks, not travel direction.
  zLow:8.23,zHigh:12.23,
});
export const STAIR_RISE=HOTEL.floorHeight/STAIR.steps;
export const STAIR_RUN=(STAIR.xNear-STAIR.xFar)/STAIR.steps;
const TOLERANCE=1e-7;
const DECK_SEAM_SUPPORT=.035;

export function stairFlight(floor) {
  if(!Number.isInteger(floor)||floor<0||floor>=HOTEL.floors-1)return null;
  return {floor,z:floor%2===0?STAIR.zRight:STAIR.zLeft,
    forward:floor%2===0,xStart:floor%2===0?STAIR.xNear:STAIR.xFar,
    xEnd:floor%2===0?STAIR.xFar:STAIR.xNear};
}
export function inStairLane(floor,x,z,radius=0){
  const flight=stairFlight(floor);
  if(!flight)return false;
  const inset=Math.max(0,radius)*.48;
  return Math.abs(z-flight.z)<=STAIR.width/2-inset+TOLERANCE &&
    x>=STAIR.xFar-TOLERANCE&&x<=STAIR.xNear+TOLERANCE;
}
export function stairProgress(floor,x){
  const f=stairFlight(floor);
  if(!f)return null;
  const t=Math.max(0,Math.min(1,(STAIR.xNear-x)/(STAIR.xNear-STAIR.xFar)));
  return f.forward?t:1-t;
}
/** Invisible walkable ramp under the visible treads. Smooth, reversible height. */
export function stairRampHeight(floor,x,z){
  if(!inStairLane(floor,x,z))return null;
  return floor*HOTEL.floorHeight+stairProgress(floor,x)*HOTEL.floorHeight;
}
export function stairStepIndex(floor,x){
  const t=stairProgress(floor,x);
  return t===null?null:Math.max(0,Math.min(STAIR.steps,Math.ceil(t*STAIR.steps-1e-9)));
}
export function stairHeight(floor,x,z){
  if(!inStairLane(floor,x,z))return null;
  return floor*HOTEL.floorHeight+stairStepIndex(floor,x)*STAIR_RISE;
}
export function groundFloor(y){
  return Math.max(0,Math.min(HOTEL.floors-1,Math.floor((y+.055)/HOTEL.floorHeight)));
}
function inRect(rect,x,z){
  return Math.abs(x-rect.x)<=rect.width/2+DECK_SEAM_SUPPORT &&
    Math.abs(z-rect.z)<=rect.depth/2+DECK_SEAM_SUPPORT;
}
function flatSupport(floor,x,z){
  if(floor===0)return x>=-12.15&&x<=12.15&&z>=-15.25&&z<=15.25;
  return UPPER_DECK.some(r=>inRect(r,x,z))||
    inRect(landingFootprint(stairFlight(floor-1).forward),x,z);
}
export function stairSupports(x,z,radius=0){
  const found=[];
  for(let f=0;f<HOTEL.floors;f++)
    if(flatSupport(f,x,z))found.push({y:f*HOTEL.floorHeight,floor:f,type:'deck'});
  for(let f=0;f<HOTEL.floors-1;f++)
    if(inStairLane(f,x,z,radius))
      found.push({y:stairRampHeight(f,x,z),floor:f,type:'ramp'});
  return found;
}
export function pickStairSupport(x,z,previousHeight,radius=0,maxRise=.24,maxDrop=.24){
  const candidates=stairSupports(x,z,radius);
  for(let f=0;f<HOTEL.floors-1;f++){
    if(!inStairLane(f,x,z,radius))continue;
    const tread=stairRampHeight(f,x,z),base=f*HOTEL.floorHeight;
    if(previousHeight>=base-.035&&previousHeight<=tread+.035&&
       tread-previousHeight>maxRise+TOLERANCE)return null;
  }
  return candidates
    .filter(s=>s.y-previousHeight<=maxRise+TOLERANCE&&
      previousHeight-s.y<=maxDrop+TOLERANCE)
    .sort((a,b)=>(a.type==='ramp'?-1:1)-(b.type==='ramp'?-1:1)||
      Math.abs(a.y-previousHeight)-Math.abs(b.y-previousHeight))[0]??null;
}
export function resolveGround(x,z,priorHeight){
  return pickStairSupport(x,z,priorHeight,0)?.y??priorHeight;
}
/** Short substeps prevent tunnelling through either orientation's risers. */
export function walkStairs(collisions,x,z,groundY,dx,dz,radius=.33){
  let px=x,pz=z,py=groundY;
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07));
  const sx=dx/count,sz=dz/count;
  for(let i=0;i<count;i++){
    const ax=collisions.move(groundFloor(py),px,pz,sx,0,radius);
    const supportX=pickStairSupport(ax.x,pz,py,radius);
    if(supportX){px=ax.x;py=supportX.y;}
    const az=collisions.move(groundFloor(py),px,pz,0,sz,radius);
    const supportZ=pickStairSupport(px,az.z,py,radius);
    if(supportZ){pz=az.z;py=supportZ.y;}
  }
  return {x:px,z:pz,ground:py,floor:groundFloor(py)};
}
