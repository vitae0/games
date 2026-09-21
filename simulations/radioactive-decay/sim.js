const E=id=>document.getElementById(id);
const n0=E('n0'),half=E('half'),speedCtl=E('speedCtl'),nv=E('nv'),hv=E('hv'),sv=E('sv'),tv=E('tv'),aliveEl=E('alive'),expectedEl=E('expected'),lambdaEl=E('lambda'),activityEl=E('activity'),zscoreEl=E('zscore');
const atoms=E('atoms'),ac=atoms.getContext('2d'),plot=E('plot'),gc=plot.getContext('2d'),hist=E('hist'),hc=hist.getContext('2d');
let data,last=performance.now(),paused=false;

window.mathFormulas={
 f1:String.raw`\frac{dN}{dt}=-\lambda N`,
 f2:String.raw`\frac{dN}{N}=-\lambda\,dt\quad\Rightarrow\quad \ln N=-\lambda t+C`,
 f3:String.raw`N(t)=N_0e^{-\lambda t}`,
 f4:String.raw`\frac{N_0}{2}=N_0e^{-\lambda T_{1/2}}\quad\Rightarrow\quad \lambda=\frac{\ln2}{T_{1/2}}`,
 f5:String.raw`S(t)=P(T>t)=e^{-\lambda t}`,
 f6:String.raw`f(t)=\lambda e^{-\lambda t},\qquad t\ge0`,
 f7:String.raw`p(\Delta t)=P(t<T\le t+\Delta t\mid T>t)=1-e^{-\lambda\Delta t}`,
 f8:String.raw`N(t)\sim\operatorname{Binomial}\!\left(N_0,\,q=e^{-\lambda t}\right)`,
 f9:String.raw`\mathbb E[N]=N_0q,\qquad \operatorname{Var}(N)=N_0q(1-q),\qquad \sigma=\sqrt{N_0q(1-q)}`,
 f10:String.raw`A(t)=\lambda N(t)\quad\text{ve ortalamada}\quad \mathbb E[A(t)]=\lambda N_0e^{-\lambda t}`
};

