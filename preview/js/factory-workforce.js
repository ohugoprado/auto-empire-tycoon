/* Alpha 12.1 — factory workforce controls */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
const panel=document.createElement('section');panel.id='ae-workforce';panel.className='panel';
panel.innerHTML='<h3>Funcionários e turnos</h3><p class="tiny">Cada linha exige 3 funcionários em cada turno. O segundo turno aumenta a capacidade de montagem, mas eleva os salários. Alterações passam a valer nos próximos dias.</p><div id="ae-workforce-plants"></div>';
(document.getElementById('ae-industrial-dashboard')||garage).after(panel);
const css=document.createElement('style');css.textContent='#ae-workforce{margin:12px 0;padding:13px}#ae-workforce h3{font-size:15px;color:#f3d28e}.ae-workforce-unit{padding:10px;border-top:1px solid #456070}.ae-workforce-unit label{display:block;font-size:12px;margin:8px 0}.ae-workforce-unit input,.ae-workforce-unit select{min-height:44px;max-width:100%;width:100%;border-radius:8px;background:#20384b;color:#fff;padding:8px}.ae-workforce-unit button{min-height:44px;margin-top:6px}';document.head.append(css);
function plants(){const e=s?.empire?.economy;return e?.factory?.opened?[{id:'main',name:'Fábrica principal',ref:e.factory},...(e.plantNetwork?.plants||[]).map(p=>({id:String(p.id),name:p.name||'Fábrica',ref:p}))]:[]}
function refresh(){
 const list=plants();panel.hidden=!list.length;
 panel.querySelector('#ae-workforce-plants').innerHTML=list.map(({id,name,ref})=>{
 const base=Math.max(1,Number(ref.level)||1)*2;
 const w=ref.workforce||{staff:base*3,shift:1};
 const staff=Math.max(0,Number(w.staff)||0),shift=Number(w.shift)===2?2:1;
 const lines=Math.min(base*2,Math.floor(staff/(3*shift))*shift);
 const daily=Math.round(staff*(shift===2?115:90)*Math.max(1,Number(s.empire.economy.inflation)||1));
 return '<div class="ae-workforce-unit"><b>'+esc(name)+'</b><p class="tiny">Capacidade: '+lines+' linhas · Folha diária: '+daily.toLocaleString('pt-BR')+' CR</p><label>Funcionários<input type="number" min="0" max="500" step="1" value="'+staff+'" data-staff="'+esc(id)+'"></label><label>Turnos<select data-shift="'+esc(id)+'"><option value="1"'+(shift===1?' selected':'')+'>1 turno</option><option value="2"'+(shift===2?' selected':'')+'>2 turnos</option></select></label><button type="button" data-apply="'+esc(id)+'">Aplicar quadro de pessoal</button></div>';
 }).join('');
}
panel.addEventListener('click',ev=>{
 const btn=ev.target.closest('[data-apply]');if(!btn)return;
 const p=plants().find(x=>x.id===btn.dataset.apply);if(!p)return;
 const staff=Number(panel.querySelector('[data-staff="'+p.id+'"]')?.value),shift=Number(panel.querySelector('[data-shift="'+p.id+'"]')?.value);
 if(!Number.isInteger(staff)||staff<0||staff>500||![1,2].includes(shift))return toast('Informe de 0 a 500 funcionários e 1 ou 2 turnos.');
 const old=p.ref.workforce||{staff:Math.max(1,Number(p.ref.level)||1)*6,shift:1};
 const added=Math.max(0,staff-(Number(old.staff)||0));
 const hiring=added*350;
 if(s.cash<hiring)return toast('Caixa insuficiente para contratação.');
 if(!confirm('Aplicar '+staff+' funcionários e '+shift+' turno(s)? Custo de contratação: '+hiring.toLocaleString('pt-BR')+' CR.'))return;
 if(hiring){s.cash-=hiring;entry('Contratação industrial',-hiring);}
 p.ref.workforce={staff,shift};note('Equipe industrial atualizada em '+p.name+'.');save();render();refresh();
});
const previousRender=render;let key='';
render=function(){const result=previousRender.apply(this,arguments);const next=[s?.day,s?.empire?.economy?.factory?.opened,plants().map(p=>[p.id,p.ref.level,p.ref.workforce?.staff,p.ref.workforce?.shift].join(':')).join('|')].join(';');if(next!==key){key=next;refresh()}return result};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);refresh();
})();