/* Text-first UI for iPhone: remove decorative images and artwork without changing save data. */
(function(){
'use strict';
const style=document.createElement('style');
style.textContent=`
/* Never render decorative assets, car thumbnails or legacy showroom art. */
img,picture,svg image,canvas,video,.carart,.ae-car-thumb,.vehicle-art,.vehicle-image,
.scene-wrap,.studio-hero,.studio-brand,.showroom-art,.city-art,.artwork,
[style*="background-image"],[class*="thumbnail"],[class*="hero-image"]{display:none!important}
body,.shell,.top,.panel,.vehicle,.bottom,#garage,#market,#reports,#events{
 background-image:none!important
}
body{background:#101820!important;color:#f2f5f7!important}
.top{background:#15232e!important;border-bottom:1px solid #334755!important}
.panel{background:#1a2a35!important;border:1px solid #354956!important;box-shadow:none!important}
#garage .panel,#market .panel{padding:14px!important}
.vehicle{align-items:flex-start!important}
.vehicle .vinfo{flex:1!important;max-width:100%!important}
.logo,.section-head .title{letter-spacing:-.025em}
button{border-radius:11px!important}
.bottom{background:#14232e!important}
#ae-world,#ae-economy,#ae-studio,#ae-operations{background:#182935!important;border-color:#3b5260!important}
.ae-world-city,.ae-econ-cell,.ae-op-grid div,.ae-studio-stats div{background:#213541!important}
@media(max-width:430px){
 .shell{max-width:100%!important}
 #stock .panel,#listings .panel{margin-bottom:9px!important}
}
`;
document.head.append(style);
// Avoid fetching decorative assets created later by legacy rendering.
const clean=()=>{
 document.querySelectorAll('img,picture,video,canvas').forEach(el=>{
  if(el.tagName==='IMG'){el.removeAttribute('src');el.removeAttribute('srcset')}
  if(el.tagName==='VIDEO')el.removeAttribute('poster');
 });
};
clean();
const observer=new MutationObserver(records=>{
 for(const rec of records){
  if(rec.type==='childList'&&rec.addedNodes.length){for(const node of rec.addedNodes){if(node.nodeType===1&&(node.matches?.('img,picture,video,canvas')||node.querySelector?.('img,picture,video,canvas'))){clean();return}}}
  if(rec.type==='attributes'&&rec.target?.matches?.('img,video')){const el=rec.target;if(el.hasAttribute('src')||el.hasAttribute('srcset')||el.hasAttribute('poster')){clean();return}}
 }
});
observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset','poster']});
})();
