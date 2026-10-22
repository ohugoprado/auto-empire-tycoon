/* Auto Empire Tycoon — Alpha 6.5: demand-informed industrial planning. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const panel=document.createElement('section');panel.id='ae-industrial-planning';panel.className='panel';
panel.innerHTML='<h3>Planejamento da fabricante</h3><p class="tiny">Compare produção, estoque e vendas por modelo homologado antes de investir em novos lotes.</p><div id="ae-plan-kpis"></div><div id="ae-plan-models"></div><p class="tiny">Indicadores históricos desta campanha. Vendas passadas não garantem demanda futura.</p>';
const style=document.createElement('style');style.textContent=`
#ae-industrial-planning{padding:14px;margin:12px 0}
#ae-industrial-planning h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-plan-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
.ae-plan-kpi{background:#20384b;border-radius:9px;padding:10px;font-size:12px}
.ae-plan-kpi b{display:block;font-size:16px;margin-top:4px}
.ae-plan-model{background:#20384b;border:1px solid #3d5b6b;border-radius:10px;padding:12px;margin:10px 0}
.ae-plan-model h4{margin:0 0 7px;font-size:13px}
.ae-plan-model p{margin:4px 0;color:#c4d7e0;font-size:12px}
.ae-plan-model button{min-height:44px;margin-top:9px;font-size:12px}
`;document.head.append(style);
const dashboard=document.getElementById('ae-industrial-dashboard');
if(dashboard?.parentNode)dashboard.after(panel);else garage.append(panel);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.productionAnalytics||typeof s.productionAnalytics!=='object')s.productionAnalytics={sales:[],seen:0};
 if(!Array.isArray(s.productionAnalytics.sales))s.productionAnalytics.sales=[];
 return s.productionAnalytics;
}
function snapshot(){
 const a=ensure();if(!a)return;
 const e=s.empire?.economy,f=e?.factory,designs=e?.studio?.designs||[];
 const queue=f?.queue||[];
 const total=queue.reduce((sum,j)=>sum+n(j.cost),0);
 panel.querySelector('#ae-plan-kpis').innerHTML='<div class="ae-plan-kpi">Em produção<b>'+queue.length+' veículos</b></div><div class="ae-plan-kpi">Capital comprometido<b>'+money(total)+'</b></div><div class="ae-plan-kpi">Fabricados em estoque<b>'+s.stock.filter(c=>c.manufactured).length+'</b></div><div class="ae-plan-kpi">Vendas próprias registradas<b>'+a.sales.length+'</b></div>';
 panel.querySelector('#ae-plan-models').innerHTML=designs.map(d=>{
  const queued=queue.filter(j=>j.designId===d.id).length;
  const stock=s.stock.filter(c=>c.manufactured&&c.designId===d.id);
  const sold=a.sales.filter(x=>x.designId===d.id);
  const profit=sold.reduce((sum,x)=>sum+x.profit,0);
  const demand=window.AEIndustrialDemand?.active?.()||null;
  return '<div class="ae-plan-model"><h4>'+esc(d.name)+'</h4><p>'+esc(d.kind)+' · Qualidade '+n(d.quality)+'/100</p><p>Em fabricação: <b>'+queued+'</b> · Em estoque: <b>'+stock.length+'</b> · Vendidos: <b>'+sold.length+'</b></p><p>Resultado realizado nas vendas registradas: <b>'+money(profit)+'</b></p><p>Custo estimado por unidade: '+money(d.cost)+'</p><button type="button" data-ae-plan-order="'+esc(d.id)+'">Programar novo lote</button></div>';
 }).join('')||'<p class="tiny">Homologue um projeto para começar a planejar a produção.</p>';
}
panel.addEventListener('click',e=>{
 const btn=e.target.closest('[data-ae-plan-order]');if(!btn)return;
 const id=btn.dataset.aePlanOrder,studio=document.getElementById('ae-studio');
 const target=studio?.querySelector('[data-ae-order="'+id+'"]');
 if(!target)return toast('Abra o centro de desenvolvimento para produzir.');
 if(document.getElementById('garage')?.classList.contains('hide'))show('garage');
 target.click();
 document.getElementById('ae-production-dialog')?.scrollIntoView({behavior:'smooth',block:'center'});
});
const priorAccept=acceptOffer;
acceptOffer=function(i){
 const car=s?.stock?.find(c=>c.id===modalCar),offer=car?.offers?.[i];
 const before=n(s?.sales),record=car?.manufactured&&offer?{designId:car.designId||null,name:car.name,color:car.colorName||car.color,day:s.day,profit:n(offer.amount)-n(car.bought)-n(car.spent)}:null;
 const result=priorAccept(i);
 if(record&&n(s.sales)>before){const a=ensure();a.sales.push(record);a.sales=a.sales.slice(-250);save();snapshot();}
 return result;
};
const previousSeed=seed;seed=function(){previousSeed();ensure();snapshot();};
const previousRender=render;let last='';
render=function(){previousRender();const a=ensure(),e=s?.empire?.economy;const signature=[s?.day,s?.cash,s?.sales,s?.stock?.length,e?.factory?.queue?.length,a?.sales?.length,e?.studio?.designs?.length].join('|');if(last!==signature){last=signature;snapshot();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(snapshot);
ensure();snapshot();
})();
