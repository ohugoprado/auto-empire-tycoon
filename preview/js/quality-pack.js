/* Auto Empire Tycoon 2.3 — 20 usability and stability improvements. */
(function(){
'use strict';
const id=x=>document.getElementById(x),money=v=>fmt(Math.round(Number(v)||0));
const safe=v=>esc(String(v??''));
const math=window.AETradeMath;
// The legacy isometric scene is hidden in text-first mode: skip its expensive canvas paint.
if(typeof drawScene==='function')drawScene=function(){};
const banner=document.getElementById('ae-version');if(banner)banner.textContent='AUTO EMPIRE TYCOON · ALPHA 2.3.0 · BUILD 2300';
const tag=document.querySelector('.top .tag');if(tag)tag.textContent='ALPHA 2.3.0 · GESTÃO APRIMORADA';
document.title='Auto Empire Tycoon — Alpha 2.3.0';
const css=document.createElement('style');
css.textContent=`
#ae-tools{margin:10px 0;padding:12px;background:#132d3c;border:1px solid #496879;border-radius:13px}
#ae-tools h3{margin:0 0 9px;color:#f2d393;font-size:13px}
.ae-tool-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.ae-tool-grid button{min-height:43px;font-size:12px;padding:7px;background:#254455;border:1px solid #557688;color:#e8f1f1;border-radius:9px}
#ae-stock-filters{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}
#ae-stock-filters input,#ae-stock-filters select{min-width:0;width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #567586;background:#102330;color:#eef4f5;font-size:14px}
.ae-mini-report{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}
.ae-mini-report div{background:#1a3746;padding:9px;border-radius:9px;border:1px solid #395c6b}
.ae-mini-report small{display:block;color:#b6ccd6;font-size:10px}
.ae-mini-report b{display:block;margin-top:3px;font-size:14px;color:#f2d69b}
.ae-tip{margin:9px 0;padding:10px;background:#203947;border-left:3px solid #edc77b;color:#d4e4e7;font-size:12px;line-height:1.5}
.ae-sorted-card{border-left:3px solid #719da7}
#ae-tools .ae-toolbar-status{font-size:11px;color:#b8d0d8;margin-top:8px}
@media(min-width:680px){.ae-tool-grid{grid-template-columns:repeat(4,minmax(0,1fr))}#ae-stock-filters{grid-template-columns:2fr 1fr 1fr}}
`;
document.head.appendChild(css);
const tools=document.createElement('section');tools.id='ae-tools';
tools.innerHTML='<h3>CENTRAL DE GESTÃO</h3><div class="ae-tool-grid"><button data-action="next">Avançar 1 dia</button><button data-action="pause">Pausar / continuar</button><button data-action="save">Salvar campanha</button><button data-action="help">Como jogar</button><button data-action="finance">Resumo financeiro</button><button data-action="export">Exportar backup</button><button data-action="import">Importar backup</button><button data-action="focus">Ver oportunidades</button></div><div class="ae-toolbar-status" aria-live="polite">Sua campanha é salva automaticamente.</div><input type="file" id="ae-import-file" accept=".json,application/json" hidden>';
const garage=id('garage');if(garage)garage.prepend(tools);
const filters=document.createElement('div');filters.id='ae-stock-filters';
filters.innerHTML='<input id="ae-stock-search" aria-label="Buscar veículo" placeholder="Buscar veículo no estoque"><select id="ae-stock-sort" aria-label="Ordenar estoque"><option value="default">Ordem original</option><option value="price">Maior preço</option><option value="profit">Maior margem potencial</option><option value="age">Mais tempo anunciado</option></select><select id="ae-stock-kind" aria-label="Filtrar categoria"><option value="all">Todas categorias</option></select>';
const stock=id('stock');if(stock)stock.insertAdjacentElement('beforebegin',filters);
const report=document.createElement('section');report.id='ae-quick-report';report.className='ae-mini-report';
if(id('reports'))id('reports').prepend(report);
const hint=document.createElement('div');hint.id='ae-context-tip';hint.className='ae-tip';
if(garage)garage.insertAdjacentElement('afterbegin',hint);
let search='',sort='default',kind='all',filterLock=false;
function updateFilters(){
 const all=Array.isArray(s?.stock)?s.stock:[];
 const kinds=[...new Set(all.map(c=>c.kind).filter(Boolean))].sort();
 const select=id('ae-stock-kind');
 if(select){const current=kind;select.innerHTML='<option value="all">Todas categorias</option>'+kinds.map(k=>'<option value="'+safe(k)+'">'+safe(k)+'</option>').join('');kind=kinds.includes(current)?current:'all';select.value=kind}
}
function filterStock(){
 if(filterLock||!stock||!s)return;
 const cards=[...stock.children],cars=s.stock||[];
 if(cards.length!==cars.length)return;
 // Keep vehicle identity attached to each DOM card across repeated sorting/filtering.
 if(cards.some(node=>!node.dataset.aeCarId))cards.forEach((node,i)=>{node.dataset.aeCarId=String(cars[i]?.id??'')});
 const byId=new Map(cards.map(node=>[node.dataset.aeCarId,node]));
 filterLock=true;
 try{
  const ordered=cars.map((car,i)=>({car,node:byId.get(String(car.id)),index:i})).filter(x=>x.node);
  const key=car=>sort==='price'?Number(car.price||car.value||0):sort==='profit'?Number(car.price||car.value||0)-Number(car.bought||0)-Number(car.spent||0):sort==='age'?Number(car.days||0):0;
  if(sort!=='default')ordered.sort((a,b)=>key(b.car)-key(a.car)||a.index-b.index);
  const fragment=document.createDocumentFragment();let visible=0;
  for(const {car,node} of ordered){const show=String(car.name||'').toLocaleLowerCase('pt-BR').includes(search)&&(kind==='all'||car.kind===kind);node.hidden=!show;if(show)visible++;fragment.append(node)}
  stock.append(fragment);
  const status=tools.querySelector('.ae-toolbar-status');if(status)status.textContent=visible+' de '+cars.length+' veículos exibidos · salvamento automático ativo';
 }finally{filterLock=false}
}
function updateReport(){
 if(!s)return;
 const data=math?.summary(s.stock)||{invested:0,asking:0,gross:0};
 const payroll=Object.entries({seller:2200,mechanic:1800,analyst:1500}).reduce((sum,[k,v])=>sum+(Number(s.empire?.staff?.[k])||0)*v,0);
 const rent={casual:700,normal:1200,hard:1900}[s.difficulty]||1200;
 const items=[['Caixa disponível',money(s.cash)],['Capital no estoque',money(data.invested)],['Receita anunciada',money(data.asking)],['Lucro bruto estimado',money(data.gross)],['Despesas fixas / 30 dias',money(payroll+rent)],['Vendas concluídas',s.sales||0]];
 report.innerHTML=items.map(([label,value])=>'<div><small>'+label+'</small><b>'+value+'</b></div>').join('');
 const summary=id('summary');if(summary){const old=summary.querySelector('.ae-rent-correction');if(old)old.remove()}
}
function updateTip(){
 if(!s)return;
 const offers=s.stock.reduce((n,c)=>n+(c.offers?.length||0),0);
 let msg;
 if(s.cash<0)msg='Atenção: o caixa está negativo. Priorize vendas e evite novos gastos.';
 else if(offers)msg='Você tem '+offers+' proposta(s) aguardando análise. Compare o lucro bruto antes de aceitar.';
 else if(s.stock.length===0)msg='Sua primeira meta: encontrar um veículo com margem de compra e espaço para reparos.';
 else if(s.stock.some(c=>!c.listed))msg='Há veículos sem anúncio. Avalie reparos e defina um preço para atrair compradores.';
 else if(s.stock.length>=s.slots)msg='Estoque cheio: negocie vendas antes de comprar mais veículos.';
 else msg='Compare preço anunciado, custo total e tendências antes da próxima compra.';
 hint.textContent=msg;
}
const oldRender=render;
render=function(){oldRender();updateFilters();filterStock();updateReport();updateTip()};
const oldPublish=publish;
publish=function(){const car=s.stock.find(c=>c.id===modalCar);const input=id('asking');const amount=Number(input?.value);if(car&&Number.isFinite(amount)&&amount>0){const cost=math?.basis(car)??(car.bought+car.spent);if(amount<cost&&!confirm('Anunciar abaixo do custo investido? Prejuízo potencial: '+money(cost-amount)))return}return oldPublish()};
const oldSubmit=submitBid;
submitBid=function(){const car=s.market.find(c=>c.id===modalCar),input=id('bid');const amount=Number(input?.value);if(car&&Number.isFinite(amount)&&amount>car.ask*1.25&&!confirm('Sua oferta está mais de 25% acima do preço pedido. Continuar?'))return;return oldSubmit()};
const oldBuy=buyDialog;
buyDialog=function(carId){oldBuy(carId);const car=s.market.find(c=>c.id===carId),body=id('modalbody');if(!car||!body)return;const detail=document.createElement('div');detail.className='ae-tip';detail.textContent='Estimativa: preço pedido '+money(car.ask)+' + reparos '+money(car.repair||0)+' = custo total aproximado '+money(car.ask+(car.repair||0))+'. A condição real pode variar.';body.append(detail)};
const oldList=listDialog;
listDialog=function(carId){oldList(carId);const car=s.stock.find(c=>c.id===carId),body=id('modalbody');if(!car||!body)return;const info=document.createElement('div');info.className='ae-tip';info.textContent='Custo registrado: '+money(math?.basis(car)??(car.bought+car.spent))+' · referência de mercado: '+money(car.value);body.append(info)};
const oldAccept=acceptOffer;
acceptOffer=function(i){const car=s.stock.find(c=>c.id===modalCar),offer=car?.offers?.[i];if(offer&&offer.amount>0&&offer.amount<(car.price||0)*.75&&!confirm('O comprador oferece mais de 25% abaixo do anúncio. Aceitar mesmo assim?'))return;return oldAccept(i)};
const oldRefresh=refreshPaid;
refreshPaid=function(){if(s.market.length&& !confirm('Pesquisar novos anúncios substitui a lista atual. Continuar?'))return;return oldRefresh()};
const oldClose=closeModal;
closeModal=function(){oldClose();const input=id('ae-stock-search');if(input)input.blur()};
const oldShow=show;
show=function(t){oldShow(t);const active=document.querySelector('.bottom [data-tab="'+t+'"]');if(active){document.querySelectorAll('.bottom [data-tab]').forEach(el=>el.setAttribute('aria-current',el===active?'page':'false'))}};
function advance(){if(!s||!paused)return toast('Pause a simulação antes de avançar um dia.');tickDay();render();toast('Dia '+s.day+' iniciado')}
function help(){open('<h2>Guia rápido</h2><p>1. No Mercado, escolha um veículo e negocie o preço de compra.</p><p>2. Avalie o custo de reparos e o capital disponível.</p><p>3. Anuncie o carro e avance o tempo até receber propostas.</p><p>4. Compare lucro e margem antes de vender.</p><p>5. Reinvista em equipe, vagas e novas unidades.</p><p class="tiny">O jogo salva automaticamente neste navegador. A dificuldade altera o capital inicial, aluguel e ofertas.</p><button onclick="closeModal()">Entendi</button>')}
function exportSave(){
 try{const payload={format:'autoempire-backup',version:1,created:new Date().toISOString(),save:s,profile:JSON.parse(localStorage.getItem('autoempire_company_profile_v1')||'null')};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='auto-empire-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Backup gerado')}catch(e){toast('Não foi possível exportar o backup')}}
async function importSave(file){
 if(!file||file.size>2e6)return toast('Arquivo inválido ou muito grande');
 let data;try{data=JSON.parse(await file.text())}catch(e){return toast('JSON inválido')}
 if(data?.format!=='autoempire-backup'||data.version!==1||data.save?.version!==2||!Array.isArray(data.save.stock)||!Array.isArray(data.save.market)||!Array.isArray(data.save.ledger)||!Array.isArray(data.save.logs)||!Number.isFinite(Number(data.save.cash))||!Number.isFinite(Number(data.save.day)))return toast('Backup incompatível');
 if(data.save.stock.length>500||data.save.market.length>500||data.save.ledger.length>2000||data.save.logs.length>2000||!Number.isInteger(Number(data.save.day))||Number(data.save.day)<1||!Number.isFinite(Number(data.save.slots))||Number(data.save.slots)<1||Number(data.save.slots)>1000)return toast('Backup com dados inconsistentes');
 if(!confirm('Importar este backup e substituir a campanha atual?'))return;
 try{localStorage.setItem('autoempire_preview_v06',JSON.stringify(data.save));if(data.profile&&typeof data.profile.company==='string'&&typeof data.profile.owner==='string')localStorage.setItem('autoempire_company_profile_v1',JSON.stringify(data.profile));location.reload()}catch(e){toast('Falha ao restaurar o backup')}
}
tools.addEventListener('click',ev=>{const action=ev.target.closest('[data-action]')?.dataset.action;if(!action)return;
 if(action==='next')advance();
 if(action==='pause')toggle();
 if(action==='save'){save();toast('Campanha salva')}
 if(action==='help')help();
 if(action==='finance')show('reports');
 if(action==='export')exportSave();
 if(action==='import')id('ae-import-file').click();
 if(action==='focus')show('market');
});
id('ae-import-file').addEventListener('change',ev=>{importSave(ev.target.files?.[0]);ev.target.value=''});
id('ae-stock-search').addEventListener('input',ev=>{search=ev.target.value.trim().toLocaleLowerCase('pt-BR');filterStock()});
id('ae-stock-sort').addEventListener('change',ev=>{sort=ev.target.value;filterStock()});
id('ae-stock-kind').addEventListener('change',ev=>{kind=ev.target.value;filterStock()});
window.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!id('modal').classList.contains('hide'))closeModal()});
render();
})();
