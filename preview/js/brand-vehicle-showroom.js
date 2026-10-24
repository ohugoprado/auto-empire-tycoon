/* Auto Empire Tycoon — Alpha 10.9: three-angle brand vehicle showroom. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=x=>/^#[0-9a-f]{6}$/i.test(x)?x:'#287ec5';
const box=document.createElement('section');box.id='ae-brand-showroom';box.hidden=true;
box.innerHTML='<h3>Showroom da fabricante</h3><p class="tiny">Visualize a identidade da sua marca na dianteira, traseira e no volante dos carros próprios. Ilustrações conceituais, não sprites finais.</p><label>Modelo <select id="ae-showroom-model"></select></label><div class="ae-showroom-tabs"><button type="button" data-view="front">Dianteira</button><button type="button" data-view="rear">Traseira</button><button type="button" data-view="interior">Interior</button></div><div id="ae-showroom-stage"></div><div id="ae-showroom-custom" class="ae-showroom-custom"><h4>Ateliê de design</h4><p class="tiny">Componentes avançados exigem pesquisa concluída. A configuração pode ser aplicada ao projeto de fábrica para todas as próximas unidades.</p><label>Faróis<select data-part="lights"><option value="standard">Clássicos</option><option value="led" data-requires="tech">LED matriciais</option><option value="sport" data-requires="performance">Esportivos</option></select></label><label>Grade<select data-part="grille"><option value="standard">Tradicional</option><option value="aero" data-requires="aero">Aerodinâmica</option><option value="premium" data-requires="luxury">Premium</option></select></label><label>Interior<select data-part="cabin"><option value="standard">Essencial</option><option value="premium" data-requires="comfort">Premium</option><option value="digital" data-requires="tech">Digital</option></select></label><button type="button" id="ae-showroom-save">Salvar neste veículo</button><button type="button" id="ae-showroom-blueprint">Aplicar ao projeto e próximas unidades</button></div><p id="ae-showroom-note" class="tiny"></p>';
const anchor=document.getElementById('ae-brand-network');if(anchor?.parentNode)anchor.after(box);else garage.append(box);
const style=document.createElement('style');style.textContent=`
#ae-brand-showroom{background:#172f3d;border:1px solid #526f80;border-radius:12px;padding:13px;margin:12px 0}
#ae-brand-showroom h3{font-size:15px;color:#f3d08a;margin:0 0 7px}
#ae-brand-showroom label{font-size:12px;display:block;margin:10px 0}
#ae-brand-showroom select{display:block;width:100%;min-height:44px;background:#233f50;color:white;border:1px solid #688697;border-radius:8px;padding:8px;margin-top:5px}
.ae-showroom-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:10px 0}
.ae-showroom-tabs button{min-height:44px;font-size:12px}
.ae-showroom-tabs button[aria-pressed=true]{border:2px solid #f1cf84;background:#35556a;color:#fff}
#ae-showroom-stage{background:radial-gradient(ellipse at 50% 60%,#385568,#10222e 72%);border-radius:10px;padding:8px;min-height:190px;display:grid;place-items:center}
#ae-showroom-stage svg{width:100%;max-width:420px;height:auto;display:block}
 .ae-showroom-custom{margin-top:12px;padding:10px;border:1px solid #4b6c7c;border-radius:9px}.ae-showroom-custom h4{margin:0 0 8px}.ae-showroom-custom label{margin:7px 0}.ae-showroom-custom button{min-height:44px;width:100%;margin-top:9px}#ae-showroom-blueprint{background:#315f68;border:1px solid #8bc3bd}
`;document.head.append(style);
const select=box.querySelector('#ae-showroom-model'),stage=box.querySelector('#ae-showroom-stage');let view='front',signature='',chosen='';
const badge=(x,y,size,logo)=>{
 if(!logo)return '';
 const inner=logo.replace(/^<svg[^>]*>/,'').replace('</svg>','');
 return '<svg x="'+x+'" y="'+y+'" width="'+size+'" height="'+size+'" viewBox="0 0 160 160" aria-hidden="true">'+inner+'</svg>';
};
function illustration(car,logo){
 const paint=valid(car?.color),metal='#b7cbd3',glass='#182e3e',parts=car?.brandParts||{};
 const base='<ellipse cx="200" cy="203" rx="147" ry="13" fill="#07151f" opacity=".65"/>';
 let body='';
 if(view==='front'){
  body='<path d="M62 135 L79 84 Q100 51 200 49 Q300 51 321 84 L338 135 L339 174 Q325 187 75 187 L61 174 Z" fill="'+paint+'" stroke="'+metal+'" stroke-width="3"/><path d="M109 86 Q132 58 200 58 Q268 58 291 86 L305 118 L95 118 Z" fill="'+glass+'" stroke="'+metal+'" stroke-width="3"/><path d="M83 130 L144 138 L133 151 L79 146 Z M317 130 L256 138 L267 151 L321 146 Z" fill="#e8f5ff"/><rect x="137" y="149" width="126" height="27" rx="8" fill="#101b23" stroke="'+metal+'" stroke-width="2"/><path d="M150 158 H250 M150 166 H250" stroke="#55707c" stroke-width="3"/>'+(parts.lights==='led'?'<path d="M80 134 L145 142 M255 142 L320 134" stroke="#aaf5ff" stroke-width="5"/>':parts.lights==='sport'?'<path d="M82 138 L140 143 M260 143 L318 138" stroke="#ffb85d" stroke-width="5"/>':'')+(parts.grille==='aero'?'<path d="M146 156 H254 M146 164 H254 M146 172 H254" stroke="#9dbbc6" stroke-width="3"/>':parts.grille==='premium'?'<path d="M158 151 V174 M175 151 V174 M192 151 V174 M209 151 V174 M226 151 V174 M243 151 V174" stroke="#d8c58b" stroke-width="3"/>':'')+badge(183,130,34,logo);
 }else if(view==='rear'){
  body='<path d="M63 138 L84 81 Q110 54 200 52 Q290 54 316 81 L337 138 L333 180 Q200 191 67 180 Z" fill="'+paint+'" stroke="'+metal+'" stroke-width="3"/><path d="M112 88 Q144 65 200 65 Q256 65 288 88 L301 121 L99 121 Z" fill="'+glass+'" stroke="'+metal+'" stroke-width="3"/><path d="M78 133 H157 L143 150 H80 Z M322 133 H243 L257 150 H320 Z" fill="#fa4148"/><rect x="162" y="159" width="76" height="19" rx="4" fill="#101c28" stroke="#9aadb6"/>'+badge(185,125,30,logo);
 }else{
  body='<path d="M46 80 Q200 22 354 80 L343 178 H57 Z" fill="#273b4b" stroke="'+metal+'" stroke-width="4"/><path d="M71 90 Q200 45 329 90 L314 122 H86 Z" fill="'+glass+'"/><rect x="173" y="83" width="54" height="33" rx="5" fill="#0c1822" stroke="#8babb9"/><circle cx="200" cy="150" r="48" fill="#111e29" stroke="#aebec5" stroke-width="12"/><circle cx="200" cy="150" r="27" fill="#344958" stroke="#708d9c" stroke-width="2"/><path d="M154 144 L177 150 M223 150 L246 144 M200 178 V194" stroke="#aebec5" stroke-width="10"/>'+(parts.cabin==='digital'?'<rect x="180" y="88" width="40" height="21" rx="3" fill="#4fc3d7"/>':parts.cabin==='premium'?'<path d="M65 151 Q92 135 117 151 M283 151 Q308 135 335 151" stroke="#e6c88e" stroke-width="6"/>':'')+badge(185,135,30,logo);
 }
 return '<svg viewBox="0 0 400 220" role="img" aria-label="Vista conceitual '+(view==='front'?'dianteira':view==='rear'?'traseira':'interior')+' de '+esc(car?.name||'veículo')+'">'+base+body+'</svg>';
}
function refresh(){
 const f=s?.empire?.economy?.factory,items=(s?.stock||[]).filter(c=>c.manufactured);
 if(!f?.opened||!f.logo){box.hidden=true;return}
 box.hidden=false;
 const previous=select.value||chosen;
 select.innerHTML=items.map(c=>'<option value="'+Number(c.id)+'">'+esc(c.name)+'</option>').join('');
 if(items.some(c=>String(c.id)===String(previous)))select.value=String(previous);
 chosen=select.value;
 const car=items.find(c=>String(c.id)===String(chosen));
 box.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 if(!car){stage.innerHTML='<p>Nenhum veículo próprio em estoque. Produza um carro para abrir o showroom.</p>';box.querySelector('#ae-showroom-note').textContent='';return}
 const tech=s?.empire?.economy?.brandTechnology?.unlocked||[];
 box.querySelector('#ae-showroom-blueprint').disabled=!car.designId;
 box.querySelectorAll('[data-part]').forEach(field=>{
  for(const option of field.options){const req=option.dataset.requires;option.disabled=!!req&&!tech.includes(req);}
  const selected=car.brandParts?.[field.dataset.part]||'standard';field.value=Array.from(field.options).some(o=>o.value===selected&&!o.disabled)?selected:'standard';
 });
 const logo=window.AECompanyEmblem?.svg?.(f.logo)||'';
 stage.innerHTML=illustration(car,logo);
 box.querySelector('#ae-showroom-note').textContent=car.name+' · '+(car.colorName||'Pintura personalizada')+' · vista '+({front:'dianteira',rear:'traseira',interior:'interior'}[view])+'.';
}
box.addEventListener('click',e=>{const btn=e.target.closest('[data-view]');if(!btn)return;view=btn.dataset.view;refresh()});
select.addEventListener('change',()=>{chosen=select.value;refresh()});
function selectedParts(){
 const tech=s?.empire?.economy?.brandTechnology?.unlocked||[],parts={};
 for(const field of box.querySelectorAll('[data-part]')){
  const opt=field.selectedOptions[0];if(opt?.dataset.requires&&!tech.includes(opt.dataset.requires))return null;
  parts[field.dataset.part]=field.value;
 }
 return parts;
}
box.querySelector('#ae-showroom-save').addEventListener('click',()=>{
 const car=(s?.stock||[]).find(c=>c.manufactured&&String(c.id)===String(select.value));if(!car)return;
 const parts=selectedParts();if(!parts)return toast('Tecnologia ainda não pesquisada.');
 car.brandParts=parts;save();refresh();toast('Design da carroceria atualizado.');
});
box.querySelector('#ae-showroom-blueprint').addEventListener('click',()=>{
 const car=(s?.stock||[]).find(c=>c.manufactured&&String(c.id)===String(select.value));
 const designs=s?.empire?.economy?.studio?.designs||[];
 const design=designs.find(d=>String(d.id)===String(car?.designId));
 if(!car||!design)return toast('Este veículo não está vinculado a um projeto homologado.');
 const parts=selectedParts();if(!parts)return toast('Pesquise as tecnologias necessárias.');
 if(!confirm('Aplicar este design ao projeto '+design.name+'? As próximas unidades serão produzidas com esses componentes.'))return;
 design.brandParts={...parts};car.brandParts={...parts};
 save();refresh();toast('Projeto atualizado para as próximas produções.');
});
const oldRender=render;render=function(){const result=oldRender.apply(this,arguments);const f=s?.empire?.economy?.factory;const next=[f?.opened,JSON.stringify(f?.logo),(s?.stock||[]).filter(c=>c.manufactured).map(c=>[c.id,c.name,c.color,JSON.stringify(c.brandParts)].join(':')).join('|')].join(';');if(next!==signature){signature=next;refresh()}return result;};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
