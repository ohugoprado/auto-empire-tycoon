/* Alpha 4.3 — iPhone modal usability and accessible keyboard focus. */
(function(){
'use strict';
const backdrop=document.getElementById('modal'),body=document.getElementById('modalbody');
if(!backdrop||!body)return;
backdrop.setAttribute('role','presentation');
body.setAttribute('role','dialog');body.setAttribute('aria-modal','true');body.setAttribute('tabindex','-1');
const style=document.createElement('style');style.textContent=`
#modal.modalbg{padding:calc(10px + env(safe-area-inset-top,0px)) 10px calc(10px + env(safe-area-inset-bottom,0px))!important;align-items:center!important}
#modalbody{width:100%!important;max-width:530px!important;max-height:calc(100dvh - 24px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px))!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;outline:none}
#modalbody .ae-dialog-close{display:flex;align-items:center;justify-content:center;position:sticky;top:0;margin-left:auto;margin-bottom:8px;width:44px;min-height:44px;border-radius:10px!important;background:#2b4055!important;color:#fff!important;border:1px solid #536d86!important;z-index:3}
#modalbody input,#modalbody select{width:100%;max-width:100%;box-sizing:border-box}
#modalbody .actions button{min-width:110px}
@media(max-width:360px){#modalbody .actions{display:grid!important;grid-template-columns:1fr!important}#modalbody .actions button{width:100%!important}}
`;document.head.append(style);
let returnFocus=null;
function sync(){
 if(backdrop.classList.contains('hide'))return;
 const title=body.querySelector('h1,h2,h3');
 if(title){if(!title.id)title.id='ae-dialog-title';body.setAttribute('aria-labelledby',title.id)}
 else body.removeAttribute('aria-labelledby');
 if(!body.querySelector('.ae-dialog-close')){
  const close=document.createElement('button');close.type='button';close.className='ae-dialog-close';close.setAttribute('aria-label','Fechar janela');close.textContent='Fechar';
  close.addEventListener('click',()=>closeModal());body.prepend(close);
 }
}
const originalOpen=open;
open=function(html){returnFocus=document.activeElement;const result=originalOpen(html);sync();requestAnimationFrame(()=>{if(!backdrop.classList.contains('hide'))body.querySelector('input:not([disabled]),select:not([disabled]),.ae-dialog-close')?.focus({preventScroll:true})});return result};
const originalClose=closeModal;
closeModal=function(){const result=originalClose();if(returnFocus?.isConnected&&typeof returnFocus.focus==='function')returnFocus.focus({preventScroll:true});returnFocus=null;return result};
body.addEventListener('keydown',event=>{
 if(backdrop.classList.contains('hide'))return;
 if(event.key==='Escape'){event.preventDefault();closeModal();return}
 if(event.key!=='Tab')return;
 const focusable=[...body.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
 if(!focusable.length){event.preventDefault();body.focus();return}
 const first=focusable[0],last=focusable[focusable.length-1];
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
});
})();
