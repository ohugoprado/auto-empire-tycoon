/* Alpha 5.9 — diverse fictional fleet, colorways and better market rotation. */
(function(){
'use strict';
const additions=[
['Velox City S',21000,'#3c8dd1','Hatch'],['Velox City GT',28000,'#e04b4b','Hatch'],
['Montara Trail',39500,'#607c51','SUV'],['Montara Grand',52000,'#222f43','SUV'],
['Aureon Executive',42000,'#bfc4c9','Sedã'],['Aureon Hybrid',48000,'#4e8f89','Sedã'],
['Ravik Work',37000,'#e2b85c','Picape'],['Ravik Adventure',61000,'#bd5d42','Picape'],
['Nexo Urban',18500,'#8c74b4','Compacto'],['Nexo E',34500,'#e8e9e6','Compacto'],
['Altis RS',69000,'#d04449','Esportivo'],['Altis Track',110000,'#293b6c','Esportivo'],
['Orion X',57000,'#344f66','Picape'],['Orion XL',75000,'#a4a8aa','Picape'],
['Lynx Z4 Turbo',33500,'#ecae39','Hatch'],['Lynx Touring',41000,'#5b6e86','Sedã'],
['Solara Prime',26000,'#d1c6b4','Sedã'],['Solara Cross',37000,'#a34b4b','SUV'],
['Vexa Mini',14500,'#c2d56b','Compacto'],['Vexa Urban',23000,'#53a2b0','Hatch'],
['Atlas Family',45500,'#718a9b','SUV'],['Atlas Cargo',49500,'#ece7dc','Picape'],
['Pulse Coupe',78000,'#9c3e61','Esportivo'],['Pulse GT-R',125000,'#43444b','Esportivo']
];
const palette=[['Branco pérola','#e8e9e6'],['Preto ônix','#252a33'],['Prata metálico','#a8b3be'],['Cinza grafite','#5a6874'],['Vermelho rubi','#c94a4e'],['Azul oceano','#337ab7'],['Verde oliva','#66856a'],['Amarelo solar','#e3b948'],['Laranja cobre','#bd7046'],['Violeta urbano','#8272a6']];
const pick=a=>a[Math.floor(Math.random()*a.length)];
for(const model of additions){if(!catalog.some(x=>x[0]===model[0]))catalog.push(model);}
const previousMake=makeCar;
makeCar=function(){
 const car=previousMake();
 const color=pick(palette);
 car.color=color[1];car.colorName=color[0];
 car.trim=['Base','Comfort','Sport','Premium'][Math.floor(Math.random()*4)];
 car.marketStory=car.condition>=82?'Bem conservado':car.km>140000?'Alta quilometragem':'Uso cotidiano';
 return car;
};
const previousPopulate=populate;
populate=function(){
 previousPopulate();
 if(!Array.isArray(s.market))return;
 // Maintain a useful spread of affordable and aspirational cars, not six random luxury offers.
 const bands=[...s.market];
 const cheapest=catalog.filter(x=>x[1]<=28000),mid=catalog.filter(x=>x[1]>28000&&x[1]<=60000);
 const premium=catalog.filter(x=>x[1]>60000);
 function replace(index,models){
  if(!models.length)return;
  const old=bands[index];const model=pick(models);
  const year=old.year,km=old.km,condition=old.condition;
  const value=Math.max(3000,Math.round(model[1]*(.7+(year-2013)*.045)*(1-km/1000000)));
  const color=pick(palette);
  Object.assign(old,{name:model[0],kind:model[3],color:color[1],colorName:color[0],value,ask:Math.max(1000,Math.round(value*(.77+Math.random()*.23)/100)*100)});
 }
 replace(0,cheapest);replace(1,cheapest);replace(2,mid);replace(3,mid);replace(4,premium);
};
if(s&&Array.isArray(s.market)){
 for(const car of s.market){
  if(car.colorName)continue;
  // Missing labels in legacy campaigns must never repaint an existing vehicle.
  if(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(car.color||''))){
   car.colorName=palette.find(color=>color[1].toLowerCase()===car.color.toLowerCase())?.[0]||'Cor original';
  }else{const color=pick(palette);car.color=color[1];car.colorName=color[0];}
 }
 save();
}
const css=document.createElement('style');css.textContent=`
.ae-redesign .vehicle{border-left:3px solid var(--ae-car-paint,transparent)}
.ae-paint-chip{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:#c5d5df;margin-top:4px}
.ae-paint-chip i{display:inline-block;width:11px;height:11px;border-radius:50%;border:1px solid #a8b5c2;background:var(--ae-paint)}
.ae-redesign .carart{background:linear-gradient(150deg,#24394a,#152b3a);border-radius:10px}
`;document.head.append(css);
const previousCarRow=carRow;
carRow=function(car){
 const html=previousCarRow(car);
 const color=/^#[0-9a-f]{6}$/i.test(String(car.color))?car.color:'#8e9caa';
 const label=String(car.colorName||'Cor de fábrica').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 return html.replace('class="vehicle"','class="vehicle" style="--ae-car-paint:'+color+'"').replace('</div></div></div>','<div class="ae-paint-chip" style="--ae-paint:'+color+'"><i></i>'+label+'</div></div></div>');
};
const previousRefresh=refreshPaid;
refreshPaid=function(){
 const before=Number(s.cash)||0;previousRefresh();
 if((Number(s.cash)||0)<before&&s.market?.length){note('Novo lote de veículos disponível. Compare preço, quilometragem e conservação.');save();}
};
(window.aeUiRefreshers||(window.aeUiRefreshers=[])).push(()=>{});
})();
