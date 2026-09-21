const C=document.getElementById('game'),ctx=C.getContext('2d'),E=id=>document.getElementById(id);
const scenarios=[
 {name:'Kutup gecesi',days:[[6,2,2],[7,1,3],[5,3,2],[8,2,3],[6,4,2],[7,3,4],[5,2,5],[8,4,4]],goal:22},
 {name:'İyon fırtınası',days:[[5,4,2],[6,5,2],[7,3,3],[5,6,2],[7,5,3],[6,4,4],[8,5,3],[7,6,4]],goal:20},
 {name:'Dar pencere',days:[[6,3,4],[7,4,5],[6,5,3],[8,3,5],[7,5,4],[8,4,5],[6,6,4],[8,5,5]],goal:24},
 {name:'Karanlık cephe',days:[[8,4,3],[7,6,4],[9,5,3],[8,6,5],[7,7,4],[9,5,5],[8,7,4],[9,6,5]],goal:20},
 {name:'Son yayın',days:[[8,6,4],[9,7,5],[8,7,5],[10,6,6],[9,8,5],[10,7,6],[9,8,6],[10,8,7]],goal:18}
];
let li=0,s;function L(){return scenarios[li]}function forecast(){return L().days[s.day]}
function reset(){s={day:0,hp:100,data:0,p:[4,3,3],ended:false,won:false};E('next').disabled=true;E('status').textContent='Tahmini oku. Gücü ısıtma, kalkan ve iletişim arasında paylaştır.';ui();draw()}
function ui(){E('level').textContent=(li+1)+'/'+scenarios.length;E('day').textContent=Math.min(8,s.day+1)+'/8';E('hp').textContent=Math.max(0,s.hp);E('data').textContent=s.data}
function add(i){if(s.ended)return;const donor=[0,1,2].filter(j=>j!==i).sort((a,b)=>s.p[b]-s.p[a])[0];if(s.p[donor]>0){s.p[donor]--;s.p[i]++;draw()}}
function advance(){if(s.ended)return;const [heatReq,shieldReq,window]=forecast(),heatGap=Math.max(0,heatReq-s.p[0]),shieldGap=Math.max(0,shieldReq-s.p[1]);s.hp-=heatGap*7+shieldGap*8;s.data+=Math.min(s.p[2],window);s.day++;
 if(s.hp<=0){s.hp=0;s.ended=true;E('status').textContent='İstasyon kaybedildi.'}
 else if(s.day>=8){s.ended=true;s.won=s.data>=L().goal;E('status').textContent=s.won?'Senaryo tamamlandı. Veri hedefi karşılandı.':'Hayatta kaldın ama veri hedefi kaçtı: '+s.data+'/'+L().goal;E('next').disabled=!s.won||li===scenarios.length-1}
 else E('status').textContent='Yeni tahmin geldi. Gücü tekrar dağıt.';ui();draw()}
function draw(){ctx.fillStyle='#171923';ctx.fillRect(0,0,C.width,C.height);const [hr,sr,w]=s.day<8?forecast():[0,0,0];
 ctx.fillStyle='#222633';ctx.beginPath();ctx.roundRect(70,70,820,150,24);ctx.fill();ctx.fillStyle='#fff';ctx.font='800 24px system-ui';ctx.textAlign='left';ctx.fillText(L().name,95,108);ctx.font='500 15px system-ui';ctx.fillStyle='#abb3c6';ctx.fillText('Yarın gereken minimum: ısı '+hr+' · kalkan '+sr+' · iletişim penceresi '+w,95,142);ctx.fillText('Toplam güç: 10 · veri hedefi: '+L().goal,95,174);
 const names=['ISITMA','KALKAN','İLETİŞİM'],cols=['#e78b55','#6f85e7','#5ab99a'];for(let i=0;i<3;i++){const x=110+i*280,y=300;ctx.fillStyle='#252a38';ctx.beginPath();ctx.roundRect(x,y,220,170,22);ctx.fill();ctx.fillStyle=cols[i];ctx.font='800 15px system-ui';ctx.fillText(names[i],x+22,y+34);ctx.font='900 58px system-ui';ctx.fillText(String(s.p[i]),x+22,y+105);ctx.font='500 13px system-ui';ctx.fillStyle='#aeb5c5';ctx.fillText(i===0?'soğuğa karşı':i===1?'fırtınaya karşı':'gönderilen veri',x+22,y+138)}
 ctx.fillStyle='#2c3140';ctx.fillRect(95,535,770,18);ctx.fillStyle=s.hp>45?'#62c98e':'#df6b62';ctx.fillRect(95,535,770*s.hp/100,18);ctx.fillStyle='#b9c0d0';ctx.font='600 13px system-ui';ctx.fillText('gövde bütünlüğü',95,525)}
E('heat').onclick=()=>add(0);E('shield').onclick=()=>add(1);E('comms').onclick=()=>add(2);E('advance').onclick=advance;E('next').onclick=()=>{if(s.won&&li<scenarios.length-1){li++;reset()}};reset();