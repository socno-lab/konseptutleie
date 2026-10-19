import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {retailRentalRates,resolvedRentalRates,rentalRateSets,applyRentalScope,scopeForOccasion,rentalPricingMode} from '../public/rental-pricing-model.js';
import {validateCatalog} from '../server/catalog.mjs';
import {publicCatalog} from '../app-server.mjs';
import {rentalEstimate,moduleConfiguration} from '../public/catalog-model.js';

test('Retail rates use gross reference, independent event rounding and never acquisition cost',()=>{
 const p={id:'chair',purchaseUnitPrice:1749,acquisitionCost:649,price:90,weekPrice:170,monthPrice:290};
 assert.deepEqual(retailRentalRates(1749),{price:130,weekPrice:350,monthPrice:620,priceOnRequest:false});
 assert.deepEqual(retailRentalRates(1749,'messe'),{price:190,weekPrice:530,monthPrice:920,priceOnRequest:false});
 assert.deepEqual(resolvedRentalRates({...p,acquisitionCost:1}),resolvedRentalRates(p));
 assert.deepEqual(retailRentalRates(1000),{price:70,weekPrice:200,monthPrice:350,priceOnRequest:false});
 for(const reference of [undefined,null,0,NaN,-1])assert.equal(retailRentalRates(reference).priceOnRequest,true);
});
test('Manual, quoted services and component packages preserve their explicit meaning',()=>{
 const manual={id:'manual',rentalPricingMode:'manual',purchaseUnitPrice:1749,price:100,weekPrice:300,monthPrice:500};
 assert.equal(resolvedRentalRates(manual).price,100);
 assert.equal(resolvedRentalRates(manual,[],'messe').price,150);
 assert.equal(resolvedRentalRates({...manual,isService:true},[],'messe').price,100);
 const chair={id:'chair',purchaseUnitPrice:1749},table={id:'table',purchaseUnitPrice:4000};
 const pack={id:'pack',isPackage:true,rentalPricingMode:'components',components:[{id:'chair',quantity:2},{id:'table',quantity:1}]};
 assert.equal(resolvedRentalRates(pack,[chair,table]).price,540);
 assert.equal(resolvedRentalRates(pack,[chair,table],'messe').price,800);
 assert.equal(resolvedRentalRates(pack,[chair]).priceOnRequest,true);
 assert.equal(resolvedRentalRates({...pack,rentalPricingMode:'manual',priceOnRequest:true},[chair,table]).priceOnRequest,true);
 assert.equal(rentalPricingMode({isService:true,purchaseUnitPrice:1000}),'manual');
});
test('Public rates reprice modules, persisted baskets and estimates without leaking costs or changing purchase price',()=>{
 const common={active:true,stock:4,unavailable:0,moduleSeries:'Test',moduleRole:'middle',moduleWidth:90,purchaseUnitPrice:1749};
 const raw={products:[{...common,id:'m',acquisitionCost:649}]};
 const catalog=publicCatalog(raw),standard=applyRentalScope(catalog.products,'standard'),event=applyRentalScope(catalog.products,'messe');
 assert.equal(Object.hasOwn(catalog.products[0],'acquisitionCost'),false);
 assert.equal(Object.hasOwn(catalog.products[0],'purchaseUnitPrice'),false);
 assert.equal(moduleConfiguration('Test',{m:2},{},standard).weekPrice,700);
 assert.equal(moduleConfiguration('Test',{m:2},{},event).weekPrice,1060);
 assert.equal(rentalEstimate({m:2},event,'2026-10-20','2026-10-26').total,1060);
 assert.equal(scopeForOccasion('Messe og stand'),'messe');
 assert.equal(scopeForOccasion('Event og selskap'),'messe');
 assert.equal(scopeForOccasion('Bedrift'),'standard');
 assert.deepEqual(applyRentalScope(event,'standard'),standard);
});
test('Catalog saves persist the selected mode, apply all retail prices and reject impossible modes',()=>{
 const {products}=JSON.parse(readFileSync(new URL('../data/catalog-export-2026-10-17.json',import.meta.url)));
 const p=products.find(p=>!p.isPackage&&!p.isService&&!p.wallGroup);p.purchaseUnitPrice=1749;p.acquisitionCost=649;
 let saved=validateCatalog(products).find(x=>x.id===p.id);
 assert.equal(saved.rentalPricingMode,'retail');assert.equal(saved.price,130);assert.equal(saved.weekPrice,350);
 p.rentalPricingMode='manual';saved=validateCatalog(products).find(x=>x.id===p.id);assert.equal(saved.price,p.price);
 p.rentalPricingMode='components';assert.throws(()=>validateCatalog(products),/modell for leiepris/);
 p.rentalPricingMode='random';assert.throws(()=>validateCatalog(products),/modell for leiepris/);
});
