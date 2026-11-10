/** Lazy-loaded local GLB/VRM import. No network transfer or model CDN dependency. */
export const MAX_AVATAR_BYTES = 25 * 1024 * 1024;
export function validateModelFile(file) {
  if (!file || !/\.(glb|vrm)$/i.test(file.name)) throw new Error('Sadece .glb veya .vrm destekleniyor.');
  if (file.size <= 0 || file.size > MAX_AVATAR_BYTES) throw new Error('Model 0–25 MB arasında olmalı.');
  return file.name.toLowerCase().endsWith('.vrm');
}

export function findHumanoidBones(root) {
  const bones = [];
  root.traverse(obj => { if (obj.isBone) bones.push(obj); });
  const patterns = {
    hips: [/hips/i, /pelvis/i, /root_hips/i],
    leftUpperLeg: [/leftupleg/i, /leftupperleg/i, /thigh[_ .-]?l/i, /upperleg[_ .-]?l/i],
    rightUpperLeg: [/rightupleg/i, /rightupperleg/i, /thigh[_ .-]?r/i, /upperleg[_ .-]?r/i],
    leftLowerLeg: [/leftleg(?!.*up)/i, /leftlowerleg/i, /calf[_ .-]?l/i, /shin[_ .-]?l/i],
    rightLowerLeg: [/rightleg(?!.*up)/i, /rightlowerleg/i, /calf[_ .-]?r/i, /shin[_ .-]?r/i],
    leftUpperArm: [/leftarm(?!.*fore)/i, /leftupperarm/i, /upperarm[_ .-]?l/i],
    rightUpperArm: [/rightarm(?!.*fore)/i, /rightupperarm/i, /upperarm[_ .-]?r/i],
  };
  const found = {};
  for (const [key, variants] of Object.entries(patterns)) {
    found[key] = bones.find(b => variants.some(re => re.test(b.name))) || null;
  }
  return found;
}

export async function importCharacterModel(file) {
  const isVrm = validateModelFile(file);
  const [{ GLTFLoader }, vrmModule] = await Promise.all([
    import('three/addons/loaders/GLTFLoader.js'),
    isVrm ? import('@pixiv/three-vrm') : Promise.resolve(null),
  ]);
  const loader = new GLTFLoader();
  if (isVrm) loader.register(parser => new vrmModule.VRMLoaderPlugin(parser));
  const url = URL.createObjectURL(file);
  try {
    const gltf = await loader.loadAsync(url);
    const vrm = gltf.userData.vrm || null;
    if (isVrm && !vrm) throw new Error('VRM insan iskeleti veya metadata bulunamadı.');
    if (vrm && vrm.meta?.metaVersion === '0') vrmModule.VRMUtils.rotateVRM0(vrm);
    const scene = vrm?.scene || gltf.scene;
    const boneMap = vrm ? {} : findHumanoidBones(scene);
    const boneCount = vrm ? 1 : Object.values(boneMap).filter(Boolean).length;
    if (boneCount < 1 && !gltf.animations.length) throw new Error('Model iskelet veya animasyon içermiyor.');
    return { scene, clips: gltf.animations, vrm, boneMap };
  } finally {
    URL.revokeObjectURL(url);
  }
}
