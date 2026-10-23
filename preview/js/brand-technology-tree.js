/* Auto Empire Tycoon — Alpha 10.1: own-brand design and investment-gated technology tree. */
(function(){
'use strict';
const studio=document.getElementById('ae-studio');if(!studio)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const money=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&gt;','"':'&quot;'}[c]));
const nodes=[
 {id:'sketch',name:'Estúdio de estilo',cost:6000,days:2,requires:[],description:'Desbloqueia a identidade visual própria e a assinatura da marca.'},
 {id:'aero',name:'Aerodinâmica',cost:11000,days:3,requires:['sketch'],description:'Permite desenho de carroceria mais eficiente.'},
 {id:'safety',name:'Segurança avançada',cost:15000,days:4,requires:['sketch'],description:'Libera projetos com segurança acima de 3.'},
 {id:'comfort',name:'Cabine premium',cost:14000,days:4,requires:['sketch'],description:'Libera conforto acima de 3 e acabamento premium.'},
 {id:'reliability',name:'Engenharia de durabilidade',cost:16000,days:4,requires:['aero'],description:'Libera confiabilidade acima de 3.'},
 {id:'tech',name:'Eletrônica embarcada',cost:18000,days:5,requires:['aero'],description:'Libera tecnologia acima de 3.'},
 {id:'performance',name:'Powertrain esportivo',cost:24000,days:6,requires:['reliability'],description:'Libera motores de performance.'},
 {id:'electric',name:'Plataforma elétrica',cost:36000,days:8,requires:['tech','safety'],description:'Libera motorização elétrica.'},
 {id:'luxury',name:'Plataforma de luxo',cost:29000,days:6,requires:['comfort','safety'],description:'Libera SUVs, picapes e esportivos de projeto próprio.'}
];
function state(){
 const e=s?.empire?.economy;if(!e)return null;
 if(!e.brandTechnology||typeof e.brandTechnology!=='object')e.brandTechnology={unlocked:[],active:null,spent:0,designStyle:'signature'};
 const st=e.brandTechnology;
 if(!Array.isArray(st.unlocked))st.unlocked=[];
 if(!st.designStyle)st.designStyle='signature';
 return st;
}
const has=(st,id)=>st.unlocked.includes(id);
const activeCost=()=>Math.max(1,n(s.empire?.economy?.inflation)||1);
function constraints(){
 const st=state();if(!st)return [];
 const errors=[],kind=studio.querySelector('#ae-design-kind')?.value,engine=studio.querySelector('#ae-design-engine')?.value;
 if(!has(st,'sketch'))errors.push('Pesquise Estúdio de estilo para homologar designs próprios.');
 if(['SUV','Picape','Esportivo'].includes(kind)&&!has(st,'luxury'))errors.push('Segmento requer Plataforma de luxo.');
 if(engine==='performance'&&!has(st,'performance'))errors.push('Motor performance requer Powertrain esportivo.');
 if(engine==='eletrico'&&!has(st,'electric'))errors.push('Motor elétrico requer Plataforma elétrica.');
 for(const [field,id,label] of [['safety','safety','Segurança'],['reliability','reliability','Confiabilidade'],['tech','tech','Tecnologia'],['comfort','comfort','Conforto']]){
  if(n(studio.querySelector('#ae-design-'+field)?.value)>3&&!has(st,id))errors.push(label+' acima de 3 requer pesquisa específica.');
 }
 if(studio.querySelector('#ae-design-position')?.value==='premium'&&!has(st,'comfort'))errors.push('Posicionamento premium requer Cabine premium.');
 return errors;
}
const box=document.createElement('section');box.id='ae-tech-tree';box.innerHTML='<h3>Pesquisa e design de marca própria</h3><p class="tiny">Invista em tecnologias, aguarde os dias de pesquisa e desbloqueie novos componentes para seus modelos. Projetos já homologados continuam válidos.</p><div id="ae-tech-summary"></div><div id="ae-tech-nodes"></div><div id="ae-tech-preview"></div>';
studio.insertBefore(box,studio.querySelector('.ae-studio-grid'));
const css=document.createElement('style');css.textContent=`
#ae-tech-tree{border:1px solid #526d7c;border-radius:12px;background:#162e3c;padding:12px;margin:14px 0}
#ae-tech-tree h3{font-size:15px;margin:0 0 6px;color:#f4d28b}
#ae-tech-tree .ae-tech-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
#ae-tech-tree .ae-tech-node{border:1px solid #496273;border-radius:10px;padding:10px;background:#223e4d;min-width:0}
#ae-tech-tree .ae-tech-node[data-status=done]{border-color:#7ba894}
#ae-tech-tree .ae-tech-node[data-status=locked]{opacity:.7}
#ae-tech-tree .ae-tech-node strong{font-size:12px;display:block}
#ae-tech-tree .ae-tech-node p{font-size:11px;line-height:1.4;margin:6px 0}
#ae-tech-tree button{min-height:44px;width:100%;margin-top:5px;font-size:12px}
#ae-tech-tree .ae-tech-status{font-size:12px;line-height:1.5;color:#d7e5ea}
#ae-tech-preview{margin-top:12px}
#ae-tech-preview svg{display:block;width:100%;max-width:330px;height:auto;margin:8px auto}
#ae-tech-preview .ae-tech-warning{color:#ffcf95;font-size:12px;line-height:1.5}
@media(max-width:400px){#ae-tech-tree .ae-tech-grid{grid-template-columns:1fr}}
`;document.head.append(css);
function refresh(){
 const st=state();if(!st)return;
 const active=st.active,remaining=active?Math.max(0,n(active.due)-n(s.day)):0;
 box.querySelector('#ae-tech-summary').innerHTML='<p class="ae-tech-status"><strong>Investido em tecnologia:</strong> '+money(st.spent)+' · <strong>Pesquisas concluídas:</strong> '+st.unlocked.length+'/'+nodes.length+'</p>'+(active?'<p class="ae-tech-status">Em desenvolvimento: '+esc(nodes.find(x=>x.id===active.id)?.name||active.id)+' · conclusão no dia '+n(active.due)+' ('+remaining+' dia(s))</p>':'<p class="ae-tech-status">Equipe disponível para nova pesquisa.</p>');
 box.querySelector('#ae-tech-nodes').innerHTML='<div class="ae-tech-grid">'+nodes.map(node=>{
  const done=has(st,node.id),missing=node.requires.filter(id=>!has(st,id)),cost=Math.round(node.cost*activeCost()/100)*100;
  const locked=missing.length>0,status=done?'done':locked?'locked':'available';
  const requirements=missing.map(id=>nodes.find(x=>x.id===id)?.name||id).join(', ');
  return '<article class="ae-tech-node" data-status="'+status+'"><strong>'+esc(node.name)+'</strong><p>'+esc(node.description)+'</p><p>'+(done?'Concluída':locked?'Pré-requisito: '+esc(requirements):'Investimento: '+money(cost)+' · '+node.days+' dias')+'</p>'+(done?'':('<button type="button" data-tech-research="'+node.id+'" '+(locked||!!active||n(s.cash)<cost||!!s.empire?.economy?.bankrupt?'disabled':'')+'>Pesquisar</button>'))+'</article>';
 }).join('')+'</div>';
 const issues=constraints(),style=st.designStyle;
 const color=style==='sport'?'#c14f4f':style==='luxury'?'#c9ad78':'#4388bc';
 box.querySelector('#ae-tech-preview').innerHTML='<h4>Prévia de identidade da marca</h4><label class="ae-tech-status">Linguagem visual <select id="ae-tech-style"><option value="signature" '+(style==='signature'?'selected':'')+'>Assinatura moderna</option><option value="sport" '+(style==='sport'?'selected':'')+'>Esportiva</option><option value="luxury" '+(style==='luxury'?'selected':'')+'>Luxo</option></select></label><svg viewBox="0 0 320 130" role="img" aria-label="Esboço estilizado de carroceria da marca"><rect x="8" y="100" width="304" height="2" fill="#647f8d"/><path d="M24 84 L43 66 L91 60 L120 31 L221 31 L261 61 L291 72 L301 85 L298 98 L22 98 Z" fill="'+color+'" stroke="#b5d3df" stroke-width="3"/><path d="M130 38 L214 38 L243 60 L108 60 Z" fill="#173849" stroke="#e2e8ed" stroke-width="2"/><path d="M38 78 L64 72 M262 76 L288 80" stroke="#f6e6b7" stroke-width="5"/><circle cx="83" cy="98" r="19" fill="#16242c" stroke="#aebcc6" stroke-width="6"/><circle cx="244" cy="98" r="19" fill="#16242c" stroke="#aebcc6" stroke-width="6"/></svg><p class="ae-tech-status">Esboço conceitual. O estilo é salvo na marca e aplicado aos novos projetos homologados.</p>'+(issues.length?'<p class="ae-tech-warning">'+issues.map(esc).join(' ')+'</p>':'<p class="ae-tech-status">Configuração de engenharia liberada para homologação.</p>');
}
box.addEventListener('click',event=>{
 const button=event.target.closest('[data-tech-research]');if(!button)return;
 const st=state(),node=nodes.find(x=>x.id===button.dataset.techResearch);
 if(!st||!node||has(st,node.id)||st.active||node.requires.some(id=>!has(st,id)))return;
 if(s.empire?.economy?.bankrupt)return toast('Pesquisa indisponível durante falência.');
 const cost=Math.round(node.cost*activeCost()/100)*100;
 if(n(s.cash)<cost)return toast('Caixa insuficiente para investir em tecnologia.');
 if(!confirm('Investir '+money(cost)+' em '+node.name+'? Prazo: '+node.days+' dias.'))return;
 s.cash-=cost;st.spent+=cost;st.active={id:node.id,due:n(s.day)+node.days,cost};
 entry('P&D tecnológico · '+node.name,-cost);note('Pesquisa iniciada: '+node.name+'.');
 save();render();refresh();
});
box.addEventListener('change',event=>{
 if(event.target.id!=='ae-tech-style')return;
 const st=state();if(!st)return;
 st.designStyle=['signature','sport','luxury'].includes(event.target.value)?event.target.value:'signature';
 save();refresh();
});
studio.addEventListener('click',event=>{
 const button=event.target.closest('[data-studio="save"]');if(!button)return;
 const errors=constraints();
 if(errors.length){event.preventDefault();event.stopImmediatePropagation();toast(errors[0]);refresh();return;}
 const st=state(),e=s.empire?.economy?.studio,existing=new Set((e?.designs||[]).map(x=>x.id));
 const before=e?.nextDesignId;
 setTimeout(()=>{
  if(!e||e.nextDesignId===before)return;
  const design=e.designs.find(x=>!existing.has(x.id));
  if(design){design.brandStyle=st.designStyle;save();}
 },0);
},true);
studio.addEventListener('input',event=>{if(event.target.closest('.ae-studio-grid'))refresh()});
studio.addEventListener('change',event=>{if(event.target.closest('.ae-studio-grid'))refresh()});
const prevTick=tickDay;
tickDay=function(){
 const result=prevTick(),st=state();
 if(st?.active&&n(s.day)>=n(st.active.due)){
  const node=nodes.find(x=>x.id===st.active.id);
  if(node&&!has(st,node.id)){st.unlocked.push(node.id);note('Pesquisa concluída: '+node.name+'.');}
  st.active=null;save();
 }
 refresh();return result;
};
const prevRender=render;let signature='';
render=function(){
 prevRender();
 const st=state(),next=[s?.day,s?.cash,st?.active?.id,st?.unlocked?.join(','),st?.designStyle].join('|');
 if(next!==signature){signature=next;refresh();}
};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(refresh);
refresh();
})();
