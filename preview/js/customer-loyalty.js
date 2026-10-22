/* Auto Empire Tycoon — Alpha 7.7: repeat buyers and customer relationships. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const panel=document.createElement('section');panel.id='ae-customer-loyalty';panel.className='panel';
panel.innerHTML='<h3>Clientes e fidelização</h3><p class="tiny">Cada venda fortalece o relacionamento com compradores reais do jogo. Clientes recorrentes aumentam o prestígio da concessionária.</p><div id="ae-loyalty-overview"></div><div id="ae-loyalty-list"></div>';
const css=document.createElement('style');css.textContent=`
#ae-customer-loyalty{padding:14px;margin:12px 0}
#ae-customer-loyalty h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-loyalty-overview{font-size:12px;line-height:1.6;background:#20384b;padding:10px;border-radius:9px}
.ae-loyalty-client{background:#20384b;border:1px solid #405c6b;border-radius:9px;padding:10px;margin-top:8px}
.ae-loyalty-client strong{font-size:13px}
.ae-loyalty-client p{font-size:11px;color:#c8d8e1;margin:5px 0}
`;document.head.append(css);
const strategy=document.getElementById('ae-business-strategy');
if(strategy?.parentNode)strategy.after(panel);else garage.prepend(panel);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.customerLoyalty||typeof s.customerLoyalty!=='object')s.customerLoyalty={clients:[],total:0,repeatSales:0};
 const state=s.customerLoyalty;if(!Array.isArray(state.clients))state.clients=[];
 state.total=Math.max(0,n(state.total));state.repeatSales=Math.max(0,n(state.repeatSales));
 return state;
}
function refresh(){
 const state=ensure();if(!state)return;
 const clients=state.clients.slice().sort((a,b)=>n(b.lastDay)-n(a.lastDay));
 panel.querySelector('#ae-loyalty-overview').innerHTML='Clientes identificados: <b>'+state.clients.length+'</b> · Vendas registradas: <b>'+state.total+'</b> · Compras recorrentes: <b>'+state.repeatSales+'</b>';
 panel.querySelector('#ae-loyalty-list').innerHTML=clients.length?clients.slice(0,5).map(c=>'<div class="ae-loyalty-client"><strong>'+String(c.name).replace(/[&<>"]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]))+'</strong><p>'+n(c.purchases)+' compra(s) · Última visita: dia '+n(c.lastDay)+' · Total negociado: '+money(n(c.spent))+'</p></div>').join(''):'<p class="tiny">Venda um veículo para começar a construir sua carteira de clientes.</p>';
}
const prevAccept=acceptOffer;
acceptOffer=function(i){
 const car=s?.stock?.find(c=>c.id===modalCar),offer=car?.offers?.[i],before=n(s?.sales);
 const name=typeof offer?.name==='string'?offer.name.trim().slice(0,70):'';
 const amount=n(offer?.amount),result=prevAccept(i);
 if(!name||amount<=0||n(s.sales)<=before)return result;
 const state=ensure();if(!state)return result;
 let client=state.clients.find(c=>c.name===name);
 if(!client){client={name,purchases:0,spent:0,lastDay:s.day};state.clients.push(client);}
 else{state.repeatSales++;if(client.purchases===1){s.rep=Math.min(100,n(s.rep)+1);note('Cliente recorrente: '+name+' · reputação +1.');}}
 client.purchases++;client.spent+=amount;client.lastDay=s.day;state.total++;
 // Limit save growth without discarding customers' aggregated history.
 if(state.clients.length>80)state.clients.sort((a,b)=>n(b.lastDay)-n(a.lastDay)).splice(80);
 save();refresh();return result;
};
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let key='';
render=function(){prevRender();const state=ensure(),next=[s?.day,s?.sales,state?.total,state?.repeatSales].join('|');if(key!==next){key=next;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