function makeAtoms(N){
 const cols=Math.ceil(Math.sqrt(N*atoms.width/atoms.height)),rows=Math.ceil(N/cols),sx=(atoms.width-36)/Math.max(1,cols-1),sy=(atoms.height-36)/Math.max(1,rows-1),arr=[];
 for(let i=0;i<N;i++){const col=i%cols,row=Math.floor(i/cols);arr.push({x:18+col*sx+(Math.random()-.5)*Math.min(5,sx*.25),y:18+row*sy+(Math.random()-.5)*Math.min(5,sy*.25),on:true,decay:null,flash:0})}
 return arr;
}
function init(){
 const N=+n0.value;data={t:0,atoms:makeAtoms(N),hist:[[0,N]],decayTimes:[],acc:0};last=performance.now();updateLabels();
}
function lambda(){return Math.log(2)/+half.value}
function countAlive(){let n=0;for(const a of data.atoms)if(a.on)n++;return n}
function updateLabels(){
 const N=+n0.value,L=lambda(),a=countAlive(),q=Math.exp(-L*data.t),mu=N*q,sd=Math.sqrt(Math.max(0,N*q*(1-q))),z=sd>1e-9?(a-mu)/sd:0;
 nv.textContent=N;hv.textContent=(+half.value).toFixed(1);sv.textContent=(+speedCtl.value).toFixed(2);tv.textContent=data.t.toFixed(2)+' s';aliveEl.textContent=a;expectedEl.textContent=mu.toFixed(1);lambdaEl.textContent=L.toFixed(4)+' s⁻¹';activityEl.textContent=(L*a).toFixed(2)+' Bq';zscoreEl.textContent=(sd>1e-9?z.toFixed(2):'0.00');
}
function advance(dt){
 const L=lambda(),p=1-Math.exp(-L*dt);
 for(const a of data.atoms)if(a.on&&Math.random()<p){a.on=false;a.decay=data.t+Math.random()*dt;a.flash=1;data.decayTimes.push(a.decay)}
 data.t+=dt;data.hist.push([data.t,countAlive()]);if(data.hist.length>2400)data.hist.shift();updateLabels();
}
function drawAtoms(){
 ac.fillStyle='#fafaf7';ac.fillRect(0,0,atoms.width,atoms.height);
 for(const a of data.atoms){
   if(a.on){ac.fillStyle='#6b5bd2';ac.beginPath();ac.arc(a.x,a.y,3.5,0,Math.PI*2);ac.fill()}
   else{ac.fillStyle='#dad8d1';ac.beginPath();ac.arc(a.x,a.y,2.2,0,Math.PI*2);ac.fill()}
   if(a.flash>0){ac.globalAlpha=a.flash;ac.strokeStyle='#e67a4f';ac.lineWidth=2;ac.beginPath();ac.arc(a.x,a.y,5+(1-a.flash)*10,0,Math.PI*2);ac.stroke();ac.globalAlpha=1;a.flash=Math.max(0,a.flash-.035)}
 }
 ac.fillStyle='#777';ac.font='12px system-ui';ac.textAlign='left';ac.fillText(countAlive()+' / '+data.atoms.length+' çekirdek hayatta',14,20);
}
function basePlot(ctx,W,H,xlabel,ylabel){
 ctx.fillStyle='#fafaf7';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#deddd5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(52,H-42);ctx.lineTo(W-18,H-42);ctx.moveTo(52,20);ctx.lineTo(52,H-42);ctx.stroke();ctx.fillStyle='#777';ctx.font='12px system-ui';ctx.fillText(xlabel,W-34,H-16);ctx.fillText(ylabel,14,28);
}
function drawSurvival(){
 const W=plot.width,H=plot.height,N=+n0.value,L=lambda(),T=Math.max(4*+half.value,data.t*1.12,8);basePlot(gc,W,H,'t','N');
 const band=[];for(let i=0;i<=240;i++){const t=T*i/240,q=Math.exp(-L*t),mu=N*q,sd=Math.sqrt(N*q*(1-q));band.push({t,lo:Math.max(0,mu-sd),hi:Math.min(N,mu+sd),mu})}
 gc.fillStyle='rgba(74,158,102,.13)';gc.beginPath();band.forEach((p,i)=>{const x=52+p.t/T*(W-76),y=H-42-p.hi/N*(H-72);i?gc.lineTo(x,y):gc.moveTo(x,y)});for(let i=band.length-1;i>=0;i--){const p=band[i],x=52+p.t/T*(W-76),y=H-42-p.lo/N*(H-72);gc.lineTo(x,y)}gc.closePath();gc.fill();
 gc.strokeStyle='#4a9e66';gc.lineWidth=3;gc.beginPath();band.forEach((p,i)=>{const x=52+p.t/T*(W-76),y=H-42-p.mu/N*(H-72);i?gc.lineTo(x,y):gc.moveTo(x,y)});gc.stroke();
 gc.strokeStyle='#d79637';gc.lineWidth=2.5;gc.beginPath();data.hist.forEach((p,i)=>{const x=52+Math.min(p[0],T)/T*(W-76),y=H-42-p[1]/N*(H-72);i?gc.lineTo(x,y):gc.moveTo(x,y)});gc.stroke();
 gc.setLineDash([5,6]);gc.strokeStyle='rgba(60,60,60,.24)';for(let j=1;j<=3;j++){const t=j*+half.value;if(t>T)continue;const x=52+t/T*(W-76);gc.beginPath();gc.moveTo(x,20);gc.lineTo(x,H-42);gc.stroke();gc.fillStyle='#777';gc.fillText(j+'T½',x+4,34)}gc.setLineDash([]);
 gc.fillStyle='#4a9e66';gc.fillText('beklenti',W-108,26);gc.fillStyle='#d79637';gc.fillText('tek koşu',W-108,43);
}
function drawHistogram(){
 const W=hist.width,H=hist.height,L=lambda(),N=+n0.value,T=Math.max(4*+half.value,data.t*1.12,8),bins=24,counts=new Array(bins).fill(0),bw=T/bins;
 for(const t of data.decayTimes){const b=Math.floor(t/bw);if(b>=0&&b<bins)counts[b]++}
 let maxY=1;const expected=[];for(let i=0;i<bins;i++){const a=i*bw,b=(i+1)*bw,e=N*(Math.exp(-L*a)-Math.exp(-L*b));expected.push(e);maxY=Math.max(maxY,e,counts[i])}
 basePlot(hc,W,H,'t','bozunma');
 const pw=W-76,ph=H-72,barW=pw/bins;
 for(let i=0;i<bins;i++){const x=52+i*barW+2,y=H-42-counts[i]/maxY*ph,h=counts[i]/maxY*ph;hc.fillStyle='#d9c7f3';hc.fillRect(x,y,Math.max(1,barW-4),h)}
 hc.strokeStyle='#6b5bd2';hc.lineWidth=3;hc.beginPath();expected.forEach((e,i)=>{const x=52+(i+.5)*barW,y=H-42-e/maxY*ph;i?hc.lineTo(x,y):hc.moveTo(x,y)});hc.stroke();
 if(data.t<T){const x=52+data.t/T*pw;hc.fillStyle='rgba(244,244,239,.72)';hc.fillRect(x,20,W-18-x,H-62);hc.strokeStyle='#777';hc.setLineDash([4,5]);hc.beginPath();hc.moveTo(x,20);hc.lineTo(x,H-42);hc.stroke();hc.setLineDash([]);hc.fillStyle='#777';hc.fillText('şimdi',Math.min(x+5,W-55),34)}
 hc.fillStyle='#6b5bd2';hc.fillText('teorik beklenen',W-132,26);hc.fillStyle='#9272c5';hc.fillText('gözlenen',W-132,43);
}
function frame(now){
 const real=Math.min(.1,(now-last)/1000);last=now;if(!paused){data.acc+=real*+speedCtl.value;while(data.acc>=.04){advance(.04);data.acc-=.04}}
 drawAtoms();drawSurvival();drawHistogram();requestAnimationFrame(frame);
}
n0.addEventListener('input',init);half.addEventListener('input',init);speedCtl.addEventListener('input',updateLabels);
E('reset').onclick=init;E('pause').onclick=()=>{paused=!paused;E('pause').textContent=paused?'Devam et':'Duraklat'};
init();requestAnimationFrame(frame);