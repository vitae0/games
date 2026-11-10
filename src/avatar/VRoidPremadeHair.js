import * as THREE from 'three';
import { HAIR_COLORS } from './AvatarConfig.js';

/**
 * Extract actual artist-made hair triangles from the CC0 VRoid beta HairSample
 * avatar and bake their rest pose into its head-bone local space.
 *
 * No tubes, spheres, strands or garments are procedurally modeled here.
 * This is a one-off mesh transplant; the result rigidly follows the head.
 * Hair spring-bone physics is deliberately not transferred.
 */
export const HAIR_SAMPLE_FILES = Object.freeze({
  vroidMale: 'vroid-beta-hairsample-male.vrm',
  vroidFemale: 'vroid-beta-hairsample-female.vrm',
});
const templates = new Map();

export function isPremadeHairMaterial(name = '') {
  return /hair|hairstyle|fringe|bangs/i.test(String(name));
}

export function extractPremadeHair(sourceVrm) {
  const head = sourceVrm.humanoid?.getNormalizedBoneNode('head');
  if (!head) throw new Error('Hazır VRoid saçında kafa kemiği bulunamadı.');
  sourceVrm.scene.updateMatrixWorld(true);
  head.updateWorldMatrix(true, false);
  const inverseHead = head.matrixWorld.clone().invert();
  const root = new THREE.Group();
  root.name = 'CC0_Premade_VRoid_Hair';
  const vec = new THREE.Vector3();
  let triangles = 0;

  sourceVrm.scene.traverse(obj => {
    if (!obj.isMesh) return;
    const geometry = obj.geometry;
    const positions = geometry?.getAttribute('position');
    if (!positions) return;
    const uvs = geometry.getAttribute('uv');
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    const groups = geometry.groups.length
      ? geometry.groups
      : [{ start: 0, count: geometry.index?.count || positions.count, materialIndex: 0 }];
    const transform = inverseHead.clone().multiply(obj.matrixWorld);
    if (obj.isSkinnedMesh) obj.skeleton?.update();

    for (const group of groups) {
      const originalMaterial = materials[group.materialIndex || 0];
      if (!originalMaterial || !isPremadeHairMaterial(originalMaterial.name)) continue;
      const data = [], texCoords = [];
      // Separate selected TRIANGLES from source meshes; never synthesize new ones.
      const last = Math.min(group.start + group.count,
        geometry.index?.count || positions.count);
      for (let i = group.start; i + 2 < last; i += 3) {
        for (let j = 0; j < 3; j++) {
          const vertex = geometry.index ? geometry.index.getX(i + j) : i + j;
          vec.fromBufferAttribute(positions, vertex);
          if (obj.isSkinnedMesh) obj.applyBoneTransform(vertex, vec);
          vec.applyMatrix4(transform);
          data.push(vec.x, vec.y, vec.z);
          if (uvs) texCoords.push(uvs.getX(vertex), uvs.getY(vertex));
        }
      }
      if (!data.length) continue;
      const meshGeometry = new THREE.BufferGeometry();
      meshGeometry.setAttribute('position', new THREE.Float32BufferAttribute(data, 3));
      if (uvs) meshGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(texCoords, 2));
      meshGeometry.computeVertexNormals();
      const material = originalMaterial.clone();
      material.visible = true;
      const hair = new THREE.Mesh(meshGeometry, material);
      hair.name = `VRoid_CC0_${originalMaterial.name}`;
      hair.frustumCulled = false;
      root.add(hair);
      triangles += data.length / 9;
    }
  });
  if (!triangles) throw new Error('Kaynak VRoid modelinde ayrı hazır saç mesh’i bulunamadı.');
  root.userData.triangles = triangles;
  return root;
}

export function setPremadeHairColor(group, hairColor) {
  const chosen = HAIR_COLORS[hairColor];
  group.traverse(obj => {
    if (!obj.isMesh) return;
    const material = obj.material;
    if (!material?.color) return;
    // Texture is kept for 'original'. Other colors are clean material tints
    // over the same artist-authored geometry, not newly modeled hairstyles.
    if (hairColor === 'original') return;
    material.map = null;
    if ('shadeMultiplyTexture' in material) material.shadeMultiplyTexture = null;
    material.color.setHex(chosen ?? HAIR_COLORS.chestnut);
    material.needsUpdate = true;
  });
}

export function clonePremadeHair(template, hairColor) {
  const clone = template.clone(true);
  clone.traverse(obj => {
    if (obj.isMesh) obj.material = obj.material.clone();
  });
  setPremadeHairColor(clone, hairColor);
  return clone;
}

export function discardPremadeHair(group) {
  if (!group) return;
  group.removeFromParent();
  group.traverse(obj => {
    if (!obj.isMesh) return;
    // Geometry and maps belong to the cached shared template; dispose only
    // per-avatar material clones. This prevents use-after-dispose on switching.
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    materials.forEach(m => m?.dispose());
  });
}

export async function loadPremadeHair(baseModel) {
  const file = HAIR_SAMPLE_FILES[baseModel];
  if (!file) throw new Error(`No approved VRoid hair file for ${baseModel}`);
  if (!templates.has(baseModel)) {
    templates.set(baseModel, (async () => {
      const [{ GLTFLoader }, { VRMLoaderPlugin, VRMUtils }] = await Promise.all([
        import('three/addons/loaders/GLTFLoader.js'),
        import('@pixiv/three-vrm'),
      ]);
      const loader = new GLTFLoader();
      loader.register(parser => new VRMLoaderPlugin(parser));
      const gltf = await loader.loadAsync(
        `${import.meta.env.BASE_URL}assets/characters/${file}`
      );
      const sourceVrm = gltf.userData.vrm;
      // Check the actual embedded VRM 0.x JSON, not a library-specific
      // transformed meta object. The build separately verifies the binary SHA.
      const license = gltf.parser?.json?.extensions?.VRM?.meta?.licenseName;
      if (!sourceVrm?.humanoid || license !== 'CC0')
        throw new Error('Hazır saç kaynağının VRM humanoid/CC0 lisansı doğrulanamadı.');
      if (sourceVrm.meta?.metaVersion === '0') VRMUtils.rotateVRM0(sourceVrm);
      const hair = extractPremadeHair(sourceVrm);
      return hair;
    })().catch(error => {
      templates.delete(baseModel); // network can be retried
      throw error;
    }));
  }
  return templates.get(baseModel);
}
