/* Auto Empire — original vector icon language and restrained iPhone UI. */
(function(){
'use strict';
const paths={
car:'<path d="M4 15l1.5-5a3 3 0 0 1 2.9-2.1h7.2a3 3 0 0 1 2.9 2.1L20 15"/><path d="M3 15h18v4H3zM6 19v2m12-2v2M4 12h16M7 16h2m6 0h2"/>',
garage:'<path d="M3 21V9l9-6 9 6v12M7 21V11h10v10M7 15h10M7 18h10"/>',
market:'<path d="M3 9l2-5h14l2 5v12H3V9zM3 9h18M8 21v-8h8v8M6 9v3m6-3v3m6-3v3"/>',
chart:'<path d="M3 20h18M5 17v-5m5 5V7m5 10V9m5 8V4"/>',
wallet:'<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2M6 6V4h12"/>',
people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 6a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/>',
bank:'<path d="M2 9l10-6 10 6M3 10h18M5 10v9m5-9v9m4-9v9m5-9v9M2 21h20M3 19h18"/>',
factory:'<path d="M3 21V10l6 4V9l6 5V5h6v16H3zM7 18h2m3 0h2m3 0h2"/>',
tools:'<path d="M14 7a5 5 0 0 0-6 6L3 18l3 3 5-5a5 5 0 0 0 6-6l-3 3-3-3z"/>',
world:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/>',
bolt:'<path d="M13 2L5 13h7l-1 9 8-12h-7z"/>',
shield:'<path d="M12 2l8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6zM9 12l2 2 4-4"/>',
handshake:'<path d="M2 9l5-4 5 3 4-3 6 4-4 9-4 2-4-3-3 1zM8 13l4-4M13 14l4 3M10 16l3 3"/>',
tag:'<path d="M3 4h10l8 8-9 9-9-9V4z"/><circle cx="8" cy="9" r="1.5"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
star:'<path d="M12 2l3 6.4 7 .9-5.1 5 1.2 7-6.1-3.4-6.1 3.4 1.2-7L2 9.3l7-.9z"/>',
alert:'<path d="M12 3L2 21h20L12 3zM12 9v5m0 3v1"/>',
document:'<path d="M6 2h8l5 5v15H6zM14 2v6h5M9 12h7m-7 4h7"/>',
settings:'<circle cx="12" cy="12" r="3"/><path d="M10 2h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1z"/>',
plus:'<path d="M12 4v16M4 12h16"/>',
arrow:'<path d="M4 12h16m-7-7 7 7-7 7"/>',
check:'<path d="M4 12l5 5L20 6"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
coin:'<circle cx="12" cy="12" r="9"/><path d="M15 8h-4a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6H9M12 5v3m0 12v2"/>',
building:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-4h4v4"/>',
trophy:'<path d="M7 4h10v7a5 5 0 0 1-10 0V4zM7 6H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 16v4m-5 1h10"/>',
clipboard:'<rect x="4" y="4" width="16" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8 11h8m-8 4h8"/>'
};
const icon=(name)=>'<svg class="ae-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.document)+'</svg>';
const emoji=[
['🚘','car'],['🚗','car'],['🚙','car'],['🏎️','car'],['🏎','car'],['🚕','car'],
['🏷️','tag'],['🏷','tag'],['🤝','handshake'],['💬','people'],['👥','people'],['👤','people'],
['🏦','bank'],['🏭','factory'],['🛠️','tools'],['🛠','tools'],['🔧','tools'],['⚙️','settings'],['⚙','settings'],
['🌍','world'],['🌎','world'],['🌐','world'],['📊','chart'],['📈','chart'],['📉','chart'],
['💰','wallet'],['💵','coin'],['💸','coin'],['💳','wallet'],['🏢','building'],['🏬','building'],
['⭐','star'],['🌟','star'],['🏆','trophy'],['🎯','star'],['⚠️','alert'],['⚠','alert'],['❗','alert'],
['📋','clipboard'],['📄','document'],['📝','document'],['📅','calendar'],['🗓️','calendar'],
['⏰','clock'],['🕒','clock'],['⏱️','clock'],['⚡','bolt'],['🔔','alert'],['🔒','shield'],
['🛡️','shield'],['🛡','shield'],['🔍','market'],['🛒','market'],['➕','plus'],['✅','check'],
['▶️','arrow'],['▶','arrow'],['Ⅱ','clock'],['🔄','arrow'],['📦','factory'],['🧰','tools'],
['🎨','settings'],['🏁','star'],['🧭','world'],['📍','world'],['💡','bolt'],['📣','alert'],
['🔑','shield'],['🎖️','trophy'],['🎖','trophy'],['🚚','car'],['🔋','bolt']
].sort((a,b)=>b[0].length-a[0].length);
const emojiRegex=new RegExp(emoji.map(x=>x[0].replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')).join('|'),'gu');
const byEmoji=new Map(emoji);
const skipTags=new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION','SVG','TITLE','CODE','PRE']);
function decorateText(node){
 const text=node.nodeValue;
 if(!text||!emojiRegex.test(text))return;
 emojiRegex.lastIndex=0;
 const fragment=document.createDocumentFragment();let offset=0;
 for(const match of text.matchAll(emojiRegex)){
  const i=match.index;if(i>offset)fragment.append(document.createTextNode(text.slice(offset,i)));
  const holder=document.createElement('span');holder.className='ae-icon-wrap';holder.innerHTML=icon(byEmoji.get(match[0]));fragment.append(holder);
  offset=i+match[0].length;
 }
 if(offset<text.length)fragment.append(document.createTextNode(text.slice(offset)));
 node.replaceWith(fragment);
}
function decorate(root){
 if(!root||root.nodeType!==1||root.closest?.('.ae-icon-wrap')||skipTags.has(root.tagName))return;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const targets=[];while(walker.nextNode()){
  const n=walker.currentNode,parent=n.parentElement;
  if(parent&&!parent.closest('.ae-icon-wrap')&&!skipTags.has(parent.tagName)&&!parent.closest('svg,script,style,textarea,code,pre')&&emojiRegex.test(n.nodeValue)){targets.push(n)}
  emojiRegex.lastIndex=0;
 }
 targets.forEach(decorateText);
}
const css=document.createElement('style');css.id='ae-icon-design';
css.textContent=`
:root{--ae-bg:#0c1119;--ae-surface:#182432;--ae-raised:#213246;--ae-stroke:#3e5268;--ae-gold:#f5c56b;--ae-green:#72deb0;--ae-red:#ff9292}
body{background:#0c1119!important}
.shell{background:#0c1119!important}
.top{background:#121f2e!important;border-bottom-color:#33475e!important}
.panel,#ae-command,#ae-bank,#ae-buyers-panel,#ae-world,#ae-economy,#ae-studio,#ae-operations{background:#182432!important;border-color:#3e5268!important;box-shadow:0 3px 12px #0002!important}
.panel{border-radius:13px!important}
#ae-command{background:#1b2b3c!important}
.ae-icon-wrap{display:inline-flex;align-items:center;justify-content:center;vertical-align:-.18em;flex:none;color:inherit}
.ae-icon{display:block;width:1.16em;height:1.16em;stroke:currentColor;flex:none}
button .ae-icon-wrap{margin-right:.28em;vertical-align:-.2em}
.bottom .ae-icon-wrap{margin:0 0 3px!important}
.bottom .ae-icon{width:21px;height:21px;stroke-width:1.75}
.bottom button{font-weight:650!important;letter-spacing:0!important}
.bottom button.active,.bottom button[aria-current="page"]{background:#2b465e!important;border-color:#4c7191!important;color:#f5c56b!important}
.logo{font-size:20px!important;font-weight:850!important}
.logo em{color:#f5c56b!important}
.tag{letter-spacing:1.4px!important;color:#9fb4c6!important}
button:not(.ghost):not(.secondary):not(.ae-fold-head):not([data-tab]):not([data-speed]):not(.smallbtn){background:#f5c56b!important;color:#15202d!important;border-color:#f5c56b!important}
button.ghost,button.secondary,#ae-iphone-tools button{background:#283c51!important;border-color:#536e88!important}
.ae-command-stat,.ae-bank-grid>div,.ae-buyer-metrics>div{background:#213246!important;border-color:#3e5268!important}
.ae-command-stat strong,.ae-bank-grid strong,.ae-buyer-metrics strong{font-variant-numeric:tabular-nums;letter-spacing:-.03em}
h2,h3,.section-head{letter-spacing:-.025em!important}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.actions button{flex:1 1 auto}
#ae-iphone-tools{gap:9px!important}
#ae-iphone-tools button{display:flex;align-items:center;gap:6px}
#ae-trade-stock,#ae-trade-market{background:#1b2b3b!important;border-color:#3e5268!important}
@media(max-width:430px){.content{padding-left:14px!important;padding-right:14px!important}.panel{padding:15px!important}.stats{gap:8px!important}}
`;
document.head.append(css);
decorate(document.body);
let queued=false;
const observer=new MutationObserver(records=>{
 const roots=new Set();
 for(const record of records){
  if(record.type==='characterData'&&record.target.parentElement)roots.add(record.target.parentElement);
  for(const node of record.addedNodes||[])if(node.nodeType===1)roots.add(node);else if(node.nodeType===3&&node.parentElement)roots.add(node.parentElement);
 }
 if(!roots.size||queued)return;
 queued=true;
 requestAnimationFrame(()=>{queued=false;roots.forEach(decorate)});
});
observer.observe(document.body,{childList:true,characterData:true,subtree:true});
})();
