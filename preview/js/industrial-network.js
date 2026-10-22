/* Auto Empire Tycoon — Alpha 5.5: additional plants and regional production. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const money=v=>Math.round(v).toLocaleString('pt-BR')+' CR';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const specialties=['Geral','Compacto','Hatch','Sedã','SUV','Picape','Esportivo'];
function ensure(){
 const economy=s?.empire?.economy;if(!economy)return null;
 if(!economy.plantNetwork||typeof economy.plantNetwork!=='object')economy.plantNetwork={plants:[],nextId:1,lastPayrollDay:0};
 const n=economy.plantNetwork;
 if(!Array.isArray(n.plants))n.plants=[];
 n.nextId=Math.max(1,Math.floor(num(n.nextId))||1);
 n.lastPayrollDay=Math.max(0,Math.floor(num(n.lastPayrollDay)));
 n.plants=n.plants.filter(p=>p&&typeof p==='object').slice(0,5);
 for(const p of n.plants){
  p.level=clamp(Math.floor(num(p.level))||1,1,3);
  p.staff=clamp(Math.floor(num(p.staff))||2,1,12);
  p.specialty=specialties.includes(p.specialty)?p.specialty:'Geral';
 }
 return n;
}
function queueFor(id){return (s.empire?.economy?.factory?.queue||[]).filter(j=>j.plantId===id);}
function costNew(){return Math.round(180000*Math.max(1,num(s.empire?.economy?.inflation)));}
function payroll(p){return p.staff*1100*p.level;}
const panel=document.createElement('section');panel.id='ae-industrial-network';panel.className='panel';
panel.innerHTML='<h3>Rede de fábricas</h3><p class="tiny">Construa unidades industriais independentes, contrate equipes e produza veículos da sua marca.</p><div id="ae-plant-list"></div><button id="ae-plant-build" type="button">Construir nova fábrica</button><p class="tiny" id="ae-plant-foot"></p>';
const style=document.createElement('style');style.textContent=`
#ae-industrial-network{padding:14px;margin:12px 0}
#ae-industrial-network h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
.ae-plant-card{border:1px solid #3b566a;border-radius:10px;padding:12px;margin:10px 0;background:#20384b}
.ae-plant-card h4{margin:0 0 8px;font-size:14px}
.ae-plant-card p{font-size:12px;margin:6px 0;color:#c5d8e4}
.ae-plant-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
.ae-plant-actions button{flex:1 1 auto;min-height:44px;font-size:12px}
#ae-plant-build{min-height:44px;width:100%;margin-top:9px}
`;document.head.append(style);
const quality=document.getElementById('ae-quality-recalls');
if(quality?.parentNode)quality.parentNode.insertBefore(panel,quality.nextSibling);else garage.append(panel);
function refresh(){
 const n=ensure();if(!n)return;
 panel.querySelector('#ae-plant-list').innerHTML=n.plants.map(p=>{
  const jobs=queueFor(p.id);
  return '<div class="ae-plant-card"><h4>'+esc(p.name)+'</h4><p>Nível '+p.level+' · '+esc(p.specialty)+' · '+p.staff+' funcionário(s)</p><p>Produção: '+jobs.length+'/'+(p.level*2)+' · folha mensal: '+money(payroll(p))+'</p><div class="ae-plant-actions"><button data-plant="produce" data-id="'+p.id+'">Produzir</button><button data-plant="hire" data-id="'+p.id+'">Contratar</button><button data-plant="upgrade" data-id="'+p.id+'">Ampliar</button><button data-plant="specialty" data-id="'+p.id+'">Especialização</button></div></div>';
 }).join('')||'<p class="tiny">Você ainda não possui fábricas adicionais.</p>';
 panel.querySelector('#ae-plant-build').disabled=n.plants.length>=5||!!s.empire.economy.bankrupt||!s.empire.economy.factory?.opened;
 panel.querySelector('#ae-plant-build').textContent='Construir fábrica · '+money(costNew());
 panel.querySelector('#ae-plant-foot').textContent='Até 5 fábricas adicionais. As ordens usam o estoque compartilhado; salários são cobrados a cada 30 dias simulados. Crises de suprimentos podem atrasar entregas.';
}
function spend(cost,label){if(s.empire.economy.bankrupt)return false;if(num(s.cash)<cost){toast('Caixa insuficiente');return false;}s.cash-=cost;entry(label,-cost);return true;}
panel.querySelector('#ae-plant-build').addEventListener('click',()=>{
 const n=ensure();if(!n||n.plants.length>=5||!s.empire.economy.factory?.opened)return;
 const name=prompt('Nome da nova unidade (2 a 30 caracteres):','Unidade industrial '+(n.plants.length+2));
 if(name===null)return;const clean=name.trim().slice(0,30);if(clean.length<2)return toast('Nome inválido');
 const cost=costNew();if(!confirm('Construir '+clean+' por '+money(cost)+'?'))return;
 if(!spend(cost,'Construção industrial'))return;
 n.plants.push({id:n.nextId++,name:clean,level:1,staff:2,specialty:'Geral'});
 note('Nova unidade industrial inaugurada: '+clean);save();render();refresh();
});
panel.addEventListener('click',event=>{
 const btn=event.target.closest('[data-plant]');if(!btn)return;
 const n=ensure(),p=n?.plants.find(x=>String(x.id)===btn.dataset.id);if(!p||s.empire.economy.bankrupt)return;
 const action=btn.dataset.plant;
 if(action==='hire'){
  if(p.staff>=12)return toast('Equipe no limite');
  const cost=Math.round(3500*Math.max(1,num(s.empire.economy.inflation)));
  if(!confirm('Contratar funcionário por '+money(cost)+'?'))return;
  if(!spend(cost,'Contratação · '+p.name))return;p.staff++;
 }else if(action==='upgrade'){
  if(p.level>=3)return toast('Unidade no nível máximo');
  const cost=Math.round((80000+p.level*55000)*Math.max(1,num(s.empire.economy.inflation)));
  if(!confirm('Ampliar '+p.name+' por '+money(cost)+'?'))return;
  if(!spend(cost,'Expansão industrial · '+p.name))return;p.level++;
 }else if(action==='specialty'){
  const choice=prompt('Especialização: '+specialties.join(', '),p.specialty);
  if(choice===null)return;
  const selected=specialties.find(x=>x.toLocaleLowerCase('pt-BR')===choice.trim().toLocaleLowerCase('pt-BR'));
  if(!selected)return toast('Especialização inválida');
  p.specialty=selected;
 }else if(action==='produce'){
  const factory=s.empire.economy.factory;
  if(!factory?.opened)return toast('Abra a fabricante primeiro');
  if(queueFor(p.id).length>=p.level*2)return toast('Linha ocupada');
  if(s.stock.length+factory.queue.length>=s.slots)return toast('Estoque sem capacidade');
  const crisis=window.AEEconomy?.crisisFor?.(s.empire.world?.active);
  if(crisis?.id==='war'||crisis?.id==='supply')return toast('Produção interrompida pela crise');
  const designs=s.empire.economy.studio?.designs||[];
  if(!designs.length)return toast('Homologue um modelo no centro de desenvolvimento');
  const available=designs.filter(d=>p.specialty==='Geral'||d.kind===p.specialty);
  if(!available.length)return toast('Nenhum projeto compatível com a especialização');
  const name=prompt('Modelo homologado: '+available.map(d=>d.name).join(', '),available[0].name);
  if(name===null)return;
  const design=available.find(d=>d.name.toLocaleLowerCase('pt-BR')===name.trim().toLocaleLowerCase('pt-BR'));
  if(!design)return toast('Modelo não encontrado');
  const cost=Math.round(Math.max(1000,num(design.cost))*Math.max(1,num(s.empire.economy.inflation))*(1-Math.min(.12,(p.level-1)*.04+p.staff*.004)));
  const days=Math.max(2,Math.round(num(design.days)||7)-p.level+1-Math.floor(p.staff/4));
  if(!confirm('Produzir '+design.name+' em '+p.name+' por '+money(cost)+'? Prazo: '+days+' dias.'))return;
  if(!spend(cost,'Produção · '+p.name+' · '+design.name))return;
  factory.queue.push({plantId:p.id,model:design.name,kind:design.kind,cost,value:Math.max(cost,Math.round(num(design.value)*Math.max(1,num(s.empire.economy.inflation)))),due:s.day+days,designId:design.id,quality:design.quality,supplier:window.AEOperations?.getSupplier?.().id||'standard'});
  note('Produção iniciada em '+p.name+': '+design.name);
 }
 save();render();refresh();
});
const previousTick=tickDay;
tickDay=function(){
 const before=s.day,result=previousTick();
 if(s.day===before)return result;
 const n=ensure();if(!n)return result;
 if(s.day%30===0&&n.lastPayrollDay!==s.day){
  n.lastPayrollDay=s.day;
  const amount=n.plants.reduce((sum,p)=>sum+payroll(p),0);
  if(amount){s.cash-=amount;entry('Salários da rede industrial',-amount);note('Folha da rede industrial: '+money(amount));save();}
 }
 refresh();return result;
};
const previousSeed=seed;seed=function(){previousSeed();ensure();refresh();};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
