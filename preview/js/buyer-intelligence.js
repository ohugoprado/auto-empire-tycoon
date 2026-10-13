/* Alpha 3.5 — ten iPhone-first buyer and sales systems. Save-safe extensions. */
(function(){
'use strict';
const types=[
{id:'budget',name:'Econômico',need:'Preço acessível',max:0.90,quality:45,offer:.90,weight:1},
{id:'family',name:'Família',need:'Conservação e confiabilidade',max:1.12,quality:72,offer:.97,weight:1},
{id:'premium',name:'Premium',need:'Qualidade e acabamento',max:1.40,quality:85,offer:1.03,weight:.75},
{id:'enthusiast',name:'Entusiasta',need:'Desempenho e exclusividade',max:1.28,quality:67,offer:1.01,weight:.7},
{id:'dealer',name:'Revendedor',need:'Margem para revenda',max:1.05,quality:55,offer:.87,weight:1.1}
];
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const escText=v=>esc(String(v));
function state(){s.empire=s.empire||{};s.empire.buyers=s.empire.buyers||{sales:[],loyalty:0,feedback:[],lost:0};return s.empire.buyers}
function archetype(c,o){const index=Math.abs((Number(c.id)||0)*7+(Math.round(num(o.amount)/100)||0))%types.length;return types[index]}
function quality(c){return clamp(Math.round((num(c.condition)*.7)+(num(c.designQuality)||num(c.quality)||num(c.condition))*.3),0,100)}
function match(c,t){
 const q=quality(c),price=num(c.price)||num(c.value)||1,value=num(c.value)||1;
 const affordability=clamp((value*t.max-price)/value,-.6,.5);
 const qualityFit=clamp((q-t.quality)/100,-.5,.3);
 const kind=String(c.kind||c.category||'').toLowerCase();
 const special=(t.id==='family'&&/suv|sedã|sedan|van/.test(kind))||(t.id==='enthusiast'&&/sport|esport|coupe|cupê/.test(kind))||(t.id==='budget'&&/hatch|compact/.test(kind));
 return clamp(Math.round(60+affordability*55+qualityFit*60+(special?13:0)),5,98);
}
function enrich(c,o){
 if(!o||typeof o!=='object')return;
 if(!o.aeBuyer){const t=archetype(c,o);o.aeBuyer={type:t.id,created:s.day,expires:s.day+2+((Number(c.id)||0)%3),score:match(c,t),initial:num(o.amount)};}
}
function typeOf(o){return types.find(t=>t.id===o?.aeBuyer?.type)||types[0]}
function salesOffer(c,o){const t=typeOf(o);return Math.round((num(c.price)||num(c.value))*t.offer/100)*100}
const prevTick=tickDay;
tickDay=function(){
 const before=new Map(s.stock.map(c=>[c.id,new Set((c.offers||[]).map(o=>o))]));
 prevTick();
 const buyerState=state();
 for(const c of s.stock){
  const offers=Array.isArray(c.offers)?c.offers:[];
  for(const o of offers){
   if(!before.get(c.id)?.has(o)){
    enrich(c,o);
    const t=typeOf(o),score=o.aeBuyer.score;
    // Preserve the core-generated price as a baseline; buyer psychology adjusts it moderately.
    o.amount=Math.max(100,Math.round(num(o.amount)*(1+(t.offer-1)*.24+(score-55)/700)/100)*100);
   }else enrich(c,o);
  }
  const remaining=offers.filter(o=>num(o.aeBuyer?.expires)>=num(s.day));
  buyerState.lost+=offers.length-remaining.length;
  c.offers=remaining;
 }
 save();
};
const oldOffers=offersDialog;
offersDialog=function(id){
 const c=s.stock.find(x=>x.id===id);
 if(c)(c.offers||[]).forEach(o=>enrich(c,o));
 const result=oldOffers(id);
 if(!c)return result;
 const body=document.getElementById('modalbody');if(!body)return result;
 const buttons=[...body.querySelectorAll('button[onclick^="acceptOffer("]')];
 (c.offers||[]).forEach((o,i)=>{
  const button=buttons[i];if(!button)return;
  const t=typeOf(o),meta=o.aeBuyer,margin=num(o.amount)-num(c.bought)-num(c.spent);
  const info=document.createElement('div');info.className='ae-buyer-profile';
  info.innerHTML='<b>'+escText(t.name)+'</b> · '+escText(t.need)+'<div class="ae-buyer-sub">Compatibilidade '+meta.score+'/100 · Expira no dia '+meta.expires+' · '+(margin>=0?'Margem positiva':'Margem negativa')+'</div>';
  button.closest('.panel')?.prepend(info);
 });
 return result;
};
const prevAccept=acceptOffer;
acceptOffer=function(i){
 const c=s.stock.find(x=>x.id===modalCar),o=c?.offers?.[i];
 if(!o)return prevAccept(i);
 enrich(c,o);
 const meta=o.aeBuyer,t=typeOf(o),profit=num(o.amount)-num(c.bought)-num(c.spent);
 const record={day:s.day,car:String(c.name),type:t.id,price:num(o.amount),profit,score:meta.score};
 prevAccept(i);
 if(s.stock.some(x=>x.id===c.id))return;
 const buyerState=state();
 buyerState.sales.unshift(record);buyerState.sales=buyerState.sales.slice(0,60);
 buyerState.loyalty=clamp(num(buyerState.loyalty)+(meta.score>=70?2:1),0,100);
 if(meta.score>=75){s.rep=clamp(num(s.rep)+1,0,100);buyerState.feedback.unshift({day:s.day,text:'Cliente '+t.name+' elogiou a experiência de compra.',positive:true})}
 else if(meta.score<35){s.rep=clamp(num(s.rep)-1,0,100);buyerState.feedback.unshift({day:s.day,text:'Cliente '+t.name+' considerou a compra pouco adequada.',positive:false})}
 buyerState.feedback=buyerState.feedback.slice(0,12);
 save();render();
};
const css=document.createElement('style');css.textContent=`
.ae-buyer-profile{background:#29414c;border:1px solid #426272;border-radius:10px;padding:10px;margin:7px 0 11px;font-size:12px;line-height:1.4}
.ae-buyer-sub{font-size:11px;color:#c1d5dd;margin-top:5px}
#ae-buyers-panel{margin:12px 0;padding:13px;border:1px solid #3e5868;border-radius:13px;background:#1b303c}
#ae-buyers-panel h3{font-size:15px;margin:0 0 9px}
.ae-buyer-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ae-buyer-metrics div{background:#28404c;padding:10px;border-radius:9px}
.ae-buyer-metrics small{display:block;font-size:11px;color:#c0d3dc}
.ae-buyer-metrics strong{font-size:17px}
#ae-buyers-panel p{font-size:12px;line-height:1.45;color:#d5e4ea;margin:8px 0}
#ae-buyers-panel button{min-height:44px!important}
`;document.head.append(css);
const garage=document.getElementById('garage'),panel=document.createElement('section');panel.id='ae-buyers-panel';
if(garage){const tools=document.getElementById('ae-iphone-tools');if(tools)tools.after(panel);else garage.prepend(panel)}
let expanded=false;
function renderPanel(){
 if(!s||!panel.isConnected)return;
 const st=state(),sales=st.sales||[],offers=s.stock.reduce((n,c)=>n+(c.offers?.length||0),0);
 const avg=sales.length?Math.round(sales.reduce((n,x)=>n+num(x.profit),0)/sales.length):0;
 panel.innerHTML='<h3>👥 Inteligência de clientes</h3><div class="ae-buyer-metrics"><div><small>Propostas ativas</small><strong>'+offers+'</strong></div><div><small>Fidelização</small><strong>'+num(st.loyalty)+'/100</strong></div><div><small>Lucro médio / venda</small><strong>'+fmt(avg)+'</strong></div><div><small>Propostas expiradas</small><strong>'+num(st.lost)+'</strong></div></div><button class="ghost smallbtn" id="ae-buyers-details" aria-expanded="'+expanded+'">'+(expanded?'Ocultar':'Ver')+' histórico de clientes</button><div id="ae-buyers-history" '+(expanded?'':'hidden')+'></div>';
 const details=panel.querySelector('#ae-buyers-history');
 details.innerHTML='<p><b>Últimas vendas</b></p>'+(sales.slice(0,5).map(x=>'<p>Dia '+x.day+' · '+escText(x.car)+' · '+escText(types.find(t=>t.id===x.type)?.name||'Cliente')+' · '+fmt(x.profit)+'</p>').join('')||'<p>Nenhuma venda registrada neste relatório.</p>')+'<p><b>Avaliações</b></p>'+((st.feedback||[]).slice(0,3).map(x=>'<p>'+escText(x.text)+'</p>').join('')||'<p>Aguardando avaliações.</p>');
 panel.querySelector('#ae-buyers-details').addEventListener('click',()=>{expanded=!expanded;renderPanel()});
}
const prevRender=render;let signature='';
render=function(){prevRender();const st=state(),next=[s.day,s.sales,s.stock.map(c=>c.offers?.length||0).join(','),st.loyalty,st.lost].join('|');if(next!==signature){signature=next;renderPanel()}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(renderPanel);
renderPanel();
})();
