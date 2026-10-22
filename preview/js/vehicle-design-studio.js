/* Auto Empire Tycoon Alpha 2.6: vehicle design studio and research. */
(function(){
'use strict';
const CATEGORIES={
 Compacto:{base:11500,demand:1.12,days:5},Hatch:{base:13200,demand:1.08,days:5},
 'Sedã':{base:17800,demand:1.03,days:7},SUV:{base:24000,demand:1.08,days:8},
 Picape:{base:25500,demand:1.04,days:9},Esportivo:{base:42000,demand:.91,days:12}
};
const ENGINE={economico:{name:'Econômico',factor:.86,quality:-3},equilibrado:{name:'Equilibrado',factor:1,quality:0},performance:{name:'Performance',factor:1.29,quality:6},eletrico:{name:'Elétrico',factor:1.44,quality:9}};
const escText=v=>esc(String(v??''));
const currency=v=>fmt(Math.round(v));
const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
const panel=document.createElement('section');panel.id='ae-studio';
panel.innerHTML='<div class="ae-studio-head"><h3>🛠️ Centro de desenvolvimento automotivo</h3><span id="ae-studio-points"></span></div><p class="tiny">Desenvolva projetos próprios, invista em engenharia e coloque novos modelos em produção. Os valores são fictícios e ajustados para a economia do jogo.</p><div class="ae-studio-grid"><label>Nome do modelo<input id="ae-design-name" maxlength="28" value="Empire One"></label><label>Segmento<select id="ae-design-kind"></select></label><label>Motorização<select id="ae-design-engine"></select></label><label>Posicionamento<select id="ae-design-position"><option value="budget">Acessível</option><option value="standard" selected>Equilibrado</option><option value="premium">Premium</option></select></label><label>Segurança <span id="ae-design-safety-v">3</span>/5<input id="ae-design-safety" type="range" min="1" max="5" value="3"></label><label>Confiabilidade <span id="ae-design-reliability-v">3</span>/5<input id="ae-design-reliability" type="range" min="1" max="5" value="3"></label><label>Tecnologia <span id="ae-design-tech-v">3</span>/5<input id="ae-design-tech" type="range" min="1" max="5" value="3"></label><label>Conforto <span id="ae-design-comfort-v">3</span>/5<input id="ae-design-comfort" type="range" min="1" max="5" value="3"></label></div><div class="ae-studio-stats" id="ae-studio-stats"></div><div class="ae-studio-actions"><button type="button" data-studio="research">Investir em P&D</button><button type="button" data-studio="save">Homologar projeto</button><button type="button" data-studio="produce">Produzir projeto</button></div><div id="ae-studio-saved"></div>';
const css=document.createElement('style');css.textContent=`
#ae-studio{background:#112b39;border:1px solid #4b6a7a;border-radius:13px;padding:14px;margin:12px 0}
.ae-studio-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
#ae-studio h3{font-size:14px;color:#f3d38f;margin:0}
#ae-studio-points{font-size:12px;color:#e9d69f}
.ae-studio-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:13px 0}
.ae-studio-grid label{font-size:11px;color:#d5e5eb;display:flex;flex-direction:column;gap:5px;min-width:0}
.ae-studio-grid input:not([type=range]),.ae-studio-grid select{width:100%;box-sizing:border-box;min-width:0;min-height:40px;padding:8px;background:#0a1e2a;color:#f0f5f6;border:1px solid #547687;border-radius:8px}
.ae-studio-grid input[type=range]{width:100%;accent-color:#e6c785}
.ae-studio-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
.ae-studio-stats div{padding:9px;background:#213d4b;border-radius:8px}
.ae-studio-stats small{display:block;color:#b9d1da;font-size:10px}
.ae-studio-stats b{font-size:13px;color:#f2d496}
.ae-studio-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.ae-studio-actions button{flex:1 1 auto;min-height:44px;font-size:12px}
.ae-studio-item{border-top:1px solid #3d5968;padding:10px 0;display:flex;justify-content:space-between;gap:10px;align-items:center}
.ae-studio-item small{color:#bcd0d7;display:block;font-size:11px;margin-top:4px}
.ae-studio-item button{min-height:38px;font-size:11px}
@media(max-width:380px){.ae-studio-grid{grid-template-columns:1fr}}
`;document.head.append(css);
document.getElementById('garage')?.append(panel);
for(const [kind] of Object.entries(CATEGORIES)){const option=document.createElement('option');option.value=kind;option.textContent=kind;panel.querySelector('#ae-design-kind').append(option)}
for(const [key,value] of Object.entries(ENGINE)){const option=document.createElement('option');option.value=key;option.textContent=value.name;panel.querySelector('#ae-design-engine').append(option)}
const input=id=>panel.querySelector('#ae-design-'+id);
function ensure(){
 const economy=s.empire?.economy;if(!economy)return null;
 if(!economy.studio)economy.studio={research:0,level:1,designs:[],nextDesignId:1,spent:0};
 const st=economy.studio;
 st.research=limit(Math.floor(Number(st.research)||0),0,1000);
 st.level=limit(Math.floor(Number(st.level)||1),1,5);
 if(!Array.isArray(st.designs))st.designs=[];
 st.nextDesignId=Math.max(1,Math.floor(Number(st.nextDesignId)||1));
 st.spent=Math.max(0,Number(st.spent)||0);
 return st;
}
function read(){
 const name=input('name').value.trim().slice(0,28);
 const kind=input('kind').value,engine=input('engine').value,position=input('position').value;
 const safety=Number(input('safety').value),reliability=Number(input('reliability').value),tech=Number(input('tech').value),comfort=Number(input('comfort').value);
 return {name,kind,engine,position,safety,reliability,tech,comfort};
}
function calculate(d){
 const economy=s.empire.economy,base=CATEGORIES[d.kind]?.base||13200;
 const engineering=d.safety+d.reliability+d.tech+d.comfort;
 const pos={budget:.88,standard:1,premium:1.22}[d.position]||1;
 const engine=ENGINE[d.engine]||ENGINE.equilibrado;
 const supplier=window.AEOperations?.getSupplier?.()||{factor:1,days:0,quality:0};
 const cost=Math.round(base*engine.factor*pos*(.72+engineering*.034)*(economy.inflation||1)*supplier.factor/100)*100;
 const quality=limit(Math.round(46+engineering*2+engine.quality+(d.position==='premium'?7:0)+supplier.quality),40,100);
 const value=Math.round(cost*(1.16+quality*.004)/100)*100;
 const research=Math.max(1,Math.round(engineering/4)+(d.engine==='eletrico'?5:0)+(d.position==='premium'?3:0));
 const days=Math.max(2,Math.round((CATEGORIES[d.kind]?.days||6)-(economy.factory.level-1)*1.4)+supplier.days);
 return {cost,quality,value,research,days};
}
function update(){
 const st=ensure();if(!st)return;
 for(const k of ['safety','reliability','tech','comfort'])panel.querySelector('#ae-design-'+k+'-v').textContent=input(k).value;
 const d=read(),calc=calculate(d);
 panel.querySelector('#ae-studio-points').textContent=st.research+' pontos P&D';
 panel.querySelector('#ae-studio-stats').innerHTML=[
 ['Custo unitário',currency(calc.cost)+' CR'],['Valor estimado',currency(calc.value)+' CR'],
 ['Qualidade do projeto',calc.quality+'/100'],['Homologação',calc.research+' pontos P&D'],
 ['Tempo de produção',calc.days+' dias'],['Margem bruta estimada',currency(calc.value-calc.cost)+' CR']
 ].map(([k,v])=>'<div><small>'+k+'</small><b>'+v+'</b></div>').join('');
 const factory=s.empire.economy.factory;
 const button=panel.querySelector('[data-studio="produce"]');button.disabled=!factory.opened;
 panel.querySelector('#ae-studio-saved').innerHTML='<h4>Projetos homologados ('+st.designs.length+'/12)</h4>'+st.designs.map(d=>'<div class="ae-studio-item"><div><b>'+escText(d.name)+'</b><small>'+escText(d.kind)+' · '+escText(ENGINE[d.engine]?.name||d.engine)+' · '+currency(d.cost)+' CR · qualidade '+d.quality+'</small></div><button data-design-id="'+d.id+'">Selecionar</button></div>').join('')+(st.designs.length?'':'<p class="tiny">Nenhum projeto salvo. Invista em P&D e homologue o primeiro modelo.</p>');
}
function invest(){
 const st=ensure();if(!st)return;
 const cost=Math.round(1800*s.empire.economy.inflation);
 if(s.cash<cost)return toast('Caixa insuficiente para pesquisa');
 if(!confirm('Investir '+currency(cost)+' CR e receber 5 pontos de P&D?'))return;
 s.cash-=cost;st.research+=5;st.spent+=cost;entry('Pesquisa e desenvolvimento',-cost);note('Equipe de engenharia recebeu +5 pontos de P&D.');save();render();
}
function homologate(){
 const st=ensure(),d=read(),c=calculate(d);if(!st)return;
 if(d.name.length<2)return toast('Informe um nome com pelo menos 2 caracteres');
 if(st.designs.length>=12)return toast('Limite de 12 projetos homologados');
 if(st.research<c.research)return toast('Pontos de P&D insuficientes');
 if(st.designs.some(x=>x.name.toLocaleLowerCase('pt-BR')===d.name.toLocaleLowerCase('pt-BR')))return toast('Já existe um projeto com esse nome');
 if(!confirm('Homologar '+d.name+' usando '+c.research+' pontos de P&D?'))return;
 st.research-=c.research;st.designs.push({...d,...c,id:st.nextDesignId++});note('Novo modelo homologado: '+d.name);save();render();
}
function produce(){
 const st=ensure(),f=s.empire.economy.factory;if(!st||!f.opened)return toast('Abra sua fabricante primeiro');
 const name=read().name;
 const design=st.designs.find(d=>d.name===name);if(!design)return toast('Selecione um projeto homologado para produzir');
 if(f.queue.filter(job=>!job.plantId).length>=f.level*2)return toast('Linha de produção principal ocupada');
 if(s.stock.length+f.queue.length>=s.slots)return toast('Não há vagas disponíveis no estoque');
 const crisis=window.AEEconomy?.crisisFor(s.empire.world?.active);
 if(crisis?.id==='war'||crisis?.id==='supply')return toast('Produção bloqueada: '+crisis.name);
 const fresh=calculate(design),cost=fresh.cost;
 if(s.cash<cost)return toast('Caixa insuficiente');
 if(!confirm('Produzir '+design.name+' por '+currency(cost)+' CR em '+fresh.days+' dias?'))return;
 s.cash-=cost;entry('Produção de modelo próprio · '+design.name,-cost);
 f.model=design.name;
 f.queue.push({model:design.name,kind:design.kind,cost,value:fresh.value,due:s.day+fresh.days,designId:design.id,quality:fresh.quality,supplier:window.AEOperations?.getSupplier?.().id||'standard'});
 note('Produção iniciada: '+design.name+' · conclusão prevista para o dia '+(s.day+fresh.days));
 save();render();
}
panel.addEventListener('input',ev=>{if(ev.target.closest('.ae-studio-grid'))update()});
panel.addEventListener('change',ev=>{if(ev.target.closest('.ae-studio-grid'))update()});
panel.addEventListener('click',ev=>{
 const btn=ev.target.closest('[data-studio]');if(btn){if(btn.dataset.studio==='research')invest();if(btn.dataset.studio==='save')homologate();if(btn.dataset.studio==='produce')produce();return}
 const selected=ev.target.closest('[data-design-id]');if(!selected)return;
 const st=ensure(),d=st?.designs.find(x=>String(x.id)===selected.dataset.designId);if(!d)return;
 for(const key of ['name','kind','engine','position','safety','reliability','tech','comfort'])input(key).value=d[key];
 update();panel.scrollIntoView({behavior:'smooth',block:'start'});
});
const oldSeed=seed;
seed=function(){oldSeed();ensure();save()};
const oldRender=render;
let previous='';
render=function(){
 oldRender();
 const e=s.empire?.economy,st=ensure();if(!st)return;
 const signature=[s.day,s.cash,e.inflation,e.factory.opened,e.factory.level,e.factory.queue.length,st.research,st.designs.length].join('|');
 if(signature!==previous){previous=signature;update()}
};
const tag=document.querySelector('.top .tag');if(tag)tag.textContent='ALPHA 2.6.0 · INDÚSTRIA AUTOMOTIVA';
document.title='Auto Empire Tycoon — Alpha 2.6.0';
const banner=document.getElementById('ae-version');if(banner)banner.textContent='AUTO EMPIRE TYCOON · ALPHA 2.6.0 · BUILD 2600';
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(update);
update();
})();
