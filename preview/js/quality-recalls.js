/* Auto Empire Tycoon — Alpha 5.4: manufacturer quality, warranty and recalls. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const number=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function ensure(){
 const e=s?.empire?.economy;if(!e)return null;
 if(!e.qualityProgram||typeof e.qualityProgram!=='object')e.qualityProgram={sold:[],claimsPaid:0,recalls:0,inspections:0,lastDay:-1};
 const q=e.qualityProgram;
 if(!Array.isArray(q.sold))q.sold=[];
 q.sold=q.sold.filter(x=>x&&typeof x==='object').slice(-120);
 q.claimsPaid=Math.max(0,number(q.claimsPaid));q.recalls=Math.max(0,Math.floor(number(q.recalls)));
 q.inspections=Math.max(0,Math.floor(number(q.inspections)));
 q.lastDay=Number.isFinite(Number(q.lastDay))?Number(q.lastDay):-1;
 return q;
}
const panel=document.createElement('section');panel.id='ae-quality-recalls';panel.className='panel';
panel.innerHTML='<h3>Qualidade e pós-venda</h3><p class="tiny">Acompanhe os veículos da sua marca após a venda, custos de garantia e campanhas de recall.</p><div id="ae-quality-summary"></div><div id="ae-quality-models"></div><button type="button" id="ae-quality-recall">Realizar recall preventivo</button><p class="tiny" id="ae-quality-help"></p>';
const style=document.createElement('style');style.textContent=`
#ae-quality-recalls{padding:14px;margin:12px 0}
#ae-quality-recalls h3{font-size:15px;margin:0 0 8px;color:#f4d38b}
#ae-quality-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}
.ae-quality-metric{background:#20384b;border-radius:9px;padding:10px}
.ae-quality-metric small{display:block;font-size:11px;color:#c1d3df}
.ae-quality-metric b{display:block;margin-top:4px;font-size:15px}
.ae-quality-model{padding:9px 0;border-bottom:1px solid #385064;font-size:12px}
#ae-quality-recall{width:100%;min-height:44px;margin-top:12px}
#ae-quality-help{line-height:1.5}
`;document.head.append(style);
const brand=document.getElementById('ae-brand-growth');
if(brand?.parentNode)brand.parentNode.insertBefore(panel,brand.nextSibling);else garage.append(panel);
function brandPenalty(amount){
 const b=s.empire?.economy?.brandGrowth;if(!b)return;
 b.loyalty=clamp(number(b.loyalty)-amount,0,100);
 b.awareness=clamp(number(b.awareness)-amount*.25,0,100);
}
function refresh(){
 const q=ensure();if(!q)return;
 const active=q.sold.filter(x=>!x.closed);
 const atRisk=active.filter(x=>x.issue);
 const metrics=[['Garantias ativas',active.length],['Casos em análise',atRisk.length],['Custos de garantia',money(q.claimsPaid)],['Recalls realizados',q.recalls]];
 panel.querySelector('#ae-quality-summary').innerHTML=metrics.map(([k,v])=>'<div class="ae-quality-metric"><small>'+k+'</small><b>'+v+'</b></div>').join('');
 panel.querySelector('#ae-quality-models').innerHTML=atRisk.length?'<b>Veículos que precisam de atenção</b>'+atRisk.slice(0,8).map(x=>'<div class="ae-quality-model">'+escapeHTML(x.name)+' · vendido no dia '+Math.floor(number(x.day))+'</div>').join(''):'<p class="tiny">Nenhum caso de garantia pendente.</p>';
 const button=panel.querySelector('#ae-quality-recall');
 button.disabled=!atRisk.length||!!s.empire.economy.bankrupt;
 button.textContent='Realizar recall ('+atRisk.length+' veículo(s))';
 panel.querySelector('#ae-quality-help').textContent='Um recall cobre os casos pendentes e recupera parte da fidelidade, mas gera despesas. Garantias são simuladas somente durante os dias da campanha.';
}
panel.querySelector('#ae-quality-recall').addEventListener('click',()=>{
 const q=ensure();if(!q||s.empire.economy.bankrupt)return;
 const affected=q.sold.filter(x=>!x.closed&&x.issue);
 if(!affected.length)return toast('Não há veículos aguardando recall');
 const cost=affected.reduce((sum,x)=>sum+Math.max(400,Math.round(number(x.value)*.055)),0);
 if(number(s.cash)<cost)return toast('Caixa insuficiente para realizar o recall');
 if(!confirm('Convocar '+affected.length+' veículo(s) para recall por '+money(cost)+'?'))return;
 s.cash-=cost;q.claimsPaid+=cost;q.recalls++;
 for(const x of affected){x.issue=false;x.closed=true;}
 const b=s.empire.economy.brandGrowth;if(b)b.loyalty=clamp(number(b.loyalty)+Math.min(5,affected.length),0,100);
 entry('Recall de fábrica',-cost);note('Recall concluído: '+affected.length+' veículo(s) atendidos.');
 save();render();refresh();
});
const previousAccept=acceptOffer;
acceptOffer=function(i){
 const car=(s.stock||[]).find(x=>x.id===modalCar);
 const sold=car?.manufactured?{name:String(car.name||'Veículo').slice(0,80),day:s.day,value:Math.max(0,number(car.value)),quality:clamp(number(car.designQuality)||65,1,100),issue:!!car.qualityIssue,closed:false}:null;
 const before=number(s.sales);
 const result=previousAccept(i);
 if(sold&&number(s.sales)>before){
  const q=ensure();if(q){q.sold.push(sold);q.sold=q.sold.slice(-120);save();refresh();}
 }
 return result;
};
const previousTick=tickDay;
tickDay=function(){
 const before=s.day,result=previousTick();
 if(s.day===before)return result;
 const q=ensure();if(!q||q.lastDay===s.day)return result;
 q.lastDay=s.day;
 for(const x of q.sold){
  if(x.closed)continue;
  const age=s.day-number(x.day);
  if(age>90){x.closed=true;continue;}
  if(x.issue&&age>=3){
   const claim=Math.max(250,Math.round(number(x.value)*.025));
   s.cash-=claim;q.claimsPaid+=claim;x.issue=false;x.closed=true;
   brandPenalty(1.5);entry('Garantia · '+x.name,-claim);note('Garantia acionada: '+x.name+'. Custo '+money(claim)+'.');
  }else if(!x.issue&&age>=10&&age<=90&&age%19===0){
   const chance=clamp((100-number(x.quality))/1800,.002,.03);
   if(Math.random()<chance){x.issue=true;brandPenalty(.6);note('Alerta de qualidade: '+x.name+' requer avaliação de garantia.');}
  }
 }
 save();refresh();return result;
};
const previousSeed=seed;
seed=function(){previousSeed();ensure();refresh();};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
