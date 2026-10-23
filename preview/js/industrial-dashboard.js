/* Auto Empire Tycoon — Alpha 5.7: industrial analytics and filtering. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const panel=document.createElement('section');panel.id='ae-industrial-dashboard';panel.className='panel';
panel.innerHTML='<h3>Central de operações industriais</h3><p class="tiny">Produção, entregas e despesas da rede em um só lugar.</p><div id="ae-industrial-kpis"></div><div class="ae-id-controls"><label for="ae-id-filter">Exibir fábricas</label><select id="ae-id-filter"><option value="all">Todas</option><option value="busy">Em produção</option><option value="available">Com vagas</option><option value="delayed">Com atrasos</option></select><label for="ae-id-sort">Ordenar</label><select id="ae-id-sort"><option value="name">Nome</option><option value="occupation">Ocupação</option><option value="delivery">Próxima entrega</option></select></div><div id="ae-industrial-lines"></div><h4>Contratos industriais</h4><div id="ae-industrial-contracts"></div><p class="tiny" id="ae-industrial-note"></p>';
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
 const contracts=Array.isArray(factory.industrialOrders)?factory.industrialOrders.filter(o=>Number(o.remaining)>0):[];
 const plants=Array.isArray(economy.plantNetwork?.plants)?economy.plantNetwork.plants:[];
 const lines=[{id:null,name:'Fábrica principal',level:Math.max(1,num(factory.level)),staff:null,capacity:Math.max(1,num(factory.level))*2},...plants.map(p=>({id:p.id,name:p.name||'Unidade industrial',level:Math.max(1,num(p.level)),staff:Math.max(0,num(p.staff)),capacity:Math.max(1,num(p.level))*2}))];
 panel.querySelector('#ae-industrial-contracts').innerHTML=contracts.map(o=>{
  const total=Math.max(1,num(o.total)),remaining=Math.max(0,num(o.remaining)),started=total-remaining;
  const plant=o.plantId?plants.find(p=>String(p.id)===String(o.plantId)):factory;
  const capacity=Math.max(1,num(plant?.level))*2,cycles=Math.ceil(remaining/capacity);
  const eta=cycles*Math.max(2,num(o.cycleDays)||7);
  return '<div class="ae-id-line"><h4>'+esc(o.model)+' · '+started+'/'+total+' encaminhados</h4><div class="ae-id-progress"><span style="width:'+Math.round(started/total*100)+'%"></span></div><p>Restam '+remaining+' veículos · '+(o.plantId?esc(plant?.name||'Unidade industrial'):'Fábrica principal')+' · prazo mínimo estimado: '+eta+' dias de jogo</p><p>Investimento antecipado: '+money(total*num(o.cost))+'</p></div>';
 }).join('')||'<p class="tiny">Sem contratos aguardando montagem. Verifique as linhas acima para veículos já em produção.</p>';
 const payroll=plants.reduce((sum,p)=>sum+Math.max(0,num(p.staff))*1100*Math.max(1,num(p.level)),0);
 const invested=jobs.reduce((sum,j)=>sum+Math.max(0,num(j.cost)),0);
 const delayed=jobs.filter(j=>num(j.due)<num(s.day)).length;
 const upcoming=jobs.filter(j=>num(j.due)>=num(s.day)).sort((a,b)=>num(a.due)-num(b.due))[0];
 const totalCapacity=lines.filter(l=>l.id!==null||factory.opened).reduce((sum,l)=>sum+l.capacity,0);
 const utilization=totalCapacity?Math.round(jobs.length/totalCapacity*100):0;
 const metrics=[['Em produção',jobs.length],['Aguardando montagem',contracts.reduce((a,o)=>a+num(o.remaining),0)],['Custos operacionais acumulados',money(factory.overheadSpent||0)],['Capital em produção',money(invested)],['Folha mensal adicional',money(payroll)],['Ordens atrasadas',delayed],['Capacidade ocupada',utilization+'%'],['Custo médio por ordem',jobs.length?money(invested/jobs.length):'—']];
 panel.querySelector('#ae-industrial-kpis').innerHTML=metrics.map(([label,value])=>'<div class="ae-id-kpi"><small>'+label+'</small><strong>'+value+'</strong></div>').join('');
 const filter=panel.querySelector('#ae-id-filter').value,sort=panel.querySelector('#ae-id-sort').value;
 const eligible=lines.filter(l=>l.id!==null||factory.opened).filter(line=>{
  const own=jobs.filter(j=>line.id===null?!j.plantId:String(j.plantId)===String(line.id));
  if(filter==='busy')return own.length>0;
  if(filter==='available')return own.length<line.capacity;
  if(filter==='delayed')return own.some(j=>num(j.due)<num(s.day));
  return true;
 });
 const ownJobs=line=>jobs.filter(j=>line.id===null?!j.plantId:String(j.plantId)===String(line.id));
 const nextDue=line=>Math.min(Infinity,...ownJobs(line).map(j=>num(j.due)));
 eligible.sort((a,b)=>sort==='occupation'?ownJobs(b).length/b.capacity-ownJobs(a).length/a.capacity:sort==='delivery'?nextDue(a)-nextDue(b):String(a.name).localeCompare(String(b.name),'pt-BR'));
 panel.querySelector('#ae-industrial-lines').innerHTML=eligible.map(line=>{
  const own=jobs.filter(j=>line.id===null?!j.plantId:String(j.plantId)===String(line.id));
  const pct=Math.min(100,Math.round(own.length/line.capacity*100));
  const details=own.slice().sort((a,b)=>num(a.due)-num(b.due)).slice(0,5).map(j=>{
   const remaining=Math.round(num(j.due)-num(s.day));
   return '<div class="ae-id-job"><span>'+esc(j.model||'Veículo')+'</span><span>'+(remaining<0?'Atrasado '+Math.abs(remaining)+' d':remaining===0?'Entrega hoje':'Em '+remaining+' d')+'</span></div>';
  }).join('');
  return '<div class="ae-id-line"><h4>'+esc(line.name)+'</h4><p>Ocupação '+own.length+'/'+line.capacity+' · Nível '+line.level+(line.staff===null?'':' · Equipe '+line.staff)+'</p><div class="ae-id-progress"><span style="width:'+pct+'%"></span></div>'+(details||'<p>Sem ordens em andamento.</p>')+(own.length>5?'<p>Mais '+(own.length-5)+' ordem(ns).</p>':'')+'</div>';
 }).join('')||'<p class="tiny">Nenhuma fábrica corresponde ao filtro selecionado.</p>';
 panel.querySelector('#ae-industrial-note').textContent=upcoming?'Próxima entrega prevista: dia '+Math.floor(num(upcoming.due))+'. Prazos podem mudar por crises ou falta de espaço no estoque.':'Nenhuma entrega programada. Os valores representam custos já comprometidos e salários futuros, não uma previsão de receita.';
}
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
