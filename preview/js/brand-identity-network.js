/* Auto Empire Tycoon — Alpha 10.5: shared identity across owned fleet and industrial network. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const escapeText=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validColor=x=>/^#[0-9a-f]{6}$/i.test(x)?x:'#2563a0';
const shapes={shield:'M80 12 L137 32 L131 104 Q120 136 80 151 Q40 136 29 104 L23 32 Z',circle:'M80 13 A67 67 0 1 1 79.99 13 Z',hex:'M80 11 L137 45 L137 115 L80 149 L23 115 L23 45 Z',diamond:'M80 10 L147 80 L80 150 L13 80 Z'};
const marks={bolt:'M87 34 L54 85 L78 85 L70 124 L111 69 L84 69 Z',wing:'M25 68 L67 86 L80 76 L93 86 L135 68 L110 99 L80 91 L50 99 Z',star:'M80 38 L91 67 L122 67 L97 86 L106 115 L80 97 L54 115 L63 86 L38 67 L69 67 Z',road:'M69 34 L91 34 L113 122 L89 122 L84 100 L76 100 L71 122 L47 122 Z'};
function factory(){return s?.empire?.economy?.factory}
function logoMarkup(logo){
 if(!logo||!shapes[logo.shape]||!marks[logo.mark])return '';
 const primary=validColor(logo.primary),accent=validColor(logo.accent);
 const letters=String(logo.letters||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
 return '<svg viewBox="0 0 160 160" role="img" aria-label="Emblema da fabricante"><path d="'+shapes[logo.shape]+'" fill="'+primary+'" stroke="'+accent+'" stroke-width="5"/><path d="'+marks[logo.mark]+'" fill="'+accent+'"/>'+(letters?'<rect x="46" y="117" width="68" height="24" rx="8" fill="#102838"/><text x="80" y="134" text-anchor="middle" fill="white" font-family="sans-serif" font-size="16" font-weight="700">'+letters+'</text>':'')+'</svg>';
}
const css=document.createElement('style');css.textContent=`
#ae-brand-network{margin:12px 0;padding:13px;border:1px solid #4d6b7b;border-radius:12px;background:#183441}
#ae-brand-network h3{margin:0 0 9px;font-size:15px;color:#f2d391}
.ae-brand-head{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.ae-brand-head svg{width:68px;height:68px;flex:none}
.ae-brand-head strong{font-size:16px}
.ae-brand-head p{font-size:12px;color:#c6d9e2;margin:4px 0}
.ae-brand-fleet{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ae-brand-unit{padding:9px;background:#244453;border-radius:9px;display:flex;align-items:center;gap:8px;min-width:0}
.ae-brand-unit svg{width:38px;height:38px;flex:none}
.ae-brand-unit strong{font-size:12px;display:block;overflow-wrap:anywhere}
.ae-brand-unit small{font-size:11px;color:#bed3df;display:block}
.ae-brand-caption{font-size:12px;line-height:1.5;color:#c6d9e2}
@media(max-width:400px){.ae-brand-fleet{grid-template-columns:1fr}}
`;document.head.append(css);
const panel=document.createElement('section');panel.id='ae-brand-network';panel.hidden=true;
const network=document.getElementById('ae-industrial-network');
if(network?.parentNode)network.parentNode.insertBefore(panel,network);else garage.append(panel);
function refresh(){
 const f=factory();if(!f?.opened||!f.logo){panel.hidden=true;return}
 const emblem=window.AECompanyEmblem?.svg?.(f.logo)||logoMarkup(f.logo);if(!emblem){panel.hidden=true;return}
 panel.hidden=false;
 const stock=(s.stock||[]).filter(c=>c.manufactured);
 const plants=s.empire?.economy?.plantNetwork?.plants||[];
 const queue=f.queue||[];
 panel.innerHTML='<h3>Identidade da marca no grupo</h3><div class="ae-brand-head">'+emblem+'<div><strong>'+escapeText(f.brand||'Fabricante')+'</strong><p>Emblema corporativo aplicado à frota própria e às unidades industriais.</p></div></div><div class="ae-brand-fleet"><div class="ae-brand-unit">'+emblem+'<div><strong>Fábrica principal</strong><small>'+queue.filter(j=>!j.plantId).length+' ordem(ns)</small></div></div>'+plants.map(p=>'<div class="ae-brand-unit">'+emblem+'<div><strong>'+escapeText(p.name)+'</strong><small>'+queue.filter(j=>String(j.plantId)===String(p.id)).length+' ordem(ns)</small></div></div>').join('')+'</div><h4>Veículos próprios em estoque ('+stock.length+')</h4><div class="ae-brand-fleet">'+stock.slice(0,12).map(c=>'<div class="ae-brand-unit">'+emblem+'<div><strong>'+escapeText(c.name)+'</strong><small>'+escapeText(c.kind||'Veículo')+' · '+(c.listed?'Anunciado':'Em estoque')+'</small></div></div>').join('')+'</div>'+(stock.length>12?'<p class="ae-brand-caption">Exibindo 12 de '+stock.length+' veículos.</p>':'')+(stock.length===0?'<p class="ae-brand-caption">Produza um modelo para vê-lo com o emblema da sua fabricante.</p>':'');
}
const oldRender=render;let last='';
render=function(){const result=oldRender.apply(this,arguments);const f=factory(),next=[f?.opened,JSON.stringify(f?.logo),s?.stock?.map(c=>[c.id,c.listed].join(':')).join(','),s?.empire?.economy?.plantNetwork?.plants?.length,f?.queue?.length].join('|');if(next!==last){last=next;refresh()}return result;};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
