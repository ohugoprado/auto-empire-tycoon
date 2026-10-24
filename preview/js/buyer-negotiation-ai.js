/* Auto Empire Tycoon — Alpha 10.0: balanced buyer decisions. */
(function(){
'use strict';
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const escText=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const profiles={
 budget:{label:'Econômico',price:.91,quality:.5,patience:1},
 family:{label:'Família',price:1,quality:1.25,patience:1.1},
 premium:{label:'Premium',price:1.1,quality:1.6,patience:.85},
 enthusiast:{label:'Entusiasta',price:1.08,quality:1.1,patience:1.1},
 dealer:{label:'Revendedor',price:.88,quality:.7,patience:.7}
};
function model(car,offer){
 const profile=profiles[offer?.aeBuyer?.type]||profiles.budget;
 const condition=clamp(num(car.condition),0,100),value=Math.max(1,num(car.value)),asking=Math.max(1,num(car.price)||value);
 const rep=clamp(num(s.rep),0,100),days=Math.max(0,num(car.days));
 const priceRatio=asking/value;
 const qualityAdjustment=(condition-70)/100*profile.quality*.13;
 const reputationAdjustment=(rep-50)/100*.075;
 const ageAdjustment=-Math.min(45,days)*.0015;
 const willingness=clamp(profile.price+qualityAdjustment+reputationAdjustment+ageAdjustment,.7,1.2);
 const ceiling=Math.max(0,Math.round(value*willingness/100)*100);
 const fit=clamp(Math.round(70+(willingness-priceRatio)*95+(condition-70)*.2),5,98);
 const acceptance=clamp(.62+(rep-50)*.002+(condition-70)*.002-(days/180),.28,.85);
 return {profile,ceiling,fit,acceptance,priceRatio};
}
function updateOffer(car,offer){
 if(!offer||typeof offer!=='object')return;
 const m=model(car,offer);
 if(!offer.aeNegotiation)offer.aeNegotiation={rounds:0,initial:num(offer.amount),limit:0};
 const negotiation=offer.aeNegotiation;
 // Recalculate only before a counteroffer; never reduce an accepted offer.
 if(!num(negotiation.rounds)){
  // Buyer ceiling must remain close to the actual offer; never replace it with
  // the entire estimated vehicle valuation.
  const affordable=Math.min(m.ceiling,num(offer.amount)*1.075);
  negotiation.limit=Math.max(num(offer.amount),Math.round(affordable/100)*100);
 }
 offer.aeDecision={fit:m.fit,ceiling:m.ceiling,acceptance:m.acceptance,condition:num(car.condition),reputation:num(s.rep),days:num(car.days)};
}
const oldTick=tickDay;
tickDay=function(){
 const result=oldTick();
 for(const car of s.stock||[])for(const offer of car.offers||[])updateOffer(car,offer);
 save();
 return result;
};
const oldOffers=offersDialog;
offersDialog=function(id){
 const car=s.stock.find(c=>c.id===id);
 if(car)for(const offer of car.offers||[])updateOffer(car,offer);
 const result=oldOffers(id);
 if(!car)return result;
 const body=document.getElementById('modalbody');if(!body)return result;
 const buttons=[...body.querySelectorAll('button[onclick^="acceptOffer("]')];
 (car.offers||[]).forEach((offer,i)=>{
  const panel=buttons[i]?.closest('.panel');if(!panel)return;
  const d=offer.aeDecision;if(!d)return;
  const info=document.createElement('div');info.className='ae-buyer-decision';
  info.textContent='Interesse estimado: '+d.fit+'/100 · Conservação '+d.condition+'% · Reputação '+d.reputation+'/100 · '+d.days+' dia(s) anunciado. O cliente pode desistir de contrapropostas.';
  panel.append(info);
 });
 return result;
};
const css=document.createElement('style');css.textContent=`
.ae-buyer-decision{font-size:12px;line-height:1.5;margin-top:9px;padding:10px;border-radius:9px;background:#253d49;color:#dcebf2}
@media(max-width:480px){.ae-buyer-decision{font-size:12px;padding:9px}}
`;document.head.append(css);
})();
