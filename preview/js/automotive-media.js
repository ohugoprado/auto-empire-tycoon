/* Auto Empire Tycoon — Alpha 11.5: fictional automotive press launch coverage. */
(function(){
'use strict';
const studio=document.getElementById('ae-studio');if(!studio)return;
const outlets=[
 {name:'Revista Volante',type:'Revista',bias:'comfort'},
 {name:'AutoRadar',type:'Site especializado',bias:'tech'},
 {name:'Garagem em Vídeo',type:'Canal de vídeo',bias:'performance'},
 {name:'Pista & Estrada',type:'Portal automotivo',bias:'reliability'}
];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const designs=()=>Array.isArray(s?.empire?.economy?.studio?.designs)?s.empire.economy.studio.designs:[];
const state=()=>{const e=s?.empire?.economy;if(!e)return null;if(!e.mediaCoverage||typeof e.mediaCoverage!=='object')e.mediaCoverage={reviews:[]};if(!Array.isArray(e.mediaCoverage.reviews))e.mediaCoverage.reviews=[];return e.mediaCoverage};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const designKey=d=>String(d.id)+':'+Math.max(1,Math.floor(finite(d.generation,1)))+':'+Math.max(0,Math.floor(finite(d.facelift,0)));
function review(d){
 const media=state();if(!media||!d||d.id==null)return;
 const gen=Math.max(1,Math.floor(finite(d.generation,1))),facelift=Math.max(0,Math.floor(finite(d.facelift,0)));
 const key=designKey(d);
 const existing=media.reviews.find(r=>r&&r.key===key&&Number.isFinite(Number(r.average)));
 if(existing){d.mediaBonus=clamp((Number(existing.average)-70)/500,-.05,.056);return;}
 const base=clamp(finite(d.quality,65),0,100);
 const attributes={comfort:clamp(finite(d.comfort,3),0,5),tech:clamp(finite(d.tech,3),0,5),performance:d.engine==='performance'?5:3,reliability:clamp(finite(d.reliability,3),0,5)};
 const scores=outlets.map((o,i)=>{
  const identity=String(d.id);
  let hash=0;for(let k=0;k<identity.length;k++)hash=(Math.imul(hash,31)+identity.charCodeAt(k))|0;
  const seed=((Math.abs(hash)+gen*19+facelift*11+i*13)%11)-5;
  const score=clamp(Math.round(base*.72+23+(attributes[o.bias]-3)*3+seed),35,98);
  return {name:o.name,type:o.type,score,verdict:score>=85?'Destaque editorial':score>=70?'Boa recepção':score>=55?'Avaliação equilibrada':'Críticas importantes'};
 });
 const average=Math.round(scores.reduce((sum,r)=>sum+r.score,0)/scores.length);
 const entry={key,designId:d.id,model:d.name,generation:gen,facelift,day:s.day,average,scores};
 media.reviews.unshift(entry);media.reviews=media.reviews.slice(0,80);
 // Media reputation impacts only newly built cars, with a limited effect.
 d.mediaBonus=clamp((average-70)/500,-.05,.056);
 note('Imprensa automotiva avaliou '+d.name+' G'+gen+': média '+average+'/100.');
 save();
}
const panel=document.createElement('section');panel.id='ae-auto-media';
panel.innerHTML='<h3>Imprensa automotiva</h3><p class="tiny">Avaliações fictícias de revistas, portais e canais de vídeo a cada lançamento ou reestilização. Notas influenciam moderadamente a recepção comercial dos próximos carros.</p><div id="ae-media-list"></div>';
studio.append(panel);
const css=document.createElement('style');css.textContent=`
#ae-auto-media{margin:12px 0;padding:13px;background:#193746;border:1px solid #5b7584;border-radius:12px}
#ae-auto-media h3{font-size:15px;color:#f2d28c;margin:0 0 7px}
.ae-media-review{background:#234453;padding:11px;border-radius:9px;margin:9px 0}
.ae-media-review h4{margin:0 0 7px;font-size:13px}
.ae-media-review p{font-size:12px;margin:5px 0;line-height:1.5}
.ae-media-score{font-weight:700;color:#f1d58c}
`;document.head.append(css);
function refresh(){
 const media=state();if(!media)return;
 const list=media.reviews.filter(r=>r&&typeof r==='object');
 panel.hidden=!list.length;
 panel.querySelector('#ae-media-list').innerHTML=list.slice(0,12).map(r=>'<article class="ae-media-review"><h4>'+esc(r.model)+' · G'+r.generation+(r.facelift?' · Facelift '+r.facelift:'')+' <span class="ae-media-score">'+r.average+'/100</span></h4>'+(Array.isArray(r.scores)?r.scores:[]).filter(Boolean).map(x=>'<p><b>'+esc(x.name)+'</b> ('+esc(x.type)+') · '+x.score+'/100 · '+esc(x.verdict)+'</p>').join('')+'</article>').join('');
}
const oldRender=render;let signature='';
render=function(){
 const result=oldRender.apply(this,arguments);
 const list=designs();
 const next=list.filter(d=>d&&d.id!=null).map(designKey).join('|')+'#'+(s?.empire?.economy?.mediaCoverage?.reviews?.length||0);
 if(next!==signature){signature=next;for(const d of list)review(d);refresh();}
 return result;
};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
for(const d of designs())review(d);refresh();
})();
