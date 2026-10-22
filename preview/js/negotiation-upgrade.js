/* Auto Empire Tycoon — Alpha 6.2: meaningful negotiation, acquisition due diligence. */
(function(){
'use strict';
const money=v=>Math.round(v).toLocaleString('pt-BR')+' CR';
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const css=document.createElement('style');css.textContent=`
#ae-bid-advisor{margin:12px 0;padding:12px;background:#1d3648;border:1px solid #526b7a;border-radius:11px}
#ae-bid-advisor h3{font-size:13px;margin:0 0 8px;color:#f4d38b}
#ae-bid-advisor .ae-bid-numbers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;font-size:12px}
#ae-bid-advisor small{display:block;color:#b8cbd8}
#ae-bid-advisor b{display:block;margin-top:3px}
#ae-bid-advisor .ae-bid-presets{display:flex;gap:7px;margin-top:10px}
#ae-bid-advisor button{flex:1;min-height:44px;font-size:12px}
#ae-bid-advisor p{font-size:11px;color:#b8cbd8;margin:8px 0 0;line-height:1.5}
`;document.head.append(css);
function decorate(){
 const c=(s?.market||[]).find(v=>v.id===modalCar),bid=document.getElementById('bid'),body=document.getElementById('modalbody');
 if(!c||!bid||!body||document.getElementById('ae-bid-advisor'))return;
 const box=document.createElement('div');box.id='ae-bid-advisor';
 const fair=Math.max(0,num(c.value)*(.70+num(c.condition)/300));
 const repairs=Math.max(250,Math.round(num(c.repair)*.7));
 const estimated=Math.max(0,Math.round(fair-repairs));
 box.innerHTML='<h3>Análise antes da compra</h3><div class="ae-bid-numbers"><div><small>Preço pedido</small><b>'+money(c.ask)+'</b></div><div><small>Mercado estimado</small><b>'+money(fair)+'</b></div><div><small>Revisão estimada</small><b>'+money(repairs)+'</b></div><div><small>Teto de compra sugerido</small><b>'+money(estimated*.83)+'</b></div></div><div class="ae-bid-presets"><button type="button" data-bid-factor=".78">Conservadora</button><button type="button" data-bid-factor=".9">Equilibrada</button><button type="button" data-bid-factor="1">Preço pedido</button></div><p>Estimativas não garantem lucro. Impostos, reparos adicionais e demanda podem reduzir o retorno.</p>';
 bid.parentNode.insertBefore(box,bid.nextSibling);
 box.addEventListener('click',e=>{
  const button=e.target.closest('[data-bid-factor]');if(!button)return;
  const factor=Number(button.dataset.bidFactor);
  bid.value=String(Math.max(100,Math.round(num(c.ask)*factor/100)*100));
  bid.dispatchEvent(new Event('input',{bubbles:true}));
 });
}
const previousBuy=buyDialog;
buyDialog=function(id){const result=previousBuy(id);decorate();return result;};
const previousSubmit=submitBid;
submitBid=function(){
 const c=(s?.market||[]).find(v=>v.id===modalCar),input=document.getElementById('bid');
 if(!c||!input)return previousSubmit();
 const bid=Math.round(Number(input.value));
 if(!Number.isFinite(bid)||bid<=0)return toast('Informe uma proposta válida.');
 if(num(c.attempts)>=4)return toast('Este vendedor encerrou a negociação.');
 // The seller remembers a prior counteroffer. Repeating the same low offer cannot improve it.
 if(num(c.attempts)>0&&num(c.lastRejectedBid)>0&&bid<=num(c.lastRejectedBid)&&bid<num(c.reserve)){
  const el=document.getElementById('negotiation-result');
  if(el)el.textContent='Você já ofereceu esse valor. Aumente sua proposta para continuar.';
  return;
 }
 const before=num(c.attempts),result=previousSubmit();
 if(num(c.attempts)>before&&s.market?.some(x=>x.id===c.id)&&bid<num(c.reserve)){
  c.lastRejectedBid=bid;
  save();
 }
 return result;
};
})();
