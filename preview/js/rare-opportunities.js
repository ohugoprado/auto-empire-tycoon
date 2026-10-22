/* Auto Empire Tycoon — Alpha 7.5: rare, bounded strategic opportunities. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const scenarios=[
 {id:'auction',title:'Leilão de oportunidade',desc:'Uma frota corporativa está sendo liquidada. Você pode pagar pela análise e obter uma pequena vantagem reputacional, mas não recebe veículos grátis.',cost:700,rep:3,reward:0},
 {id:'supplier',title:'Acordo com fornecedor',desc:'Um fornecedor oferece um acordo de relacionamento comercial. O investimento fortalece sua reputação no setor.',cost:1100,rep:5,reward:0},
 {id:'press',title:'Matéria no jornal automotivo',desc:'Um veículo da sua empresa chamou atenção. Aproveite a divulgação espontânea e fortaleça sua marca.',cost:0,rep:2,reward:0},
 {id:'fleet',title:'Comprador inesperado',desc:'Uma empresa quer ampliar sua frota. Receba um bônus comercial modesto, sem alterar propostas de venda existentes.',cost:0,rep:0,reward:450}
];
const panel=document.createElement('section');panel.className='panel';panel.id='ae-rare-opportunities';
panel.innerHTML='<h3>Oportunidades raras</h3><p class="tiny">Eventos especiais podem surgir durante a campanha. São opcionais, com prazo e efeitos transparentes.</p><div id="ae-rare-body"></div>';
const css=document.createElement('style');css.textContent=`
#ae-rare-opportunities{padding:14px;margin:12px 0}
#ae-rare-opportunities h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-rare-body{border:1px solid #4b6373;border-radius:10px;background:#20384b;padding:12px;font-size:12px}
#ae-rare-body strong{display:block;font-size:13px}
#ae-rare-body p{line-height:1.6;color:#c9d9e2}
.ae-rare-actions{display:flex;gap:8px;flex-wrap:wrap}
.ae-rare-actions button{min-height:44px}
`;document.head.append(css);
const ach=document.getElementById('ae-strategic-achievements');
if(ach?.parentNode)ach.after(panel);else garage.prepend(panel);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.rareOpportunities||typeof s.rareOpportunities!=='object')s.rareOpportunities={nextCheckDay:Math.max(12,n(s.day)+11),active:null,history:[],count:0};
 const r=s.rareOpportunities;
 if(!Array.isArray(r.history))r.history=[];
 r.count=Math.max(0,n(r.count));
 return r;
}
function refresh(){
 const r=ensure();if(!r)return;
 const body=panel.querySelector('#ae-rare-body'),a=r.active;
 if(!a){body.innerHTML='<p>Nenhum evento raro disponível agora.</p><p>Próxima verificação a partir do dia '+Math.round(n(r.nextCheckDay))+'.</p><p>Eventos são ocasionais; não há garantia de aparecerem em cada verificação.</p>';return;}
 const event=scenarios.find(x=>x.id===a.id);
 if(!event){body.textContent='Oportunidade indisponível.';return;}
 const left=Math.max(0,a.expires-n(s.day));
 body.innerHTML='<strong>'+event.title+'</strong><p>'+event.desc+'</p><p>Expira em '+left+' dia(s). '+(event.cost?'Investimento: '+money(event.cost)+'. ':'')+(event.rep?'Reputação: +'+event.rep+'. ':'')+(event.reward?'Bônus: '+money(event.reward)+'.':'')+'</p><div class="ae-rare-actions"><button type="button" data-ae-rare="accept" '+(n(s.cash)<event.cost?'disabled':'')+'>Aceitar</button><button type="button" class="ghost" data-ae-rare="decline">Recusar</button></div>';
}
function resolve(action){
 const r=ensure(),a=r?.active;if(!a)return;
 const e=scenarios.find(x=>x.id===a.id);if(!e)return;
 if(action==='accept'){
  if(n(s.cash)<e.cost)return toast('Caixa insuficiente');
  if(e.cost&&!confirm('Investir '+money(e.cost)+' em '+e.title+'?'))return;
  s.cash=s.cash-e.cost+e.reward;
  s.rep=Math.max(0,Math.min(100,n(s.rep)+e.rep));
  if(e.cost)entry('Oportunidade rara · '+e.title,-e.cost);
  if(e.reward)entry('Bônus · '+e.title,e.reward);
  note('Oportunidade aceita: '+e.title+'.');
 }else note('Oportunidade encerrada: '+e.title+'.');
 r.history.push({id:a.id,day:s.day,action});r.history=r.history.slice(-30);
 r.active=null;r.nextCheckDay=Math.max(n(r.nextCheckDay),n(s.day)+13);
 save();render();toast(action==='accept'?'Oportunidade concluída':'Oportunidade recusada');
}
panel.addEventListener('click',ev=>{const b=ev.target.closest('[data-ae-rare]');if(b)resolve(b.dataset.aeRare);});
const prevTick=tickDay;
tickDay=function(){
 const before=n(s?.day),result=prevTick();
 if(!s||n(s.day)<=before)return result;
 const r=ensure();if(!r)return result;
 if(r.active&&s.day>r.active.expires){r.history.push({id:r.active.id,day:s.day,action:'expired'});r.active=null;note('Uma oportunidade rara expirou.');}
 if(!r.active&&s.day>=n(r.nextCheckDay)){
  r.nextCheckDay=s.day+7;
  if(Math.random()<.34){
   const e=scenarios[(r.count+Math.floor(Math.random()*scenarios.length))%scenarios.length];
   r.active={id:e.id,expires:s.day+3};r.count++;note('Oportunidade rara disponível: '+e.title+'.');
  }
 }
 save();refresh();return result;
};
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let last='';
render=function(){prevRender();const r=ensure(),key=[s?.day,s?.cash,s?.rep,r?.active?.id,r?.nextCheckDay].join('|');if(key!==last){last=key;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
