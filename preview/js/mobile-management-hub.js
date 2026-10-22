/* Auto Empire Tycoon — Alpha 7.9: compact, accessible mobile management hub. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const modules=[
 ['ae-empire-levels','Carreira','progress'],
 ['ae-business-opportunities','Contratos','business'],
 ['ae-market-rivals','Concorrentes','rivals'],
 ['ae-rival-market-pressure','Disputa por carros','market'],
 ['ae-competitive-events','Eventos','events'],
 ['ae-strategic-achievements','Conquistas','achievements'],
 ['ae-rare-opportunities','Oportunidades raras','rare'],
 ['ae-business-strategy','Estratégia','strategy'],
 ['ae-customer-loyalty','Clientes','customers'],
 ['ae-customer-referrals','Preferências','referrals']
];
const style=document.createElement('style');style.textContent=`
#ae-mobile-hub{margin:14px 0;padding:12px;border:1px solid #425d6b;border-radius:14px;background:#192a37}
#ae-mobile-hub h3{font-size:15px;margin:0 0 5px;color:#f5d78e}
#ae-mobile-hub p{font-size:12px;color:#b9cbd6;margin:0 0 10px}
.ae-hub-nav{display:flex;gap:7px;overflow-x:auto;scroll-snap-type:x proximity;padding:2px 0 6px;-webkit-overflow-scrolling:touch}
.ae-hub-nav button{flex:0 0 auto;scroll-snap-align:start;min-height:42px;padding:9px 12px;background:#294252;color:#e7f0f5;border:1px solid #4a6878;font-size:12px}
.ae-hub-nav button[aria-pressed="true"]{background:#f4c568;color:#172631;border-color:#f4c568}
.ae-managed-panel{margin:9px 0!important;padding:0!important;overflow:hidden}
.ae-panel-toggle{width:100%;min-height:48px;display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;border-radius:0;background:#253e4e;color:#f5d78e;padding:12px 14px;font-size:14px}
.ae-panel-toggle:focus-visible,.ae-hub-nav button:focus-visible{outline:3px solid #f5d78e;outline-offset:2px}
.ae-panel-toggle span:last-child{font-size:17px}
.ae-panel-content{padding:12px}
.ae-panel-content[hidden]{display:none!important}
`;document.head.append(style);
const available=modules.map(([id,title,slug])=>({id,title,slug,element:document.getElementById(id)})).filter(x=>x.element);
if(!available.length)return;
const hub=document.createElement('section');hub.id='ae-mobile-hub';
hub.innerHTML='<h3>Central de gestão</h3><p>Encontre rapidamente cada área. Abra somente o que precisar para manter a tela organizada.</p><div class="ae-hub-nav" role="group" aria-label="Navegação da central de gestão"></div>';
const first=available[0].element;first.parentNode.insertBefore(hub,first);
function preferences(){
 if(!s||typeof s!=='object')return null;
 if(!s.managementHub||typeof s.managementHub!=='object')s.managementHub={open:'ae-business-opportunities'};
 return s.managementHub;
}
const nav=hub.querySelector('.ae-hub-nav');
const controls=[];
function select(id){
 const prefs=preferences();if(prefs)prefs.open=id;
 for(const item of controls){
  const open=item.id===id;
  item.body.hidden=!open;item.toggle.setAttribute('aria-expanded',String(open));
  item.toggle.querySelector('.ae-chevron').textContent=open?'−':'+';
  item.nav.setAttribute('aria-pressed',String(open));
 }
 if(typeof save==='function')save();
}
for(const item of available){
 const el=item.element;
 const heading=Array.from(el.children).find(x=>/^H[1-6]$/.test(x.tagName));
 const body=document.createElement('div');body.className='ae-panel-content';body.id='ae-panel-body-'+item.slug;
 // Keep the original panel and its event listeners; only group its children.
 for(const child of Array.from(el.children))body.appendChild(child);
 const toggle=document.createElement('button');toggle.type='button';toggle.className='ae-panel-toggle';
 toggle.setAttribute('aria-controls',body.id);
 const label=document.createElement('span');label.textContent=item.title;
 const chevron=document.createElement('span');chevron.className='ae-chevron';chevron.setAttribute('aria-hidden','true');
 toggle.append(label,chevron);el.append(toggle,body);el.classList.add('ae-managed-panel');
 if(heading)heading.hidden=true;
 const navButton=document.createElement('button');navButton.type='button';navButton.textContent=item.title;
 navButton.addEventListener('click',()=>{select(item.id);el.scrollIntoView({behavior:'smooth',block:'start'});});
 toggle.addEventListener('click',()=>select(body.hidden?item.id:''));
 nav.append(navButton);controls.push({...item,body,toggle,nav:navButton});
}
const prefs=preferences();select(controls.some(x=>x.id===prefs?.open)?prefs.open:controls[0].id);
const previousSeed=seed;
seed=function(){previousSeed();const p=preferences();if(p)p.open='ae-business-opportunities';select(controls.some(x=>x.id===p?.open)?p.open:controls[0].id);};
})();
