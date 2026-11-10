import * as THREE from 'three';

/** Two-bone, smooth-skin envelope. The garment is a separate skinned surface. */
export function createSkinnedLimb(body, upper, lower, material, {
  x, topY, length, radiusX, radiusZ, middle = .51,
  layer = 1, segments = 14,
}) {
  const geometry = new THREE.SphereGeometry(1, 16, segments);
  geometry.scale(radiusX * layer, length * .535, radiusZ * layer);
  geometry.translate(x, topY - length * .50, 0);
  const positions = geometry.getAttribute('position');
  const indices = [], weights = [];
  const blend = Math.max(.055, length * .17);
  const kneeY = topY - middle * length;
  for (let i = 0; i < positions.count; i++) {
    const blendT = THREE.MathUtils.smoothstep(positions.getY(i), kneeY - blend, kneeY + blend);
    // Upper bone is index 0, lower bone is index 1.
    indices.push(0, 1, 0, 0);
    weights.push(blendT, 1 - blendT, 0, 0);
  }
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = `skin-${upper.name}-${material.name || 'layer'}`;
  mesh.frustumCulled = false; // moving joints can extend beyond the bind-pose sphere
  body.add(mesh);
  body.updateWorldMatrix(true, true);
  mesh.bind(new THREE.Skeleton([upper, lower]));
  return { mesh, geometry };
}
