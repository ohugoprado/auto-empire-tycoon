/* Auto Empire Tycoon — Alpha 11.4: model portfolio intelligence. */
(function(){
'use strict';
const studio=document.getElementById('ae-studio');if(!studio)return;
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>Math.round(Number(x)||0).toLocaleString('pt-BR')+' CR';
const designs=()=>s?.empire?.economy?.studio?.designs||[];
const section=document.createElement('section');section.id='ae-market-intelligence';
section.innerHTML='<h3>Inteligência de mercado · Portfólio</h3><p class="tiny">Indicadores por projeto. Vendas são registradas a partir desta atualização; resultados anteriores não são estimados.</p><div id="ae-market-rows"></div>';
studio.append(section);
const css=document.createElement('style');css.textContent=`
#ae-market-intelligence{padding:13px;margin:12px 0;background:#173543;border:1px solid #587483;border-radius:12px}
#ae-market-intelligence h3{font-size:15px;color:#f3d28e;margin:0 0 8px}
.ae-market-card{background:#234553;border-radius:10px;padding:11px;margin:9px 0}
.ae-market-card strong{font-size:13px}
.ae-market-card p{font-size:12px;line-height:1.5;margin:6px 0}
.ae-market-card button{min-height:42px;font-size:12px;margin-top:6px}
.ae-market-meter{height:8px;background:#102734;border-radius:9px;overflow:hidden}
.ae-market-meter span{display:block;height:100%;background:#d2b36d;border-radius:9px}
`;document.head.append(css);
function metrics(d){
 const cars=(s?.stock||[]).filter(c=>c.manufactured&&String(c.designId)===String(d.id));
 const queued=(s?.empire?.economy?.factory?.queue||[]).filter(j=>String(j.designId)===String(d.id));
 const age=Math.max(0,Number(s.day)-(Number(d.introducedDay)||Number(s.day)));
 const freshness=Math.max(.7,1-Math.max(0,age-45)*.0015);
 const score=Math.min(1.2,Math.max(.8,freshness+Math.min(.2,Math.max(0,Number(d.lifecycleBonus)||0))));
 const sales=d.marketSales||{units:0,revenue:0,gross:0};
 return {cars,queued,age,score,sales};
}
function refresh(){
 const list=designs();
 section.hidden=!s?.empire?.economy?.factory?.opened||!list.length;
 const root=section.querySelector('#ae-market-rows');
 root.innerHTML=list.map(d=>{
 const m=metrics(d),pct=Math.round(m.score*100),units=Number(m.sales.units)||0;
 const status=d.retired?'Produção encerrada':m.age>110?'Projeto envelhecido':m.age>45?'Acompanhar demanda':'Projeto recente';
 return '<article class="ae-market-card"><strong>'+safe(d.name)+'</strong> · G'+(Number(d.generation)||1)+' · '+status+
 '<p>Competitividade relativa: '+pct+'% · '+m.age+' dias desde a atualização</p><div class="ae-market-meter"><span style="width:'+Math.min(100,Math.max(0,pct))+'%"></span></div>'+
 '<p>Em estoque: '+m.cars.length+' · Em produção: '+m.queued.length+'<br>Vendas registradas: '+units+' · Receita: '+money(m.sales.revenue)+' · Margem bruta estimada: '+money(m.sales.gross)+'</p>'+
 '<button type="button" data-retire="'+Number(d.id)+'">'+(d.retired?'Reativar projeto':'Encerrar novas produções')+'</button></article>';
 }).join('');
}
section.addEventListener('click',e=>{
 const button=e.target.closest('[data-retire]');if(!button)return;
 const d=designs().find(x=>String(x.id)===button.dataset.retire);if(!d)return;
 const next=!d.retired;
 if(!confirm(next?'Encerrar novas produções de '+d.name+'? Ordens já abertas continuarão.':'Reativar '+d.name+' para novas produções?'))return;
 d.retired=next;save();render();refresh();toast(next?'Projeto retirado de linha.':'Projeto reativado.');
});
const previousAccept=acceptOffer;
acceptOffer=function(i){
 const car=(s?.stock||[]).find(c=>c.id===modalCar);
 const offer=car?.offers?.[i],amount=Number(offer?.amount)||0;
 const before=Number(s.sales)||0;
 const result=previousAccept.apply(this,arguments);
 if(car?.manufactured&&car.designId!=null&&(Number(s.sales)||0)>before){
  const d=designs().find(x=>String(x.id)===String(car.designId));
  if(d){
   const m=d.marketSales||(d.marketSales={units:0,revenue:0,gross:0});
   m.units=(Number(m.units)||0)+1;
   m.revenue=(Number(m.revenue)||0)+amount;
   m.gross=(Number(m.gross)||0)+amount-(Number(car.bought)||0)-(Number(car.spent)||0);
   save();refresh();
  }
 }
 return result;
};
const oldRender=render;let signature='';
render=function(){const result=oldRender.apply(this,arguments);const key=[s?.day,s?.cash,designs().map(d=>[d.id,d.retired,d.generation,d.facelift,d.marketSales?.units].join(':')).join('|'),s?.stock?.length,s?.empire?.economy?.factory?.queue?.length].join(';');if(key!==signature){signature=key;refresh()}return result;};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
