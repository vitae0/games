const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id);
const COLS=12,ROWS=8,T=80,dirs={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0],W:[0,0]};
const levels=[
 {start:[1,6],exit:[10,1],files:[[3,5],[8,2]],mines:[[2,3],[4,4],[6,6],[7,3],[9,5]],reveal:4.5},
 {start:[1,1],exit:[10,6],files:[[5,1],[3,6],[9,3]],mines:[[2,4],[4,2],[4,5],[6,3],[7,6],[8,1],[9,5]],reveal:4.2},
 {start:[6,6],exit:[6,1],files:[[1,2],[10,2],[2,6]],mines:[[3,1],[4,3],[5,5],[7,4],[8,2],[9,6],[2,4],[10,5]],reveal:3.8},
 {start:[1,4],exit:[10,4],files:[[2,1],[6,6],[9,1]],mines:[[2,3],[3,5],[4,1],[5,4],[6,2],[7,5],[8,3],[9,6],[10,2]],reveal:3.5},
 {start:[6,6],exit:[6,1],files:[[1,1],[10,1],[1,6],[10,6]],mines:[[2,2],[2,5],[3,3],[4,6],[5,2],[5,5],[7,3],[8,1],[8,5],[9,3],[10,4]],reveal:3.2}
];
let li=0,s,last=performance.now();
function k(p){return p[0]+','+p[1]} function L(){return levels[li]}
function reset(){const l=L();s={p:[...l.start],files:new Set(l.files.map(k)),found:0,lives:3,reveal:l.reveal,scan:1,scanTime:0,knownMines:new Set(),won:false,dead:false};E('next').disabled=true;E('scanBtn').disabled=false;status('Harita açık. Konumları ezberle.');ui()}
function status(t){E('status').textContent=t}
function ui(){E('level').textContent=(li+1)+'/'+levels.length;E('files').textContent=s.found+'/'+L().files.length;E('lives').textContent=s.lives;E('scan').textContent=s.scan}
function visible(){return s.reveal>0||s.scanTime>0||s.won}
function act(a){if(s.won||s.dead||s.reveal>0)return;const d=dirs[a],np=[s.p[0]+d[0],s.p[1]+d[1]];if(np[0]<0||np[0]>=COLS||np[1]<0||np[1]>=ROWS)return;s.p=np;const key=k(np);
 if(L().mines.some(m=>k(m)===key)){s.lives--;s.knownMines.add(key);s.p=[...L().start];status('Mayın. Konumu artık işaretli; başlangıca döndün.');if(s.lives<=0){s.dead=true;status('Üç hata. Dalış bitti.')}ui();return}
 if(s.files.delete(key)){s.found++;status('Arşiv alındı. '+(L().files.length-s.found)+' kaldı.')}
 if(s.found===L().files.length&&key===k(L().exit)){s.won=true;status(li===levels.length-1?'Tüm arşiv katları temizlendi.':'Kat tamamlandı.');E('next').disabled=li===levels.length-1}ui()}
function draw(){
 ctx.fillStyle='#15171c';ctx.fillRect(0,0,C.width,C.height);ctx.strokeStyle='rgba(255,255,255,.08)';for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*T,0);ctx.lineTo(x*T,C.height);ctx.stroke()}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*T);ctx.lineTo(C.width,y*T);ctx.stroke()}
 const vis=visible();if(vis){for(const m of L().mines){ctx.fillStyle='#e46666';ctx.beginPath();ctx.arc(m[0]*T+40,m[1]*T+40,11,0,Math.PI*2);ctx.fill()}}else{for(const key of s.knownMines){const [x,y]=key.split(',').map(Number);ctx.strokeStyle='#e46666';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x*T+27,y*T+27);ctx.lineTo(x*T+53,y*T+53);ctx.moveTo(x*T+53,y*T+27);ctx.lineTo(x*T+27,y*T+53);ctx.stroke()}}
 for(const f of L().files){const key=k(f),left=s.files.has(key);if(left&&vis){ctx.fillStyle='#f0c35a';ctx.beginPath();ctx.roundRect(f[0]*T+22,f[1]*T+25,36,30,7);ctx.fill();ctx.fillStyle='#5d4815';ctx.fillRect(f[0]*T+29,f[1]*T+19,22,8)}}
 const ex=L().exit;ctx.strokeStyle=s.found===L().files.length?'#61d094':'#6a6d74';ctx.lineWidth=5;ctx.strokeRect(ex[0]*T+18,ex[1]*T+18,44,44);
 ctx.fillStyle='#f2f4f8';ctx.beginPath();ctx.arc(s.p[0]*T+40,s.p[1]*T+40,19,0,Math.PI*2);ctx.fill();ctx.fillStyle='#202228';ctx.beginPath();ctx.arc(s.p[0]*T+34,s.p[1]*T+35,3,0,Math.PI*2);ctx.arc(s.p[0]*T+46,s.p[1]*T+35,3,0,Math.PI*2);ctx.fill();
 if(s.reveal>0){ctx.fillStyle='rgba(255,255,255,.8)';ctx.font='800 28px system-ui';ctx.textAlign='center';ctx.fillText('EZBERLE · '+s.reveal.toFixed(1)+' s',C.width/2,42)}
 if(s.dead){ctx.fillStyle='rgba(20,20,24,.72)';ctx.fillRect(0,0,C.width,C.height);ctx.fillStyle='#fff';ctx.font='800 36px system-ui';ctx.textAlign='center';ctx.fillText('Dalış bitti',C.width/2,C.height/2)}
}
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(s.reveal>0)s.reveal=Math.max(0,s.reveal-dt);if(s.scanTime>0)s.scanTime=Math.max(0,s.scanTime-dt);draw();requestAnimationFrame(loop)}
addEventListener('keydown',e=>{const a={ArrowUp:'U',w:'U',W:'U',ArrowDown:'D',s:'D',S:'D',ArrowLeft:'L',a:'L',A:'L',ArrowRight:'R',d:'R',D:'R',' ':'W'}[e.key];if(a){e.preventDefault();act(a)}});
document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act(b.dataset.act));
E('scanBtn').onclick=()=>{if(s.scan&&s.reveal<=0&&!s.dead){s.scan=0;s.scanTime=1;E('scanBtn').disabled=true;status('Bir saniyelik tarama kullanıldı.');ui()}};
E('restart').onclick=reset;E('next').onclick=()=>{if(s.won&&li<levels.length-1){li++;reset()}};reset();requestAnimationFrame(loop);