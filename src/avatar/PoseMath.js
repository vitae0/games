/** Values are joint angles in radians and pelvis drop in metres of body height.
 * Every furniture style is a variation of a stable posture, not a new rig.
 * Small secondary movements avoid perfectly frozen, identical seated avatars.
 */
export function poseFor(posture, locomotion, time, height = 1.73, furnitureStyle = null) {
  const moving = posture === 'stand' && locomotion > .08;
  const speed = Math.min(1.5, locomotion / 4.2);
  const phase = time * (7.2 + speed * 2);
  const swing = moving ? Math.sin(phase) * Math.min(.67, .58 * speed) : 0;
  const breath = Math.sin(time * 1.65);
  const bases = {
    stand: { drop: 0, hip: [0, 0], knee: [0, 0], arms: [-swing * .72, swing * .72] },
    crouch: { drop: .135 * height, hip: [.62, .62], knee: [-1.20, -1.20], arms: [.20, .20] },
    floorSit: { drop: .205 * height, hip: [1.39, 1.39], knee: [-1.42, -1.42], arms: [.24, .24] },
    kneel: { drop: .155 * height, hip: [.72, 1.10], knee: [-1.63, -1.74], arms: [.12, .33] },
    sit: { drop: .16 * height, hip: [1.30, 1.30], knee: [-1.34, -1.34], arms: [.20, .20] },
    rest: { drop: .31 * height, hip: [.40, .40], knee: [-.52, -.52], arms: [.08, .08] },
  };
  const furniture = {
    lounge: { drop: .17, hip: [1.16, 1.34], knee: [-1.25, -1.45], arms: [.22, -.13], spine: -.16 },
    desk: { drop: .16, hip: [1.25, 1.25], knee: [-1.35, -1.35],
      arms: [.57 + Math.sin(time * 5.3) * .065, .57 + Math.sin(time * 5.3 + 2.2) * .065], spine: .13 },
    bedEdge: { drop: .14, hip: [1.34, 1.34], knee: [-1.10, -1.10], arms: [.08, .16], spine: .05 },
    stool: { drop: .105, hip: [1.09, 1.09], knee: [-1.03, -1.03], arms: [-.10, .08], spine: -.02 },
    bathe: { drop: .28, hip: [1.01, 1.12], knee: [-1.30, -1.22],
      arms: [.08 + breath * .026, -.15 + breath * .02], spine: -.09 },
    sleep: { drop: 0, hip: [.10, .12], knee: [-.18, -.15],
      arms: [-.12 + breath * .008, .14 - breath * .008], spine: 0 },
  };
  const selected = posture === 'stand' ? bases.stand
    : (furniture[furnitureStyle] ?? bases[posture] ?? bases.stand);
  const drop = selected.drop * (selected === bases.stand || selected === bases.crouch ||
    selected === bases.floorSit || selected === bases.kneel ||
    selected === bases.sit || selected === bases.rest ? 1 : height);
  return {
    drop,
    hip: [selected.hip[0] + swing, selected.hip[1] - swing],
    knee: [...selected.knee],
    arms: [...selected.arms],
    spine: selected.spine ?? (posture === 'kneel' ? .10 : posture === 'crouch' ? .15 : 0),
    bob: moving ? Math.abs(Math.sin(phase)) * .026 : breath * .004,
    blink: Math.pow(Math.max(0, Math.cos(time * 2.12)), 35),
  };
}
