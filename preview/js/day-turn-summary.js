/* Auto Empire Tycoon — Alpha 13.2 turn summary and accounting audit */
(function(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const fmt=n=>Math.round(Number(n)||0).toLocaleString('pt-BR');
const overlay=document.createElement('div');overlay.id='ae-turn-overlay';overlay.hidden=true;
overlay.innerHTML='<section class="ae-turn-card" role="dialog" aria-modal="true" aria-labelledby="ae-turn-title"><div class="ae-turn-top"><div><p class="ae-turn-eyebrow">RELATÓRIO DIÁRIO</p><h2 id="ae-turn-title">Dia concluído</h2></div><button type="button" id="ae-turn-close" aria-label="Fechar resumo">✕</button></div><div id="ae-turn-metrics"></div><h3>Lançamentos financeiros</h3><div id="ae-turn-ledger"></div><h3>Acontecimentos do dia</h3><div id="ae-turn-events"></div><button type="button" id="ae-turn-continue">Continuar jogando</button></section>';
const style=document.createElement('style');style.textContent=`
#ae-turn-overlay[hidden]{display:none!important}#ae-turn-overlay{position:fixed;inset:0;z-index:1000;background:#07121cd9;display:flex;align-items:flex-end;justify-content:center;padding:14px 12px calc(18px + env(safe-area-inset-bottom,0px))}
.ae-turn-card{width:100%;max-width:560px;max-height:85dvh;overflow-y:auto;overscroll-behavior:contain;background:#192c3b;border:1px solid #476277;border-radius:20px;padding:19px;color:#eff5f9;box-shadow:0 20px 60px #0008}
.ae-turn-top{display:flex;justify-content:space-between;gap:14px;align-items:start}.ae-turn-top h2{margin:2px 0 12px;font-size:22px}.ae-turn-eyebrow{font-size:10px;letter-spacing:2px;color:#eec777;margin:0}.ae-turn-top button{background:#344b5c;color:#fff;min-width:44px;min-height:44px}
#ae-turn-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:9px 0 18px}.ae-turn-metric{background:#243b4d;border-radius:11px;padding:11px}.ae-turn-metric small{display:block;color:#b3c4d0;font-size:11px}.ae-turn-metric b{display:block;font-size:17px;margin-top:4px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.ae-turn-card h3{font-size:14px;margin:0 0 9px}.ae-turn-event{padding:9px 0;border-bottom:1px solid #354d5f;font-size:12px;line-height:1.5}#ae-turn-events,#ae-turn-ledger{max-height:22dvh;overflow:auto}#ae-turn-ledger{margin-bottom:16px}.ae-turn-ledger-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #354d5f;font-size:12px}.ae-turn-ledger-row b{white-space:nowrap}.ae-turn-warning{font-size:11px;color:#f2c985;margin:8px 0}#ae-turn-continue{width:100%;min-height:52px;margin-top:18px;background:#f7bc48;color:#17202a}
`;document.head.append(style);document.body.append(overlay);
const close=()=>{overlay.hidden=true;document.getElementById('ae-end-day')?.focus()};
overlay.querySelector('#ae-turn-close').addEventListener('click',close);
overlay.querySelector('#ae-turn-continue').addEventListener('click',close);
overlay.addEventListener('click',ev=>{if(ev.target===overlay)close()});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!overlay.hidden)close()});
window.AEDaySummary={show(before){
 if(!before||!window.s&&typeof s==='undefined')return;
 const delta=(Number(s.cash)||0)-(Number(before.cash)||0);
 const sales=Math.max(0,(Number(s.sales)||0)-(Number(before.sales)||0));
 const oldLedger=new Set(before.ledgerSnapshot||[]);
 const movements=(s.ledger||[]).filter(x=>!oldLedger.has(x));
 const oldLogs=new Set(before.logsSnapshot||[]);
 const recent=(s.logs||[]).filter(x=>!oldLogs.has(x)).slice(0,8);
 const credits=movements.reduce((sum,x)=>sum+Math.max(0,Number(x.amount)||0),0);
 const debits=movements.reduce((sum,x)=>sum+Math.max(0,-Number(x.amount)||0),0);
 const metrics=[['Saldo atual',fmt(s.cash)+' CR'],['Variação do caixa',(delta>=0?'+':'')+fmt(delta)+' CR'],['Receitas registradas',fmt(credits)+' CR'],['Despesas registradas',fmt(debits)+' CR'],['Vendas no turno',String(sales)],['Veículos na loja',String(s.stock.length)]];
 const recorded=credits-debits;
 const difference=Math.round(delta-recorded);
 const audit=Math.abs(difference)>1?'<p class="ae-turn-warning">Atenção: diferença de '+esc(fmt(Math.abs(difference)))+' CR entre o caixa e os lançamentos deste turno. Alguns movimentos podem não estar detalhados no livro-caixa.</p>':'';
 overlay.querySelector('#ae-turn-ledger').innerHTML=movements.slice(0,12).map(x=>'<div class="ae-turn-ledger-row"><span>'+esc(x.name||'Movimentação')+'</span><b>'+((Number(x.amount)||0)>=0?'+':'')+fmt(x.amount)+' CR</b></div>').join('')+(movements.length>12?'<p class="ae-turn-warning">Mostrando os 12 lançamentos mais recentes.</p>':'')+audit+(!movements.length?'<div class="ae-turn-event">Nenhum lançamento financeiro registrado.</div>':'');
 overlay.querySelector('#ae-turn-title').textContent='Dia '+s.day+' concluído';
 overlay.querySelector('#ae-turn-metrics').innerHTML=metrics.map(([k,v])=>'<div class="ae-turn-metric"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></div>').join('');
 overlay.querySelector('#ae-turn-events').innerHTML=recent.map(x=>'<div class="ae-turn-event">'+esc(String(x).replace(/^Dia [0-9]+ · /,''))+'</div>').join('')||'<div class="ae-turn-event">Nenhum acontecimento registrado neste dia.</div>';
 overlay.hidden=false;overlay.querySelector('#ae-turn-continue').focus();
}};
})();