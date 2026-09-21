const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id);
const scenarios=[
 {name:'Kutup gecesi',days:[[4,2,3],[5,2,3],[4,3,2],[5,3,3],[4,4,2],[5,3,4],[4,2,4],[5,4,3]],goal:14},
 {name:'İyon fırtınası',days:[[4,3,3],[5,3,3],[4,4,3],[5,4,3],[5,3,4],[4,4,4],[5,4,4],[6,3,4]],goal:12},
 {name:'Dar pencere',days:[[5,3,4],[5,4,4],[6,3,4],[5,4,5],[6,3,5],[5,4,5],[6,4,4],[5,4,5]],goal:10},
 {name:'Karanlık cephe',days:[[5,4,4],[6,3,5],[5,5,4],[6,4,5],[5,5,5],[6,4,5],[6,5,4],[5,5,5]],goal:8},
 {name:'Son yayın',days:[[6,4,4],[6,4,5],[5,5,5],[6,4,6],[6,5,5],[5,5,6],[6,4,6],[6,5,6]],goal:6}
];
let li=0,s;function L(){return scenarios[li]}function forecast(){return L().days[s.day]}
function reset(){s={day:0,hp:100,data:0,p:[4,3,3],battery:3,probes:2,revealed:false,batteryUsed:false,ended:false,won:false,lastResult:''};E('next').disabled=true;E('status').textContent='Tahminler ±1 aralığında. Gücü dağıt, istersen sınırlı araçlarını kullan, sonra günü bitir.';ui();draw()}
function ui(){E('level').textContent=(li+1)+'/'+scenarios.length;E('day').textContent=Math.min(8,s.day+1)+'/8';E('hp').textContent=Math.max(0,s.hp);E('data').textContent=s.data;E('battery').textContent=s.battery;E('probe').textContent=s.probes;E('batteryBtn').disabled=s.battery<=0||s.batteryUsed||s.ended;E('probeBtn').disabled=s.probes<=0||s.revealed||s.ended}
function add(i){if(s.ended)return;const donor=[0,1,2].filter(j=>j!==i).sort((a,b)=>s.p[b]-s.p[a])[0];if(s.p[donor]>0){s.p[donor]--;s.p[i]++;draw()}}
function useBattery(){if(s.battery<=0||s.batteryUsed||s.ended)return;s.battery--;s.batteryUsed=true;s.p[0]++;s.p[1]++;E('status').textContent='Batarya boşaldı: bu gün için +1 ısı ve +1 kalkan gücü.';ui();draw()}
function probe(){if(s.probes<=0||s.revealed||s.ended)return;s.probes--;s.revealed=true;const [h,sh,w]=forecast();E('status').textContent='Kesin tahmin: ısı '+h+', kalkan '+sh+', iletişim penceresi '+w+'.';ui();draw()}
function advance(){
 if(s.ended)return;const [heatReq,shieldReq,window]=forecast(),heatGap=Math.max(0,heatReq-s.p[0]),shieldGap=Math.max(0,shieldReq-s.p[1]),damage=heatGap*7+shieldGap*8,send=Math.min(s.p[2],window);s.hp-=damage;s.data+=send;s.lastResult='Gerçek: '+heatReq+'/'+shieldReq+'/'+window+' · hasar '+damage+' · veri +'+send;s.day++;
 if(s.hp<=0){s.hp=0;s.ended=true;E('status').textContent='İstasyon kaybedildi. '+s.lastResult}
 else if(s.day>=8){s.ended=true;s.won=s.data>=L().goal;E('status').textContent=(s.won?'Senaryo tamamlandı. ':'Hayatta kaldın ama veri hedefi kaçtı. ')+s.lastResult+' · toplam veri '+s.data+'/'+L().goal;E('next').disabled=!s.won||li===scenarios.length-1}
 else{E('status').textContent=s.lastResult+' · Yeni belirsiz tahmin geldi.';s.p=[4,3,3];s.revealed=false;s.batteryUsed=false}ui();draw()
}
function range(v){return Math.max(0,v-1)+'–'+(v+1)}
function draw(){
 ctx.fillStyle='#171923';ctx.fillRect(0,0,C.width,C.height);const [hr,sr,w]=s.day<8?forecast():[0,0,0];
 ctx.fillStyle='#222633';ctx.beginPath();ctx.roundRect(70,62,820,170,24);ctx.fill();ctx.fillStyle='#fff';ctx.font='800 24px system-ui';ctx.textAlign='left';ctx.fillText(L().name,95,101);ctx.font='500 15px system-ui';ctx.fillStyle='#abb3c6';
 const forecastText=s.revealed?'KESİN · ısı '+hr+' · kalkan '+sr+' · iletişim '+w:'TAHMİN · ısı '+range(hr)+' · kalkan '+range(sr)+' · iletişim '+range(w);ctx.fillText(forecastText,95,139);ctx.fillText('Temel reaktör: 10 güç · batarya kullanılırsa o gün 12 · veri hedefi: '+L().goal,95,173);ctx.fillText('Güç kartına basınca en yüksek diğer sistemden 1 birim aktarılır.',95,202);
 const names=['ISITMA','KALKAN','İLETİŞİM'],cols=['#e78b55','#6f85e7','#5ab99a'];for(let i=0;i<3;i++){const x=110+i*280,y=292;ctx.fillStyle='#252a38';ctx.beginPath();ctx.roundRect(x,y,220,178,22);ctx.fill();ctx.fillStyle=cols[i];ctx.font='800 15px system-ui';ctx.fillText(names[i],x+22,y+34);ctx.font='900 58px system-ui';ctx.fillText(String(s.p[i]),x+22,y+105);ctx.font='500 13px system-ui';ctx.fillStyle='#aeb5c5';ctx.fillText(i===0?'soğuk hasarını önler':i===1?'fırtına hasarını önler':'pencere kadar veri yollar',x+22,y+142)}
 ctx.fillStyle='#2c3140';ctx.fillRect(95,535,770,18);ctx.fillStyle=s.hp>45?'#62c98e':'#df6b62';ctx.fillRect(95,535,770*s.hp/100,18);ctx.fillStyle='#b9c0d0';ctx.font='600 13px system-ui';ctx.fillText('gövde bütünlüğü',95,525);
 ctx.fillStyle='#858da1';ctx.font='500 12px system-ui';ctx.fillText('Bilgi de güç de sınırlı: probe geleceği kesinleştirir, batarya ise yalnız bugünü kurtarır.',95,590)
}
E('heat').onclick=()=>add(0);E('shield').onclick=()=>add(1);E('comms').onclick=()=>add(2);E('batteryBtn').onclick=useBattery;E('probeBtn').onclick=probe;E('advance').onclick=advance;E('next').onclick=()=>{if(s.won&&li<scenarios.length-1){li++;reset()}};reset();