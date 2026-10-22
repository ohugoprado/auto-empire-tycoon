/* Auto Empire Tycoon — Alpha 6.8: weekly goals and meaningful progression. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const panel=document.createElement('section');panel.id='ae-weekly-challenges';panel.className='panel';
panel.innerHTML='<h3>Desafios da semana</h3><p class="tiny">Objetivos curtos para manter a concessionária em movimento. Conclua e resgate recompensas antes da próxima semana.</p><div id="ae-weekly-status"></div><div id="ae-weekly-list"></div>';
const css=document.createElement('style');css.textContent=`
#ae-weekly-challenges{padding:14px;margin:12px 0}
#ae-weekly-challenges h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-weekly-status{font-size:12px;color:#c7d9e3;margin:8px 0 12px}
.ae-weekly-card{border:1px solid #456172;background:#20384b;border-radius:11px;padding:12px;margin:9px 0}
.ae-weekly-card strong{font-size:13px;display:block}
.ae-weekly-card p{font-size:12px;color:#c7d9e3;margin:6px 0}
.ae-weekly-bar{height:7px;border-radius:6px;background:#102331;overflow:hidden;margin:9px 0}
.ae-weekly-bar i{height:100%;display:block;background:#eac174;border-radius:6px}
.ae-weekly-card button{min-height:44px;margin-top:4px}
`;document.head.append(css);
const progress=document.getElementById('ae-dealer-progress');
if(progress?.parentNode)progress.after(panel);else garage.prepend(panel);
const goals=[
 {id:'sales',name:'Fechar negócios',detail:'Venda 2 veículos nesta semana.',goal:2,reward:650},
 {id:'profit',name:'Negociar com margem',detail:'Obtenha 2.000 CR de lucro em vendas nesta semana.',goal:2000,reward:550},
 {id:'listing',name:'Vitrine movimentada',detail:'Anuncie 2 veículos diferentes nesta semana.',goal:2,reward:300}
];
function week(day){return Math.floor((Math.max(1,n(day))-1)/7);}
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.weeklyChallenges||typeof s.weeklyChallenges!=='object')s.weeklyChallenges={};
 const w=s.weeklyChallenges,current=week(s.day);
 if(w.week!==current){
  w.week=current;w.baselineSales=n(s.sales);w.baselineProfit=n(s.profit);w.claimed=[];w.listedIds=[];w.rewardTotal=Math.max(0,n(w.rewardTotal));w.completedWeeks=Math.max(0,n(w.completedWeeks));
 }
 if(!Array.isArray(w.claimed))w.claimed=[];
 if(!Array.isArray(w.listedIds))w.listedIds=[];
 return w;
}
function value(g,w){
 if(g.id==='sales')return Math.max(0,n(s.sales)-n(w.baselineSales));
 if(g.id==='profit')return Math.max(0,n(s.profit)-n(w.baselineProfit));
 return w.listedIds.length;
}
function refresh(){
 const w=ensure();if(!w)return;
 const daysLeft=7-((Math.max(1,n(s.day))-1)%7);
 panel.querySelector('#ae-weekly-status').textContent='Semana '+(w.week+1)+' · '+daysLeft+' dia(s) restante(s) · Recompensas recebidas: '+money(n(w.rewardTotal));
 panel.querySelector('#ae-weekly-list').innerHTML=goals.map(g=>{
  const v=Math.min(g.goal,value(g,w)),claimed=w.claimed.includes(g.id),done=v>=g.goal;
  return '<div class="ae-weekly-card"><strong>'+g.name+'</strong><p>'+g.detail+'</p><div class="ae-weekly-bar"><i style="width:'+Math.round(v/g.goal*100)+'%"></i></div><p>'+v.toLocaleString('pt-BR')+' / '+g.goal.toLocaleString('pt-BR')+' · Prêmio '+money(g.reward)+'</p><button type="button" data-weekly-claim="'+g.id+'" '+(!done||claimed?'disabled':'')+'>'+(claimed?'Resgatado':done?'Resgatar recompensa':'Em andamento')+'</button></div>';
 }).join('');
}
panel.addEventListener('click',e=>{
 const btn=e.target.closest('[data-weekly-claim]');if(!btn)return;
 const w=ensure(),g=goals.find(x=>x.id===btn.dataset.weeklyClaim);
 if(!w||!g||w.claimed.includes(g.id)||value(g,w)<g.goal)return;
 w.claimed.push(g.id);w.rewardTotal+=g.reward;s.cash+=g.reward;
 entry('Desafio semanal · '+g.name,g.reward);note('Desafio concluído: '+g.name+' · '+money(g.reward));save();render();toast('Recompensa resgatada!');
});
const prevRender=render;let signature='';
render=function(){
 prevRender();
 const w=ensure();if(!w)return;
 // Count uniquely listed vehicles, including cars that have since sold.
 for(const c of s.stock||[])if(c.listed&&!w.listedIds.includes(String(c.id)))w.listedIds.push(String(c.id));
 const next=[s.day,s.sales,s.profit,s.cash,w.listedIds.length,w.claimed.join(',')].join('|');
 if(next!==signature){signature=next;refresh();}
};
const prevTick=tickDay;tickDay=function(){const before=week(s.day),result=prevTick();const w=ensure();if(w&&week(s.day)!==before){note('Nova semana: três desafios disponíveis.');save();refresh();}return result;};
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
