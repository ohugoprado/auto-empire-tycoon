/* Auto Empire Tycoon — Alpha 7.8: customer preferences and qualified return offers. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const panel=document.createElement('section');panel.id='ae-customer-referrals';panel.className='panel';
panel.innerHTML='<h3>Preferências dos clientes</h3><p class="tiny">Clientes que já compraram podem voltar procurando veículos da mesma categoria. Mantenha modelos compatíveis anunciados para receber propostas reais.</p><div id="ae-referral-summary"></div><div id="ae-referral-clients"></div>';
const style=document.createElement('style');style.textContent=`
#ae-customer-referrals{padding:14px;margin:12px 0}
#ae-customer-referrals h3{font-size:15px;color:#f4d38b;margin:0 0 8px}
#ae-referral-summary{padding:10px;border-radius:9px;background:#20384b;font-size:12px}
.ae-referral-client{margin-top:8px;padding:10px;border:1px solid #405b6b;border-radius:9px;font-size:12px}
.ae-referral-client small{display:block;margin-top:4px;color:#b9ceda}
`;document.head.append(style);
const loyalty=document.getElementById('ae-customer-loyalty');if(loyalty?.parentNode)loyalty.after(panel);else garage.prepend(panel);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.customerReferrals||typeof s.customerReferrals!=='object')s.customerReferrals={preferences:{},lastAttemptDay:0,offersCreated:0};
 const r=s.customerReferrals;
 if(!r.preferences||typeof r.preferences!=='object')r.preferences={};
 r.offersCreated=Math.max(0,n(r.offersCreated));
 return r;
}
function normalize(kind){return String(kind??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function refresh(){
 const r=ensure();if(!r)return;
 const clients=(s.customerLoyalty?.clients||[]).filter(c=>r.preferences[c.name]).sort((a,b)=>n(b.lastDay)-n(a.lastDay));
 panel.querySelector('#ae-referral-summary').textContent='Propostas de retorno geradas: '+r.offersCreated+' · Clientes com preferência conhecida: '+clients.length;
 panel.querySelector('#ae-referral-clients').innerHTML=clients.length?clients.slice(0,5).map(c=>'<div class="ae-referral-client"><strong>'+esc(c.name)+'</strong><small>Interesse: '+esc(r.preferences[c.name])+' · '+n(c.purchases)+' compra(s)</small></div>').join(''):'<p class="tiny">As preferências serão identificadas nas próximas vendas.</p>';
}
const prevAccept=acceptOffer;
acceptOffer=function(i){
 const car=s?.stock?.find(c=>c.id===modalCar),offer=car?.offers?.[i],name=String(offer?.name||'').trim().slice(0,70),kind=String(car?.kind||''),before=n(s?.sales);
 const result=prevAccept(i);
 if(name&&kind&&n(s.sales)>before){const r=ensure();r.preferences[name]=kind;save();refresh();}
 return result;
};
const prevTick=tickDay;
tickDay=function(){
 const before=n(s?.day),result=prevTick();
 if(!s||n(s.day)<=before)return result;
 const r=ensure(),clients=s.customerLoyalty?.clients||[];
 if(!r||s.day-n(r.lastAttemptDay)<5||!Array.isArray(s.stock))return result;
 r.lastAttemptDay=s.day;
 const eligible=clients.filter(c=>r.preferences[c.name]&&n(c.purchases)>=1&&s.day-n(c.lastDay)>=5);
 if(!eligible.length){save();return result;}
 const client=eligible[Math.floor(Math.random()*eligible.length)];
 const matches=s.stock.filter(c=>c.listed&&normalize(c.kind)===normalize(r.preferences[client.name])&&n(c.price)>0&&Array.isArray(c.offers)&&!c.offers.some(o=>o.name===client.name));
 if(!matches.length||Math.random()>=.45){save();return result;}
 const car=matches[Math.floor(Math.random()*matches.length)];
 const fair=n(car.value)*(.70+n(car.condition)/300);
 const amount=Math.round(Math.min(n(car.price),fair)*(.91+Math.random()*.08)/100)*100;
 if(amount<=0){save();return result;}
 car.offers.push({name:client.name,amount});car.offers=car.offers.slice(-3);car.interested=true;
 r.offersCreated++;note('Cliente recorrente '+client.name+' enviou uma proposta por '+car.name+'.');
 save();refresh();return result;
};
const prevSeed=seed;seed=function(){prevSeed();ensure();refresh();};
const prevRender=render;let key='';
render=function(){prevRender();const r=ensure(),next=[s?.day,s?.sales,r?.offersCreated].join('|');if(next!==key){key=next;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
})();
