/* Auto Empire Tycoon — text-first management module. Loaded after the core game. */

(function(){
'use strict';
const VERSION='Alpha 1.9.3',BUILD='1930';
document.title='Auto Empire Tycoon — '+VERSION;
const banner=document.getElementById('ae-version');if(banner)banner.textContent='AUTO EMPIRE TYCOON · '+VERSION+' · BUILD '+BUILD;
const tag=document.querySelector('.top .tag');if(tag)tag.textContent='ALPHA 1.9.3 · NEGOCIAÇÃO ANALÍTICA';
const style=document.createElement('style');
style.textContent=`
/* Text-first mode: financial information and management decisions take priority. */
.studio-hero,.studio-brand,#ae-studio-inspector,#studio-lightbox{display:none!important}
#garage .scene-wrap{display:none!important}
.ae-car-thumb{display:none!important}
.ae-text-stock{display:flex;gap:9px;align-items:center;min-width:0;flex:1}
.ae-text-stock .ae-text-kind{font-size:10px;font-weight:900;letter-spacing:.7px;color:#f3ce82;background:#203846;border:1px solid #567282;border-radius:6px;padding:6px 8px;white-space:nowrap}
.ae-text-stock .ae-text-name{font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#ae-text-garage{margin:12px 0;border:1px solid #496a78;border-radius:14px;background:#122b38;padding:14px}
#ae-text-garage h3{font-size:14px;color:#f5d28b;margin:0 0 9px}
#ae-text-garage .ae-text-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
#ae-text-garage .ae-text-metric{padding:10px;background:#1a3645;border:1px solid #35596b;border-radius:10px}
#ae-text-garage .ae-text-metric span{display:block;color:#b5ccd6;font-size:11px}
#ae-text-garage .ae-text-metric strong{display:block;font-size:16px;margin-top:4px;color:#f7e0ae;overflow-wrap:anywhere}
@media(min-width:700px){#ae-text-garage .ae-text-summary{grid-template-columns:repeat(4,minmax(0,1fr))}}
`;
document.head.appendChild(style);
const garage=document.getElementById('garage');
if(garage){
 const dashboard=document.createElement('section');dashboard.id='ae-text-garage';dashboard.setAttribute('aria-label','Resumo da concessionária');
 dashboard.innerHTML='<h3>PAINEL DA CONCESSIONÁRIA</h3><div class="ae-text-summary"></div>';
 const buttons=document.getElementById('ae-garage-buttons');if(buttons)buttons.insertAdjacentElement('beforebegin',dashboard);else garage.prepend(dashboard);
 const update=()=>{
  const stock=Array.isArray(s?.stock)?s.stock:[];
  const listed=stock.filter(c=>c.listed).length;
  const invested=stock.reduce((sum,c)=>sum+(Number(c.bought)||0)+(Number(c.spent)||0),0);
  const cells=[['Veículos no estoque',stock.length+' / '+(s?.slots||0)],['Anunciados',listed],['Capital investido',typeof fmt==='function'?fmt(invested):invested.toLocaleString('pt-BR')],['Reputação',(s?.rep??0)+'/100']];
  dashboard.querySelector('.ae-text-summary').innerHTML=cells.map(([k,v])=>'<div class="ae-text-metric"><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
 };
 (window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(update);
 update();
}
const intelligence=document.createElement('section');
intelligence.id='ae-trade-intelligence';
intelligence.setAttribute('aria-label','Análise comercial');
intelligence.innerHTML='<div class="ae-intel-heading"><strong>INTELIGÊNCIA COMERCIAL</strong><span>Dados do seu estoque</span></div><div class="ae-intel-metrics"></div><div class="ae-intel-insight" aria-live="polite"></div>';
const garageIntel=document.getElementById('garage');
if(garageIntel){
 const summary=document.getElementById('ae-text-garage');
 if(summary)summary.insertAdjacentElement('afterend',intelligence);else garageIntel.prepend(intelligence);
 const refreshIntelligence=()=>{
  const stock=Array.isArray(s?.stock)?s.stock:[];
  const summary=window.AETradeMath.summary(stock);
  const listed=stock.filter(c=>c.listed);
  const {asking,invested,gross,margin}=summary;
  const format=typeof fmt==='function'?fmt:(v)=>'R$ '+Math.round(v).toLocaleString('pt-BR');
  const metrics=[['Valor anunciado',format(asking)],['Lucro bruto potencial',format(gross)],['Margem potencial',margin.toFixed(1).replace('.',',')+'%'],['Capital imobilizado',format(invested)]];
  intelligence.querySelector('.ae-intel-metrics').innerHTML=metrics.map(([k,v])=>'<div class="ae-intel-metric"><span>'+k+'</span><b>'+v+'</b></div>').join('');
  const hint=intelligence.querySelector('.ae-intel-insight');
  if(!stock.length){hint.textContent='Primeiro passo: encontre um veículo no mercado, avalie o custo total e negocie a compra.';return}
  if(!listed.length){hint.textContent='Nenhum carro anunciado. Avalie os custos de aquisição e preparação antes de definir os preços de venda.';return}
  if(gross<0){hint.textContent='Atenção: a soma dos preços anunciados está abaixo do custo registrado dos veículos anunciados.';return}
  if(margin<10){hint.textContent='Margem bruta potencial inferior a 10%. Revise preços e custos antes de aceitar propostas.';return}
  if(stock.length>=Number(s?.slots||0)){hint.textContent='Garagem lotada. Priorize vendas e libere vagas antes de procurar novas oportunidades.';return}
  hint.textContent='Estoque com anúncios ativos. Compare propostas com o custo investido em cada veículo antes de fechar negócio.';
 };
 (window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refreshIntelligence);
 refreshIntelligence();
}
const intelStyle=document.createElement('style');
intelStyle.textContent=`#ae-trade-intelligence{margin:12px 0;padding:14px;background:#101f2b;border:1px solid #3b5969;border-radius:14px}#ae-trade-intelligence .ae-intel-heading{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:10px}#ae-trade-intelligence .ae-intel-heading strong{font-size:12px;letter-spacing:1px;color:#f1ce87}#ae-trade-intelligence .ae-intel-heading span{font-size:10px;color:#a5bbc7}#ae-trade-intelligence .ae-intel-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#ae-trade-intelligence .ae-intel-metric{padding:10px;border:1px solid #304d5c;background:#1b303e;border-radius:9px;min-width:0}#ae-trade-intelligence .ae-intel-metric span{display:block;color:#abc4cf;font-size:10px}#ae-trade-intelligence .ae-intel-metric b{display:block;color:#f3e2b6;font-size:15px;margin-top:5px;overflow-wrap:anywhere}#ae-trade-intelligence .ae-intel-insight{font-size:12px;line-height:1.5;color:#cbdde3;border-top:1px solid #3b5969;margin-top:12px;padding-top:10px}@media(min-width:700px){#ae-trade-intelligence .ae-intel-metrics{grid-template-columns:repeat(4,minmax(0,1fr))}}`;
document.head.appendChild(intelStyle);
const originalCarSvg=carSvg;
carSvg=function(car){
 const kind=esc(String(car?.kind||'Veículo'));
 const name=esc(String(car?.name||'Sem modelo'));
 return '<div class="ae-text-stock" aria-label="'+kind+' — '+name+'"><span class="ae-text-kind">'+kind+'</span><span class="ae-text-name">'+name+'</span></div>';
};
if(typeof render==='function')render();
})();

