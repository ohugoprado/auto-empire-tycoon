/* Auto Empire Tycoon — Alpha 8.0: faster, safer trading dialogs on mobile. */
(function(){
'use strict';
const css=document.createElement('style');css.textContent=`
.ae-trade-quick-summary{border:1px solid #3f6170;background:#1b3442;border-radius:11px;padding:11px;margin:10px 0}
.ae-trade-quick-summary strong{display:block;margin-bottom:7px;font-size:13px}
.ae-trade-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ae-trade-quick-grid>div{background:#263f4e;border-radius:8px;padding:8px}
.ae-trade-quick-grid small{display:block;color:#b8cad4;margin-bottom:4px}
.ae-trade-quick-grid b{font-size:13px}
.ae-trade-presets{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0}
.ae-trade-presets button{min-height:44px;flex:1 1 80px;background:#314e5e;color:#edf5f8;border:1px solid #527083}
.ae-trade-presets button:focus-visible{outline:3px solid #f4c568}
.ae-trade-quick-hint{font-size:12px;line-height:1.5;color:#c8d7df;margin:7px 0}
@media(max-width:430px){#modalbody input[type=number]{font-size:16px;min-height:46px;width:100%}#modalbody .actions button{min-height:46px}}
`;document.head.append(css);
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
function mount(){
 const body=document.getElementById('modalbody');return body&& !body.closest('.hide')?body:null;
}
function presets(input,values){
 if(!input)return;
 // Keep the calculations and advisors from earlier modules, with one source of
 // quick prices. All earlier input listeners still receive these input events.
 const body=mount();if(!body)return;
 body.querySelectorAll('.ae-neg-quick,.ae-bid-presets,#ae-trade-presets').forEach(node=>node.remove());
 const box=document.createElement('div');box.className='ae-trade-presets';box.id='ae-trade-presets';
 values.forEach(({label,value})=>{
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.addEventListener('click',()=>{input.value=String(Math.max(100,Math.round(value/100)*100));input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();});
  box.appendChild(b);
 });
 input.insertAdjacentElement('afterend',box);
}
function summary(input,car,mode){
 const body=mount();if(!body||!input||!car)return;
 if(mode==='list'&&window.AETradeSummary)return;
 const card=document.createElement('div');card.className='ae-trade-quick-summary';card.setAttribute('aria-live','polite');
 const update=()=>{
  const price=n(input.value),cost=n(car.bought)+n(car.spent);
  const balance=mode==='buy'?n(s.cash)-price:price-cost;
  const valid=price>0&&Number.isFinite(Number(input.value));
  const label=mode==='buy'?'Caixa após a compra':'Margem estimada antes das despesas';
  const status=mode==='buy'&&price>n(s.cash)?'Saldo insuficiente para essa oferta.':mode==='buy'&&s.stock.length>=s.slots?'Garagem sem vagas disponíveis.':!valid?'Informe um valor válido.':'';
  card.innerHTML='<strong>Resumo da negociação</strong><div class="ae-trade-quick-grid"><div><small>'+(mode==='buy'?'Valor pedido':'Custo investido')+'</small><b>'+money(mode==='buy'?n(car.ask):cost)+'</b></div><div><small>'+label+'</small><b>'+money(balance)+'</b></div></div>'+(status?'<p class="ae-trade-quick-hint">'+status+'</p>':'');
 };
 input.addEventListener('input',update);update();input.insertAdjacentElement('afterend',card);
}
const oldBuy=buyDialog;
buyDialog=function(id){
 const result=oldBuy(id),car=s?.market?.find(c=>c.id===id),body=mount(),input=body?.querySelector('#bid');
 if(car&&input){
  presets(input,[{label:'−10%',value:n(car.ask)*.90},{label:'−5%',value:n(car.ask)*.95},{label:'Preço pedido',value:n(car.ask)}]);
  summary(input,car,'buy');
 }
 return result;
};
const oldList=listDialog;
listDialog=function(id){
 const result=oldList(id),car=s?.stock?.find(c=>c.id===id),body=mount(),input=body?.querySelector('#asking');
 if(car&&input){
  const fair=n(car.value)*(.75+n(car.condition)/400);
  presets(input,[{label:'Venda rápida',value:fair*.94},{label:'Equilibrado',value:fair},{label:'Margem maior',value:fair*1.08}]);
  summary(input,car,'list');
 }
 return result;
};
const oldOffers=offersDialog;
offersDialog=function(id){
 const result=oldOffers(id),car=s?.stock?.find(c=>c.id===id),body=mount();
 if(!car||!body||window.AETradeSummary)return result;
 const cost=n(car.bought)+n(car.spent);
 const info=document.createElement('div');info.className='ae-trade-quick-summary';
 const offers=Array.isArray(car.offers)?car.offers:[];
 const best=offers.reduce((m,o)=>Math.max(m,n(o.amount)),-Infinity);
 info.innerHTML='<strong>Comparativo de propostas</strong><p class="ae-trade-quick-hint">Custo investido: '+money(cost)+'. Melhor oferta: '+(Number.isFinite(best)?money(best):'nenhuma')+'. Margens exibidas não incluem despesas indiretas.</p>';
 const divider=body.querySelector('.divider');if(divider)divider.insertAdjacentElement('afterend',info);else body.append(info);
 return result;
};
})();
