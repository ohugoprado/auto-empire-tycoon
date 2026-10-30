/* Central industrial staffing: one quote and confirmation for all selected plants. */
(function(){
'use strict';
const network=document.getElementById('ae-industrial-network');if(!network)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const inflation=()=>Math.max(1,n(s.empire?.economy?.inflation)||1);
const upgrade=p=>Math.round((80000+n(p.level)*55000)*inflation());
const plants=()=>s?.empire?.economy?.plantNetwork?.plants||[];
const panel=document.createElement('section');panel.id='ae-subsidiary-command';panel.className='panel';
panel.innerHTML='<h3>Equipes e expansão industrial em lote</h3><p class="tiny">Aplique uma política às fábricas adicionais com uma única confirmação. Novos funcionários usam o mesmo quadro de pessoal da produção; a equipe de apoio legada e sua folha mensal são preservadas.</p><div id="ae-sub-summary"></div><div id="ae-sub-controls"><label>Política de produção<select id="ae-sub-target"><option value="4">Enxuta · 1 linha por turno</option><option value="8" selected>Equilibrada · capacidade base</option><option value="12">Expansão · capacidade máxima</option></select></label><label>Unidades<select id="ae-sub-scope"><option value="all">Todas as fábricas adicionais</option><option value="idle">Somente com linha livre</option><option value="busy">Somente com capacidade ocupada</option></select></label></div><div id="ae-sub-quote"></div><div class="ae-sub-actions"><button id="ae-sub-hire" type="button">Aplicar equipe em lote</button><button id="ae-sub-upgrade" type="button">Ampliar em lote</button></div><p class="tiny" id="ae-sub-feedback" role="status"></p>';
network.parentNode.insertBefore(panel,network);
const style=document.createElement('style');style.textContent=`
#ae-subsidiary-command{margin:12px 0;padding:14px;border:1px solid #c6d5e7;border-radius:12px;background:#f5f8fc;color:#15263b}
#ae-subsidiary-command h3{font-size:15px;color:#183d69;margin:0 0 8px}
#ae-sub-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
#ae-sub-controls label{font-size:12px;color:#52647a}
#ae-sub-controls select{width:100%;min-width:0;min-height:44px;margin-top:5px;background:#fff;color:#15263b;border:1px solid #b7c9df;border-radius:8px;padding:7px}
#ae-sub-summary,#ae-sub-quote{font-size:12px;line-height:1.6;color:#52647a;overflow-wrap:anywhere}
.ae-sub-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
.ae-sub-actions button{min-height:46px;font-size:12px;white-space:normal}
#ae-sub-feedback{color:#166b59;font-size:12px}
@media(max-width:420px){#ae-sub-controls,.ae-sub-actions{grid-template-columns:1fr}}
`;document.head.append(style);
function selected(){
 const scope=panel.querySelector('#ae-sub-scope').value,api=window.AEFactoryWorkforce;
 const queue=Array.isArray(s.empire?.economy?.factory?.queue)?s.empire.economy.factory.queue:[];
 const occupied=new Map();
 for(const job of queue){
  if(!job||job.plantId==null)continue;
  const id=String(job.plantId);
  occupied.set(id,(occupied.get(id)||0)+1);
 }
 return plants().filter(p=>{
  const lines=api?.read(p).lines??n(p.level)*2;
  const jobs=occupied.get(String(p.id))||0;
  return scope==='idle'?jobs<lines:scope==='busy'?jobs>=lines:true;
 });
}
function quote(){
 const list=selected(),policy=panel.querySelector('#ae-sub-target').value,api=window.AEFactoryWorkforce;
 const items=api?list.map(plant=>{
  const current=api.read(plant);
  const target=policy==='4'?3*current.shift:policy==='12'?current.baseLines*6:current.baseLines*3;
  return {plant,quote:api.quote(plant,Math.max(current.staff,target),current.shift)};
 }).filter(item=>item.quote?.added>0):[];
 const hires=items.reduce((sum,item)=>sum+item.quote.added,0),hireCost=items.reduce((sum,item)=>sum+item.quote.hiring,0);
 // Only propose expansion where current staffed capacity is fully occupied.
 const queue=Array.isArray(s.empire?.economy?.factory?.queue)?s.empire.economy.factory.queue:[];
 const load=new Map();
 for(const job of queue)if(job&&job.plantId!=null){const id=String(job.plantId);load.set(id,(load.get(id)||0)+1);}
 const upgrades=list.filter(p=>n(p.level)<3&&(!api||(load.get(String(p.id))||0)>=(api.read(p).lines||0)));
 const upgradeCost=upgrades.reduce((sum,p)=>sum+upgrade(p),0);
 const dailyBefore=api?plants().reduce((sum,p)=>sum+api.read(p).daily,0):0;
 const dailyAfter=dailyBefore+items.reduce((sum,item)=>sum+item.quote.after.daily-item.quote.before.daily,0);
 return {list,items,hires,hireCost,upgrades,upgradeCost,dailyBefore,dailyAfter,ready:!!api};
}
function refresh(){
 const economy=s?.empire?.economy;if(!economy)return;
 panel.hidden=!economy.factory?.opened;
 const q=quote(),units=plants(),total=units.length;
 const api=window.AEFactoryWorkforce;
 const activeIds=new Set(units.map(p=>String(p.id)));
 const queue=Array.isArray(economy.factory?.queue)?economy.factory.queue:[];
 let activeJobs=0;
 for(const job of queue)if(job&&job.plantId!=null&&activeIds.has(String(job.plantId)))activeJobs++;
 const availableLines=api?units.reduce((sum,p)=>sum+api.read(p).lines,0):0;
 const freeLines=Math.max(0,availableLines-activeJobs);
 const support=units.reduce((sum,p)=>sum+n(p.staff)*1100*n(p.level),0);
 panel.querySelector('#ae-sub-summary').textContent=total+' fábrica(s) adicionais · '+activeJobs+' ordem(ns) em produção · '+freeLines+'/'+availableLines+' linhas livres · folha industrial gerenciada '+money(q.dailyBefore)+'/dia · apoio legado '+money(support)+'/30 dias · caixa '+money(s.cash);
 panel.querySelector('#ae-sub-quote').textContent=q.ready?'Selecionadas: '+q.list.length+' de '+total+' fábrica(s). Contratação: '+q.hires+' funcionário(s) em '+q.items.length+' unidade(s), '+money(q.hireCost)+'. Folha diária após aplicar: '+money(q.dailyAfter)+'. Ampliações: '+q.upgrades.length+' unidade(s), '+money(q.upgradeCost)+'. A política não demite funcionários nem muda turnos.':'Preparando quadro de pessoal industrial.';
 const blocked=!!economy.bankrupt;
 const scope=panel.querySelector('#ae-sub-scope').value;
 panel.querySelector('#ae-sub-feedback').textContent=scope==='busy'&&q.list.length===0?'Nenhuma fábrica está com todas as linhas ocupadas. Evite ampliar sem necessidade.':scope==='idle'&&q.list.length===0?'Nenhuma fábrica possui linhas livres no momento.':'';
 panel.querySelector('#ae-sub-hire').disabled=blocked||!q.ready||!q.hires||n(s.cash)<q.hireCost;
 panel.querySelector('#ae-sub-upgrade').disabled=blocked||!q.upgrades.length||n(s.cash)<q.upgradeCost;
}
function fingerprint(q,isHire){
 return JSON.stringify(isHire?q.items.map(item=>[item.plant.id,item.quote.before.staff,item.quote.before.shift,item.quote.before.managed,item.quote.after.staff,item.quote.hiring,item.quote.after.daily]):q.upgrades.map(p=>[p.id,p.level,upgrade(p)]));
}
function execute(type){
 const q=quote(),isHire=type==='hire',cost=isHire?q.hireCost:q.upgradeCost,count=isHire?q.hires:q.upgrades.length;
 if(!count||!Number.isFinite(cost)||cost<0||s.empire.economy.bankrupt)return;
 if(n(s.cash)<cost)return toast('Caixa insuficiente para executar o lote.');
 const label=isHire?'contratar '+count+' funcionário(s) industriais em '+q.items.length+' unidade(s)':'ampliar '+count+' unidade(s)';
 const salary=isHire?' Folha diária gerenciada: '+money(q.dailyBefore)+' → '+money(q.dailyAfter)+'. A folha da equipe de apoio legada não muda.':'';
 if(!confirm('Deseja '+label+' por '+money(cost)+'?'+salary))return;
 const live=quote(),liveCost=isHire?live.hireCost:live.upgradeCost;
 if(s.empire.economy.bankrupt||fingerprint(live,isHire)!==fingerprint(q,isHire)||liveCost!==cost)return toast('A rede mudou. Confira a nova cotação.');
 if(!Number.isFinite(liveCost)||liveCost<0||n(s.cash)<liveCost)return toast('Saldo insuficiente ou cotação inválida.');
 s.cash-=liveCost;
 if(isHire)live.items.forEach(item=>{item.plant.workforce={staff:item.quote.after.staff,shift:item.quote.after.shift};});
 else live.upgrades.forEach(p=>p.level=Math.min(3,n(p.level)+1));
 entry(isHire?'Contratação industrial em lote':'Expansão em lote · subsidiárias',-liveCost);
 note('Gestão central: '+label+' por '+money(liveCost)+'.');
 panel.querySelector('#ae-sub-feedback').textContent='Operação concluída: '+label+'.';
 save();render();refresh();
}
panel.querySelector('#ae-sub-hire').addEventListener('click',()=>execute('hire'));
panel.querySelector('#ae-sub-upgrade').addEventListener('click',()=>execute('upgrade'));
panel.querySelector('#ae-sub-controls').addEventListener('change',refresh);
const prevRender=render;let signature='';
render=function(){const result=prevRender.apply(this,arguments);const next=[s?.cash,s?.day,!!window.AEFactoryWorkforce,plants().map(p=>[p.id,p.staff,p.level,p.workforce?.staff,p.workforce?.shift].join(':')).join('|')].join(';');if(next!==signature){signature=next;refresh();}return result;};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
window.AESubsidiaryCommand=Object.freeze({refresh});
refresh();
})();
