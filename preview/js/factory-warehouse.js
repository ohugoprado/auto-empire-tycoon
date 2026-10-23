/* Alpha 12.3 — industrial warehouse and showroom transfers */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const money=n=>Math.round(Number(n)||0).toLocaleString('pt-BR')+' CR';
const panel=document.createElement('section');panel.id='ae-factory-warehouse';panel.className='panel';
panel.innerHTML='<h3>Pátio da fabricante</h3><p class="tiny">Carros concluídos podem ficar no pátio até haver espaço na concessionária. Amplie a capacidade para não interromper a produção.</p><div id="ae-warehouse-stats"></div><div id="ae-warehouse-cars"></div><button id="ae-warehouse-upgrade" type="button">Ampliar pátio</button>';
(document.getElementById('ae-industrial-dashboard')||garage).after(panel);
const css=document.createElement('style');css.textContent='#ae-factory-warehouse{margin:12px 0;padding:13px}#ae-factory-warehouse h3{font-size:15px;color:#f3d28e}#ae-factory-warehouse p{font-size:12px;line-height:1.6}#ae-factory-warehouse button{min-height:44px;margin:5px 0}.ae-warehouse-car{display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid #415b6c;padding:8px 0;font-size:12px}';document.head.append(css);
function state(){const f=s?.empire?.economy?.factory;if(!f)return null;if(!Array.isArray(f.warehouseCars))f.warehouseCars=[];f.warehouseCapacity=Math.max(20,Math.min(5000,Number(f.warehouseCapacity)||20));return f}
function refresh(){
 const f=state();panel.hidden=!f?.opened;if(!f?.opened)return;
 const free=Math.max(0,(Number(s.slots)||0)-s.stock.length);
 const cost=Math.round(20000*Math.pow(1.35,Math.max(0,(f.warehouseCapacity-20)/20)));
 panel.querySelector('#ae-warehouse-stats').innerHTML='<p><b>Pátio:</b> '+f.warehouseCars.length+'/'+f.warehouseCapacity+' vagas · <b>Vagas na concessionária:</b> '+free+'</p>';
 panel.querySelector('#ae-warehouse-cars').innerHTML=f.warehouseCars.slice(0,30).map(c=>'<div class="ae-warehouse-car"><span>'+esc(c.name)+' · '+esc(c.colorName||'')+'</span><button type="button" data-transfer="'+esc(c.id)+'"'+(free<1?' disabled':'')+'>Transferir</button></div>').join('')+(f.warehouseCars.length>30?'<p>Mostrando os primeiros 30 veículos.</p>':'');
 panel.querySelector('#ae-warehouse-upgrade').textContent=f.warehouseCapacity>=5000?'Capacidade máxima': 'Ampliar +20 vagas · '+money(cost);
 panel.querySelector('#ae-warehouse-upgrade').disabled=f.warehouseCapacity>=5000||s.cash<cost;
}
panel.addEventListener('click',ev=>{
 const f=state();if(!f)return;
 const transfer=ev.target.closest('[data-transfer]');
 if(transfer){
  if(s.stock.length>=s.slots)return toast('Concessionária sem vagas.');
  const index=f.warehouseCars.findIndex(c=>String(c.id)===transfer.dataset.transfer);if(index<0)return;
  const car=f.warehouseCars.splice(index,1)[0];s.stock.push(car);
  note('Transferência do pátio: '+car.name+'.');save();render();refresh();return;
 }
 if(ev.target.closest('#ae-warehouse-upgrade')){
  if(f.warehouseCapacity>=5000)return;
  const cost=Math.round(20000*Math.pow(1.35,Math.max(0,(f.warehouseCapacity-20)/20)));
  if(s.cash<cost)return toast('Caixa insuficiente.');
  if(!confirm('Ampliar o pátio em 20 vagas por '+money(cost)+'?'))return;
  s.cash-=cost;entry('Ampliação do pátio industrial',-cost);f.warehouseCapacity+=20;
  note('Pátio industrial ampliado para '+f.warehouseCapacity+' vagas.');save();render();refresh();
 }
});
const oldRender=render;let key='';
render=function(){const result=oldRender.apply(this,arguments);const f=s?.empire?.economy?.factory;const next=[s?.day,s?.cash,s?.stock?.length,f?.warehouseCars?.length,f?.warehouseCapacity].join('|');if(next!==key){key=next;refresh()}return result};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);refresh();
})();