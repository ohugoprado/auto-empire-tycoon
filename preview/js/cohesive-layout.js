/* Alpha 3.9 — coherent information architecture, single visual language. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const css=document.createElement('style');css.id='ae-cohesive-layout';css.textContent=`
:root{--ae-bg:#0e1520;--ae-surface:#192637;--ae-raised:#223247;--ae-stroke:#344b62;--ae-ink:#f3f7fc;--ae-muted:#b9c9d9;--ae-gold:#eebf69;--ae-green:#70d9a8;--ae-red:#f08b92}
body,.shell{background:#0e1520!important;color:var(--ae-ink)!important}
.top{background:#131f2e!important;border-bottom:1px solid #30465a!important;box-shadow:none!important}
.content{padding:0 14px calc(110px + env(safe-area-inset-bottom,0px))!important}
.panel,#ae-command,#ae-bank,#ae-buyers-panel,#ae-world,#ae-economy,#ae-studio,#ae-operations,.ae-iphone-fold{background:var(--ae-surface)!important;border:1px solid var(--ae-stroke)!important;box-shadow:none!important;border-radius:13px!important}
#ae-command{background:#1d3045!important;border-color:#4b6986!important;padding:16px!important}
#ae-command h2{font-size:18px!important}
#ae-command-stats,.ae-bank-grid,.ae-buyer-metrics{gap:8px!important}
.ae-command-stat,.ae-bank-grid>div,.ae-buyer-metrics>div{background:#25384d!important;border:1px solid #344e65!important;border-radius:10px!important}
.ae-command-stat small,.ae-bank-grid small,.ae-buyer-metrics small{color:#c7d5e3!important}
.ae-command-stat strong,.ae-bank-grid strong,.ae-buyer-metrics strong{color:#fff!important}
#ae-command-actions{gap:8px!important}
#ae-command-actions button{min-height:46px!important;border-radius:9px!important}
#ae-iphone-tools{display:none!important}
.ae-section-title{display:flex;align-items:center;gap:9px;margin:21px 0 10px;color:#f4f7fa;font-size:15px;font-weight:800;letter-spacing:-.02em}
.ae-section-title:before{content:"";width:3px;height:18px;background:#eebf69;border-radius:3px}
.ae-section-note{color:#b9c9d9;font-size:12px;margin:-3px 0 11px;line-height:1.45}
#ae-business-section{margin:14px 0 22px}
#ae-business-section .ae-iphone-fold{margin:8px 0!important}
#ae-business-section .ae-fold-head{background:#22374c!important;color:#f4f7fc!important}
#ae-business-section .ae-fold-body{background:#192637!important}
#ae-business-section #ae-bank,#ae-business-section #ae-buyers-panel{margin:9px 0!important}
#ae-business-section #ae-bank h3,#ae-business-section #ae-buyers-panel h3{font-size:15px!important}
.ae-business-divider{border:0;border-top:1px solid #30465a;margin:18px 0}
#stock>.panel,#listings>.panel{margin-bottom:10px!important}
#ae-trade-stock,#ae-trade-market{border-radius:11px!important;background:#1d2e40!important;border-color:#344b62!important}
button:not(.ghost):not(.secondary):not(.ae-fold-head):not([data-tab]):not([data-speed]):not(.smallbtn){background:#eebf69!important;color:#192638!important;border-color:#eebf69!important}
button.ghost,button.secondary,#ae-business-section .ae-bank-contract button{background:#2a4056!important;border-color:#506d86!important;color:#f3f7fc!important}
.bottom{background:#142233!important;border-top:1px solid #344d65!important;box-shadow:0 -4px 20px #0005!important}
.bottom button.active,.bottom button[aria-current="page"]{background:#2b435b!important;border-color:#506d86!important;color:#f5cf83!important}
@media(max-width:430px){.panel{padding:14px!important}.content{padding-left:13px!important;padding-right:13px!important}}
`;document.head.append(css);
const section=document.createElement('section');section.id='ae-business-section';section.setAttribute('aria-label','Gestão da empresa');
const title=document.createElement('h2');title.className='ae-section-title';title.textContent='Gestão da empresa';
const subtitle=document.createElement('p');subtitle.className='ae-section-note';subtitle.textContent='Finanças, clientes, expansão e produção em um único lugar.';
section.append(title,subtitle);
const stock=document.getElementById('stock');
if(stock&&stock.parentNode===garage)garage.insertBefore(section,stock);
else garage.append(section);
const order=['ae-bank','ae-buyers-panel','fold-ae-operations','fold-ae-world','fold-ae-economy','fold-ae-studio'];
for(const id of order){
 const node=document.getElementById(id);
 if(!node||!garage.contains(node)||node===section||section.contains(node))continue;
 section.append(node);
}
const inventoryTitle=document.createElement('h2');inventoryTitle.className='ae-section-title';inventoryTitle.textContent='Estoque e vendas';
if(stock&&stock.parentNode===garage)garage.insertBefore(inventoryTitle,stock);
const market=document.getElementById('market'),listings=document.getElementById('listings');
if(market&&listings){
 const label=document.createElement('h2');label.className='ae-section-title';label.textContent='Oportunidades do mercado';
 const container=document.getElementById('ae-trade-market');
 if(container&&market.contains(container))container.before(label);
 else if(market.contains(listings))listings.before(label);
}
})();
