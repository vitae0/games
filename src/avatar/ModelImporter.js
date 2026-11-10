/** Lazy-loaded local GLB/VRM/FBX import. No upload to a remote service. */
export const MAX_AVATAR_BYTES = 25 * 1024 * 1024;
export const MAX_FBX_BYTES = 75 * 1024 * 1024;
export function isFbxFile(file) { return Boolean(file && /\.fbx$/i.test(file.name)); }
export function validateModelFile(file) {
  if (!file || !/\.(glb|vrm|fbx)$/i.test(file.name))
    throw new Error('GLB, VRM veya çıkarılmış FBX dosyası seçin (.rar/.unitypackage doğrudan açılamaz).');
  const limit = isFbxFile(file) ? MAX_FBX_BYTES : MAX_AVATAR_BYTES;
  if (file.size <= 0 || file.size > limit)
    throw new Error(`Model 0–${limit / (1024 * 1024)} MB arasında olmalı.`);
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
  if (isFbxFile(file)) {
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const scene = new FBXLoader().parse(await file.arrayBuffer(), '');
    const boneMap = findHumanoidBones(scene);
    if (!Object.values(boneMap).some(Boolean) && !scene.animations?.length)
      throw new Error('FBX dosyasında humanoid iskelet veya animasyon bulunamadı.');
    return { scene, clips: scene.animations || [], vrm: null, boneMap };
  }
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

/** Bundled CC0 Quaternius test base, lazy loaded only when selected. */
export async function loadBundledCharacterModel() {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(
    `${import.meta.env.BASE_URL}assets/characters/quaternius-superhero-male.glb`
  );
  return {
    scene: gltf.scene,
    clips: gltf.animations,
    vrm: null,
    boneMap: findHumanoidBones(gltf.scene),
  };
}
