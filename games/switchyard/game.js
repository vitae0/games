const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id);
const levelEl=E('level'),doneEl=E('done'),missEl=E('miss'),comboEl=E('combo'),scoreEl=E('score'),status=E('status'),nextBtn=E('next'),brakeBtn=E('brake');
const colors=['#ef5d5d','#f0b94e','#5b8def','#5cc58a'];
const levels=[
 {name:'Dört terminal',speed:112,spawn:2.4,seq:[0,1,2,3,1,0,3,2],map:[0,1,2,3]},
 {name:'Çapraz vardiya',speed:128,spawn:2.0,seq:[3,0,2,1,3,2,0,1,2],map:[2,0,3,1]},
 {name:'Yoğun saat',speed:143,spawn:1.65,seq:[1,3,0,2,1,2,3,0,3,1],map:[1,3,0,2]},
 {name:'Gece ekspresi',speed:158,spawn:1.43,seq:[2,2,0,3,1,0,3,1,2,0,1],map:[3,2,1,0]},
 {name:'Merkez kilidi',speed:174,spawn:1.24,seq:[3,1,0,2,3,0,1,2,0,3,2,1],map:[2,3,1,0]}
];
const nodes={S:[70,320],A:[300,320],B:[555,175],C:[555,465],D0:[875,78],D1:[875,235],D2:[875,405],D3:[875,562]};
let li=0,state,last=performance.now();
function L(){return levels[li]}
function reset(){state={sw:[0,0,0],i:0,done:0,miss:0,combo:0,score:0,trains:[],spawnTimer:.5,ended:false,won:false,brake:1,slow:0};nextBtn.disabled=true;brakeBtn.disabled=false;status.textContent='Trenler üst üste binebilir. Makası tren düğüme varmadan ayarla; bir kez acil yavaşlatma hakkın var.';ui()}
function ui(){levelEl.textContent=(li+1)+'/'+levels.length;doneEl.textContent=state.done+'/'+L().seq.length;missEl.textContent=state.miss;comboEl.textContent=state.combo;scoreEl.textContent=state.score}
function routeFor(color){return L().map.indexOf(color)}
function spawn(){if(state.i>=L().seq.length)return;state.trains.push({id:state.i,color:L().seq[state.i++],seg:0,t:0,path:['S','A'],flash:0});state.spawnTimer=L().spawn}
function chooseNext(tr){const here=tr.path[tr.path.length-1];if(here==='A')tr.path.push(state.sw[0]===0?'B':'C');else if(here==='B')tr.path.push(state.sw[1]===0?'D0':'D1');else if(here==='C')tr.path.push(state.sw[2]===0?'D2':'D3')}
function pos(tr){const a=nodes[tr.path[tr.seg]],b=nodes[tr.path[tr.seg+1]];if(!b)return a;return[a[0]+(b[0]-a[0])*tr.t,a[1]+(b[1]-a[1])*tr.t]}
function deliver(tr,at){const depot=+at.slice(1),wanted=routeFor(tr.color);if(depot===wanted){state.done++;state.combo++;const gain=100+state.combo*35;state.score+=gain;status.textContent='Doğru teslimat · +'+gain+' · combo ×'+state.combo}else{state.miss++;state.combo=0;state.score=Math.max(0,state.score-80);status.textContent='Yanlış terminal. Combo sıfırlandı.'}ui()}
function finishCheck(){if(state.i>=L().seq.length&&state.trains.length===0&&!state.ended){state.ended=true;state.won=state.miss<=3;if(state.won){state.score+=Math.max(0,4-state.miss)*250;status.textContent='Vardiya tamamlandı · '+state.score+' puan';nextBtn.disabled=li===levels.length-1}else status.textContent='Dört yanlış teslimat. Vardiya kapandı.'}}
function step(dt){
 if(state.ended)return;
 if(state.slow>0)state.slow=Math.max(0,state.slow-dt);
 state.spawnTimer-=dt;if(state.spawnTimer<=0&&state.i<L().seq.length)spawn();
 const factor=state.slow>0?.46:1;
 const remove=[];
 for(const tr of state.trains){
   const a=nodes[tr.path[tr.seg]],b=nodes[tr.path[tr.seg+1]],dist=Math.hypot(b[0]-a[0],b[1]-a[1]);tr.t+=L().speed*factor*dt/dist;
   while(tr.t>=1){tr.t-=1;tr.seg++;const at=tr.path[tr.seg];if(at&&at[0]==='D'){deliver(tr,at);remove.push(tr.id);break}chooseNext(tr)}
 }
 state.trains=state.trains.filter(t=>!remove.includes(t.id));
 for(let i=0;i<state.trains.length;i++)for(let j=i+1;j<state.trains.length;j++){const a=pos(state.trains[i]),b=pos(state.trains[j]);if(Math.hypot(a[0]-b[0],a[1]-b[1])<30){state.ended=true;state.won=false;status.textContent='Çarpışma. Aynı hatta iki tren bıraktın.'}}
 if(state.miss>3){state.ended=true;state.won=false;status.textContent='Dört yanlış teslimat. Vardiya kapandı.'}
 finishCheck()
}
function track(a,b){ctx.beginPath();ctx.moveTo(...nodes[a]);ctx.lineTo(...nodes[b]);ctx.stroke()}
function drawSwitch(key,index){const [x,y]=nodes[key];ctx.fillStyle='#fff';ctx.strokeStyle='#2e3035';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,20,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#222';ctx.font='800 13px system-ui';ctx.textAlign='center';ctx.fillText(String(index+1),x,y+5)}
function draw(){
 ctx.fillStyle='#f3efe5';ctx.fillRect(0,0,C.width,C.height);ctx.strokeStyle='#77746d';ctx.lineWidth=9;ctx.lineCap='round';
 for(const [a,b] of [['S','A'],['A','B'],['A','C'],['B','D0'],['B','D1'],['C','D2'],['C','D3']])track(a,b);
 ctx.strokeStyle='#d5d0c4';ctx.lineWidth=3;for(const [a,b] of [['S','A'],['A','B'],['A','C'],['B','D0'],['B','D1'],['C','D2'],['C','D3']])track(a,b);
 drawSwitch('A',0);drawSwitch('B',1);drawSwitch('C',2);
 ['D0','D1','D2','D3'].forEach((d,i)=>{const [x,y]=nodes[d],color=colors[L().map[i]];ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-48,y-28,96,56,16);ctx.fill();ctx.fillStyle='#fff';ctx.font='800 12px system-ui';ctx.textAlign='center';ctx.fillText('TERMİNAL',x,y+4)});
 ctx.fillStyle='#35383e';ctx.beginPath();ctx.roundRect(nodes.S[0]-35,nodes.S[1]-27,70,54,14);ctx.fill();ctx.fillStyle='#fff';ctx.fillText('GİRİŞ',nodes.S[0],nodes.S[1]+4);
 const labels=[state.sw[0]===0?'↗':'↘',state.sw[1]===0?'↗':'→',state.sw[2]===0?'→':'↘'];[['A',0],['B',1],['C',2]].forEach(([n,i])=>{const [x,y]=nodes[n];ctx.fillStyle='#222';ctx.font='800 20px system-ui';ctx.fillText(labels[i],x,y-32)});
 for(const tr of state.trains){const [x,y]=pos(tr);ctx.save();ctx.translate(x,y);ctx.fillStyle=colors[tr.color];ctx.beginPath();ctx.roundRect(-24,-15,48,30,9);ctx.fill();ctx.fillStyle='#20242a';ctx.fillRect(-16,11,8,8);ctx.fillRect(8,11,8,8);ctx.restore()}
 if(state.slow>0){ctx.fillStyle='rgba(255,255,255,.65)';ctx.fillRect(0,0,C.width,42);ctx.fillStyle='#333';ctx.font='800 14px system-ui';ctx.textAlign='center';ctx.fillText('ACİL YAVAŞLATMA · '+state.slow.toFixed(1)+' s',C.width/2,26)}
 ctx.textAlign='left';ctx.fillStyle='rgba(40,38,34,.6)';ctx.font='700 14px system-ui';ctx.fillText(L().name+' · geliş aralığı '+L().spawn.toFixed(2)+' s',18,26);
 if(state.ended&&!state.won){ctx.fillStyle='rgba(248,245,238,.72)';ctx.fillRect(0,0,C.width,C.height);ctx.fillStyle='#29292d';ctx.font='800 38px system-ui';ctx.textAlign='center';ctx.fillText('Vardiya bitti',C.width/2,C.height/2)}
}
function toggle(i){if(!state.ended)state.sw[i]=1-state.sw[i]}
C.addEventListener('click',e=>{const r=C.getBoundingClientRect(),x=(e.clientX-r.left)*C.width/r.width,y=(e.clientY-r.top)*C.height/r.height;[['A',0],['B',1],['C',2]].forEach(([n,i])=>{const p=nodes[n];if(Math.hypot(x-p[0],y-p[1])<42)toggle(i)})});
addEventListener('keydown',e=>{if(['1','2','3'].includes(e.key))toggle(+e.key-1);if(e.key==='Shift')useBrake()});
function useBrake(){if(state.brake&&!state.ended){state.brake=0;state.slow=3;brakeBtn.disabled=true;status.textContent='Hat 3 saniyeliğine yavaşlatıldı. Bu hakkın tek kullanımlık.'}}
brakeBtn.onclick=useBrake;E('restart').onclick=reset;nextBtn.onclick=()=>{if(state.won&&li<levels.length-1){li++;reset()}};
function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;step(dt);draw();requestAnimationFrame(loop)}reset();requestAnimationFrame(loop);