import * as THREE from 'three';

/**
 * Vitaeworld's lightweight character family. Nothing here fetches an asset:
 * a spherical head, separate chest/abdomen lofts, articulated upper/lower
 * limbs, spherical hands and flat-bottomed hemispherical feet.
 *
 * All dimensions are in metres, and the face points down local -Z.
 * Loft profiles deliberately vary in width and depth rather than scaling a
 * primitive cylinder. Vertex normals provide smooth polygonal surfaces.
 */
export function softLoftGeometry(stations, sides = 16, exponent = 2.4, caps = { bottom: true, top: true }) {
  if (stations.length < 2 || sides < 3) throw new Error('Invalid soft loft');
  const vertices = [];
  const indices = [];
  const contour = angle => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const power = 2 / exponent;
    return [
      Math.sign(c) * Math.pow(Math.abs(c), power),
      Math.sign(s) * Math.pow(Math.abs(s), power),
    ];
  };
  for (const ring of stations) {
    for (let i = 0; i < sides; i++) {
      const [u, v] = contour(i * Math.PI * 2 / sides);
      // A subtly raised pair of collarbone ridges on the anterior surface,
      // a tapered trapezius at the rear, and a downward slope at the sides.
      // Other lofts have no offsets, so their established geometry is unchanged.
      const front = Math.max(0, -v);
      const rear = Math.max(0, v);
      const collarBand = Math.exp(-Math.pow((Math.abs(u) - .55) / .22, 2));
      const ridge = (ring.clavicleRidge ?? 0) * front * collarBand;
      const y = ring.y - (ring.shoulderDrop ?? 0) * u * u
        + ridge * .55 + (ring.trapeziusRise ?? 0) * rear * (1 - Math.abs(u));
      // Optional paired rounded lobes affect the anterior female chest only.
      // A smooth lateral Gaussian is combined with a vertical envelope from
      // successive loft stations. No disconnected spheres or sharp apexes.
      const pairedLobes = Math.exp(-Math.pow((u - .46) / .43, 2)) +
        Math.exp(-Math.pow((u + .46) / .43, 2));
      const bust = (ring.bustBulge ?? 0) * front * pairedLobes;
      const z = (ring.z || 0)
        + ring.rz * v * (v >= 0 ? (ring.backScale ?? 1) : (ring.frontScale ?? 1))
        - ridge * .32 - bust;
      vertices.push((ring.x || 0) + ring.rx * u, y, z);
    }
  }
  for (let j = 0; j < stations.length - 1; j++) {
    for (let i = 0; i < sides; i++) {
      const a = j * sides + i;
      const b = (j + 1) * sides + i;
      const c = (j + 1) * sides + (i + 1) % sides;
      const d = j * sides + (i + 1) % sides;
      indices.push(a, b, d, b, c, d);
    }
  }
  for (const [index, top] of [[0, false], [stations.length - 1, true]]) {
    if (!(top ? caps.top : caps.bottom)) continue;
    const ring = stations[index];
    const center = vertices.length / 3;
    vertices.push(ring.x || 0, ring.y, ring.z || 0);
    for (let i = 0; i < sides; i++) {
      const a = index * sides + i;
      const b = index * sides + (i + 1) % sides;
      if (top) indices.push(center, b, a);
      else indices.push(center, a, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.loft = { stationCount: stations.length, sides };
  return geometry;
}

/** Open-ended loft parts have coincident seam rings and matching normals.
 * No overlapping caps means no z-fighting or circumferential hard seam.
 */
export function stitchLoftSeam(lower, upper) {
  const left = lower.userData.loft;
  const right = upper.userData.loft;
  if (!left || !right || left.sides !== right.sides)
    throw new Error('Loft seam topology mismatch');
  const n = left.sides;
  const lp = lower.getAttribute('position'), up = upper.getAttribute('position');
  const ln = lower.getAttribute('normal'), un = upper.getAttribute('normal');
  const vec = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const li = (left.stationCount - 1) * n + i;
    if (Math.abs(lp.getX(li) - up.getX(i)) > 1e-5 ||
      Math.abs(lp.getY(li) - up.getY(i)) > 1e-5 ||
      Math.abs(lp.getZ(li) - up.getZ(i)) > 1e-5)
      throw new Error('Loft seam positions are not continuous');
    vec.set(ln.getX(li) + un.getX(i), ln.getY(li) + un.getY(i),
      ln.getZ(li) + un.getZ(i)).normalize();
    ln.setXYZ(li, vec.x, vec.y, vec.z);
    un.setXYZ(i, vec.x, vec.y, vec.z);
  }
  ln.needsUpdate = true;
  un.needsUpdate = true;
}

const station = (y, rx, rz, z = 0, backScale = 1, frontScale = 1) =>
  ({ y, rx, rz, z, backScale, frontScale });

/** Build one continuous-looking segment with rounded, asymmetric contours. */
function taperedSegment(length, rootRadius, tipRadius, depthScale = .94) {
  const points = [
    station(-length, tipRadius * .77, tipRadius * depthScale * .72),
    station(-length * .94, tipRadius, tipRadius * depthScale),
    station(-length * .76, tipRadius * 1.08, tipRadius * depthScale * 1.03),
    station(-length * .44, (rootRadius + tipRadius) * .53, (rootRadius + tipRadius) * .48 * depthScale),
    station(-length * .17, rootRadius * 1.07, rootRadius * depthScale),
    station(-length * .035, rootRadius * .93, rootRadius * depthScale * .94),
    station(.012, rootRadius * .50, rootRadius * depthScale * .52),
  ];
  return softLoftGeometry(points, 16, 2.22);
}

/** Shapes belong to an Avatar instance so dispose() can free GPU resources. */
export function buildSoftAvatar(avatar, p) {
  const root = avatar.body = new THREE.Group();
  root.name = 'soft-anatomy';
  avatar.root.add(root);
  avatar.softAvatar = true;
  avatar.skinnedLayers = [];
  avatar.layerMeshes = { shirt: [], jacket: [], pants: [], shoes: [] };
  avatar.eyeParts = [];

  const material = avatar.mat(p.bodyColor, .86, 0);
  // Ensure the eyes remain visible for dark custom colours.
  const contrast = new THREE.Color(p.bodyColor);
  const luminance = contrast.r * .2126 + contrast.g * .7152 + contrast.b * .0722;
  const eye = avatar.mat(luminance < .20 ? 0xf5f5ff : 0x171a27, .95);
  avatar.material = { skin: material, eye };
  const add = (parent, geometry, mat = material, name = '') => {
    avatar.geometry.push(geometry);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = name;
    parent.add(mesh);
    return mesh;
  };
  const ball = (parent, geometry, x, y, z, rx, ry = rx, rz = rx, name = '') => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(rx, ry, rz);
    parent.add(mesh);
    return mesh;
  };
  const sphere = new THREE.SphereGeometry(1, 18, 12);
  avatar.geometry.push(sphere);

  const height = p.height;
  const legs = height * p.legRatio;
  const headRadius = height * .108 * p.headScale;
  const headCenterY = height - headRadius;
  const shouldersY = headCenterY - headRadius + .052;
  const torsoHeight = shouldersY - legs;
  const depth = p.torsoDepth * .155;

  // Different starting silhouettes, fully editable on both model types.
  // Independent controls drive hip/glute, abdomen, chest and clavicular collar.
  const female = p.baseModel === 'softFemale';
  const splitY = legs + torsoHeight * (1 - p.chestRatio);
  const abdomenHeight = splitY - legs;
  const chestHeight = shouldersY - splitY;
  // The clavicular collar starts just below the collarbones and extends
  // through the shoulder-to-neck transition. It is NOT an upper pectoral
  // or bust segment: most of the vertical chest belongs to soft-chest.
  // Leave the male collar untouched. On women it is merely a narrow transition
  // between the longer chest and the neck base, not another full chest segment.
  const clavicleHeight = female
    ? Math.min(.072, Math.max(.042, chestHeight * .18))
    : Math.min(.108, Math.max(.064, chestHeight * .27));
  const clavicleY = shouldersY - clavicleHeight;
  const chestBodyHeight = clavicleY - splitY;
  const bridge = Math.min(.029, abdomenHeight * .14, chestBodyHeight * .22);
  const joinRx = p.waist * .49 * p.abdomenWidth;
  const joinRz = depth * .90 * p.abdomenDepth;
  const join = station(splitY, joinRx, joinRz, .002);
  const torsoExponent = female ? 2.83 : 3.03;
  const S = 20;
  const hipRadius = p.hips * p.hipSize;

  const abdomen = [
    station(legs + .008, hipRadius * .36, depth * p.abdomenDepth * .74,
      .002, female ? 1 : .90 + .12 * p.gluteSize),
    station(legs + abdomenHeight * .16, hipRadius * .49 * p.abdomenWidth,
      depth * p.abdomenDepth * .98, .004, female ? 1 : p.gluteSize),
    station(legs + abdomenHeight * .44,
      (p.hips * (female ? .44 : .41) + p.waist * .08) *
        p.abdomenWidth * p.abdomenFullness,
      depth * p.abdomenDepth * p.abdomenFullness * (female ? 1.04 : 1),
      .010, female ? 1 : 1 + (p.gluteSize - 1) * .26),
    station(legs + abdomenHeight * .73, p.waist * .52 * p.abdomenWidth,
      depth * p.abdomenDepth * .93, .007),
    station(splitY - bridge, joinRx * 1.025, joinRz * 1.015, .003),
    join,
  ];
  const abdomenMesh = add(root,
    softLoftGeometry(abdomen, S, torsoExponent, { bottom: true, top: false }),
    material, 'soft-abdomen');

  const chestWidth = p.shoulders * .49 * p.chestWidth;
  const chestDepth = depth * p.chestDepth;
  // The chest-collar seam is shared exactly, preserving the smooth join
  // when users customize pectoral dimensions or shoulder/neck dimensions.
  const upperJoinRxRaw = p.shoulders *
    (.33 * p.upperChestWidth + .15 * p.chestWidth);
  const upperJoinRzRaw = depth *
    (.62 * p.upperChestDepth + .30 * p.chestDepth);
  // Female clavicle is a tucked-in transition. It must never exceed the chest
  // volume even at the highest configurable collar settings.
  const upperJoinRx = female ? Math.min(upperJoinRxRaw, chestWidth * .80) : upperJoinRxRaw;
  const upperJoinRz = female ? Math.min(upperJoinRzRaw, chestDepth * .82) : upperJoinRzRaw;
  const upperJoin = station(clavicleY, upperJoinRx, upperJoinRz, -.003);
  const shoulderWidth = female
    ? Math.min(p.shoulders * .49 * p.upperChestWidth, chestWidth * .78)
    : p.shoulders * .49 * p.upperChestWidth;

  // Breast/pectoral fullness spans both horizontal and vertical space.
  // Female preset increases width, depth AND the allocated chest height.
  // Adjacent bridge stations let the chest and abdomen meet tangentially.
  // Female torso uses a broad, rounded, twin-lobed anterior surface. The
  // horizontal lobes are subtle and do not change the independent pectoral
  // mesh structure or produce protruding caps underneath clothing.
  const bustStation = (y, rx, rz, z, bulge = 0) =>
    Object.assign(station(y, rx, rz, z), { bustBulge: bulge * p.chestFullness });
  const chest = female ? [
    join,
    station(splitY + bridge, joinRx * 1.025, joinRz * 1.027, -.001),
    bustStation(splitY + chestBodyHeight * .16,
      joinRx * .70 + chestWidth * .30,
      joinRz * .65 + chestDepth * .35, -.003),
    bustStation(splitY + chestBodyHeight * .31,
      chestWidth * .77 * p.chestFullness,
      chestDepth * .87 * p.chestFullness, -.006, .012),
    bustStation(splitY + chestBodyHeight * .45,
      chestWidth * .88 * p.chestFullness,
      chestDepth * .94 * p.chestFullness, -.009, .021),
    bustStation(splitY + chestBodyHeight * .57,
      chestWidth * .94 * p.chestFullness,
      chestDepth * .97 * p.chestFullness, -.010, .024),
    bustStation(splitY + chestBodyHeight * .71,
      chestWidth * .97 * p.chestFullness,
      chestDepth * .95 * p.chestFullness, -.008, .020),
    bustStation(splitY + chestBodyHeight * .82,
      chestWidth * .94 * (1 + (p.chestFullness - 1) * .72),
      chestDepth * .91 * (1 + (p.chestFullness - 1) * .70), -.006, .011),
    bustStation(splitY + chestBodyHeight * .92,
      upperJoinRx * .55 + chestWidth * .45,
      upperJoinRz * .55 + chestDepth * .45, -.004, .003),
    station(splitY + chestBodyHeight * .97,
      upperJoinRx * .86 + chestWidth * .14,
      upperJoinRz * .86 + chestDepth * .14, -.003),
    upperJoin,
  ] : [

    join,
    station(splitY + bridge, joinRx * 1.025, joinRz * 1.027, -.001),
    station(splitY + chestBodyHeight * .26,
      (joinRx * .44 + chestWidth * .56) * (1 + (p.chestFullness - 1) * .25),
      (joinRz * .42 + chestDepth * .58) * (1 + (p.chestFullness - 1) * .35),
      female ? -.009 : -.003),
    station(splitY + chestBodyHeight * .48,
      chestWidth * .90 * p.chestFullness, chestDepth * .98 * p.chestFullness,
      female ? -.012 : -.006, 1, female ? 1.055 : 1),
    station(splitY + chestBodyHeight * .72,
      chestWidth * .99 * p.chestFullness, chestDepth * 1.01 * p.chestFullness,
      female ? -.010 : -.006, 1, female ? 1.06 : 1),
    station(splitY + chestBodyHeight * .87,
      chestWidth * (1 + (p.chestFullness - 1) * .75),
      chestDepth * (.96 + (p.chestFullness - 1) * .75),
      -.006),
    station(splitY + chestBodyHeight * .96,
      upperJoinRx * .98 + chestWidth * .02,
      upperJoinRz * .98 + chestDepth * .02, -.003),
    upperJoin,
  ];
  const chestMesh = add(root,
    softLoftGeometry(chest, S, torsoExponent, { bottom: false, top: false }),
    material, 'soft-chest');

  // The clavicular segment is a distinct collar between chest and head:
  // faint paired collarbone ridges at the FRONT, trapezius volume at the BACK,
  // raised neck root in the middle and softly descending lateral shoulders.
  // No shoulder balls, no independent clavicle props or hollow neck collar.
  const collarVolume = p.upperChestFullness;
  const ridge = (female ? .008 : .013) * p.clavicleDefinition;
  const trap = (female ? .009 : .013) * p.trapeziusVolume;
  const neckWidth = p.neckSize * p.neckBaseWidth;
  const clavicleStation = (y, rx, rz, z, opts = {}) => {
    if (female) {
      // Keep collar radius safely inside the widest breast/chest contour.
      rx = Math.min(rx, chestWidth * .80);
      rz = Math.min(rz, chestDepth * .82);
    }
    return Object.assign(station(y, rx, rz, z), opts);
  };
  const clavicular = [
    upperJoin,
    clavicleStation(clavicleY + clavicleHeight * .18,
      upperJoinRx * 1.014, upperJoinRz * 1.012, -.003, {
        clavicleRidge: ridge * .18, trapeziusRise: trap * .17,
      }),
    clavicleStation(clavicleY + clavicleHeight * .44,
      shoulderWidth * .99 * collarVolume,
      depth * p.upperChestDepth * .96 * collarVolume, -.002, {
        clavicleRidge: ridge, trapeziusRise: trap * .8,
        shoulderDrop: .008 * p.trapeziusVolume,
        backScale: female ? 1 + (p.trapeziusVolume - 1) * .14
          : 1 + (p.trapeziusVolume - 1) * .28,
      }),
    clavicleStation(clavicleY + clavicleHeight * .73,
      shoulderWidth * .95, depth * p.upperChestDepth * .82, -.001, {
        clavicleRidge: ridge * .55,
        trapeziusRise: trap,
        shoulderDrop: .013 * p.trapeziusVolume,
        backScale: female ? 1 + (p.trapeziusVolume - 1) * .12
          : 1 + (p.trapeziusVolume - 1) * .24,
      }),
    clavicleStation(shouldersY + .004, shoulderWidth * .79,
      depth * p.upperChestDepth * .55, 0, {
        shoulderDrop: .008 * p.trapeziusVolume,
        trapeziusRise: trap * .22,
      }),
    station(shouldersY + .029, .086 * neckWidth, .082 * p.neckSize),
    station(shouldersY + .048, .062 * p.neckSize, .065 * p.neckSize),
    station(shouldersY + .072, .047 * p.neckSize, .049 * p.neckSize),
  ];
  const clavicularMesh = add(root,
    softLoftGeometry(clavicular, S, torsoExponent, { bottom: false, top: true }),
    material, 'soft-clavicular');

  // Shared perimeter vertices + averaged normals eliminate the hard seam.
  stitchLoftSeam(abdomenMesh.geometry, chestMesh.geometry);
  stitchLoftSeam(chestMesh.geometry, clavicularMesh.geometry);

  // Exactly one true sphere for the head: no jaw, nose, cheek, ear or hair geometry.
  const head = avatar.head = new THREE.Group();
  head.name = 'soft-head';
  head.position.y = headCenterY;
  root.add(head);
  const headMesh = ball(head, sphere, 0, 0, 0, headRadius, headRadius, headRadius, 'sphere-head');
  head.userData.headMesh = headMesh;
  const eyeGeometry = new THREE.BoxGeometry(1, 1, 1);
  avatar.geometry.push(eyeGeometry);
  for (const sign of [-1, 1]) {
    const x = sign * headRadius * .37 * p.eyeSpacing;
    const y = headRadius * .055;
    const halfHeight = headRadius * .235 * p.eyeLength;
    const z = -Math.sqrt(headRadius ** 2 - x ** 2 - (y + halfHeight) ** 2) - .006;
    const mark = new THREE.Mesh(eyeGeometry, eye);
    mark.name = sign < 0 ? 'left-eye-line' : 'right-eye-line';
    mark.position.set(x, y, z);
    mark.scale.set(headRadius * .07, halfHeight * 2, headRadius * .032);
    head.add(mark);
  }

  // Both arms use real parent-child joints so the old pose system remains valid.
  function arm(sign) {
    const upper = new THREE.Bone();
    upper.name = sign < 0 ? 'leftUpperArm' : 'rightUpperArm';
    upper.position.set(sign * p.shoulders * .465 * p.upperChestWidth, shouldersY - .025, 0);
    // Positive Z rotation moves the downward right arm outwards, negative
    // rotation moves the left arm outwards. The walking pose animates X only.
    upper.rotation.z = sign * p.armSpread;
    root.add(upper);
    const length = height * p.armRatio;
    const upperLength = length * p.upperArmRatio;
    const lowerLength = length - upperLength;
    const upperRadius = .072 * p.upperArmSize;
    const foreRadius = .061 * p.forearmSize;
    // No separate spherical shoulder cap. Upper-arm mesh starts inside chest.
    add(upper, taperedSegment(upperLength, upperRadius * 1.13, upperRadius * .82), material, 'upper-arm');
    const elbow = new THREE.Bone();
    elbow.name = sign < 0 ? 'leftLowerArm' : 'rightLowerArm';
    elbow.position.y = -upperLength;
    upper.add(elbow);
    // Elbow remains an articulated joint, without a visible ball mesh.
    add(elbow, taperedSegment(lowerLength, foreRadius * 1.02, foreRadius * .77, .95), material, 'forearm');
    const hand = new THREE.Group();
    hand.name = 'spherical-hand';
    hand.position.y = -lowerLength;
    elbow.add(hand);
    const handRadius = .064 * p.handSize;
    ball(hand, sphere, 0, -.032, 0, handRadius, handRadius, handRadius, 'hand');
    upper.userData.elbow = elbow;
    upper.userData.hand = hand;
    return upper;
  }

  // Hip, knee and ankle remain distinct; rounded feet end on y=0.
  function leg(sign) {
    const upper = new THREE.Bone();
    upper.name = sign < 0 ? 'leftUpperLeg' : 'rightUpperLeg';
    upper.position.set(sign * p.hips * .285 * p.legSpacing, legs, 0);
    root.add(upper);
    const thighLength = legs * p.thighRatio;
    const calfLength = legs - thighLength;
    const thighRadius = .111 * p.thighSize;
    const calfRadius = .090 * p.calfSize;
    ball(upper, sphere, 0, -.027, .005, thighRadius * 1.02 * p.hipSize,
      thighRadius * .88, thighRadius * .97, 'hip');
    if (female) {
      // Gluteal volume belongs to the posterior pelvis / upper-thigh root,
      // not halfway up the abdomen. The front remains unchanged by gluteSize.
      // It follows the animated upper-leg bone with no additional seam mesh.
      const rearBase = 1.05 + (p.gluteSize - 1) * .65;
      const thigh = [
        station(-thighLength, thighRadius * .82, thighRadius * .77),
        station(-thighLength * .88, thighRadius * .91, thighRadius * .86),
        station(-thighLength * .62, thighRadius * .99, thighRadius * .94),
        station(-thighLength * .34, thighRadius * 1.03, thighRadius * .96),
        station(-thighLength * .19, thighRadius * 1.06, thighRadius * 1.01,
          .008, 1 + (rearBase - 1) * .56),
        station(-thighLength * .09, thighRadius * 1.11, thighRadius * 1.02,
          .012, rearBase),
        station(-thighLength * .022, thighRadius * .94, thighRadius * .92,
          .011, 1 + (rearBase - 1) * .88),
        station(.012, thighRadius * .70, thighRadius * .69,
          .008, 1 + (rearBase - 1) * .56),
      ];
      add(upper, softLoftGeometry(thigh, 16, 2.35), material, 'thigh');
    } else {
      add(upper, taperedSegment(thighLength, thighRadius * 1.05,
        thighRadius * .82, 1.03), material, 'thigh');
    }
    const knee = new THREE.Bone();
    knee.name = sign < 0 ? 'leftLowerLeg' : 'rightLowerLeg';
    knee.position.y = -thighLength;
    upper.add(knee);
    ball(knee, sphere, 0, 0, 0, Math.min(thighRadius, calfRadius) * 1.03, undefined, undefined, 'knee');
    add(knee, taperedSegment(calfLength, calfRadius * 1.11, calfRadius * .70), material, 'calf');
    const foot = new THREE.Group();
    foot.name = 'hemisphere-foot';
    foot.position.set(0, -calfLength, -.036);
    knee.add(foot);
    const footGeometry = new THREE.SphereGeometry(1, 18, 9, 0, 2 * Math.PI, 0, Math.PI / 2);
    const footDisc = new THREE.CircleGeometry(1, 18);
    // The original hemispheres were oversized. Their default footprint is
    // roughly 25-30% smaller; footLength only stretches the forward axis.
    const radiusX = .083 * p.footSize;
    const radiusZ = .112 * p.footSize * p.footLength;
    const radiusY = .074 * p.footSize;
    const dome = add(foot, footGeometry, material, 'hemisphere-dome');
    dome.scale.set(radiusX, radiusY, radiusZ);
    dome.position.z = -.018;
    const sole = add(foot, footDisc, material, 'flat-sole');
    sole.rotation.x = Math.PI / 2;
    sole.scale.set(radiusX, radiusZ, 1);
    sole.position.z = -.018;
    upper.userData.knee = knee;
    return upper;
  }
  avatar.leftArm = arm(-1);
  avatar.rightArm = arm(1);
  avatar.leftLeg = leg(-1);
  avatar.rightLeg = leg(1);
  avatar.root.userData.height = p.height;
}
