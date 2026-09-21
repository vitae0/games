const E=id=>document.getElementById(id);
const m=E('m'),k=E('k'),c=E('c'),x0=E('x0'),mv=E('mv'),kv=E('kv'),cv=E('cv'),xv=E('xv'),regime=E('regime'),w0=E('w0'),zeta=E('zeta');
const tp=E('timeplot'),tc=tp.getContext('2d'),pp=E('phaseplot'),pc=pp.getContext('2d');

window.mathFormulas={
  f1:String.raw`m\ddot{x}+c\dot{x}+kx=0`,
  f2:String.raw`mr^2+cr+k=0,\qquad r=\frac{-c\pm\sqrt{c^2-4mk}}{2m}`,
  f3:String.raw`\omega_0=\sqrt{\frac{k}{m}},\qquad \zeta=\frac{c}{2\sqrt{mk}}`
};

function solution(t,M,K,C,X,V=0){
  const d=C*C-4*M*K,eps=1e-9;
  if(d<-eps){
    const a=C/(2*M),wd=Math.sqrt(4*M*K-C*C)/(2*M),A=X,B=(V+a*X)/wd,e=Math.exp(-a*t),co=Math.cos(wd*t),si=Math.sin(wd*t);
    return [e*(A*co+B*si),e*(-a*(A*co+B*si)+wd*(-A*si+B*co))];
  }
  if(Math.abs(d)<=eps){
    const r=-C/(2*M),A=X,B=V-r*X,e=Math.exp(r*t);
    return [(A+B*t)*e,(B+r*(A+B*t))*e];
  }
  const q=Math.sqrt(d),r1=(-C+q)/(2*M),r2=(-C-q)/(2*M),A=(V-r2*X)/(r1-r2),B=X-A;
  return [A*Math.exp(r1*t)+B*Math.exp(r2*t),A*r1*Math.exp(r1*t)+B*r2*Math.exp(r2*t)];
}
function axes(ctx,W,H,xlabel,ylabel){
  ctx.fillStyle='#090c12';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#283247';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(50,H/2);ctx.lineTo(W-20,H/2);ctx.moveTo(50,20);ctx.lineTo(50,H-35);ctx.stroke();ctx.fillStyle='#8d9ab3';ctx.font='12px system-ui';ctx.fillText(xlabel,W-45,H/2-8);ctx.fillText(ylabel,58,32);
}
function render(){
  const M=+m.value,K=+k.value,C=+c.value,X=+x0.value;
  mv.textContent=M.toFixed(1);kv.textContent=K.toFixed(1);cv.textContent=C.toFixed(1);xv.textContent=X.toFixed(1);
  const w=Math.sqrt(K/M),z=C/(2*Math.sqrt(M*K));w0.textContent=w.toFixed(3);zeta.textContent=z.toFixed(3);
  regime.textContent=z<.999999?'düşük sönümlü':z>1.000001?'aşırı sönümlü':'kritik';
  const T=12,N=700,pts=[];let maxx=Math.max(.5,Math.abs(X)),maxv=.5;
  for(let i=0;i<=N;i++){const t=T*i/N,[x,v]=solution(t,M,K,C,X);pts.push([t,x,v]);maxx=Math.max(maxx,Math.abs(x));maxv=Math.max(maxv,Math.abs(v))}
  axes(tc,tp.width,tp.height,'t (s)','x (m)');tc.strokeStyle='#8bd3ff';tc.lineWidth=2;tc.beginPath();
  pts.forEach((p,i)=>{const xp=50+p[0]/T*(tp.width-75),y=tp.height/2-p[1]/(maxx*1.15)*(tp.height*.42);i?tc.lineTo(xp,y):tc.moveTo(xp,y)});tc.stroke();
  tc.fillStyle='#8d9ab3';tc.fillText('x(t)',tp.width-80,30);
  axes(pc,pp.width,pp.height,'x','v');pc.strokeStyle='#ffd38b';pc.lineWidth=2;pc.beginPath();
  pts.forEach((p,i)=>{const xp=pp.width/2+p[1]/(maxx*1.15)*(pp.width*.42),y=pp.height/2-p[2]/(maxv*1.15)*(pp.height*.42);i?pc.lineTo(xp,y):pc.moveTo(xp,y)});pc.stroke();
  pc.fillStyle='#8d9ab3';pc.fillText('faz uzayı',pp.width-95,30);
}
[m,k,c,x0].forEach(el=>el.addEventListener('input',render));render();