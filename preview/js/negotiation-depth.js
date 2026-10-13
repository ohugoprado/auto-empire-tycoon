/* Alpha 3.4 — persistent negotiation profiles, counteroffers and reputation effects. */
(function(){
'use strict';
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const numeric=v=>Number.isFinite(Number(v))?Number(v):0;
const profiles=[
{id:'patient',name:'Paciente',description:'Aceita negociar com calma.',floor:.84,patience:5},
{id:'pragmatic',name:'Pragmático',description:'Busca um acordo justo.',floor:.9,patience:4},
{id:'firm',name:'Firme',description:'Não gosta de propostas muito baixas.',floor:.96,patience:3},
{id:'urgent',name:'Com pressa',description:'Prefere fechar negócio rapidamente.',floor:.8,patience:3}
];
function profile(c){const n=Math.abs(Number(c.id)||0);return profiles[n%profiles.length]}
function ensure(c){if(!c.aeNegotiation)c.aeNegotiation={attempts:0,latestCounter:0,accepted:0};return c.aeNegotiation}
function bidResult(){
 const c=s.market.find(x=>x.id===modalCar);const input=document.getElementById('bid');if(!c||!input)return false;
 const bid=Math.round(numeric(input.value));if(bid<=0)return toast('Oferta inválida'),true;
 if(bid>s.cash)return toast('Saldo insuficiente'),true;
 if(s.stock.length>=s.slots)return toast('Garagem cheia'),true;
 const meta=ensure(c),p=profile(c);
 // Keep the original seller reservation and acquisition pipeline intact.
 if(c.reserve===undefined)c.reserve=Math.round(numeric(c.ask)*p.floor);
 const reserve=numeric(c.reserve);
 meta.attempts++;
 c.attempts=meta.attempts;
 if(bid>=reserve){
  // Respect the existing seller's reserve so the original acquisition logic remains authoritative.
  if(bid>=numeric(c.ask)*.97)s.rep=clamp(numeric(s.rep)+1,0,100);
  // The original purchase routine performs the cash, stock, ledger and save updates.
  originalSubmit();
  return true;
 }
 const remaining=p.patience-meta.attempts;
 const proposed=Math.ceil(Math.max(reserve,bid+(reserve-bid)*.6)/100)*100;
 meta.latestCounter=proposed;
 const panel=document.getElementById('negotiation-result');
 if(panel){
  panel.textContent='';
  const msg=document.createElement('div');msg.className='ae-counter-box';
  const headline=document.createElement('strong');headline.textContent=p.name+' · Oferta recusada';
  const copy=document.createElement('p');copy.textContent='O vendedor pede '+fmt(proposed)+' para continuar. Tentativas restantes: '+Math.max(0,remaining)+'.';
  msg.append(headline,copy);
  if(remaining>0){
   const button=document.createElement('button');button.type='button';button.textContent='Aceitar contraproposta · '+fmt(proposed);
   button.disabled=proposed>s.cash;
   button.addEventListener('click',()=>{input.value=String(proposed);input.dispatchEvent(new Event('input',{bubbles:true}));bidResult()});
   msg.append(button);
  }
  panel.append(msg);
 }
 note('Proposta recusada para '+c.name+' · perfil '+p.name);
 if(remaining<=0){
  s.rep=clamp(numeric(s.rep)-1,0,100);
  s.market=s.market.filter(x=>x.id!==c.id);
  closeModal();toast('Negociação encerrada. Reputação -1.');
 }
 save();render();
 return true;
}
const css=document.createElement('style');css.textContent=`
.ae-counter-box{margin:10px 0;padding:12px;border:1px solid #ad8e60;border-radius:12px;background:#3b3430;color:#f9e6c8;font-size:13px;line-height:1.5}
.ae-counter-box p{margin:8px 0}.ae-counter-box button{min-height:48px!important;width:100%;background:#e0bd7a!important;color:#1b2a31!important}
.ae-seller-profile{background:#253d49;border-radius:10px;padding:11px;margin:10px 0;font-size:12px;color:#e6f0f3}
`;document.head.append(css);
const originalSubmit=submitBid;
submitBid=function(){return bidResult()};
const oldBuy=buyDialog;
buyDialog=function(id){
 const result=oldBuy(id),c=s.market.find(x=>x.id===id);if(!c)return result;
 const p=profile(c),meta=ensure(c),input=document.getElementById('bid');
 if(input){
  const info=document.createElement('div');info.className='ae-seller-profile';
  info.textContent='Perfil do vendedor: '+p.name+' — '+p.description+' · '+Math.max(0,p.patience-meta.attempts)+' tentativas disponíveis.';
  input.parentNode.insertBefore(info,input);
  if(meta.latestCounter>0)input.value=String(meta.latestCounter);
  input.dispatchEvent(new Event('input',{bubbles:true}));
 }
 return result;
};
})();
