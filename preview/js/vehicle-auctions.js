/* Auto Empire Tycoon — Alpha 9.3: auctions with pre-purchase inspections and hidden defects. */
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
#ae-auctions .ae-auction-alert{color:#ffcf95;font-size:12px}
`;document.head.append(css);
const panel=document.createElement('section');panel.id='ae-auctions';panel.setAttribute('aria-label','Leilão de veículos');
const listings=document.getElementById('listings');market.insertBefore(panel,listings||market.firstChild);
function ensure(){
 if(!s||typeof s!=='object')return null;
 if(!s.vehicleAuctions||typeof s.vehicleAuctions!=='object')s.vehicleAuctions={lot:null,history:[],nextDay:Math.max(1,n(s.day))};
 const a=s.vehicleAuctions;if(!Array.isArray(a.history))a.history=[];
 return a;
}
function createLot(a){
 const car=makeCar(),base=Math.max(500,Math.round(n(car.value)*(.61+Math.random()*.13)/100)*100);
 const rivals=['Atlas Motors','Orion Auto','Norte Veículos'];
 const defects=[
 {name:'Sem defeitos relevantes',cost:0,conditionLoss:0},
 {name:'Freios e suspensão',cost:Math.round(n(car.value)*.045/100)*100,conditionLoss:8},
 {name:'Transmissão desgastada',cost:Math.round(n(car.value)*.095/100)*100,conditionLoss:14},
 {name:'Motor com reparo pendente',cost:Math.round(n(car.value)*.15/100)*100,conditionLoss:20}
 ];
 const roll=Math.random(),defect=defects[roll<.35?0:roll<.67?1:roll<.88?2:3];
 a.lot={car,day:s.day,ends:s.day+3,high:base,leader:'Leiloeiro',rival:rivals[Math.floor(Math.random()*rivals.length)],rivalLimit:Math.round(n(car.value)*(.77+Math.random()*.22)/100)*100,playerBid:0,rounds:0,defect,inspected:false};
 a.nextDay=s.day+6;
 note('Novo leilão: '+car.name+' disponível até o dia '+a.lot.ends+'.');
}
function finish(a){
 const lot=a.lot;if(!lot)return;
 if(lot.leader==='Você'&&n(lot.playerBid)>0){
  const car=lot.car,price=n(lot.playerBid);
  if(s.stock.length<s.slots&&n(s.cash)>=price){
   const defect=lot.defect||{cost:0,conditionLoss:0};
   car.condition=Math.max(10,n(car.condition)-n(defect.conditionLoss));
   car.repair=n(car.repair)+n(defect.cost);
   car.auctionDefect=String(defect.name||'Sem defeitos relevantes');
   car.auctionInspected=!!lot.inspected;
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
 a.history=a.history.slice(0,12);a.lot=null;
}
function refresh(){
 const a=ensure();if(!a)return;
 const lot=a.lot;
 if(!lot){
  panel.innerHTML='<h3>Leilões competitivos</h3><p>Nenhum lote disponível agora. Próximo leilão a partir do dia '+Math.max(n(s.day),n(a.nextDay))+'.</p>'+history(a);
  return;
 }
 const minBid=Math.round((n(lot.high)+Math.max(100,Math.round(n(lot.high)*.02/100)*100))/100)*100;
 const enough=n(s.cash)>=minBid&&s.stock.length<s.slots;
 const fee=Math.max(150,Math.round(n(lot.car.value)*.012/50)*50);
 const defect=lot.defect||{name:'Sem defeitos relevantes',cost:0};
 panel.innerHTML='<h3>Leilão de veículos</h3><p>Dispute um carro com compradores rivais. O lance vencedor só é cobrado no encerramento. Não há reserva de saldo ou vaga.</p><strong>'+esc(lot.car.name)+'</strong><p>Ano '+n(lot.car.year)+' · '+n(lot.car.km).toLocaleString('pt-BR')+' km · Conservação '+n(lot.car.condition)+'%</p><div class="ae-auction-metrics"><div>Lance atual<b>'+fmtMoney(lot.high)+'</b></div><div>Líder<b>'+esc(lot.leader)+'</b></div><div>Valor estimado<b>'+fmtMoney(lot.car.value)+'</b></div><div>Encerra no dia<b>'+n(lot.ends)+'</b></div></div><p>Próximo lance mínimo: <strong>'+fmtMoney(minBid)+'</strong></p><div class="ae-auction-actions"><button id="ae-auction-bid" '+(!enough?'disabled':'')+'>Dar lance</button><button id="ae-auction-max" class="ae-auction-secondary" '+(n(s.cash)<Math.round(minBid*1.08/100)*100||s.stock.length>=s.slots?'disabled':'')+'>Lance +8%</button></div>'+(s.stock.length>=s.slots?'<p class="ae-auction-alert">Garagem cheia: expanda ou venda um veículo.</p>':n(s.cash)<minBid?'<p class="ae-auction-alert">Saldo insuficiente para o lance mínimo.</p>':'')+'<p class="ae-auction-alert">Se perder capacidade de pagamento ou vaga antes do encerramento, não receberá o veículo.</p><div class="ae-auction-inspection"><strong>Inspeção pré-compra</strong><p>'+(lot.inspected?'Laudo: '+esc(defect.name)+' · Reparo adicional estimado: '+fmtMoney(n(defect.cost)):'O lote pode apresentar defeitos ocultos. Solicite um laudo antes de dar o lance.')+'</p>'+(lot.inspected?'':'<button id="ae-auction-inspect" class="ae-auction-secondary" '+(n(s.cash)<fee?'disabled':'')+'>Inspecionar · '+fmtMoney(fee)+'</button>')+'</div>'+history(a);
 const b=document.getElementById('ae-auction-bid'),max=document.getElementById('ae-auction-max');
 if(b)b.onclick=()=>bid(minBid);
 if(max)max.onclick=()=>bid(Math.round(minBid*1.08/100)*100);
 const inspect=document.getElementById('ae-auction-inspect');
 if(inspect)inspect.onclick=()=>{
  const state=ensure(),active=state?.lot;
  if(!active||active.inspected)return;
  const price=Math.max(150,Math.round(n(active.car.value)*.012/50)*50);
  if(n(s.cash)<price)return toast('Caixa insuficiente para inspeção.');
  s.cash-=price;active.inspected=true;
  entry('Inspeção de leilão · '+active.car.name,-price);
  note('Laudo concluído: '+active.car.name+' · '+(active.defect?.name||'Sem defeitos relevantes')+'.');
  save();refresh();render();
 };
}
function history(a){return a.history.length?'<p><strong>Últimos resultados</strong></p>'+a.history.slice(0,3).map(h=>'<p>Dia '+n(h.day)+' · '+esc(h.name)+' · '+esc(h.result)+' · '+fmtMoney(h.price)+'</p>').join(''):'';}
function bid(amount){
 const a=ensure(),lot=a?.lot;if(!lot||n(s.day)>n(lot.ends))return;
 const minimum=Math.round((n(lot.high)+Math.max(100,Math.round(n(lot.high)*.02/100)*100))/100)*100;
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
 if(a.lot&&s.day>a.lot.ends)finish(a);
 if(!a.lot&&s.day>=n(a.nextDay))createLot(a);
 save();refresh();return result;
};
const previousSeed=seed;
seed=function(){previousSeed();const a=ensure();if(a&&!a.lot)createLot(a);save();refresh();};
const previousRender=render;let signature='';
render=function(){previousRender();const a=ensure(),next=[s?.day,s?.cash,s?.stock?.length,a?.lot?.high,a?.lot?.leader].join('|');if(next!==signature){signature=next;refresh();}};
const a=ensure();if(a&&!a.lot&&s.day>=n(a.nextDay))createLot(a);save();refresh();
})();
