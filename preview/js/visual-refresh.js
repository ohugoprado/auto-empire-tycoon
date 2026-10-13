/* Alpha 3.7 — high-contrast iPhone design system, no decorative images. */
(function(){
'use strict';
const css=document.createElement('style');css.id='ae-visual-refresh';css.textContent=`
:root{color-scheme:dark;--ae-bg:#0b111b;--ae-surface:#172638;--ae-raised:#21354a;--ae-stroke:#54718a;--ae-ink:#f9fcff;--ae-muted:#c9d8e6;--ae-gold:#ffd16d;--ae-green:#69f1b2;--ae-red:#ff8d91}
html{background:var(--ae-bg)!important;scroll-behavior:smooth}
body{background:var(--ae-bg)!important;color:var(--ae-ink)!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif!important;font-size:14px!important;line-height:1.5!important}
.shell{background:linear-gradient(180deg,#132238 0%,#0b111b 330px)!important}
.top{background:#15283d!important;border-bottom:1px solid #48637c!important;box-shadow:0 8px 28px #0005!important}
.content{color:var(--ae-ink)!important}
.logo,h1,h2,h3,h4,.title{color:var(--ae-ink)!important;letter-spacing:-.02em!important}
.muted,.tiny,.ae-bank-note,.ae-command-sub,.ae-buyer-sub,#ae-trade-stock-summary,#ae-trade-market-summary{color:var(--ae-muted)!important;opacity:1!important}
.panel,.card,#ae-command,#ae-bank,#ae-buyers-panel,#ae-world,#ae-economy,#ae-studio,#ae-operations,.ae-iphone-fold{background:var(--ae-surface)!important;border:1px solid var(--ae-stroke)!important;border-radius:16px!important;box-shadow:0 5px 16px #0003!important}
.panel{margin-bottom:11px!important}
#ae-command{background:#1a2d42!important;border-color:#66829c!important}
#ae-command h2,#ae-bank h3,#ae-buyers-panel h3{font-size:17px!important}
#ae-command-stats .ae-command-stat,.ae-bank-grid>div,.ae-buyer-metrics>div,.ae-econ-cell,.ae-world-city,.ae-op-grid div,.ae-studio-stats div{background:var(--ae-raised)!important;border:1px solid #48627a!important}
#ae-command-stats strong,.ae-bank-grid strong,.ae-buyer-metrics strong{color:#fff!important;font-weight:800!important}
#ae-command-stats small,.ae-bank-grid small,.ae-buyer-metrics small{color:#d1e0ed!important}
button,.btn{font-weight:750!important;letter-spacing:.005em!important;transition:background-color .12s,border-color .12s,transform .12s!important}
button:not(.ghost):not(.secondary):not(.ae-fold-head):not([data-tab]):not([data-speed]):not(.smallbtn),#ae-command-actions button:not(.secondary){background:var(--ae-gold)!important;color:#192437!important;border:1px solid #ffe2a0!important}
button.ghost,button.secondary,.ae-neg-quick button,.ae-bank-contract button,#ae-iphone-tools button,.ae-trade-sort{background:#2c4660!important;color:#fff!important;border:1px solid #7390a8!important}
button:disabled{opacity:.55!important;filter:grayscale(.3)!important}
button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #ffdc88!important;outline-offset:2px!important}
button:active:not(:disabled){transform:scale(.98)}
input,select,textarea{color:#fff!important;background:#1e3247!important;border:1px solid #7793aa!important;border-radius:10px!important;min-height:44px!important;font-size:16px!important}
input::placeholder,textarea::placeholder{color:#c6d5e1!important;opacity:1!important}
.bottom{background:#14273b!important;border-top:1px solid #7390a8!important;box-shadow:0 -9px 30px #0007!important}
.bottom button{color:#e6f0f7!important;border:1px solid transparent!important;background:transparent!important}
.bottom button.active,.bottom button[aria-current="page"]{background:#385b77!important;color:#fff!important;border-color:#87a8c3!important}
.ae-fold-head{background:#29435a!important;color:#fff!important}
#ae-iphone-tools button{background:#29445b!important;color:#fff!important;font-size:13px!important}
.ae-trade-chip{background:#225443!important;color:#d3ffe9!important}
.ae-trade-chip.negative,.ae-command-alert.urgent{background:#6c303b!important;color:#fff2f2!important}
.ae-command-alert.good{background:#1d5545!important;color:#e1fff1!important}
.green,.ae-neg-good,.ae-neg-profit{color:var(--ae-green)!important}
.red,.ae-neg-warn,.ae-neg-profit.loss{color:var(--ae-red)!important}
.price{color:var(--ae-gold)!important;font-weight:800!important}
.divider{border-color:#49647a!important}
#modal{z-index:500!important}
#modalbody{color:var(--ae-ink)!important}
#modalbody .panel{background:#1d3045!important}
#ae-neg-analysis,.ae-neg-card,.ae-buyer-profile,.ae-bank-contract{background:#243b52!important;border-color:#6c879e!important;color:#f7fbff!important}
.ae-neg-grid>div{background:#1a2b3e!important}
@media(max-width:430px){
 .content{padding-left:12px!important;padding-right:12px!important}
 #ae-command,#ae-bank,#ae-buyers-panel{padding:14px!important}
 .panel{padding:13px!important}
 .actions{gap:8px!important}
 .actions button{min-height:44px!important}
}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;document.head.append(css);
function syncNav(){
 const buttons=document.querySelectorAll('.bottom [data-tab]');
 buttons.forEach(btn=>{
  const active=btn.classList.contains('active');
  btn.setAttribute('aria-current',active?'page':'false');
 });
}
const observer=new MutationObserver(syncNav);
const nav=document.querySelector('.bottom');if(nav)observer.observe(nav,{attributes:true,attributeFilter:['class'],subtree:true});
syncNav();
})();
