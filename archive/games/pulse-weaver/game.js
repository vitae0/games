const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id),CX=480,CY=320;
const levels=[
 {rings:4,gap:.86,baseSpeed:.22,pulseSpeed:112,steer:2.8,goal:5},
 {rings:4,gap:.72,baseSpeed:.31,pulseSpeed:125,steer:2.65,goal:6},
 {rings:5,gap:.68,baseSpeed:.38,pulseSpeed:133,steer:2.5,goal:7},
 {rings:5,gap:.57,baseSpeed:.46,pulseSpeed:141,steer:2.35,goal:8},
 {rings:6,gap:.51,baseSpeed:.55,pulseSpeed:150,steer:2.2,goal:9}
];
let li=0,s,last=performance.now(),keys={L:false,R:false},pointerTarget=-Math.PI/2;
function L(){return levels[li]}
function wrap(a){return Math.atan2(Math.sin(a),Math.cos(a))}
function diff(a,b){return wrap(a-b)}
function gateAngle(i){const dir=i%2?1:-1;return s.phases[i]+dir*s.time*L().baseSpeed*(1+i*.17)}
function outerR(){return 92+(L().rings-1)*55}
function makeRun(){
 const n=s.attempt++;s.pulse={r:28,a:wrap(-Math.PI/2+.18*Math.sin(n*1.71)),alive:true,trail:[],nextRing:0};
 s.phases=Array.from({length:L().rings},(_,i)=>wrap(.9*i+1.3*Math.sin(n*.81+i*1.17)));
 s.shards=[];
 for(let i=0;i<L().rings-1;i++){const r=119+i*55,a=wrap(.7+i*1.43+Math.sin(n*.73+i)*1.15);s.shards.push({r,a,taken:false})}
 pointerTarget=s.pulse.a
}
function reset(){s={time:0,hit:0,miss:0,combo:0,score:0,ended:false,won:false,attempt:0,respawn:0,phases:[],shards:[],pulse:null};E('next').disabled=true;E('status').textContent='Pulse sürekli dışarı akar. İmleç yalnız hedef açıyı belirler; pulse anında dönemez. Birkaç halka sonrasını planla.';makeRun();ui()}
function ui(){E('level').textContent=(li+1)+'/'+levels.length;E('hit').textContent=s.hit+'/'+L().goal;E('miss').textContent=s.miss;E('combo').textContent=s.combo;E('score').textContent=s.score}
function fail(i){
 s.miss++;s.combo=0;s.score=Math.max(0,s.score-70);s.pulse.alive=false;s.respawn=.55;E('status').textContent=(i>=0?(i+1)+'. halkada sıkıştın. ':'Yörünge çöktü. ')+'Yeni pulse geliyor; bir sonraki kapının nereye döneceğini oku.';
 if(s.miss>=4){s.ended=true;s.won=false;E('status').textContent='Dört pulse kaybedildi. Bölümü yeniden ör.'}ui()
}
function success(){
 s.hit++;s.combo++;const gain=300+s.combo*80;s.score+=gain;s.pulse.alive=false;s.respawn=.48;E('status').textContent='Temiz örgü · +'+gain+' · zincir ×'+s.combo;
 if(s.hit>=L().goal){s.ended=true;s.won=true;s.score+=700+s.combo*100;E('status').textContent='Bölüm tamamlandı · skor '+s.score;E('next').disabled=li===levels.length-1}ui()
}
function steerPulse(dt){
 if(!s.pulse||!s.pulse.alive)return;const p=s.pulse;
 if(keys.L)pointerTarget=wrap(pointerTarget-2.6*dt);if(keys.R)pointerTarget=wrap(pointerTarget+2.6*dt);
 const d=diff(pointerTarget,p.a),turn=clamp(d,-L().steer*dt,L().steer*dt);p.a=wrap(p.a+turn);p.r+=L().pulseSpeed*dt;
 p.trail.push([p.r,p.a]);if(p.trail.length>95)p.trail.shift();
 for(const sh of s.shards){if(!sh.taken&&Math.abs(p.r-sh.r)<9&&Math.abs(diff(p.a,sh.a))<.16){sh.taken=true;s.score+=90;E('status').textContent='Shard +90. Opsiyonel rota işe yaradı.';ui()}}
 while(p.nextRing<L().rings&&p.r>=92+p.nextRing*55){const i=p.nextRing;if(Math.abs(diff(p.a,gateAngle(i)))>L().gap/2){fail(i);return}p.nextRing++}
 if(p.r>outerR()+48)success()
}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function step(dt){
 if(s.ended)return;s.time+=dt;
 if(s.respawn>0){s.respawn-=dt;if(s.respawn<=0&&!s.ended)makeRun();return}
 steerPulse(dt)
}
function draw(){
 ctx.fillStyle='#0f1118';ctx.fillRect(0,0,C.width,C.height);
 const grid=ctx.createRadialGradient(CX,CY,15,CX,CY,320);grid.addColorStop(0,'rgba(120,105,220,.14)');grid.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=grid;ctx.fillRect(0,0,C.width,C.height);
 for(let i=0;i<L().rings;i++){const r=92+i*55,g=gateAngle(i),gap=L().gap;ctx.strokeStyle=['#7664db','#d36e94','#e0a84d','#57b49f','#73a8e2','#bc79dd'][i];ctx.lineWidth=14;ctx.beginPath();ctx.arc(CX,CY,r,g+gap/2,g+Math.PI*2-gap/2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(CX,CY,r,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(CX,CY,r,g-gap/2,g+gap/2);ctx.stroke()}
 for(const sh of s.shards){if(sh.taken)continue;const x=CX+Math.cos(sh.a)*sh.r,y=CY+Math.sin(sh.a)*sh.r;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#fff1a8';ctx.fillRect(-7,-7,14,14);ctx.restore()}
 if(s.pulse){const p=s.pulse;if(p.trail.length>1){ctx.strokeStyle='rgba(255,255,255,.24)';ctx.lineWidth=5;ctx.beginPath();p.trail.forEach((q,i)=>{const x=CX+Math.cos(q[1])*q[0],y=CY+Math.sin(q[1])*q[0];i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()}if(p.alive){const x=CX+Math.cos(p.a)*p.r,y=CY+Math.sin(p.a)*p.r;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#95e7ff';ctx.lineWidth=5;ctx.stroke()}}
 const aimR=58,ax=CX+Math.cos(pointerTarget)*aimR,ay=CY+Math.sin(pointerTarget)*aimR;ctx.strokeStyle='rgba(255,255,255,.36)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(CX,CY);ctx.lineTo(ax,ay);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(CX,CY,16,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='rgba(255,255,255,.58)';ctx.font='700 14px system-ui';ctx.textAlign='left';ctx.fillText('dönüş limiti '+L().steer.toFixed(2)+' rad/s · pulse '+L().pulseSpeed+' px/s',18,26);
 if(s.ended&&!s.won){ctx.fillStyle='rgba(15,17,24,.72)';ctx.fillRect(0,0,C.width,C.height);ctx.fillStyle='#fff';ctx.font='800 38px system-ui';ctx.textAlign='center';ctx.fillText('Örgü koptu',C.width/2,C.height/2)}
}
C.addEventListener('pointermove',e=>{const r=C.getBoundingClientRect(),x=(e.clientX-r.left)*C.width/r.width,y=(e.clientY-r.top)*C.height/r.height;pointerTarget=Math.atan2(y-CY,x-CX)});
C.addEventListener('pointerdown',e=>{const r=C.getBoundingClientRect(),x=(e.clientX-r.left)*C.width/r.width,y=(e.clientY-r.top)*C.height/r.height;pointerTarget=Math.atan2(y-CY,x-CX)});
addEventListener('keydown',e=>{if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')keys.L=true;if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')keys.R=true});
addEventListener('keyup',e=>{if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')keys.L=false;if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')keys.R=false});
document.querySelectorAll('[data-act]').forEach(b=>{const k=b.dataset.act;b.onpointerdown=()=>keys[k]=true;b.onpointerup=()=>keys[k]=false;b.onpointerleave=()=>keys[k]=false});
E('restart').onclick=reset;E('next').onclick=()=>{if(s.won&&li<levels.length-1){li++;reset()}};
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;step(dt);draw();requestAnimationFrame(loop)}reset();requestAnimationFrame(loop);