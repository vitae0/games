const E=id=>document.getElementById(id);
const m=E('m'),k=E('k'),c=E('c'),x0=E('x0'),v0=E('v0');
const mv=E('mv'),kv=E('kv'),cv=E('cv'),xv=E('xv'),vv=E('vv'),regime=E('regime'),w0El=E('w0'),zetaEl=E('zeta'),ccritEl=E('ccrit'),wdEl=E('wd'),e0El=E('e0'),clock=E('clock');
const apparatus=E('apparatus'),ac=apparatus.getContext('2d'),tp=E('timeplot'),tc=tp.getContext('2d'),pp=E('phaseplot'),pc=pp.getContext('2d'),ep=E('energyplot'),ec=ep.getContext('2d');
let animT=0,paused=false,last=performance.now();

window.mathFormulas={
 inline1:{tex:String.raw`-kx`,display:false},
 inline2:{tex:String.raw`-c\dot{x}`,display:false},
 inline3:{tex:String.raw`x=e^{rt}`,display:false},
 f1:String.raw`m\ddot{x}=-kx-c\dot{x}\quad\Rightarrow\quad m\ddot{x}+c\dot{x}+kx=0`,
 f2:String.raw`\ddot{x}+2\zeta\omega_0\dot{x}+\omega_0^2x=0,\qquad \omega_0=\sqrt{\frac{k}{m}},\qquad \zeta=\frac{c}{2\sqrt{mk}}`,
 f3:String.raw`mr^2+cr+k=0\quad\Leftrightarrow\quad r^2+2\zeta\omega_0r+\omega_0^2=0`,
 f4:String.raw`r_{\pm}=-\zeta\omega_0\pm\omega_0\sqrt{\zeta^2-1}`,
 f5:String.raw`x(t)=e^{-\zeta\omega_0t}\left[A\cos(\omega_dt)+B\sin(\omega_dt)\right],\quad A=x_0,\quad B=\frac{v_0+\zeta\omega_0x_0}{\omega_d}`,
 f6:String.raw`\omega_d=\omega_0\sqrt{1-\zeta^2}`,
 f7:String.raw`x(t)=(A+Bt)e^{-\omega_0t},\qquad A=x_0,\qquad B=v_0+\omega_0x_0`,
 f8:String.raw`x(t)=Ae^{r_+t}+Be^{r_-t},\qquad r_\pm=-\zeta\omega_0\pm\omega_0\sqrt{\zeta^2-1}`,
 f9:String.raw`E(t)=\frac12m\dot{x}^2+\frac12kx^2`,
 f10:String.raw`\frac{dE}{dt}=m\dot{x}\ddot{x}+kx\dot{x}=\dot{x}(m\ddot{x}+kx)=-c\dot{x}^{,2}\le0`
};

