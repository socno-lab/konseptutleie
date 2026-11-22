import test from 'node:test';
import assert from 'node:assert/strict';
import {transportWeekdayPolicy,transportDateError,transportDateLimits} from '../public/transport-weekdays.js';
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
 const d=input();Object.assign(d.details,{deliveryDate:'2030-11-01',pickupDate:'2030-11-04'});assert.throws(()=>snapshot(d),/Helgeleie krever levering og henting/);d.details.end='2030-11-04';const weekday=snapshot(d);assert.equal(weekday.delivery.total,1380);assert.ok(weekday.total>1380);assert.equal(weekday.delivery.dates.pickupDate,'2030-11-04');
 d.details.deliveryDate='2030-11-04';assert.throws(()=>snapshot(d),/Levering må være/);
});
test('weekend estimator returns manual without requesting Google',async()=>{
 let calls=0;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'test'},async()=>{calls++;throw Error('unexpected route request');});
 const result=await estimator.estimate({...period,scope:'messe',address:'Eksempelveien 12, 2010 Strømmen',basket:{chair:1},visits:2},'test',[chair]);assert.equal(result.manual,true);assert.equal(result.reason,'weekend');assert.equal(result.prices,null);assert.equal(calls,0);
});

test('transport boundaries allow only adjacent business days and allow manually requested weekend styling visits',()=>{
 const event={start:'2030-11-02',end:'2030-11-03',scope:'messe'};
 assert.deepEqual(transportDateLimits(event),{deliveryDate:{min:'2030-11-01',max:'2030-11-02'},pickupDate:{min:'2030-11-03',max:'2030-11-04'}});
 assert.equal(transportDateError({...event,deliveryDate:'2030-11-01',pickupDate:'2030-11-04'}),'');
 assert.ok(transportDateError({...event,deliveryDate:'2030-10-31'}));assert.ok(transportDateError({...event,pickupDate:'2030-11-05'}));assert.equal(transportDateError({...event,scope:'standard',deliveryDate:'2030-11-02'}),'');assert.equal(transportWeekdayPolicy({...event,scope:'standard',deliveryDate:'2030-11-02'}).manual,true);
});

test('styling keeps Friday/Monday defaults but accepts requested Sunday collection without fixed transport price',()=>{
 const d=input();d.details.occasion='Boligfoto og visning';const normal=snapshot(d);assert.equal(normal.delivery.total,1380);assert.equal(normal.delivery.dates.pickupDate,'2030-11-04');
 d.details.pickupDate='2030-11-03';const requested=snapshot(d);assert.equal(requested.delivery.dates.pickupDate,'2030-11-03');assert.equal(requested.delivery.total,null);assert.equal(requested.total,null);
});


test('event one-day weekend orders require both paid visits the same day on the server',()=>{
 const d=input();d.details.end=d.details.start;
 const result=snapshot(d);assert.equal(result.lines.find(line=>line.id==='chair').total,150,'same-day hire keeps one day at the event rate');assert.equal(result.delivery.total,null);assert.deepEqual(result.delivery.dates,{deliveryDate:d.details.start,pickupDate:d.details.start});
 for(const delivery of ['Henter og returnerer selv','Kun levering – jeg returnerer selv','Kun henting – jeg henter selv','Avklares senere']){d.details.delivery=delivery;assert.throws(()=>snapshot(d),/Éndagsleie i helgen krever/);}
 d.details.delivery='Ønsker levering og henting';d.details.pickupDate='2030-11-04';assert.throws(()=>snapshot(d),/Éndagsleie i helgen krever/);
 d.details.occasion='Boligfoto og visning';d.details.delivery='Henter og returnerer selv';delete d.details.pickupDate;assert.equal(snapshot(d).delivery.total,0);
});


test('event Friday to Sunday accepts both collection options and rejects own return or Monday override',()=>{
 const d=input();d.details.start='2030-11-01';
 for(const delivery of ['Ønsker levering og henting','Kun henting – jeg henter selv']){d.details.delivery=delivery;const result=snapshot(d);assert.equal(result.delivery.dates.pickupDate,'2030-11-03');assert.equal(result.delivery.total,null);}
 for(const delivery of ['Henter og returnerer selv','Kun levering – jeg returnerer selv','Avklares senere']){d.details.delivery=delivery;assert.throws(()=>snapshot(d),/krever henting hos kunden/);}
 d.details.delivery='Kun henting – jeg henter selv';d.details.pickupDate='2030-11-04';assert.throws(()=>snapshot(d),/krever henting hos kunden/);
 d.details.occasion='Boligfoto og visning';d.details.delivery='Henter og returnerer selv';assert.equal(snapshot(d).delivery.total,0);
});


test('Saturday to Sunday event submission rejects warehouse pickup and shifted transport dates',()=>{
 const d=input();for(const choice of ['Henter og returnerer selv','Kun henting – jeg henter selv','Kun levering – jeg returnerer selv','Avklares senere']){d.details.delivery=choice;assert.throws(()=>snapshot(d),/Helgeleie krever/);}
 d.details.delivery='Ønsker levering og henting';assert.equal(snapshot(d).delivery.total,null);d.details.deliveryDate='2030-11-01';assert.throws(()=>snapshot(d),/Helgeleie krever/);
 d.details.occasion='Boligfoto og visning';d.details.delivery='Henter og returnerer selv';delete d.details.deliveryDate;assert.equal(snapshot(d).delivery.total,0);
});
