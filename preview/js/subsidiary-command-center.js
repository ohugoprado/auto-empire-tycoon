/* Auto Empire Tycoon — Alpha 10.3: low-click subsidiary operations. */
(function(){
'use strict';
const network=document.getElementById('ae-industrial-network');if(!network)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const inflation=()=>Math.max(1,n(s.empire?.economy?.inflation)||1);
const hiring=()=>Math.round(3500*inflation());
const upgrade=p=>Math.round((80000+n(p.level)*55000)*inflation());
const plants=()=>s?.empire?.economy?.plantNetwork?.plants||[];
const panel=document.createElement('section');panel.id='ae-subsidiary-command';panel.className='panel';
panel.innerHTML='<h3>Gestão centralizada de subsidiárias</h3><p class="tiny">Gerencie várias unidades em uma única operação. Custos são descontados imediatamente; a folha mensal permanece separada.</p><div id="ae-sub-summary"></div><div id="ae-sub-controls"><label>Política de equipes<select id="ae-sub-target"><option value="4">Enxuta · 4 funcionários</option><option value="8">Equilibrada · 8 funcionários</option><option value="12">Expansão · 12 funcionários</option></select></label><label>Unidades<select id="ae-sub-scope"><option value="all">Todas as subsidiárias</option><option value="idle">Somente com linha livre</option></select></label></div><div id="ae-sub-quote"></div><div class="ae-sub-actions"><button id="ae-sub-hire" type="button">Contratar em lote</button><button id="ae-sub-upgrade" type="button">Ampliar em lote</button></div><p class="tiny" id="ae-sub-feedback" role="status"></p>';
network.parentNode.insertBefore(panel,network);
const style=document.createElement('style');style.textContent=`
#ae-subsidiary-command{margin:12px 0;padding:14px;border:1px solid #486777;border-radius:12px;background:#1b3342}
#ae-subsidiary-command h3{font-size:15px;color:#f3d38f;margin:0 0 8px}
#ae-sub-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
#ae-sub-controls label{font-size:12px;color:#d5e5ed}
#ae-sub-controls select{width:100%;min-width:0;min-height:44px;margin-top:5px;background:#243f50;color:#f2f6f8;border:1px solid #577788;border-radius:8px;padding:7px}
#ae-sub-summary,#ae-sub-quote{font-size:12px;line-height:1.6;color:#d2e2eb}
.ae-sub-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ae-sub-actions button{min-height:46px;font-size:12px;white-space:normal}
#ae-sub-feedback{color:#f4d38f}
@media(max-width:420px){#ae-sub-controls,.ae-sub-actions{grid-template-columns:1fr}}
`;document.head.append(style);
function selected(){
 const scope=panel.querySelector('#ae-sub-scope').value;
 const queue=s.empire?.economy?.factory?.queue||[];
 return plants().filter(p=>scope!=='idle'||queue.filter(j=>String(j.plantId)===String(p.id)).length<n(p.level)*2);
}
function quote(){
 const list=selected(),target=n(panel.querySelector('#ae-sub-target').value);
 const hires=list.reduce((sum,p)=>sum+Math.max(0,target-n(p.staff)),0);
 const hireCost=hires*hiring();
 const upgrades=list.filter(p=>n(p.level)<3);
 const upgradeCost=upgrades.reduce((sum,p)=>sum+upgrade(p),0);
 return {list,hires,hireCost,upgrades,upgradeCost,target};
}
function refresh(){
 if(!s?.empire?.economy)return;
 const q=quote(),total=plants().length;
 const payroll=plants().reduce((sum,p)=>sum+n(p.staff)*1100*n(p.level),0);
 panel.querySelector('#ae-sub-summary').textContent=total+' subsidiária(s) · folha mensal '+money(payroll)+' · caixa '+money(s.cash);
 panel.querySelector('#ae-sub-quote').textContent='Contratações necessárias: '+q.hires+' ('+money(q.hireCost)+'). Ampliações possíveis: '+q.upgrades.length+' ('+money(q.upgradeCost)+').';
 const blocked=!!s.empire.economy.bankrupt;
 panel.querySelector('#ae-sub-hire').disabled=blocked||!q.hires||n(s.cash)<q.hireCost;
 panel.querySelector('#ae-sub-upgrade').disabled=blocked||!q.upgrades.length||n(s.cash)<q.upgradeCost;
}
function execute(type){
 const q=quote(),isHire=type==='hire',cost=isHire?q.hireCost:q.upgradeCost,count=isHire?q.hires:q.upgrades.length;
 if(!count||s.empire.economy.bankrupt)return;
 if(n(s.cash)<cost)return toast('Caixa insuficiente para executar o lote.');
 const label=isHire?'contratar '+count+' funcionário(s)':'ampliar '+count+' unidade(s)';
 if(!confirm('Deseja '+label+' por '+money(cost)+'? Esta ação não pode ser desfeita.'))return;
 if(n(s.cash)<cost)return toast('Saldo insuficiente.');
 s.cash-=cost;
 if(isHire)q.list.forEach(p=>p.staff=Math.min(12,Math.max(n(p.staff),q.target)));
 else q.upgrades.forEach(p=>p.level=Math.min(3,n(p.level)+1));
 entry(isHire?'Contratação em lote · subsidiárias':'Expansão em lote · subsidiárias',-cost);
 note('Gestão central: '+label+' por '+money(cost)+'.');
 panel.querySelector('#ae-sub-feedback').textContent='Operação concluída: '+label+'.';
 save();render();refresh();
}
panel.querySelector('#ae-sub-hire').addEventListener('click',()=>execute('hire'));
panel.querySelector('#ae-sub-upgrade').addEventListener('click',()=>execute('upgrade'));
panel.querySelector('#ae-sub-controls').addEventListener('change',refresh);
const prevRender=render;let signature='';
render=function(){prevRender();const next=[s?.cash,s?.day,plants().map(p=>[p.id,p.staff,p.level].join(':')).join('|')].join(';');if(next!==signature){signature=next;refresh();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
