/* Auto Empire Tycoon — iPhone command center, no decorative imagery. */
(function(){
'use strict';
const css=document.createElement('style');css.textContent=`
#ae-command{margin:12px 0 14px;padding:14px;border-radius:16px;background:#192b37;border:1px solid #476070;color:#f2f5f7}
#ae-command h2{margin:0;font-size:16px;font-weight:800;letter-spacing:-.3px}
#ae-command-sub{margin:5px 0 13px;color:#bbced8;font-size:11px}
#ae-command-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ae-command-stat{min-width:0;background:#233946;border-radius:11px;padding:11px}
.ae-command-stat small{display:block;color:#b8cbd5;font-size:11px;margin-bottom:5px}
.ae-command-stat strong{display:block;font-size:17px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
#ae-command-alerts{display:grid;gap:6px;margin:12px 0}
.ae-command-alert{border-radius:9px;background:#30404b;padding:9px 11px;font-size:12px;line-height:1.4}
.ae-command-alert.urgent{background:#533337;color:#ffe0dc}
.ae-command-alert.good{background:#24463f;color:#c7f1dc}
#ae-command-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#ae-command-actions button{min-height:49px!important;font-size:12px!important;padding:10px 7px!important;background:#dcb76e!important;color:#19232c!important;border-radius:10px!important}
#ae-command-actions button.secondary{background:#314956!important;color:#edf3f5!important}
#ae-command-foot{margin-top:11px;font-size:11px;color:#b9ced8}
#ae-command-foot b{color:#f1d39c}
@media(max-width:350px){#ae-command-stats{grid-template-columns:1fr 1fr}#ae-command-actions{grid-template-columns:1fr}}
`;document.head.append(css);
const garage=document.getElementById('garage');if(!garage)return;
const panel=document.createElement('section');panel.id='ae-command';
panel.innerHTML='<h2>Central de comando</h2><p id="ae-command-sub"></p><div id="ae-command-stats"></div><div id="ae-command-alerts" aria-live="polite"></div><div id="ae-command-actions"><button data-command="buy">Comprar veículos</button><button data-command="sell" class="secondary">Gerenciar anúncios</button><button data-command="offers" class="secondary">Ver propostas</button><button data-command="factory" class="secondary">Minha fabricante</button></div><div id="ae-command-foot"></div>';
garage.insertBefore(panel,garage.firstChild);
function owned(){return s?.empire?.world?.owned||[]}
function activeCity(){const id=s?.empire?.world?.active;return window.AEWorld?.cities?.find(c=>c.id===id)?.name||'São Paulo'}
function alerts(){
 const arr=[];const econ=s?.empire?.economy;
 if(econ?.bankrupt)arr.push({text:'Empresa em falência. Esta campanha foi encerrada.',urgent:true});
 else if(econ?.distressDays)arr.push({text:'Risco de falência: '+econ.distressDays+'/7 dias de insolvência.',urgent:true});
 const crisis=window.AEEconomy?.crisisFor?.(s?.empire?.world?.active);
 if(crisis&&crisis.id!=='stable')arr.push({text:crisis.name+': '+crisis.description,urgent:crisis.id==='war'});
 const proposals=s.stock.reduce((n,c)=>n+(c.offers?.length||0),0);
 if(proposals)arr.push({text:proposals+' proposta(s) aguardando sua decisão.',good:true});
 if(s.stock.length>=s.slots)arr.push({text:'Estoque lotado: venda veículos ou amplie sua garagem.'});
 if(s.cash<5000&&!econ?.bankrupt)arr.push({text:'Reserva de caixa baixa. Evite novos custos até recuperar liquidez.',urgent:true});
 const queue=econ?.factory?.queue||[];
 if(queue.length)arr.push({text:queue.length+' veículo(s) em fabricação.'});
 if(!arr.length)arr.push({text:'Operação estável. Avalie oportunidades de compra e venda.',good:true});
 return arr.slice(0,4);
}
function refresh(){
 if(!s)return;
 const proposals=s.stock.reduce((n,c)=>n+(c.offers?.length||0),0);
 const listed=s.stock.filter(c=>c.listed).length;
 const cost=s.stock.reduce((n,c)=>n+(Number(c.bought)||0)+(Number(c.spent)||0),0);
 panel.querySelector('#ae-command-sub').textContent=activeCity()+' · Dia '+s.day+' · '+owned().length+' cidade(s) na rede';
 const values=[['Caixa',fmt(s.cash)],['Estoque',s.stock.length+'/'+s.slots],['Anunciados',listed+' veículo(s)'],['Propostas',String(proposals)]];
 panel.querySelector('#ae-command-stats').innerHTML=values.map(([label,value])=>'<div class="ae-command-stat"><small>'+label+'</small><strong>'+value+'</strong></div>').join('');
 panel.querySelector('#ae-command-alerts').innerHTML=alerts().map(a=>'<div class="ae-command-alert'+(a.urgent?' urgent':a.good?' good':'')+'">'+esc(a.text)+'</div>').join('');
 panel.querySelector('#ae-command-foot').innerHTML='Capital em veículos: <b>'+fmt(cost)+'</b> · Vendas totais: <b>'+s.sales+'</b>';
}
function focusTab(id){show(id);window.scrollTo?.({top:0,behavior:'auto'})}
panel.addEventListener('click',ev=>{
 const action=ev.target.closest('[data-command]')?.dataset.command;
 if(!action)return;
 if(action==='buy')return focusTab('market');
 if(action==='sell'){focusTab('garage');document.getElementById('stock')?.scrollIntoView({behavior:'smooth',block:'start'});return}
 if(action==='offers'){
  const c=s.stock.find(car=>car.offers?.length);if(!c)return toast('Nenhuma proposta pendente');
  return offersDialog(c.id);
 }
 if(action==='factory'){
  focusTab('garage');
  const fold=document.getElementById('fold-ae-studio');
  if(fold){const button=fold.querySelector('.ae-fold-head');if(button?.getAttribute('aria-expanded')==='false')button.click();fold.scrollIntoView({behavior:'smooth',block:'start'});}
  else document.getElementById('ae-studio')?.scrollIntoView({behavior:'smooth',block:'start'});
 }
});
const prevRender=render;let last='';
render=function(){
 prevRender();
 const key=[s.day,s.cash,s.stock.length,s.slots,s.sales,s.empire?.world?.active,s.empire?.economy?.crisis?.id,s.empire?.economy?.distressDays,s.empire?.economy?.factory?.queue?.length,s.stock.map(c=>(c.offers||[]).length).join(','),s.stock.map(c=>c.listed?1:0).join('')].join('|');
 if(key!==last){last=key;refresh()}
};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
