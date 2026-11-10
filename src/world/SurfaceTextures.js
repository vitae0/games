import * as THREE from 'three';

/** All finish maps are small, locally generated and bundled without network requests. */
const NOISE_SEED = 21891;
function seeded(seed = NOISE_SEED) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function grain(ctx, random, amount = .075, count = 1400) {
  for (let i = 0; i < count; i++) {
    const v = random() > .5 ? 255 : 15;
    ctx.fillStyle = `rgba(${v},${v},${v},${amount * random()})`;
    ctx.fillRect(random() * 256, random() * 256, 1 + random() * 4, 1 + random() * 3);
  }
}
function drawPattern(ctx, name, random) {
  ctx.fillStyle = '#ddd8ce'; ctx.fillRect(0, 0, 256, 256);
  switch (name) {
    case 'stone':
      ctx.fillStyle = '#bfc0b9'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(80,86,83,.22)'; ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath(); ctx.moveTo(i * 64, 0); ctx.lineTo(i * 64, 256); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * 64); ctx.lineTo(256, i * 64); ctx.stroke();
      }
      grain(ctx, random, .07, 2600); break;
    case 'plaster':
      ctx.fillStyle = '#eee9df'; ctx.fillRect(0, 0, 256, 256);
      grain(ctx, random, .035, 2800); break;
    case 'wood':
      ctx.fillStyle = '#c5a88b'; ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 120; i++) {
        ctx.strokeStyle = `rgba(89,64,46,${.02 + random() * .16})`;
        ctx.lineWidth = .5 + random() * 2.2;
        const x = random() * 260;
        ctx.beginPath(); ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + (random()-.5)*7, 84, x+(random()-.5)*7, 175, x+(random()-.5)*7, 256);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(73,45,31,.12)';ctx.lineWidth=3;
      for (let i=0;i<=4;i++){ctx.beginPath();ctx.moveTo(i*64,0);ctx.lineTo(i*64,256);ctx.stroke();}
      grain(ctx, random, .04, 500); break;
    case 'fabric':
      ctx.fillStyle = '#a4a19b'; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = 'rgba(239,236,229,.18)'; ctx.lineWidth=.65;
      for (let i = 0; i < 256; i += 5) {
        ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.stroke();
        ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke();
      }
      grain(ctx, random, .035, 650); break;
    case 'wallPanel':
      ctx.fillStyle = '#d5d1c8'; ctx.fillRect(0,0,256,256);
      ctx.strokeStyle = 'rgba(105,95,77,.16)';ctx.lineWidth = 2.5;
      for (let i=0;i<=4;i++) { ctx.beginPath();ctx.moveTo(i*64,0);ctx.lineTo(i*64,256);ctx.stroke(); }
      grain(ctx,random,.045,900);break;
    case 'marble':
      ctx.fillStyle='#e0dbd3';ctx.fillRect(0,0,256,256);
      for(let k=0;k<38;k++) {
        const x=random()*270,y=random()*270;
        ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+15,y-18,x+30,y+25,x+80,y+8);
        ctx.strokeStyle=`rgba(110,101,98,${.014+random()*.06})`;ctx.lineWidth=.5+random();ctx.stroke();
      }
      grain(ctx,random,.03,950);break;
    default: grain(ctx,random,.035,1400);
  }
}
export function createSurfaceTextures() {
  const result = {};
  for (const kind of ['stone', 'plaster', 'wood', 'fabric', 'wallPanel', 'marble']) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const context = c.getContext('2d', { alpha: false });
    if (!context) throw new Error('2D canvas is required for procedural surfaces');
    drawPattern(context, kind, seeded(NOISE_SEED + kind.length * 100));
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 2;
    result[kind] = texture;
  }
  return result;
}
export const SURFACE_KIND = Object.freeze({
  slab:'stone', ceiling:'plaster', outerWall:'wallPanel', innerWall:'plaster',
  darkWall:'wallPanel', carpet:'fabric', wood:'wood', fabric:'fabric',
  trim:'marble', black:'wood', sidewalk:'stone',
});