function params(){const M=+m.value,K=+k.value,C=+c.value,X=+x0.value,V=+v0.value;const w=Math.sqrt(K/M),z=C/(2*Math.sqrt(M*K)),cc=2*Math.sqrt(M*K),wd=z<1?w*Math.sqrt(1-z*z):0;return{M,K,C,X,V,w,z,cc,wd}}
function solution(t,p){
 const {M,K,C,X,V}=p,d=C*C-4*M*K,eps=1e-10;
 if(d<-eps){const a=C/(2*M),wd=Math.sqrt(4*M*K-C*C)/(2*M),A=X,B=(V+a*X)/wd,e=Math.exp(-a*t),co=Math.cos(wd*t),si=Math.sin(wd*t);return[e*(A*co+B*si),e*(-a*(A*co+B*si)+wd*(-A*si+B*co))]}
 if(Math.abs(d)<=eps){const r=-C/(2*M),A=X,B=V-r*X,e=Math.exp(r*t);return[(A+B*t)*e,(B+r*(A+B*t))*e]}
 const q=Math.sqrt(d),r1=(-C+q)/(2*M),r2=(-C-q)/(2*M),A=(V-r2*X)/(r1-r2),B=X-A;return[A*Math.exp(r1*t)+B*Math.exp(r2*t),A*r1*Math.exp(r1*t)+B*r2*Math.exp(r2*t)]
}
function energy(x,v,p){return .5*p.M*v*v+.5*p.K*x*x}
function updateMetrics(){
 const p=params();mv.textContent=p.M.toFixed(1);kv.textContent=p.K.toFixed(1);cv.textContent=p.C.toFixed(1);xv.textContent=p.X.toFixed(1);vv.textContent=p.V.toFixed(1);
 regime.textContent=p.z<1-1e-6?'düşük sönümlü':p.z>1+1e-6?'aşırı sönümlü':'kritik';
 zetaEl.textContent=p.z.toFixed(3);w0El.textContent=p.w.toFixed(3)+' rad/s';ccritEl.textContent=p.cc.toFixed(2)+' N·s/m';wdEl.textContent=p.z<1?p.wd.toFixed(3)+' rad/s':'—';e0El.textContent=energy(p.X,p.V,p).toFixed(3)+' J';
}
function basePlot(ctx,W,H,xlabel,ylabel){
 ctx.fillStyle='#fafaf7';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#deddd5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(52,H-40);ctx.lineTo(W-18,H-40);ctx.moveTo(52,20);ctx.lineTo(52,H-40);ctx.stroke();
 ctx.fillStyle='#777';ctx.font='12px system-ui';ctx.fillText(xlabel,W-36,H-16);ctx.fillText(ylabel,14,28);
}
function drawApp(p,t){
 const [x,v]=solution(t,p),W=apparatus.width,H=apparatus.height,cx=W*.58,cy=H*.53,scale=105/Math.max(1,Math.abs(p.X)+Math.abs(p.V)/Math.max(p.w,.3));
 const mx=Math.max(270,Math.min(W-115,cx+x*scale));
 ac.fillStyle='#faf8f0';ac.fillRect(0,0,W,H);
 ac.fillStyle='#d9d3c6';ac.fillRect(55,35,24,H-70);
 ac.strokeStyle='#b9b2a3';ac.lineWidth=3;ac.beginPath();ac.moveTo(78,cy);const coils=18,span=mx-118;for(let i=0;i<=coils;i++){const xx=78+span*i/coils,yy=i===0||i===coils?cy:cy+(i%2?18:-18);ac.lineTo(xx,yy)}ac.lineTo(mx-40,cy);ac.stroke();
 ac.strokeStyle='#e0ded7';ac.lineWidth=2;ac.setLineDash([7,7]);ac.beginPath();ac.moveTo(cx,26);ac.lineTo(cx,H-24);ac.stroke();ac.setLineDash([]);
 ac.fillStyle='#302d2b';ac.beginPath();ac.roundRect(mx-40,cy-40,80,80,18);ac.fill();
 ac.fillStyle='#fff';ac.font='700 13px system-ui';ac.textAlign='center';ac.fillText('m',mx,cy+5);
 ac.strokeStyle='#717171';ac.lineWidth=4;const velLen=Math.max(-90,Math.min(90,v*22));ac.beginPath();ac.moveTo(mx,cy+62);ac.lineTo(mx+velLen,cy+62);ac.stroke();if(Math.abs(velLen)>8){const s=Math.sign(velLen);ac.beginPath();ac.moveTo(mx+velLen,cy+62);ac.lineTo(mx+velLen-9*s,cy+56);ac.lineTo(mx+velLen-9*s,cy+68);ac.closePath();ac.fillStyle='#717171';ac.fill()}
 ac.fillStyle='#646464';ac.textAlign='left';ac.font='12px system-ui';ac.fillText('denge',cx+8,30);ac.fillText('x = '+x.toFixed(3)+' m',18,H-34);ac.fillText('v = '+v.toFixed(3)+' m/s',18,H-17);
}
function sample(p){const T=12,N=650,pts=[];let maxX=.25,maxV=.25,maxE=.001;for(let i=0;i<=N;i++){const t=T*i/N,[x,v]=solution(t,p),en=energy(x,v,p);pts.push({t,x,v,e:en});maxX=Math.max(maxX,Math.abs(x));maxV=Math.max(maxV,Math.abs(v));maxE=Math.max(maxE,en)}return{T,pts,maxX,maxV,maxE}}
function drawTime(p,s,tNow){
 basePlot(tc,tp.width,tp.height,'t (s)','x (m)');tc.strokeStyle='#7b62d8';tc.lineWidth=3;tc.beginPath();
 s.pts.forEach((q,i)=>{const x=52+q.t/s.T*(tp.width-76),y=tp.height-40-(q.x+s.maxX)/(2*s.maxX)*(tp.height-68);i?tc.lineTo(x,y):tc.moveTo(x,y)});tc.stroke();
 const [xx]=solution(tNow,p),px=52+(tNow%s.T)/s.T*(tp.width-76),py=tp.height-40-(xx+s.maxX)/(2*s.maxX)*(tp.height-68);tc.fillStyle='#171717';tc.beginPath();tc.arc(px,py,6,0,Math.PI*2);tc.fill();
}
function drawPhase(p,s,tNow){
 basePlot(pc,pp.width,pp.height,'x (m)','v (m/s)');pc.strokeStyle='#e07a45';pc.lineWidth=3;pc.beginPath();
 s.pts.forEach((q,i)=>{const x=pp.width/2+q.x/s.maxX*(pp.width*.41),y=(pp.height-40)/2-q.v/s.maxV*(pp.height*.38);i?pc.lineTo(x,y):pc.moveTo(x,y)});pc.stroke();
 const [xx,vv]=solution(tNow,p),px=pp.width/2+xx/s.maxX*(pp.width*.41),py=(pp.height-40)/2-vv/s.maxV*(pp.height*.38);pc.fillStyle='#171717';pc.beginPath();pc.arc(px,py,6,0,Math.PI*2);pc.fill();
}
function drawEnergy(p,s,tNow){
 basePlot(ec,ep.width,ep.height,'t (s)','E (J)');ec.strokeStyle='#3b9a69';ec.lineWidth=3;ec.beginPath();
 s.pts.forEach((q,i)=>{const x=52+q.t/s.T*(ep.width-76),y=ep.height-40-q.e/s.maxE*(ep.height-70);i?ec.lineTo(x,y):ec.moveTo(x,y)});ec.stroke();
 const [xx,vv]=solution(tNow,p),en=energy(xx,vv,p),px=52+(tNow%s.T)/s.T*(ep.width-76),py=ep.height-40-en/s.maxE*(ep.height-70);ec.fillStyle='#171717';ec.beginPath();ec.arc(px,py,6,0,Math.PI*2);ec.fill();
}
function render(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused)animT+=dt;
 const p=params(),s=sample(p),t=animT%s.T;clock.textContent='t = '+t.toFixed(2)+' s';drawApp(p,t);drawTime(p,s,t);drawPhase(p,s,t);drawEnergy(p,s,t);requestAnimationFrame(render)
}
[m,k,c,x0,v0].forEach(el=>el.addEventListener('input',()=>{updateMetrics();animT=0}));
E('pause').onclick=()=>{paused=!paused;E('pause').textContent=paused?'Animasyonu sürdür':'Animasyonu durdur'};
E('resetTime').onclick=()=>{animT=0};
updateMetrics();requestAnimationFrame(render);