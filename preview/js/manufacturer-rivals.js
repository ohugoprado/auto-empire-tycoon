/* Alpha 4.7 — simulated manufacturer competition. No real-world brands or data. */
(function(){
'use strict';
const garage=document.getElementById('garage');if(!garage)return;
const RIVALS=[
 {id:'nord',name:'Nord Motors',kind:'SUV',base:24},
 {id:'vexa',name:'Vexa Automotive',kind:'Compacto',base:19},
 {id:'atlas',name:'Atlas Mobility',kind:'Sedã',base:17},
 {id:'pulse',name:'Pulse Performance',kind:'Esportivo',base:11}
];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const safe=n=>Number.isFinite(Number(n))?Number(n):0;
const escapeText=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ensure(){
 if(!s?.empire?.economy)return null;
 const e=s.empire.economy;
 if(!e.rivals||typeof e.rivals!=='object')e.rivals={lastDay:0,launches:[],pressure:1};
 const r=e.rivals;
 if(!Array.isArray(r.launches))r.launches=[];
 r.lastDay=Math.max(0,Math.floor(safe(r.lastDay)));
 r.pressure=clamp(safe(r.pressure)||1,.75,1.35);
 return r;
}
function influence(kind){
 const r=ensure();if(!r)return 1;
 const crisis=window.AEEconomy?.crisisFor?.(s.empire?.world?.active);
 const active=r.launches.filter(x=>s.day-x.day<22&&x.kind===kind);
 const effect=active.reduce((a,x)=>a+safe(x.impact),0);
 const recession=crisis&&crisis.id!=='stable'?.96:1;
 return clamp((1-effect)*r.pressure*recession,.65,1.12);
}
function advance(){
 const r=ensure();if(!r||r.lastDay>=s.day)return;
 r.lastDay=s.day;
 r.launches=r.launches.filter(x=>s.day-x.day<22).slice(-12);
 // Predictable cadence, no unbounded accumulation or retroactive changes.
 if(s.day>=8&&s.day%11===0){
  const rival=RIVALS[Math.floor(s.day/11-1)%RIVALS.length];
  const impact=.045+(Math.floor(s.day/11)%3)*.012;
  r.launches.push({id:rival.id,name:rival.name,kind:rival.kind,day:s.day,impact});
  note(rival.name+' lançou um novo modelo '+rival.kind+'. Concorrência aumentou neste segmento.');
 }
 r.pressure=clamp(1-(Math.floor(s.day/30)%4)*.018,.90,1);
}
const section=document.createElement('section');section.id='ae-rival-manufacturers';section.className='panel';
section.innerHTML='<h3>Concorrência entre fabricantes</h3><p class="tiny">Marcas fictícias disputam compradores. Lançamentos reduzem temporariamente as propostas recebidas no mesmo segmento.</p><div id="ae-rival-list"></div><p class="tiny" id="ae-rival-foot"></p>';
const style=document.createElement('style');style.textContent=`
#ae-rival-manufacturers{margin:12px 0;padding:14px}
#ae-rival-manufacturers h3{font-size:15px;margin:0 0 8px;color:#f5d18a}
.ae-rival-row{padding:10px 0;border-bottom:1px solid #385064;display:flex;align-items:center;justify-content:space-between;gap:10px}
.ae-rival-row strong{display:block;font-size:13px}
.ae-rival-row small{display:block;color:#c3d3df;margin-top:4px}
.ae-rival-status{font-size:12px;color:#f5d18a;text-align:right}
`;document.head.append(style);
const economy=document.getElementById('ae-economy');
(economy?.parentElement||garage).insertBefore(section,economy?economy.nextSibling:null);
function refresh(){
 const r=ensure();if(!r)return;
 section.querySelector('#ae-rival-list').innerHTML=RIVALS.map(v=>{
  const active=r.launches.filter(x=>x.id===v.id&&s.day-x.day<22);
  const latest=active[active.length-1];
  const remaining=latest?Math.max(0,22-(s.day-latest.day)):0;
  return '<div class="ae-rival-row"><div><strong>'+escapeText(v.name)+'</strong><small>Especialidade: '+escapeText(v.kind)+'</small></div><div class="ae-rival-status">'+(latest?'Novo modelo · '+remaining+' dia(s)':'Sem lançamento recente')+'</div></div>';
 }).join('');
 section.querySelector('#ae-rival-foot').textContent='Pressão concorrencial: '+Math.round((1-r.pressure)*100)+'% · impactos aplicados apenas a novas propostas.';
}
const previousTick=tickDay;
tickDay=function(){
 const before=s.day;
 const counts=new Map((s.stock||[]).map(c=>[c.id,(c.offers||[]).length]));
 const result=previousTick();
 if(s.day===before)return result;
 advance();
 for(const car of s.stock||[]){
  const offers=car.offers||[],start=counts.get(car.id)||0,modifier=influence(car.kind);
  for(let i=start;i<offers.length;i++){
   if(!offers[i]||!Number.isFinite(Number(offers[i].amount)))continue;
   offers[i].amount=Math.max(100,Math.round(offers[i].amount*modifier/100)*100);
  }
 }
 save();refresh();return result;
};
const previousSeed=seed;
seed=function(){previousSeed();ensure();refresh();};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
ensure();refresh();
const tag=document.querySelector('.top .tag');if(tag)tag.textContent='ALPHA 4.7 · CONCORRÊNCIA';
document.title='Auto Empire Tycoon — Alpha 4.7';
})();
