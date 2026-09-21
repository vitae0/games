const C=document.getElementById('game'),ctx=C.getContext('2d');
const E=id=>document.getElementById(id),status=E('status'),next=E('next');
const TILE=80,COLS=12,ROWS=8,LOOP=9;
const levels=[
 {name:'İlk yankı',start:[2,6],exit:[8,6],walls:[[4,3],[5,3],[6,3]],gems:[[2,2],[6,2],[9,4]]},
 {name:'Dar geçit',start:[1,4],exit:[6,4],walls:[[4,1],[4,2],[4,3],[4,5],[4,6],[7,2],[7,3],[7,4],[7,5]],gems:[[3,1],[5,6],[6,2]]},
 {name:'Çapraz zaman',start:[6,6],exit:[6,1],walls:[[3,3],[4,3],[7,3],[8,3],[3,4],[8,4]],gems:[[2,5],[9,5],[6,2]]},
 {name:'Ayna koridoru',start:[2,6],exit:[8,3],walls:[[5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,7]],gems:[[7,6],[8,3]],gates:[{plate:[1,6],gate:[5,6]}]},
 {name:'Saat odası',start:[6,6],exit:[6,1],walls:[[0,3],[1,3],[2,3],[3,3],[4,3],[5,3],[7,3],[8,3],[9,3],[10,3],[11,3]],gems:[[3,1],[9,1]],gates:[{plate:[6,7],gate:[6,3]}]},
 {name:'Son yankı',start:[5,6],exit:[10,2],walls:[[0,4],[1,4],[2,4],[3,4],[4,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[8,0],[8,1],[8,3]],gems:[[9,2],[10,2]],gates:[{plate:[4,6],gate:[5,4]},{plate:[6,2],gate:[8,2]}]}
];
let li=0,state,particles=[];
const dirs={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0],W:[0,0]};
function key(p){return p[0]+','+p[1]}
function staticBlocked(x,y){return x<0||y<0||x>=COLS||y>=ROWS||levels[li].walls.some(w=>w[0]===x&&w[1]===y)}
function movedStatic(pos,a){const d=dirs[a],nx=pos[0]+d[0],ny=pos[1]+d[1];return staticBlocked(nx,ny)?[...pos]:[nx,ny]}
function replay(loop,step){let p=[...levels[li].start];for(let i=0;i<=step&&i<loop.length;i++)p=movedStatic(p,loop[i]);return p}
function gateOpen(g,step){return state.loops.some(loop=>{const p=replay(loop,step);return p[0]===g.plate[0]&&p[1]===g.plate[1]})}
function currentBlocked(x,y,step){if(staticBlocked(x,y))return true;const gates=levels[li].gates||[];const g=gates.find(q=>q.gate[0]===x&&q.gate[1]===y);return g?!gateOpen(g,step):false}
function movedPlayer(pos,a,step){const d=dirs[a],nx=pos[0]+d[0],ny=pos[1]+d[1];return currentBlocked(nx,ny,step)?[...pos]:[nx,ny]}
function init(){const L=levels[li];state={p:[...L.start],loops:[],cur:[],gems:new Set(L.gems.map(key)),paradox:0,won:false};particles=[];message(L.gates?.length?'Mavi plakaları geçmiş echo’larınla aynı anda basılı tutarak pembe zaman kapılarını aç.':'Kristalleri topla, sonra yeşil kapıya ulaş. Echo çarpışmaları sadece seni o hamlede durdurur.');ui();draw()}
function message(t){status.textContent=t}
function act(a){
 if(state.won)return;
 const before=[...state.p],step=state.cur.length,candidate=movedPlayer(state.p,a,step);
 const ghosts=state.loops.map(loop=>replay(loop,step));
 const collision=ghosts.some(g=>g[0]===candidate[0]&&g[1]===candidate[1]);
 state.cur.push(a);
 if(collision){
   state.p=before;state.paradox++;
   message('Paradox! Echo o kareyi tuttu. Hareketin boşa gitti, ama ilerlemen silinmedi.');
 }else{
   state.p=candidate;
   const k=key(state.p);
   if(state.gems.delete(k)){burst(state.p[0]*TILE+TILE/2,state.p[1]*TILE+TILE/2);message('Kristal sabitlendi. Döngü sıfırlansa bile sende kalacak.')}
 }
 const ex=levels[li].exit;
 if(!state.gems.size&&state.p[0]===ex[0]&&state.p[1]===ex[1]){
   state.won=true;message(li===levels.length-1?'Tüm bölümler tamamlandı. Zaman çizgisi şaşırtıcı biçimde hâlâ ayakta.':'Bölüm tamamlandı.');next.disabled=li===levels.length-1;ui();draw();return;
 }
 if(state.cur.length>=LOOP){
   state.loops.push([...state.cur]);state.cur=[];state.p=[...levels[li].start];
   message('Yeni döngü. Önceki '+state.loops.length+' rota artık sahada tekrar ediyor.');
 }
 ui();draw();
}
function ui(){
 E('levelN').textContent=(li+1)+'/'+levels.length;
 E('loopN').textContent=state.loops.length+1;
 E('stepN').textContent=state.cur.length+'/'+LOOP;
 E('gemN').textContent=state.gems.size;
 next.disabled=!state.won||li===levels.length-1;
}
function burst(x,y){for(let i=0;i<18;i++)particles.push({x,y,vx:(Math.random()-.5)*8,vy:(Math.random()-.5)*8,life:26+Math.random()*10})}
function roundRect(x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
function drawGrid(){
 ctx.fillStyle='#f7f4ee';ctx.fillRect(0,0,C.width,C.height);
 ctx.strokeStyle='rgba(77,66,58,.08)';ctx.lineWidth=1;
 for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*TILE,0);ctx.lineTo(x*TILE,C.height);ctx.stroke()}
 for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*TILE);ctx.lineTo(C.width,y*TILE);ctx.stroke()}
 for(const [x,y] of levels[li].walls)roundRect(x*TILE+8,y*TILE+8,TILE-16,TILE-16,18,'#302c34');
 const gates=levels[li].gates||[],step=Math.max(0,state.cur.length-1);gates.forEach((g,i)=>{const open=gateOpen(g,step),p=g.plate,q=g.gate;ctx.fillStyle='#70cde0';ctx.beginPath();ctx.roundRect(p[0]*TILE+18,p[1]*TILE+18,TILE-36,TILE-36,10);ctx.fill();ctx.fillStyle='#245f6a';ctx.font='800 11px system-ui';ctx.textAlign='center';ctx.fillText(String(i+1),p[0]*TILE+40,p[1]*TILE+44);ctx.fillStyle=open?'rgba(211,94,178,.18)':'#d35eb2';ctx.beginPath();ctx.roundRect(q[0]*TILE+8,q[1]*TILE+8,TILE-16,TILE-16,15);ctx.fill();ctx.strokeStyle='#8d3377';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle=open?'#8d3377':'#fff';ctx.fillText(open?'açık':String(i+1),q[0]*TILE+40,q[1]*TILE+44)})
}
function draw(){
 drawGrid();
 const L=levels[li],ex=L.exit;
 roundRect(ex[0]*TILE+13,ex[1]*TILE+13,TILE-26,TILE-26,17,state.gems.size?'#c8c7c0':'#78d49b');
 ctx.fillStyle=state.gems.size?'#77756f':'#165b35';ctx.font='700 12px system-ui';ctx.textAlign='center';ctx.fillText(state.gems.size?'kilitli':'çıkış',ex[0]*TILE+40,ex[1]*TILE+45);
 for(const k of state.gems){const [x,y]=k.split(',').map(Number);ctx.save();ctx.translate(x*TILE+40,y*TILE+40);ctx.rotate(Math.PI/4);roundRect(-15,-15,30,30,7,'#fff');ctx.strokeStyle='#8d74e8';ctx.lineWidth=5;ctx.strokeRect(-11,-11,22,22);ctx.restore()}
 const step=Math.max(0,state.cur.length-1);
 state.loops.forEach((loop,i)=>{const g=replay(loop,step);ctx.strokeStyle='rgba(121,89,215,'+(0.26+Math.min(.45,i*.08))+')';ctx.lineWidth=7;ctx.beginPath();ctx.arc(g[0]*TILE+40,g[1]*TILE+40,20,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(121,89,215,.1)';ctx.fill()});
 ctx.fillStyle='#1d1b1f';ctx.beginPath();ctx.arc(state.p[0]*TILE+40,state.p[1]*TILE+40,22,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(state.p[0]*TILE+33,state.p[1]*TILE+35,3,0,Math.PI*2);ctx.arc(state.p[0]*TILE+47,state.p[1]*TILE+35,3,0,Math.PI*2);ctx.fill();
 ctx.textAlign='left';ctx.font='700 14px system-ui';ctx.fillStyle='rgba(38,34,31,.55)';ctx.fillText(levels[li].name,18,26);
}
function animate(){if(particles.length){draw();for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=.16;p.life--;ctx.globalAlpha=Math.max(0,p.life/35);ctx.fillStyle='#8d74e8';ctx.fillRect(p.x,p.y,6,6);ctx.globalAlpha=1}particles=particles.filter(p=>p.life>0)}requestAnimationFrame(animate)}
addEventListener('keydown',e=>{const a={ArrowUp:'U',w:'U',W:'U',ArrowDown:'D',s:'D',S:'D',ArrowLeft:'L',a:'L',A:'L',ArrowRight:'R',d:'R',D:'R',' ':'W'}[e.key];if(a){e.preventDefault();act(a)}});
document.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.act)));
E('restart').onclick=init;
E('undo').onclick=()=>{if(state.loops.length){state.loops.pop();state.cur=[];state.p=[...levels[li].start];message('Son echo silindi. Zaman çizgisi biraz daha az kalabalık.');ui();draw()}};
next.onclick=()=>{if(state.won&&li<levels.length-1){li++;init()}};
init();animate();