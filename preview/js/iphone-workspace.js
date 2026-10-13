/* Alpha 4.1 — uncluttered iPhone workspace: overview vs management. */
(function(){
'use strict';
const garage=document.getElementById('garage'),management=document.getElementById('ae-business-section');
if(!garage||!management||!window.AEManagement)return;
const command=document.getElementById('ae-command'),stock=document.getElementById('stock'),inventoryTitle=garage.querySelector('.ae-section-title:not(#ae-business-section .ae-section-title)');
const trading=document.getElementById('ae-trade-stock'),summary=document.getElementById('ae-trade-stock-summary');
const overview=document.createElement('div');overview.id='ae-workspace-overview';
const nav=document.createElement('nav');nav.id='ae-workspace-nav';nav.setAttribute('aria-label','Navegação da garagem');
const tabs=[['overview','Visão geral'],['management','Gestão']];
const controls=new Map();
for(const [id,label] of tabs){
 const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.workspace=id;button.setAttribute('aria-controls',id==='overview'?'ae-workspace-overview':'ae-business-section');button.setAttribute('aria-pressed','false');nav.append(button);controls.set(id,button);
 button.addEventListener('click',()=>switchTo(id,true));
}
garage.insertBefore(nav,garage.firstChild);
nav.after(overview);
for(const el of [command,inventoryTitle,trading,summary,stock])if(el&&el.parentElement===garage)overview.append(el);
// Keep all remaining garage-only widgets in the overview, rather than leaking below management.
for(const child of [...garage.children]){
 if(child===nav||child===overview||child===management||child.id==='ae-iphone-tools')continue;
 overview.append(child);
}
const style=document.createElement('style');style.id='ae-workspace-style';style.textContent=`
#ae-workspace-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;background:#1b2a3b;border:1px solid #354a60;border-radius:12px;padding:4px;margin:13px 0 15px}
#ae-workspace-nav button{min-height:44px!important;padding:10px!important;border:1px solid transparent!important;background:transparent!important;color:#bfcfe0!important;border-radius:9px!important;font-size:14px!important;font-weight:750!important}
#ae-workspace-nav button[aria-pressed="true"]{background:#304860!important;color:#ffe1a1!important;border-color:#58718a!important;box-shadow:0 2px 8px #0003}
#ae-workspace-overview[hidden],#ae-business-section[hidden]{display:none!important}
#ae-workspace-overview #ae-command{margin-top:0!important}
#ae-workspace-overview .ae-section-title{margin-top:17px}
#ae-business-section{margin-top:0!important}
#ae-business-section>.ae-section-title{margin-top:0!important}
#ae-workspace-overview .ae-trade-chip{font-variant-numeric:tabular-nums}
@media(max-width:430px){#ae-workspace-nav{margin-top:9px}}
`;document.head.append(style);
let active='overview';
function switchTo(id,scroll){
 if(!controls.has(id))return;
 active=id;const manage=id==='management';
 overview.hidden=manage;management.hidden=!manage;
 controls.forEach((button,key)=>button.setAttribute('aria-pressed',String(key===id)));
 try{sessionStorage.setItem('ae_workspace_view_v1',id)}catch(e){}
 if(scroll)nav.scrollIntoView({block:'start',behavior:'auto'});
}
try{if(sessionStorage.getItem('ae_workspace_view_v1')==='management')active='management'}catch(e){}
switchTo(active,false);
const priorOpen=window.AEManagement.openArea;
window.AEManagement.openArea=function(id,fold){switchTo('management',false);priorOpen(id,fold)};
// Command center handles factory actions; reveal management before its legacy scroll runs.
const commandActions=document.getElementById('ae-command-actions');
if(commandActions)commandActions.addEventListener('click',event=>{
 if(event.target.closest('[data-command="factory"]'))switchTo('management',false);
},true);
const oldShow=show;
show=function(id){const result=oldShow(id);if(id==='garage'&&active==='management'){requestAnimationFrame(()=>{if(!management.hidden)nav.scrollIntoView({block:'start',behavior:'auto'})})}return result};
})();
