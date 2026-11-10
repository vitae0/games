const C=document.getElementById('sea'),ctx=C.getContext('2d'),W=C.width,H=C.height;
const E=id=>document.getElementById(id),timeEl=E('time'),fuelEl=E('fuel'),stationEl=E('station'),scanEl=E('scan'),hullEl=E('hull'),speedEl=E('speed'),levelEl=E('level'),status=E('status'),nextBtn=E('next');
const levels=[
 {name:'Lagün',base:{x:110,y:330,r:46},buoys:[{x:310,y:150},{x:690,y:170},{x:770,y:470}],refuels:[{x:510,y:520}],islands:[{x:470,y:315,r:62}],current:1,time:100},
 {name:'İki boğaz',base:{x:105,y:520,r:46},buoys:[{x:260,y:150},{x:700,y:130},{x:820,y:500}],refuels:[{x:510,y:325}],islands:[{x:445,y:230,r:72},{x:560,y:430,r:58}],current:1.25,time:106},
 {name:'Kırık takımada',base:{x:120,y:320,r:46},buoys:[{x:300,y:105},{x:720,y:160},{x:760,y:510}],refuels:[{x:470,y:535},{x:850,y:300}],islands:[{x:395,y:310,r:48},{x:530,y:205,r:56},{x:590,y:440,r:64}],current:1.5,time:112},
 {name:'Dar su',base:{x:115,y:110,r:46},buoys:[{x:300,y:500},{x:700,y:500},{x:835,y:145}],refuels:[{x:480,y:90},{x:685,y:300}],islands:[{x:340,y:285,r:78},{x:565,y:310,r:86},{x:760,y:320,r:58}],current:1.8,time:120},
 {name:'Fırtına hattı',base:{x:100,y:520,r:46},buoys:[{x:245,y:120},{x:690,y:115},{x:840,y:500}],refuels:[{x:435,y:530},{x:805,y:245}],islands:[{x:330,y:305,r:72},{x:505,y:190,r:62},{x:555,y:455,r:68},{x:735,y:310,r:72}],current:2.15,time:128}
];
const keys={up:false,down:false,left:false,right:false};let li=0,g,last=performance.now(),wake=[];
function L(){return levels[li]}
function current(x,y,t){const s=L().current;return {x:s*(18*Math.sin(y/110+t*.7)+8*Math.cos((x+y)/170-t*.4)),y:s*(16*Math.cos(x/145-t*.55)+7*Math.sin((x-2*y)/220+t*.45))}}
function reset(){const l=L();g={x:l.base.x,y:l.base.y,a:0,vx:0,vy:0,fuel:100,time:l.time,target:0,scan:0,hull:3,done:false,won:false,score:0,hitCd:0,refuels:new Set(l.refuels.map((_,i)=>i))};wake=[];status.textContent='İstasyon taraması için düşük hızla halkada kal. Akıntı ×'+l.current.toFixed(2)+'.';last=performance.now();nextBtn.disabled=true;ui()}
function ui(){levelEl.textContent=(li+1)+'/'+levels.length;timeEl.textContent=Math.max(0,g.time).toFixed(1);fuelEl.textContent=Math.max(0,g.fuel).toFixed(0);stationEl.textContent=g.target+'/3';scanEl.textContent=Math.round(g.scan/1.15*100)+'%';hullEl.textContent=g.hull;speedEl.textContent=Math.hypot(g.vx,g.vy).toFixed(0)}
function islandAt(x,y){return L().islands.find(o=>Math.hypot(x-o.x,y-o.y)<o.r+18)||null}
function collideIsland(o){if(g.hitCd>0)return;g.hitCd=1.2;g.hull--;g.fuel=Math.max(0,g.fuel-10);const dx=g.x-o.x,dy=g.y-o.y,d=Math.max(1,Math.hypot(dx,dy));g.x=o.x+dx/d*(o.r+25);g.y=o.y+dy/d*(o.r+25);g.vx=dx/d*70;g.vy=dy/d*70;g.scan=0;status.textContent='Ada teması: -1 gövde, -10 yakıt. Momentum kaybettin.';if(g.hull<=0){g.done=true;g.won=false;status.textContent='Gövde dayanmadı. Sefer bitti.'}}
function steer(dt){
 if(g.done)return;if(g.hitCd>0)g.hitCd=Math.max(0,g.hitCd-dt);
 const steer=(keys.right?1:0)-(keys.left?1:0),throttle=(keys.up?1:0)-(keys.down?0.55:0);g.a+=steer*2.35*dt*(0.4+Math.min(1,Math.hypot(g.vx,g.vy)/50));
 if(throttle!==0&&g.fuel>0){const acc=throttle>0?112:-62;g.vx+=Math.cos(g.a)*acc*dt;g.vy+=Math.sin(g.a)*acc*dt;g.fuel=Math.max(0,g.fuel-(throttle>0?3.2:1.4)*dt)}
 const cur=current(g.x,g.y,L().time-g.time);g.vx+=cur.x*.115*dt;g.vy+=cur.y*.115*dt;const drag=Math.pow(.987,dt*60);g.vx*=drag;g.vy*=drag;const sp=Math.hypot(g.vx,g.vy),max=180;if(sp>max){g.vx=g.vx/sp*max;g.vy=g.vy/sp*max}
 g.x+=g.vx*dt;g.y+=g.vy*dt;
 if(g.x<24||g.x>W-24||g.y<24||g.y>H-24){g.x=Math.min(W-24,Math.max(24,g.x));g.y=Math.min(H-24,Math.max(24,g.y));g.vx*=-.25;g.vy*=-.25;g.fuel=Math.max(0,g.fuel-4);g.scan=0;status.textContent='Harita sınırına vurdun: -4 yakıt.'}
 const island=islandAt(g.x,g.y);if(island)collideIsland(island);
 g.time-=dt;if(Math.hypot(g.vx,g.vy)>18&&Math.random()<dt*20)wake.push({x:g.x-Math.cos(g.a)*22,y:g.y-Math.sin(g.a)*22,life:1});
 for(const i of [...g.refuels]){const r=L().refuels[i];if(Math.hypot(g.x-r.x,g.y-r.y)<32){g.refuels.delete(i);g.fuel=Math.min(100,g.fuel+28);g.score+=150;status.textContent='İkmal şamandırası: +28 yakıt, +150 puan.'}}
 if(!g.done&&g.target<3){const b=L().buoys[g.target],dist=Math.hypot(g.x-b.x,g.y-b.y),spd=Math.hypot(g.vx,g.vy);if(dist<48&&spd<58){g.scan+=dt;if(g.scan>=1.15){g.target++;g.scan=0;g.score+=400;status.textContent=g.target<3?'Tarama tamamlandı. Sonraki turuncu istasyona git.':'Tüm istasyonlar tarandı. Üsse dön.'}}else{if(dist<48&&spd>=58)status.textContent='Tarama alanındasın ama çok hızlısın. Frenle.';g.scan=Math.max(0,g.scan-dt*.65)}}
 else if(!g.done&&g.target===3&&Math.hypot(g.x-L().base.x,g.y-L().base.y)<55){g.done=true;g.won=true;g.score+=Math.round(g.time*20+g.fuel*12+g.hull*300+li*300);status.textContent='Rota tamamlandı · skor '+g.score;nextBtn.disabled=li===levels.length-1}
 if(g.time<=0&&!g.done){g.done=true;g.won=false;status.textContent='Süre doldu. Akıntıyı daha fazla kullanıp rotayı kısalt.'}ui()
}
function arrow(x,y,vx,vy){const sc=.55,ex=x+vx*sc,ey=y+vy*sc,a=Math.atan2(vy,vx);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-4*Math.cos(a-.55),ey-4*Math.sin(a-.55));ctx.moveTo(ex,ey);ctx.lineTo(ex-4*Math.cos(a+.55),ey-4*Math.sin(a+.55));ctx.stroke()}
function islandShape(o){ctx.beginPath();for(let i=0;i<16;i++){const a=i/16*Math.PI*2,rr=o.r*(.82+.13*Math.sin(i*2.7+o.x*.01));const x=o.x+Math.cos(a)*rr,y=o.y+Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath()}
function draw(){
 const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#cceef4');grd.addColorStop(1,'#83cbdc');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(255,255,255,.46)';ctx.lineWidth=1.3;const t=L().time-g.time;
 for(let y=55;y<H;y+=58)for(let x=55;x<W;x+=58){if(islandAt(x,y))continue;const c=current(x,y,t);arrow(x,y,c.x,c.y)}
 for(const o of L().islands){islandShape(o);ctx.fillStyle='#d9c98d';ctx.fill();ctx.strokeStyle='#6b8f68';ctx.lineWidth=7;ctx.stroke();ctx.fillStyle='rgba(84,123,72,.35)';ctx.beginPath();ctx.arc(o.x-o.r*.18,o.y-o.r*.15,o.r*.43,0,Math.PI*2);ctx.fill()}
 for(const i of g.refuels){const r=L().refuels[i];ctx.fillStyle='#5bc58b';ctx.beginPath();ctx.arc(r.x,r.y,15,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#17603b';ctx.font='800 11px system-ui';ctx.textAlign='center';ctx.fillText('+F',r.x,r.y+4)}
 const base=L().base;ctx.fillStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.arc(base.x,base.y,base.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#175d67';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#175d67';ctx.font='700 13px system-ui';ctx.textAlign='center';ctx.fillText(g.target===3?'ÜS · DÖN':'ÜS',base.x,base.y+5);
 L().buoys.forEach((b,i)=>{const active=i===g.target,done=i<g.target;ctx.fillStyle=done?'#8c9aa0':active?'#ff704e':'#edf4f4';ctx.beginPath();ctx.arc(b.x,b.y,20,0,Math.PI*2);ctx.fill();if(active){ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=8;ctx.beginPath();ctx.arc(b.x,b.y,30,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,g.scan/1.15));ctx.stroke()}ctx.fillStyle=done?'#fff':'#173b42';ctx.font='800 12px system-ui';ctx.fillText(String(i+1),b.x,b.y+4)});
 wake.forEach(w=>{ctx.globalAlpha=w.life*.35;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(w.x,w.y,7*(1-w.life)+2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;w.life-=.025});wake=wake.filter(w=>w.life>0);
 ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.a);ctx.fillStyle=g.hitCd>0?'#b94e47':'#1b2629';ctx.beginPath();ctx.moveTo(28,0);ctx.lineTo(-18,-14);ctx.lineTo(-10,0);ctx.lineTo(-18,14);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-5,-5,11,10);ctx.restore();
 ctx.textAlign='left';ctx.fillStyle='rgba(20,60,65,.62)';ctx.font='700 14px system-ui';ctx.fillText(L().name+' · akıntı ×'+L().current.toFixed(2),18,26);
 if(g.done){ctx.fillStyle='rgba(255,255,255,.73)';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#172225';ctx.font='800 38px system-ui';ctx.fillText(g.won?'Rota tamamlandı':'Sefer bitti',W/2,H/2-12);ctx.font='500 17px system-ui';ctx.fillStyle='#506268';ctx.fillText(g.won?'Skor '+g.score:(g.hull<=0?'Gövde kaybedildi.':'Süre doldu.'),W/2,H/2+24)}
}
function loop(now){const dt=Math.min(.035,(now-last)/1000);last=now;steer(dt);draw();requestAnimationFrame(loop)}
addEventListener('keydown',e=>{const k={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[e.key];if(k){e.preventDefault();keys[k]=true}});
addEventListener('keyup',e=>{const k={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[e.key];if(k)keys[k]=false});
document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key,on=e=>{e.preventDefault();keys[k]=true},off=e=>{e.preventDefault();keys[k]=false};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)});
E('restart').onclick=reset;nextBtn.onclick=()=>{if(g.won&&li<levels.length-1){li++;reset()}};reset();requestAnimationFrame(loop);