const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id);
const COLS=12,ROWS=8,T=80,dirs={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0],W:[0,0]};
const levels=[
 {start:[1,6],exit:[10,1],files:[[3,5],[8,2]],relics:[[10,6]],mines:[[2,3],[4,4],[6,6],[7,3],[9,5]],hunter:[[5,1],[6,1],[7,1],[8,1],[8,2],[8,3],[7,3],[6,3],[5,3],[5,2]],reveal:4.5,oxygen:31},
 {start:[1,1],exit:[10,6],files:[[5,1],[3,6],[9,3]],relics:[[10,1]],mines:[[2,4],[4,2],[4,5],[6,3],[7,6],[8,1],[9,5]],hunter:[[5,6],[6,6],[6,5],[6,4],[7,4],[8,4],[8,3],[7,3],[6,3],[5,3],[5,4],[5,5]],reveal:4.2,oxygen:36},
 {start:[6,6],exit:[6,1],files:[[1,2],[10,2],[2,6]],relics:[[10,6],[1,1]],mines:[[3,1],[4,3],[5,5],[7,4],[8,2],[9,6],[2,4],[10,5]],hunter:[[4,1],[5,1],[6,1],[7,1],[8,1],[8,2],[8,3],[7,3],[6,3],[5,3],[4,3],[4,2]],reveal:3.8,oxygen:39},
 {start:[1,4],exit:[10,4],files:[[2,1],[6,6],[9,1]],relics:[[5,2],[10,7]],mines:[[2,3],[3,5],[4,1],[5,4],[6,2],[7,5],[8,3],[9,6],[10,2]],hunter:[[3,7],[4,7],[5,7],[6,7],[7,7],[8,7],[8,6],[7,6],[6,6],[5,6],[4,6],[3,6]],reveal:3.5,oxygen:42},
 {start:[6,6],exit:[6,1],files:[[1,1],[10,1],[1,6],[10,6]],relics:[[6,3],[3,4]],mines:[[2,2],[2,5],[3,3],[4,6],[5,2],[5,5],[7,3],[8,1],[8,5],[9,3],[10,4]],hunter:[[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[9,4],[8,4],[7,4],[6,4],[5,4],[4,4],[3,4],[2,4]],reveal:3.2,oxygen:46}
];
let li=0,s,last=performance.now();
function k(p){return p[0]+','+p[1]} function L(){return levels[li]}
function reset(){const l=L();s={p:[...l.start],files:new Set(l.files.map(k)),relics:new Set(l.relics.map(k)),found:0,bonus:0,lives:3,oxygen:l.oxygen,reveal:l.reveal,scan:2,scanTime:0,knownMines:new Set(),hunterI:0,won:false,dead:false};E('next').disabled=true;E('scanBtn').disabled=false;status('Harita açık. Mayınları, arşivleri ve devriye rotasını ezberle.');ui()}
function status(t){E('status').textContent=t}
function ui(){E('level').textContent=(li+1)+'/'+levels.length;E('files').textContent=s.found+'/'+L().files.length;E('lives').textContent=s.lives;E('scan').textContent=s.scan;E('oxygen').textContent=Math.max(0,s.oxygen);E('bonus').textContent=s.bonus}
function visible(){return s.reveal>0||s.scanTime>0||s.won}
function hunter(){return L().hunter[s.hunterI%L().hunter.length]}
function damage(msg){s.lives--;s.p=[...L().start];status(msg+' Başlangıca döndün.');if(s.lives<=0){s.dead=true;status('Dalış bitti. Üç kez yakalandın.')}ui()}
function advanceHunter(){s.hunterI=(s.hunterI+1)%L().hunter.length;if(k(hunter())===k(s.p))damage('Devriye seni yakaladı.')}
function act(a){
 if(s.won||s.dead||s.reveal>0)return;
 s.oxygen--;if(s.oxygen<0){s.dead=true;status('Oksijen bitti.');ui();return}
 const d=dirs[a],np=[s.p[0]+d[0],s.p[1]+d[1]];if(np[0]>=0&&np[0]<COLS&&np[1]>=0&&np[1]<ROWS)s.p=np;const key=k(s.p);
 if(L().mines.some(m=>k(m)===key)){s.knownMines.add(key);damage('Mayına bastın.');advanceHunter();return}
 if(s.files.delete(key)){s.found++;status('Arşiv alındı. '+(L().files.length-s.found)+' zorunlu kayıt kaldı.')}
 if(s.relics.delete(key)){s.bonus+=250;status('Opsiyonel veri kasası: +250. Güzel, şimdi oksijen hesabını yeniden yap.')}
 advanceHunter();
 if(s.dead)return;
 const hp=hunter(),dist=Math.abs(hp[0]-s.p[0])+Math.abs(hp[1]-s.p[1]);if(dist<=2&&!visible())status('Yakında güçlü parazit var. Devriye iki kare içinde.');
 if(s.found===L().files.length&&key===k(L().exit)){s.won=true;status(li===levels.length-1?'Tüm arşiv katları temizlendi · bonus '+s.bonus+'.':'Kat tamamlandı · bonus '+s.bonus+'.');E('next').disabled=li===levels.length-1}ui()
}
function draw(){
 ctx.fillStyle='#15171c';ctx.fillRect(0,0,C.width,C.height);ctx.strokeStyle='rgba(255,255,255,.08)';for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*T,0);ctx.lineTo(x*T,C.height);ctx.stroke()}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*T);ctx.lineTo(C.width,y*T);ctx.stroke()}
 const vis=visible();
 if(vis){for(const m of L().mines){ctx.fillStyle='#e46666';ctx.beginPath();ctx.arc(m[0]*T+40,m[1]*T+40,11,0,Math.PI*2);ctx.fill()}}else{for(const key of s.knownMines){const [x,y]=key.split(',').map(Number);ctx.strokeStyle='#e46666';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x*T+27,y*T+27);ctx.lineTo(x*T+53,y*T+53);ctx.moveTo(x*T+53,y*T+27);ctx.lineTo(x*T+27,y*T+53);ctx.stroke()}}
 if(vis){for(const f of L().files){if(s.files.has(k(f))){ctx.fillStyle='#f0c35a';ctx.beginPath();ctx.roundRect(f[0]*T+22,f[1]*T+25,36,30,7);ctx.fill();ctx.fillStyle='#5d4815';ctx.fillRect(f[0]*T+29,f[1]*T+19,22,8)}}for(const r of L().relics){if(s.relics.has(k(r))){ctx.fillStyle='#66bde8';ctx.beginPath();ctx.roundRect(r[0]*T+25,r[1]*T+25,30,30,8);ctx.fill()}}const h=hunter();ctx.fillStyle='#d64f62';ctx.beginPath();ctx.arc(h[0]*T+40,h[1]*T+40,18,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(214,79,98,.22)';ctx.lineWidth=8;ctx.beginPath();ctx.arc(h[0]*T+40,h[1]*T+40,31,0,Math.PI*2);ctx.stroke()}
 const ex=L().exit;ctx.strokeStyle=s.found===L().files.length?'#61d094':'#6a6d74';ctx.lineWidth=5;ctx.strokeRect(ex[0]*T+18,ex[1]*T+18,44,44);
 ctx.fillStyle='#f2f4f8';ctx.beginPath();ctx.arc(s.p[0]*T+40,s.p[1]*T+40,19,0,Math.PI*2);ctx.fill();ctx.fillStyle='#202228';ctx.beginPath();ctx.arc(s.p[0]*T+34,s.p[1]*T+35,3,0,Math.PI*2);ctx.arc(s.p[0]*T+46,s.p[1]*T+35,3,0,Math.PI*2);ctx.fill();
 if(s.reveal>0){ctx.fillStyle='rgba(255,255,255,.8)';ctx.font='800 28px system-ui';ctx.textAlign='center';ctx.fillText('EZBERLE · '+s.reveal.toFixed(1)+' s',C.width/2,42)}
 if(s.dead){ctx.fillStyle='rgba(20,20,24,.72)';ctx.fillRect(0,0,C.width,C.height);ctx.fillStyle='#fff';ctx.font='800 36px system-ui';ctx.textAlign='center';ctx.fillText('Dalış bitti',C.width/2,C.height/2)}
}
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(s.reveal>0)s.reveal=Math.max(0,s.reveal-dt);if(s.scanTime>0)s.scanTime=Math.max(0,s.scanTime-dt);draw();requestAnimationFrame(loop)}
addEventListener('keydown',e=>{const a={ArrowUp:'U',w:'U',W:'U',ArrowDown:'D',s:'D',S:'D',ArrowLeft:'L',a:'L',A:'L',ArrowRight:'R',d:'R',D:'R',' ':'W'}[e.key];if(a){e.preventDefault();act(a)}});
document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act(b.dataset.act));
E('scanBtn').onclick=()=>{if(s.scan&&s.reveal<=0&&!s.dead&&s.oxygen>=3){s.scan--;s.oxygen-=3;s.scanTime=1.2;E('scanBtn').disabled=s.scan===0;status('Aktif tarama: mayınlar, hedefler ve devriye 1.2 saniye görünür.');ui()}};
E('restart').onclick=reset;E('next').onclick=()=>{if(s.won&&li<levels.length-1){li++;reset()}};reset();requestAnimationFrame(loop);