const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id),T=80,COLS=12,ROWS=8,dirs={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0],W:[0,0]};
const levels=[
 {start:[1,6],key:[2,2],file:[6,2],exit:[10,1],shadows:[[1,3],[5,6],[8,5]],walls:[[3,1],[3,2],[3,3],[7,4],[7,5],[7,6]],guards:[[[5,5],[6,5],[6,4],[5,4]],[[9,2],[9,3],[8,3],[8,2]]]},
 {start:[1,1],key:[2,6],file:[9,6],exit:[10,1],shadows:[[3,1],[5,5],[9,2]],walls:[[4,0],[4,1],[4,2],[4,4],[4,5],[4,6],[7,2],[7,3],[7,4],[7,5]],guards:[[[2,5],[3,5],[3,6],[2,6]],[[6,1],[7,1],[8,1],[8,2],[7,2],[6,2]]]},
 {start:[1,6],key:[1,1],file:[10,6],exit:[10,1],shadows:[[4,5],[7,1],[10,4]],walls:[[2,3],[3,3],[4,3],[6,3],[7,3],[8,3],[9,3]],guards:[[[5,1],[6,1],[6,2],[5,2]],[[3,5],[4,5],[5,5],[4,5]],[[8,6],[8,5],[9,5],[9,6]]]},
 {start:[6,6],key:[4,1],file:[1,1],exit:[10,1],shadows:[[2,6],[5,3],[9,5]],walls:[[3,2],[3,3],[3,4],[6,1],[6,2],[8,4],[8,5],[8,6]],guards:[[[1,5],[2,5],[2,4],[1,4]],[[5,4],[6,4],[7,4],[7,3],[6,3],[5,3]],[[9,2],[10,2],[10,3],[9,3]]]},
 {start:[1,4],key:[5,7],file:[10,4],exit:[6,1],shadows:[[2,7],[5,2],[7,6],[10,1]],walls:[[3,1],[3,2],[3,5],[3,6],[6,3],[6,4],[8,1],[8,2],[8,5],[8,6]],guards:[[[2,1],[2,2],[2,3],[1,3]],[[5,6],[6,6],[7,6],[7,5]],[[9,3],[10,3],[10,4],[9,4]],[[5,1],[6,1],[7,1],[6,1]]]}
];
let li=0,s;function L(){return levels[li]}function key(p){return p[0]+','+p[1]}function wall(x,y){return x<0||y<0||x>=COLS||y>=ROWS||L().walls.some(w=>w[0]===x&&w[1]===y)}function shadowAt(p){return L().shadows.some(x=>key(x)===key(p))}
function reset(){s={p:[...L().start],card:false,has:false,alarm:0,guards:L().guards.map(path=>({path,i:0})),won:false,blackout:2,darkTurns:0,lastDir:'R'};E('next').disabled=true;E('blackoutBtn').disabled=false;E('status').textContent='Mavi kart → sarı dosya → yeşil çıkış. Koyu kareler görüş mesafesini keser.';ui()}
function ui(){E('level').textContent=(li+1)+'/'+levels.length;E('keycard').textContent=s.card?'alındı':'yok';E('file').textContent=s.has?'alındı':s.card?'açık':'kilitli';E('alarm').textContent=s.alarm;E('blackout').textContent=s.blackout}
function guardPos(g){return g.path[g.i%g.path.length]}function guardDir(g){const a=g.path[g.i%g.path.length],b=g.path[(g.i+1)%g.path.length];return[Math.sign(b[0]-a[0]),Math.sign(b[1]-a[1])]}
function sees(g){
 const p=guardPos(g),d=guardDir(g),range=s.darkTurns>0?1:(shadowAt(s.p)?1:5),dx=s.p[0]-p[0],dy=s.p[1]-p[1];
 if(d[0]!==0){if(dy!==0||Math.sign(dx)!==d[0]||Math.abs(dx)>range)return false;for(let x=p[0]+d[0];x!==s.p[0];x+=d[0])if(wall(x,p[1]))return false;return true}
 if(d[1]!==0){if(dx!==0||Math.sign(dy)!==d[1]||Math.abs(dy)>range)return false;for(let y=p[1]+d[1];y!==s.p[1];y+=d[1])if(wall(p[0],y))return false;return true}
 return false
}
function act(a){
 if(s.won)return;const d=dirs[a],np=[s.p[0]+d[0],s.p[1]+d[1]];if(a!=='W')s.lastDir=a;if(!wall(...np))s.p=np;
 if(key(s.p)===key(L().key)&&!s.card){s.card=true;E('status').textContent='Erişim kartı alındı. Dosya kasası artık açılabilir.'}
 if(key(s.p)===key(L().file)&&!s.has){if(s.card){s.has=true;E('status').textContent='Dosya sende. Çıkışa ulaş.'}else E('status').textContent='Kasa kilitli. Önce mavi erişim kartını bul.'}
 s.guards.forEach(g=>g.i=(g.i+1)%g.path.length);
 if(s.guards.some(sees)){s.alarm++;E('status').textContent='Görüldün. İkinci alarm başlangıca yollar.';if(s.alarm>=2){s.alarm=0;s.p=[...L().start];E('status').textContent='Alarm tetiklendi. Başlangıca döndün; topladıkların sende kaldı.'}}
 if(s.darkTurns>0)s.darkTurns--;
 if(s.has&&key(s.p)===key(L().exit)){s.won=true;E('status').textContent=li===levels.length-1?'Tüm gece operasyonları tamamlandı.':'Bölüm tamamlandı.';E('next').disabled=li===levels.length-1}ui();draw()
}
function blackout(){if(s.blackout>0&&!s.won){s.blackout--;s.darkTurns=3;E('blackoutBtn').disabled=s.blackout===0;E('status').textContent='Koridor ışıkları üç tur kapalı. Görüş mesafesi bir kareye düştü.';ui();draw()}}
function draw(){
 ctx.fillStyle='#edece7';ctx.fillRect(0,0,C.width,C.height);ctx.strokeStyle='#d2d0c9';for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*T,0);ctx.lineTo(x*T,C.height);ctx.stroke()}for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*T);ctx.lineTo(C.width,y*T);ctx.stroke()}
 for(const [x,y] of L().shadows){ctx.fillStyle='#c8c7c4';ctx.fillRect(x*T+5,y*T+5,T-10,T-10)}
 for(const [x,y] of L().walls){ctx.fillStyle='#36363a';ctx.beginPath();ctx.roundRect(x*T+7,y*T+7,T-14,T-14,16);ctx.fill()}
 if(!s.card){const p=L().key;ctx.fillStyle='#5a91dd';ctx.beginPath();ctx.roundRect(p[0]*T+23,p[1]*T+28,34,24,6);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(p[0]*T+29,p[1]*T+33,10,4)}
 if(!s.has){const p=L().file;ctx.fillStyle=s.card?'#e6b84d':'#aaa';ctx.beginPath();ctx.roundRect(p[0]*T+23,p[1]*T+26,34,28,6);ctx.fill()}
 const ex=L().exit;ctx.strokeStyle=s.has?'#58bd83':'#aaa';ctx.lineWidth=5;ctx.strokeRect(ex[0]*T+17,ex[1]*T+17,46,46);
 s.guards.forEach(g=>{const p=guardPos(g),d=guardDir(g),range=s.darkTurns>0?1:5;ctx.strokeStyle=s.darkTurns>0?'rgba(219,71,71,.10)':'rgba(219,71,71,.24)';ctx.lineWidth=18;let x=p[0],y=p[1];ctx.beginPath();ctx.moveTo(x*T+40,y*T+40);for(let z=0;z<range;z++){if(wall(x+d[0],y+d[1]))break;x+=d[0];y+=d[1]}ctx.lineTo(x*T+40,y*T+40);ctx.stroke();ctx.fillStyle='#c64f4f';ctx.beginPath();ctx.arc(p[0]*T+40,p[1]*T+40,17,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p[0]*T+40,p[1]*T+40);ctx.lineTo(p[0]*T+40+d[0]*20,p[1]*T+40+d[1]*20);ctx.stroke()});
 ctx.fillStyle='#212126';ctx.beginPath();ctx.arc(s.p[0]*T+40,s.p[1]*T+40,19,0,Math.PI*2);ctx.fill();if(shadowAt(s.p)){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke()}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s.p[0]*T+34,s.p[1]*T+35,3,0,Math.PI*2);ctx.arc(s.p[0]*T+46,s.p[1]*T+35,3,0,Math.PI*2);ctx.fill();
 if(s.darkTurns>0){ctx.fillStyle='rgba(22,24,29,.24)';ctx.fillRect(0,0,C.width,C.height);ctx.fillStyle='#fff';ctx.font='800 15px system-ui';ctx.textAlign='center';ctx.fillText('KARARTMA · '+s.darkTurns+' tur',C.width/2,28)}
}
addEventListener('keydown',e=>{if(e.key==='q'||e.key==='Q'){blackout();return}const a={ArrowUp:'U',w:'U',W:'U',ArrowDown:'D',s:'D',S:'D',ArrowLeft:'L',a:'L',A:'L',ArrowRight:'R',d:'R',D:'R',' ':'W'}[e.key];if(a){e.preventDefault();act(a)}});
document.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act(b.dataset.act));E('blackoutBtn').onclick=blackout;E('restart').onclick=reset;E('next').onclick=()=>{if(s.won&&li<levels.length-1){li++;reset()}};reset();draw();