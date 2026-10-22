/* Auto Empire Tycoon — Alpha 5.8: attributed factory economics. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function ensure(){
 const e=s?.empire?.economy;if(!e)return null;
 if(!e.plantFinance||typeof e.plantFinance!=='object')e.plantFinance={sales:[],payroll:[],lastPayrollDay:0};
 const f=e.plantFinance;
 if(!Array.isArray(f.sales))f.sales=[];
 if(!Array.isArray(f.payroll))f.payroll=[];
 f.sales=f.sales.filter(x=>x&&typeof x==='object').slice(-500);
 f.payroll=f.payroll.filter(x=>x&&typeof x==='object').slice(-300);
 return f;
}
const panel=document.createElement('section');panel.id='ae-plant-finance';panel.className='panel';
panel.innerHTML='<h3>Rentabilidade por fábrica</h3><p class="tiny">Compare vendas atribuídas, margem industrial e salários registrados por unidade.</p><div id="ae-plant-finance-list"></div><p class="tiny">Margem estimada = receita das vendas − custo de fabricação − salários registrados. Não inclui todos os impostos, despesas corporativas ou investimentos de expansão. Histórico anterior à atualização não é reconstruído.</p>';
const style=document.createElement('style');style.textContent=`
#ae-plant-finance{padding:14px;margin:12px 0}
#ae-plant-finance h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
.ae-pf-card{border:1px solid #385064;background:#20384b;border-radius:10px;padding:12px;margin:10px 0}
.ae-pf-card h4{margin:0 0 8px;font-size:13px}
.ae-pf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.ae-pf-grid small{display:block;color:#c3d4df;font-size:11px}
.ae-pf-grid b{display:block;font-size:13px;margin-top:3px;overflow-wrap:anywhere}
`;document.head.append(style);
const dashboard=document.getElementById('ae-industrial-dashboard');
if(dashboard?.parentNode)dashboard.parentNode.insertBefore(panel,dashboard.nextSibling);else garage.append(panel);
function refresh(){
 const e=s?.empire?.economy,f=ensure();if(!e||!f)return;
 const plants=Array.isArray(e.plantNetwork?.plants)?e.plantNetwork.plants:[];
 const lines=[...(e.factory?.opened?[{id:null,name:'Fábrica principal'}]:[]),...plants];
 panel.querySelector('#ae-plant-finance-list').innerHTML=lines.map(p=>{
  const matches=x=>(p.id==null?x.plantId==null:String(x.plantId)===String(p.id));
  const sales=f.sales.filter(matches);
  const revenue=sales.reduce((a,x)=>a+num(x.revenue),0);
  const costs=sales.reduce((a,x)=>a+num(x.cost),0);
  const payroll=f.payroll.filter(matches).reduce((a,x)=>a+num(x.amount),0);
  const margin=revenue-costs-payroll;
  const fields=[['Unidades vendidas',sales.length],['Receita atribuída',money(revenue)],['Custo dos vendidos',money(costs)],['Salários registrados',money(payroll)],['Margem estimada',money(margin)],['Margem sobre receita',revenue?(margin/revenue*100).toFixed(1).replace('.',',')+'%':'—']];
  return '<div class="ae-pf-card"><h4>'+esc(p.name)+'</h4><div class="ae-pf-grid">'+fields.map(([k,v])=>'<div><small>'+k+'</small><b>'+v+'</b></div>').join('')+'</div></div>';
 }).join('')||'<p class="tiny">Funde uma fabricante para consultar os relatórios.</p>';
}
const previousAccept=acceptOffer;
acceptOffer=function(i){
 const car=(s.stock||[]).find(x=>x.id===modalCar);
 const record=car?.manufactured?{plantId:car.plantId??null,day:s.day,revenue:num(car.offers?.[i]?.amount),cost:num(car.bought)+num(car.spent)}:null;
 const before=num(s.sales);
 const result=previousAccept(i);
 if(record&&num(s.sales)>before&&record.revenue>0){const f=ensure();if(f){f.sales.push(record);f.sales=f.sales.slice(-500);save();refresh();}}
 return result;
};
const previousTick=tickDay;
tickDay=function(){
 const before=s.day,result=previousTick();
 if(s.day===before)return result;
 const f=ensure();if(!f)return result;
 const plants=s.empire?.economy?.plantNetwork?.plants||[];
 if(s.day%30===0&&f.lastPayrollDay!==s.day){
  f.lastPayrollDay=s.day;
  for(const p of plants){const amount=Math.max(0,num(p.staff))*1100*Math.max(1,num(p.level));if(amount)f.payroll.push({plantId:p.id,day:s.day,amount});}
  f.payroll=f.payroll.slice(-300);save();
 }
 refresh();return result;
};
const previousSeed=seed;seed=function(){previousSeed();ensure();refresh();};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
