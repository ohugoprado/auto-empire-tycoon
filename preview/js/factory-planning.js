/* Alpha 4.6 — factory production planning, read-only economic forecast. */
(function(){
'use strict';
const host=document.getElementById('ae-economy');if(!host)return;
const panel=document.createElement('section');panel.id='ae-factory-planning';
panel.innerHTML='<h3>Planejamento industrial</h3><p class="tiny">Previsões estimadas com base na campanha; não garantem vendas ou lucros.</p><div class="ae-plan-grid" id="ae-plan-kpis"></div><div id="ae-plan-queue"></div><p class="tiny" id="ae-plan-warning"></p>';
host.append(panel);
const style=document.createElement('style');style.textContent=`
#ae-factory-planning{margin-top:14px;padding-top:14px;border-top:1px solid var(--ae-stroke,#43576a)}
#ae-factory-planning h3{font-size:15px;margin:0 0 7px;color:#f4d38b}
.ae-plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
.ae-plan-kpi{background:#223247;border:1px solid #38536b;border-radius:10px;padding:11px;min-width:0}
.ae-plan-kpi small{display:block;color:#c4d3df;font-size:11px;margin-bottom:5px}
.ae-plan-kpi strong{display:block;font-size:15px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.ae-plan-job{padding:10px 0;border-bottom:1px solid #34495c;font-size:12px}
.ae-plan-job b{display:block;margin-bottom:4px}
#ae-plan-warning{line-height:1.5;color:#f4cf89}
`;document.head.append(style);
const cash=n=>Math.round(n).toLocaleString('pt-BR')+' CR';
const safe=n=>Number.isFinite(Number(n))?Number(n):0;
const escText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function refresh(){
 if(typeof s==='undefined'||!s)return;
 const e=s.empire?.economy,f=e?.factory;if(!e||!f)return;
 const queue=Array.isArray(f.queue)?f.queue:[];
 const committed=queue.reduce((a,j)=>a+Math.max(0,safe(j.cost)),0);
 const estimated=queue.reduce((a,j)=>a+Math.max(0,safe(j.value)),0);
 const stock=(Array.isArray(s.stock)?s.stock:[]);
 const free=Math.max(0,safe(s.slots)-stock.length);
 const crisis=window.AEEconomy?.crisisFor?.(s.empire?.world?.active)||e.crisis||{id:'stable',name:'Estabilidade',demand:1,cost:1};
 const demand=Math.max(0,Math.min(1,safe(crisis.demand)||1));
 const rows=[
 ['Produção em andamento',queue.length+' veículo(s)'],
 ['Vagas livres no estoque',free+' / '+safe(s.slots)],
 ['Capital já comprometido',cash(committed)],
 ['Margem bruta projetada',cash(estimated-committed)]
 ];
 panel.querySelector('#ae-plan-kpis').innerHTML=rows.map(([k,v])=>'<div class="ae-plan-kpi"><small>'+k+'</small><strong>'+v+'</strong></div>').join('');
 panel.querySelector('#ae-plan-queue').innerHTML=queue.length?'<h4>Ordens em andamento</h4>'+queue.slice(0,20).map(j=>'<div class="ae-plan-job"><b>'+escText(j.model||'Veículo')+'</b>Previsão: dia '+Math.max(1,Math.floor(safe(j.due)))+' · custo '+cash(safe(j.cost))+' · valor estimado '+cash(safe(j.value))+'</div>').join(''):'<p class="tiny">Nenhuma ordem de produção ativa.</p>';
 const alerts=[];
 if(!f.opened)alerts.push('Abra sua fabricante para começar a produzir.');
 if(queue.length>free)alerts.push('Atenção: '+(queue.length-free)+' veículo(s) podem ficar aguardando vaga na garagem.');
 if(crisis.id==='war'||crisis.id==='supply')alerts.push('Produção sujeita a atrasos: '+crisis.name+'.');
 else if(demand<.8)alerts.push('Demanda reduzida durante '+crisis.name+'. Evite excesso de estoque.');
 if(e.bankrupt)alerts.push('Campanha encerrada por falência.');
 panel.querySelector('#ae-plan-warning').textContent=alerts.join(' ');
}
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
