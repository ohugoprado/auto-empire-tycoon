/* Auto Empire Tycoon — Alpha 5.3: brand equity and regional reach. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const num=n=>Number.isFinite(Number(n))?Number(n):0;
const money=n=>Math.round(n).toLocaleString('pt-BR')+' CR';
const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ensure(){
 const e=s?.empire?.economy;if(!e)return null;
 if(!e.brandGrowth||typeof e.brandGrowth!=='object')e.brandGrowth={awareness:12,loyalty:35,unitsSold:0,marketingSpent:0,regional:{},lastCampaignDay:-1};
 const b=e.brandGrowth;
 b.awareness=clamp(num(b.awareness),0,100);
 b.loyalty=clamp(num(b.loyalty),0,100);
 b.unitsSold=Math.max(0,Math.floor(num(b.unitsSold)));
 b.marketingSpent=Math.max(0,num(b.marketingSpent));
 if(!b.regional||typeof b.regional!=='object')b.regional={};
 b.lastCampaignDay=Number.isFinite(Number(b.lastCampaignDay))?Number(b.lastCampaignDay):-1;
 return b;
}
const panel=document.createElement('section');panel.id='ae-brand-growth';panel.className='panel';
panel.innerHTML='<h3>Marca e participação de mercado</h3><p class="tiny">Desenvolva o reconhecimento da sua fabricante e conquiste clientes em novos mercados.</p><div id="ae-brand-metrics" class="ae-brand-metrics"></div><div id="ae-brand-regions"></div><button type="button" id="ae-brand-campaign">Campanha de marketing</button><p class="tiny" id="ae-brand-hint"></p>';
const style=document.createElement('style');style.textContent=`
#ae-brand-growth{padding:14px;margin:12px 0}
#ae-brand-growth h3{font-size:15px;margin:0 0 9px;color:#f4d38b}
.ae-brand-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}
.ae-brand-metrics div{border-radius:9px;background:#20384b;padding:10px;min-width:0}
.ae-brand-metrics small{display:block;color:#c1d3df;font-size:11px}
.ae-brand-metrics strong{display:block;font-size:16px;margin-top:4px;font-variant-numeric:tabular-nums}
#ae-brand-regions{font-size:12px;line-height:1.65;margin:12px 0}
#ae-brand-campaign{min-height:44px;width:100%}
#ae-brand-hint{line-height:1.5}
`;document.head.append(style);
const rivals=document.getElementById('ae-rival-manufacturers');
if(rivals?.parentNode)rivals.parentNode.insertBefore(panel,rivals.nextSibling);
else garage.append(panel);
function activeRegion(car){
 const city=car?.originCity||s.empire?.world?.active||'saopaulo';
 return String(city).slice(0,64);
}
function campaignCost(){return Math.round(6500*Math.max(1,num(s.empire?.economy?.inflation)));}
function refresh(){
 const b=ensure();if(!b)return;
 const regions=Object.entries(b.regional).sort((a,c)=>num(c[1])-num(a[1])).slice(0,5);
 const estimatedShare=clamp(Math.round(b.unitsSold/(b.unitsSold+40+Math.max(0,num(s.day))*2)*100),0,100);
 panel.querySelector('#ae-brand-metrics').innerHTML=[
 ['Reconhecimento',Math.round(b.awareness)+'%'],['Fidelidade',Math.round(b.loyalty)+'%'],
 ['Veículos próprios vendidos',b.unitsSold],['Participação estimada',estimatedShare+'%']
 ].map(([k,v])=>'<div><small>'+k+'</small><strong>'+v+'</strong></div>').join('');
 panel.querySelector('#ae-brand-regions').innerHTML='<b>Mercados com vendas próprias</b>'+(regions.length?regions.map(([region,count])=>'<div>'+escapeText(region)+' · '+Math.floor(num(count))+' venda(s)</div>').join(''):'<div>Nenhuma venda de fabricação própria registrada ainda.</div>');
 const cost=campaignCost();
 const button=panel.querySelector('#ae-brand-campaign');
 button.textContent='Investir em marketing · '+money(cost);
 button.disabled=!!s.empire.economy.bankrupt||b.lastCampaignDay===s.day||num(s.cash)<cost;
 panel.querySelector('#ae-brand-hint').textContent=b.lastCampaignDay===s.day?'Campanha realizada hoje. Aguarde o próximo dia.':'A campanha aumenta reconhecimento e fidelidade, mas não garante vendas. A participação é uma estimativa do jogo, não uma estatística real.';
}
panel.querySelector('#ae-brand-campaign').addEventListener('click',()=>{
 const b=ensure();if(!b||s.empire.economy.bankrupt)return;
 if(b.lastCampaignDay===s.day)return toast('Campanha já realizada hoje');
 const cost=campaignCost();if(num(s.cash)<cost)return toast('Caixa insuficiente');
 if(!confirm('Investir '+money(cost)+' em marketing?'))return;
 s.cash-=cost;b.marketingSpent+=cost;b.lastCampaignDay=s.day;
 b.awareness=clamp(b.awareness+4,0,100);b.loyalty=clamp(b.loyalty+1,0,100);
 entry('Marketing da fabricante',-cost);note('Campanha da fabricante elevou o reconhecimento da marca.');
 save();render();refresh();
});
const previousAccept=acceptOffer;
acceptOffer=function(i){
 const car=(s.stock||[]).find(c=>c.id===modalCar);
 const own=!!car?.manufactured;
 const region=own?activeRegion(car):null;
 const before=num(s.sales);
 const result=previousAccept(i);
 if(own&&num(s.sales)>before){
  const b=ensure();if(b){
   b.unitsSold++;b.awareness=clamp(b.awareness+1.2,0,100);
   b.loyalty=clamp(b.loyalty+(num(car.condition)>=95?1.5:.4),0,100);
   b.regional[region]=Math.max(0,Math.floor(num(b.regional[region])))+1;
   save();refresh();
  }
 }
 return result;
};
const previousTick=tickDay;
tickDay=function(){
 const before=s.day,result=previousTick();
 if(s.day!==before){
  const b=ensure();
  if(b&&s.day%30===0){b.awareness=clamp(b.awareness-.7,0,100);save();}
  refresh();
 }
 return result;
};
const previousSeed=seed;
seed=function(){previousSeed();ensure();refresh();};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
