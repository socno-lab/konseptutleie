import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalUsageState,rentalUsageLabels,rentalUsageDescriptions,rentalUsageExplanation} from '../public/rental-usage-model.js';
import {applyRentalScope,rentalRateSets} from '../public/rental-pricing-model.js';
import {rentalEstimate} from '../public/catalog-model.js';
test('A new visitor in all uses must choose before seeing prices',()=>{
 assert.deepEqual(rentalUsageState(),{scope:'messe',confirmed:false});
 assert.equal(rentalUsageState({explicit:'unknown',saved:'unknown'}).confirmed,false);
 assert.deepEqual(rentalUsageState({explicit:'standard'}),{scope:'standard',confirmed:true});
 assert.deepEqual(rentalUsageState({saved:'messe'}),{scope:'messe',confirmed:true});
});
test('Only housing photo and viewing use housing rates; concrete use overrides saved scope',()=>{
 assert.deepEqual(rentalUsageState({purpose:'boligsalg',saved:'messe'}),{scope:'standard',confirmed:true});
 for(const purpose of ['messe','bedrift','fest','jul'])assert.deepEqual(rentalUsageState({purpose,saved:'standard',explicit:'standard'}),{scope:'messe',confirmed:true});
 assert.deepEqual(Object.keys(rentalUsageLabels),['standard','messe']);
 assert.equal(rentalUsageLabels.standard,'Boligfoto og visning');
 assert.equal(rentalUsageLabels.messe,'Arrangementer og annen bruk');
 assert.equal(rentalUsageDescriptions.messe,'Til selskap, messe, arbeidsplassen eller hjemmet.');
 assert.equal(rentalUsageExplanation,'Prisen tar hensyn til bruk og forventet slitasje.');
});
test('Changing use recalculates the same quantities and dates without adding a surcharge line',()=>{
 const original=[{id:'chair',active:true,stock:8,unavailable:0,purchaseUnitPrice:2000,rentalPricingMode:'retail'}];
 original[0].rentalRates=rentalRateSets(original[0],original);
 const basket={chair:2},dates=['2026-11-01','2026-11-03'];
 const standard=rentalEstimate(basket,applyRentalScope(original,'standard'),...dates);
 const event=rentalEstimate(basket,applyRentalScope(original,'messe'),...dates);
 assert.equal(event.days,standard.days);assert.equal(event.lines.length,1);assert.equal(event.lines[0].quantity,2);
 assert.equal(event.total,1200);assert.equal(standard.total,800);assert.deepEqual(basket,{chair:2});
});
