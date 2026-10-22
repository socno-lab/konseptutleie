import test from 'node:test';
import assert from 'node:assert/strict';
import {saveSaleSetup,restoreSaleSetups,saleWithoutSetups,saleSetupSummary} from '../public/sale-sofa-model.js';
import {saleEstimate} from '../public/sales-model.js';
import {sofaCartRow} from '../public/sofa-cart-row.js';
import {cartThumbnail} from '../public/cart-thumbnail.js';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
const end={id:'end',name:'Ende',moduleSeries:'En sofa med et ekstra langt navn',moduleRole:'end',moduleWidth:92,active:true,saleEnabled:true,salePrice:1000,category:'Sofaer'},middle={...end,id:'middle',name:'Midt',moduleRole:'middle',moduleWidth:70,salePrice:600},chair={id:'chair',name:'Stol',category:'Stoler',active:true,saleEnabled:true,salePrice:300};
const products=[end,middle,chair],a={id:'a',series:end.moduleSeries,selection:{end:2,middle:1}},b={id:'b',series:end.moduleSeries,selection:{end:2}};
test('independent purchase sofas edit, duplicate, remove and restore without losing ordinary products or prices',()=>{
 const first=saveSaleSetup([],{chair:2},products,a);assert.equal(saleEstimate(first.basket,products).total,3200);
 const second=saveSaleSetup(first.setups,first.basket,products,b);assert.equal(second.setups.length,2);assert.equal(saleEstimate(second.basket,products).total,5200);
 const copy=saveSaleSetup(second.setups,second.basket,products,{...a,id:'copy'});assert.equal(copy.setups.length,3);assert.equal(saleEstimate(copy.basket,products).total,7800);
 const edit=saveSaleSetup(copy.setups,copy.basket,products,{...b,selection:{middle:3}},'b');assert.deepEqual(edit.setups[0],a);assert.equal(saleEstimate(edit.basket,products).total,7600);
 const removed=saleWithoutSetups(edit.basket,[a]);assert.equal(saleEstimate(removed,products).total,5000);assert.equal(removed.chair,2);
 assert.deepEqual(restoreSaleSetups(edit.basket,JSON.parse(JSON.stringify(edit.setups)),products),edit.setups);
 const c=saleSetupSummary(a,products);assert.equal(c.count,3);assert.equal(c.width,254);assert.equal(c.quote.total,2600);
});
test('purchase migration preserves old cart quantities and separates multiple ends into valid sofas',()=>{
 const basket={end:4,middle:2,chair:1},setups=restoreSaleSetups(basket,[],products);assert.equal(setups.length,2);assert.deepEqual(saleWithoutSetups(basket,setups),{chair:1});
 assert.equal(saveSaleSetup([],{},products,{...a,selection:{end:3}}),null);assert.equal(saveSaleSetup([],{},products,{...a,selection:{chair:1}}),null);assert.equal(saveSaleSetup([],{},products,{...a,selection:{end:1.5}}),null);assert.equal(saveSaleSetup([],{end:99},products,a),null);
});
test('ordinary images and complete sofa previews reuse the identical thumbnail wrapper; compact rows keep all actions',()=>{
 assert.match(cartThumbnail(chair),/class="cart-thumbnail"/);const row=sofaCartRow({setup:a,index:1,...saleSetupSummary(a,products),priceText:'2 600 kr',purchase:true});
 assert.match(row,/class="cart-thumbnail"/);assert.match(row,/Sofa 2/);assert.match(row,/254 cm bred/);assert.match(row,/data-sale-sofa-edit="a"/);assert.match(row,/data-sale-sofa-copy="a"/);assert.match(row,/data-sale-sofa-remove="a"/);assert.doesNotMatch(row,/rate-grid|sofa-cart-card|sofa-cart-sketch|figcaption/);
});
test('server preserves separate purchase sofa composition and rejects overclaimed or invalid module groups',()=>{
 const value={id:'test',kind:'purchase',name:'Eksempel',email:'test@example.invalid',terms:'2026-10-22'},input={basket:{end:4,middle:1},purchaseSofas:[a,b],details:{phone:'00000000',address:'Eksempelveien 1, 1470 Eksempelsted',delivery:'Henter selv etter avtale'}};
 const snap=createEnquirySnapshot(value,input,products);assert.equal(snap.total,4600);assert.equal(snap.facts.filter(([key])=>key.startsWith('Sofa ')).length,2);
 assert.throws(()=>createEnquirySnapshot(value,{...input,basket:{end:2,middle:1}},products),/modulene/);assert.throws(()=>createEnquirySnapshot(value,{...input,purchaseSofas:[a,a]},products),/sofaoppsettene/);
});
