import test from 'node:test';
import assert from 'node:assert/strict';
import {detailSelectionPrices} from '../public/detail-price-model.js';
import {ratePlan} from '../public/catalog-model.js';
const chair={id:'chair',price:100,weekPrice:400,monthPrice:1000};
const textile={id:'textile',price:250,rentalPricingMode:'period'};
const decor={id:'decor',price:900,rentalPricingMode:'period'};
const pack={id:'pack',components:[{id:'chair',quantity:2}],isPackage:true,rentalPricingMode:'components'};
const products=[chair,textile,decor,pack];
test('duration totals add period addons once, independently of furniture quantity',()=>{
 const q=detailSelectionPrices(chair,2,{textile:1},products);
 assert.deepEqual([q.price,q.weekPrice,q.monthPrice],[450,1050,2250]);
 assert.equal(q.hasExtras,true);assert.equal(q.hasPeriodExtras,true);
 const base=detailSelectionPrices(chair,2,{},products);
 assert.deepEqual([base.price,base.weekPrice,base.monthPrice],[200,800,2000]);
});
test('actual durations retain separate period charges past 30 days',()=>{
 for(const days of [1,3,7,29,30,31,60,61]){
  const result=detailSelectionPrices(chair,2,{textile:1,decor:2},products,days);
  assert.equal(result.selectedTotal,2*ratePlan(chair,days,products).total+Math.ceil(days/30)*(250+1800));
 }
});
test('package components are counted once, with chosen addons counted separately',()=>{
 const q=detailSelectionPrices(pack,2,{textile:2},products,31);
 assert.equal(q.price,900);assert.equal(q.weekPrice,2100);assert.equal(q.monthPrice,4500);
 assert.equal(q.selectedTotal,4*ratePlan(chair,31,products).total+1000);
});
test('unpriced and unknown selections never claim a complete price',()=>{
 for(const extras of [{missing:1},{quote:1}]){
  const q=detailSelectionPrices(chair,1,extras,[...products,{id:'quote',priceOnRequest:true}],7);
  assert.equal(q.price,null);assert.equal(q.selectedTotal,null);
 }
 assert.equal(detailSelectionPrices(chair,1,{missing:0},products).price,100);
});
test('invalid quantities fail closed, including negative quantities for the base id',()=>{
 for(const [quantity,extras] of [[0,{}],[1.5,{}],[1,{textile:-1}],[1,{textile:0.5}],[2,{chair:-1}]]){
  const q=detailSelectionPrices(chair,quantity,extras,products,7);
  assert.equal(q.valid,false);assert.equal(q.price,null);assert.equal(q.selectedTotal,null);
 }
});

test('400 kr per 30 days stays a single charge for two days and renews after day 30',()=>{
 const product={id:'base400',price:200,weekPrice:1400,monthPrice:6000},addon={id:'addon400',price:400,rentalPricingMode:'period'},items=[product,addon];
 assert.equal(detailSelectionPrices(product,1,{addon400:1},items,2).selectedTotal,800);
 for(const days of [1,2,7,30,31,60,61])assert.equal(detailSelectionPrices(product,1,{addon400:2},items,days).selectedTotal,ratePlan(product,days,items).total+800*Math.ceil(days/30));
});
