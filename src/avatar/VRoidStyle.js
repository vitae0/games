import * as THREE from 'three';
import { EYE_COLORS, SKIN_TONES, HAIR_COLORS, UNDERWEAR_COLORS } from './AvatarConfig.js';

const isBodySkin = name => /body.*skin|body_skin/i.test(name.toLowerCase());
const isFaceSkin = name => /face.*skin|face_skin/i.test(name.toLowerCase());
const isHair = name => /hair/i.test(name.toLowerCase());
const isIris = name => /iris/i.test(name.toLowerCase());

export function styleMaterialClass(name) {
  if (isBodySkin(name)) return 'body';
  if (isFaceSkin(name)) return 'face';
  if (isHair(name)) return 'hair';
  if (isIris(name)) return 'iris';
  return 'other';
}

export function applyVRoidColors(vrm, profile, state) {
  const materialCache = state.materialCache ||= new Map();
  vrm.scene.traverse(obj => {
    if (!obj.isMesh) return;
    for (const material of Array.isArray(obj.material) ? obj.material : [obj.material]) {
      if (!material) continue;
      if (!materialCache.has(material)) {
        materialCache.set(material, {
          color: material.color?.clone(), map: material.map,
          alphaTest: material.alphaTest, transparent: material.transparent,
          opacity: material.opacity,
        });
      }
      const original = materialCache.get(material);
      const type = styleMaterialClass(material.name);
      if (type === 'body') {
        // VRoid beta body textures may have baked clothing/underwear imagery.
        // Remove the texture rather than pretending a drawn garment is geometry.
        if (material.map) { material.map = null; material.needsUpdate = true; }
        if (material.alphaTest) { material.alphaTest = 0; material.needsUpdate = true; }
        material.transparent = false; material.opacity = 1;
        material.color?.setHex(SKIN_TONES[profile.skinTone]);
        material.visible = true;
      } else if (type === 'face') {
        // Preserve eye/brow/lip details encoded in the face texture.
        if (original.color && material.color)
          material.color.copy(original.color).multiply(new THREE.Color(SKIN_TONES[profile.skinTone]).lerp(new THREE.Color(0xffffff), .7));
      } else if (type === 'iris') {
        // The iris is already its own textured VRoid material: tint safely.
        material.color?.setHex(EYE_COLORS[profile.eyeColor]);
      } else if (type === 'hair') {
        // Replace legacy hair cap with the modular geometry attached to head.
        material.visible = false;
      }
    }
  });
}

function ellipsoid(parent, material, xyz, scale, geometry, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...xyz); mesh.scale.set(...scale);
  mesh.rotation.set(0, ry, rz); parent.add(mesh);
  return mesh;
}

