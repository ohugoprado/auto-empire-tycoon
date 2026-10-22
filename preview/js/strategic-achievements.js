/* Auto Empire Tycoon — Alpha 7.4: strategic achievements with one-time rewards. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const achievements=[
 {id:'merchant',title:'Negociador nato',description:'Conclua 10 vendas.',goal:10,reward:950,metric:()=>n(s.sales)},
 {id:'industrial',title:'Feito em casa',description:'Venda 5 carros fabricados pela sua empresa.',goal:5,reward:1300,metric:()=>n(s.productionAnalytics?.sales?.length)},
 {id:'leader',title:'Líder regional',description:'Vença 3 semanas contra a concorrência.',goal:3,reward:1700,metric:()=>n(s.marketRivals?.wins)},
 {id:'contracts',title:'Parceiro confiável',description:'Conclua 3 contratos empresariais.',goal:3,reward:1500,metric:()=>n(s.businessOpportunities?.completed?.length)},
 {id:'planner',title:'Gestor de desafios',description:'Resgate 6 desafios semanais.',goal:6,reward:1200,metric:()=>n(s.achievements?.weeklyClaims)},
 {id:'diversity',title:'Portfólio de sucesso',description:'Venda carros de 3 modelos próprios diferentes.',goal:3,reward:1400,metric:()=>new Set((s.productionAnalytics?.sales||[]).map(x=>x.designId).filter(x=>x!=null)).size}
];
const panel=document.createElement('section');panel.className='panel';panel.id='ae-strategic-achievements';
panel.innerHTML='<h3>Conquistas do império</h3><p class="tiny">Objetivos permanentes que valorizam estratégias diferentes. Recompensas únicas, sem prazo para resgate.</p><div id="ae-achievement-overview"></div><div id="ae-achievement-list"></div>';
const css=document.createElement('style');css.textContent=`
#ae-strategic-achievements{padding:14px;margin:12px 0}
#ae-strategic-achievements h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-achievement-overview{font-size:12px;color:#c7d8e2;margin:8px 0}
.ae-achievement{border:1px solid #3e5b6c;border-radius:10px;background:#20384b;padding:11px;margin:9px 0}
.ae-achievement strong{font-size:13px}
.ae-achievement p{font-size:12px;color:#c9d8e2;margin:6px 0}
.ae-achievement-track{height:7px;border-radius:8px;background:#102330;overflow:hidden;margin:9px 0}
.ae-achievement-track i{height:100%;display:block;border-radius:8px;background:#e9bd69}
.ae-achievement button{min-height:44px;margin-top:5px}
`;document.head.append(css);
const events=document.getElementById('ae-competitive-events');
if(events?.parentNode)events.after(panel);else garage.prepend(panel);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.achievements||typeof s.achievements!=='object')s.achievements={claimed:[],weeklyClaims:0,weeklyKeys:[]};
 const a=s.achievements;
 if(!Array.isArray(a.claimed))a.claimed=[];
 if(!Array.isArray(a.weeklyKeys))a.weeklyKeys=[];
 a.weeklyClaims=Math.max(0,n(a.weeklyClaims));
 return a;
}
function reconcile(){
 const a=ensure(),w=s.weeklyChallenges;if(!a||!w)return;
 const keys=(w.claimed||[]).map(id=>String(w.week)+':'+id);
 let changed=false;
 for(const key of keys)if(!a.weeklyKeys.includes(key)){a.weeklyKeys.push(key);a.weeklyClaims++;changed=true;}
 if(changed){a.weeklyKeys=a.weeklyKeys.slice(-200);save();}
}
function refresh(){
 const a=ensure();if(!a)return;
 reconcile();
 panel.querySelector('#ae-achievement-overview').textContent=a.claimed.length+' de '+achievements.length+' conquistas resgatadas';
 panel.querySelector('#ae-achievement-list').innerHTML=achievements.map(x=>{
  const progress=Math.min(x.goal,Math.max(0,x.metric())),done=progress>=x.goal,claimed=a.claimed.includes(x.id);
  return '<div class="ae-achievement"><strong>'+x.title+'</strong><p>'+x.description+'</p><div class="ae-achievement-track"><i style="width:'+Math.round(progress/x.goal*100)+'%"></i></div><p>'+progress+' / '+x.goal+' · Prêmio '+money(x.reward)+'</p><button type="button" data-ae-achievement="'+x.id+'" '+(!done||claimed?'disabled':'')+'>'+(claimed?'Conquista resgatada':done?'Resgatar recompensa':'Em andamento')+'</button></div>';
 }).join('');
}
panel.addEventListener('click',event=>{
 const btn=event.target.closest('[data-ae-achievement]');if(!btn)return;
 const a=ensure(),x=achievements.find(v=>v.id===btn.dataset.aeAchievement);
 if(!a||!x||a.claimed.includes(x.id)||x.metric()<x.goal)return;
 a.claimed.push(x.id);s.cash+=x.reward;entry('Conquista · '+x.title,x.reward);note('Conquista desbloqueada: '+x.title+' · '+money(x.reward));save();render();toast('Conquista resgatada!');
});
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let signature='';
render=function(){prevRender();const a=ensure(),key=[s?.day,s?.sales,s?.marketRivals?.wins,s?.businessOpportunities?.completed?.length,s?.productionAnalytics?.sales?.length,s?.weeklyChallenges?.claimed?.length,a?.claimed?.length].join('|');if(key!==signature){signature=key;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
