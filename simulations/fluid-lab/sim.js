const E=id=>document.getElementById(id);
const canvas=E('fluid'),ctx=canvas.getContext('2d',{alpha:false});
const NX=112,NY=70,N=NX*NY,hx=1/(NX-2),hy=1/(NY-2);
const u=new Float32Array(N),v=new Float32Array(N),u0=new Float32Array(N),v0=new Float32Array(N);
const dyeR=new Float32Array(N),dyeG=new Float32Array(N),dyeB=new Float32Array(N);
const r0=new Float32Array(N),g0=new Float32Array(N),b0=new Float32Array(N);
const pressure=new Float32Array(N),divergence=new Float32Array(N);
const off=document.createElement('canvas');off.width=NX;off.height=NY;const octx=off.getContext('2d',{alpha:false});const image=octx.createImageData(NX,NY);
let paused=false,last=performance.now(),drag=false,lastPX=0,lastPY=0,frame=0;

const nu=E('nu'),force=E('force'),radius=E('radius'),view=E('view'),vectors=E('vectors'),breakProjection=E('breakProjection');
window.mathFormulas={};

function IX(i,j){return i+j*NX}
function viscosity(){return Math.pow(10,+nu.value)}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function clearAll(){for(const a of [u,v,u0,v0,dyeR,dyeG,dyeB,r0,g0,b0,pressure,divergence])a.fill(0)}
function setBnd(b,x){
 for(let j=1;j<NY-1;j++){x[IX(0,j)]=b===1?-x[IX(1,j)]:x[IX(1,j)];x[IX(NX-1,j)]=b===1?-x[IX(NX-2,j)]:x[IX(NX-2,j)]}
 for(let i=1;i<NX-1;i++){x[IX(i,0)]=b===2?-x[IX(i,1)]:x[IX(i,1)];x[IX(i,NY-1)]=b===2?-x[IX(i,NY-2)]:x[IX(i,NY-2)]}
 x[IX(0,0)]=.5*(x[IX(1,0)]+x[IX(0,1)]);x[IX(0,NY-1)]=.5*(x[IX(1,NY-1)]+x[IX(0,NY-2)]);
 x[IX(NX-1,0)]=.5*(x[IX(NX-2,0)]+x[IX(NX-1,1)]);x[IX(NX-1,NY-1)]=.5*(x[IX(NX-2,NY-1)]+x[IX(NX-1,NY-2)])
}
function diffuse(b,x,xOld,diff,dt){
 const ax=dt*diff/(hx*hx),ay=dt*diff/(hy*hy),den=1+2*(ax+ay);
 for(let k=0;k<12;k++){for(let j=1;j<NY-1;j++)for(let i=1;i<NX-1;i++){const id=IX(i,j);x[id]=(xOld[id]+ax*(x[IX(i-1,j)]+x[IX(i+1,j)])+ay*(x[IX(i,j-1)]+x[IX(i,j+1)]))/den}setBnd(b,x)}
}
function advect(b,d,d0,uu,vv,dt){
 const sx=dt/hx,sy=dt/hy;
 for(let j=1;j<NY-1;j++)for(let i=1;i<NX-1;i++){
   const id=IX(i,j),x=clamp(i-sx*uu[id],.5,NX-1.5),y=clamp(j-sy*vv[id],.5,NY-1.5);
   const i0=Math.floor(x),i1=i0+1,j0=Math.floor(y),j1=j0+1,s1=x-i0,s0=1-s1,t1=y-j0,t0=1-t1;
   d[id]=s0*(t0*d0[IX(i0,j0)]+t1*d0[IX(i0,j1)])+s1*(t0*d0[IX(i1,j0)]+t1*d0[IX(i1,j1)])
 }setBnd(b,d)
}
function computeDiv(){
 let max=0,sum2=0,count=0;
 for(let j=1;j<NY-1;j++)for(let i=1;i<NX-1;i++){const id=IX(i,j),d=(u[IX(i+1,j)]-u[IX(i-1,j)])/(2*hx)+(v[IX(i,j+1)]-v[IX(i,j-1)])/(2*hy);divergence[id]=d;const a=Math.abs(d);if(a>max)max=a;sum2+=d*d;count++}
 setBnd(0,divergence);return{max,rms:Math.sqrt(sum2/Math.max(1,count))}
}
function project(apply){
 computeDiv();pressure.fill(0);const ix2=1/(hx*hx),iy2=1/(hy*hy),den=2*(ix2+iy2);
 for(let k=0;k<30;k++){for(let j=1;j<NY-1;j++)for(let i=1;i<NX-1;i++){const id=IX(i,j);pressure[id]=(ix2*(pressure[IX(i-1,j)]+pressure[IX(i+1,j)])+iy2*(pressure[IX(i,j-1)]+pressure[IX(i,j+1)])-divergence[id])/den}setBnd(0,pressure)}
 if(apply){for(let j=1;j<NY-1;j++)for(let i=1;i<NX-1;i++){const id=IX(i,j);u[id]-=(pressure[IX(i+1,j)]-pressure[IX(i-1,j)])/(2*hx);v[id]-=(pressure[IX(i,j+1)]-pressure[IX(i,j-1)])/(2*hy)}setBnd(1,u);setBnd(2,v);computeDiv()}
}
function fluidStep(dt){
 u0.set(u);v0.set(v);diffuse(1,u,u0,viscosity(),dt);diffuse(2,v,v0,viscosity(),dt);
 project(true);
 u0.set(u);v0.set(v);advect(1,u,u0,u0,v0,dt);advect(2,v,v0,u0,v0,dt);
 project(!breakProjection.checked);
 r0.set(dyeR);g0.set(dyeG);b0.set(dyeB);advect(0,dyeR,r0,u,v,dt);advect(0,dyeG,g0,u,v,dt);advect(0,dyeB,b0,u,v,dt);
 for(let i=0;i<N;i++){dyeR[i]*=.9986;dyeG[i]*=.9986;dyeB[i]*=.9986}
}
function rgbFromHue(h){h=((h%1)+1)%1;const x=h*6,k=Math.floor(x),f=x-k,q=1-f;const c=[[1,f,0],[q,1,0],[0,1,f],[0,q,1],[f,0,1],[1,0,q]][k%6];return c}
function inject(px,py,dx,dy,withDye=true){
 const gx=1+px/canvas.clientWidth*(NX-2),gy=1+py/canvas.clientHeight*(NY-2),rad=+radius.value,strength=+force.value;
 const fx=dx/canvas.clientWidth*strength*7,fy=dy/canvas.clientHeight*strength*7;
 const col=rgbFromHue(.56+.18*Math.sin(performance.now()*.00035)+.12*px/canvas.clientWidth);
 const iMin=Math.max(1,Math.floor(gx-rad*2)),iMax=Math.min(NX-2,Math.ceil(gx+rad*2)),jMin=Math.max(1,Math.floor(gy-rad*2)),jMax=Math.min(NY-2,Math.ceil(gy+rad*2));
 for(let j=jMin;j<=jMax;j++)for(let i=iMin;i<=iMax;i++){const d2=(i-gx)*(i-gx)+(j-gy)*(j-gy),w=Math.exp(-d2/(rad*rad*.7));if(w<.02)continue;const id=IX(i,j);u[id]+=fx*w;v[id]+=fy*w;if(withDye){dyeR[id]+=col[0]*.55*w;dyeG[id]+=col[1]*.55*w;dyeB[id]+=col[2]*.55*w}}
}
function vortexPair(){
 clearAll();const vortices=[[.38,.5,1],[.62,.5,-1]];
 for(let j=1;j<NY-1;j++)for(let i=1;i<NX-1;i++){const x=i/(NX-1),y=j/(NY-1),id=IX(i,j);for(const [cx,cy,sgn] of vortices){const dx=x-cx,dy=y-cy,r2=dx*dx+dy*dy+.004,w=Math.exp(-r2/.035);u[id]+=-sgn*dy/r2*.012*w;v[id]+=sgn*dx/r2*.012*w;const col=sgn>0?[.75,.18,.9]:[.12,.75,1];dyeR[id]+=col[0]*w*.8;dyeG[id]+=col[1]*w*.8;dyeB[id]+=col[2]*w*.8}}project(true)
}
function jet(){
 clearAll();for(let j=1;j<NY-1;j++)for(let i=1;i<NX-1;i++){const x=i/(NX-1),y=j/(NY-1),id=IX(i,j),w=Math.exp(-Math.pow((y-.5)/.07,2))*Math.exp(-Math.pow((x-.13)/.10,2));u[id]+=1.35*w;dyeR[id]+=.1*w;dyeG[id]+=.65*w;dyeB[id]+=1.0*w}project(true)
}
function tone(x){return 1-Math.exp(-Math.max(0,x)*1.8)}
function signedColor(x,scale){const z=clamp(x/scale,-1,1),a=Math.abs(z);return z>=0?[Math.round(35+220*a),Math.round(40+80*(1-a)),Math.round(55+70*(1-a))]:[Math.round(35+60*(1-a)),Math.round(50+110*(1-a)),Math.round(65+220*a)]}
function render(){
 const mode=view.value,data=image.data;let maxP=.0001,maxD=.0001,maxS=.0001;
 if(mode==='pressure')for(let i=0;i<N;i++)maxP=Math.max(maxP,Math.abs(pressure[i]));
 if(mode==='divergence')for(let i=0;i<N;i++)maxD=Math.max(maxD,Math.abs(divergence[i]));
 if(mode==='speed')for(let i=0;i<N;i++)maxS=Math.max(maxS,Math.hypot(u[i],v[i]));
 for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const id=IX(i,j),o=id*4;let rr,gg,bb;
   if(mode==='dye'){const glow=tone((dyeR[id]+dyeG[id]+dyeB[id])*.28),r=tone(dyeR[id]),g=tone(dyeG[id]),b=tone(dyeB[id]);rr=Math.round(9+235*r);gg=Math.round(12+230*g);bb=Math.round(18+232*b);if(glow<.02){rr=9;gg=13;bb=20}}
   else if(mode==='speed'){const z=tone(Math.hypot(u[id],v[id])/Math.max(.001,maxS)*1.8);rr=Math.round(12+238*z);gg=Math.round(18+170*z);bb=Math.round(25+70*(1-z))}
   else if(mode==='pressure'){[rr,gg,bb]=signedColor(pressure[id],maxP)}
   else{[rr,gg,bb]=signedColor(divergence[id],maxD)}
   data[o]=rr;data[o+1]=gg;data[o+2]=bb;data[o+3]=255
 }
 octx.putImageData(image,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,canvas.width,canvas.height);
 if(vectors.checked){ctx.strokeStyle='rgba(255,255,255,.55)';ctx.fillStyle='rgba(255,255,255,.75)';ctx.lineWidth=1.2;for(let j=5;j<NY-4;j+=7)for(let i=5;i<NX-4;i+=7){const id=IX(i,j),x=i/(NX-1)*canvas.width,y=j/(NY-1)*canvas.height,sc=26,ex=x+u[id]*sc,ey=y+v[id]*sc;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke()}}
}
function updateMetrics(){
 let speed2=0,mass=0,count=0,maxDiv=0;for(let j=1;j<NY-1;j++)for(let i=1;i<NX-1;i++){const id=IX(i,j);speed2+=u[id]*u[id]+v[id]*v[id];mass+=dyeR[id]+dyeG[id]+dyeB[id];maxDiv=Math.max(maxDiv,Math.abs(divergence[id]));count++}
 E('urms').textContent=Math.sqrt(speed2/count).toFixed(3);E('divmax').textContent=maxDiv.toExponential(2);E('mass').textContent=(mass/count).toFixed(3)
}
function labels(){E('nuv').textContent=viscosity().toExponential(1);E('forcev').textContent=(+force.value).toFixed(1);E('radiusv').textContent=radius.value+' hücre'}
function pointerPos(e){const r=canvas.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
canvas.addEventListener('pointerdown',e=>{drag=true;canvas.setPointerCapture(e.pointerId);[lastPX,lastPY]=pointerPos(e);inject(lastPX,lastPY,0,0,true)});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const [x,y]=pointerPos(e),dx=x-lastPX,dy=y-lastPY;inject(x,y,dx,dy,true);lastPX=x;lastPY=y});
canvas.addEventListener('pointerup',e=>{drag=false;try{canvas.releasePointerCapture(e.pointerId)}catch{}});
canvas.addEventListener('pointercancel',()=>drag=false);canvas.addEventListener('contextmenu',e=>e.preventDefault());
nu.oninput=labels;force.oninput=labels;radius.oninput=labels;
E('pause').onclick=()=>{paused=!paused;E('pause').textContent=paused?'Devam et':'Duraklat'};
E('clear').onclick=clearAll;E('vortex').onclick=vortexPair;E('jet').onclick=jet;
function loop(now){let dt=Math.min(.026,(now-last)/1000);last=now;if(!paused){const sub=Math.max(1,Math.ceil(dt/.012)),h=dt/sub;for(let k=0;k<sub;k++)fluidStep(h)}render();if(frame++%8===0)updateMetrics();requestAnimationFrame(loop)}
labels();vortexPair();requestAnimationFrame(loop);