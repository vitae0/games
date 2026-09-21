const E=id=>document.getElementById(id);
const n0=E('n0'),half=E('half'),speed=E('speed'),nv=E('nv'),hv=E('hv'),sv=E('sv'),tv=E('tv'),alive=E('alive'),expected=E('expected'),reset=E('reset'),pause=E('pause');
const atoms=E('atoms'),ac=atoms.getContext('2d'),plot=E('plot'),gc=plot.getContext('2d');
window.mathFormulas={
  f1:String.raw`\frac{dN}{dt}=-\lambda N`,
  f2:String.raw`\frac{dN}{N}=-\lambda\,dt\;\Rightarrow\;N(t)=N_0e^{-\lambda t}`,
  f3:String.raw`\lambda=\frac{\ln 2}{T_{1/2}}`,
  f4:String.raw`p(\Delta t)=1-e^{-\lambda\Delta t}`
};
let data,last=performance.now(),paused=false;
function countAlive(){let n=0;for(const a of data.atoms)if(a.on)n++;return n}
function init(){
  const N=+n0.value;
  data={t:0,atoms:Array.from({length:N},()=>({x:20+Math.random()*610,y:20+Math.random()*460,on:true})),hist:[[0,N]],acc:0};
  last=performance.now();ui();
}
function ui(){
  nv.textContent=n0.value;hv.textContent=(+half.value).toFixed(1);sv.textContent=(+speed.value).toFixed(2);tv.textContent=data.t.toFixed(1);
  const a=countAlive(),lam=Math.log(2)/+half.value;alive.textContent=a;expected.textContent=(+n0.value*Math.exp(-lam*data.t)).toFixed(1);
}
function drawAtoms(){
  ac.fillStyle='#090c12';ac.fillRect(0,0,atoms.width,atoms.height);
  for(const a of data.atoms){if(!a.on)continue;ac.fillStyle='#8bd3ff';ac.beginPath();ac.arc(a.x,a.y,3.1,0,Math.PI*2);ac.fill()}
  ac.fillStyle='#8d9ab3';ac.font='13px system-ui';ac.fillText('yaşayan çekirdekler',18,24);
}
function drawPlot(){
  const W=plot.width,H=plot.height,N=+n0.value,lam=Math.log(2)/+half.value,T=Math.max(4*+half.value,data.t*1.15,10);
  gc.fillStyle='#090c12';gc.fillRect(0,0,W,H);gc.strokeStyle='#283247';gc.lineWidth=1;gc.beginPath();gc.moveTo(48,20);gc.lineTo(48,H-42);gc.lineTo(W-20,H-42);gc.stroke();
  gc.fillStyle='#8d9ab3';gc.font='12px system-ui';gc.fillText('N',24,28);gc.fillText('t',W-25,H-50);
  gc.strokeStyle='#9fe6b0';gc.lineWidth=2;gc.beginPath();
  for(let i=0;i<=300;i++){const t=T*i/300,n=N*Math.exp(-lam*t),x=48+t/T*(W-72),y=H-42-n/N*(H-72);i?gc.lineTo(x,y):gc.moveTo(x,y)}gc.stroke();
  gc.strokeStyle='#ffd38b';gc.beginPath();
  data.hist.forEach((p,i)=>{const x=48+p[0]/T*(W-72),y=H-42-p[1]/N*(H-72);i?gc.lineTo(x,y):gc.moveTo(x,y)});gc.stroke();
  gc.fillStyle='#9fe6b0';gc.fillText('beklenen eğri',W-145,28);gc.fillStyle='#ffd38b';gc.fillText('tek stokastik koşu',W-145,46);
}
function advance(dt){
  const lam=Math.log(2)/+half.value,p=1-Math.exp(-lam*dt);
  for(const a of data.atoms)if(a.on&&Math.random()<p)a.on=false;
  data.t+=dt;data.hist.push([data.t,countAlive()]);if(data.hist.length>1800)data.hist.shift();ui();
}
function frame(now){
  const real=Math.min(.1,(now-last)/1000);last=now;
  if(!paused){data.acc+=real*+speed.value;while(data.acc>=.05){advance(.05);data.acc-=.05}}
  drawAtoms();drawPlot();requestAnimationFrame(frame);
}
n0.addEventListener('input',init);half.addEventListener('input',init);speed.addEventListener('input',ui);
reset.onclick=init;pause.onclick=()=>{paused=!paused;pause.textContent=paused?'Devam et':'Duraklat'};
init();requestAnimationFrame(frame);