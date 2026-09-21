const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id);
const levelEl=E('level'),doneEl=E('done'),missEl=E('miss'),status=E('status'),nextBtn=E('next');
const colors=['#ef5d5d','#f0b94e','#5b8def','#5cc58a'];
const levels=[
 {name:'Dört terminal',speed:115,seq:[0,1,2,3,1,0],map:[0,1,2,3]},
 {name:'Ters sıra',speed:135,seq:[3,0,2,1,3,2,0],map:[2,0,3,1]},
 {name:'Yoğun saat',speed:155,seq:[1,3,0,2,1,2,3,0],map:[1,3,0,2]},
 {name:'Gece vardiyası',speed:175,seq:[2,2,0,3,1,0,3,1,2],map:[3,2,1,0]},
 {name:'Son sevkiyat',speed:195,seq:[3,1,0,2,3,0,1,2,0,3],map:[2,3,1,0]}
];
const nodes={S:[80,320],A:[300,320],B:[560,190],C:[560,450],D0:[865,90],D1:[865,245],D2:[865,395],D3:[865,550]};
let li=0,state,last=performance.now();
function L(){return levels[li]}
function reset(){state={sw:[0,0,0],i:0,done:0,miss:0,train:null,wait:.8,ended:false};nextBtn.disabled=true;status.textContent='Makaslara tıkla veya 1/2/3 kullan. Renk terminali belirler.';ui()}
function ui(){levelEl.textContent=(li+1)+'/'+levels.length;doneEl.textContent=state.done+'/'+L().seq.length;missEl.textContent=state.miss}
function routeFor(color){const depot=L().map.indexOf(color);return depot}
function spawn(){if(state.i>=L().seq.length){state.ended=true;if(state.miss<=2){status.textContent='Vardiya tamamlandı.';nextBtn.disabled=li===levels.length-1}else status.textContent='Çok fazla yanlış teslimat. Yeniden dene.';return}state.train={color:L().seq[state.i++],seg:0,t:0,path:['S','A'],target:null}}
function chooseNext(tr){
 const here=tr.path[tr.path.length-1];
 if(here==='A')tr.path.push(state.sw[0]===0?'B':'C');
 else if(here==='B')tr.path.push(state.sw[1]===0?'D0':'D1');
 else if(here==='C')tr.path.push(state.sw[2]===0?'D2':'D3');
}
function step(dt){
 if(state.ended)return;
 if(!state.train){state.wait-=dt;if(state.wait<=0)spawn();return}
 const tr=state.train,a=nodes[tr.path[tr.seg]],b=nodes[tr.path[tr.seg+1]],dist=Math.hypot(b[0]-a[0],b[1]-a[1]);tr.t+=L().speed*dt/dist;
 if(tr.t>=1){tr.seg++;tr.t=0;const at=tr.path[tr.seg];if(at[0]==='D'){const depot=+at.slice(1),wanted=routeFor(tr.color);if(depot===wanted){state.done++;status.textContent='Doğru terminal.'}else{state.miss++;status.textContent='Yanlış terminal. Bu tren kaybedildi.'}state.train=null;state.wait=.65;if(state.miss>2){state.ended=true;status.textContent='Üç yanlış teslimat. Vardiya kapandı.'}ui();return}chooseNext(tr)}
}
function track(a,b){ctx.beginPath();ctx.moveTo(...nodes[a]);ctx.lineTo(...nodes[b]);ctx.stroke()}
function drawSwitch(key,index){
 const [x,y]=nodes[key];ctx.fillStyle='#fff';ctx.strokeStyle='#2e3035';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,20,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#222';ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.fillText(String(index+1),x,y+5)
}
function draw(){
 ctx.fillStyle='#f3efe5';ctx.fillRect(0,0,C.width,C.height);ctx.strokeStyle='#77746d';ctx.lineWidth=9;ctx.lineCap='round';
 track('S','A');track('A','B');track('A','C');track('B','D0');track('B','D1');track('C','D2');track('C','D3');
 ctx.strokeStyle='#d5d0c4';ctx.lineWidth=3;for(const [a,b] of [['S','A'],['A','B'],['A','C'],['B','D0'],['B','D1'],['C','D2'],['C','D3']])track(a,b);
 drawSwitch('A',0);drawSwitch('B',1);drawSwitch('C',2);
 ['D0','D1','D2','D3'].forEach((d,i)=>{const [x,y]=nodes[d],color=colors[L().map[i]];ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-48,y-28,96,56,16);ctx.fill();ctx.fillStyle='#fff';ctx.font='800 12px system-ui';ctx.fillText('TERMİNAL',x,y+4)});
 ctx.fillStyle='#35383e';ctx.beginPath();ctx.roundRect(nodes.S[0]-36,nodes.S[1]-28,72,56,14);ctx.fill();ctx.fillStyle='#fff';ctx.fillText('GİRİŞ',nodes.S[0],nodes.S[1]+4);
 const labels=[state.sw[0]===0?'↑':'↓',state.sw[1]===0?'↑':'→',state.sw[2]===0?'→':'↓'];[['A',0],['B',1],['C',2]].forEach(([n,i])=>{const [x,y]=nodes[n];ctx.fillStyle='#222';ctx.font='700 18px system-ui';ctx.fillText(labels[i],x,y-32)});
 if(state.train){const tr=state.train,a=nodes[tr.path[tr.seg]],b=nodes[tr.path[tr.seg+1]],x=a[0]+(b[0]-a[0])*tr.t,y=a[1]+(b[1]-a[1])*tr.t;ctx.save();ctx.translate(x,y);ctx.fillStyle=colors[tr.color];ctx.beginPath();ctx.roundRect(-24,-15,48,30,9);ctx.fill();ctx.fillStyle='#20242a';ctx.fillRect(-16,11,8,8);ctx.fillRect(8,11,8,8);ctx.restore()}
 ctx.textAlign='left';ctx.fillStyle='rgba(40,38,34,.6)';ctx.font='700 14px system-ui';ctx.fillText(L().name+' · '+L().speed+' hız',18,26)
}
function toggle(i){if(state.ended)return;state.sw[i]=1-state.sw[i]}
C.addEventListener('click',e=>{const r=C.getBoundingClientRect(),x=(e.clientX-r.left)*C.width/r.width,y=(e.clientY-r.top)*C.height/r.height;[['A',0],['B',1],['C',2]].forEach(([n,i])=>{const p=nodes[n];if(Math.hypot(x-p[0],y-p[1])<38)toggle(i)})});
addEventListener('keydown',e=>{if(['1','2','3'].includes(e.key))toggle(+e.key-1)});
E('restart').onclick=reset;nextBtn.onclick=()=>{if(state.ended&&state.miss<=2&&li<levels.length-1){li++;reset()}};
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;step(dt);draw();requestAnimationFrame(loop)}reset();requestAnimationFrame(loop);