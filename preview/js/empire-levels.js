/* Auto Empire Tycoon — Alpha 6.9: company XP, levels and milestone unlocks. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const stages=[
 {name:'Garagem de bairro',xp:0,reward:0,desc:'Aprenda a negociar e vender.'},
 {name:'Revenda reconhecida',xp:150,reward:450,desc:'Sua loja começa a ganhar reconhecimento.'},
 {name:'Concessionária regional',xp:420,reward:900,desc:'Sua marca alcança novos clientes.'},
 {name:'Rede em expansão',xp:850,reward:1600,desc:'Hora de planejar crescimento sustentável.'},
 {name:'Grupo automotivo',xp:1450,reward:2600,desc:'A operação exige gestão profissional.'},
 {name:'Potência industrial',xp:2300,reward:4000,desc:'Sua fabricante ganha escala.'},
 {name:'Império automotivo',xp:3500,reward:6000,desc:'Você construiu um grande grupo empresarial.'}
];
const panel=document.createElement('section');panel.id='ae-empire-levels';panel.className='panel';
panel.innerHTML='<h3>Carreira do empresário</h3><div id="ae-level-status"></div><div id="ae-level-milestones"></div><p class="tiny">XP por vendas concluídas, com bônus por carros da sua própria fabricante. Níveis oferecem títulos e prêmios únicos, sem bloquear recursos já existentes.</p>';
const css=document.createElement('style');css.textContent=`
#ae-empire-levels{padding:14px;margin:12px 0}
#ae-empire-levels h3{font-size:15px;color:#f4d38b;margin:0 0 9px}
#ae-level-status{background:#20384b;border-radius:11px;padding:12px}
#ae-level-status strong{display:block;font-size:16px}
#ae-level-status p{font-size:12px;color:#cbdce6;margin:7px 0}
.ae-level-bar{height:8px;border-radius:6px;background:#10232e;overflow:hidden;margin:10px 0}
.ae-level-bar i{display:block;height:100%;background:#eac174;border-radius:6px}
.ae-level-milestone{border:1px solid #415d70;border-radius:9px;padding:11px;margin:8px 0;background:#20384b}
.ae-level-milestone b{font-size:12px}
.ae-level-milestone p{font-size:11px;color:#cbdce6;margin:5px 0}
.ae-level-milestone button{min-height:44px;margin-top:5px}
`;document.head.append(css);
const weekly=document.getElementById('ae-weekly-challenges');
if(weekly?.parentNode)weekly.after(panel);else garage.prepend(panel);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.empireLevels||typeof s.empireLevels!=='object')s.empireLevels={xp:0,claimed:[],baselineSales:n(s.sales)};
 const e=s.empireLevels;
 e.xp=Math.max(0,n(e.xp));if(!Array.isArray(e.claimed))e.claimed=[];
 return e;
}
function level(xp){let i=0;for(let j=0;j<stages.length;j++)if(xp>=stages[j].xp)i=j;return i;}
function refresh(){
 const e=ensure();if(!e)return;
 const current=level(e.xp),now=stages[current],next=stages[current+1],percent=next?Math.max(0,Math.min(100,Math.round((e.xp-now.xp)/(next.xp-now.xp)*100))):100;
 panel.querySelector('#ae-level-status').innerHTML='<strong>Nível '+(current+1)+' · '+now.name+'</strong><p>'+now.desc+'</p><div class="ae-level-bar"><i style="width:'+percent+'%"></i></div><p>'+Math.round(e.xp)+' XP'+(next?' / '+next.xp+' XP para '+next.name:' · Nível máximo alcançado')+'</p>';
 panel.querySelector('#ae-level-milestones').innerHTML=stages.slice(1).map((x,i)=>{
  const unlocked=e.xp>=x.xp,claimed=e.claimed.includes(i+1);
  return '<div class="ae-level-milestone"><b>Nível '+(i+2)+' · '+x.name+'</b><p>'+x.xp+' XP necessários · Prêmio '+money(x.reward)+'</p><button type="button" data-ae-level-claim="'+(i+1)+'" '+(!unlocked||claimed?'disabled':'')+'>'+(claimed?'Resgatado':unlocked?'Resgatar prêmio':'Bloqueado')+'</button></div>';
 }).join('');
}
panel.addEventListener('click',event=>{
 const btn=event.target.closest('[data-ae-level-claim]');if(!btn)return;
 const i=Number(btn.dataset.aeLevelClaim),e=ensure(),stage=stages[i];
 if(!stage||!e||e.claimed.includes(i)||e.xp<stage.xp)return;
 e.claimed.push(i);s.cash+=stage.reward;entry('Carreira · '+stage.name,stage.reward);note('Marco de carreira alcançado: '+stage.name+' · '+money(stage.reward));save();render();toast('Novo marco de carreira!');
});
const prevAccept=acceptOffer;
acceptOffer=function(i){
 const car=s?.stock?.find(x=>x.id===modalCar),offer=car?.offers?.[i],before=n(s?.sales);
 const bonus=car?.manufactured?55:0;
 const result=prevAccept(i);
 if(offer&&n(s.sales)>before){
  const e=ensure();if(e){
   const gained=75+bonus;
   const oldLevel=level(e.xp);e.xp+=gained;
   if(level(e.xp)>oldLevel)note('Carreira evoluiu: nível '+(level(e.xp)+1)+' · '+stages[level(e.xp)].name+'!');
   save();refresh();
  }
 }
 return result;
};
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let last='';
render=function(){prevRender();const e=ensure(),signature=[s?.day,s?.sales,e?.xp,e?.claimed?.join(',')].join('|');if(signature!==last){last=signature;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
