/* Auto Empire Tycoon — pure, side-effect-free trade calculations. */
(function(root){
'use strict';
const amount=v=>Number.isFinite(Number(v))?Math.max(0,Number(v)):0;
const basis=car=>amount(car?.bought)+amount(car?.spent);
const analyze=(car,offer)=>{
 const sale=amount(offer),cost=basis(car),gross=sale-cost;
 return Object.freeze({sale,cost,gross,margin:sale>0?gross/sale*100:0,roi:cost>0?gross/cost*100:0,breakEven:cost,listed:amount(car?.price),discount:amount(car?.price)>0?(1-sale/amount(car.price))*100:0});
};
const summary=cars=>{
 const list=Array.isArray(cars)?cars:[];
 const listed=list.filter(c=>c&&c.listed);
 const asking=listed.reduce((sum,c)=>sum+amount(c.price),0);
 const cost=listed.reduce((sum,c)=>sum+basis(c),0);
 return Object.freeze({stock:list.length,listed:listed.length,asking,cost,gross:asking-cost,margin:asking>0?(asking-cost)/asking*100:0,invested:list.reduce((sum,c)=>sum+basis(c),0)});
};
root.AETradeMath=Object.freeze({amount,basis,analyze,summary});
})(window);
