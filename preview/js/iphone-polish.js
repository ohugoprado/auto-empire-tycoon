/* Alpha 4.5 — iPhone readability, touch targets and layout stability. */
(function(){
'use strict';
const style=document.createElement('style');
style.id='ae-iphone-polish-4500';
style.textContent=`
:root{color-scheme:dark;--ae-focus:#f8d68c}
html{-webkit-text-size-adjust:100%;scroll-padding-bottom:calc(110px + env(safe-area-inset-bottom,0px))}
body{overflow-x:hidden;overscroll-behavior-y:contain}
button,input,select,textarea{font-size:max(16px,1em)}
button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--ae-focus)!important;outline-offset:2px!important}
button:disabled{opacity:.55!important}
.panel,.vehicle,.vinfo,.ops-item{min-width:0;overflow-wrap:anywhere}
.num,.price{font-variant-numeric:tabular-nums}
.tiny,.muted,.label{line-height:1.45}
.bottom{padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))!important}
.bottom .navinner button{min-height:52px!important;touch-action:manipulation}
#modalbody{overscroll-behavior:contain}
#modalbody button,#modalbody input,#modalbody select{min-height:44px}
@media(max-width:430px){
.shell{width:100%;max-width:100%}
.stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}
.stats .stat{min-width:0!important;overflow:hidden}
.stats .num{font-size:clamp(12px,3.5vw,18px)!important;white-space:normal!important;overflow-wrap:anywhere}
.actions{gap:8px}
.actions button{min-height:44px}
.section-head{gap:8px;flex-wrap:wrap}
.section-head>.title{min-width:0}
}
@media(max-width:360px){.stats .label{font-size:9px!important;letter-spacing:0!important}.navinner{gap:2px!important}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;
document.head.appendChild(style);
document.title='Auto Empire Tycoon — Alpha 4.5';
const version=document.getElementById('ae-version');
if(version)version.textContent='AUTO EMPIRE TYCOON · ALPHA 4.5';
const tag=document.querySelector('.top .tag');
if(tag)tag.textContent='ALPHA 4.5 · IPHONE';
})();