function hairStrand(parent, points, thick, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const slices = 9, sides = 6, positions = [], normals = [], indices = [];
  const p = new THREE.Vector3(), tangent = new THREE.Vector3(), normal = new THREE.Vector3();
  const side = new THREE.Vector3(), axis = new THREE.Vector3(0, 0, 1);
  for (let i=0; i<=slices; i++) {
    const t = i/slices;
    curve.getPoint(t, p); curve.getTangent(t, tangent);
    side.crossVectors(tangent, axis).normalize();
    if (side.lengthSq() < .01) side.set(1,0,0);
    normal.crossVectors(tangent, side).normalize();
    const radius = thick * Math.pow(1-t, .82) + .0008;
    for (let j=0; j<sides; j++) {
      const angle=j*2*Math.PI/sides;
      const v=p.clone().addScaledVector(side,Math.cos(angle)*radius).addScaledVector(normal,Math.sin(angle)*radius);
      positions.push(v.x,v.y,v.z);
      const n=v.clone().sub(p).normalize();
      normals.push(n.x,n.y,n.z);
    }
    if(i<slices) for(let j=0;j<sides;j++){
      const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;
      indices.push(a,b,c,b,d,c);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,material); parent.add(mesh);
}

export function buildVRoidHair(vrm, profile) {
  const head = vrm.humanoid?.getNormalizedBoneNode('head');
  if (!head || profile.hair === 'none') return null;
  const root = new THREE.Group(); root.name='VitaeHair';
  head.add(root);
  const material = new THREE.MeshStandardMaterial({
    color: HAIR_COLORS[profile.hairColor], roughness: .82, metalness: .02,
    side: THREE.DoubleSide,
  });
  const scalp = new THREE.SphereGeometry(1, 24, 14);
  ellipsoid(root, material, [0,.176,0], [.117,.104,.107], scalp);
  const isLong = profile.hair === 'long' || profile.hair === 'ponytail';
  const isBob = profile.hair === 'bob';
  const bangCount = profile.hair === 'short' ? 7 : 11;
  for(let i=0;i<bangCount;i++){
    const u=(i/(bangCount-1)) * 2-1;
    const endY=.098 - .038*(1-Math.abs(u));
    const s=Math.sign(u) || 1;
    hairStrand(root,[
      [u*.097,.245,-.051],
      [u*.100+.006*s,.184,-.092],
      [u*.092+.014*s,endY,-.112],
    ],.024,material);
  }
  for(const sign of [-1,1]){
    const ends = isLong ? [.040,-.015,-.070] : isBob ? [.030,.008] : [.085];
    ends.forEach((yy,i)=>hairStrand(root,[
      [sign*(.088+i*.009),.205,-.034],
      [sign*(.116+i*.008),.115,-.020],
      [sign*(.114+i*.006),yy,-.012],
    ],.031,material));
  }
  if(profile.hair === 'ponytail') {
    hairStrand(root, [[0,.21,.092],[0,.145,.18],[.012,.032,.198],[.020,-.065,.190]], .056, material);
  } else if(isLong){
    for(const sign of [-1,1]) for(let i=0;i<4;i++)
      hairStrand(root,[[sign*(.075+i*.010),.18,.065],[sign*(.103+i*.009),.04,.075],
        [sign*(.105+i*.009),-.095,.076]],.032,material);
  }
  return root;
}

function bindUnderwearLayer(sourceMesh, selectedIndices, material, tag) {
  if (!selectedIndices.length) return null;
  const geometry = sourceMesh.geometry.clone();
  geometry.clearGroups();
  geometry.setIndex(selectedIndices);
  // Offset the new garment a couple of millimetres from its exact body shell.
  // All original blend weights and skin joints are retained.
  const pos = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  if (normal) for(let i=0;i<pos.count;i++){
    pos.setXYZ(i,pos.getX(i)+normal.getX(i)*.003,
      pos.getY(i)+normal.getY(i)*.003,pos.getZ(i)+normal.getZ(i)*.003);
  }
  pos.needsUpdate=true;
  geometry.computeBoundingSphere();
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name=tag;
  mesh.bindMode=sourceMesh.bindMode;
  mesh.skeleton=sourceMesh.skeleton;
  mesh.bindMatrix.copy(sourceMesh.bindMatrix);
  mesh.bindMatrixInverse.copy(sourceMesh.bindMatrixInverse);
  mesh.position.copy(sourceMesh.position);mesh.quaternion.copy(sourceMesh.quaternion);
  mesh.scale.copy(sourceMesh.scale);
  mesh.frustumCulled=false;
  sourceMesh.parent.add(mesh);
  return mesh;
}

export function buildVRoidUnderwear(vrm, profile) {
  if(profile.underwear==='none') return [];
  const hips=vrm.humanoid?.getNormalizedBoneNode('hips');
  const chest=vrm.humanoid?.getNormalizedBoneNode('chest');
  if(!hips) return [];
  const result=[], material = new THREE.MeshStandardMaterial({
    color:UNDERWEAR_COLORS[profile.underwearColor],roughness:.91,side:THREE.DoubleSide,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
  });
  const isFemale=profile.baseModel==='vroidFemale';
  vrm.scene.updateMatrixWorld(true);
  vrm.scene.traverse(obj=>{
    if(!obj.isSkinnedMesh || !obj.geometry?.getAttribute('position'))return;
    const mats=Array.isArray(obj.material)?obj.material:[obj.material];
    if(!mats.some(m=>m&&isBodySkin(m.name)))return;
    const hipsY=obj.worldToLocal(hips.getWorldPosition(new THREE.Vector3())).y;
    const chestY=chest?obj.worldToLocal(chest.getWorldPosition(new THREE.Vector3())).y:hipsY+.32;
    const g=obj.geometry,p=g.getAttribute('position');
    const idx=g.index, groups=g.groups.length?g.groups:[{start:0,count:idx?idx.count:p.count,materialIndex:0}];
    const bottom=[],top=[];
    const low=hipsY-(profile.underwear==='sport'?.19:.135);
    const high=hipsY+(profile.underwear==='sport'?.115:.070);
    for(const group of groups){
      if(!isBodySkin(mats[group.materialIndex]?.name||''))continue;
      for(let i=group.start;i<group.start+group.count;i+=3){
        const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;
        const y=(p.getY(a)+p.getY(b)+p.getY(c))/3;
        if(y>=low&&y<=high)bottom.push(a,b,c);
        if(isFemale&&y>=chestY-.07&&y<=chestY+.062)top.push(a,b,c);
      }
    }
    const a=bindUnderwearLayer(obj,bottom,material,'VitaeUnderwearBottom');
    const b=bindUnderwearLayer(obj,top,material,'VitaeUnderwearTop');
    if(a)result.push(a);
    if(b)result.push(b);
  });
  if(!result.length)material.dispose();
  return result;
}

export function disposeVRoidStyle(state) {
  if (!state) return;
  if(state.hairRoot){
    state.hairRoot.removeFromParent();
    state.hairRoot.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
    state.hairRoot=null;
  }
  if(state.underwearMeshes){
    const materials=new Set();
    for(const mesh of state.underwearMeshes){
      mesh.removeFromParent();mesh.geometry.dispose();materials.add(mesh.material);
    }
    materials.forEach(m=>m.dispose());
    state.underwearMeshes=[];
  }
}
