/* Auto Empire Tycoon — Alpha 7.1: competing dealerships and weekly market races. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const rivals=[
 {id:'atlas',name:'Atlas Motors',specialty:'volume',description:'Vende rápido e aposta em modelos acessíveis.'},
 {id:'orion',name:'Orion Auto',specialty:'premium',description:'Investe em reputação e carros de maior valor.'},
 {id:'norte',name:'Norte Veículos',specialty:'balanced',description:'Cresce com disciplina e uma carteira diversificada.'}
];
const panel=document.createElement('section');panel.className='panel';panel.id='ae-market-rivals';
panel.innerHTML='<h3>Concorrência regional</h3><p class="tiny">Outras concessionárias disputam participação no mercado. Supere o melhor concorrente em vendas durante a semana para receber um bônus de desempenho.</p><div id="ae-rivals-overview"></div><div id="ae-rivals-list"></div>';
const css=document.createElement('style');css.textContent=`
#ae-market-rivals{padding:14px;margin:12px 0}
#ae-market-rivals h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-rivals-overview{font-size:12px;line-height:1.6;padding:10px;background:#20384b;border-radius:9px}
.ae-rival{background:#20384b;border:1px solid #425f70;border-radius:10px;padding:11px;margin:9px 0}
.ae-rival strong{font-size:13px}
.ae-rival p{font-size:11px;color:#c6d8e2;margin:5px 0}
.ae-rival-bar{height:7px;background:#112532;border-radius:6px;overflow:hidden;margin-top:8px}
.ae-rival-bar i{height:100%;display:block;background:#c7a55c;border-radius:6px}
`;document.head.append(css);
const contracts=document.getElementById('ae-business-opportunities');
if(contracts?.parentNode)contracts.after(panel);else garage.prepend(panel);
const week=day=>Math.floor((Math.max(1,n(day))-1)/7);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.marketRivals||typeof s.marketRivals!=='object')s.marketRivals={week:week(s.day),baselineSales:n(s.sales),scores:{atlas:0,orion:0,norte:0},wins:0,earned:0,history:[]};
 const r=s.marketRivals;
 if(!r.scores||typeof r.scores!=='object')r.scores={atlas:0,orion:0,norte:0};
 if(!Array.isArray(r.history))r.history=[];
 r.wins=Math.max(0,n(r.wins));r.earned=Math.max(0,n(r.earned));
 return r;
}
function playerSales(r){return Math.max(0,n(s.sales)-n(r.baselineSales));}
function refresh(){
 const r=ensure();if(!r)return;
 const mine=playerSales(r),top=Math.max(0,...rivals.map(x=>n(r.scores[x.id])));
 const left=7-((Math.max(1,n(s.day))-1)%7);
 panel.querySelector('#ae-rivals-overview').innerHTML='<b>Semana '+(r.week+1)+'</b> · '+left+' dia(s) para o fechamento.<br>Suas vendas: <b>'+mine+'</b> · Melhor concorrente: <b>'+top+'</b><br>Semanas vencidas: <b>'+r.wins+'</b> · Prêmios acumulados: <b>'+money(r.earned)+'</b>';
 panel.querySelector('#ae-rivals-list').innerHTML=rivals.map(x=>{
  const score=n(r.scores[x.id]),maximum=Math.max(1,mine,top);
  return '<div class="ae-rival"><strong>'+x.name+' · '+score+' vendas</strong><p>'+x.description+'</p><div class="ae-rival-bar"><i style="width:'+Math.round(score/maximum*100)+'%"></i></div></div>';
 }).join('');
}
function settle(r){
 const mine=playerSales(r),best=Math.max(0,...rivals.map(x=>n(r.scores[x.id])));
 const victory=mine>=2&&mine>best;
 const bonus=victory?Math.min(1800,500+mine*150):0;
 if(victory){s.cash+=bonus;r.wins++;r.earned+=bonus;entry('Liderança regional · semana '+(r.week+1),bonus);note('Liderança regional conquistada! Prêmio '+money(bonus)+'.');}
 else note('Semana encerrada: '+mine+' venda(s) suas contra '+best+' do melhor concorrente.');
 r.history.push({week:r.week,player:mine,best,bonus});r.history=r.history.slice(-24);
}
const prevTick=tickDay;
tickDay=function(){
 const before=week(s.day),r=ensure(),previousScores={...r.scores};
 const result=prevTick();
 if(n(s.day)<=0)return result;
 const after=week(s.day);
 if(after!==before){
  // The prior week's results are finalized before a new round begins.
  r.scores=previousScores;settle(r);
  r.week=after;r.baselineSales=n(s.sales);r.scores={atlas:0,orion:0,norte:0};
 }
 for(const x of rivals){
  const chance=x.specialty==='volume'?.48:x.specialty==='premium'?.28:.37;
  if(Math.random()<chance)r.scores[x.id]=Math.max(0,n(r.scores[x.id]))+1;
 }
 save();refresh();return result;
};
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let last='';
render=function(){prevRender();const r=ensure(),key=[s?.day,s?.sales,r?.week,r?.wins].join('|');if(key!==last){last=key;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
