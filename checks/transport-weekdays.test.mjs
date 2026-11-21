import test from 'node:test';
import assert from 'node:assert/strict';
import {transportWeekdayPolicy} from '../public/transport-weekdays.js';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {createDeliveryEstimator} from '../server/delivery.mjs';
const period={start:'2030-11-02',end:'2030-11-03',mode:'delivery'};
const chair={id:'chair',name:'Stol',active:true,stock:10,unavailable:0,rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:500};
const input=()=>({basket:{chair:1},details:{phone:'00000000',address:'Eksempelveien 12, 2010 Strømmen',occasion:'Messe og stand',delivery:'Ønsker levering og henting',start:period.start,end:period.end}});
const value={id:'TEST',kind:'rental',name:'Eksempel',email:'test@example.invalid'};
const snapshot=d=>createEnquirySnapshot(value,d,[chair],{verifyDelivery:()=>({total:1380,perVisit:690,visits:2}),now:new Date('2030-10-01T12:00:00Z')});
test('styling defaults to Friday/Monday, event to actual weekend; explicit weekday visits remain priced',()=>{
 const styling=transportWeekdayPolicy({...period,scope:'standard'});assert.equal(styling.deliveryDate,'2030-11-01');assert.equal(styling.pickupDate,'2030-11-04');assert.equal(styling.manual,false);
 assert.equal(transportWeekdayPolicy({...period,scope:'messe'}).manual,true);
 assert.equal(transportWeekdayPolicy({...period,scope:'messe',deliveryDate:'2030-11-01',pickupDate:'2030-11-04'}).manual,false);
 for(const mode of ['deliveryOnly','collectionOnly']){const d={...period,scope:'messe',mode,deliveryDate:'2030-11-01',pickupDate:'2030-11-04'};d[mode==='deliveryOnly'?'pickupDate':'deliveryDate']='2030-11-02';assert.equal(transportWeekdayPolicy(d).manual,false,'only paid endpoint determines tariff');}
 assert.equal(transportWeekdayPolicy({...period,scope:'messe',mode:'pickup'}).manual,false);
});
test('weekend submission ignores a route quote, never invents a grand total, and preserves actual transport dates',()=>{
 const weekend=snapshot(input());assert.equal(weekend.delivery.total,null);assert.equal(weekend.total,null);assert.match(weekend.delivery.label,/må beregnes/);assert.deepEqual(weekend.delivery.dates,{deliveryDate:period.start,pickupDate:period.end});
 const d=input();Object.assign(d.details,{deliveryDate:'2030-11-01',pickupDate:'2030-11-04'});const weekday=snapshot(d);assert.equal(weekday.delivery.total,1380);assert.ok(weekday.total>1380);assert.equal(weekday.delivery.dates.pickupDate,'2030-11-04');
 d.details.deliveryDate='2030-11-04';assert.throws(()=>snapshot(d),/må omfatte/);
});
test('weekend estimator returns manual without requesting Google',async()=>{
 let calls=0;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'test'},async()=>{calls++;throw Error('unexpected route request');});
 const result=await estimator.estimate({...period,scope:'messe',address:'Eksempelveien 12, 2010 Strømmen',basket:{chair:1},visits:2},'test',[chair]);assert.equal(result.manual,true);assert.equal(result.reason,'weekend');assert.equal(result.prices,null);assert.equal(calls,0);
});
