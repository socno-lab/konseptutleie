import test from 'node:test';import assert from 'node:assert/strict';
import {enquiryLineTotal} from '../public/admin/enquiry-line-pricing.js';
import {configureSiteSettings,defaultSettings} from '../public/site-settings.js?v=fest20261114';
import {retailRentalRates} from '../public/rental-pricing-model.js?v=fest20261114';
const period={start:'2026-12-05',end:'2026-12-06',scope:'standard',quantity:1};
test('a single retail-priced sofa module uses the configured scope rates and quantity without requiring a full sofa',()=>{
 const settings=structuredClone(defaultSettings);settings.pricing.eventFactor=2;configureSiteSettings(settings);
 try{const p={id:'end',name:'Hjørne-/endemodul',moduleSeries:'Sofa',moduleRole:'end',rentalPricingMode:'retail',purchaseUnitPrice:3500,price:0,active:true};
 assert.equal(enquiryLineTotal(p,period,[p]),retailRentalRates(3500).price*2);
 assert.equal(enquiryLineTotal(p,{...period,scope:'messe',quantity:2},[p]),retailRentalRates(3500,'messe').price*4);
 assert.equal(enquiryLineTotal(p,{...period,start:'',end:''},[p]),null);
 }finally{configureSiteSettings(defaultSettings);}
});
test('ordinary products and component packages use the same per-period calculation, with quote-only items left unpriced',()=>{
 const p={id:'chair',rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:700,active:true},pack={id:'pack',isPackage:true,rentalPricingMode:'components',components:[{id:'chair',quantity:2}]},products=[p,pack];
 assert.equal(enquiryLineTotal(p,period,products),200);assert.equal(enquiryLineTotal(pack,period,products),400);
 assert.equal(enquiryLineTotal({...p,priceOnRequest:true},period,[{...p,priceOnRequest:true}]),null);
});

test('same-day weekend rental is priced using lease dates, regardless of a preceding Friday default',()=>{const p={id:'chair',rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:700};assert.equal(enquiryLineTotal(p,{start:'2026-11-21',end:'2026-11-22',quantity:1,scope:'standard'},[p]),200);});
