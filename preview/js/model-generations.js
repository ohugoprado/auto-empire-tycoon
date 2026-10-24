/* Auto Empire Tycoon — Alpha 11.2: homologated model generations and facelifts. */
(function(){
'use strict';
const studio=document.getElementById('ae-studio');if(!studio)return;
const money=n=>Math.round(n).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const panel=document.createElement('section');panel.id='ae-generations';
panel.innerHTML='<h3>Ciclo de vida dos modelos</h3><p class="tiny">Reestilize projetos homologados ou lance uma nova geração. As mudanças só afetam produções futuras.</p><label>Projeto<select id="ae-gen-model"></select></label><div id="ae-gen-status"></div><div class="ae-gen-actions"><button type="button" data-gen="facelift">Investir em facelift</button><button type="button" data-gen="generation">Desenvolver nova geração</button></div>';
studio.append(panel);
const css=document.createElement('style');css.textContent=`
#ae-generations{margin:12px 0;padding:12px;border:1px solid #536f7f;border-radius:11px;background:#1b3746}
#ae-generations h3{font-size:15px;color:#f1d291;margin:0 0 8px}
#ae-generations label{font-size:12px;display:block;margin:10px 0}
#ae-gen-model{display:block;width:100%;min-height:44px;background:#274657;color:white;border:1px solid #688697;border-radius:8px;margin-top:5px}
#ae-gen-status{font-size:12px;line-height:1.6;color:#d3e0e8}
.ae-gen-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.ae-gen-actions button{min-height:48px;font-size:12px}
@media(max-width:390px){.ae-gen-actions{grid-template-columns:1fr}}
`;document.head.append(css);
const select=panel.querySelector('#ae-gen-model'),status=panel.querySelector('#ae-gen-status');
const designs=()=>s?.empire?.economy?.studio?.designs||[];
const get=()=>designs().find(d=>String(d.id)===select.value);
const stage=d=>({generation:Math.max(1,Math.floor(Number(d.generation)||1)),facelift:Math.max(0,Math.floor(Number(d.facelift)||0)),introduced:Number(d.introducedDay)||Number(d.createdDay)||1});
const quote=(d,action)=>{
 const inflation=Math.max(1,Number(s?.empire?.economy?.inflation)||1);
 const diff=({casual:.7,normal:1,hard:1.55})[s?.difficulty]||1;
 const base=Math.max(50000,Number(d.cost||0)*4);
 return Math.ceil(base*(action==='generation'?5:1.5)*inflation*diff/1000)*1000;
};
function refresh(){
 const list=designs(),previous=select.value;
 select.innerHTML=list.map(d=>'<option value="'+Number(d.id)+'">'+esc(d.name)+'</option>').join('');
 if(list.some(d=>String(d.id)===previous))select.value=previous;
 panel.hidden=!s?.empire?.economy?.factory?.opened||!list.length;
 const d=get();if(!d)return;
 const st=stage(d),days=Math.max(0,Number(s.day)-st.introduced);
 const faceliftCost=quote(d,'facelift'),genCost=quote(d,'generation');
 status.textContent='Geração '+st.generation+' · Facelift '+st.facelift+' · '+days+' dias no mercado · Investimento em facelift: '+money(faceliftCost)+' · Nova geração: '+money(genCost)+'.';
 panel.querySelector('[data-gen="facelift"]').disabled=Number(s.cash)<faceliftCost||!!s?.empire?.economy?.bankrupt;
 panel.querySelector('[data-gen="generation"]').disabled=Number(s.cash)<genCost||!!s?.empire?.economy?.bankrupt;
}
panel.addEventListener('change',refresh);
panel.addEventListener('click',e=>{
 const action=e.target.closest('[data-gen]')?.dataset.gen;if(!action)return;
 const d=get();if(!d||!s?.empire?.economy?.factory?.opened||s?.empire?.economy?.bankrupt)return;
 const price=quote(d,action);if(Number(s.cash)<price)return toast('Caixa insuficiente.');
 const st=stage(d);
 if(action==='facelift'&&st.facelift>=2)return toast('Esta geração já recebeu dois facelifts. Desenvolva uma nova geração.');
 const title=action==='facelift'?'facelift':'nova geração';
 if(!confirm('Investir '+money(price)+' em '+title+' para '+d.name+'? As ordens já abertas não serão alteradas.'))return;
 s.cash-=price;entry('Desenvolvimento '+title+' · '+d.name,-price);
 if(action==='facelift')d.facelift=st.facelift+1;
 else{d.generation=st.generation+1;d.facelift=0;d.introducedDay=s.day;}
 if(!d.introducedDay)d.introducedDay=s.day;
 d.lifecycleSpent=(Number(d.lifecycleSpent)||0)+price;
 // Design refresh creates a modest, capped market-position benefit without
 // rewriting the original engineering or changing already queued cars.
 const bonus=action==='generation'?.06:.025;
 d.lifecycleBonus=Math.min(.2,(Number(d.lifecycleBonus)||0)+bonus);
 if(action==='facelift')d.introducedDay=s.day;
 note(d.name+' recebeu '+title+' e entra em uma nova fase comercial.');
 save();render();refresh();toast('Projeto atualizado. Próximas ordens receberão a revisão.');
});
const prior=render;let sig='';
render=function(){const out=prior.apply(this,arguments);const next=[s?.empire?.economy?.factory?.opened,s?.cash,s?.day,designs().map(d=>[d.id,d.generation,d.facelift].join(':')).join('|')].join(';');if(next!==sig){sig=next;refresh()}return out;};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
