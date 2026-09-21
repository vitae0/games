const C=document.getElementById('sea'),ctx=C.getContext('2d'),W=C.width,H=C.height;
const E=id=>document.getElementById(id),timeEl=E('time'),fuelEl=E('fuel'),stationEl=E('station'),speedEl=E('speed'),status=E('status');
const base={x:120,y:320,r:46},buoys=[{x:320,y:150},{x:700,y:170},{x:760,y:470}];
const keys={up:false,down:false,left:false,right:false};let g,last=performance.now(),wake=[];
function current(x,y,t){return {x:18*Math.sin(y/110+t*.7)+8*Math.cos((x+y)/170-t*.4),y:16*Math.cos(x/145-t*.55)+7*Math.sin((x-2*y)/220+t*.45)}}
function reset(){g={x:base.x,y:base.y,a:0,vx:0,vy:0,fuel:100,time:90,target:0,done:false,score:0};wake=[];status.textContent='W/↑ gaz, S/↓ fren-geri, A/D veya ←/→ dümen. Akıntı oklarını kullan; sürekli gaz yakıtı yer.';last=performance.now();ui()}
function ui(){timeEl.textContent=Math.max(0,g.time).toFixed(1);fuelEl.textContent=Math.max(0,g.fuel).toFixed(0);stationEl.textContent=g.target+'/3';speedEl.textContent=Math.hypot(g.vx,g.vy).toFixed(0)}
function steer(dt){
 if(g.done)return;
 const steer=(keys.right?1:0)-(keys.left?1:0),throttle=(keys.up?1:0)-(keys.down?0.55:0);
 g.a+=steer*2.25*dt*(0.35+Math.min(1,Math.hypot(g.vx,g.vy)/55));
 if(throttle!==0&&g.fuel>0){
   const acc=throttle>0?105:-60;g.vx+=Math.cos(g.a)*acc*dt;g.vy+=Math.sin(g.a)*acc*dt;g.fuel=Math.max(0,g.fuel-(throttle>0?3.4:1.5)*dt);
 }
 const cur=current(g.x,g.y,(90-g.time));g.vx+=cur.x*.11*dt;g.vy+=cur.y*.11*dt;
 const drag=Math.pow(.987,dt*60);g.vx*=drag;g.vy*=drag;
 const sp=Math.hypot(g.vx,g.vy),max=175;if(sp>max){g.vx=g.vx/sp*max;g.vy=g.vy/sp*max}
 g.x+=g.vx*dt;g.y+=g.vy*dt;
 if(g.x<24){g.x=24;g.vx=Math.abs(g.vx)*.35;g.fuel=Math.max(0,g.fuel-3)}
 if(g.x>W-24){g.x=W-24;g.vx=-Math.abs(g.vx)*.35;g.fuel=Math.max(0,g.fuel-3)}
 if(g.y<24){g.y=24;g.vy=Math.abs(g.vy)*.35;g.fuel=Math.max(0,g.fuel-3)}
 if(g.y>H-24){g.y=H-24;g.vy=-Math.abs(g.vy)*.35;g.fuel=Math.max(0,g.fuel-3)}
 g.time-=dt;
 if(Math.hypot(g.vx,g.vy)>18&&Math.random()<dt*20)wake.push({x:g.x-Math.cos(g.a)*22,y:g.y-Math.sin(g.a)*22,life:1});
 if(g.target<3){
   const b=buoys[g.target];if(Math.hypot(g.x-b.x,g.y-b.y)<42){g.target++;status.textContent=g.target<3?'İstasyon '+g.target+' tarandı. Sıradaki turuncu şamandıraya git.':'Tüm istasyonlar tarandı. Şimdi üsse dön.'}
 }else if(Math.hypot(g.x-base.x,g.y-base.y)<55){
   g.done=true;g.score=Math.round(g.time*20+g.fuel*12);status.textContent='Sefer tamamlandı · skor '+g.score+'. Akıntıyı bedava motor gibi kullanmak gerçekten işe yarıyor.';
 }
 if(g.time<=0&&!g.done){g.done=true;status.textContent='Süre doldu. Rota tamamlanmadı; yeniden dene.'}
 ui();
}
function arrow(x,y,vx,vy){const sc=.7,ex=x+vx*sc,ey=y+vy*sc,a=Math.atan2(vy,vx);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(ex,ey);ctx.stroke();ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex-4*Math.cos(a-.55),ey-4*Math.sin(a-.55));ctx.moveTo(ex,ey);ctx.lineTo(ex-4*Math.cos(a+.55),ey-4*Math.sin(a+.55));ctx.stroke()}
function draw(){
 const grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,'#cceef4');grd.addColorStop(1,'#86cedd');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='rgba(255,255,255,.46)';ctx.lineWidth=1.4;
 const t=90-g.time;for(let y=55;y<H;y+=58)for(let x=55;x<W;x+=58){const c=current(x,y,t);arrow(x,y,c.x,c.y)}
 ctx.fillStyle='rgba(255,255,255,.38)';ctx.beginPath();ctx.arc(base.x,base.y,base.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#175d67';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#175d67';ctx.font='700 13px system-ui';ctx.textAlign='center';ctx.fillText(g.target===3?'ÜS · DÖN':'ÜS',base.x,base.y+5);
 buoys.forEach((b,i)=>{const active=i===g.target,done=i<g.target;ctx.fillStyle=done?'#8c9aa0':active?'#ff704e':'#edf4f4';ctx.beginPath();ctx.arc(b.x,b.y,20,0,Math.PI*2);ctx.fill();ctx.strokeStyle=active?'#fff':'rgba(23,62,68,.24)';ctx.lineWidth=active?6:2;ctx.stroke();ctx.fillStyle=done?'#fff':'#173b42';ctx.font='800 12px system-ui';ctx.fillText(String(i+1),b.x,b.y+4)});
 wake.forEach(w=>{ctx.globalAlpha=w.life*.35;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(w.x,w.y,7*(1-w.life)+2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1});
 wake.forEach(w=>w.life-=.025);wake=wake.filter(w=>w.life>0);
 ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.a);ctx.fillStyle='#1b2629';ctx.beginPath();ctx.moveTo(28,0);ctx.lineTo(-18,-14);ctx.lineTo(-10,0);ctx.lineTo(-18,14);ctx.closePath();ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-5,-5,11,10);ctx.restore();
 if(g.done){ctx.fillStyle='rgba(255,255,255,.72)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#172225';ctx.font='800 38px system-ui';ctx.fillText(g.time>0?'Sefer tamamlandı':'Süre doldu',W/2,H/2-12);ctx.font='500 17px system-ui';ctx.fillStyle='#506268';ctx.fillText(g.time>0?'Skor '+g.score:'Rotayı daha kısa tut ve akıntıya yaslan.',W/2,H/2+24)}
}
function loop(now){const dt=Math.min(.035,(now-last)/1000);last=now;steer(dt);draw();requestAnimationFrame(loop)}
addEventListener('keydown',e=>{const k={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[e.key];if(k){e.preventDefault();keys[k]=true}});
addEventListener('keyup',e=>{const k={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'}[e.key];if(k)keys[k]=false});
document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;const on=e=>{e.preventDefault();keys[k]=true};const off=e=>{e.preventDefault();keys[k]=false};b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off)});
E('restart').onclick=reset;reset();requestAnimationFrame(loop);