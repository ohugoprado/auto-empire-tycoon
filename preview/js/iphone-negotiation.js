/* Alpha 3.3 — iPhone negotiation aids, non-invasive: preserve core purchase/sale logic. */
(function(){
'use strict';
const css=document.createElement('style');css.textContent=`
#ae-neg-analysis{margin:12px 0;padding:12px;border:1px solid #506a7a;background:#1b303e;border-radius:12px}
#ae-neg-analysis h3{font-size:13px;color:#f5d391;margin:0 0 9px}
.ae-neg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.ae-neg-grid>div{background:#263e4b;border-radius:8px;padding:10px;min-width:0}
.ae-neg-grid small{display:block;color:#bfd1d9;font-size:11px;margin-bottom:4px}
.ae-neg-grid b{display:block;font-size:14px;overflow-wrap:anywhere}
.ae-neg-warn{font-size:12px;line-height:1.5;color:#ffcbc5;margin:10px 0 0}
.ae-neg-good{font-size:12px;line-height:1.5;color:#bcebd6;margin:10px 0 0}
.ae-neg-quick{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}
.ae-neg-quick button{flex:1 1 28%;min-height:44px!important;padding:8px 5px!important;background:#344e5b!important;color:#f4f6f8!important;font-size:12px!important}
#ae-neg-analysis input{font-size:16px!important}
`;document.head.append(css);
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const basis=c=>number(c?.bought)+number(c?.spent);
const round=v=>Math.max(100,Math.round(v/100)*100);
function insertAnalysis(field,car,mode){
 if(!field||!car)return;
 const box=document.createElement('section');box.id='ae-neg-analysis';
 box.innerHTML='<h3>Simulação financeira</h3><div class="ae-neg-grid" id="ae-neg-values"></div><div class="ae-neg-quick" id="ae-neg-quick"></div><p id="ae-neg-comment"></p>';
 field.insertAdjacentElement('afterend',box);
 const values=box.querySelector('#ae-neg-values'),comment=box.querySelector('#ae-neg-comment');
 const base=mode==='buy'?number(car.ask):basis(car);
 const presets=mode==='buy'?[.85,.92,1]:[1.05,1.15,1.3];
 for(const multiplier of presets){
  const btn=document.createElement('button');btn.type='button';
  btn.textContent=mode==='buy'?Math.round(multiplier*100)+'% pedido':Math.round(multiplier*100)+'% custo';
  btn.addEventListener('click',()=>{field.value=String(round(base*multiplier));field.dispatchEvent(new Event('input',{bubbles:true}));field.focus()});
  box.querySelector('#ae-neg-quick').append(btn);
 }
 function update(){
  const amount=number(field.value);
  const repair=mode==='buy'?Math.max(0,number(car.repair))*(100-number(car.condition))/100:0;
  const cost=mode==='buy'?amount+repair:basis(car);
  const value=mode==='buy'?number(car.value):amount;
  const gain=value-cost;
  const margin=value>0?gain/value*100:0;
  const figures=mode==='buy'?
   [['Sua oferta',fmt(amount)],['Reparos estimados',fmt(repair)],['Custo projetado',fmt(cost)],['Diferença para avaliação',fmt(gain)]]:
   [['Custo investido',fmt(cost)],['Preço de anúncio',fmt(amount)],['Margem bruta potencial',fmt(gain)],['Margem sobre venda',margin.toFixed(1).replace('.',',')+'%']];
  values.innerHTML=figures.map(([name,v])=>'<div><small>'+esc(name)+'</small><b>'+esc(v)+'</b></div>').join('');
  const warn=mode==='buy'?(amount>s.cash?'Saldo insuficiente para essa oferta.':s.stock.length>=s.slots?'Garagem cheia: libere uma vaga antes de comprar.':gain<0?'A oferta supera o valor estimado após reparos.':'Estimativa favorável; o vendedor pode recusar.'):
   gain<0?'O preço anunciado está abaixo do custo investido.':'Margem estimada antes de impostos, despesas e negociação.';
  comment.className=gain<0?'ae-neg-warn':'ae-neg-good';comment.textContent=warn;
 }
 field.addEventListener('input',update);update();
}
function offerAnalysis(car){
 const body=document.getElementById('modalbody');if(!body||!car)return;
 const offers=car.offers||[];
 for(const [i,o] of offers.entries()){
  const button=body.querySelector('button[onclick="acceptOffer('+i+')"]');
  if(!button)continue;
  const profit=number(o.amount)-basis(car);
  const detail=document.createElement('div');detail.className=profit>=0?'ae-neg-good':'ae-neg-warn';
  detail.textContent='Resultado bruto: '+fmt(profit)+' · '+(number(o.amount)>0?(profit/number(o.amount)*100).toFixed(1).replace('.',','):'0')+'% de margem (antes de tributos)';
  button.parentElement?.append(detail);
 }
}
const oldBuy=buyDialog;
buyDialog=function(id){const result=oldBuy(id);const car=s.market.find(c=>c.id===id);insertAnalysis(document.getElementById('bid'),car,'buy');return result};
const oldList=listDialog;
listDialog=function(id){const result=oldList(id);const car=s.stock.find(c=>c.id===id);insertAnalysis(document.getElementById('asking'),car,'sell');return result};
const oldOffers=offersDialog;
offersDialog=function(id){const result=oldOffers(id);offerAnalysis(s.stock.find(c=>c.id===id));return result};
})();
