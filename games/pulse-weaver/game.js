const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id),CX=480,CY=320;
const levels=[
 {rings:3,gap:.80,speed:.32,target:.82,targetSpeed:.18,goal:6},
 {rings:3,gap:.64,speed:.46,target:.70,targetSpeed:.27,goal:7},
 {rings:4,gap:.59,speed:.55,target:.64,targetSpeed:.34,goal:8},
 {rings:4,gap:.50,speed:.67,target:.58,targetSpeed:.43,goal:9},
 {rings:5,gap:.46,speed:.78,target:.52,targetSpeed:.52,goal:10}
];
let li=0,s,last=performance.now(),keys={L:false,R:false};
function L(){return levels[li]}
function reset(){s={angle:-Math.PI/2,pulse:null,hit:0,miss:0,combo:0,score:0,time:0,ended:false,phases:Array.from({length:L().rings},(_,i)=>i*1.41),targetPhase:1.1,focus:0,focusTime:0};E('next').disabled=true;E('focusBtn').disabled=true;E('status').textContent='Darbe bütün halka boşluklarından ve dıştaki yeşil sektörün içinden geçmeli.';ui()}
function ui(){E('level').textContent=(li+1)+'/'+levels.length;E('hit').textContent=s.hit+'/'+L().goal;E('miss').textContent=s.miss;E('combo').textContent=s.combo;E('score').textContent=s.score;E('focus').textContent=s.focus;E('focusBtn').disabled=s.focus<=0||s.ended}
function speedFactor(){return s.focusTime>0?.32:1}
function gapAngle(i){const dir=i%2?1:-1;return s.phases[i]+dir*s.time*L().speed*(1+i*.13)}
function targetAngle(){return s.targetPhase-s.time*L().targetSpeed}
function adiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
function fire(){if(s.ended||s.pulse)return;s.pulse={r:24,next:0,angle:s.angle}}
function miss(reason){s.miss++;s.combo=0;s.pulse=null;E('status').textContent=reason+' Combo sıfırlandı.';if(s.miss>=4){s.ended=true;E('status').textContent='Dört darbe kayboldu. Deseni yeniden oku.'}ui()}
function success(){s.hit++;s.combo++;const gain=120+s.combo*45;s.score+=gain;s.pulse=null;if(s.combo%3===0){s.focus=Math.min(2,s.focus+1);E('status').textContent='Temiz zincir · +'+gain+' · Focus kazandın.'}else E('status').textContent='Temiz geçiş · +'+gain+' · combo ×'+s.combo;if(s.hit>=L().goal){s.ended=true;s.score+=500+s.combo*60;E('status').textContent='Bölüm tamamlandı · skor '+s.score;E('next').disabled=li===levels.length-1}ui()}
function useFocus(){if(s.focus>0&&!s.ended&&s.focusTime<=0){s.focus--;s.focusTime=2.4;E('status').textContent='Focus: halkalar 2.4 saniye yavaşladı.';ui()}}
function step(dt){
 if(s.ended)return;const sf=speedFactor();if(keys.L)s.angle-=1.95*dt;if(keys.R)s.angle+=1.95*dt;s.time+=dt*sf;if(s.focusTime>0)s.focusTime=Math.max(0,s.focusTime-dt);
 if(s.pulse){s.pulse.r+=285*dt;while(s.pulse.next<L().rings&&s.pulse.r>=95+s.pulse.next*61){const i=s.pulse.next;if(Math.abs(adiff(s.pulse.angle,gapAngle(i)))>L().gap/2){miss('Darbe '+(i+1)+'. halkaya çarptı.');break}s.pulse.next++}
 const outer=95+(L().rings-1)*61;if(s.pulse&&s.pulse.r>outer+58){if(Math.abs(adiff(s.pulse.angle,targetAngle()))>L().target/2)miss('Halkaları geçtin ama dış hedef sektörünü kaçırdın.');else success()}}
}
function draw(){
 ctx.fillStyle='#10121a';ctx.fillRect(0,0,C.width,C.height);
 const ta=targetAngle(),or=95+(L().rings-1)*61+45;ctx.strokeStyle='rgba(91,207,145,.32)';ctx.lineWidth=26;ctx.beginPath();ctx.arc(CX,CY,or,ta-L().target/2,ta+L().target/2);ctx.stroke();ctx.strokeStyle='#64d19a';ctx.lineWidth=7;ctx.beginPath();ctx.arc(CX,CY,or,ta-L().target/2,ta+L().target/2);ctx.stroke();
 for(let i=0;i<L().rings;i++){const r=95+i*61,g=gapAngle(i);ctx.strokeStyle=['#7b6de3','#d66e92','#e2a84b','#58b5a2','#79a9e5'][i];ctx.lineWidth=17;ctx.beginPath();ctx.arc(CX,CY,r,g+L().gap/2,g+Math.PI*2-L().gap/2);ctx.stroke();ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(CX,CY,r,0,Math.PI*2);ctx.stroke()}
 ctx.save();ctx.translate(CX,CY);ctx.rotate(s.angle);ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(31,0);ctx.lineTo(7,-8);ctx.lineTo(7,8);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(CX,CY,18,0,Math.PI*2);ctx.fill();
 if(s.pulse){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(CX+Math.cos(s.pulse.angle)*s.pulse.r,CY+Math.sin(s.pulse.angle)*s.pulse.r,8,0,Math.PI*2);ctx.fill()}
 if(s.focusTime>0){ctx.fillStyle='rgba(100,209,154,.11)';ctx.fillRect(0,0,C.width,C.height);ctx.fillStyle='#8be4b4';ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.fillText('FOCUS · '+s.focusTime.toFixed(1)+' s',C.width/2,28)}
 ctx.fillStyle='rgba(255,255,255,.58)';ctx.font='700 14px system-ui';ctx.textAlign='left';ctx.fillText('hedef '+Math.round(L().target*180/Math.PI)+'° · halka boşluğu '+Math.round(L().gap*180/Math.PI)+'°',18,26)
}
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;step(dt);draw();requestAnimationFrame(loop)}
addEventListener('keydown',e=>{if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')keys.L=true;if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')keys.R=true;if(e.key===' '){e.preventDefault();fire()}if(e.key==='Shift')useFocus()});
addEventListener('keyup',e=>{if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft')keys.L=false;if(e.key==='d'||e.key==='D'||e.key==='ArrowRight')keys.R=false});
C.onclick=fire;document.querySelectorAll('[data-act]').forEach(b=>{if(b.dataset.act==='F')b.onclick=fire;else{const k=b.dataset.act;b.onpointerdown=()=>keys[k]=true;b.onpointerup=()=>keys[k]=false;b.onpointerleave=()=>keys[k]=false}});
E('focusBtn').onclick=useFocus;E('restart').onclick=reset;E('next').onclick=()=>{if(s.ended&&s.hit>=L().goal&&li<levels.length-1){li++;reset()}};reset();requestAnimationFrame(loop);