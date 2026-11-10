/** Non-overlapping upper deck plates. The 90° stair shaft is cut from
 * x[-11.22,-4.07], z[8.23,12.23]. Thin walkways outside the shaft connect
 * far-side landings to the entrance on intermediate floors.
 */
export const UPPER_DECK=Object.freeze([
  {x:-11.685,z:0,width:.93,depth:30.5},
  {x:4.04,z:0,width:16.22,depth:30.5},
  {x:-7.645,z:-3.51,width:7.15,depth:23.48},
  {x:-7.645,z:13.74,width:7.15,depth:3.02},
]);
export const DECK_THICKNESS=.25;
export const CEILING_GAP=.015;
export function rectanglesOverlap(a,b,clearance=0){
  return Math.abs(a.x-b.x)<(a.width+b.width)/2+clearance &&
    Math.abs(a.z-b.z)<(a.depth+b.depth)/2+clearance;
}
/** Far landing is at the top of a westbound flight; near at the top of the
 * return flight. Both bridge the two lanes and meet the safe perimeter strips.
 */
export function landingFootprint(forward){
  return {x:forward?-11.11:-4.18,z:10.23,width:.20,depth:3.97};
}
