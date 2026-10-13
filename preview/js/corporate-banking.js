/* Alpha 3.6 — Corporate banking for iPhone. Fictional credits, not real financial products. */
(function(){
'use strict';
const max=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
function bank(){s.empire=s.empire||{};const b=s.empire.bank||(s.empire.bank={loans:[],history:[],score:60,missed:0,lastDay:0,buffer:5000,nextId:1});b.loans=Array.isArray(b.loans)?b.loans:[];b.history=Array.isArray(b.history)?b.history:[];b.score=max(Math.round(b.score==null?60:num(b.score)),0,100);return b}
function debt(){return bank().loans.reduce((n,l)=>n+num(l.balance),0)}
function rate(){return Math.round(max(.0001,.007+(100-bank().score)*.00012+(Math.max(1,num(s.empire?.economy?.inflation))-1)*.004)*10000)/10000}
function limit(){return Math.max(0,Math.round((10000+num(s.sales)*1500+num(s.rep)*220+bank().score*180-debt())/100)*100)}
function log(type,amount){const b=bank();b.history.unshift({day:s.day,type,amount});b.history=b.history.slice(0,60)}
function borrow(amount,months){
 const b=bank(),e=s.empire?.economy;
 amount=Math.round(num(amount));months=Math.round(num(months));
 if(e?.bankrupt)return toast('Empresa falida');
 if(!Number.isFinite(amount)||amount<1000||amount>limit())return toast('Valor fora do limite de crédito');
 if(![30,60,90].includes(months))return toast('Prazo inválido');
 if(b.loans.filter(l=>num(l.balance)>0).length>=3)return toast('Máximo de 3 contratos ativos');
 const monthly=rate(),total=Math.round(amount*Math.pow(1+monthly,months));
 b.loans.push({id:b.nextId++,principal:amount,balance:total,monthlyRate:monthly,dailyPayment:Math.ceil(total/months),remaining:months,term:months,issued:s.day,grace:0,late:0});
 s.cash+=amount;entry('Empréstimo empresarial',amount);log('Crédito recebido',amount);note('Financiamento contratado: '+fmt(amount));save();render();toast('Crédito liberado');
}
function repay(id){
 const b=bank(),l=b.loans.find(x=>x.id===id);if(!l)return;
 const payment=Math.min(Math.max(0,num(s.cash)-Math.max(0,num(b.buffer)||0)),num(l.balance));
 if(payment<=0)return toast('Caixa insuficiente após a reserva de segurança');
 l.balance=Math.max(0,num(l.balance)-payment);l.remaining=Math.max(0,Math.ceil(l.balance/Math.max(1,l.dailyPayment)));
 s.cash-=payment;entry('Amortização de empréstimo',-payment);log('Amortização',-payment);
 if(l.balance===0){b.loans=b.loans.filter(x=>x!==l);b.score=max(b.score+3,0,100)}
 save();render();toast('Amortização: '+fmt(payment));
}
function defer(id){
 const b=bank(),l=b.loans.find(x=>x.id===id);if(!l||l.grace>0)return toast('Carência indisponível');
 if(b.score<35)return toast('Score insuficiente para carência');
 const fee=Math.ceil(num(l.balance)*.015);
 l.balance+=fee;l.grace=7;b.score=max(0,b.score-3);
 log('Carência contratada',fee);note('Carência de 7 dias: custo adicional '+fmt(fee));save();render();
}
function daily(){
 const b=bank();if(b.lastDay===s.day)return;b.lastDay=s.day;
 for(const l of [...b.loans]){
  if(l.grace>0){l.grace--;continue}
  const due=Math.min(num(l.balance),num(l.dailyPayment));
  if(due<=0){b.loans=b.loans.filter(x=>x!==l);continue}
  if(s.cash>=due){
   s.cash-=due;l.balance=Math.max(0,l.balance-due);l.remaining=Math.max(0,l.remaining-1);l.late=0;
   entry('Parcela do financiamento',-due);log('Parcela paga',-due);
   if(l.balance===0){b.loans=b.loans.filter(x=>x!==l);b.score=max(0,Math.min(100,b.score+2))}
  }else{
   l.late++;b.missed++;b.score=max(0,b.score-2);
   const penalty=Math.ceil(l.balance*.002);l.balance+=penalty;
   log('Parcela em atraso',penalty);
   if(l.late>=5){note('Banco alerta: financiamento em atraso há '+l.late+' dias.');}
  }
 }
}
const css=document.createElement('style');css.textContent=`
#ae-bank{background:#1b303b;border:1px solid #3f5a69;border-radius:13px;padding:13px;margin:12px 0;color:#f3f6f7}
#ae-bank h3{font-size:15px;margin:0 0 10px}
.ae-bank-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px}
.ae-bank-grid div{padding:10px;border-radius:9px;background:#29414e;min-width:0}
.ae-bank-grid small{display:block;font-size:11px;color:#bed0d9}
.ae-bank-grid strong{font-size:16px;overflow-wrap:anywhere}
#ae-bank label{font-size:12px;display:block;margin:8px 0 4px}
#ae-bank input,#ae-bank select{width:100%;min-height:44px;font-size:16px!important;background:#233b48;color:#fff;border:1px solid #5b7685;border-radius:9px;padding:9px}
#ae-bank button{min-height:44px!important;margin:5px 0}
.ae-bank-contract{padding:11px;margin:8px 0;border:1px solid #466272;border-radius:10px;font-size:12px}
.ae-bank-contract button{width:100%}
.ae-bank-note{font-size:11px;color:#c4d6df;line-height:1.5}
`;document.head.append(css);
const panel=document.createElement('section');panel.id='ae-bank';
const garage=document.getElementById('garage');if(garage){const center=document.getElementById('ae-command');if(center)center.after(panel);else garage.prepend(panel)}
let expanded=false;
function draw(){
 if(!panel.isConnected||!s)return;
 const b=bank(),loans=b.loans,owed=debt(),available=limit();
 panel.innerHTML='<h3>🏦 Banco empresarial</h3><div class="ae-bank-grid"><div><small>Crédito disponível</small><strong>'+fmt(available)+'</strong></div><div><small>Dívida total</small><strong>'+fmt(owed)+'</strong></div><div><small>Score de crédito</small><strong>'+b.score+'/100</strong></div><div><small>Juros diários estimados</small><strong>'+(rate()*100).toFixed(2).replace('.',',')+'%</strong></div></div><button id="ae-bank-toggle" class="ghost smallbtn" aria-expanded="'+expanded+'">'+(expanded?'Ocultar':'Gerenciar')+' financiamentos</button><div id="ae-bank-body" '+(expanded?'':'hidden')+'></div>';
 const body=panel.querySelector('#ae-bank-body');
 body.innerHTML='<p class="ae-bank-note">Crédito fictício para o jogo. Pagamento automático diário. O saldo devido já inclui os juros do prazo contratado.</p><label for="ae-bank-amount">Valor do empréstimo (CR)</label><input id="ae-bank-amount" type="number" inputmode="numeric" min="1000" step="1000" max="'+available+'" value="'+Math.min(available,10000)+'"><label for="ae-bank-term">Prazo em dias</label><select id="ae-bank-term"><option value="30">30 dias</option><option value="60">60 dias</option><option value="90">90 dias</option></select><p id="ae-bank-forecast" class="ae-bank-note"></p><button id="ae-bank-borrow" '+(available<1000?'disabled':'')+'>Contratar empréstimo</button><h4>Contratos ativos</h4>'+(loans.map(l=>'<div class="ae-bank-contract"><b>Contrato #'+l.id+'</b> · '+fmt(l.balance)+' restantes<br>Parcela diária: '+fmt(Math.min(l.balance,l.dailyPayment))+' · '+l.remaining+' dias · atrasos: '+l.late+(l.grace?' · carência '+l.grace+' dias':'')+'<button data-repay="'+l.id+'" class="ghost smallbtn">Amortizar com caixa disponível</button><button data-defer="'+l.id+'" class="ghost smallbtn" '+(l.grace||b.score<35?'disabled':'')+'>Pedir carência (7 dias)</button></div>').join('')||'<p class="ae-bank-note">Nenhum contrato ativo.</p>')+'<h4>Movimentações recentes</h4>'+(b.history.slice(0,5).map(h=>'<p class="ae-bank-note">Dia '+h.day+' · '+esc(h.type)+' · '+fmt(h.amount)+'</p>').join('')||'<p class="ae-bank-note">Sem movimentações.</p>');
 const forecast=()=>{const amount=num(body.querySelector('#ae-bank-amount')?.value),term=num(body.querySelector('#ae-bank-term')?.value);body.querySelector('#ae-bank-forecast').textContent='Custo total previsto: '+fmt(Math.round(amount*Math.pow(1+rate(),term)))+' · parcela aproximada: '+fmt(Math.ceil(amount*Math.pow(1+rate(),term)/term))+'/dia'};
 body.querySelector('#ae-bank-amount').addEventListener('input',forecast);body.querySelector('#ae-bank-term').addEventListener('change',forecast);forecast();
 body.querySelector('#ae-bank-borrow').addEventListener('click',()=>borrow(num(body.querySelector('#ae-bank-amount').value),num(body.querySelector('#ae-bank-term').value)));
 body.querySelectorAll('[data-repay]').forEach(btn=>btn.addEventListener('click',()=>repay(num(btn.dataset.repay))));
 body.querySelectorAll('[data-defer]').forEach(btn=>btn.addEventListener('click',()=>defer(num(btn.dataset.defer))));
 panel.querySelector('#ae-bank-toggle').addEventListener('click',()=>{expanded=!expanded;draw()});
}
const oldTick=tickDay;tickDay=function(){const before=s.day;oldTick();if(s.day!==before){daily();save();draw()}};
const oldSeed=seed;seed=function(){oldSeed();bank();save();draw()};
const oldRender=render;let sig='';
render=function(){oldRender();if(!s)return;const b=bank(),next=[s.day,s.cash,b.score,b.loans.length,debt(),b.missed].join('|');if(sig!==next){sig=next;draw()}};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(draw);
draw();
})();
