/* Auto Empire Tycoon — text-first layout and accessibility polish. */
(function(){
'use strict';
const style=document.createElement('style');
style.textContent=`
/* Retire obsolete visual layers without affecting the game model. */
#garage .scene-wrap,.studio-hero,.studio-brand,#ae-studio-inspector,#studio-lightbox,
#ae-garage-buttons,.ae-car-thumb,.carart,canvas#scene{display:none!important}
:root{--ae-radius:13px}
body{background:#0b1822!important}
body::before{display:none!important}
.shell{max-width:880px!important}
.top{border-radius:0 0 16px 16px!important;padding:16px!important}
.content{padding-bottom:calc(94px + env(safe-area-inset-bottom))!important}
.stats{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px!important}
.stats .stat{min-width:0;padding:11px 8px!important}
.stats .stat .num{font-size:clamp(13px,3.8vw,23px)!important;overflow-wrap:anywhere}
.panel{border-radius:var(--ae-radius)!important}
.vehicle{gap:8px!important}
.vehicle .vinfo{width:100%!important;min-width:0}
#stock .panel,#listings .panel{margin-bottom:10px}
#stock .actions,#listings .actions{display:flex;flex-wrap:wrap;gap:7px}
#stock .actions button,#listings .actions button{min-height:42px;flex:1 1 auto}
button{touch-action:manipulation}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #f3cc7b!important;outline-offset:2px}
.bottom{padding-bottom:env(safe-area-inset-bottom)!important}
.bottom .navinner{max-width:880px}
.bottom button{min-height:58px;font-size:12px!important}
#ae-company-identity{margin-bottom:10px}
#ae-text-garage,#ae-trade-intelligence{margin:10px 0!important}
#ae-text-garage .ae-text-summary,#ae-trade-intelligence .ae-intel-metrics{gap:7px}
#ae-text-garage .ae-text-metric,#ae-trade-intelligence .ae-intel-metric{padding:9px}
@media(max-width:380px){.top .logo{font-size:21px!important}.bottom button{font-size:11px!important}.section-head{gap:8px;flex-wrap:wrap}.section-head button{min-height:40px}}
@media(min-width:700px){.content{padding-left:20px!important;padding-right:20px!important}}
`;
document.head.appendChild(style);
const rename=(selector,label)=>{const el=document.querySelector(selector);if(el)el.textContent=label};
rename('#garage .section-head .title','Estoque de veículos');
rename('#market .section-head .title','Oportunidades de mercado');
rename('#reports > .title','Desempenho financeiro');
rename('#events > .title','Histórico da empresa');
document.querySelectorAll('.bottom button[data-tab]').forEach(button=>{
 const labels={garage:'Estoque',market:'Mercado',reports:'Finanças',events:'Histórico'};
 const tab=button.dataset.tab;
 button.setAttribute('aria-label',labels[tab]||tab);
});
const live=document.createElement('span');
live.className='ae-sr-only';live.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)';
live.setAttribute('role','status');live.setAttribute('aria-live','polite');
document.body.appendChild(live);
})();
