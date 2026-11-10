import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCatalogOrder,applyCatalogOrder,rememberCardOrder} from '../public/catalog-manual-order.js';
import {orderRentalCards} from '../public/catalog-order-model.js';
const card=(id,isPackage=false)=>({product:{id},isPackage});
const ids=cards=>cards.map(c=>c.product.id);
test('manual order applies to every purpose and category; category overrides inheritance without affecting another scope',()=>{
 for(const purpose of ['boligsalg','messe','bedrift','fest','jul','produksjon','alle']){
 const cards=[card('a'),card('b'),card('c')];
 let orders=rememberCardOrder([],purpose,'Alle',[cards[2],cards[0],cards[1]]);
 assert.deepEqual(ids(applyCatalogOrder(cards,purpose,'Sofaer',orders)),['c','a','b']);
 orders=rememberCardOrder(orders,purpose,'Sofaer',[cards[1],cards[2],cards[0]]);
 assert.deepEqual(ids(applyCatalogOrder(cards,purpose,'Sofaer',orders)),['b','c','a']);
 assert.deepEqual(ids(applyCatalogOrder(cards,purpose,'Bord',orders)),['c','a','b']);
 assert.deepEqual(ids(applyCatalogOrder(cards,purpose==='messe'?'fest':'messe','Sofaer',orders)),['a','b','c']);
 assert.deepEqual(ids(applyCatalogOrder(cards,purpose,'Sofaer',orders.filter(o=>o.category!=='Sofaer'))),['c','a','b']);
 }
});
test('groups retain position when representative changes; new products append and stale ids are ignored',()=>{
 const grouped={product:{id:'a'},products:[{id:'a'},{id:'b'}]};
 const orders=rememberCardOrder([],'messe','Alle',[grouped,card('c')]);
 const cards=[card('new'),card('c'),{product:{id:'b'},products:[{id:'b'}]}];
 assert.deepEqual(ids(applyCatalogOrder(cards,'messe','Alle',orders)),['b','c','new']);
 assert.deepEqual(ids(applyCatalogOrder([card('c')],'messe','Alle',orders)),['c']);
});
test('Messe Alle keeps packages first while respecting manual order within each group',()=>{
 const cards=[card('a'),card('p',true),card('b'),card('q',true)];
 const orders=rememberCardOrder([],'messe','Alle',[cards[2],cards[3],cards[0],cards[1]]);
 assert.deepEqual(ids(orderRentalCards(cards,'messe','Alle',orders)),['q','p','b','a']);
});
test('invalid or duplicate manual order records are rejected',()=>{
 assert.deepEqual(validateCatalogOrder(),[]);
 for(const value of [null,{},[{purpose:'unknown',category:'Alle',ids:[]}],[{purpose:'messe',category:'Alle',ids:['a','a']}],[{purpose:'messe',category:'<script>',ids:[]}],[{purpose:'messe',category:'Alle',ids:[]},{purpose:'messe',category:'Alle',ids:[]}]])assert.throws(()=>validateCatalogOrder(value));
});
