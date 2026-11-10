/** Values are joint angles in radians and pelvis drop in metres of body height. */
export function poseFor(posture, locomotion, time, height = 1.73) {
  const moving = posture === 'stand' && locomotion > .08;
  const speed = Math.min(1.5, locomotion / 4.2);
  const phase = time * (7.2 + speed * 2);
  const swing = moving ? Math.sin(phase) * Math.min(.67, .58 * speed) : 0;
  const bases = {
    stand: { drop: 0, hip: [0, 0], knee: [0, 0], arms: [-swing * .72, swing * .72] },
    crouch: { drop: .135 * height, hip: [.62, .62], knee: [-1.20, -1.20], arms: [.20, .20] },
    floorSit: { drop: .205 * height, hip: [1.39, 1.39], knee: [-1.42, -1.42], arms: [.24, .24] },
    kneel: { drop: .155 * height, hip: [.72, 1.10], knee: [-1.63, -1.74], arms: [.12, .33] },
    sit: { drop: .16 * height, hip: [1.30, 1.30], knee: [-1.34, -1.34], arms: [.20, .20] },
    rest: { drop: .31 * height, hip: [.40, .40], knee: [-.52, -.52], arms: [.08, .08] },
  };
  const pose = bases[posture] || bases.stand;
  return {
    drop: pose.drop,
    hip: [pose.hip[0] + swing, pose.hip[1] - swing],
    knee: pose.knee,
    arms: pose.arms,
    spine: posture === 'kneel' ? .10 : posture === 'crouch' ? .15 : 0,
    bob: moving ? Math.abs(Math.sin(phase)) * .026 : Math.sin(time * 1.3) * .006,
    blink: Math.pow(Math.max(0, Math.cos(time * 2.12)), 35),
  };
}
