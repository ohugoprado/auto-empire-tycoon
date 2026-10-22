/* iPhone-first experience — portrait, touch, safe areas and native-like navigation. */
(function(){
'use strict';
const css=document.createElement('style');
css.textContent=`
:root{color-scheme:dark;-webkit-text-size-adjust:100%;text-size-adjust:100%}
html{overscroll-behavior-y:contain;scroll-padding-top:16px}
body{width:100%;overflow-x:hidden;-webkit-tap-highlight-color:transparent}
.shell{width:100%;max-width:560px!important;min-height:100svh;margin-inline:auto;padding-bottom:calc(102px + env(safe-area-inset-bottom,0px))!important}
.top{padding-top:calc(14px + env(safe-area-inset-top,0px))!important}
.content{padding-left:12px!important;padding-right:12px!important;padding-bottom:calc(108px + env(safe-area-inset-bottom,0px))!important}
.bottom{position:fixed!important;bottom:0!important;left:50%!important;transform:translateX(-50%);width:100%!important;max-width:560px!important;z-index:200!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:3px!important;padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px))!important;background:rgba(13,26,37,.97)!important;border-top:1px solid #405465!important;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.bottom button{min-width:0!important;min-height:54px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:3px!important;padding:6px 2px!important;font-size:11px!important;line-height:1.15!important;white-space:normal!important;touch-action:manipulation}
button,.ae-world-city button,.ae-studio-actions button,.ae-econ-actions button,.ae-op-controls button{min-height:44px}
button:active:not(:disabled){filter:brightness(1.12)}
input,select,textarea{font-size:16px!important;max-width:100%;min-height:44px}
input[type=range]{min-height:34px;touch-action:pan-x}
input[type=checkbox],input[type=radio]{min-height:22px;min-width:22px}
.panel,.ae-world-city,.ae-studio-item{overflow-wrap:anywhere}
.ae-world-toolbar,.ae-world-grid,.ae-studio-grid,.ae-studio-stats,.ae-op-grid,.ae-econ-grid{min-width:0}
.ae-world-toolbar>*,.ae-world-grid>*,.ae-studio-grid>*,.ae-studio-stats>*,.ae-op-grid>*,.ae-econ-grid>*{min-width:0}
#ae-world,#ae-economy,#ae-studio,#ae-operations{scroll-margin-top:16px}
#garage,#market,#reports,#events{scroll-margin-top:12px}
.modal,.modal-backdrop,[role=dialog]{overscroll-behavior:contain}
#modalbody{max-height:min(78svh,760px);overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:env(safe-area-inset-bottom,0px)}
#modalbody button{min-height:44px}
:focus-visible{outline:2px solid #ffce75;outline-offset:3px}
@media(max-width:430px){
 .top{gap:8px!important}
 .logo{font-size:17px!important}
 .stats{gap:6px!important}
 .stats .stat{padding:10px 6px!important}
 .stats .stat .num{font-size:clamp(14px,4vw,19px)!important}
 .ae-world-grid{grid-template-columns:1fr!important}
 .ae-studio-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
 .ae-studio-grid label{font-size:12px!important}
 .ae-econ-actions,.ae-studio-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}
 .ae-econ-actions button,.ae-studio-actions button{width:100%;min-width:0}
}
@media(max-width:350px){
 .ae-studio-grid,.ae-econ-actions,.ae-studio-actions{grid-template-columns:1fr!important}
 .bottom button{font-size:10px!important}
}
@media(prefers-reduced-motion:reduce){
 *,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;transition-duration:.01ms!important}
}
`;
document.head.append(css);
const nav=document.querySelector('.bottom');
if(nav){
 nav.setAttribute('aria-label','Navegação principal');
 const names={garage:'Garagem',market:'Mercado',reports:'Finanças',events:'Histórico'};
 nav.querySelectorAll('button[data-tab]').forEach(b=>{
  const key=b.dataset.tab;
  if(names[key])b.setAttribute('aria-label',names[key]);
 });
}
function restoreFocus(){
 const active=document.activeElement;
 if(active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)&&typeof active.blur==='function')active.blur();
}
document.querySelectorAll('.bottom button[data-tab]').forEach(button=>{
 button.addEventListener('click',()=>{
  restoreFocus();
  window.requestAnimationFrame?.(()=>{
   window.scrollTo?.({top:0,behavior:'auto'});
  });
 },{passive:true});
});
// Let the browser reveal focused fields inside the scrollable dialog. A delayed
// smooth scroll can move a button while the player is already tapping it.
const media=window.matchMedia?.('(display-mode:standalone)');
function updateMode(){document.documentElement.classList.toggle('ae-ios-installed',!!(media?.matches||navigator.standalone))}
updateMode();
media?.addEventListener?.('change',updateMode);
})();
