import test from 'node:test';import assert from 'node:assert/strict';
import {rentalStockText} from '../public/rental-stock.js?v=stock20261107';
import {productSummary} from '../public/product-summary.js?v=stock20261107';
test('owned quantity remains separate from unavailable stock and basket limits',()=>{
 assert.equal(rentalStockText({stock:12,unavailable:8,maxQuantity:4}),'12 stk. til utleie');
 for(const p of [{stock:1},{stock:0},{stock:2.5},{stock:8,isPackage:true},{stock:8,isService:true},{stock:8,isProposal:true},{stock:8,rentalEnabled:false},{stock:8,moduleSeries:'Sofa'}])assert.equal(rentalStockText(p),'');
});
test('detail uses selected variant and does not expose rental stock on purchase pages',()=>{
 const a={id:'a',name:'Natur',stock:4,category:'Stoler'},b={...a,id:'b',name:'Brun',stock:7};
 assert.match(productSummary(a,[a,b]),/Vi har 4 stk/);assert.match(productSummary(b,[a,b]),/Vi har 7 stk/);
 assert.doesNotMatch(productSummary(a,[a,b],{buy:true}),/Vi har 4 stk/);
 assert.match(productSummary(a,[a,b]),/ønsket periode avklares i tilbudet/);
});
