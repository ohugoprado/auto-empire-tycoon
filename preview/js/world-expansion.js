/* Auto Empire Tycoon — world headquarters and international subsidiaries. */
(function(){
'use strict';
const cities=[
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
 if(!Array.isArray(w.owned)){let start='saopaulo';try{const p=JSON.parse(localStorage.getItem('autoempire_company_profile_v1')||'null');if(byId(p?.headquarters))start=p.headquarters}catch(e){}w.owned=[start];w.hq=start;w.active=start;w.founded=start}
 w.owned=[...new Set(w.owned.map(id=>id==='solara'?'saopaulo':id).filter(id=>!!byId(id)))];
 if(!w.owned.length)w.owned=['saopaulo'];
 // Existing campaigns migrated from Solara retain their free founding branch.
 if(w.founded==='solara')w.founded='saopaulo';
 if(!byId(w.founded)||!w.owned.includes(w.founded))w.founded=w.owned[0];
 if(w.hq==='solara')w.hq='saopaulo';if(!byId(w.hq)||!w.owned.includes(w.hq))w.hq=w.owned[0];
 if(w.active==='solara')w.active='saopaulo';if(!byId(w.active)||!w.owned.includes(w.active))w.active=w.owned[0];
 if(!Number.isFinite(Number(w.totalUpkeep)))w.totalUpkeep=0;
 if(!Number.isFinite(Number(w.acquisitions)))w.acquisitions=0;
 if(!Array.isArray(w.history))w.history=[];
 return w;
}
const panel=document.createElement('section');panel.id='ae-world';
panel.setAttribute('aria-labelledby','ae-world-title');
panel.innerHTML='<div class="ae-world-top"><h3 id="ae-world-title">Sua rede de subsidiárias</h3><small id="ae-world-count"></small></div>'+
 '<p class="tiny ae-world-shared">Uma operação compartilhada: estoque, vagas, equipe e produção são administrados juntos. Troque de mercado com um toque, sem visitar cada filial para repetir tarefas.</p>'+
 '<div class="ae-world-summary" id="ae-world-summary"></div><p class="ae-world-kpi" id="ae-world-kpi"></p>'+
 '<section aria-labelledby="ae-world-owned-title"><div class="ae-world-section-head"><h4 id="ae-world-owned-title" tabindex="-1">Suas unidades</h4><span id="ae-world-active-label"></span></div><div id="ae-world-owned" class="ae-world-owned"></div></section>'+
 '<details id="ae-world-settings" class="ae-world-details"><summary>Sede e seleção de mercado</summary><p class="tiny">Mudar o mercado ativo é gratuito. A sede pode ser transferida entre suas unidades, com confirmação.</p><div class="ae-world-toolbar"><label for="ae-world-hq">Sede global<select id="ae-world-hq"></select></label><label for="ae-world-active">Mercado ativo<select id="ae-world-active"></select></label></div></details>'+
 '<details id="ae-world-expansion" class="ae-world-details"><summary>Expandir a rede <span id="ae-world-expansion-count"></span></summary><p class="tiny">Aquisições adicionam vagas ao estoque compartilhado e despesas a cada 30 dias. O resumo da rede já considera o desconto de 10% nos custos internacionais.</p><label class="ae-world-search" for="ae-world-search">Encontrar cidade ou especialidade<input id="ae-world-search" type="search" placeholder="Cidade, país ou categoria" autocomplete="off"></label><p id="ae-world-search-results" class="tiny" aria-live="polite"></p><div class="ae-world-grid" id="ae-world-cities"></div></details>';
const garage=document.getElementById('garage');if(garage)garage.append(panel);
const cityList=panel.querySelector('#ae-world-cities'),ownedList=panel.querySelector('#ae-world-owned');
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function monthlyCost(w){return Math.round(w.owned.reduce((sum,id)=>sum+byId(id).upkeep,0)*.9)}
function renderExpansion(w){
 const query=normalize(panel.querySelector('#ae-world-search').value);
 const available=cities.filter(c=>!w.owned.includes(c.id));
 const found=available.filter(c=>normalize([c.name,c.country,c.kind,c.special].join(' ')).includes(query));
 panel.querySelector('#ae-world-expansion-count').textContent=available.length?'· '+available.length+' destinos':'· rede completa';
 panel.querySelector('#ae-world-search-results').textContent=found.length+' de '+available.length+' destinos disponíveis';
 cityList.innerHTML=found.length?found.map(c=>'<article class="ae-world-city" data-world-destination="'+c.id+'"><strong>'+escape(c.name)+'</strong><small>'+escape(c.country)+' · '+escape(c.kind)+' · demanda +'+Math.round((c.demand-1)*100)+'%</small><p>'+escape(c.detail)+'</p><dl><div><dt>Aquisição</dt><dd>'+cash(c.cost)+'</dd></div><div><dt>Custo base /30 dias</dt><dd>'+cash(c.upkeep)+'</dd></div><div><dt>Vagas na rede</dt><dd>+'+c.slots+'</dd></div></dl>'+(s.cash<c.cost?'<small class="ae-world-funds">Faltam '+cash(c.cost-s.cash)+' para adquirir.</small>':'')+'<button type="button" data-world-city="'+c.id+'" aria-label="Adquirir subsidiária em '+escape(c.name)+'">Adquirir subsidiária</button></article>').join(''):'<p class="tiny ae-world-no-results">'+(available.length?'Nenhum destino combina com a busca.':'Todas as cidades disponíveis fazem parte da sua rede.')+'</p>';
}
let lastWorldSignature='';
function renderWorld(){
 if(!s)return;const w=ensureWorld(),hq=byId(w.hq),active=byId(w.active);
 const reserved=Array.isArray(s.empire?.economy?.factory?.queue)?s.empire.economy.factory.queue.length:0;
 const signature=JSON.stringify([w.hq,w.active,w.owned,s.cash,s.slots,s.stock?.length||0,reserved]);
 if(signature===lastWorldSignature)return;lastWorldSignature=signature;
 panel.querySelector('#ae-world-count').textContent=w.owned.length+' '+(w.owned.length===1?'unidade':'unidades')+' · '+new Set(w.owned.map(id=>byId(id).country)).size+' '+(new Set(w.owned.map(id=>byId(id).country)).size===1?'país':'países');
 panel.querySelector('#ae-world-summary').innerHTML='<div><small>Unidades próprias</small><strong>'+w.owned.length+'</strong></div><div><small>Custo da rede /30 dias</small><strong>'+cash(monthlyCost(w))+'</strong></div><div><small>Estoque compartilhado</small><strong>'+(s.stock?.length||0)+'/'+s.slots+'</strong><small>'+reserved+' vaga(s) reservada(s)</small></div>';
 panel.querySelector('#ae-world-kpi').textContent='Sede: '+hq.name+' · Mercado ativo: '+active.name+'. Trocar de mercado não altera propostas já recebidas.';
 panel.querySelector('#ae-world-active-label').textContent='Operando em '+active.name;
 const options=cities.filter(c=>w.owned.includes(c.id)).map(c=>'<option value="'+c.id+'">'+escape(c.name)+' · '+escape(c.country)+'</option>').join('');
 const hqSel=panel.querySelector('#ae-world-hq'),activeSel=panel.querySelector('#ae-world-active');
 hqSel.innerHTML=options;hqSel.value=w.hq;activeSel.innerHTML=options;activeSel.value=w.active;
 ownedList.innerHTML=w.owned.map(id=>{
  const c=byId(id),isActive=id===w.active;
  return '<article class="ae-world-owned-city" data-world-owned="'+c.id+'"><div><h5>'+escape(c.name)+(id===w.hq?'<span class="ae-world-badge">Sede</span>':'')+'</h5><p>'+escape(c.country)+' · '+escape(c.kind)+' · demanda +'+Math.round((c.demand-1)*100)+'%</p><small>Custo base: '+cash(c.upkeep)+'/30 dias · '+(id===w.founded?'Unidade inicial':('+'+c.slots+' vagas adquiridas'))+'</small></div><button type="button" data-world-city="'+c.id+'" aria-pressed="'+isActive+'" aria-label="'+(isActive?'Mercado ativo: ':'Operar em ')+escape(c.name)+'"'+(isActive?' disabled':'')+'>'+(isActive?'Mercado ativo':'Operar aqui')+'</button></article>';
 }).join('');
 renderExpansion(w);
}
function switchMarket(c,w){
 if(w.active===c.id)return;
 w.active=c.id;note('Mercado ativo: '+c.name);save();render();
}
panel.querySelector('#ae-world-search').addEventListener('input',()=>renderExpansion(ensureWorld()));
panel.addEventListener('click',ev=>{
 const btn=ev.target.closest('[data-world-city]');if(!btn||!panel.contains(btn)||btn.disabled)return;
 const c=byId(btn.dataset.worldCity),w=ensureWorld();if(!c)return;
 if(w.owned.includes(c.id)){switchMarket(c,w);return}
 if(s.empire?.economy?.bankrupt)return toast('Campanha encerrada por falência');
 if(s.cash<c.cost)return toast('Capital insuficiente para '+c.name);
 if(!confirm('Adquirir subsidiária em '+c.name+' por '+cash(c.cost)+'? Custo base adicional: '+cash(c.upkeep)+'/30 dias, com desconto de 10% no total da rede.'))return;
 // Revalidate after confirmation: stale/repeated controls cannot acquire twice.
 const current=ensureWorld();
 if(current.owned.includes(c.id)){render();return}
 if(s.empire?.economy?.bankrupt)return toast('Campanha encerrada por falência');
 if(s.cash<c.cost)return toast('Capital insuficiente para '+c.name);
 s.cash-=c.cost;s.slots+=c.slots;current.owned.push(c.id);current.active=c.id;current.acquisitions++;
 current.history.unshift({day:s.day,city:c.id,cost:c.cost});current.history=current.history.slice(0,30);
 entry('Subsidiária · '+c.name,-c.cost);note('Subsidiária inaugurada em '+c.name+'!');save();render();toast('Nova subsidiária: '+c.name);
 panel.querySelector('#ae-world-owned-title').focus({preventScroll:true});
});
panel.querySelector('#ae-world-hq').addEventListener('change',ev=>{
 const c=byId(ev.target.value),w=ensureWorld();
 if(!c||!w.owned.includes(c.id)){ev.target.value=w.hq;return toast('Adquira uma subsidiária nesta cidade antes de transferir a sede.')}
 if(w.hq===c.id)return;
 if(!confirm('Transferir a sede global para '+c.name+', '+c.country+'?')){ev.target.value=w.hq;return}
 w.hq=c.id;note('Sede global transferida para '+c.name+', '+c.country);save();render();toast('Sede transferida');
});
panel.querySelector('#ae-world-active').addEventListener('change',ev=>{
 const w=ensureWorld(),c=byId(ev.target.value);
 if(!c||!w.owned.includes(c.id)){ev.target.value=w.active;return}
 switchMarket(c,w);
});
const prevSeed=seed;
seed=function(){prevSeed();ensureWorld();save()};
const prevTick=tickDay;
tickDay=function(){
 const before=s.day;prevTick();if(s.day===before)return;
 const w=ensureWorld();
 if(s.day%30===0){const upkeep=Math.round(w.owned.reduce((sum,id)=>sum+(byId(id)?.upkeep||0),0)*.9);if(upkeep){s.cash-=upkeep;w.totalUpkeep+=upkeep;entry('Custos internacionais',-upkeep);note('Subsidiárias: despesas mensais de '+cash(upkeep))}}
 // Local advantage applies to buyer proposals created on this simulated day.
 // Existing offers are never altered by switching markets.
 save();
};
const prevOffers=offersDialog;
offersDialog=function(id){prevOffers(id);const car=s.stock.find(c=>c.id===id),city=byId(car?.originCity)||byId(ensureWorld().active);if(!car||!city)return;const body=document.getElementById('modalbody');const el=document.createElement('p');el.className='tiny';el.textContent='Mercado de origem: '+city.name+' · especialidade local: '+city.kind+'.';body.append(el)};
const prevMakeCar=makeCar;
makeCar=function(){
 const c=prevMakeCar(),w=ensureWorld(),city=byId(w.active)||cities[0];
 c.originCity=city.id;
 return c;
};
const prevBuy=buyDialog;
buyDialog=function(id){prevBuy(id);const car=s.market.find(c=>c.id===id),city=byId(ensureWorld().active);if(!car||!city)return;const body=document.getElementById('modalbody');const el=document.createElement('p');el.className='tiny';el.textContent='Mercado: '+city.name+' · '+city.special+'.';body.append(el)};
const prevPopulate=populate;
populate=function(){prevPopulate();const w=ensureWorld(),city=byId(w.active)||cities[0];s.market.forEach(c=>{c.originCity=city.id});save()};
const prevDayOffers=tickDay;
tickDay=function(){const counts=new Map(s.stock.map(c=>[c.id,(c.offers||[]).length]));prevDayOffers();for(const car of s.stock){const city=byId(car.originCity)||byId(ensureWorld().active);const arr=car.offers||[];const start=counts.get(car.id)||0;if(city&&car.kind===city.kind){for(let i=start;i<arr.length;i++){arr[i].amount=Math.max(100,Math.round(arr[i].amount*(1+(city.demand-1)*.35)/100)*100)}}}save()};
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
