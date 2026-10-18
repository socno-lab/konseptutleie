import test from 'node:test';
import assert from 'node:assert/strict';
import {packageSelectionDraft,remaining,normalizeBasket,rentalEstimate} from '../public/catalog-model.js';
import {cartChange} from '../public/addon-model.js';
const common={active:true,price:0,weekPrice:0,monthPrice:0,priceOnRequest:true,unavailable:0};
const products=[
 {...common,id:'dinner',name:'Dinner plate',stock:40,addonOnly:true},
 {...common,id:'dessert',name:'Dessert plate',stock:40,addonOnly:true},
 {...common,id:'cutlery',name:'Cutlery',stock:40,addonOnly:true},
 {...common,id:'pack',name:'Borddekkingspakke',isPackage:true,components:['dinner','dessert','cutlery'].map(id=>({id,quantity:4})),relatedAddOns:['red','water']},
 ...['red','water'].map(id=>({...common,id,name:id,stock:10,addonOnly:true,requiredProductId:'pack',requiredProductQuantity:1})),
];
test('Four-person package supports several independent glass types up to 40 people',()=>{
 assert.equal(remaining('pack',{},products),10);
 assert.equal(packageSelectionDraft({},products,'pack',11,[]),null);
 const basket=packageSelectionDraft({},products,'pack',10,['red','water']);
 assert.deepEqual(basket,{pack:10,red:10,water:10});
 assert.equal(remaining('pack',basket,products),0);
 assert.deepEqual(normalizeBasket(basket,products),basket);
 assert.equal(rentalEstimate(basket,products,'2026-11-01','2026-11-01').total,null);
 assert.equal(cartChange(basket,products,'pack',9),null);
 assert.deepEqual(cartChange(basket,products,'red',0),{pack:10,water:10});
 assert.equal(packageSelectionDraft({},products,'pack',1,['red','red']),null);
 assert.equal(packageSelectionDraft({},products,'pack',1,['dinner']),null);
});
test('A scarce glass type cannot oversell or block package-only hire',()=>{
 const limited=products.map(p=>p.id==='water'?{...p,stock:3}:p);
 assert.equal(packageSelectionDraft({},limited,'pack',4,['water']),null);
 assert.deepEqual(packageSelectionDraft({},limited,'pack',4,[]),{pack:4});
 assert.deepEqual(packageSelectionDraft({},limited,'pack',3,['red','water']),{pack:3,red:3,water:3});
});
