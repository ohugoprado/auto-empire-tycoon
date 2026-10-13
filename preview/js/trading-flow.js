/* Alpha 4.2 — consistent iPhone purchase, stock and sale presentation. */
(function(){
'use strict';
const style=document.createElement('style');style.id='ae-trading-flow-style';style.textContent=`
:root{--ae-flow-line:#3d5269;--ae-flow-surface:#1b2b3d}
#ae-workspace-overview #stock>.panel,#market #listings>.panel{background:#1b2b3d!important;border:1px solid var(--ae-flow-line)!important;border-radius:13px!important;padding:15px!important;box-shadow:none!important}
#ae-workspace-overview #stock>.panel>.divider,#market #listings>.panel>.divider{border-color:#3b5066!important;margin:12px 0!important}
#ae-workspace-overview #stock>.panel .price,#market #listings>.panel .price{color:#f2cb7f!important;font-size:17px!important;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
#ae-workspace-overview #stock>.panel .actions,#market #listings>.panel .actions{display:flex!important;gap:8px!important}
#ae-workspace-overview #stock>.panel button,#market #listings>.panel button{min-height:44px!important;border-radius:9px!important}
#ae-workspace-overview #stock>.panel .tiny,#market #listings>.panel .tiny{color:#bfd0df!important}
.ae-flow-step{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 11px;padding:10px 11px;border:1px solid #405a70;background:#223449;border-radius:10px}
.ae-flow-step-label{font-size:11px;color:#c6d5e4;line-height:1.4}
.ae-flow-step strong{display:block;font-size:13px;color:#f3f8fd}
.ae-flow-step .ae-flow-count{font-size:11px;font-weight:800;color:#f2cf8b;border:1px solid #826c49;border-radius:8px;padding:5px 8px;white-space:nowrap}
#ae-trade-stock,#ae-trade-market{padding:10px 12px!important;border:1px solid #3d5269!important}
#ae-trade-stock-summary,#ae-trade-market-summary{color:#c5d3df!important;font-size:12px!important}
#modalbody{background:#182638!important;border:1px solid #50667c!important;border-radius:16px!important;box-shadow:0 18px 60px #0009!important;max-height:calc(100dvh - 35px)!important;overflow-y:auto!important;overscroll-behavior:contain}
#modalbody h2{font-size:19px!important;letter-spacing:-.025em!important;color:#fff!important}
#modalbody .divider{border-color:#40546a!important}
#modalbody .actions{display:flex!important;gap:9px!important;flex-wrap:wrap}
#modalbody .actions button{min-height:46px!important}
#modalbody #ae-neg-analysis{border-color:#46627a!important;background:#1d3043!important;padding:13px!important}
#modalbody .ae-neg-grid{gap:8px!important}
#modalbody .ae-neg-grid>div{background:#263b50!important;border:1px solid #3f5870!important}
#modalbody .ae-neg-quick{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:7px!important}
#modalbody .ae-neg-quick button{min-width:0!important;min-height:44px!important;padding:8px 4px!important;font-size:11px!important;background:#2d465f!important;color:#fff!important;border:1px solid #627d95!important}
@media(max-width:360px){#modalbody .ae-neg-quick{grid-template-columns:1fr!important}#modalbody .ae-neg-quick button{font-size:12px!important}}
`;document.head.append(style);
function step(root,id,title,description,count){
 if(!root)return;
 let el=document.getElementById(id);
 if(!el){el=document.createElement('div');el.id=id;el.className='ae-flow-step';el.setAttribute('aria-label',title);root.before(el)}
 const signature=[title,description,count].join('|');if(el.dataset.signature===signature)return;el.dataset.signature=signature;
 el.replaceChildren();
 const copy=document.createElement('div'),strong=document.createElement('strong'),sub=document.createElement('div'),badge=document.createElement('span');
 strong.textContent=title;sub.className='ae-flow-step-label';sub.textContent=description;badge.className='ae-flow-count';badge.textContent=String(count);
 copy.append(strong,sub);el.append(copy,badge);
}
function update(){
 if(typeof s==='undefined'||!s)return;
 const stock=document.getElementById('stock'),listings=document.getElementById('listings');
 const active=s.stock.filter(c=>c.listed).length,offers=s.stock.reduce((n,c)=>n+(c.offers?.length||0),0);
 step(stock,'ae-flow-stock','Seus veículos','Compre, prepare, anuncie e negocie.',s.stock.length+' no estoque');
 step(listings,'ae-flow-market','Mercado de veículos','Compare preços antes de fazer uma proposta.',s.market.length+' disponíveis');
 const stockStep=document.getElementById('ae-flow-stock');
 if(stockStep){stockStep.querySelector('.ae-flow-step-label').textContent=active+' anunciados · '+offers+' propostas aguardando'}
}
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(update);
const previousRender=render;render=function(){previousRender();update()};
update();
})();
