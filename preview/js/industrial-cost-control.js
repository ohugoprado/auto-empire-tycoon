/* Auto Empire Tycoon — Alpha 6.7: carrying costs and industrial cash discipline. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.industrialCosts||typeof s.industrialCosts!=='object')s.industrialCosts={lastChargedDay:0,total:0,records:[]};
 const c=s.industrialCosts;
 if(!Array.isArray(c.records))c.records=[];
 c.lastChargedDay=Math.max(0,Math.floor(n(c.lastChargedDay)));
 c.total=Math.max(0,n(c.total));
 return c;
}
function costFor(c){
 // In-game storage, insurance and depreciation handling for unsold manufactured stock.
 return Math.max(12,Math.min(250,Math.round(n(c.value)*.00035)));
}
const panel=document.createElement('section');panel.className='panel';panel.id='ae-industrial-cost-control';
panel.innerHTML='<h3>Custos de estoque industrial</h3><p class="tiny">Carros fabricados e não vendidos geram despesas diárias de armazenagem, conservação e seguro. O valor é descontado do caixa ao avançar o dia.</p><div id="ae-ic-summary"></div><div id="ae-ic-detail"></div>';
const style=document.createElement('style');style.textContent=`
#ae-industrial-cost-control{padding:14px;margin:12px 0}
#ae-industrial-cost-control h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-ic-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:11px 0}
.ae-ic-stat{background:#20384b;border-radius:9px;padding:10px;font-size:11px}
.ae-ic-stat strong{display:block;font-size:15px;margin-top:5px}
#ae-ic-detail{font-size:12px;color:#c9d8e0;line-height:1.6}
`;document.head.append(style);
const plan=document.getElementById('ae-industrial-planning');
if(plan?.parentNode)plan.after(panel);else garage.append(panel);
function refresh(){
 const c=ensure();if(!c)return;
 const own=(s.stock||[]).filter(v=>v.manufactured);
 const daily=own.reduce((a,v)=>a+costFor(v),0);
 const last30=c.records.filter(r=>n(r.day)>n(s.day)-30).reduce((a,r)=>a+n(r.amount),0);
 panel.querySelector('#ae-ic-summary').innerHTML='<div class="ae-ic-stat">Veículos próprios parados<strong>'+own.length+'</strong></div><div class="ae-ic-stat">Custo diário estimado<strong>'+money(daily)+'</strong></div><div class="ae-ic-stat">Últimos 30 dias<strong>'+money(last30)+'</strong></div><div class="ae-ic-stat">Total pago<strong>'+money(c.total)+'</strong></div>';
 panel.querySelector('#ae-ic-detail').textContent='Projeção de 30 dias com o estoque atual: '+money(daily*30)+'. Custos de fabricação e folha salarial são contabilizados separadamente.';
}
const previousTick=tickDay;
tickDay=function(){
 const before=n(s?.day),result=previousTick();
 if(!s||n(s.day)<=before)return result;
 const c=ensure();if(!c||c.lastChargedDay>=s.day)return result;
 const vehicles=(s.stock||[]).filter(v=>v.manufactured);
 const estimated=vehicles.reduce((a,v)=>a+costFor(v),0);
 // Charge only what is actually affordable. Never silently create negative cash.
 const charged=Math.max(0,Math.min(Math.max(0,n(s.cash)),estimated));
 if(charged>0){
  s.cash-=charged;c.total+=charged;c.records.push({day:s.day,amount:charged});
  c.records=c.records.slice(-180);
  entry('Estoque industrial · manutenção diária',-charged);
 }
 c.lastChargedDay=s.day;
 if(estimated>charged&&estimated>0)note('Alerta industrial: caixa insuficiente para cobrir todo o custo de armazenagem ('+money(estimated)+').');
 if(charged>0&&s.day%7===0)note('Custos de estoque industrial: '+money(charged)+' no dia.');
 save();refresh();return result;
};
const previousSeed=seed;seed=function(){previousSeed();ensure();refresh();};
const previousRender=render;let last='';
render=function(){previousRender();const c=ensure(),signature=[s?.day,s?.cash,s?.stock?.length,c?.total].join('|');if(last!==signature){last=signature;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
