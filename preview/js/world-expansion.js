/* Auto Empire Tycoon — world headquarters and international subsidiaries. */
(function(){
'use strict';
const cities=[
{id:'solara',name:'Solara',country:'Brasil',flag:'🇧🇷',special:'Mercado inicial equilibrado',kind:'Hatch',demand:1,cost:0,upkeep:0,slots:0,detail:'Cidade de origem: operações acessíveis e clientes variados.'},
{id:'saopaulo',name:'São Paulo',country:'Brasil',flag:'🇧🇷',special:'Alto volume de negócios',kind:'Sedã',demand:1.09,cost:38000,upkeep:650,slots:2,detail:'Mais compradores, porém concorrência intensa.'},
{id:'newyork',name:'Nova York',country:'Estados Unidos',flag:'🇺🇸',special:'Mercado premium de alto giro',kind:'SUV',demand:1.14,cost:78000,upkeep:1800,slots:3,detail:'SUVs atraem executivos; custos operacionais elevados.'},
{id:'losangeles',name:'Los Angeles',country:'Estados Unidos',flag:'🇺🇸',special:'Cultura de esportivos',kind:'Esportivo',demand:1.16,cost:71000,upkeep:1400,slots:2,detail:'Esportivos encontram entusiastas e colecionadores.'},
{id:'london',name:'Londres',country:'Reino Unido',flag:'🇬🇧',special:'Clientes exigentes',kind:'Sedã',demand:1.1,cost:76000,upkeep:1550,slots:2,detail:'Boa procura por sedãs, reputação é decisiva.'},
{id:'paris',name:'Paris',country:'França',flag:'🇫🇷',special:'Mobilidade urbana',kind:'Compacto',demand:1.09,cost:60000,upkeep:1100,slots:2,detail:'Compactos têm vantagem em uma cidade densa.'},
{id:'berlin',name:'Berlim',country:'Alemanha',flag:'🇩🇪',special:'Compra técnica e criteriosa',kind:'Sedã',demand:1.1,cost:63000,upkeep:1000,slots:2,detail:'Sedãs e veículos bem revisados são valorizados.'},
{id:'tokyo',name:'Tóquio',country:'Japão',flag:'🇯🇵',special:'Precisão e compactos',kind:'Compacto',demand:1.15,cost:84000,upkeep:1450,slots:2,detail:'Carros compactos e em ótima condição vendem melhor.'},
{id:'seoul',name:'Seul',country:'Coreia do Sul',flag:'🇰🇷',special:'Mercado tecnológico',kind:'Hatch',demand:1.12,cost:67000,upkeep:1100,slots:2,detail:'Hatches recentes têm maior apelo.'},
{id:'dubai',name:'Dubai',country:'Emirados Árabes Unidos',flag:'🇦🇪',special:'Luxo e alto valor',kind:'Esportivo',demand:1.19,cost:105000,upkeep:2000,slots:3,detail:'Esportivos podem gerar margens altas, mas o investimento é grande.'},
{id:'singapore',name:'Singapura',country:'Singapura',flag:'🇸🇬',special:'Espaço caro e eficiência',kind:'Compacto',demand:1.13,cost:97000,upkeep:1900,slots:2,detail:'Compactos são procurados, enquanto os custos são altos.'},
{id:'sydney',name:'Sydney',country:'Austrália',flag:'🇦🇺',special:'Aventura e utilitários',kind:'SUV',demand:1.12,cost:74000,upkeep:1150,slots:2,detail:'SUVs e picapes são escolhas frequentes.'},
{id:'toronto',name:'Toronto',country:'Canadá',flag:'🇨🇦',special:'Demanda familiar',kind:'SUV',demand:1.11,cost:68000,upkeep:1000,slots:2,detail:'SUVs familiares têm maior procura.'},
{id:'mexicocity',name:'Cidade do México',country:'México',flag:'🇲🇽',special:'Mercado de entrada',kind:'Compacto',demand:1.1,cost:48000,upkeep:700,slots:2,detail:'Compactos de preço acessível giram rapidamente.'},
{id:'buenosaires',name:'Buenos Aires',country:'Argentina',flag:'🇦🇷',special:'Oportunidades de baixo capital',kind:'Hatch',demand:1.08,cost:42000,upkeep:650,slots:2,detail:'Hatches e usados acessíveis são o foco.'},
{id:'rome',name:'Roma',country:'Itália',flag:'🇮🇹',special:'Estilo urbano',kind:'Compacto',demand:1.1,cost:58000,upkeep:900,slots:2,detail:'Compactos ganham espaço no centro histórico.'},
{id:'mumbai',name:'Mumbai',country:'Índia',flag:'🇮🇳',special:'Alto volume popular',kind:'Compacto',demand:1.13,cost:51000,upkeep:850,slots:2,detail:'Mercado grande, com forte preferência por veículos acessíveis.'}
];
const byId=id=>cities.find(c=>c.id===id);
const escape=v=>esc(String(v??''));
const cash=n=>fmt(Math.round(n));
function ensureWorld(){
 if(!s.empire||typeof s.empire!=='object')s.empire={};
 const e=s.empire;
 if(!e.world||typeof e.world!=='object')e.world={};
 const w=e.world;
 if(!Array.isArray(w.owned))w.owned=['solara'];
 w.owned=[...new Set(w.owned.filter(id=>!!byId(id)))];
 if(!w.owned.includes('solara'))w.owned.unshift('solara');
 if(!byId(w.hq))w.hq='solara';
 if(!byId(w.active)||!w.owned.includes(w.active))w.active='solara';
 if(!Number.isFinite(Number(w.totalUpkeep)))w.totalUpkeep=0;
 if(!Number.isFinite(Number(w.acquisitions)))w.acquisitions=0;
 if(!Array.isArray(w.history))w.history=[];
 return w;
}
const styles=document.createElement('style');styles.textContent=`
#ae-world{margin:12px 0;padding:14px;background:#102a38;border:1px solid #456678;border-radius:13px}
#ae-world h3{margin:0;color:#f2d08c;font-size:15px}
.ae-world-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.ae-world-top small{color:#b9cbd2}
.ae-world-toolbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}
.ae-world-toolbar select{width:100%;min-width:0;padding:10px;background:#0b1e2a;border:1px solid #577383;border-radius:8px;color:#f1f5f5;font-size:13px}
.ae-world-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.ae-world-city{padding:12px;background:#1a3644;border:1px solid #486777;border-radius:11px;display:flex;flex-direction:column;gap:5px}
.ae-world-city.owned{border-color:#b89b5e}
.ae-world-city strong{font-size:14px}
.ae-world-city small{font-size:11px;color:#c4d5dc;line-height:1.45}
.ae-world-city button{margin-top:auto;min-height:40px;font-size:12px}
.ae-world-kpi{font-size:11px;color:#e6d199;margin:8px 0}
@media(max-width:390px){.ae-world-grid{grid-template-columns:1fr}}
`;document.head.appendChild(styles);
const panel=document.createElement('section');panel.id='ae-world';panel.innerHTML='<div class="ae-world-top"><h3>🌍 Rede internacional</h3><small id="ae-world-count"></small></div><p class="tiny">Escolha sua sede e adquira subsidiárias em mercados com especializações diferentes. Cada unidade adiciona vagas e custos mensais.</p><div class="ae-world-toolbar"><label class="tiny">Sede global<select id="ae-world-hq"></select></label><label class="tiny">Mercado ativo<select id="ae-world-active"></select></label></div><div class="ae-world-kpi" id="ae-world-kpi"></div><div class="ae-world-grid" id="ae-world-cities"></div>';
const garage=document.getElementById('garage');if(garage)garage.append(panel);
function renderWorld(){
 if(!s)return;const w=ensureWorld(),hq=byId(w.hq),active=byId(w.active);
 document.getElementById('ae-world-count').textContent=w.owned.length+' mercados · '+new Set(w.owned.map(id=>byId(id).country)).size+' países';
 document.getElementById('ae-world-kpi').textContent='Sede: '+hq.name+', '+hq.country+' · Operando: '+active.name+' · Custo internacional: '+cash(w.owned.reduce((n,id)=>n+byId(id).upkeep,0))+'/30 dias';
 const options=cities.map(c=>'<option value="'+c.id+'">'+c.flag+' '+escape(c.name)+' · '+escape(c.country)+'</option>').join('');
 const hqSel=document.getElementById('ae-world-hq');hqSel.innerHTML=options;hqSel.value=w.hq;
 const activeSel=document.getElementById('ae-world-active');activeSel.innerHTML=cities.filter(c=>w.owned.includes(c.id)).map(c=>'<option value="'+c.id+'">'+c.flag+' '+escape(c.name)+'</option>').join('');activeSel.value=w.active;
 document.getElementById('ae-world-cities').innerHTML=cities.map(c=>{
 const owned=w.owned.includes(c.id),active=c.id===w.active;
 return '<article class="ae-world-city '+(owned?'owned':'')+'"><strong>'+c.flag+' '+escape(c.name)+'</strong><small>'+escape(c.country)+' · '+escape(c.special)+'</small><small>'+escape(c.detail)+'</small><small>Especialidade: '+escape(c.kind)+' · demanda '+Math.round((c.demand-1)*100)+'% · custo '+cash(c.upkeep)+'/mês</small><small>'+(owned?'Subsidiária própria · +'+c.slots+' vagas':'Aquisição: '+cash(c.cost)+' · +'+c.slots+' vagas')+'</small><button type="button" data-world-city="'+c.id+'" '+(active?'disabled':'')+'>'+(active?'Mercado ativo':owned?'Operar nesta cidade':'Adquirir subsidiária')+'</button></article>';
 }).join('');
}
panel.addEventListener('click',ev=>{
 const btn=ev.target.closest('[data-world-city]');if(!btn)return;
 const c=byId(btn.dataset.worldCity),w=ensureWorld();if(!c)return;
 if(w.owned.includes(c.id)){w.active=c.id;note('Mercado ativo: '+c.name);save();render();return}
 if(s.cash<c.cost)return toast('Capital insuficiente para '+c.name);
 if(!confirm('Adquirir subsidiária em '+c.name+' por '+cash(c.cost)+'? Custo fixo adicional: '+cash(c.upkeep)+'/30 dias.'))return;
 s.cash-=c.cost;s.slots+=c.slots;w.owned.push(c.id);w.active=c.id;w.acquisitions++;
 w.history.unshift({day:s.day,city:c.id,cost:c.cost});w.history=w.history.slice(0,30);
 entry('Subsidiária · '+c.name,-c.cost);note('Subsidiária inaugurada em '+c.name+'!');save();render();toast('Nova subsidiária: '+c.name);
});
document.getElementById('ae-world-hq').addEventListener('change',ev=>{
 const c=byId(ev.target.value),w=ensureWorld();if(!c)return;
 if(!w.owned.includes(c.id)){toast('Adquira uma subsidiária nesta cidade antes de transferir a sede.');renderWorld();return}
 if(w.hq===c.id)return;
 if(!confirm('Transferir a sede global para '+c.name+', '+c.country+'?')){renderWorld();return}
 w.hq=c.id;note('Sede global transferida para '+c.name+', '+c.country);save();render();toast('Sede transferida');
});
document.getElementById('ae-world-active').addEventListener('change',ev=>{const w=ensureWorld(),c=byId(ev.target.value);if(!c||!w.owned.includes(c.id))return;w.active=c.id;note('Mercado ativo: '+c.name);save();render()});
const prevSeed=seed;
seed=function(){prevSeed();ensureWorld();save()};
const prevTick=tickDay;
tickDay=function(){
 const before=s.day;prevTick();if(s.day===before)return;
 const w=ensureWorld();
 if(s.day%30===0){const upkeep=w.owned.reduce((sum,id)=>sum+(byId(id)?.upkeep||0),0);if(upkeep){s.cash-=upkeep;w.totalUpkeep+=upkeep;entry('Custos internacionais',-upkeep);note('Subsidiárias: despesas mensais de '+cash(upkeep))}}
 // Local advantage applies to buyer proposals created on this simulated day.
 // Existing offers are never altered by switching markets.
 save();
};
const prevMakeCar=makeCar;
makeCar=function(){
 const c=prevMakeCar(),w=ensureWorld(),city=byId(w.active)||cities[0];
 c.originCity=city.id;
 return c;
};
const prevPopulate=populate;
populate=function(){prevPopulate();const w=ensureWorld(),city=byId(w.active)||cities[0];s.market.forEach(c=>{c.originCity=city.id});save()};
const prevSubmit=submitBid;
submitBid=function(){
 const before=new Set(s.stock.map(c=>c.id)),w=ensureWorld(),city=w.active;
 prevSubmit();
 const acquired=s.stock.find(c=>!before.has(c.id));
 if(acquired){acquired.originCity=city;save()}
};
const prevRender=render;
render=function(){prevRender();renderWorld()};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(renderWorld);
renderWorld();
window.AEWorld=Object.freeze({cities:cities.map(c=>Object.freeze({...c})),getActive:()=>byId(ensureWorld().active),getHQ:()=>byId(ensureWorld().hq)});
})();
