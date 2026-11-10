import * as THREE from 'three';

/** A reusable low-poly sculpted bathtub and shader water, not a separate simulation per room. */
export function createBathAssets() {
  // Profile traverses the inner basin, rolled rim and outside shell. Both faces are
  // real geometry, so the tub remains hollow from any camera angle.
  const profile = [
    [0,.17],[.30,.17],[.35,.185],[.40,.27],[.455,.45],
    [.49,.49],[.54,.49],[.55,.46],[.50,.26],[.41,.085],[0,.085],
  ].map(([r,y])=>new THREE.Vector2(r,y));
  const tubGeometry = new THREE.LatheGeometry(profile,48);
  const waterGeometry = new THREE.CircleGeometry(1,48);
  // One shared clock/mat for every suite. No render targets or transmission passes.
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: {uTime:{value:0}},
    transparent:true, depthWrite:false, side:THREE.DoubleSide,
    vertexShader:`
      uniform float uTime;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        vUv=uv;
        vec3 p=position;
        float r=sin((uv.x*18.0+uv.y*12.0)+uTime*1.5)*0.007
              +sin((uv.x*27.0-uv.y*22.0)-uTime*1.15)*0.004;
        p.z+=r;
        vRipple=r;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }
    `,
    fragmentShader:`
      uniform float uTime;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        float r=length(vUv-0.5)*2.0;
        float wave=sin(vUv.x*30.0+uTime*1.9)*sin(vUv.y*22.0-uTime*1.6);
        float light=clamp(0.50+wave*0.10+vRipple*15.0,0.0,1.0);
        vec3 base=mix(vec3(.075,.255,.285),vec3(.31,.61,.66),light);
        float rim=pow(clamp(r,0.0,1.0),2.6)*.25;
        base+=vec3(.31,.35,.36)*rim;
        float glint=pow(max(0.0,sin(vUv.x*49.0-vUv.y*33.0+uTime*1.5)),28.0)*.07;
        gl_FragColor=vec4(base+vec3(glint),.88);
      }
    `
  });
  const porcelain = new THREE.MeshStandardMaterial({
    color:0xe8e5dc, roughness:.22, metalness:.02, side:THREE.DoubleSide,
  });
  return {
    tubGeometry, waterGeometry, waterMaterial, porcelain,
    dispose() {
      tubGeometry.dispose();waterGeometry.dispose();waterMaterial.dispose();porcelain.dispose();
    },
  };
}
