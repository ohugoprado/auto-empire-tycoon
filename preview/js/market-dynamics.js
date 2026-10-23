/* Auto Empire Tycoon — Alpha 6.1: customer preferences, transparent market opportunities. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const buyers=[
 {name:'Famílias',kind:'SUV',min:70,bonus:.13},
 {name:'Primeiro carro',kind:'Compacto',min:55,bonus:.10},
 {name:'Mobilidade urbana',kind:'Hatch',min:65,bonus:.10},
 {name:'Frotistas',kind:'Picape',min:60,bonus:.11},
 {name:'Executivos',kind:'Sedã',min:78,bonus:.12},
 {name:'Entusiastas',kind:'Esportivo',min:82,bonus:.16}
];
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.marketDynamics||typeof s.marketDynamics!=='object')s.marketDynamics={cycle:0,focus:0,expires:0};
 const m=s.marketDynamics;
 if(!Number.isInteger(m.cycle))m.cycle=0;
 if(!Number.isInteger(m.focus))m.focus=0;
 if(!Number.isFinite(m.expires))m.expires=0;
 if(!m.expires){m.expires=s.day+7;m.focus=Math.floor(Math.random()*buyers.length);}
 return m;
}
const panel=document.createElement('section');panel.id='ae-market-dynamics';panel.className='panel';
panel.innerHTML='<h3>Demanda e oportunidades</h3><div id="ae-md-current"></div><div id="ae-md-list"></div><p class="tiny">Tendências mudam a cada 7 dias simulados. Não garantem venda: preço, conservação e concorrência continuam importantes.</p>';
const css=document.createElement('style');css.textContent=`
#ae-market-dynamics{padding:14px;margin:12px 0}
#ae-market-dynamics h3{font-size:15px;color:#f4d38b;margin:0 0 9px}
#ae-md-current{background:#20384b;padding:11px;border-radius:10px;font-size:12px;line-height:1.6}
.ae-md-row{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid #385064;padding:9px 0;font-size:12px}
.ae-md-row span:last-child{text-align:right}
.ae-md-good{color:#a7dfb9}
`;document.head.append(css);
const market=document.getElementById('market');
if(market)market.prepend(panel);else garage.append(panel);
function focus(){const m=ensure();return buyers[((m?.focus||0)%buyers.length+buyers.length)%buyers.length];}
function refresh(){
 const m=ensure();if(!m)return;
 const f=focus();
 panel.querySelector('#ae-md-current').innerHTML='<b>Procura em alta: '+esc(f.name)+'</b><div>Preferência: '+esc(f.kind)+' · conservação a partir de '+f.min+'%</div><div>Até '+Math.round(f.bonus*100)+'% mais disposição para negociar em veículos compatíveis.</div><div>Nova tendência em '+Math.max(0,Math.ceil(m.expires-s.day))+' dia(s).</div>';
 const cars=(s.market||[]).map(c=>({car:c,spread:num(c.value)-num(c.ask),ratio:num(c.value)>0?(num(c.value)-num(c.ask))/num(c.value):0})).filter(x=>x.spread>0).sort((a,b)=>b.ratio-a.ratio).slice(0,3);
 panel.querySelector('#ae-md-list').innerHTML=cars.map(x=>'<div class="ae-md-row"><span>'+esc(x.car.name)+' · '+esc(x.car.colorName||x.car.kind)+'</span><span class="ae-md-good">Diferença estimada '+money(x.spread)+'</span></div>').join('')||'<p class="tiny">Nenhuma oportunidade com preço abaixo da avaliação neste lote.</p>';
}
const previousTick=tickDay;
tickDay=function(){
 const before=s.day,result=previousTick();
 if(s.day===before)return result;
 const m=ensure();if(!m)return result;
 if(s.day>=m.expires){
  m.focus=(m.focus+1+Math.floor(Math.random()*(buyers.length-1)))%buyers.length;
  m.cycle++;m.expires=s.day+7;
  note('Mercado: maior procura de '+focus().name.toLowerCase()+' por '+focus().kind+'.');save();
 }
 refresh();return result;
};
const previousAccept=acceptOffer;
function prepareOffer(car,offer){
 if(!car||!offer||num(offer.amount)<=0||offer.marketDemandQuote?.version===1)return false;
 // The existing seller benefit is part of the baseline quote, as it was when
 // demand was applied at acceptance. Keep that ordering before freezing it.
 window.AEStaff?.prepareOffer?.(s,offer);
 const base=num(offer.amount);
 const f=focus();
 let bonus=0;
 // Freeze the actual buyer quote before it is displayed. Cancellation, reopen,
 // reload and a later trend cannot compound the same proposal's premium.
 if(car.kind===f.kind&&num(car.condition)>=f.min){
  const fair=num(car.value)*(.7+num(car.condition)/300);
  const ceiling=Math.max(num(offer.amount),Math.round(fair*(1+f.bonus)/100)*100);
  bonus=Math.min(ceiling-num(offer.amount),Math.round(num(offer.amount)*f.bonus/100)*100);
  if(bonus>0){offer.amount=num(offer.amount)+bonus;note('Demanda favorável de '+f.name.toLowerCase()+': oferta ajustada em '+money(bonus)+'.');}
 }
 offer.marketDemandQuote={version:1,day:s.day,kind:f.kind,base,bonus};
 return true;
}
const previousOffers=offersDialog;
offersDialog=function(id){
 const car=(s.stock||[]).find(c=>c.id===id);
 let changed=false;
 for(const offer of car?.offers||[])if(prepareOffer(car,offer))changed=true;
 if(changed)save();
 return previousOffers.apply(this,arguments);
};
acceptOffer=function(i){
 const car=(s.stock||[]).find(c=>c.id===modalCar),offer=car?.offers?.[i];
 const before=num(offer?.amount);
 if(prepareOffer(car,offer)){
  save();
  // Wrappers outside this module capture the displayed amount for customer
  // history. If a caller skipped the quote dialog, show the new quote first.
  if(num(offer.amount)!==before){offersDialog(car.id);toast('Proposta atualizada pela demanda. Confira o valor antes de aceitar.');return;}
 }
 const result=previousAccept(i);refresh();return result;
};
const previousSeed=seed;seed=function(){previousSeed();ensure();refresh();};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
