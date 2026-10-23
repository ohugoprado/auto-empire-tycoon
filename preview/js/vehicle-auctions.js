/* Auto Empire Tycoon — Alpha 9.5: multi-lot auction center. */
(function(){
'use strict';
const market=document.getElementById('market');if(!market)return;
const n=x=>Number.isFinite(Number(x))?Number(x):0;
const fmtMoney=x=>Math.round(x).toLocaleString('pt-BR')+' CR';
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;':'&quot;'}[c]));
const css=document.createElement('style');css.textContent=`
#ae-auctions{margin:12px 0;padding:14px;border:1px solid #4c6777;border-radius:13px;background:#1b303d;color:#e7f0f6}
#ae-auctions h3{font-size:16px;margin:0 0 6px;color:#f5d28a}
#ae-auctions p{font-size:12px;line-height:1.5;color:#c4d5df}
.ae-auction-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
.ae-auction-metrics>div{padding:10px;background:#284252;border-radius:8px;font-size:12px}
.ae-auction-metrics b{display:block;margin-top:3px;color:#fff}
#ae-auctions .ae-auction-actions{display:flex;flex-wrap:wrap;gap:8px}
#ae-auctions button{min-height:44px;padding:9px 12px}
#ae-auctions button:disabled{opacity:.5}
#ae-auctions .ae-auction-secondary{background:#304a59;color:#e7f0f6;border:1px solid #567587}
#ae-auctions .ae-auction-alert{color:#ffcf95;font-size:12px}\n#ae-auctions .ae-auction-lot{padding:12px 0;border-bottom:1px solid #4a6472}\n#ae-auctions h4{margin:8px 0;font-size:15px}\n#ae-auctions [aria-pressed=true]{background:#f4c568;color:#152735}
`;document.head.append(css);
const filters=['all','fleet','recovered','premium','classic'];let selected='all';
const panel=document.createElement('section');panel.id='ae-auctions';panel.setAttribute('aria-label','Leilão de veículos');
const listings=document.getElementById('listings');market.insertBefore(panel,listings||market.firstChild);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.vehicleAuctions||typeof s.vehicleAuctions!=='object')s.vehicleAuctions={lots:[],history:[],nextDay:Math.max(1,n(s.day))};
 const a=s.vehicleAuctions;if(!Array.isArray(a.history))a.history=[];
 if(!Array.isArray(a.lots))a.lots=[];
 if(a.lot){a.lots.push(a.lot);a.lot=null;}
 return a;
}
function createLot(a){
 const categories=[
 {id:'fleet',label:'Frota empresarial',description:'Veículo de uso intenso, com desconto maior e desgaste frequente.',base:.57,wear:9,risk:.68},
 {id:'recovered',label:'Veículo recuperado',description:'Preço agressivo, mas maior risco de reparos relevantes.',base:.47,wear:13,risk:.86},
 {id:'premium',label:'Seleção premium',description:'Lote de maior valor, geralmente melhor conservado.',base:.77,wear:0,risk:.32},
 {id:'classic',label:'Clássico colecionável',description:'Veículo raro com valor de mercado variável e potencial de restauração.',base:.64,wear:7,risk:.57}
 ];
 const category=categories[Math.floor(Math.random()*categories.length)];
 const car=makeCar();
 if(category.id==='premium'){car.value=Math.round(n(car.value)*1.4/100)*100;car.condition=Math.min(98,n(car.condition)+12);}
 if(category.id==='classic'){car.year=Math.min(n(car.year),1998);car.value=Math.round(n(car.value)*1.15/100)*100;}
 if(category.id==='fleet'){car.km+=65000;}
 const base=Math.max(500,Math.round(n(car.value)*(category.base+Math.random()*.09)/100)*100);
 const rivals=['Atlas Motors','Orion Auto','Norte Veículos'];
 const defects=[
 {name:'Sem defeitos relevantes',cost:0,conditionLoss:0},
 {name:'Freios e suspensão',cost:Math.round(n(car.value)*.045/100)*100,conditionLoss:8},
 {name:'Transmissão desgastada',cost:Math.round(n(car.value)*.095/100)*100,conditionLoss:14},
 {name:'Motor com reparo pendente',cost:Math.round(n(car.value)*.15/100)*100,conditionLoss:20}
 ];
 const roll=Math.random(),risk=category.risk;
 const defect=defects[roll>risk?0:roll>risk*.55?1:roll>risk*.20?2:3];
 car.condition=Math.max(18,n(car.condition)-category.wear);
 const lot={car,day:s.day,ends:s.day+3,high:base,leader:'Leiloeiro',rival:rivals[Math.floor(Math.random()*rivals.length)],rivalLimit:Math.round(n(car.value)*(.77+Math.random()*.22)/100)*100,playerBid:0,rounds:0,defect,inspected:false,category:category.id,categoryLabel:category.label,categoryDescription:category.description};
 a.lots.push(lot);
 a.nextDay=s.day+6;
 note('Novo leilão de '+category.label+': '+car.name+' disponível até o dia '+lot.ends+'.');
}
function finish(a,lot){
 if(!lot)return;
 if(lot.leader==='Você'&&n(lot.playerBid)>0){
  const car=lot.car,price=n(lot.playerBid);
  if(s.stock.length<s.slots&&n(s.cash)>=price){
   const defect=lot.defect||{cost:0,conditionLoss:0};
   car.condition=Math.max(10,n(car.condition)-n(defect.conditionLoss));
   car.repair=n(car.repair)+n(defect.cost);
   car.auctionDefect=String(defect.name||'Sem defeitos relevantes');
   car.auctionInspected=!!lot.inspected;
   car.auctionCategory=String(lot.categoryLabel||'Leilão geral');
   s.cash-=price;car.bought=price;car.spent=0;car.listed=false;car.offers=[];s.stock.push(car);
   if(n(defect.cost)>0)note('Avaliação pós-arremate: '+car.auctionDefect+' em '+car.name+'.');
   entry('Arremate · '+car.name,-price);note('Arrematou '+car.name+' por '+fmtMoney(price)+'.');
   a.history.unshift({day:s.day,name:car.name,price,result:'Arrematado'});
  }else{
   note('Leilão perdido: não havia saldo ou vaga disponível para '+lot.car.name+'.');
   a.history.unshift({day:s.day,name:lot.car.name,price,result:'Sem condições de pagamento'});
  }
 }else{
  a.history.unshift({day:s.day,name:lot.car.name,price:n(lot.high),result:'Arrematado por concorrente'});
 }
 a.history=a.history.slice(0,24);a.lots=a.lots.filter(x=>x!==lot);
}
function refresh(){
 const a=ensure();if(!a)return;
 const active=a.lots||[];
 const buttons=filters.map(id=>'<button class="ae-auction-secondary" data-auction-filter="'+id+'" aria-pressed="'+(selected===id)+'">'+({all:'Todos',fleet:'Frotas',recovered:'Recuperados',premium:'Premium',classic:'Clássicos'}[id])+'</button>').join('');
 const visible=active.filter(l=>selected==='all'||l.category===selected);
 panel.innerHTML='<h3>Central de leilões</h3><p>'+active.length+' lotes ativos · Lances competitivos e inspeções opcionais. Os arremates são cobrados no encerramento.</p><div class="ae-auction-actions" aria-label="Filtrar lotes">'+buttons+'</div><div id="ae-auction-lots">'+(visible.length?visible.map(lot=>{
 const id=n(lot.car.id),minBid=Math.round((n(lot.high)+Math.max(100,Math.round(n(lot.high)*.02/100)*100))/100)*100;
 const enough=n(s.cash)>=minBid&&s.stock.length<s.slots;
 const fee=Math.max(150,Math.round(n(lot.car.value)*.012/50)*50);
 const defect=lot.defect||{name:'Sem defeitos relevantes',cost:0};
 return '<article class="ae-auction-lot" data-auction-lot="'+id+'"><p><strong>'+esc(lot.categoryLabel||'Leilão geral')+'</strong> · '+esc(lot.categoryDescription||'')+'</p><h4>'+esc(lot.car.name)+'</h4><p>Ano '+n(lot.car.year)+' · '+n(lot.car.km).toLocaleString('pt-BR')+' km · Conservação '+n(lot.car.condition)+'%</p><div class="ae-auction-metrics"><div>Lance atual<b>'+fmtMoney(lot.high)+'</b></div><div>Líder<b>'+esc(lot.leader)+'</b></div><div>Valor estimado<b>'+fmtMoney(lot.car.value)+'</b></div><div>Encerra no dia<b>'+n(lot.ends)+'</b></div></div><p>Próximo lance: <strong>'+fmtMoney(minBid)+'</strong></p><div class="ae-auction-actions"><button data-auction-bid="'+id+'" '+(!enough||n(lot.rounds)>=12?'disabled':'')+'>Dar lance</button><button class="ae-auction-secondary" data-auction-max="'+id+'" '+(n(s.cash)<Math.round(minBid*1.08/100)*100||s.stock.length>=s.slots||n(lot.rounds)>=12?'disabled':'')+'>Lance +8%</button></div><p><strong>Laudo:</strong> '+(lot.inspected?esc(defect.name)+' · Reparo adicional: '+fmtMoney(n(defect.cost)):'Defeitos ocultos possíveis')+'</p>'+(lot.inspected?'':'<button class="ae-auction-secondary" data-auction-inspect="'+id+'" '+(n(s.cash)<fee?'disabled':'')+'>Inspecionar · '+fmtMoney(fee)+'</button>')+'</article>';
 }).join(''):'<p>Nenhum lote nesta categoria. Próxima rodada a partir do dia '+Math.max(n(s.day),n(a.nextDay))+'.</p>')+'</div>'+history(a);
 panel.querySelectorAll('[data-auction-filter]').forEach(b=>b.onclick=()=>{selected=b.dataset.auctionFilter;refresh();});
 panel.querySelectorAll('[data-auction-bid]').forEach(b=>b.onclick=()=>bid(Number(b.dataset.auctionBid),false));
 panel.querySelectorAll('[data-auction-max]').forEach(b=>b.onclick=()=>bid(Number(b.dataset.auctionMax),true));
 panel.querySelectorAll('[data-auction-inspect]').forEach(b=>b.onclick=()=>inspect(Number(b.dataset.auctionInspect)));
}
function inspect(id){
 const a=ensure(),lot=a?.lots?.find(x=>n(x.car.id)===id);
 if(!lot||lot.inspected)return;
 const price=Math.max(150,Math.round(n(lot.car.value)*.012/50)*50);
 if(n(s.cash)<price)return toast('Caixa insuficiente para inspeção.');
 s.cash-=price;lot.inspected=true;
 entry('Inspeção de leilão · '+lot.car.name,-price);
 note('Laudo concluído: '+lot.car.name+' · '+(lot.defect?.name||'Sem defeitos relevantes')+'.');
 save();refresh();render();
}
function history(a){return a.history.length?'<p><strong>Últimos resultados</strong></p>'+a.history.slice(0,3).map(h=>'<p>Dia '+n(h.day)+' · '+esc(h.name)+' · '+esc(h.result)+' · '+fmtMoney(h.price)+'</p>').join(''):'';}
function bid(id,raise){
 const a=ensure(),lot=a?.lots?.find(x=>n(x.car.id)===id);if(!lot||n(s.day)>n(lot.ends))return;
 const minimum=Math.round((n(lot.high)+Math.max(100,Math.round(n(lot.high)*.02/100)*100))/100)*100;
 const amount=raise?Math.round(minimum*1.08/100)*100:minimum;
 if(amount<minimum||!Number.isFinite(amount))return toast('Lance abaixo do mínimo.');
 if(s.stock.length>=s.slots)return toast('Garagem cheia.');
 if(n(s.cash)<amount)return toast('Caixa insuficiente.');
 if(lot.rounds>=12)return toast('Limite de rodadas atingido; aguarde o encerramento.');
 lot.high=amount;lot.leader='Você';lot.playerBid=amount;lot.rounds++;
 // A rival only raises the price if its predetermined budget permits it.
 const counter=Math.round((amount+Math.max(100,Math.round(amount*.025/100)*100))/100)*100;
 if(counter<=n(lot.rivalLimit)&&Math.random()<.8){
  lot.high=counter;lot.leader=lot.rival;
  note(lot.rival+' superou seu lance por '+lot.car.name+'.');
 }else note('Você lidera o leilão de '+lot.car.name+' com '+fmtMoney(amount)+'.');
 save();refresh();render();
}
const previousTick=tickDay;
tickDay=function(){
 const result=previousTick(),a=ensure();if(!a)return result;
 for(const lot of [...a.lots].sort((x,y)=>n(x.ends)-n(y.ends)))if(s.day>n(lot.ends))finish(a,lot);
 if(s.day>=n(a.nextDay)&&a.lots.length<3){while(a.lots.length<3)createLot(a);}
 save();refresh();return result;
};
const previousSeed=seed;
seed=function(){previousSeed();const a=ensure();if(a&&!a.lots.length){while(a.lots.length<3)createLot(a);}save();refresh();};
const previousRender=render;let signature='';
render=function(){previousRender();const a=ensure(),next=[s?.day,s?.cash,s?.stock?.length,a?.lots?.map(x=>[x.car.id,x.high,x.leader].join(':')).join(';')].join('|');if(next!==signature){signature=next;refresh();}};
const a=ensure();if(a&&!a.lots.length&&s.day>=n(a.nextDay)){while(a.lots.length<3)createLot(a);}save();refresh();
})();
