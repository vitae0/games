const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id),CX=480,CY=320;
const levels=[{rings:3,gap:.72,speed:.35},{rings:3,gap:.58,speed:.48},{rings:4,gap:.58,speed:.55},{rings:4,gap:.46,speed:.68},{rings:5,gap:.42,speed:.78}];
let li=0,s,last=performance.now(),keys={L:false,R:false};function L(){return levels[li]}
function reset(){s={angle:-Math.PI/2,pulse:null,hit:0,miss:0,time:0,ended:false,phases:Array.from({length:L().rings},(_,i)=>i*1.41)};E('next').disabled=true;E('status').textContent='Kapı boşluklarını hizala. Darbe her halkayı geçtiğinde o anki açı kontrol edilir.';ui()}
function ui(){E('level').textContent=(li+1)+'/'+levels.length;E('hit').textContent=s.hit;E('miss').textContent=s.miss}
function gapAngle(i){const dir=i%2?1:-1;return s.phases[i]+dir*s.time*L().speed*(1+i*.12)}
function adiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function fire(){if(s.ended||s.pulse)return;s.pulse={r:24,next:0,angle:s.angle}}
function fail(){s.miss++;s.pulse=null;E('status').textContent='Darbe bir halkaya çarptı.';if(s.miss>=3){s.ended=true;E('status').textContent='Üç darbe kaybedildi. Deseni tekrar oku.'}ui()}
function step(dt){if(s.ended)return;if(keys.L)s.angle-=1.9*dt;if(keys.R)s.angle+=1.9*dt;s.time+=dt;if(s.pulse){s.pulse.r+=260*dt;while(s.pulse.next<L().rings&&s.pulse.r>=95+s.pulse.next*62){const i=s.pulse.next;if(Math.abs(adiff(s.pulse.angle,gapAngle(i)))>L().gap/2){fail();break}s.pulse.next++}if(s.pulse&&s.pulse.r>95+(L().rings-1)*62+70){s.hit++;s.pulse=null;E('status').textContent='Temiz geçiş.';if(s.hit>=5){s.ended=true;E('status').textContent='Bölüm tamamlandı.';E('next').disabled=li===levels.length-1}ui()}}}
function draw(){ctx.fillStyle='#10121a';ctx.fillRect(0,0,C.width,C.height);for(let i=0;i<L().rings;i++){const r=95+i*62,g=gapAngle(i);ctx.strokeStyle=['#7b6de3','#d66e92','#e2a84b','#58b5a2','#79a9e5'][i];ctx.lineWidth=17;ctx.beginPath();ctx.arc(CX,CY,r,g+L().gap/2,g+Math.PI*2-L().gap/2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.16)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(CX,CY,r,0,Math.PI*2);ctx.stroke()}
 ctx.save();ctx.translate(CX,CY);ctx.rotate(s.angle);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(30,0);ctx.lineTo(7,-8);ctx.lineTo(7,8);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(CX,CY,18,0,Math.PI*2);ctx.fill();
 if(s.pulse){ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.beginPath();ctx.arc(CX+Math.cos(s.pulse.angle)*s.pulse.r,CY+Math.sin(s.pulse.angle)*s.pulse.r,7,0,Math.PI*2);ctx.stroke()}
 ctx.fillStyle='rgba(255,255,255,.6)';ctx.font='700 14px system-ui';ctx.textAlign='left';ctx.fillText('boşluk '+Math.round(L().gap*180/Math.PI)+'° · hız ×'+L().speed.toFixed(2),18,26)}
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;step(dt);draw();requestAnimationFrame(loop)}
addEventListener('keydown',e=>{if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')keys.L=true;if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')keys.R=true;if(e.key===' '){e.preventDefault();fire()}});
addEventListener('keyup',e=>{if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')keys.L=false;if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')keys.R=false});
C.onclick=fire;document.querySelectorAll('[data-act]').forEach(b=>{if(b.dataset.act==='F')b.onclick=fire;else{const k=b.dataset.act;b.onpointerdown=()=>keys[k]=true;b.onpointerup=()=>keys[k]=false;b.onpointerleave=()=>keys[k]=false}});
E('restart').onclick=reset;E('next').onclick=()=>{if(s.ended&&s.hit>=5&&li<levels.length-1){li++;reset()}};reset();requestAnimationFrame(loop);