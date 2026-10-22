/* Auto Empire Tycoon — Alpha 7.3: weekly competitive decisions with tradeoffs. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const events=[
 {title:'Feirão da Atlas Motors',desc:'A Atlas anunciou descontos agressivos. Você pode investir em divulgação para disputar clientes.',choices:[{label:'Campanha local · 400 CR',cost:400,rep:2,bonus:1},{label:'Preservar o caixa',cost:0,rep:0,bonus:0}]},
 {title:'Semana premium da Orion',desc:'A Orion atrai compradores exigentes. Melhorar a experiência pode fortalecer sua reputação.',choices:[{label:'Atendimento especial · 650 CR',cost:650,rep:3,bonus:0},{label:'Manter operação atual',cost:0,rep:0,bonus:0}]},
 {title:'Expansão da Norte Veículos',desc:'A Norte está ampliando sua presença. Uma ação comercial pode trazer vantagem na disputa semanal.',choices:[{label:'Ação de vendas · 500 CR',cost:500,rep:1,bonus:2},{label:'Aguardar o mercado',cost:0,rep:0,bonus:0}]},
 {title:'Festival automotivo regional',desc:'Uma feira de veículos oferece visibilidade. Participar custa dinheiro, mas pode melhorar a marca.',choices:[{label:'Participar · 800 CR',cost:800,rep:4,bonus:1},{label:'Não participar',cost:0,rep:0,bonus:0}]}
];
const panel=document.createElement('section');panel.id='ae-competitive-events';panel.className='panel';
panel.innerHTML='<h3>Eventos competitivos</h3><p class="tiny">Uma nova decisão a cada sete dias. Escolha como responder aos movimentos do setor, sem recompensas garantidas por gastar dinheiro.</p><div id="ae-competitive-event-body"></div>';
const css=document.createElement('style');css.textContent=`
#ae-competitive-events{padding:14px;margin:12px 0}
#ae-competitive-events h3{font-size:15px;color:#f4d38b;margin:0 0 9px}
#ae-competitive-event-body{background:#20384b;border-radius:10px;padding:12px}
#ae-competitive-event-body strong{display:block;font-size:13px}
#ae-competitive-event-body p{font-size:12px;color:#cbdce6;line-height:1.6;margin:8px 0}
.ae-event-actions{display:grid;gap:8px;margin-top:12px}
.ae-event-actions button{min-height:44px;text-align:left}
`;document.head.append(css);
const rivals=document.getElementById('ae-rival-market-pressure');
if(rivals?.parentNode)rivals.after(panel);else garage.prepend(panel);
const cycle=day=>Math.floor((Math.max(1,n(day))-1)/7);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.competitiveEvents||typeof s.competitiveEvents!=='object')s.competitiveEvents={decisions:[],lastCycle:-1};
 const e=s.competitiveEvents;
 if(!Array.isArray(e.decisions))e.decisions=[];
 return e;
}
function current(){const w=cycle(s.day);return {w,event:events[w%events.length]};}
function refresh(){
 const state=ensure();if(!state)return;
 const {w,event}=current(),body=panel.querySelector('#ae-competitive-event-body');
 const existing=state.decisions.find(d=>d.cycle===w);
 if(existing){
  body.innerHTML='<strong>'+event.title+'</strong><p>Decisão tomada nesta semana: '+(existing.choice===0?event.choices[0].label:event.choices[1].label)+'.</p><p>Próxima oportunidade em '+(7-((Math.max(1,n(s.day))-1)%7))+' dia(s).</p>';
  return;
 }
 body.innerHTML='<strong>'+event.title+'</strong><p>'+event.desc+'</p><div class="ae-event-actions">'+event.choices.map((choice,i)=>'<button type="button" data-ae-event-choice="'+i+'" '+(n(s.cash)<choice.cost?'disabled':'')+'>'+choice.label+'</button>').join('')+'</div>';
}
panel.addEventListener('click',event=>{
 const btn=event.target.closest('[data-ae-event-choice]');if(!btn)return;
 const state=ensure(),{w,event:scenario}=current(),i=Number(btn.dataset.aeEventChoice),choice=scenario.choices[i];
 if(!state||!choice||state.decisions.some(d=>d.cycle===w)||n(s.cash)<choice.cost)return;
 if(choice.cost&&!confirm('Investir '+money(choice.cost)+' nesta ação?'))return;
 s.cash-=choice.cost;
 s.rep=Math.min(100,Math.max(0,n(s.rep)+choice.rep));
 const rivals=s.marketRivals;
 // Commercial actions reduce one rival's weekly sales tally, never below zero.
 if(choice.bonus&&rivals?.scores){
  const strongest=Object.keys(rivals.scores).sort((a,b)=>n(rivals.scores[b])-n(rivals.scores[a]))[0];
  if(strongest)rivals.scores[strongest]=Math.max(0,n(rivals.scores[strongest])-choice.bonus);
 }
 state.decisions.push({cycle:w,choice:i,day:s.day,cost:choice.cost});
 state.decisions=state.decisions.slice(-40);
 if(choice.cost)entry('Evento competitivo · '+scenario.title,-choice.cost);
 note('Decisão empresarial: '+scenario.title+' · '+choice.label+'.');
 save();render();toast('Decisão registrada!');
});
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let last='';
render=function(){prevRender();const state=ensure(),key=[s?.day,s?.cash,s?.rep,state?.decisions?.length].join('|');if(last!==key){last=key;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
