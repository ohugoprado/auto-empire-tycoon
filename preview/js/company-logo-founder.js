/* Auto Empire Tycoon — Alpha 10.4: interactive company emblem founder. */
(function(){
'use strict';
const host=document.getElementById('ae-economy');if(!host)return;
const themes={shield:'Escudo',circle:'Selo circular',hex:'Hexágono',diamond:'Losango',crest:'Brasão',plate:'Placa esportiva'};
const marks={bolt:'Raio',wing:'Asas',star:'Estrela',road:'Estrada',crown:'Coroa',mountain:'Montanhas',compass:'Rosa dos ventos',falcon:'Falcão'};
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const color=x=>/^#[0-9a-fA-F]{6}$/.test(x)?x:'#2563a0';
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const state=()=>s?.empire?.economy?.factory;
const cost=()=>Math.round(110000*Math.max(1,num(s?.empire?.economy?.inflation)||1));
const panel=document.createElement('section');panel.id='ae-company-logo';panel.hidden=true;
panel.innerHTML='<h3>Crie a identidade da fabricante</h3><p class="tiny">Personalize o emblema antes de fundar a empresa. A marca ficará salva na campanha.</p><div class="ae-logo-fields"><label>Nome da empresa<input id="ae-logo-name" maxlength="24" value="Empire Motors"></label><label>Formato<select id="ae-logo-shape"></select></label><label>Símbolo<select id="ae-logo-mark"></select></label><label>Cor principal<input type="color" id="ae-logo-color" value="#2563a0"></label><label>Cor de destaque<input type="color" id="ae-logo-accent" value="#f0c77c"></label><label>Iniciais<input id="ae-logo-letters" maxlength="3" value="EM"></label><label>Acabamento<select id="ae-logo-finish"><option value="metal">Metálico</option><option value="matte">Fosco</option><option value="carbon">Carbono</option></select></label></div><div id="ae-logo-preview"></div><p id="ae-logo-cost" class="tiny"></p><div class="ae-logo-actions"><button id="ae-logo-confirm" type="button">Fundar com esta marca</button><button id="ae-logo-cancel" type="button" class="ghost">Cancelar</button></div>';
host.prepend(panel);
const style=document.createElement('style');style.textContent=`
#ae-company-logo{padding:14px;border:1px solid #567688;border-radius:12px;background:#1a3545;margin-bottom:12px}
#ae-company-logo h3{font-size:16px;color:#f4d28b;margin:0 0 8px}
.ae-logo-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.ae-logo-fields label{font-size:12px;display:flex;flex-direction:column;gap:5px;min-width:0}
.ae-logo-fields input,.ae-logo-fields select{width:100%;box-sizing:border-box;min-height:44px;background:#233e50;color:#f4f6f8;border:1px solid #5b7c8d;border-radius:8px;padding:7px}
.ae-logo-fields input[type=color]{padding:3px}
#ae-logo-preview{display:flex;align-items:center;justify-content:center;min-height:165px;margin:12px 0;border-radius:12px;background:#0e2532}
#ae-logo-preview svg{width:180px;height:180px;filter:drop-shadow(0 12px 18px rgba(0,0,0,.48))}
.ae-logo-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ae-logo-actions button{min-height:46px}
#ae-logo-saved{display:flex;align-items:center;gap:10px;margin:8px 0;padding:8px;border-radius:10px;background:#203b4b;font-size:12px}
#ae-logo-saved svg{width:60px;height:60px;flex:none}#ae-logo-edit{min-height:40px;margin-top:8px;font-size:12px}
@media(max-width:420px){.ae-logo-fields{grid-template-columns:1fr 1fr}.ae-logo-actions{grid-template-columns:1fr}}
`;document.head.append(style);
for(const [id,name] of Object.entries(themes)){const o=document.createElement('option');o.value=id;o.textContent=name;panel.querySelector('#ae-logo-shape').append(o)}
for(const [id,name] of Object.entries(marks)){const o=document.createElement('option');o.value=id;o.textContent=name;panel.querySelector('#ae-logo-mark').append(o)}
const field=id=>panel.querySelector('#ae-logo-'+id);
let editing=false;
function openEditor(edit){
 const f=state();editing=!!edit;
 const logo=f?.logo||{};
 field('name').value=edit?(f.brand||'Empire Motors'):(f?.brand||'Empire Motors');
 for(const [id,key] of [['shape','shape'],['mark','mark'],['color','primary'],['accent','accent'],['letters','letters'],['finish','finish']]){
  if(logo[key]!==undefined)field(id).value=logo[key];
 }
 field('name').disabled=editing;
 panel.querySelector('#ae-logo-confirm').textContent=editing?'Salvar novo emblema':'Fundar com esta marca';
 panel.querySelector('h3').textContent=editing?'Redesenhar emblema da fabricante':'Crie a identidade da fabricante';
 panel.hidden=false;refresh();panel.scrollIntoView({block:'start',behavior:'smooth'});
}
function values(){return {shape:themes[field('shape').value]?field('shape').value:'shield',mark:marks[field('mark').value]?field('mark').value:'bolt',primary:color(field('color').value),accent:color(field('accent').value),letters:field('letters').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3),finish:field('finish').value}}
function svg(v){
 const shapes={
 shield:'M80 11 L139 31 L134 102 Q122 139 80 153 Q38 139 26 102 L21 31 Z',
 circle:'M80 10 A70 70 0 1 1 79.99 10 Z',
 hex:'M80 10 L139 44 L139 116 L80 150 L21 116 L21 44 Z',
 diamond:'M80 10 L150 80 L80 150 L10 80 Z',
 crest:'M26 18 L134 18 L140 92 Q130 133 80 153 Q30 133 20 92 Z',
 plate:'M24 28 Q80 10 136 28 L145 80 L136 132 Q80 150 24 132 L15 80 Z'
 };
 const symbols={
 bolt:'M90 34 L53 87 L77 87 L69 126 L111 67 L85 67 Z',
 wing:'M17 58 L63 76 L80 65 L97 76 L143 58 L124 91 L99 102 L80 89 L61 102 L36 91 Z',
 star:'M80 35 L92 65 L125 65 L98 85 L108 117 L80 98 L52 117 L62 85 L35 65 L68 65 Z',
 road:'M68 35 L92 35 L117 124 L94 124 L86 95 L74 95 L66 124 L43 124 Z',
 crown:'M35 66 L54 86 L80 49 L106 86 L125 66 L114 111 L46 111 Z',
 mountain:'M24 113 L65 53 L83 79 L99 58 L137 113 Z',
 compass:'M80 28 L91 69 L132 80 L91 91 L80 132 L69 91 L28 80 L69 69 Z',
 falcon:'M20 67 Q45 47 76 71 L80 47 L84 71 Q115 47 140 67 L111 96 L91 90 L80 113 L69 90 L49 96 Z'
 };
 const shape=shapes[v.shape]||shapes.shield,mark=symbols[v.mark]||symbols.wing;
 const primary=color(v.primary),accent=color(v.accent);
 const finish=['metal','matte','carbon'].includes(v.finish)?v.finish:'metal';
 const letters=String(v.letters||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
 const key='ae-emblem-'+v.shape+'-'+v.mark+'-'+primary.slice(1)+'-'+accent.slice(1)+'-'+finish;
 const surface=finish==='matte'?primary:'url(#'+key+'-base)';
 return '<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Emblema personalizado"><defs><linearGradient id="'+key+'-base" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+accent+'" stop-opacity=".5"/><stop offset=".24" stop-color="'+primary+'"/><stop offset=".7" stop-color="'+primary+'"/><stop offset="1" stop-color="#101c2b"/></linearGradient><linearGradient id="'+key+'-trim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d8"/><stop offset=".4" stop-color="'+accent+'"/><stop offset=".8" stop-color="#4c5360"/><stop offset="1" stop-color="'+accent+'"/></linearGradient></defs><path d="'+shape+'" fill="'+surface+'" stroke="#0c1722" stroke-width="8" stroke-linejoin="round"/><path d="'+shape+'" fill="none" stroke="url(#'+key+'-trim)" stroke-width="4" stroke-linejoin="round"/><path d="'+mark+'" fill="url(#'+key+'-trim)" stroke="'+accent+'" stroke-width="1.5" stroke-linejoin="round"/>'+(finish==='carbon'?'<path d="M38 42 L55 34 M107 34 L122 42 M36 114 L50 127 M110 127 L124 114" stroke="'+accent+'" stroke-width="2" opacity=".5"/>':'')+(letters?'<rect x="52" y="118" width="56" height="20" rx="5" fill="#10202b" opacity=".95"/><text x="80" y="133" text-anchor="middle" fill="#fff" font-family="sans-serif" font-size="14" font-weight="800">'+letters+'</text>':'')+'</svg>';
}
window.AECompanyEmblem=Object.freeze({svg});
function refresh(){
 field('letters').value=field('letters').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
 field('name').value=field('name').value.slice(0,24);
 panel.querySelector('#ae-logo-preview').innerHTML=svg(values());
 panel.querySelector('#ae-logo-cost').textContent=editing?'Atualização visual sem custo · O nome da empresa permanece o mesmo.':'Custo de fundação: '+money(cost())+' · Caixa atual: '+money(s.cash);
 panel.querySelector('#ae-logo-confirm').disabled=(!editing&&num(s.cash)<cost())||!!s.empire?.economy?.bankrupt;
}
panel.addEventListener('input',refresh);panel.addEventListener('change',refresh);
panel.querySelector('#ae-logo-cancel').onclick=()=>{panel.hidden=true};
panel.querySelector('#ae-logo-confirm').onclick=()=>{
 const f=state(),name=field('name').value.trim().replace(/[<>]/g,'').slice(0,24),price=cost();
 if(!f||s.empire?.economy?.bankrupt)return;
 if(editing){
  if(!f.opened)return;
  f.logo=values();note('Identidade visual da fabricante atualizada.');
  panel.hidden=true;save();render();renderSaved();return;
 }
 if(f.opened)return;
 if(name.length<2)return toast('O nome deve ter pelo menos 2 caracteres.');
 if(num(s.cash)<price)return toast('Caixa insuficiente para a fundação.');
 if(!confirm('Fundar '+name+' por '+money(price)+' com este emblema?'))return;
 s.cash-=price;entry('Fundação da fabricante',-price);
 f.opened=true;f.brand=name;f.logo=values();
 note('Fabricante '+name+' fundada com identidade visual própria.');
 panel.hidden=true;save();render();renderSaved();
};
host.addEventListener('click',ev=>{
 const btn=ev.target.closest('[data-econ="open"]');if(!btn||state()?.opened)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 openEditor(false);
},true);
const saved=document.createElement('div');saved.id='ae-logo-saved';saved.hidden=true;host.querySelector('#ae-econ-factory')?.after(saved);
function renderSaved(){
 const f=state();if(!f?.opened||!f.logo){saved.hidden=true;return}
 saved.hidden=false;saved.innerHTML=svg(f.logo)+'<div><strong>'+safe(f.brand)+'</strong><div>Identidade visual da fabricante</div><button type="button" id="ae-logo-edit">Editar emblema</button></div>';
}
saved.addEventListener('click',ev=>{if(ev.target.closest('#ae-logo-edit'))openEditor(true)});
const previousRender=render;let last='';
render=function(){previousRender();const f=state(),signature=[f?.opened,f?.brand,JSON.stringify(f?.logo)].join('|');if(signature!==last){last=signature;renderSaved();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(renderSaved);
renderSaved();
})();
