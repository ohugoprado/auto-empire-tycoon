/* iPhone trading workflow: sortable stock and market, margin previews and fast offers. */
(function(){
'use strict';
const key='ae_iphone_trading_v1';
let prefs={stock:'offers',market:'opportunity'};
try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(saved&&typeof saved==='object')prefs={...prefs,...saved}}catch(e){}
const css=document.createElement('style');css.textContent=`
#ae-trade-stock,#ae-trade-market{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 12px;padding:10px;background:#1d303c;border:1px solid #395364;border-radius:11px}
.ae-trade-label{font-size:12px;font-weight:700;color:#d7e6ed}
.ae-trade-sort{min-height:44px;max-width:58%;border:1px solid #607584;border-radius:9px;background:#283d4b;color:#f4f7f8;padding:7px;font-size:16px}
.ae-trade-chip{display:inline-block;font-size:11px;font-weight:700;padding:6px 9px;border-radius:8px;margin:6px 0;background:#2b4653;color:#ccece1}
.ae-trade-chip.negative{background:#563639;color:#ffd6d2}
.ae-trade-help{font-size:11px;color:#c0d0d9;margin:5px 0}
#ae-trade-stock-summary,#ae-trade-market-summary{font-size:11px;color:#b8cbd4;margin-bottom:5px}
@media(max-width:350px){.ae-trade-label{font-size:11px}.ae-trade-sort{max-width:60%}}
`;document.head.append(css);
const controls=[
{id:'stock',root:'garage',target:'stock',options:[['offers','Propostas primeiro'],['profit','Maior margem'],['price','Maior valor'],['age','Mais tempo à venda'],['name','Nome A–Z']]},
{id:'market',root:'market',target:'listings',options:[['opportunity','Maior oportunidade'],['affordable','Menor preço'],['condition','Melhor conservação'],['name','Nome A–Z']]}
];
for(const spec of controls){
 const target=document.getElementById(spec.target);if(!target)continue;
 const bar=document.createElement('div');bar.id='ae-trade-'+spec.id;
 const label=document.createElement('label');label.className='ae-trade-label';label.textContent=spec.id==='stock'?'Ordenar estoque':'Ordenar mercado';label.htmlFor='ae-trade-select-'+spec.id;
 const select=document.createElement('select');select.id=label.htmlFor;select.className='ae-trade-sort';
 for(const [value,text] of spec.options){const opt=document.createElement('option');opt.value=value;opt.textContent=text;select.append(opt)}
 select.value=spec.options.some(o=>o[0]===prefs[spec.id])?prefs[spec.id]:spec.options[0][0];
 bar.append(label,select);
 target.parentNode.insertBefore(bar,target);
 const summary=document.createElement('p');summary.id='ae-trade-'+spec.id+'-summary';bar.after(summary);
 select.addEventListener('change',()=>{prefs[spec.id]=select.value;try{localStorage.setItem(key,JSON.stringify(prefs))}catch(e){}refresh()});
}
const amount=v=>Number.isFinite(Number(v))?Number(v):0;
const basis=c=>amount(c.bought)+amount(c.spent);
const bestOffer=c=>(c.offers||[]).reduce((a,o)=>Math.max(a,amount(o.amount)),0);
const estimatedMargin=c=>amount(c.value)-amount(c.ask);
function ordered(items,mode,type){
 const list=[...items];
 list.sort((a,b)=>{
  if(mode==='name')return String(a.name).localeCompare(String(b.name),'pt-BR');
  if(type==='stock'){
   if(mode==='offers')return (b.offers?.length||0)-(a.offers?.length||0)||bestOffer(b)-bestOffer(a);
   if(mode==='profit')return (bestOffer(b)||amount(b.price)||amount(b.value))-basis(b)-((bestOffer(a)||amount(a.price)||amount(a.value))-basis(a));
   if(mode==='price')return (amount(b.price)||amount(b.value))-(amount(a.price)||amount(a.value));
   if(mode==='age')return amount(b.days)-amount(a.days);
  }else{
   if(mode==='affordable')return amount(a.ask)-amount(b.ask);
   if(mode==='condition')return amount(b.condition)-amount(a.condition);
   if(mode==='opportunity')return estimatedMargin(b)-estimatedMargin(a);
  }
  return 0;
 });
 return list;
}
function decorate(target,items,type){
 const root=document.getElementById(target);if(!root)return;
 const cards=[...root.children].filter(el=>el.classList?.contains('panel'));
 // The original game renders one card per vehicle in array order.
 if(cards.length!==items.length)return;
 const orderedItems=ordered(items,prefs[type],type);
 const byId=new Map(items.map((item,i)=>[item.id,cards[i]]));
 const frag=document.createDocumentFragment();
 for(const car of orderedItems){
  const card=byId.get(car.id);if(!card)continue;
  let chip=card.querySelector('.ae-trade-chip');
  if(!chip){chip=document.createElement('div');chip.className='ae-trade-chip';card.insertBefore(chip,card.firstChild)}
  if(type==='stock'){
   const offers=car.offers||[],top=bestOffer(car);
   const value=top||amount(car.price)||amount(car.value);
   const margin=value-basis(car);
   chip.textContent=(offers.length?'Propostas: '+offers.length+' · ':'')+(top?'Lucro da melhor proposta: ':'Margem potencial: ')+fmt(margin);
   chip.classList.toggle('negative',margin<0);
  }else{
   const difference=estimatedMargin(car);
   chip.textContent='Diferença para avaliação: '+(difference>=0?'+':'')+fmt(difference);
   chip.classList.toggle('negative',difference<0);
  }
  frag.append(card);
 }
 root.append(frag);
}
function refresh(){
 if(!s)return;
 decorate('stock',s.stock,'stock');decorate('listings',s.market,'market');
 const stockSummary=document.getElementById('ae-trade-stock-summary');
 if(stockSummary)stockSummary.textContent=s.stock.length+' veículo(s) · '+s.stock.filter(c=>c.listed).length+' anunciado(s) · '+s.stock.reduce((n,c)=>n+(c.offers?.length||0),0)+' proposta(s)';
 const marketSummary=document.getElementById('ae-trade-market-summary');
 if(marketSummary)marketSummary.textContent=s.market.length+' oportunidade(s) · diferença para avaliação não inclui reparos, impostos ou negociação';
}
const prevRender=render;
render=function(){prevRender();refresh()};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
