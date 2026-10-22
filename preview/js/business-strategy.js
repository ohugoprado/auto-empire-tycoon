/* Auto Empire Tycoon — Alpha 7.6: persistent strategic positioning. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const plans=[
 {id:'budget',title:'Revenda popular',desc:'Priorize volume e confiança dos compradores.',cost:450,rep:1,condition:c=>!c.manufactured},
 {id:'factory',title:'Marca própria',desc:'Fortaleça a reputação de seus carros fabricados.',cost:700,rep:2,condition:c=>!!c.manufactured},
 {id:'premium',title:'Atendimento premium',desc:'Valorize a experiência em negociações de maior porte.',cost:900,rep:2,condition:c=>n(c.value)>=35000}
];
const panel=document.createElement('section');panel.id='ae-business-strategy';panel.className='panel';
panel.innerHTML='<h3>Estratégia da empresa</h3><p class="tiny">Escolha uma especialização para os próximos 14 dias. O investimento é pago na ativação; vendas qualificadas aumentam sua reputação.</p><div id="ae-strategy-content"></div>';
const css=document.createElement('style');css.textContent=`
#ae-business-strategy{padding:14px;margin:12px 0}
#ae-business-strategy h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
.ae-strategy-card{border:1px solid #405b6e;background:#20384b;border-radius:10px;padding:11px;margin:9px 0}
.ae-strategy-card strong{font-size:13px}
.ae-strategy-card p{font-size:12px;line-height:1.5;color:#cbdce5;margin:6px 0}
.ae-strategy-card button{min-height:44px;margin-top:5px}
`;document.head.append(css);
const rare=document.getElementById('ae-rare-opportunities');
if(rare?.parentNode)rare.after(panel);else garage.prepend(panel);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.businessStrategy||typeof s.businessStrategy!=='object')s.businessStrategy={active:null,history:[]};
 const a=s.businessStrategy;if(!Array.isArray(a.history))a.history=[];
 return a;
}
function refresh(){
 const a=ensure();if(!a)return;
 const body=panel.querySelector('#ae-strategy-content');
 if(a.active&&n(s.day)<=n(a.active.until)){
  const plan=plans.find(x=>x.id===a.active.id);
  body.innerHTML='<div class="ae-strategy-card"><strong>'+plan.title+'</strong><p>'+plan.desc+'</p><p>Prazo restante: '+(a.active.until-n(s.day)+1)+' dia(s) · Vendas qualificadas: '+n(a.active.sales)+'</p><p>Bônus de reputação por venda qualificada: +'+plan.rep+' (limitado a 100).</p></div>';
 }else{
  body.innerHTML=plans.map(p=>'<div class="ae-strategy-card"><strong>'+p.title+'</strong><p>'+p.desc+'</p><p>Investimento: '+money(p.cost)+' · +'+p.rep+' de reputação por venda qualificada</p><button type="button" data-ae-strategy="'+p.id+'" '+(n(s.cash)<p.cost?'disabled':'')+'>Adotar estratégia</button></div>').join('');
 }
}
panel.addEventListener('click',event=>{
 const btn=event.target.closest('[data-ae-strategy]');if(!btn)return;
 const a=ensure(),p=plans.find(x=>x.id===btn.dataset.aeStrategy);
 if(!a||!p||(a.active&&n(s.day)<=n(a.active.until))||n(s.cash)<p.cost)return;
 if(!confirm('Investir '+money(p.cost)+' para adotar '+p.title+' durante 14 dias?'))return;
 s.cash-=p.cost;a.active={id:p.id,until:s.day+13,sales:0};
 entry('Estratégia · '+p.title,-p.cost);note('Nova estratégia empresarial: '+p.title+'.');save();render();
});
const prevAccept=acceptOffer;
acceptOffer=function(i){
 const car=s?.stock?.find(c=>c.id===modalCar),offer=car?.offers?.[i],before=n(s?.sales),a=ensure(),active=a?.active,plan=plans.find(p=>p.id===active?.id);
 const qualifies=!!offer&&!!plan&&n(s.day)<=n(active.until)&&plan.condition(car);
 const result=prevAccept(i);
 if(qualifies&&n(s.sales)>before&&a.active===active){
  const gained=Math.min(plan.rep,Math.max(0,100-n(s.rep)));
  s.rep=Math.min(100,n(s.rep)+plan.rep);active.sales++;
  if(gained>0)note('Estratégia '+plan.title+': reputação +'+gained+'.');
  save();refresh();
 }
 return result;
};
const prevTick=tickDay;
tickDay=function(){
 const result=prevTick(),a=ensure();
 if(a?.active&&n(s.day)>n(a.active.until)){
  const p=plans.find(x=>x.id===a.active.id);
  a.history.push({id:a.active.id,day:s.day,sales:a.active.sales});
  a.history=a.history.slice(-25);a.active=null;
  note('Estratégia encerrada: '+(p?.title||'especialização')+'.');save();
 }
 refresh();return result;
};
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let key='';
render=function(){prevRender();const a=ensure(),next=[s?.day,s?.cash,s?.sales,a?.active?.id,a?.active?.sales].join('|');if(next!==key){key=next;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
