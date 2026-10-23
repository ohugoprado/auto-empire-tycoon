/* Auto Empire Tycoon Alpha 2.5 — fictional economic crises, insolvency, and manufacturing. */
(function(){
'use strict';
const cities=window.AEWorld?.cities||[];
const byId=id=>cities.find(c=>c.id===id);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const money=n=>fmt(Math.round(n));
const crisisTypes=[
 {id:'stable',name:'Estabilidade',duration:0,demand:1,cost:1,description:'Mercado funcionando normalmente.'},
 {id:'inflation',name:'Choque inflacionário',duration:15,demand:.79,cost:1.18,description:'Custos e preços sobem; famílias adiam compras.'},
 {id:'political',name:'Crise política',duration:18,demand:.65,cost:1.12,description:'Incerteza regulatória paralisa investimentos.'},
 {id:'war',name:'Conflito armado regional',duration:24,demand:.04,cost:1.35,description:'Transporte e demanda ficam quase paralisados na região afetada.'},
 {id:'energy',name:'Crise energética',duration:14,demand:.72,cost:1.22,description:'Combustível e logística encarecem.'},
 {id:'supply',name:'Ruptura de suprimentos',duration:17,demand:.84,cost:1.3,description:'Fábricas enfrentam falta de peças.'}
];
const currencyByCountry={'Brasil':'BRL','Estados Unidos':'USD','Reino Unido':'GBP','França':'EUR','Alemanha':'EUR','Japão':'JPY','Coreia do Sul':'KRW','Emirados Árabes Unidos':'AED','Singapura':'SGD','Austrália':'AUD','Canadá':'CAD','México':'MXN','Argentina':'ARS','Itália':'EUR','Índia':'INR'};
const current=()=>s.empire?.economy;
function init(){
 if(!s.empire)s.empire={};if(!s.empire.economy)s.empire.economy={};
 const e=s.empire.economy;
 e.inflation=clamp(Number(e.inflation)||1,1,3);
 e.lastCrisisDay=Math.max(0,Math.floor(Number(e.lastCrisisDay)||0));
 if(!e.crisis||!crisisTypes.some(x=>x.id===e.crisis.id))e.crisis={...crisisTypes[0],end:0,region:null};
 e.distressDays=clamp(Math.floor(Number(e.distressDays)||0),0,999);
 e.bankrupt=!!e.bankrupt;
 if(!e.factory)e.factory={opened:false,name:'',level:1,produced:0,queue:[],brand:'',model:'Empire One'};
 const f=e.factory;f.level=clamp(Math.floor(Number(f.level)||1),1,4);f.produced=Math.max(0,Math.floor(Number(f.produced)||0));if(!Array.isArray(f.queue))f.queue=[];
 if(!e.trade)e.trade={completed:0,totalFees:0};
 if(!e.regionalReputation||typeof e.regionalReputation!=='object')e.regionalReputation={};
 return e;
}
function crisisFor(cityId){const e=init(),c=e.crisis;if(c.id==='stable'||s.day>=c.end)return crisisTypes[0];const city=byId(cityId);if(c.region&&city?.country!==c.region)return crisisTypes[0];return c}
function factor(cityId){return crisisFor(cityId).demand}
function updateDay(){
 const e=init();if(e.bankrupt)return;
 if(s.day%30===0){const annualized=.018+(Math.floor(s.day/30)%5)*.006;e.inflation=clamp(e.inflation*(1+annualized/12),1,3);note('Índice de preços: '+Math.round((e.inflation-1)*1000)/10+'% acumulado na campanha.')}
 if(e.crisis.id!=='stable'&&s.day>=e.crisis.end){note('Fim da crise: '+e.crisis.name+'. Mercado volta a funcionar.');e.crisis={...crisisTypes[0],end:0,region:null}}
 if(s.day>=22&&s.day%37===0&&e.crisis.id==='stable'){
  const type=crisisTypes[1+Math.floor((s.day/37+Math.floor(s.day/13))%5)];
  const country=byId(s.empire.world?.active)?.country||'Brasil';
  e.crisis={...type,end:s.day+type.duration,region:type.id==='war'||type.id==='political'?country:null};
  e.lastCrisisDay=s.day;note('ALERTA ECONÔMICO: '+type.name+' em '+(e.crisis.region||'diversos mercados')+'. '+type.description);
 }

 // Feed existing vehicle production queue from compact industrial contracts.
 // Each plant has finite parallel lines; finished cars wait when storage is full.
 for(const order of (e.factory.industrialOrders||[])){
  if(!order||order.remaining<=0)continue;
  const plant=order.plantId?(e.plantNetwork?.plants||[]).find(p=>String(p.id)===String(order.plantId)):e.factory;
  if(!plant)continue;
  const level=Math.max(1,Number(plant.level)||1),lines=level*2;
  const active=e.factory.queue.filter(j=>order.plantId?String(j.plantId)===String(order.plantId):!j.plantId).length;
  const open=Math.max(0,lines-active);
  const freeStorage=Math.max(0,(Number(s.slots)||0)-s.stock.length-e.factory.queue.length);
  const count=Math.min(order.remaining,open,freeStorage);
  for(let i=0;i<count;i++){
   const palette=window.AESprites?.paints||[];
   const paint=order.paint==='mixed'?palette[Math.floor(Math.random()*palette.length)]:palette[Number(order.paint)];
   e.factory.queue.push({model:order.model,kind:order.kind,designId:order.designId,
    generation:order.generation,facelift:order.facelift,modelIntroducedDay:order.modelIntroducedDay,
    lifecycleBonus:order.lifecycleBonus,brandParts:order.brandParts?{...order.brandParts}:undefined,
    quality:order.quality,supplier:order.supplier,plantId:order.plantId,
    color:paint?.hex||'#b6d2e5',colorName:paint?.name||'Prata metálico',
    cost:order.cost,value:order.value,due:s.day+Math.max(2,Number(order.cycleDays)||7)});
  }
  order.remaining-=count;
  if(count>0)note('Linha industrial: '+count+' unidade(s) de '+order.model+' iniciadas. Restam '+order.remaining+'.');
 }
 e.factory.industrialOrders=(e.factory.industrialOrders||[]).filter(o=>o.remaining>0);
 // Manufacturing uses real in-game days; never completes while the app is closed.
 for(const job of [...e.factory.queue]){
  if(job.due>s.day)continue;
  const disruption=crisisFor(s.empire.world?.active);if(disruption.id==='war'||disruption.id==='supply'){job.due=s.day+1;continue}
  if(s.stock.length>=s.slots){job.due=s.day+1;continue}
  const c={id:s.nextId++,name:e.factory.brand+' '+job.model,color:job.color||'#b6d2e5',colorName:job.colorName||'Prata metálico',kind:job.kind,year:2026,km:0,condition:100,value:job.value,repair:0,ask:0,listed:false,price:0,days:0,interested:false,offers:[],spent:0,bought:job.cost,originCity:s.empire.world?.active||'saopaulo',manufactured:true,designQuality:job.quality||null,designId:job.designId||null,generation:job.generation||1,facelift:job.facelift||0,modelIntroducedDay:job.modelIntroducedDay||s.day,lifecycleBonus:job.lifecycleBonus||0,brandParts:job.brandParts?{...job.brandParts}:undefined,plantId:job.plantId??null};
  const supplier=job.supplier||'standard';
  const defectRate=supplier==='economy'?.07:supplier==='premium'?.012:.03;
  if(Math.random()<defectRate){
   c.condition=rand(72,89);
   c.repair=Math.max(300,Math.round(job.cost*.055));
   c.qualityIssue=true;
   const ops=window.AEOperations?.ensure?.();if(ops)ops.defects++;
   note('Controle de qualidade: '+c.name+' exige revisão antes de ser anunciado.');
  }
  s.stock.push(c);e.factory.produced++;e.factory.queue.splice(e.factory.queue.indexOf(job),1);note('Produção concluída: '+c.name+'. Veículo adicionado ao estoque.');
 }
 const liquidation=s.stock.reduce((a,c)=>a+Math.max(0,Number(c.value)||0)*.5,0);
 // Loans are liabilities, not profit: borrowing cannot erase insolvency.
 const liabilities=(Array.isArray(s.empire?.bank?.loans)?s.empire.bank.loans:[]).reduce((a,l)=>a+Math.max(0,Number(l.balance)||0),0);
 const netLiquidation=(Number(s.cash)||0)+liquidation-liabilities;
 if(netLiquidation<0)e.distressDays++;else e.distressDays=0;
 if(e.distressDays>=7){e.bankrupt=true;paused=true;note('FALÊNCIA: insolvência persistente por 7 dias. Campanha encerrada.');toast('Sua empresa entrou em falência.');}
}
const style=document.createElement('style');style.textContent=`
#ae-economy{background:#132c3a;border:1px solid #557181;border-radius:12px;margin:12px 0;padding:13px}
#ae-economy h3{color:#f3d08a;font-size:14px;margin:0 0 9px}
.ae-econ-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ae-econ-cell{background:#1c3b4a;border-radius:8px;padding:9px;font-size:12px}
.ae-econ-cell small{display:block;color:#bfd1d8;margin-bottom:5px}
.ae-econ-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
.ae-econ-actions button{min-height:42px;flex:1 1 auto;font-size:12px}
.ae-econ-danger{color:#ffb5aa;font-weight:700;font-size:12px;margin:8px 0}
.ae-econ-hint{font-size:11px;color:#c3d5dd;line-height:1.55;margin:9px 0}
`;document.head.append(style);
const panel=document.createElement('section');panel.id='ae-economy';panel.innerHTML='<h3>Fabricante e produção</h3><div id="ae-econ-factory"></div><p class="ae-econ-hint" id="ae-factory-opening-hint" role="status"></p><div id="ae-econ-crisis"></div><div class="ae-econ-actions"><button data-econ="open">Abrir fabricante</button><button data-econ="produce">Produzir veículo básico</button><button data-econ="upgrade">Ampliar fábrica</button><button data-econ="transfer">Transferir veículo</button></div><details class="ae-factory-economic-details"><summary>Inflação, mercado e risco financeiro</summary><div id="ae-econ-status" class="ae-econ-grid"></div><p class="ae-econ-hint">Economia, impostos e câmbio de referência fictícios; CR é a unidade contábil, e a moeda local aparece como contexto. Não representa acontecimentos ou taxas reais. Crises e inflação evoluem somente nos dias simulados. A falência exige insolvência persistente.</p></details>';
document.getElementById('garage')?.append(panel);
function factoryCost(){return Math.round(110000*init().inflation)}
function produceCost(){const f=init().factory;return Math.round((14500+f.level*1400)*init().inflation*crisisFor(s.empire.world?.active).cost)}
function show(){
 const e=init(),c=e.crisis,f=e.factory,city=byId(s.empire.world?.active),active=crisisFor(city?.id);
 const cashForecast=s.cash+s.stock.reduce((a,x)=>a+(Number(x.value)||0)*.5,0);
 document.getElementById('ae-econ-status').innerHTML='<div class="ae-econ-cell"><small>Inflação acumulada</small><b>'+((e.inflation-1)*100).toFixed(1).replace('.',',')+'%</b></div><div class="ae-econ-cell"><small>Mercado ativo</small><b>'+esc(city?.name||'São Paulo')+'</b></div><div class="ae-econ-cell"><small>Risco financeiro</small><b>'+(cashForecast<0?'Crítico':s.cash<0?'Atenção':'Controlado')+'</b></div><div class="ae-econ-cell"><small>Indústria</small><b>'+(f.opened?'Nível '+f.level:'Não fundada')+'</b></div>';
 document.getElementById('ae-econ-crisis').innerHTML='<p class="'+(active.id==='stable'?'ae-econ-hint':'ae-econ-danger')+'">'+esc(active.name)+': '+esc(active.description)+(active.id==='stable'?'':' · até o dia '+c.end)+'</p>'+(e.distressDays?'<p class="ae-econ-danger">Insolvência: '+e.distressDays+'/7 dias. Recupere o patrimônio líquido.</p>':'')+(e.bankrupt?'<p class="ae-econ-danger">FALÊNCIA DECLARADA. Campanha encerrada. Exporte o backup ou inicie uma nova campanha.</p>':'');
 document.getElementById('ae-econ-factory').innerHTML='<p class="ae-econ-hint">'+(f.opened?'Fabricante: '+esc(f.brand)+' · modelo '+esc(f.model)+' · produzidos '+f.produced+' · na fila '+f.queue.length:'Abra uma fabricante por '+money(factoryCost())+' CR para produzir sua própria marca.')+'</p><p class="ae-econ-hint">Veículo básico: custo estimado '+money(produceCost())+' CR · produção: '+Math.max(2,8-f.level)+' dias · uma vaga por veículo finalizado. Projetos homologados têm custo e prazo próprios, mostrados na ordem.</p>';
 const opening=panel.querySelector('[data-econ="open"]');
 opening.textContent=f.opened?'Fabricante aberta':'Abrir fabricante · '+money(factoryCost())+' CR';
 const needed=Math.max(0,factoryCost()-s.cash);
 const openingHint=document.getElementById('ae-factory-opening-hint');
 openingHint.textContent=f.opened?'Para fabricar um modelo homologado, abra Projetos e desenvolvimento abaixo e toque em Produzir no projeto.':
  'Homologar um projeto não funda a fabricante. '+(needed?'Faltam '+money(needed)+' CR para a fundação.':'Você já tem capital para a fundação.')+' Reserve também o custo de produção e uma vaga no estoque.';
 panel.querySelectorAll('[data-econ]').forEach(b=>b.disabled=e.bankrupt||(b.dataset.econ==='open'?f.opened:b.dataset.econ==='produce'?!f.opened:b.dataset.econ==='upgrade'?!f.opened||f.level>=4:false));
}
function transact(cost,label){if(init().bankrupt)return toast('Campanha encerrada por falência');if(!Number.isFinite(cost)||cost<=0||s.cash<cost)return toast('Capital insuficiente');s.cash-=cost;entry(label,-cost);return true}
panel.addEventListener('click',ev=>{
 const action=ev.target.closest('[data-econ]')?.dataset.econ;if(!action)return;
 const e=init(),f=e.factory;if(e.bankrupt)return toast('Empresa falida');
 if(action==='open'){
  if(f.opened)return;const cost=factoryCost();if(s.cash<cost)return toast('A fundação custa '+money(cost)+' CR. Faltam '+money(cost-s.cash)+' CR.');
  const brand=prompt('Nome da fabricante (2 a 24 caracteres):',s.empire.world?.hq==='saopaulo'?'São Paulo Motors':'Empire Motors');
  if(brand===null)return;const name=brand.trim().replace(/[<>]/g,'').slice(0,24);if(name.length<2)return toast('Nome inválido');
  if(!confirm('Fundar '+name+' por '+money(cost)+' CR?'))return;
  if(!transact(cost,'Fundação da fabricante'))return;f.opened=true;f.brand=name;note('Fabricante '+name+' fundada.');
 }
 if(action==='produce'){
  if(!f.opened)return;const cost=produceCost();if(s.stock.length+f.queue.length>=s.slots)return toast('Amplie vagas antes de produzir');
  if(f.queue.filter(job=>!job.plantId).length>=f.level*2)return toast('Linha de montagem principal ocupada');
  const model=prompt('Modelo a fabricar:',f.model||'Empire One');if(model===null)return;
  const cleaned=model.trim().replace(/[<>]/g,'').slice(0,28);if(cleaned.length<2)return toast('Modelo inválido');
  const kindOptions=['Hatch','Sedã','SUV','Compacto','Esportivo','Picape'];const kind=prompt('Categoria: '+kindOptions.join(', '),'Hatch');if(kind===null)return;const chosen=kindOptions.find(x=>x.toLowerCase()===kind.trim().toLowerCase());if(!chosen)return toast('Categoria inválida');
  const productionCrisis=crisisFor(s.empire.world?.active);if(productionCrisis.id==='war'||productionCrisis.id==='supply')return toast('Produção suspensa: '+productionCrisis.name);
  if(!confirm('Produzir '+cleaned+' por '+money(cost)+' CR?'))return;
  if(!transact(cost,'Produção · '+cleaned))return;
  f.model=cleaned;f.queue.push({model:cleaned,kind:chosen,cost,due:s.day+Math.max(2,8-f.level),value:Math.round(cost*(1.2+f.level*.07)/100)*100});note('Ordem de produção: '+cleaned+'. Entrega prevista no dia '+f.queue[f.queue.length-1].due);
 }
 if(action==='upgrade'){
  if(!f.opened||f.level>=4)return;const cost=Math.round((45000+f.level*25000)*e.inflation);
  if(!confirm('Expandir fabricante ao nível '+(f.level+1)+' por '+money(cost)+' CR?'))return;
  if(!transact(cost,'Ampliação industrial'))return;f.level++;note('Fábrica ampliada ao nível '+f.level);
 }
 if(action==='transfer'){
  const w=s.empire.world;if(!w||w.owned.length<2)return toast('Adquira outra subsidiária primeiro');
  if(!s.stock.length)return toast('Não há veículos em estoque');
  const options=s.stock.slice(0,15).map(c=>c.id+' — '+c.name).join('\n');
  const value=prompt('ID do veículo para transferir:\n'+options);if(value===null)return;
  const car=s.stock.find(c=>String(c.id)===value.trim());if(!car)return toast('Veículo não encontrado');
  const targets=w.owned.filter(id=>id!==car.originCity);if(!targets.length)return toast('Nenhuma outra cidade disponível');
  const target=prompt('Destino (digite o código):\n'+targets.map(id=>id+' — '+(byId(id)?.name||id)).join('\n'));if(target===null)return;
  if(!targets.includes(target.trim()))return toast('Destino inválido');
  const city=byId(target.trim()),from=byId(car.originCity),international=from?.country!==city?.country;
  const crisis=crisisFor(car.originCity),destinationCrisis=crisisFor(city.id);
  if(crisis.id==='war'||destinationCrisis.id==='war')return toast('Transporte bloqueado pelo conflito regional');
  const fee=Math.round((international?3000:800)*e.inflation*Math.max(crisis.cost,destinationCrisis.cost)*(international?1.12:1));
  if(!confirm('Transferir '+car.name+' para '+city.name+' por '+money(fee)+' CR?'))return;
  if(!transact(fee,'Logística · '+car.name))return;
  car.originCity=city.id;car.spent=(Number(car.spent)||0)+fee;e.trade.completed++;e.trade.totalFees+=fee;note('Transferência concluída para '+city.name);
 }
 save();render();
});
const previousSeed=seed;
seed=function(){previousSeed();init();save()};
const previousTick=tickDay;
tickDay=function(){
 if(init().bankrupt){paused=true;return}
 const previousDay=s.day;
 const before=new Map(s.stock.map(c=>[c.id,(c.offers||[]).length]));
 previousTick();
 if(s.day===previousDay)return;
 const e=init();
 // A crisis affects new proposals only, never retroactively changes an accepted offer.
 for(const car of s.stock){const offers=car.offers||[];const old=before.get(car.id)||0;const marketDemand=factor(car.originCity||s.empire.world?.active);const age=car.manufactured?Math.max(0,s.day-(Number(car.modelIntroducedDay)||s.day)):0;const freshness=car.manufactured?Math.max(.7,1-Math.max(0,age-45)*.0015):1;const lifecycle=car.manufactured?Math.min(1.2,Math.max(.8,freshness+Math.min(.2,Math.max(0,Number(car.lifecycleBonus)||0)))):1;const demand=Math.min(1,marketDemand*lifecycle);for(let i=offers.length-1;i>=old;i--){if(Math.random()>demand){offers.splice(i,1);continue}const designBoost=car.manufactured&&Number.isFinite(Number(car.designQuality))?1+Math.max(0,Number(car.designQuality)-65)*.002:1;offers[i].amount=Math.max(100,Math.round(offers[i].amount*(.92+.08*demand)*designBoost/100)*100)}car.interested=offers.length>0}
 updateDay();save();
};
const previousSubmit=submitBid;
submitBid=function(){if(init().bankrupt)return toast('Campanha encerrada');return previousSubmit()};
const previousPublish=publish;
publish=function(){if(init().bankrupt)return toast('Campanha encerrada');return previousPublish()};
const previousAccept=acceptOffer;
acceptOffer=function(i){
 if(init().bankrupt)return toast('Campanha encerrada');
 const car=s.stock.find(c=>c.id===modalCar);
 const crisis=crisisFor(car?.originCity||s.empire.world?.active);
 if(crisis.id==='war')return toast('Vendas suspensas nesta região devido ao conflito. Aguarde a normalização ou transfira o veículo.');
 const before=s.sales,offerAmount=Number(car?.offers?.[i]?.amount)||0;
 const result=previousAccept(i);
 if(s.sales>before){
  const city=byId(car?.originCity),country=city?.country||'Brasil';
  const taxes={'Brasil':.035,'Estados Unidos':.025,'Reino Unido':.03,'França':.035,'Alemanha':.03,'Japão':.025,'Coreia do Sul':.025,'Emirados Árabes Unidos':.02,'Singapura':.02,'Austrália':.03,'Canadá':.03,'México':.025,'Argentina':.035,'Itália':.035,'Índia':.03};
  const rate=taxes[country]||.03;
  const tax=Math.round(offerAmount*rate);
  if(tax){s.cash-=tax;s.profit-=tax;entry('Tributo comercial · '+country,-tax);note('Tributo de '+country+': '+money(tax)+' CR')}
  const e=init();e.regionalReputation[country]=Math.min(100,(Number(e.regionalReputation[country])||50)+1);
  save();render();
 }
 return result;
};
const previousRender=render;
const tag=document.querySelector('.top .tag');if(tag)tag.textContent='ALPHA 2.5.0 · ECONOMIA GLOBAL';document.title='Auto Empire Tycoon — Alpha 2.5.0';
const version=document.getElementById('ae-version');if(version)version.textContent='AUTO EMPIRE TYCOON · ALPHA 2.5.0 · BUILD 2500';
let last='';
render=function(){previousRender();const e=init(),key=[s.day,s.cash,s.stock.length,e.crisis.id,e.factory.opened,e.factory.queue.length,e.factory.level,e.distressDays,s.empire.world?.active].join('|');if(last!==key){last=key;show()}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(show);
init();show();
window.AEEconomy={crisisFor,init};
})();
