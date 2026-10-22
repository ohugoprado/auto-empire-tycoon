/* Auto Empire Tycoon — business systems, v2.2. All additions stored inside the existing save. */
(function(){
'use strict';
const modes={casual:{demand:1.25},normal:{demand:1},hard:{demand:.78}};
const staffSystem=window.AEStaff;
const staffCatalog=staffSystem.catalog;
const milestones=[
{id:'first',title:'Primeira venda',test:()=>s.sales>=1,reward:300},
{id:'five',title:'Cinco vendas',test:()=>s.sales>=5,reward:700},
{id:'ten',title:'Dez vendas',test:()=>s.sales>=10,reward:1300},
{id:'reputation',title:'Boa reputação',test:()=>s.rep>=70,reward:400},
{id:'capital',title:'Reserva de caixa',test:()=>s.cash>=100000,reward:1000},
{id:'garage',title:'Primeira expansão',test:()=>s.slots>=3,reward:600},
{id:'team',title:'Equipe formada',test:()=>Object.values(s.empire.staff).some(Boolean),reward:300},
{id:'network',title:'Segunda unidade',test:()=>s.empire.branches>=2,reward:900}
];
const scenarios=[
{title:'Alta nos utilitários',kind:'SUV',impact:.11,description:'Famílias estão buscando veículos maiores.'},
{title:'Procura por compactos',kind:'Compacto',impact:.14,description:'Economia de combustível virou prioridade.'},
{title:'Mercado de sedãs aquecido',kind:'Sedã',impact:.10,description:'Frotistas ampliaram as compras.'},
{title:'Picapes em destaque',kind:'Picape',impact:.12,description:'A atividade regional elevou a procura.'},
{title:'Entusiasmo por esportivos',kind:'Esportivo',impact:.16,description:'Colecionadores voltaram ao mercado.'},
{title:'Mercado estável',kind:null,impact:0,description:'Não há tendência dominante no momento.'}
];
const cash=v=>fmt(Math.round(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const getMode=()=>modes[s.difficulty]||modes.normal;
function ensure(){
 if(!s||typeof s!=='object')return;
 if(!s.empire||typeof s.empire!=='object')s.empire={};
 const e=s.empire;
 staffSystem.ensure(s);
 if(!e.achievements||typeof e.achievements!=='object')e.achievements={};
 e.branches=clamp(Math.floor(Number(e.branches)||1),1,8);
 e.marketIndex=Number.isFinite(Number(e.marketIndex))?clamp(Number(e.marketIndex),.75,1.3):1;
 e.competitors=clamp(Math.floor(Number(e.competitors)||1),1,5);
 if(!e.trend||!scenarios.some(v=>v.title===e.trend.title))e.trend=scenarios[5];
 e.lastEventDay=Math.max(0,Math.floor(Number(e.lastEventDay)||0));
 e.totalWages=Number(e.totalWages)||0;
 e.progression=Number(e.progression)||0;
 if(!Array.isArray(e.completedChallenges))e.completedChallenges=[];
}
ensure();save();
const previousSeed=seed;
seed=function(){previousSeed();ensure();save()};
const originalTick=tickDay;
tickDay=function(){
 ensure();const before=s.day;const counts=new Map(s.stock.map(c=>[c.id,(c.offers||[]).length]));originalTick();if(s.day===before)return;
 const e=s.empire;
 // Market factors affect new offers. The single staff bonus is quoted when opened.
 for(const car of s.stock){const offers=car.offers||[],start=counts.get(car.id)||0;for(let j=start;j<offers.length;j++){const offer=offers[j];if(!offer||!Number.isFinite(Number(offer.amount)))continue;const trend=car.kind===e.trend.kind?e.trend.impact:0;const boost=e.marketIndex*(1+trend+(getMode().demand-1)*.13);offer.amount=Math.max(100,Math.round(offer.amount*boost/100)*100)}}
 // Economic cycles are deterministic within a campaign day; changes are announced in the event log.
 if(s.day%7===0){const ix=Math.floor(s.day/7)%scenarios.length;e.trend=scenarios[ix];e.marketIndex=clamp(e.marketIndex+((ix%3)-1)*.035,.82,1.18);note('Mercado: '+e.trend.title+'. '+e.trend.description)}
 if(s.day%15===0){e.competitors=1+(Math.floor(s.day/15)%4);note('Concorrência regional: '+e.competitors+' empresas disputando anúncios.')}
 const payroll=staffSystem.chargePayroll(s);
 if(payroll){entry('Folha de pagamento',-payroll);note('Salários mensais pagos: '+cash(payroll))}
 // Rival dealerships can acquire a listing; stock owned by the player is never taken.
 if(s.day%5===0&&s.market.length>3){const index=Math.floor(Math.random()*s.market.length);const removed=s.market.splice(index,1)[0];if(removed)note('Concorrente adquiriu '+removed.name+' antes de você.')}
 checkMilestones();save();
};
function checkMilestones(){
 ensure();for(const m of milestones){if(!s.empire.achievements[m.id]&&m.test()){s.empire.achievements[m.id]=s.day;s.cash+=m.reward;entry('Conquista · '+m.title,m.reward);note('Conquista desbloqueada: '+m.title+' (+'+cash(m.reward)+')')}}
}
const originalRepair=repair;
repair=function(id){
 ensure();const c=s.stock.find(v=>v.id===id);if(!c)return;
 const rate=staffSystem.benefits(s).repairDiscount;
 if(!rate)return originalRepair(id);
 const original=c.repair;
 const discounted=Math.max(250,Math.round(Math.max(0,original)*.7*(1-rate)));
 if(c.condition>=99)return toast('Veículo já está revisado');
 if(s.cash<discounted)return toast('Caixa insuficiente');
 if(!confirm('Reparar '+c.name+' por '+cash(discounted)+'?'))return;
 s.cash-=discounted;c.spent=(Number(c.spent)||0)+discounted;
 c.condition=Math.min(100,c.condition+rand(13,26));
 c.repair=Math.round(original*.4);
 entry('Reparos · '+c.name,-discounted);
 note('Revisão de '+c.name+' concluída com economia de '+cash(Math.max(0,Math.max(250,Math.round(original*.7))-discounted)));
 save();render();toast('Reparo realizado');
};
const originalRefresh=refreshPaid;
refreshPaid=function(){
 ensure();const discount=staffSystem.benefits(s).researchDiscount;
 if(!discount)return originalRefresh();
 const cost=100-discount;
 if(s.cash<cost)return toast('Caixa insuficiente');
 s.cash-=cost;entry('Pesquisa de mercado',-cost);
 populate();note('Mercado atualizado por '+cash(cost)+' com desconto de avaliador');
 save();render();toast('Novos anúncios disponíveis');
};
const originalOffers=offersDialog;
offersDialog=function(id){
 ensure();const c=s.stock.find(v=>v.id===id);if(!c)return;
 if((c.offers||[]).reduce((changed,offer)=>staffSystem.prepareOffer(s,offer)||changed,false))save();
 // Profiles are stable per proposal, including legacy proposals.
 (c.offers||[]).forEach((o,i)=>{if(!o.profile)o.profile=['Pragmático','Entusiasta','Cauteloso','Negociador'][Math.abs(Math.floor(Number(o.amount)||i))%4]});
 originalOffers(id);
 const body=document.getElementById('modalbody');
 const costs=window.AETradeMath;
 const blocks=(c.offers||[]).map((o,i)=>{
  const a=costs?costs.analyze(c,o.amount):{gross:o.amount-c.bought-c.spent,margin:0,roi:0,discount:0};
  const color=a.gross>=0?'#9ae0b5':'#ffa69e';
  return '<div class="ae-proposal-detail"><b>'+esc(o.profile)+'</b><span style="color:'+color+'">Lucro bruto: '+cash(a.gross)+' · Margem: '+a.margin.toFixed(1).replace('.',',')+'%</span><small>ROI: '+a.roi.toFixed(1).replace('.',',')+'% · Desconto pedido: '+a.discount.toFixed(1).replace('.',',')+'%</small><button type="button" class="ghost" data-counter-index="'+i+'">Sugerir contraproposta</button></div>';
 }).join('');
 if(blocks){const box=document.createElement('div');box.innerHTML='<h3>Leitura das propostas</h3>'+blocks;body.append(box);box.addEventListener('click',event=>{const b=event.target.closest('[data-counter-index]');if(!b)return;const i=Number(b.dataset.counterIndex);counterOffer(i)})}
};
function counterOffer(i){
 const c=s.stock.find(v=>v.id===modalCar),o=c?.offers?.[i];if(!o)return;
 const proposed=Math.round(Math.max(o.amount*1.05,(Number(c.bought)||0)+(Number(c.spent)||0))*1.02/100)*100;
 if(!Number.isFinite(proposed)||proposed<=o.amount)return toast('Esta proposta já cobre o preço-alvo.');
 // No guaranteed acceptance: profile-specific response, one counter per offer.
 if(o.countered)return toast('Você já enviou uma contraproposta a este cliente.');
 o.countered=true;
 const odds={Pragmático:.28,Entusiasta:.6,Cauteloso:.18,Negociador:.35};
 if(Math.random()<(odds[o.profile]||.3)){o.amount=proposed;note(o.name+' aceitou a contraproposta de '+cash(proposed));toast('Contraproposta aceita!')}
 else{note(o.name+' recusou a contraproposta. Oferta original mantida.');toast('Cliente recusou; proposta original mantida.')}
 save();offersDialog(c.id);
}
const originalAccept=acceptOffer;
acceptOffer=function(i){const c=s.stock.find(v=>v.id===modalCar);if(!c)return;const offer=c.offers?.[i];if(offer)staffSystem.prepareOffer(s,offer);if(offer&&window.AETradeMath){const a=window.AETradeMath.analyze(c,offer.amount);if(a.gross<0&&!confirm('Esta venda terá prejuízo bruto de '+cash(-a.gross)+'. Deseja continuar?'))return}const before=s.sales;originalAccept(i);if(s.sales>before){const reputation=staffSystem.benefits(s).saleReputation;if(reputation){s.rep=Math.min(100,s.rep+reputation);note('Marketing da equipe antiga: reputação fortalecida')}checkMilestones();save();render()}};
const originalExpand=expand;
expand=function(){const before=s.slots;originalExpand();if(s.slots>before){checkMilestones();save()}};
const originalBuy=submitBid;
submitBid=function(){const before=s.stock.length;originalBuy();if(s.stock.length>before){s.empire.progression++;save()}};
const panel=document.createElement('section');panel.id='ae-empire-panel';panel.className='panel';
panel.innerHTML='<div class="ae-empire-heading"><h3>PLANO DE CRESCIMENTO</h3><span id="ae-empire-level"></span></div><div class="ae-empire-tabs"><button type="button" data-empire-tab="objectives">Objetivos</button><button type="button" data-empire-tab="staff">Equipe</button><button type="button" data-empire-tab="market">Mercado</button><button type="button" data-empire-tab="expansion">Expansão</button></div><div id="ae-empire-content"></div>';
const target=document.getElementById('garage');
if(target)target.append(panel);
let active='objectives';
const style=document.createElement('style');
style.textContent=`
#ae-empire-panel{margin:12px 0;padding:14px;background:#112836;border:1px solid #456475}
#ae-empire-panel h3{font-size:13px;color:#f5d48e;letter-spacing:.8px;margin:0}
.ae-empire-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
#ae-empire-level{font-size:11px;color:#b8d2dd}
.ae-empire-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:12px}
.ae-empire-tabs button{font-size:11px;min-height:42px;padding:5px 2px;background:#213d4c;color:#c4d6dd;border:1px solid #436475;border-radius:8px}
.ae-empire-tabs button.active{background:#f2d08d;color:#182b34;font-weight:900}
.ae-empire-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 0;border-top:1px solid #365260}
.ae-empire-row:first-child{border-top:0}
.ae-empire-row b{display:block;font-size:13px}
.ae-empire-row small{display:block;font-size:11px;color:#b4cbd5;margin-top:3px}
.ae-empire-row button{min-height:38px;flex:0 0 auto;font-size:11px}
.ae-proposal-detail{border:1px solid #4d6875;border-radius:10px;padding:10px;margin:9px 0;display:grid;gap:5px;font-size:12px}
.ae-proposal-detail small{color:#b6cbd3}
.ae-proposal-detail button{justify-self:start;min-height:38px}
@media(max-width:380px){.ae-empire-tabs button{font-size:10px}}
`;
document.head.appendChild(style);
function renderPanel(){
 ensure();const e=s.empire;
 const achieved=milestones.filter(m=>e.achievements[m.id]).length;
 panel.querySelector('#ae-empire-level').textContent=achieved+'/'+milestones.length+' marcos';
 panel.querySelectorAll('[data-empire-tab]').forEach(b=>b.classList.toggle('active',b.dataset.empireTab===active));
 let html='';
 if(active==='objectives')html='<p class="tiny">Marcos permanentes, sem prazos e sem punição por ficar offline.</p>'+milestones.map(m=>'<div class="ae-empire-row"><div><b>'+(e.achievements[m.id]?'✓ ':'○ ')+m.title+'</b><small>'+(e.achievements[m.id]?'Concluído no dia '+e.achievements[m.id]:'Recompensa: '+cash(m.reward))+'</small></div></div>').join('');
 if(active==='staff')html='<p class="tiny">Uma única equipe. Salários cobrados a cada 30 dias simulados. Contratação limitada a '+staffSystem.limit+' por função; excedentes antigos são preservados.</p>'+Object.entries(staffCatalog).map(([id,v])=>'<div class="ae-empire-row"><div><b>'+v.label+' · '+e.staff[id]+' pessoa(s)</b><small>'+v.benefit+' · salário mensal '+cash(v.cost)+' por pessoa · contratação '+cash(v.hireFee)+'</small></div><button type="button" data-hire="'+id+'" '+(e.staff[id]>=staffSystem.limit?'disabled':'')+'>Contratar</button></div>').join('')+'<div class="ae-empire-row"><b>Folha mensal</b><strong>'+cash(staffSystem.monthlyPayroll(s))+'</strong></div>'+(Object.values(e.staffMigration?.converted||{}).some(Boolean)?'<p class="tiny">Equipe antiga integrada sem nova cobrança. Os benefícios adquiridos de mecânico, vendedor e marketing foram preservados, sem acumular o mesmo desconto duas vezes.</p>':'');
 if(active==='market')html='<div class="ae-empire-row"><div><b>'+esc(e.trend.title)+'</b><small>'+esc(e.trend.description)+'</small></div></div><div class="ae-empire-row"><div><b>Índice econômico: '+Math.round(e.marketIndex*100)+'</b><small>Concorrentes ativos: '+e.competitors+'</small></div></div><p class="tiny">Tendências mudam a cada 7 dias; a concorrência pode retirar anúncios do mercado.</p>';
 if(active==='expansion')html='<div class="ae-empire-row"><div><b>Unidades: '+e.branches+'/8</b><small>Nova unidade: '+cash(60000*e.branches)+' · +2 vagas</small></div><button type="button" data-expand-branch '+(e.branches>=8?'disabled':'')+'>Expandir</button></div><p class="tiny">Unidades adicionais aumentam a capacidade do estoque, mas exigem investimento.</p>';
 panel.querySelector('#ae-empire-content').innerHTML=html;
}
panel.addEventListener('click',ev=>{
 const tabButton=ev.target.closest('[data-empire-tab]');
 if(tabButton){active=tabButton.dataset.empireTab;renderPanel();return}
 const hire=ev.target.closest('[data-hire]');
 if(hire){const id=hire.dataset.hire,v=staffCatalog[id];if(!v)return;ensure();if(s.empire.staff[id]>=staffSystem.limit)return toast('Limite de funcionários');const fee=v.hireFee;if(s.cash<fee)return toast('Caixa insuficiente');if(!confirm('Contratar '+v.label+' por '+cash(fee)+' de custo inicial e '+cash(v.cost)+'/mês?'))return;s.cash-=fee;s.empire.staff[id]++;entry('Contratação · '+v.label,-fee);note('Novo funcionário: '+v.label);checkMilestones();save();render();return}
 if(ev.target.closest('[data-expand-branch]')){ensure();const e=s.empire,cost=60000*e.branches;if(e.branches>=8||s.cash<cost)return toast('Capital insuficiente ou limite de unidades');if(!confirm('Abrir nova unidade por '+cash(cost)+'?'))return;s.cash-=cost;e.branches++;s.slots+=2;entry('Nova unidade',-cost);note('Nova unidade inaugurada!');checkMilestones();save();render()}
});
const previousRender=render;
render=function(){previousRender();renderPanel()};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(renderPanel);
checkMilestones();renderPanel();
})();
