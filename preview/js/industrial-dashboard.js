/* Auto Empire Tycoon — Alpha 5.7: industrial analytics and filtering. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const panel=document.createElement('section');panel.id='ae-industrial-dashboard';panel.className='panel';
panel.innerHTML='<h3>Central de operações industriais</h3><p class="tiny">Produção, entregas e despesas da rede em um só lugar.</p><div id="ae-industrial-kpis"></div><div class="ae-id-controls"><label for="ae-id-filter">Exibir fábricas</label><select id="ae-id-filter"><option value="all">Todas</option><option value="busy">Em produção</option><option value="available">Com vagas</option><option value="delayed">Com atrasos</option><option value="blocked">Sem equipe operacional</option><option value="saturated">Capacidade esgotada</option></select><label for="ae-id-sort">Ordenar</label><select id="ae-id-sort"><option value="name">Nome</option><option value="occupation">Ocupação</option><option value="delivery">Próxima entrega</option><option value="free">Vagas livres</option><option value="backlog">Mais ordens</option></select></div><div id="ae-industrial-advice" role="status"></div><div id="ae-industrial-market" role="status"></div><div id="ae-industrial-models"></div><div id="ae-industrial-policy"></div><div id="ae-industrial-lines"></div><h4>Contratos industriais</h4><div id="ae-industrial-contracts"></div><h4>Últimas entregas concluídas</h4><div id="ae-industrial-history"></div><p class="tiny" id="ae-industrial-note"></p>';
const style=document.createElement('style');style.textContent=`
#ae-industrial-dashboard{padding:14px;margin:12px 0}
#ae-industrial-dashboard h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-industrial-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}
.ae-id-kpi{background:#20384b;border-radius:9px;padding:10px;min-width:0}
.ae-id-kpi small{display:block;font-size:11px;color:#c3d4df}
.ae-id-kpi strong{display:block;font-size:16px;margin-top:5px;overflow-wrap:anywhere}
.ae-id-controls{display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;margin:12px 0}
.ae-id-controls label{font-size:11px;color:#c3d4df}
.ae-id-controls select{width:100%;min-width:0;min-height:44px;border-radius:8px;background:#20384b;color:#f3f6f8;border:1px solid #547086;padding:8px}
.ae-id-line{padding:12px 0;border-top:1px solid #385064}
#ae-industrial-advice{font-size:12px;line-height:1.6;padding:9px 0;color:#e8d6ae}
#ae-industrial-market{font-size:12px;line-height:1.6;padding:10px;margin:8px 0;border:1px solid #385064;border-radius:9px;color:#d9e5ee}
#ae-industrial-models{font-size:12px;line-height:1.6;margin:10px 0}#ae-industrial-models h4{font-size:13px;margin:10px 0}#ae-industrial-models .ae-id-model{border-top:1px solid #385064;padding:9px 0}#ae-industrial-models .ae-id-model p{margin:3px 0;color:#c3d4df}#ae-industrial-policy{padding:10px;border:1px solid #385064;border-radius:9px;margin:10px 0;font-size:12px}#ae-industrial-policy label{display:flex;align-items:center;gap:8px;margin:8px 0}#ae-industrial-policy input{width:72px;min-height:40px;background:#20384b;border:1px solid #547086;border-radius:7px;color:#fff;padding:6px}#ae-industrial-policy button{min-height:42px}
.ae-id-line h4{margin:0 0 6px;font-size:13px}
.ae-id-line p{font-size:12px;color:#c3d4df;margin:5px 0}
.ae-id-progress{height:7px;background:#31495b;border-radius:6px;overflow:hidden;margin-top:8px}
.ae-id-progress span{display:block;height:100%;background:#e3bb76}
.ae-id-job{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:6px 0}
.ae-id-job span:last-child{text-align:right;font-variant-numeric:tabular-nums}
`;document.head.append(style);
const network=document.getElementById('ae-industrial-network');
if(network?.parentNode)network.parentNode.insertBefore(panel,network);else garage.append(panel);
function refresh(){
 const economy=s?.empire?.economy;if(!economy)return;
 const factory=economy.factory||{},jobs=Array.isArray(factory.queue)?factory.queue:[];
 const contracts=Array.isArray(factory.industrialOrders)?factory.industrialOrders.filter(o=>Number(o.remaining)>0||Number(o.delivered)<Number(o.total)):[];
 const plants=Array.isArray(economy.plantNetwork?.plants)?economy.plantNetwork.plants:[];
 const workforce=window.AEFactoryWorkforce;
 const plantLine=(id,name,ref)=>{const info=workforce?.read(ref);const level=Math.max(1,num(ref.level));return {id,name,level,staff:info?.staff??null,capacity:info?.lines??level*2,baseCapacity:info?.baseLines??level*2,payroll:info?.daily??0};};
 const lines=[plantLine(null,'Fábrica principal',factory),...plants.map(p=>plantLine(p.id,p.name||'Unidade industrial',p))];
 const load=new Map(),jobsByPlant=new Map();for(const job of jobs){if(!job||typeof job!=='object')continue;const id=job.plantId==null?'main':String(job.plantId);load.set(id,(load.get(id)||0)+1);if(!jobsByPlant.has(id))jobsByPlant.set(id,[]);jobsByPlant.get(id).push(job);}
 const count=line=>load.get(line.id===null?'main':String(line.id))||0;
 panel.querySelector('#ae-industrial-contracts').innerHTML=contracts.map(o=>{
  const total=Math.max(1,num(o.total)),remaining=Math.max(0,num(o.remaining)),started=total-remaining,delivered=Math.max(0,num(o.delivered));
  const plant=o.plantId!=null?plants.find(p=>String(p.id)===String(o.plantId)):factory;
  const capacity=plant?(workforce?.read(plant).lines??Math.max(1,num(plant.level))*2):0;
  const cycles=capacity>0?Math.ceil(remaining/capacity):null;
  const eta=cycles===null?null:cycles*Math.max(2,num(o.cycleDays)||7);
  return '<div class="ae-id-line"><h4>'+esc(o.model)+' · '+delivered+'/'+total+' entregues</h4><div class="ae-id-progress"><span style="width:'+Math.round(delivered/total*100)+'%"></span></div><p>Restam '+remaining+' veículos · '+(o.plantId!=null?esc(plant?.name||'Unidade industrial indisponível'):'Fábrica principal')+' · prazo mínimo estimado: '+eta+' dias de jogo</p><p>Investimento antecipado: '+money(total*num(o.cost))+'</p></div>';
 }).join('')||'<p class="tiny">Sem contratos aguardando montagem. Verifique as linhas acima para veículos já em produção.</p>';
 const history=(Array.isArray(factory.completedIndustrialOrders)?factory.completedIndustrialOrders:[]).slice(-5).reverse();
 panel.querySelector('#ae-industrial-history').innerHTML=history.map(o=>'<div class="ae-id-line"><p><b>'+esc(o.model)+'</b> · '+num(o.delivered)+' veículos · concluído no dia '+num(o.completedDay)+' · investimento '+money(num(o.investment))+'</p></div>').join('')||'<p class="tiny">Nenhum contrato industrial concluído ainda.</p>';
 const payroll=plants.reduce((sum,p)=>sum+Math.max(0,num(p.staff))*1100*Math.max(1,num(p.level)),0);
 const invested=jobs.reduce((sum,j)=>sum+Math.max(0,num(j?.cost)),0);
 const pendingCars=contracts.reduce((sum,o)=>sum+Math.max(0,num(o.remaining)),0);
 const warehouseCars=Array.isArray(factory.warehouseCars)?factory.warehouseCars.length:0;
 const dealerCars=Array.isArray(s.stock)?s.stock.length:0;
 const stockByKind=new Map();for(const car of [...(Array.isArray(s.stock)?s.stock:[]),...(Array.isArray(factory.warehouseCars)?factory.warehouseCars:[])]){if(!car||typeof car!=='object')continue;const kind=String(car.kind||'Outros');stockByKind.set(kind,(stockByKind.get(kind)||0)+1);}
 const market=s.empire||{},index=Number.isFinite(Number(market.marketIndex))?Number(market.marketIndex):1,competition=Number.isFinite(Number(market.competitors))?Math.max(1,Number(market.competitors)):1;
 const trend=market.trend&&typeof market.trend==='object'?market.trend:null;
 const hotKind=trend?.kind?String(trend.kind):null;
 const pressure=index*(1-Math.min(.25,(competition-1)*.025));
 const marketStatus=pressure>=1.06?'Favorável':pressure<.91?'Desafiador':'Estável';
 const hotStock=hotKind?(stockByKind.get(hotKind)||0):0;
 const stockSummary=[...stockByKind].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([kind,count])=>esc(kind)+': '+count).join(' · ');
 panel.querySelector('#ae-industrial-market').innerHTML='<b>Leitura de mercado: '+marketStatus+'</b> · índice '+Math.round(index*100)+' · concorrentes '+competition+(hotKind?' · tendência '+esc(hotKind):'')+'<p>Estoque por segmento: '+(stockSummary||'sem veículos')+'. '+(hotKind&&hotStock===0?'Há procura favorável por '+esc(hotKind)+', mas não há veículos desse segmento no estoque.':hotKind&&hotStock>0?'Segmento em destaque: '+hotStock+' veículo(s) disponíveis ou no pátio.':'Compare o estoque com os custos antes de abrir novas ordens.')+'</p><p class="tiny">Indicadores orientativos, não previsão garantida de vendas.</p>';
 const delayed=jobs.filter(j=>j?.due!=null&&Number.isFinite(Number(j.due))&&Number(j.due)<num(s.day)).length;
 const upcoming=jobs.filter(j=>j?.due!=null&&Number.isFinite(Number(j.due))&&Number(j.due)>=num(s.day)).reduce((best,j)=>!best||num(j.due)<num(best.due)?j:best,null);
 const activeLines=lines.filter(l=>l.id!==null||factory.opened);
 const totalCapacity=activeLines.reduce((sum,l)=>sum+l.capacity,0);
 const utilization=totalCapacity?Math.round(jobs.length/totalCapacity*100):0;
 const freeLines=activeLines.reduce((sum,l)=>sum+Math.max(0,l.capacity-count(l)),0);
 const blocked=activeLines.filter(l=>l.capacity===0&&count(l)>0).length;
 const overloaded=activeLines.filter(l=>l.capacity>0&&count(l)>l.capacity).length;
 const dailyPayroll=activeLines.reduce((sum,l)=>sum+l.payroll,0);
 const metrics=[['Em produção',jobs.length],['Aguardando montagem',pendingCars],['No pátio',warehouseCars],['Na concessionária',dealerCars],['Custos operacionais acumulados',money(factory.overheadSpent||0)],['Capital em produção',money(invested)],['Folha mensal adicional',money(payroll)],['Ordens atrasadas',delayed],['Capacidade ocupada',totalCapacity?utilization+'%':'Sem linhas'],['Linhas livres',freeLines],['Ordens por linha',totalCapacity?(jobs.length/totalCapacity).toFixed(2):'—'],['Folha industrial gerenciada/dia',money(dailyPayroll)],['Fábricas com gargalo',blocked+overloaded],['Custo médio por ordem',jobs.length?money(invested/jobs.length):'—']];
 const modelStats=new Map();
 const addModel=(car,where)=>{if(!car||typeof car!=='object')return;const name=String(car.name||car.model||'Modelo não identificado');let m=modelStats.get(name);if(!m){m={name,kind:String(car.kind||''),stock:0,warehouse:0,production:0,unitCost:null,ask:null,offers:0};modelStats.set(name,m);}if(!m.kind&&car.kind)m.kind=String(car.kind);if(where==='warehouse')m.warehouse++;else m.stock++;const price=Number(car.price||car.ask);if(Number.isFinite(price)&&price>0){m.askTotal=(m.askTotal||0)+price;m.askCount=(m.askCount||0)+1;m.ask=m.askTotal/m.askCount;}const cost=Number(car.bought??car.cost);if(Number.isFinite(cost)&&cost>0){m.costTotal=(m.costTotal||0)+cost;m.costCount=(m.costCount||0)+1;m.unitCost=m.costTotal/m.costCount;}if(Array.isArray(car.offers))m.offers+=car.offers.length;};
 for(const car of (Array.isArray(s.stock)?s.stock:[]))addModel(car,'stock');
 for(const car of (Array.isArray(factory.warehouseCars)?factory.warehouseCars:[]))addModel(car,'warehouse');
 for(const order of contracts){if(!order||typeof order!=='object')continue;const name=String(order.model||'Modelo não identificado');let m=modelStats.get(name);if(!m){m={name,kind:'',stock:0,warehouse:0,production:0,unitCost:null,ask:null,offers:0};modelStats.set(name,m);}m.production+=Math.max(0,num(order.remaining));const cost=Number(order.cost);if(Number.isFinite(cost)&&cost>0&&m.unitCost==null)m.unitCost=cost;}
 const modelRows=[...modelStats.values()].sort((a,b)=>(b.stock+b.warehouse+b.production)-(a.stock+a.warehouse+a.production)).slice(0,12);
 panel.querySelector('#ae-industrial-models').innerHTML='<h4>Planejamento por modelo</h4>'+(modelRows.length?modelRows.map(m=>{const inventory=m.stock+m.warehouse,coverage=m.offers/inventory||0,trendBoost=hotKind&&m.kind===hotKind;const margin=m.ask!=null&&m.unitCost!=null?Math.round((m.ask-m.unitCost)/m.ask*100):null;const status=inventory>=8&&coverage<.25?'Estoque elevado: avalie reduzir a produção':inventory>=4&&m.offers===0?'Pouca procura observada: monitore antes de ampliar':trendBoost&&inventory<3?'Segmento aquecido e estoque baixo':m.production>inventory*2&&inventory>=3?'Produção acima do estoque disponível: acompanhe vendas':'Acompanhar desempenho';return '<div class="ae-id-model"><b>'+esc(m.name)+'</b><p>Concessionária '+m.stock+' · pátio '+m.warehouse+' · aguardando montagem '+m.production+' · propostas abertas '+m.offers+'</p><p>'+(margin===null?'Margem estimada indisponível (faltam preço e custo comparáveis)':'Margem bruta indicativa '+margin+'% (sem despesas indiretas)')+' · '+esc(status)+'</p></div>';}).join(''):'<p class="tiny">Sem modelos disponíveis para análise.</p>')+'<p class="tiny">Sinais baseados no estoque atual e nas propostas abertas; não representam vendas realizadas nem garantem procura futura.</p>';
 const policy=economy.productionPolicy&&typeof economy.productionPolicy==='object'?economy.productionPolicy:{};
 const target=Number.isFinite(Number(policy.target))?Math.max(0,Math.min(100,Math.floor(Number(policy.target)))):3;
 const reserve=Number.isFinite(Number(policy.reserve))?Math.max(0,Math.min(95,Math.floor(Number(policy.reserve)))):25;
 const cashBalance=Number(s.cash),reserveAmount=Number.isFinite(cashBalance)?Math.max(0,Math.round(cashBalance*reserve/100)):0;
 const freeCapacity=Math.max(0,activeLines.reduce((sum,l)=>sum+Math.max(0,l.capacity-count(l)),0));
 const spendable=Math.max(0,(Number.isFinite(cashBalance)?cashBalance:0)-reserveAmount);
 let remainingBudget=spendable,remainingLines=freeCapacity;
 const proposals=modelRows.filter(m=>target>0&&m.stock+m.warehouse+m.production<target).map(m=>{
  const shortfall=Math.max(0,target-m.stock-m.warehouse-m.production);
  const unitCost=m.unitCost!=null&&Number.isFinite(m.unitCost)&&m.unitCost>0?m.unitCost:null;
  const margin=m.ask!=null&&unitCost!=null?(m.ask-unitCost)/m.ask:null;
  const risk=m.stock+m.warehouse>=4&&m.offers===0||m.stock+m.warehouse>=Math.max(1,target)&&m.offers===0;
  return {...m,shortfall,unitCost,margin,risk};
 }).sort((a,b)=>Number(a.risk)-Number(b.risk)||(b.margin??-.5)-(a.margin??-.5)||a.name.localeCompare(b.name,'pt-BR'));
 const recommendations=proposals.map(m=>{
  let suggested=0,reason='';
  if(m.risk)reason='Estoque sem propostas: aguardar';
  else if(m.margin!==null&&m.margin<=0)reason='Margem bruta não positiva';
  else if(m.unitCost===null)reason='Custo unitário desconhecido';
  else if(!Number.isFinite(m.unitCost)||m.unitCost<=0)reason='Custo inválido';
  else if(remainingLines===0)reason='Sem linhas livres';
  else if(remainingBudget<m.unitCost)reason='Reserva financeira limita o lote';
  else{suggested=Math.min(m.shortfall,remainingLines,Math.floor(remainingBudget/m.unitCost));remainingLines-=suggested;remainingBudget-=suggested*m.unitCost;reason=suggested<m.shortfall?'Lote parcial sugerido':'Meta atendida pelo lote sugerido';}
  return {...m,suggested,reason};
 });
 const opportunities=recommendations.filter(m=>m.suggested>0);
 const overstock=modelRows.filter(m=>m.stock+m.warehouse>target*2&&m.offers===0);
 const policyPanel=panel.querySelector('#ae-industrial-policy');
 if(!policyPanel.contains(document.activeElement)){
 policyPanel.innerHTML='<h4>Política industrial assistida</h4><p>Meta de estoque e reserva de caixa para orientar os próximos lotes. Nenhuma produção é iniciada automaticamente.</p><label>Meta por modelo <input id="ae-policy-target" type="number" min="0" max="100" step="1" value="'+target+'"></label><label>Reserva de caixa (%) <input id="ae-policy-reserve" type="number" min="0" max="95" step="1" value="'+reserve+'"></label><button type="button" id="ae-policy-save">Salvar política</button><p>Reserva estimada '+money(reserveAmount)+' · '+opportunities.length+' modelo(s) abaixo da meta com custo/preço compatível ou não informado · '+overstock.length+' com estoque elevado sem propostas.</p><p>Linhas livres: '+freeCapacity+' · orçamento acima da reserva: '+money(spendable)+' · lote sugerido: '+recommendations.reduce((sum,m)=>sum+m.suggested,0)+' veículo(s).</p>'+(recommendations.length?recommendations.slice(0,8).map(m=>'<div class="ae-id-model"><b>'+esc(m.name)+'</b><p>Faltam '+m.shortfall+' para a meta · sugestão '+m.suggested+' · '+esc(m.reason)+(m.suggested?' · investimento estimado '+money(m.suggested*m.unitCost):'')+'</p></div>').join(''):'')+'<p class="tiny">Estimativas: custos e linhas atuais. Não reserva recursos, não inicia ordens nem garante vendas.</p>';
 }
 panel.querySelector('#ae-industrial-kpis').innerHTML=metrics.map(([label,value])=>'<div class="ae-id-kpi"><small>'+label+'</small><strong>'+value+'</strong></div>').join('');
 panel.querySelector('#ae-industrial-advice').textContent=blocked?'Prioridade: '+blocked+' fábrica(s) possuem ordens, mas nenhuma linha operacional. Revise funcionários e turnos antes de investir em expansão.':overloaded?'Atenção: '+overloaded+' fábrica(s) com mais ordens do que linhas disponíveis. Confira equipe e prazos.':freeLines===0&&jobs.length?'Todas as linhas estão ocupadas. Compare demanda, estoque e caixa antes de ampliar.':freeLines>0?'Há '+freeLines+' linha(s) livres na rede. Aproveite a capacidade existente antes de ampliar instalações.':'Sem ordens industriais ativas.';
 const ownJobs=line=>jobsByPlant.get(line.id===null?'main':String(line.id))||[];
 const filter=panel.querySelector('#ae-id-filter').value,sort=panel.querySelector('#ae-id-sort').value;
 const eligible=lines.filter(l=>l.id!==null||factory.opened).filter(line=>{
  const own=ownJobs(line);
  if(filter==='blocked')return line.capacity===0&&own.length>0;
  if(filter==='saturated')return line.capacity>0&&own.length>=line.capacity;
  if(filter==='busy')return own.length>0;
  if(filter==='available')return line.capacity>own.length;
  if(filter==='delayed')return own.some(j=>j?.due!=null&&Number.isFinite(Number(j.due))&&Number(j.due)<num(s.day));
  return true;
 });
 const nextDue=line=>ownJobs(line).reduce((min,j)=>j?.due!=null&&Number.isFinite(Number(j.due))?Math.min(min,Number(j.due)):min,Infinity);
 eligible.sort((a,b)=>sort==='occupation'?count(b)/Math.max(1,b.capacity)-count(a)/Math.max(1,a.capacity):sort==='free'?Math.max(0,b.capacity-count(b))-Math.max(0,a.capacity-count(a)):sort==='backlog'?count(b)-count(a):sort==='delivery'?nextDue(a)-nextDue(b):String(a.name).localeCompare(String(b.name),'pt-BR'));
 panel.querySelector('#ae-industrial-lines').innerHTML=eligible.map(line=>{
  const own=ownJobs(line);
  const pct=line.capacity?Math.min(100,Math.round(own.length/line.capacity*100)):0;
  const details=own.slice().sort((a,b)=>(a?.due==null?Infinity:num(a.due))-(b?.due==null?Infinity:num(b.due))).slice(0,5).map(j=>{
   const remaining=j?.due!=null&&Number.isFinite(Number(j.due))?Math.round(Number(j.due)-num(s.day)):null;
   return '<div class="ae-id-job"><span>'+esc(j.model||'Veículo')+'</span><span>'+(remaining===null?'Prazo indefinido':remaining<0?'Atrasado '+Math.abs(remaining)+' d':remaining===0?'Entrega hoje':'Em '+remaining+' d')+'</span></div>';
  }).join('');
  return '<div class="ae-id-line"><h4>'+esc(line.name)+'</h4><p>Ocupação '+own.length+'/'+line.capacity+' · Livres '+Math.max(0,line.capacity-own.length)+' · Nível '+line.level+' · Capacidade base '+line.baseCapacity+(line.staff===null?'':' · Equipe '+line.staff)+'</p><div class="ae-id-progress"><span style="width:'+pct+'%"></span></div>'+(details||'<p>Sem ordens em andamento.</p>')+(own.length>5?'<p>Mais '+(own.length-5)+' ordem(ns).</p>':'')+'</div>';
 }).join('')||'<p class="tiny">Nenhuma fábrica corresponde ao filtro selecionado.</p>';
 panel.querySelector('#ae-industrial-note').textContent=upcoming?'Próxima entrega prevista: dia '+Math.floor(num(upcoming.due))+'. Prazos podem mudar por crises ou falta de espaço no estoque.':'Nenhuma entrega programada. Os valores representam custos já comprometidos e salários futuros, não uma previsão de receita.';
}
panel.querySelector('#ae-industrial-policy').addEventListener('click',event=>{
 if(event.target?.id!=='ae-policy-save')return;
 const targetInput=panel.querySelector('#ae-policy-target'),reserveInput=panel.querySelector('#ae-policy-reserve');
 const target=Number(targetInput?.value),reserve=Number(reserveInput?.value);
 if(!Number.isInteger(target)||target<0||target>100||!Number.isInteger(reserve)||reserve<0||reserve>95)return toast('Defina uma meta de 0 a 100 e uma reserva de 0% a 95%.');
 const economy=s?.empire?.economy;if(!economy||economy.bankrupt)return toast('Política indisponível nesta campanha.');
 economy.productionPolicy={target,reserve};save();refresh();toast('Política industrial salva.');
});
panel.querySelector('#ae-id-filter').addEventListener('change',refresh);
panel.querySelector('#ae-id-sort').addEventListener('change',refresh);
const previousTick=tickDay;
tickDay=function(){const before=s.day,result=previousTick();if(s.day!==before)refresh();return result;};
const previousSeed=seed;seed=function(){previousSeed();refresh();};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
const observer=new MutationObserver(()=>{if(panel.isConnected)refresh();});
const list=document.getElementById('ae-plant-list');if(list)observer.observe(list,{childList:true});
refresh();
})();
