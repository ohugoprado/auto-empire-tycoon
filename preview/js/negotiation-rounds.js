/* Auto Empire Tycoon — Alpha 10.0: stable counteroffers and buyer profiles. */
(function(){
'use strict';
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const css=document.createElement('style');css.textContent=`
.ae-neg-action{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
.ae-neg-action button{min-height:44px;flex:1 1 130px}
.ae-neg-offer{margin:8px 0;padding:10px;border:1px solid #526c7b;border-radius:9px;background:#233c49}
.ae-neg-offer p{margin:6px 0;font-size:12px;line-height:1.45}
.ae-neg-offer button{min-height:44px;width:100%}
`;document.head.append(css);
const oldOffers=offersDialog;
offersDialog=function(id){
 const result=oldOffers(id),car=s?.stock?.find(c=>c.id===id),body=document.getElementById('modalbody');
 if(!car||!body)return result;
 const buttons=[...body.querySelectorAll('button[onclick^="acceptOffer("]')];
 (car.offers||[]).forEach((offer,index)=>{
  const accept=buttons[index],container=accept?.closest('.panel');if(!container)return;
  if(!offer.aeNegotiation)offer.aeNegotiation={rounds:0,initial:num(offer.amount),limit:Math.round(num(offer.amount)*(1.025+(Math.abs(Number(car.id)||0)%5)*.015)/100)*100};
  const meta=offer.aeNegotiation;
  const wrapper=document.createElement('div');wrapper.className='ae-neg-offer';
  const message=document.createElement('p');
  message.textContent='Negociação: '+meta.rounds+'/2 contrapropostas · teto estimado do cliente não revelado.';
  wrapper.append(message);
  if(meta.rounds<2){
   const button=document.createElement('button');button.type='button';button.textContent='Pedir contraproposta (+3%)';
   button.addEventListener('click',()=>{
    const live=s.stock.find(c=>c.id===id),current=live?.offers?.[index];if(current!==offer)return toast('Proposta não está mais disponível.');
    const m=current.aeNegotiation;if(!m||m.rounds>=2)return toast('Limite de negociação atingido.');
    m.rounds++;
    const desired=Math.ceil(num(current.amount)*1.03/100)*100;
    const decision=current.aeDecision;
    const fit=num(decision?.fit)||55;
    const patience=({budget:.9,family:1.08,premium:.95,enthusiast:1.05,dealer:.8})[current.aeBuyer?.type]||1;
    const chance=Math.max(.2,Math.min(.85,(.62+(fit-55)*.003-m.rounds*.12)*patience));
    if(desired<=num(m.limit)&&Math.random()<chance){
     current.amount=desired;
     note('Cliente aumentou a proposta para '+live.name+' até '+money(desired)+'.');
     toast('Cliente aceitou aumentar a oferta.');
    }else if(m.rounds>=2||Math.random()<.35){
     live.offers.splice(index,1);
     note('Cliente desistiu da negociação por '+live.name+'.');
     toast('Cliente desistiu da compra.');
    }else{
     note('Cliente recusou contraproposta para '+live.name+'.');
     toast('Cliente manteve a oferta.');
    }
    save();render();offersDialog(id);
   });wrapper.append(button);
  }else{
   const done=document.createElement('p');done.textContent='Limite de contrapropostas atingido.';wrapper.append(done);
  }
  container.append(wrapper);
 });
 const exit=document.createElement('div');exit.className='ae-neg-action';
 const back=document.createElement('button');back.type='button';back.className='ghost';back.textContent='Voltar sem vender';
 back.onclick=()=>{closeModal();toast('Nenhuma proposta foi aceita.')};
 exit.append(back);body.append(exit);
 return result;
};
const oldBuy=buyDialog;
buyDialog=function(id){
 const result=oldBuy(id),body=document.getElementById('modalbody');
 if(!body||!s?.market?.some(c=>c.id===id))return result;
 const actions=document.createElement('div');actions.className='ae-neg-action';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='ghost';cancel.textContent='Desistir da negociação';
 cancel.onclick=()=>{closeModal();toast('Negociação encerrada sem compra.')};
 actions.append(cancel);body.append(actions);
 return result;
};
})();
