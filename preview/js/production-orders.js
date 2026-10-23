/* Auto Empire Tycoon — Alpha 6.4: paint variants and production batches. */
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
#ae-production-dialog .ae-paint-preview{display:flex;align-items:center;gap:8px;font-size:12px;margin:9px 0}
#ae-production-dialog .ae-paint-preview i{width:24px;height:24px;border-radius:50%;border:2px solid #aabcc8;display:inline-block}
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
const paints=window.AESprites?.paints.map(paint=>[paint.name,paint.hex])||[['Branco Polar','#e7ebef'],['Azul Oceano','#287ec5'],['Vermelho Rubi','#c33d42'],['Grafite','#333d4a'],['Amarelo Solar','#e9b847']];
function showOrder(id){
 const {designs,f,e}=state(),d=designs.find(x=>String(x.id)===String(id));
 if(!d)return toast('Projeto não encontrado');
 if(d.retired)return toast('Projeto retirado de linha. Reative no painel de inteligência de mercado.');
 if(!f?.opened){window.AEManagement?.openArea('factory','fold-ae-economy');return toast('Abra sua fabricante na seção Fundação e gestão da fabricante. Seu projeto homologado continua salvo.');}
 if(e?.bankrupt)return toast('Produção indisponível: empresa falida.');
 const plants=options(d);
 if(!plants.length)return toast('Nenhuma fábrica compatível com o projeto');
 let box=document.getElementById('ae-production-dialog');if(box)box.remove();
 box=document.createElement('div');box.id='ae-production-dialog';
 box.innerHTML='<h4>Ordem de produção · '+esc(d.name)+'</h4><label>Fábrica<select id="ae-order-plant">'+plants.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+'</option>').join('')+'</select></label><label>Pintura<select id="ae-order-paint"><option value="mixed">Cores variadas no lote</option>'+paints.map((p,i)=>'<option value="'+i+'">'+esc(p[0])+'</option>').join('')+'</select></label><div class="ae-paint-preview" id="ae-order-paint-preview"></div><label>Quantidade<input id="ae-order-quantity" type="number" inputmode="numeric" min="1" max="50" value="5"></label><div class="ae-production-summary" id="ae-order-summary"></div><p class="ae-production-error" id="ae-order-error" role="status"></p><button type="button" id="ae-order-confirm">Confirmar produção</button><button type="button" id="ae-order-cancel">Cancelar</button>';
 const saved=studio.querySelector('#ae-studio-saved');saved?.parentNode.insertBefore(box,saved);
 const select=box.querySelector('#ae-order-plant'),quantity=box.querySelector('#ae-order-quantity'),paint=box.querySelector('#ae-order-paint');
 function quote(){
  const p=plants.find(x=>x.id===select.value)||plants[0];
  const chosen=paints[Number(paint.value)]||null;
  box.querySelector('#ae-order-paint-preview').innerHTML=chosen?'<i style="background:'+chosen[1]+'"></i>'+esc(chosen[0]):'Cada unidade receberá uma pintura diferente, conforme disponibilidade.';
  const q=Number(quantity.value);
  const {f,e}=state(),queue=f?.queue||[];
  const used=queue.filter(j=>p.id==='main'?!j.plantId:String(j.plantId)===p.id).length;
  const capacity=p.level*2,free=Math.max(0,capacity-used);
  const storage=Math.max(0,num(s.slots)-s.stock.length-queue.length);
  const valid=Number.isInteger(q)&&q>=1&&q<=50;
  const cost=getCost(d,p),days=getDays(d,p);
  const crisis=window.AEEconomy?.crisisFor?.(s.empire.world?.active);
  const error=e?.bankrupt?'Produção indisponível: empresa falida.':!f?.opened?'Abra sua fabricante antes de produzir.':crisis?.id==='war'||crisis?.id==='supply'?'Produção bloqueada: '+crisis.name:!valid?'Escolha de 1 a 50 unidades.':q>free?'A fábrica tem apenas '+free+' linha(s) disponível(is).':q>storage?'Estoque suporta apenas '+storage+' unidade(s) adicional(is).':q*cost>s.cash?'Caixa insuficiente para esta quantidade.':'';
  box.querySelector('#ae-order-summary').textContent='Custo unitário: '+money(cost)+' · Total: '+money(q*cost)+' · Prazo: '+days+' dias · Linhas livres: '+free+' · Vagas disponíveis: '+storage;
  box.querySelector('#ae-order-error').textContent=error;
  box.querySelector('#ae-order-confirm').disabled=!!error;
  return {p,q,cost,days,error};
 }
 select.addEventListener('change',quote);quantity.addEventListener('input',quote);paint.addEventListener('change',quote);
 box.querySelector('#ae-order-cancel').addEventListener('click',()=>box.remove());
 box.querySelector('#ae-order-confirm').addEventListener('click',()=>{
  const {p,q,cost,days,error}=quote();if(error)return;
  const crisis=window.AEEconomy?.crisisFor?.(s.empire.world?.active);
  if(crisis?.id==='war'||crisis?.id==='supply')return toast('Produção bloqueada: '+crisis.name);
  if(!confirm('Produzir '+q+' unidade(s) de '+d.name+' em '+p.name+' por '+money(q*cost)+'?'))return;
  const {f,e}=state();if(!f?.opened||s.cash<q*cost)return toast('Produção indisponível');
  s.cash-=q*cost;entry('Lote de produção · '+d.name+' · '+p.name,-q*cost);
  const supplier=window.AEOperations?.getSupplier?.().id||'standard';
  for(let i=0;i<q;i++){const chosen=paints[paint.value==='mixed'?(i+Math.floor(Math.random()*paints.length))%paints.length:Number(paint.value)]||paints[0];f.queue.push({color:chosen[1],colorName:chosen[0],...(p.id==='main'?{}:{plantId:p.id}),model:d.name,kind:d.kind,cost,value:p.id==='main'?num(d.value):Math.max(cost,Math.round(num(d.value)*Math.max(1,num(e.inflation)))),due:s.day+days,designId:d.id,generation:d.generation||1,facelift:d.facelift||0,modelIntroducedDay:d.introducedDay||s.day,lifecycleBonus:(d.lifecycleBonus||0)+(d.mediaBonus||0),brandParts:d.brandParts?{...d.brandParts}:undefined,quality:d.quality,supplier});}
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
window.AEProductionOrders=Object.freeze({showOrder});
})();
