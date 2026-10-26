import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultSettings,configureSiteSettings,validateSiteSettings} from '../public/site-settings.js';
import {migrateStylingPricing} from '../server/pricing-migration.mjs';
import {rentalRateSets,retailRentalRates} from '../public/rental-pricing-model.js';
import {ratePlan} from '../public/catalog-model.js';
const old={...defaultSettings,pricing:{price:.07,weekPrice:.18,monthPrice:.3,eventFactor:1.5,rounding:10}};
test('percentage migration is idempotent and preserves event rates',()=>{try{
 configureSiteSettings(old);const event=retailRentalRates(16000,'messe');
 const next=migrateStylingPricing(old);assert.equal(next.pricing.monthPrice,.27);assert.equal(next.pricing.eventMonthPrice,.45);
 assert.equal(migrateStylingPricing(next),next);assert.deepEqual(validateSiteSettings(next),next);
 configureSiteSettings(next);assert.deepEqual(retailRentalRates(16000,'messe'),event);assert.equal(retailRentalRates(16000).monthPrice,4320);
 assert.deepEqual(old.pricing,{price:.07,weekPrice:.18,monthPrice:.3,eventFactor:1.5,rounding:10});
}finally{configureSiteSettings();}});
test('day 31 starts half-price continuation; periods and event prices stay unchanged',()=>{try{
 configureSiteSettings(migrateStylingPricing(old));
 const product={id:'sofa',purchaseUnitPrice:16000,rentalPricingMode:'retail'};
 const rates=rentalRateSets(product);const p={...product,...rates.standard};
 for(const [days,expected] of [[1,1120],[2,2240],[7,2880],[30,4320],[31,4880],[35,5760],[37,5760],[60,6480],[61,7040]])assert.equal(ratePlan(p,days).total,expected,`${days} days`);
 const event={...product,...rates.messe};assert.equal(event.stylingContinuation,false);assert.equal(ratePlan(event,60).total,14400);
 const addon={id:'textile',addonOnly:true,rentalPricingMode:'period',price:400};const a={...addon,...rentalRateSets(addon).standard};
 for(const [d,n] of [[1,1],[30,1],[31,2],[60,2],[61,3]])assert.equal(ratePlan(a,d).total,400*n);
 const pack={id:'pack',isPackage:true,rentalPricingMode:'components',components:[{id:'sofa',quantity:2}]};
 const products=[p];assert.equal(ratePlan({...pack,...rentalRateSets(pack,[product]).standard},31,products).total,9760);
}finally{configureSiteSettings();}});
test('wall arrangements and outdoor modules receive continuation while real services and addons do not',()=>{
 const wall={id:'wall',wallGroup:'Bildevegg',isService:true,rentalPricingMode:'manual',price:60,weekPrice:160,monthPrice:280};
 const outdoor={id:'outdoor',moduleSeries:'Copacabana',category:'Utemøbler',price:170,weekPrice:330,monthPrice:570};
 for(const p of [wall,outdoor]){
  const rates=rentalRateSets(p);assert.equal(rates.standard.stylingContinuation,true);assert.equal(rates.messe.stylingContinuation,false);
  assert.equal(ratePlan({...p,...rates.standard},31).total,p.monthPrice+p.price/2);
 }
 for(const p of [{...wall,wallGroup:'',offeringType:'service'},{...wall,addonOnly:true},{...wall,rentalPricingMode:'period'}])assert.ok(!rentalRateSets(p).standard.stylingContinuation);
});
