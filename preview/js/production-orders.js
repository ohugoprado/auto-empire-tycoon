/* Auto Empire Tycoon — Alpha 6.3: homologated model production orders. */
(function(){
'use strict';
const studio=document.getElementById('ae-studio');if(!studio)return;
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const css=document.createElement('style');css.textContent=`
#ae-production-dialog{border:1px solid #486779;border-radius:12px;background:#1a3445;padding:12px;margin:12px 0}
#ae-production-dialog h4{margin:0 0 10px;color:#f3d38f}
#ae-production-dialog label{display:block;font-size:12px;margin:9px 0;color:#d0e1ea}
#ae-production-dialog select,#ae-production-dialog input{display:block;width:100%;min-height:44px;margin-top:5px;border-radius:8px}
#ae-production-dialog .ae-production-summary{font-size:12px;line-height:1.7;margin:10px 0}
#ae-production-dialog button{min-height:44px;margin-right:8px}
#ae-production-dialog .ae-production-error{color:#f0a7a7;font-size:12px}
`;document.head.append(css);
function state(){
 const e=s?.empire?.economy,f=e?.factory,designs=e?.studio?.designs;
 return {e,f,designs:Array.isArray(designs)?designs:[],plants:Array.isArray(e?.plantNetwork?.plants)?e.plantNetwork.plants:[]};
}
function options(d){
 const {f,plants}=state();if(!f?.opened)return [];
 return [{id:'main',name:'Fábrica principal',level:Math.max(1,num(f.level)),staff:0,specialty:'Geral'},...plants.map(p=>({id:String(p.id),name:p.name,level:Math.max(1,num(p.level)),staff:Math.max(0,num(p.staff)),specialty:p.specialty||'Geral'}))].filter(p=>p.specialty==='Geral'||p.specialty===d.kind);
}
function getCost(d,p){
 const inflation=Math.max(1,num(state().e?.inflation));
 return p.id==='main'?Math.max(1000,Math.round(num(d.cost))):Math.round(Math.max(1000,num(d.cost))*inflation*(1-Math.min(.12,(p.level-1)*.04+p.staff*.004)));
}
function getDays(d,p){return p.id==='main'?Math.max(2,Math.round(num(d.days)||7)):Math.max(2,Math.round(num(d.days)||7)-p.level+1-Math.floor(p.staff/4));}
function showOrder(id){
 const {designs,f}=state(),d=designs.find(x=>String(x.id)===String(id));
 if(!d)return toast('Projeto não encontrado');
 if(!f?.opened)return toast('Abra sua fabricante antes de produzir');
 const plants=options(d);
 if(!plants.length)return toast('Nenhuma fábrica compatível com o projeto');
 let box=document.getElementById('ae-production-dialog');if(box)box.remove();
 box=document.createElement('div');box.id='ae-production-dialog';
 box.innerHTML='<h4>Ordem de produção · '+esc(d.name)+'</h4><label>Fábrica<select id="ae-order-plant">'+plants.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></label><label>Quantidade<input id="ae-order-quantity" type="number" inputmode="numeric" min="1" max="20" value="1"></label><div class="ae-production-summary" id="ae-order-summary"></div><p class="ae-production-error" id="ae-order-error" role="status"></p><button type="button" id="ae-order-confirm">Confirmar produção</button><button type="button" id="ae-order-cancel">Cancelar</button>';
 const saved=studio.querySelector('#ae-studio-saved');saved?.parentNode.insertBefore(box,saved);
 const select=box.querySelector('#ae-order-plant'),quantity=box.querySelector('#ae-order-quantity');
 function quote(){
  const p=plants.find(x=>x.id===select.value)||plants[0];
  const q=Number(quantity.value);
  const {f}=state(),queue=f?.queue||[];
  const used=queue.filter(j=>p.id==='main'?!j.plantId:String(j.plantId)===p.id).length;
  const capacity=p.level*2,free=Math.max(0,capacity-used);
  const storage=Math.max(0,num(s.slots)-s.stock.length-queue.length);
  const valid=Number.isInteger(q)&&q>=1&&q<=20;
  const cost=getCost(d,p),days=getDays(d,p);
  const error=!valid?'Escolha de 1 a 20 unidades.':q>free?'A fábrica tem apenas '+free+' linha(s) disponível(is).':q>storage?'Estoque suporta apenas '+storage+' unidade(s) adicional(is).':q*cost>s.cash?'Caixa insuficiente para esta quantidade.':'';
  box.querySelector('#ae-order-summary').textContent='Custo unitário: '+money(cost)+' · Total: '+money(q*cost)+' · Prazo: '+days+' dias · Linhas livres: '+free+' · Vagas disponíveis: '+storage;
  box.querySelector('#ae-order-error').textContent=error;
  box.querySelector('#ae-order-confirm').disabled=!!error;
  return {p,q,cost,days,error};
 }
 select.addEventListener('change',quote);quantity.addEventListener('input',quote);
 box.querySelector('#ae-order-cancel').addEventListener('click',()=>box.remove());
 box.querySelector('#ae-order-confirm').addEventListener('click',()=>{
  const {p,q,cost,days,error}=quote();if(error)return;
  const crisis=window.AEEconomy?.crisisFor?.(s.empire.world?.active);
  if(crisis?.id==='war'||crisis?.id==='supply')return toast('Produção bloqueada: '+crisis.name);
  if(!confirm('Produzir '+q+' unidade(s) de '+d.name+' em '+p.name+' por '+money(q*cost)+'?'))return;
  const {f,e}=state();if(!f?.opened||s.cash<q*cost)return toast('Produção indisponível');
  s.cash-=q*cost;entry('Lote de produção · '+d.name+' · '+p.name,-q*cost);
  const supplier=window.AEOperations?.getSupplier?.().id||'standard';
  for(let i=0;i<q;i++)f.queue.push({...(p.id==='main'?{}:{plantId:p.id}),model:d.name,kind:d.kind,cost,value:p.id==='main'?num(d.value):Math.max(cost,Math.round(num(d.value)*Math.max(1,num(e.inflation)))),due:s.day+days,designId:d.id,quality:d.quality,supplier});
  f.model=d.name;note('Produção iniciada: '+q+' unidade(s) de '+d.name+' em '+p.name+'.');save();render();box.remove();toast('Lote enviado para produção!');
 });
 quote();box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
studio.addEventListener('click',event=>{
 const btn=event.target.closest('[data-ae-order]');if(!btn)return;
 event.preventDefault();event.stopPropagation();showOrder(btn.dataset.aeOrder);
});
function refreshButtons(){
 const list=studio.querySelector('#ae-studio-saved');if(!list)return;
 list.querySelectorAll('.ae-studio-item').forEach(item=>{
  const select=item.querySelector('[data-design-id]');if(!select)return;
  if(item.querySelector('[data-ae-order]'))return;
  const btn=document.createElement('button');btn.type='button';btn.textContent='Produzir';btn.dataset.aeOrder=select.dataset.designId;
  select.after(btn);
 });
}
const observer=new MutationObserver(refreshButtons);
const list=studio.querySelector('#ae-studio-saved');if(list)observer.observe(list,{childList:true});
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refreshButtons);
refreshButtons();
})();
