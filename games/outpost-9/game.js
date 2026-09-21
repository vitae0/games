const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id),CX=480,CY=320;
const levels=[
 {name:'Perigee Watch',duration:38,spawn:1.22,target:6,speed:54,shield:1.05,turn:2.8},
 {name:'Debris Season',duration:42,spawn:1.02,target:7,speed:61,shield:.94,turn:2.65},
 {name:'Black Sky',duration:46,spawn:.90,target:8,speed:68,shield:.84,turn:2.5},
 {name:'Cascade',duration:50,spawn:.80,target:9,speed:75,shield:.75,turn:2.35},
 {name:'Last Window',duration:54,spawn:.71,target:10,speed:82,shield:.68,turn:2.2}
];
let li=0,s,last=performance.now(),pointerTarget=-Math.PI/2,keys={L:false,R:false};
function L(){return levels[li]}function wrap(a){return Math.atan2(Math.sin(a),Math.cos(a))}function diff(a,b){return wrap(a-b)}function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function rand(){s.seed=(s.seed*1664525+1013904223)>>>0;return s.seed/4294967296}
function reset(){s={time:L().duration,hp:5,data:0,charge:100,shieldA:-Math.PI/2,objects:[],spawnTimer:.4,index:0,seed:90210+li*991,ended:false,won:false,score:0,flash:0};pointerTarget=s.shieldA;E('next').disabled=true;E('status').textContent='Kalkanın arkasına saklanmak yetmez: faydalı kapsülleri de vurursan veri hedefini kaçırırsın.';ui()}
function ui(){E('level').textContent=(li+1)+'/'+levels.length;E('time').textContent=Math.max(0,s.time).toFixed(1);E('hp').textContent=s.hp;E('data').textContent=s.data+'/'+L().target;E('charge').textContent=Math.round(s.charge)}
function typeFor(n){if(n%9===7)return'battery';if(n%4===2||n%7===5)return'data';return'debris'}
function spawn(){const n=s.index++,type=typeFor(n),a=rand()*Math.PI*2,heavy=type==='debris'&&n%8===3;s.objects.push({type,a,r:355,speed:L().speed*(.88+rand()*.28)*(heavy?.82:1),heavy,dead:false,trail:[]});s.spawnTimer=L().spawn*(.82+rand()*.35)}
function intercept(o){
 const onShield=Math.abs(diff(o.a,s.shieldA))<L().shield/2&&s.charge>3;
 if(!onShield)return false;
 if(o.type==='debris'){const cost=o.heavy?18:10;if(s.charge>=cost){s.charge-=cost;s.score+=o.heavy?180:100;s.flash=.2;E('status').textContent=(o.heavy?'Ağır ':'')+'enkaz kesildi · şarj -'+cost;return true}return false}
 if(o.type==='data'){E('status').textContent='Veri kapsülünü kalkanla parçaladın. Bazen savunmanın doğru hareketi kenara çekilmektir.';return true}
 if(o.type==='battery'){E('status').textContent='Güç hücresini kalkanla parçaladın.';return true}
 return false
}
function reachBase(o){
 if(o.type==='debris'){s.hp-=o.heavy?2:1;s.flash=.45;E('status').textContent=(o.heavy?'Ağır enkaz':'Enkaz')+' gövdeye çarptı.';if(s.hp<=0){s.hp=0;s.ended=true;s.won=false;E('status').textContent='Outpost kaybedildi.'}}
 else if(o.type==='data'){s.data++;s.score+=240;E('status').textContent='Veri kapsülü alındı · '+s.data+'/'+L().target}
 else{s.charge=Math.min(100,s.charge+34);s.score+=80;E('status').textContent='Güç hücresi alındı · şarj +34.'}
}
function step(dt){
 if(s.ended)return;
 if(keys.L)pointerTarget=wrap(pointerTarget-2.7*dt);if(keys.R)pointerTarget=wrap(pointerTarget+2.7*dt);
 const d=diff(pointerTarget,s.shieldA),turn=clamp(d,-L().turn*dt,L().turn*dt);s.shieldA=wrap(s.shieldA+turn);s.charge=Math.max(0,Math.min(100,s.charge+6.5*dt-Math.abs(turn)*2.8));
 s.time-=dt;s.spawnTimer-=dt;if(s.spawnTimer<=0&&s.time>1)spawn();
 for(const o of s.objects){if(o.dead)continue;o.r-=o.speed*dt;o.trail.push(o.r);if(o.trail.length>10)o.trail.shift();if(o.r<=112&&o.r+o.speed*dt>112&&intercept(o)){o.dead=true;continue}if(o.r<=47){reachBase(o);o.dead=true}}
 s.objects=s.objects.filter(o=>!o.dead&&o.r>-10);s.flash=Math.max(0,s.flash-dt);
 if(s.time<=0&&!s.ended){s.ended=true;s.won=s.hp>0&&s.data>=L().target;if(s.won){s.score+=s.hp*250+Math.round(s.charge*5);E('status').textContent='Dalga atlatıldı · skor '+s.score;E('next').disabled=li===levels.length-1}else E('status').textContent='Süre bitti ama veri hedefi karşılanmadı: '+s.data+'/'+L().target}ui()
}
function drawObject(o){
 const x=CX+Math.cos(o.a)*o.r,y=CY+Math.sin(o.a)*o.r;
 ctx.save();ctx.translate(x,y);ctx.rotate(o.a+Math.PI/2);
 if(o.type==='debris'){ctx.fillStyle=o.heavy?'#a6413d':'#d45d55';ctx.beginPath();ctx.moveTo(0,-(o.heavy?15:10));ctx.lineTo(o.heavy?13:9,9);ctx.lineTo(-9,8);ctx.closePath();ctx.fill();if(o.heavy){ctx.strokeStyle='#ffc0a9';ctx.lineWidth=3;ctx.stroke()}}
 else if(o.type==='data'){ctx.fillStyle='#67bdea';ctx.beginPath();ctx.roundRect(-10,-8,20,16,4);ctx.fill();ctx.strokeStyle='#d8f5ff';ctx.lineWidth=2;ctx.stroke()}
 else{ctx.fillStyle='#67cc92';ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(10,0);ctx.lineTo(0,12);ctx.lineTo(-10,0);ctx.closePath();ctx.fill()}
 ctx.restore()
}
function draw(){
 ctx.fillStyle=s.flash>0?'#22191c':'#10141d';ctx.fillRect(0,0,C.width,C.height);
 const stars=42;ctx.fillStyle='rgba(255,255,255,.35)';for(let i=0;i<stars;i++){const x=(i*137+li*41)%C.width,y=(i*83+37)%C.height;ctx.fillRect(x,y,2,2)}
 ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;for(const r of [110,180,250,320]){ctx.beginPath();ctx.arc(CX,CY,r,0,Math.PI*2);ctx.stroke()}
 for(const o of s.objects)drawObject(o);
 ctx.fillStyle='#303846';ctx.beginPath();ctx.arc(CX,CY,46,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#69758b';ctx.lineWidth=7;ctx.stroke();
 ctx.fillStyle='#c9d2df';for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.arc(CX+Math.cos(a)*27,CY+Math.sin(a)*27,5,0,Math.PI*2);ctx.fill()}
 ctx.strokeStyle=s.charge>3?'#f4f7ff':'rgba(255,255,255,.22)';ctx.lineWidth=15;ctx.lineCap='round';ctx.beginPath();ctx.arc(CX,CY,112,s.shieldA-L().shield/2,s.shieldA+L().shield/2);ctx.stroke();ctx.lineCap='butt';
 ctx.strokeStyle='rgba(117,213,255,.38)';ctx.lineWidth=4;ctx.beginPath();ctx.arc(CX,CY,121,s.shieldA-L().shield/2,s.shieldA+L().shield/2);ctx.stroke();
 const ar=75,ax=CX+Math.cos(pointerTarget)*ar,ay=CY+Math.sin(pointerTarget)*ar;ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(CX,CY);ctx.lineTo(ax,ay);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.58)';ctx.font='700 14px system-ui';ctx.textAlign='left';ctx.fillText(L().name+' · kalkan '+Math.round(L().shield*180/Math.PI)+'° · dönüş '+L().turn.toFixed(2)+' rad/s',18,26);
 ctx.font='600 12px system-ui';ctx.fillStyle='#d45d55';ctx.fillText('▲ enkaz',18,50);ctx.fillStyle='#67bdea';ctx.fillText('▰ veri',94,50);ctx.fillStyle='#67cc92';ctx.fillText('◆ güç',158,50);
 if(s.ended){ctx.fillStyle='rgba(13,16,23,.72)';ctx.fillRect(0,0,C.width,C.height);ctx.textAlign='center';ctx.fillStyle='#fff';ctx.font='800 38px system-ui';ctx.fillText(s.won?'Dalga temiz':'Görev başarısız',C.width/2,C.height/2-10);ctx.font='500 16px system-ui';ctx.fillStyle='#b7c0cf';ctx.fillText(s.won?'Veri '+s.data+' · gövde '+s.hp+' · skor '+s.score:'Veri '+s.data+'/'+L().target+' · gövde '+s.hp,C.width/2,C.height/2+25)}
}
C.addEventListener('pointermove',e=>{const r=C.getBoundingClientRect(),x=(e.clientX-r.left)*C.width/r.width,y=(e.clientY-r.top)*C.height/r.height;pointerTarget=Math.atan2(y-CY,x-CX)});
C.addEventListener('pointerdown',e=>{const r=C.getBoundingClientRect(),x=(e.clientX-r.left)*C.width/r.width,y=(e.clientY-r.top)*C.height/r.height;pointerTarget=Math.atan2(y-CY,x-CX)});
addEventListener('keydown',e=>{if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')keys.L=true;if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')keys.R=true});
addEventListener('keyup',e=>{if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')keys.L=false;if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')keys.R=false});
document.querySelectorAll('[data-act]').forEach(b=>{const k=b.dataset.act;b.onpointerdown=()=>keys[k]=true;b.onpointerup=()=>keys[k]=false;b.onpointerleave=()=>keys[k]=false});
E('restart').onclick=reset;E('next').onclick=()=>{if(s.won&&li<levels.length-1){li++;reset()}};
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;step(dt);draw();requestAnimationFrame(loop)}reset();requestAnimationFrame(loop);