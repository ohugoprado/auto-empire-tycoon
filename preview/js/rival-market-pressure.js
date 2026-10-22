/* Auto Empire Tycoon — Alpha 7.2: rivals compete for market inventory. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const firms=[
 {id:'atlas',name:'Atlas Motors',filter:c=>n(c.ask)<22000},
 {id:'orion',name:'Orion Auto',filter:c=>n(c.ask)>=22000},
 {id:'norte',name:'Norte Veículos',filter:c=>true}
];
const panel=document.createElement('section');panel.id='ae-rival-market-pressure';panel.className='panel';
panel.innerHTML='<h3>Disputa por veículos</h3><p class="tiny">Concorrentes podem comprar carros disponíveis no mercado. Fique atento às oportunidades: alguns anúncios não permanecem para sempre.</p><div id="ae-rival-market-status"></div><div id="ae-rival-market-feed"></div>';
const css=document.createElement('style');css.textContent=`
#ae-rival-market-pressure{padding:14px;margin:12px 0}
#ae-rival-market-pressure h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-rival-market-status{background:#20384b;padding:10px;border-radius:9px;font-size:12px}
#ae-rival-market-feed{font-size:12px;line-height:1.6;color:#cbdce6;margin-top:10px}
.ae-rival-market-event{border-bottom:1px solid #344f60;padding:7px 0}
`;document.head.append(css);
const rivalPanel=document.getElementById('ae-market-rivals');
if(rivalPanel?.parentNode)rivalPanel.after(panel);else garage.prepend(panel);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.rivalMarket||typeof s.rivalMarket!=='object')s.rivalMarket={purchases:0,events:[],lastDay:0};
 const m=s.rivalMarket;
 if(!Array.isArray(m.events))m.events=[];
 m.purchases=Math.max(0,n(m.purchases));
 return m;
}
function refresh(){
 const m=ensure();if(!m)return;
 const stock=Array.isArray(s.market)?s.market:[];
 panel.querySelector('#ae-rival-market-status').textContent='Ofertas disponíveis: '+stock.length+' · Compras de concorrentes nesta campanha: '+m.purchases;
 panel.querySelector('#ae-rival-market-feed').innerHTML=m.events.length?m.events.slice(-4).reverse().map(x=>'<div class="ae-rival-market-event">Dia '+n(x.day)+' · '+x.firm+' adquiriu '+x.model+' por '+money(x.price)+'.</div>').join(''):'<p class="tiny">Nenhuma compra rival registrada até agora.</p>';
}
const prevTick=tickDay;
tickDay=function(){
 const before=n(s?.day),result=prevTick();
 if(!s||n(s.day)<=before)return result;
 const m=ensure(),market=Array.isArray(s.market)?s.market:null;
 if(!m||!market||market.length<=3||Math.random()>=.32){refresh();return result;}
 const firm=firms[Math.floor(Math.random()*firms.length)];
 const candidates=market.filter(c=>firm.filter(c)&&n(c.ask)>0);
 if(!candidates.length){refresh();return result;}
 // One competitor acquisition at most per day; retain three offers for the player.
 const chosen=candidates[Math.floor(Math.random()*candidates.length)];
 const idx=market.findIndex(c=>c.id===chosen.id);
 if(idx<0)return result;
 market.splice(idx,1);
 m.purchases++;
 m.events.push({day:s.day,firm:firm.name,model:String(chosen.name).slice(0,65).replace(/[<>]/g,''),price:n(chosen.ask)});
 m.events=m.events.slice(-25);
 note(firm.name+' comprou '+chosen.name+' no mercado.');save();refresh();return result;
};
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let last='';
render=function(){prevRender();const m=ensure(),key=[s?.day,s?.market?.length,m?.purchases].join('|');if(key!==last){last=key;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
