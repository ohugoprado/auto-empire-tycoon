/* Auto Empire Tycoon — Alpha 6.0: dealership contracts and progression. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const money=v=>Math.round(v).toLocaleString('pt-BR')+' CR';
const safe=v=>Number.isFinite(Number(v))?Number(v):0;
const templates=[
 {id:'first-sale',title:'Primeiro negócio',desc:'Conclua uma venda.',goal:1,type:'sales',reward:750},
 {id:'three-sales',title:'Movimento na loja',desc:'Conclua 3 vendas.',goal:3,type:'sales',reward:1200},
 {id:'five-sales',title:'Concessionária em crescimento',desc:'Conclua 5 vendas.',goal:5,type:'sales',reward:1800},
 {id:'profit-5k',title:'Negociação eficiente',desc:'Acumule 5.000 CR de lucro operacional em vendas.',goal:5000,type:'profit',reward:1100},
 {id:'profit-20k',title:'Operação lucrativa',desc:'Acumule 20.000 CR de lucro operacional em vendas.',goal:20000,type:'profit',reward:2500},
 {id:'reputation',title:'Nome respeitado',desc:'Alcance 65 pontos de reputação.',goal:65,type:'rep',reward:1500},
 {id:'capacity',title:'Ampliar horizontes',desc:'Tenha ao menos 3 vagas na garagem.',goal:3,type:'slots',reward:1000}
];
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.dealerProgress||typeof s.dealerProgress!=='object')s.dealerProgress={claimed:[],baseline:{sales:safe(s.sales),profit:safe(s.profit)}};
 const p=s.dealerProgress;
 if(!Array.isArray(p.claimed))p.claimed=[];
 if(!p.baseline||typeof p.baseline!=='object')p.baseline={sales:safe(s.sales),profit:safe(s.profit)};
 return p;
}
function progress(t,p){
 if(t.type==='sales')return Math.max(0,safe(s.sales)-safe(p.baseline.sales));
 if(t.type==='profit')return Math.max(0,safe(s.profit)-safe(p.baseline.profit));
 if(t.type==='rep')return safe(s.rep);
 if(t.type==='slots')return safe(s.slots);
 return 0;
}
const panel=document.createElement('section');panel.className='panel';panel.id='ae-dealer-progress';
panel.innerHTML='<h3>Contratos da concessionária</h3><p class="tiny">Objetivos permanentes de crescimento. Cada recompensa pode ser resgatada uma única vez.</p><div id="ae-dealer-contracts"></div>';
const css=document.createElement('style');css.textContent=`
#ae-dealer-progress{margin:12px 0;padding:14px}
#ae-dealer-progress h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
.ae-contract{border:1px solid #40576a;border-radius:10px;background:#20384b;padding:12px;margin:9px 0}
.ae-contract h4{font-size:13px;margin:0 0 6px}
.ae-contract p{font-size:12px;color:#c8d6df;margin:5px 0}
.ae-contract-meter{height:6px;background:#3c5363;border-radius:5px;overflow:hidden;margin:8px 0}
.ae-contract-meter i{display:block;height:100%;background:#e2b968}
.ae-contract-foot{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ae-contract-foot button{min-height:44px;font-size:12px}
`;document.head.append(css);
const dashboard=document.getElementById('ae-industrial-dashboard');
if(dashboard?.parentNode)dashboard.parentNode.insertBefore(panel,dashboard);else garage.prepend(panel);
function refresh(){
 const p=ensure();if(!p)return;
 const available=templates.filter(t=>!p.claimed.includes(t.id));
 const shown=available.slice(0,4);
 panel.querySelector('#ae-dealer-contracts').innerHTML=shown.map(t=>{
  const val=progress(t,p),done=val>=t.goal,pct=Math.min(100,Math.round(val/t.goal*100));
  return '<div class="ae-contract"><h4>'+t.title+'</h4><p>'+t.desc+'</p><div class="ae-contract-meter"><i style="width:'+pct+'%"></i></div><div class="ae-contract-foot"><span class="tiny">'+Math.min(t.goal,Math.floor(val)).toLocaleString('pt-BR')+' / '+t.goal.toLocaleString('pt-BR')+' · '+money(t.reward)+'</span><button type="button" data-claim="'+t.id+'" '+(done?'':'disabled')+'>'+(done?'Resgatar':'Em andamento')+'</button></div></div>';
 }).join('')||'<p class="tiny">Todos os contratos disponíveis foram concluídos.</p>';
}
panel.addEventListener('click',event=>{
 const btn=event.target.closest('button[data-claim]');if(!btn)return;
 const t=templates.find(x=>x.id===btn.dataset.claim),p=ensure();
 if(!t||!p||p.claimed.includes(t.id)||progress(t,p)<t.goal)return;
 p.claimed.push(t.id);s.cash+=t.reward;entry('Contrato concluído · '+t.title,t.reward);
 note('Contrato concluído: '+t.title+' · bônus '+money(t.reward));
 save();render();refresh();toast('Contrato concluído! +'+money(t.reward));
});
const previousAccept=acceptOffer;
acceptOffer=function(i){const before=safe(s.sales),result=previousAccept(i);if(safe(s.sales)>before)refresh();return result;};
const previousSeed=seed;seed=function(){previousSeed();ensure();refresh();};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
