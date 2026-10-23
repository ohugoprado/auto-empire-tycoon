/* Auto Empire Tycoon — Alpha 10.4: interactive company emblem founder. */
(function(){
'use strict';
const host=document.getElementById('ae-economy');if(!host)return;
const themes={shield:'Escudo',circle:'Selo circular',hex:'Hexágono',diamond:'Losango'};
const marks={bolt:'Raio',wing:'Asas',star:'Estrela',road:'Estrada'};
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const color=x=>/^#[0-9a-fA-F]{6}$/.test(x)?x:'#2563a0';
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const state=()=>s?.empire?.economy?.factory;
const cost=()=>Math.round(110000*Math.max(1,num(s?.empire?.economy?.inflation)||1));
const panel=document.createElement('section');panel.id='ae-company-logo';panel.hidden=true;
panel.innerHTML='<h3>Crie a identidade da fabricante</h3><p class="tiny">Personalize o emblema antes de fundar a empresa. A marca ficará salva na campanha.</p><div class="ae-logo-fields"><label>Nome da empresa<input id="ae-logo-name" maxlength="24" value="Empire Motors"></label><label>Formato<select id="ae-logo-shape"></select></label><label>Símbolo<select id="ae-logo-mark"></select></label><label>Cor principal<input type="color" id="ae-logo-color" value="#2563a0"></label><label>Cor de destaque<input type="color" id="ae-logo-accent" value="#f0c77c"></label><label>Iniciais<input id="ae-logo-letters" maxlength="3" value="EM"></label></div><div id="ae-logo-preview"></div><p id="ae-logo-cost" class="tiny"></p><div class="ae-logo-actions"><button id="ae-logo-confirm" type="button">Fundar com esta marca</button><button id="ae-logo-cancel" type="button" class="ghost">Cancelar</button></div>';
host.prepend(panel);
const style=document.createElement('style');style.textContent=`
#ae-company-logo{padding:14px;border:1px solid #567688;border-radius:12px;background:#1a3545;margin-bottom:12px}
#ae-company-logo h3{font-size:16px;color:#f4d28b;margin:0 0 8px}
.ae-logo-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
.ae-logo-fields label{font-size:12px;display:flex;flex-direction:column;gap:5px;min-width:0}
.ae-logo-fields input,.ae-logo-fields select{width:100%;box-sizing:border-box;min-height:44px;background:#233e50;color:#f4f6f8;border:1px solid #5b7c8d;border-radius:8px;padding:7px}
.ae-logo-fields input[type=color]{padding:3px}
#ae-logo-preview{display:flex;align-items:center;justify-content:center;min-height:165px;margin:12px 0;border-radius:12px;background:#0e2532}
#ae-logo-preview svg{width:150px;height:150px}
.ae-logo-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ae-logo-actions button{min-height:46px}
#ae-logo-saved{display:flex;align-items:center;gap:10px;margin:8px 0;padding:8px;border-radius:10px;background:#203b4b;font-size:12px}
#ae-logo-saved svg{width:60px;height:60px;flex:none}
@media(max-width:420px){.ae-logo-fields{grid-template-columns:1fr 1fr}.ae-logo-actions{grid-template-columns:1fr}}
`;document.head.append(style);
for(const [id,name] of Object.entries(themes)){const o=document.createElement('option');o.value=id;o.textContent=name;panel.querySelector('#ae-logo-shape').append(o)}
for(const [id,name] of Object.entries(marks)){const o=document.createElement('option');o.value=id;o.textContent=name;panel.querySelector('#ae-logo-mark').append(o)}
const field=id=>panel.querySelector('#ae-logo-'+id);
function values(){return {shape:themes[field('shape').value]?field('shape').value:'shield',mark:marks[field('mark').value]?field('mark').value:'bolt',primary:color(field('color').value),accent:color(field('accent').value),letters:field('letters').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3)}}
function svg(v){
 const shapes={shield:'M80 12 L137 32 L131 104 Q120 136 80 151 Q40 136 29 104 L23 32 Z',circle:'M80 13 A67 67 0 1 1 79.99 13 Z',hex:'M80 11 L137 45 L137 115 L80 149 L23 115 L23 45 Z',diamond:'M80 10 L147 80 L80 150 L13 80 Z'};
 const symbols={bolt:'M87 34 L54 85 L78 85 L70 124 L111 69 L84 69 Z',wing:'M25 68 L67 86 L80 76 L93 86 L135 68 L110 99 L80 91 L50 99 Z',star:'M80 38 L91 67 L122 67 L97 86 L106 115 L80 97 L54 115 L63 86 L38 67 L69 67 Z',road:'M69 34 L91 34 L113 122 L89 122 L84 100 L76 100 L71 122 L47 122 Z'};
 return '<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Emblema personalizado"><path d="'+shapes[v.shape]+'" fill="'+v.primary+'" stroke="'+v.accent+'" stroke-width="5"/><path d="'+symbols[v.mark]+'" fill="'+v.accent+'" opacity=".95"/>'+(v.letters?'<rect x="46" y="117" width="68" height="24" rx="8" fill="#102838" opacity=".92"/><text x="80" y="134" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="700">'+safe(v.letters)+'</text>':'')+'</svg>';
}
function refresh(){
 field('letters').value=field('letters').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
 field('name').value=field('name').value.slice(0,24);
 field('preview');panel.querySelector('#ae-logo-preview').innerHTML=svg(values());
 panel.querySelector('#ae-logo-cost').textContent='Custo de fundação: '+money(cost())+' · Caixa atual: '+money(s.cash);
 panel.querySelector('#ae-logo-confirm').disabled=num(s.cash)<cost()||!!s.empire?.economy?.bankrupt;
}
panel.addEventListener('input',refresh);panel.addEventListener('change',refresh);
panel.querySelector('#ae-logo-cancel').onclick=()=>{panel.hidden=true};
panel.querySelector('#ae-logo-confirm').onclick=()=>{
 const f=state(),name=field('name').value.trim().replace(/[<>]/g,'').slice(0,24),price=cost();
 if(!f||f.opened||s.empire?.economy?.bankrupt)return;
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
 field('name').value=state()?.brand||'Empire Motors';
 panel.hidden=false;refresh();panel.scrollIntoView({block:'start',behavior:'smooth'});
},true);
const saved=document.createElement('div');saved.id='ae-logo-saved';saved.hidden=true;host.querySelector('#ae-econ-factory')?.after(saved);
function renderSaved(){
 const f=state();if(!f?.opened||!f.logo){saved.hidden=true;return}
 saved.hidden=false;saved.innerHTML=svg(f.logo)+'<div><strong>'+safe(f.brand)+'</strong><div>Identidade visual da fabricante</div></div>';
}
const previousRender=render;let last='';
render=function(){previousRender();const f=state(),signature=[f?.opened,f?.brand,JSON.stringify(f?.logo)].join('|');if(signature!==last){last=signature;renderSaved();}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(renderSaved);
renderSaved();
})();
