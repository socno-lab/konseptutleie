import test from 'node:test';import assert from 'node:assert/strict';
import {rentalStockText} from '../public/rental-stock.js?v=stockmobile20261107';
import {productSummary} from '../public/product-summary.js?v=stockmobile20261107';
test('owned quantity remains separate from unavailable stock and basket limits',()=>{
 assert.equal(rentalStockText({stock:12,unavailable:8,maxQuantity:4}),'12 stk. til utleie');
 assert.equal(rentalStockText({stock:1}),'1 stk. til utleie');
 assert.equal(rentalStockText({stock:8,rentalEnabled:false}),'');
 for(const p of [{stock:0},{stock:2.5}])assert.equal(rentalStockText(p),'Tilgjengelighet avklares');
 for(const p of [{isService:true},{isProposal:true}])assert.equal(rentalStockText(p),'Tilpasses etter behov');
});
test('detail uses selected variant and does not expose rental stock on purchase pages',()=>{
 const a={id:'a',name:'Natur',stock:4,category:'Stoler'},b={...a,id:'b',name:'Brun',stock:7};
 assert.match(productSummary(a,[a,b]),/Vi har 4 stk/);assert.match(productSummary(b,[a,b]),/Vi har 7 stk/);
 assert.doesNotMatch(productSummary(a,[a,b],{buy:true}),/Vi har 4 stk/);
 assert.match(productSummary(a,[a,b]),/ønsket periode avklares i tilbudet/);
});

test('package capacity follows the limiting owned component, including modules',()=>{
 const products=[{id:'chair',stock:12},{id:'table',stock:3,unavailable:2},{id:'module',stock:8,moduleSeries:'Sofa'},{id:'stylist',isService:true}];
 const p={id:'set',isPackage:true,components:[{id:'chair',quantity:4},{id:'table',quantity:1},{id:'module',quantity:2},{id:'stylist',quantity:1}]};
 assert.equal(rentalStockText(p,{products}),'3 pakker til utleie');
 assert.equal(rentalStockText({...p,components:[{id:'chair',quantity:8},{id:'chair',quantity:4}]},{products}),'1 pakke til utleie');
 assert.equal(rentalStockText({...p,components:[{id:'stylist',quantity:1}]},{products}),'Tilpasses etter behov');
 assert.equal(rentalStockText({...p,components:[{id:'missing',quantity:1}]},{products}),'Tilgjengelighet avklares');
});

test('series counts owned modules only within the displayed series',()=>{
 const a={id:'a',moduleSeries:'Natur',stock:8},b={id:'b',moduleSeries:'Natur',stock:12};
 const products=[a,b,{moduleSeries:'Brun',stock:9},{moduleSeries:'Natur',stock:4,active:false},{moduleSeries:'Natur',stock:3,rentalEnabled:false}];
 assert.equal(rentalStockText(a,{products,series:true}),'20 moduler til utleie');
 assert.equal(rentalStockText(a,{products}),'8 stk. til utleie');
});
