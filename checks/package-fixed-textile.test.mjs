import test from 'node:test';
import assert from 'node:assert/strict';
import {ratePlan,rentalEstimate} from '../public/catalog-model.js';
import {packageGroupPeriodTotal} from '../public/package-cart-model.js';
const products=[
 {id:'sofa',active:true,price:100,weekPrice:500,monthPrice:1500},
 {id:'textile',active:true,isService:true,rentalPricingMode:'period',price:400,weekPrice:400,monthPrice:400},
 {id:'pack',active:true,isPackage:true,rentalPricingMode:'components',components:[{id:'sofa',quantity:1},{id:'textile',quantity:1}],price:500,weekPrice:900,monthPrice:1900}
];
test('fixed textile is charged once when a package spans multiple weeks',()=>{
 for(const days of [1,2,8,15,30])assert.equal(ratePlan(products[2],days,products).total,ratePlan(products[0],days).total+400);
 assert.equal(packageGroupPeriodTotal({packageId:'pack',quantity:2},products,8),2*(600+400));
});
test('package textile repeats for each started 30-day period',()=>{
 for(const days of [31,60,61,90])assert.equal(ratePlan(products[2],days,products).total,ratePlan(products[0],days).total+400*Math.ceil(days/30));
 assert.equal(rentalEstimate({pack:1},products,'2026-10-01','2026-10-31').total,2400);
});
