/* iPhone-first dashboard: compact shortcuts and collapsible management systems. */
(function(){
'use strict';
const storageKey='ae_iphone_panels_v1';
const specs=[
{id:'ae-world',title:'Rede mundial',emoji:'🌍'},
{id:'ae-economy',title:'Economia e riscos',emoji:'📉'},
{id:'ae-studio',title:'Projetos de carros',emoji:'🛠️'},
{id:'ae-operations',title:'Finanças e fornecedores',emoji:'📊'}
];
const css=document.createElement('style');css.textContent=`
#ae-iphone-tools{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}
#ae-iphone-tools button{min-height:48px!important;padding:10px!important;font-size:12px!important;background:#253b49!important;color:#f5f7f8!important;border:1px solid #466071!important;text-align:left}
.ae-iphone-fold{border:1px solid #456071!important;border-radius:12px!important;margin:10px 0!important;overflow:hidden}
.ae-iphone-fold>.ae-fold-head{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:54px!important;padding:12px!important;background:#203643!important;color:#f3f6f7!important;border:0!important;border-radius:0!important;text-align:left!important;font-weight:700!important;font-size:14px!important}
.ae-iphone-fold>.ae-fold-head .ae-chevron{font-size:15px;color:#e9d09c}
.ae-iphone-fold>.ae-fold-body{padding:0 11px 12px}
.ae-iphone-fold>.ae-fold-body>section{margin:0!important;border:0!important;padding:6px 0!important;background:transparent!important}
.ae-iphone-fold>.ae-fold-body[hidden]{display:none!important}
@media(max-width:350px){#ae-iphone-tools{grid-template-columns:1fr}}
`;document.head.append(css);
let state={};try{const parsed=JSON.parse(localStorage.getItem(storageKey)||'{}');if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))state=parsed}catch(e){}
const garage=document.getElementById('garage');if(!garage)return;
const tools=document.createElement('nav');tools.id='ae-iphone-tools';tools.setAttribute('aria-label','Atalhos de gestão');
garage.insertBefore(tools,garage.querySelector('#stock')||garage.firstChild);
function wrap(spec){
 const section=document.getElementById(spec.id);if(!section||section.closest('.ae-iphone-fold'))return;
 const wrap=document.createElement('div');wrap.className='ae-iphone-fold';wrap.id='fold-'+spec.id;
 const button=document.createElement('button');button.type='button';button.className='ae-fold-head';
 const body=document.createElement('div');body.className='ae-fold-body';body.id='fold-body-'+spec.id;
 const open=state[spec.id]===true;
 body.hidden=!open;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-controls',body.id);
 button.innerHTML='<span>'+spec.emoji+' '+spec.title+'</span><span class="ae-chevron" aria-hidden="true">'+(open?'⌃':'⌄')+'</span>';
 section.parentNode.insertBefore(wrap,section);wrap.append(button,body);body.append(section);
 button.addEventListener('click',()=>{
  const next=body.hidden;body.hidden=!next;button.setAttribute('aria-expanded',String(next));
  button.querySelector('.ae-chevron').textContent=next?'⌃':'⌄';
  state[spec.id]=next;try{localStorage.setItem(storageKey,JSON.stringify(state))}catch(e){}
 });
 const shortcut=document.createElement('button');shortcut.type='button';shortcut.textContent=spec.emoji+' '+spec.title;
 shortcut.addEventListener('click',()=>{
  if(body.hidden)button.click();
  wrap.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 });
 tools.append(shortcut);
}
specs.forEach(wrap);
})();
