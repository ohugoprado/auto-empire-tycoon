/* Auto Empire Tycoon — Alpha 6.6: evidence-based production intelligence. */
(function(){
'use strict';
const host=document.getElementById('ae-industrial-planning');if(!host)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const card=document.createElement('div');card.id='ae-production-intelligence';
card.innerHTML='<h3>Inteligência de produção</h3><p class="tiny">Decisões orientadas pelas vendas registradas nesta campanha. Sem previsão artificial de demanda.</p><div id="ae-intel-summary"></div><div id="ae-intel-models"></div><div id="ae-intel-colors"></div>';
host.append(card);
const style=document.createElement('style');style.textContent=`
#ae-production-intelligence{border-top:1px solid #496273;margin-top:15px;padding-top:14px}
#ae-production-intelligence h3{font-size:14px;color:#f4d38b;margin:0 0 9px}
#ae-intel-summary{padding:10px;border-radius:9px;background:#20384b;font-size:12px;line-height:1.6}
.ae-intel-line{border:1px solid #405a6b;border-radius:9px;padding:11px;margin:9px 0;background:#20384b}
.ae-intel-line h4{margin:0 0 7px;font-size:13px}
.ae-intel-line p{font-size:12px;color:#c8d8e0;margin:5px 0;line-height:1.5}
.ae-intel-colors{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
.ae-intel-color{display:inline-flex;align-items:center;gap:6px;border:1px solid #516c7d;border-radius:18px;padding:6px 9px;font-size:11px}
.ae-intel-color i{width:13px;height:13px;border-radius:50%;border:1px solid #a5b5bf}
`;document.head.append(style);
function refresh(){
 const e=s?.empire?.economy,designs=e?.studio?.designs||[],queue=e?.factory?.queue||[],sales=s?.productionAnalytics?.sales||[];
 const stock=s?.stock||[],summary=card.querySelector('#ae-intel-summary'),models=card.querySelector('#ae-intel-models'),colors=card.querySelector('#ae-intel-colors');
 if(!summary||!models||!colors)return;
 const recent=sales.filter(x=>n(x.day)>=n(s.day)-29);
 const recentProfit=recent.reduce((a,x)=>a+n(x.profit),0);
 summary.innerHTML='Últimos 30 dias simulados: <b>'+recent.length+' venda(s) própria(s)</b> · Resultado registrado: <b>'+money(recentProfit)+'</b>.<br>Resultados anteriores à Alpha 6.5 não estão disponíveis neste histórico.';
 models.innerHTML=designs.map(d=>{
  const history=sales.filter(x=>String(x.designId)===String(d.id)),last30=history.filter(x=>n(x.day)>=n(s.day)-29);
  const unsold=stock.filter(x=>x.manufactured&&String(x.designId)===String(d.id));
  const pending=queue.filter(x=>String(x.designId)===String(d.id));
  const profit=history.reduce((a,x)=>a+n(x.profit),0);
  const margin=history.length?Math.round(profit/history.length):0;
  const age=unsold.length?Math.max(0,Math.round(unsold.reduce((a,x)=>a+Math.max(0,n(s.day)-n(x.manufacturedDay||s.day)),0)/unsold.length)):0;
  let verdict='';
  if(!history.length)verdict='Sem histórico suficiente. Comece com lotes pequenos e avalie a aceitação.';
  else if(unsold.length+pending.length>=Math.max(2,last30.length*2))verdict='Estoque e produção elevados em relação às vendas recentes. Considere aguardar antes de ampliar o lote.';
  else if(margin<=0)verdict='Margem média não positiva. Revise custos e preços antes de aumentar a escala.';
  else if(last30.length>=2&&unsold.length+pending.length<=1)verdict='Vendas recentes e pouco estoque. Há espaço para avaliar uma nova produção pequena.';
  else verdict='Mantenha lotes moderados e acompanhe a evolução das vendas.';
  return '<div class="ae-intel-line"><h4>'+esc(d.name)+'</h4><p>Vendas nos últimos 30 dias: <b>'+last30.length+'</b> · Margem média histórica: <b>'+money(margin)+'</b></p><p>Em estoque: '+unsold.length+' · Na fila: '+pending.length+'</p><p><b>Leitura:</b> '+verdict+'</p></div>';
 }).join('')||'<p class="tiny">Homologue um modelo para receber recomendações de planejamento.</p>';
 const groups=new Map();
 for(const x of sales){
  const label=String(x.color||'Cor não registrada');
  const entry=groups.get(label)||{count:0,profit:0};
  entry.count++;entry.profit+=n(x.profit);groups.set(label,entry);
 }
 const top=[...groups].sort((a,b)=>b[1].count-a[1].count).slice(0,6);
 colors.innerHTML='<h3>Cores mais vendidas</h3>'+(top.length?'<div class="ae-intel-colors">'+top.map(([color,data])=>'<span class="ae-intel-color">'+(color.startsWith('#')&&/^#[0-9a-fA-F]{6}$/.test(color)?'<i style="background:'+color+'"></i>':'')+esc(color)+' · '+data.count+' venda(s)</span>').join('')+'</div><p class="tiny">Ranking por volume vendido, não por preferência real do mercado. Compare com as cores produzidas para evitar conclusões precipitadas.</p>':'<p class="tiny">As vendas futuras dos carros próprios aparecerão aqui, separadas por pintura.</p>');
}
const prevRender=render;let previous='';
render=function(){prevRender();const a=s?.productionAnalytics?.sales||[],f=s?.empire?.economy?.factory,signature=[s?.day,s?.stock?.length,f?.queue?.length,a.length,s?.empire?.economy?.studio?.designs?.length].join('|');if(signature!==previous){previous=signature;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
