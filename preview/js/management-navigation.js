/* Alpha 4.0 — dedicated management views, progressive disclosure and unified iPhone navigation. */
(function(){
'use strict';
const section=document.getElementById('ae-business-section'),garage=document.getElementById('garage');
if(!section||!garage)return;
const definitions=[
{id:'finance',label:'Finanças',description:'Banco, crédito, fornecedores e resultados.',nodes:['ae-bank','fold-ae-operations']},
{id:'clients',label:'Clientes',description:'Propostas, histórico, satisfação e fidelização.',nodes:['ae-buyers-panel']},
{id:'network',label:'Expansão',description:'Cidades, filiais e economia global.',nodes:['fold-ae-world','fold-ae-economy']},
{id:'factory',label:'Fabricante',description:'Projetos, produção e desenvolvimento.',nodes:['fold-ae-studio']}
];
const icons={finance:'<path d="M2 9l10-6 10 6M3 10h18M5 10v9m5-9v9m4-9v9m5-9v9M2 21h20"/>',clients:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 6a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',network:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/>',factory:'<path d="M3 21V10l6 4V9l6 5V5h6v16H3zM7 18h2m3 0h2m3 0h2"/>'};
const svg=id=>'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[id]+'</svg>';
const css=document.createElement('style');css.id='ae-management-nav-css';css.textContent=`
#ae-business-section{padding:0!important;margin:14px 0 20px!important}
#ae-management-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:11px 0}
#ae-management-nav button{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:9px!important;min-width:0;min-height:56px!important;padding:11px!important;text-align:left!important;background:#23364b!important;color:#d7e3ed!important;border:1px solid #405a72!important;border-radius:11px!important;font-size:13px!important;font-weight:750!important}
#ae-management-nav button[aria-selected="true"]{background:#354b60!important;border-color:#eebf69!important;color:#ffdfa0!important;box-shadow:inset 0 0 0 1px #eebf6955!important}
#ae-management-nav button svg{flex:none}
.ae-management-view{display:none;min-width:0}
.ae-management-view.ae-view-active{display:block}
.ae-management-view>h3{font-size:16px!important;margin:13px 0 3px;color:#fff!important}
.ae-management-view>p{font-size:12px!important;color:#c0cfde!important;margin:0 0 12px}
.ae-management-view .ae-iphone-fold{margin:9px 0!important}
.ae-management-view .ae-fold-head{min-height:52px!important}
.ae-management-view #ae-bank,.ae-management-view #ae-buyers-panel{margin:0 0 10px!important}
#ae-management-hint{font-size:11px;color:#b7c9d8;margin:6px 0 10px}
@media(max-width:350px){#ae-management-nav{gap:7px}#ae-management-nav button{font-size:12px!important;padding:9px!important}}
`;document.head.append(css);
const nav=document.createElement('div');nav.id='ae-management-nav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Áreas de gestão');
const views=new Map(),buttons=new Map();
let saved='finance';try{const stored=localStorage.getItem('ae_management_view_v1');if(definitions.some(x=>x.id===stored))saved=stored}catch(e){}
function select(id,scroll){
 if(!views.has(id))return;
 for(const [key,view] of views){const active=key===id;view.classList.toggle('ae-view-active',active);view.hidden=!active;view.setAttribute('aria-hidden',String(!active));buttons.get(key)?.setAttribute('aria-selected',String(active));buttons.get(key)?.setAttribute('tabindex',active?'0':'-1')}
 try{localStorage.setItem('ae_management_view_v1',id)}catch(e){}
 if(scroll)section.scrollIntoView({behavior:'auto',block:'start'});
}
for(const spec of definitions){
 const button=document.createElement('button');button.type='button';button.id='ae-mgmt-tab-'+spec.id;button.setAttribute('role','tab');button.setAttribute('aria-controls','ae-mgmt-view-'+spec.id);button.innerHTML=svg(spec.id)+'<span>'+spec.label+'</span>';
 const view=document.createElement('div');view.className='ae-management-view';view.id='ae-mgmt-view-'+spec.id;view.setAttribute('role','tabpanel');view.setAttribute('aria-labelledby',button.id);
 const h=document.createElement('h3');h.textContent=spec.label;const p=document.createElement('p');p.textContent=spec.description;view.append(h,p);
 for(const id of spec.nodes){const node=document.getElementById(id);if(node&&section.contains(node))view.append(node)}
 nav.append(button);section.append(view);views.set(spec.id,view);buttons.set(spec.id,button);
 button.addEventListener('click',()=>select(spec.id,false));
 button.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const index=definitions.findIndex(x=>x.id===spec.id);
  const next=event.key==='Home'?0:event.key==='End'?definitions.length-1:(index+(event.key==='ArrowRight'?1:-1)+definitions.length)%definitions.length;
  select(definitions[next].id,false);buttons.get(definitions[next].id).focus();
 });
}
const note=document.createElement('p');note.id='ae-management-hint';note.textContent='Escolha uma área para ver apenas os controles relacionados.';section.querySelector('.ae-section-note')?.after(note);note.after(nav);
select(saved,false);
function openArea(id,fold){
 select(id,true);
 if(fold){
  const button=document.querySelector('#'+fold+' > .ae-fold-head');
  if(button&&button.getAttribute('aria-expanded')==='false')button.click();
 }
}
window.AEManagement={openArea};
const oldCommand=document.querySelector('#ae-command-actions [data-command="factory"]');
if(oldCommand){oldCommand.addEventListener('click',()=>{requestAnimationFrame(()=>openArea('factory','fold-ae-studio'))})}
})();
