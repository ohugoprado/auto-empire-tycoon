/* Auto Empire Tycoon — Alpha 7.0: rotating commercial opportunities. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const offers=[
 {id:'fleet',name:'Contrato de frota',desc:'Venda 3 veículos durante o contrato.',goal:3,days:12,deposit:600,reward:2800,level:1},
 {id:'premium',name:'Cliente corporativo',desc:'Venda 2 veículos durante o contrato.',goal:2,days:9,deposit:900,reward:2500,level:2},
 {id:'expansion',name:'Parceria regional',desc:'Venda 4 veículos durante o contrato.',goal:4,days:14,deposit:1200,reward:4600,level:3},
 {id:'industrial',name:'Acordo com distribuidora',desc:'Venda 2 carros fabricados pela sua empresa.',goal:2,days:16,deposit:1800,reward:6500,level:4}
];
const panel=document.createElement('section');panel.id='ae-business-opportunities';panel.className='panel';
panel.innerHTML='<h3>Oportunidades de negócio</h3><p class="tiny">Aceite contratos com prazo, depósito e recompensa. Você pode manter apenas um contrato ativo por vez.</p><div id="ae-opportunities-list"></div>';
const css=document.createElement('style');css.textContent=`
#ae-business-opportunities{padding:14px;margin:12px 0}
#ae-business-opportunities h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
.ae-opportunity{background:#20384b;border:1px solid #456172;border-radius:10px;padding:12px;margin:10px 0}
.ae-opportunity b{font-size:13px}
.ae-opportunity p{font-size:12px;color:#c8d9e3;line-height:1.5;margin:6px 0}
.ae-opportunity button{min-height:44px;margin-top:5px}
.ae-opportunity progress{width:100%;height:12px}
`;document.head.append(css);
const career=document.getElementById('ae-empire-levels');
if(career?.parentNode)career.after(panel);else garage.prepend(panel);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.businessOpportunities||typeof s.businessOpportunities!=='object')s.businessOpportunities={active:null,completed:[],failed:0};
 const o=s.businessOpportunities;
 if(!Array.isArray(o.completed))o.completed=[];
 return o;
}
function currentLevel(){const xp=n(s.empireLevels?.xp);return xp>=3500?7:xp>=2300?6:xp>=1450?5:xp>=850?4:xp>=420?3:xp>=150?2:1;}
function refresh(){
 const o=ensure();if(!o)return;
 const active=o.active;
 const unlocked=offers.filter(x=>currentLevel()>=x.level);
 const list=panel.querySelector('#ae-opportunities-list');
 if(active){
  const offer=offers.find(x=>x.id===active.id);
  if(!offer){list.textContent='Contrato indisponível.';return;}
  const left=Math.max(0,active.due-n(s.day));
  list.innerHTML='<div class="ae-opportunity"><b>'+offer.name+'</b><p>'+offer.desc+'</p><progress max="'+offer.goal+'" value="'+Math.min(offer.goal,n(active.progress))+'"></progress><p>'+n(active.progress)+'/'+offer.goal+' vendas · '+left+' dia(s) restante(s)</p><p>Recompensa ao concluir: '+money(offer.reward)+' + devolução do depósito de '+money(offer.deposit)+'</p><button type="button" data-ae-opportunity="claim" '+(n(active.progress)<offer.goal||n(s.day)>active.due?'disabled':'')+'>Concluir contrato</button></div>';
 }else{
  const rotation=Math.floor((Math.max(1,n(s.day))-1)/10);
  const available=unlocked.filter(x=>(offers.indexOf(x)+rotation)%2===0);
  const selected=available.length?available:[unlocked[rotation%unlocked.length]];
  list.innerHTML=selected.map(x=>'<div class="ae-opportunity"><b>'+x.name+'</b><p>'+x.desc+'</p><p>Prazo: '+x.days+' dias · Depósito: '+money(x.deposit)+' · Recompensa: '+money(x.reward)+'</p><button type="button" data-ae-opportunity="'+x.id+'" '+(n(s.cash)<x.deposit?'disabled':'')+'>Aceitar contrato</button></div>').join('')+'<p class="tiny">As oportunidades mudam a cada 10 dias de jogo. Contratos não concluídos perdem o depósito.</p>';
 }
}
function expire(){
 const o=ensure();if(!o?.active)return;
 if(n(s.day)<=o.active.due)return;
 const offer=offers.find(x=>x.id===o.active.id);
 o.failed++;o.active=null;note('Prazo encerrado: '+(offer?.name||'contrato')+'. Depósito perdido.');save();
}
panel.addEventListener('click',event=>{
 const btn=event.target.closest('[data-ae-opportunity]');if(!btn)return;
 const o=ensure(),id=btn.dataset.aeOpportunity;if(!o)return;
 if(id==='claim'){
  const a=o.active,offer=offers.find(x=>x.id===a?.id);
  if(!offer||n(a.progress)<offer.goal||n(s.day)>a.due)return;
  const payout=offer.deposit+offer.reward;
  s.cash+=payout;o.completed.push({id:offer.id,day:s.day});o.active=null;
  entry('Contrato concluído · '+offer.name,payout);note('Contrato concluído: '+offer.name+' · bônus '+money(offer.reward));save();render();toast('Contrato concluído!');return;
 }
 if(o.active)return toast('Conclua o contrato atual primeiro');
 const offer=offers.find(x=>x.id===id);if(!offer||currentLevel()<offer.level||s.cash<offer.deposit)return;
 if(!confirm('Depositar '+money(offer.deposit)+' para iniciar '+offer.name+'? O depósito será devolvido somente se cumprir o prazo.'))return;
 s.cash-=offer.deposit;o.active={id:offer.id,start:s.day,due:s.day+offer.days,progress:0};
 entry('Depósito contratual · '+offer.name,-offer.deposit);note('Novo contrato: '+offer.name);save();render();
});
const prevAccept=acceptOffer;
acceptOffer=function(i){
 const car=s?.stock?.find(x=>x.id===modalCar),valid=!!car?.offers?.[i],before=n(s?.sales),o=ensure(),a=o?.active;
 const qualifies=valid&&a&&n(s.day)<=a.due&&(a.id!=='industrial'||!!car.manufactured);
 const result=prevAccept(i);
 if(qualifies&&n(s.sales)>before&&o.active===a){a.progress++;save();refresh();if(a.progress>=offers.find(x=>x.id===a.id).goal)note('Contrato pronto para resgate: '+offers.find(x=>x.id===a.id).name);}
 return result;
};
const prevTick=tickDay;tickDay=function(){const result=prevTick();expire();refresh();return result;};
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let last='';
render=function(){prevRender();const o=ensure(),key=[s?.day,s?.cash,s?.sales,s?.empireLevels?.xp,o?.active?.id,o?.active?.progress].join('|');if(key!==last){last=key;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
