/* Alpha 2.7 — operational controls, supplier strategy and cash flow. */
(function(){
'use strict';
const money=n=>fmt(Math.round(n||0));
const safe=v=>esc(String(v??''));
const suppliers=[
{id:'economy',name:'Peças econômicas',factor:.92,days:2,quality:-7,description:'Menor custo, maior risco de defeitos.'},
{id:'standard',name:'Fornecedor certificado',factor:1,days:1,quality:0,description:'Preço e confiabilidade equilibrados.'},
{id:'premium',name:'Componentes premium',factor:1.18,days:0,quality:8,description:'Maior qualidade, custo e garantia.'}
];
const initial=()=>({supplier:'standard',completed:0,defects:0,returns:0,warrantyPaid:0,monthlyHistory:[],lastSnapshotDay:0});
function ensure(){
 const e=s?.empire?.economy;if(!e)return null;
 if(!e.operations||typeof e.operations!=='object')e.operations=initial();
 const o=e.operations;
 if(!suppliers.some(v=>v.id===o.supplier))o.supplier='standard';
 for(const k of ['completed','defects','returns','warrantyPaid'])o[k]=Math.max(0,Math.floor(Number(o[k])||0));
 if(!Array.isArray(o.monthlyHistory))o.monthlyHistory=[];
 if(!Number.isFinite(o.lastSnapshotDay))o.lastSnapshotDay=0;
 return o;
}
const getSupplier=()=>suppliers.find(v=>v.id===ensure()?.supplier)||suppliers[1];
const calc={
 inventory(stock){return (stock||[]).reduce((a,c)=>a+Math.max(0,Number(c.bought)||0)+Math.max(0,Number(c.spent)||0),0)},
 receivables(stock){return (stock||[]).reduce((a,c)=>a+Math.max(0,Number(c.price)||0),0)},
 monthly(ledger,day){return (ledger||[]).filter(x=>Number(x.day)>day-30).reduce((a,x)=>{const amount=Number(x.amount)||0;return {income:a.income+Math.max(0,amount),expenses:a.expenses+Math.max(0,-amount)}},{income:0,expenses:0})},
 forecast(cash,ledger,day,fixed){const flow=calc.monthly(ledger,day);return cash+flow.income-flow.expenses-fixed},
 netWorth(cash,stock){return cash+calc.inventory(stock)}
};
window.AEFinanceMath=Object.freeze(calc);
const css=document.createElement('style');css.textContent=`
#ae-operations{margin:12px 0;padding:14px;background:#102c3b;border:1px solid #466a7d;border-radius:13px}
#ae-operations h3{margin:0 0 10px;color:#f3d38d;font-size:14px}
.ae-op-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ae-op-grid div{padding:10px;background:#203c4a;border-radius:9px}
.ae-op-grid small{font-size:10px;color:#c2d5dd;display:block;margin-bottom:4px}
.ae-op-grid b{font-size:13px;color:#f2d494}
.ae-op-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.ae-op-controls select{min-width:0;flex:1 1 160px;padding:9px;border-radius:8px;background:#0a1f2c;border:1px solid #547587;color:#eef3f4}
.ae-op-controls button{min-height:43px;flex:1 1 100px}
.ae-op-note{font-size:11px;color:#c2d5dc;line-height:1.5;margin:9px 0}
.ae-op-warning{color:#f7bdad;font-weight:700}
`;document.head.append(css);
const panel=document.createElement('section');panel.id='ae-operations';panel.innerHTML='<h3>📊 Finanças e cadeia de fornecedores</h3><div class="ae-op-grid" id="ae-op-numbers"></div><div class="ae-op-controls"><select id="ae-op-supplier" aria-label="Fornecedor de componentes"></select><button id="ae-op-report">Relatório detalhado</button></div><p id="ae-op-description" class="ae-op-note"></p><p class="ae-op-note">Previsão simplificada: repete o fluxo dos últimos 30 dias e subtrai as próximas despesas fixas. Não garante resultados futuros.</p>';
document.getElementById('garage')?.append(panel);
const selector=panel.querySelector('#ae-op-supplier');for(const item of suppliers){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;selector.append(option)}
function metrics(){
 const o=ensure(),e=s.empire.economy,flow=calc.monthly(s.ledger,s.day);
 const wages=Object.entries({seller:850,mechanic:700,analyst:550}).reduce((n,[k,v])=>n+v*(Number(s.empire.staff?.[k])||0),0);
 const rent={casual:700,normal:1200,hard:1900}[s.difficulty]||1200;
 const upkeep=Math.round((s.empire.world?.owned||[]).reduce((a,id)=>a+(window.AEWorld?.cities.find(c=>c.id===id)?.upkeep||0),0)*.9);
 const fixed=wages+rent+upkeep;
 return {o,e,flow,fixed,inventory:calc.inventory(s.stock),asking:calc.receivables(s.stock),forecast:calc.forecast(s.cash,s.ledger,s.day,fixed)};
}
function renderPanel(){
 if(!s)return;const m=metrics();
 const items=[['Caixa',money(s.cash)],['Custo do estoque',money(m.inventory)],['Receitas / 30 dias',money(m.flow.income)],['Despesas / 30 dias',money(m.flow.expenses)],['Fixos estimados / mês',money(m.fixed)],['Caixa projetado',money(m.forecast)],['Patrimônio contábil simples',money(calc.netWorth(s.cash,s.stock))],['Defeitos registrados',m.o.defects]];
 panel.querySelector('#ae-op-numbers').innerHTML=items.map(([k,v])=>'<div><small>'+k+'</small><b>'+v+'</b></div>').join('');
 selector.value=m.o.supplier;
 const supplier=getSupplier();
 panel.querySelector('#ae-op-description').textContent=supplier.description+' Custo de componentes: '+Math.round(supplier.factor*100)+'% do padrão; prazo adicional: '+supplier.days+' dia(s).';
 if(m.forecast<0)panel.querySelector('#ae-op-description').classList.add('ae-op-warning');else panel.querySelector('#ae-op-description').classList.remove('ae-op-warning');
}
selector.addEventListener('change',ev=>{
 const o=ensure(),next=suppliers.find(v=>v.id===ev.target.value);
 if(!o||!next)return;
 o.supplier=next.id;note('Novo fornecedor industrial: '+next.name);save();render();
});
panel.querySelector('#ae-op-report').addEventListener('click',()=>{
 const m=metrics(),o=m.o;
 const rows=[['Receitas nos últimos 30 dias',m.flow.income],['Despesas nos últimos 30 dias',m.flow.expenses],['Fluxo líquido observado',m.flow.income-m.flow.expenses],['Despesas fixas previstas',m.fixed],['Caixa projetado',m.forecast],['Investimento em estoque',m.inventory],['Valor total anunciado',m.asking],['Garantias pagas',o.warrantyPaid]];
 open('<h2>Relatório de gestão</h2>'+rows.map(([k,v])=>'<div class="kv"><span>'+safe(k)+'</span><b>'+money(v)+' CR</b></div>').join('')+'<p class="tiny">Valores contábeis simplificados. O estoque não é caixa disponível; a receita anunciada não é venda realizada.</p><button onclick="closeModal()">Fechar</button>');
});
const prevSeed=seed;seed=function(){prevSeed();ensure();save()};
const prevTick=tickDay;tickDay=function(){
 const before=s.day;prevTick();if(s.day===before)return;
 const o=ensure();if(!o)return;
 if(s.day%30===0){const flow=calc.monthly(s.ledger,s.day);o.monthlyHistory.push({day:s.day,cash:s.cash,inventory:calc.inventory(s.stock),income:flow.income,expenses:flow.expenses});o.monthlyHistory=o.monthlyHistory.slice(-24);save()}
};
const prevRender=render;
let last='';
render=function(){
 prevRender();const o=ensure();if(!o)return;
 const key=[s.day,s.cash,s.stock.length,s.ledger.length,o.supplier,o.defects,s.empire.world?.owned?.length,s.empire.staff?.seller,s.empire.staff?.mechanic,s.empire.staff?.analyst].join('|');
 if(key!==last){last=key;renderPanel()}
};
window.AEOperations={ensure,getSupplier,renderPanel};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(renderPanel);
renderPanel();
})();
