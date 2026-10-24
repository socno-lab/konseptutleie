import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDateOnly,osloToday,addDateDays,rentalDayCount,validateRentalPeriod,MAX_RENTAL_DAYS} from '../public/rental-dates.js';
import {getTermsVersions,requiredEnquiryTerms,validateEnquiryTerms} from '../public/terms-versions.js';
import {rentalDays} from '../public/catalog-model.js';
import {defaultSettings} from '../public/site-settings.js';
import {discountQuote} from '../server/discounts.mjs';
import {validateSubmission,createSubmissionSender,submissionFingerprint} from '../server/submissions.mjs';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';

const chair={id:'chair',name:'Stol',active:true,stock:10,unavailable:0,rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:500,saleEnabled:true,salePrice:1990,category:'Stoler'};
const pack={id:'pack',name:'Bedriftspakke',active:true,stock:10,isPackage:true,components:[{id:'chair',quantity:1}],businessPurchase:true,purchasePriceMode:'manual',purchasePrice:6000,rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:500};
const products=[chair,pack],versions=getTermsVersions(),now=new Date('2027-12-31T23:30:00Z');
const input=()=>({id:'9fd1dd19-7710-41d5-99bc-7d2f45c0d057',kind:'rental',name:'Lokal kontroll',email:'test@example.invalid',terms:versions.rental,basket:{chair:1},details:{phone:'00000000',address:'Eksempelveien 1, 1470 Eksempelsted',start:'2028-01-01',end:'2028-01-01',delivery:'Henter og returnerer selv',occasion:'Boligfoto og visning'}});

test('strict date-only parsing rejects rolled dates, timestamps, whitespace and invalid leap years',()=>{
 for(const value of ['2026-02-30','2026-02-29','2100-02-29','2026-13-01','2026-00-01','2026-01-00','0000-01-01','2026-1-01',' 2026-01-01','2026-01-01T00:00:00Z',null,undefined,20260101])assert.equal(parseDateOnly(value),null,String(value));
 for(const value of ['2000-02-29','2024-02-29','2028-02-29','2027-12-31'])assert.equal(new Date(parseDateOnly(value)).toISOString().slice(0,10),value);
 assert.equal(addDateDays('2028-02-28',1),'2028-02-29');assert.equal(addDateDays('2028-02-29',1),'2028-03-01');assert.equal(addDateDays('2027-12-31',1),'2028-01-01');
});
test('Oslo today and inclusive calendar days remain correct across DST and New Year',()=>{
 assert.equal(osloToday(new Date('2026-12-31T22:59:00Z')),'2026-12-31');assert.equal(osloToday(new Date('2026-12-31T23:01:00Z')),'2027-01-01');
 assert.equal(osloToday(new Date('2027-06-01T22:01:00Z')),'2027-06-02');
 for(const [start,end] of [['2027-03-27','2027-03-29'],['2027-10-30','2027-11-01'],['2027-12-31','2028-01-02']])assert.equal(rentalDayCount(start,end),3);
 assert.equal(rentalDayCount('2028-02-28','2028-03-01'),3);assert.equal(rentalDayCount('2028-01-02','2028-01-01'),null);
});
test('shared policy allows today and 365 inclusive days, rejecting past and 366-day leap-year periods',()=>{
 assert.equal(MAX_RENTAL_DAYS,365);assert.equal(validateRentalPeriod('2028-01-01','2028-01-01',{now}).days,1);
 assert.equal(validateRentalPeriod('2028-01-01','2028-12-30',{now}).days,365);
 for(const [start,end] of [['2027-12-31','2028-01-01'],['2028-01-01','2028-12-31'],['2028-02-30','2028-03-02'],['2028-01-02','2028-01-01'],['','2028-01-02']])assert.throws(()=>validateRentalPeriod(start,end,{now}),e=>e.status===400);
 assert.deepEqual(validateRentalPeriod('','',{now,required:false}),{start:'',end:'',days:null});
 assert.equal(rentalDays('2024-02-28','2024-03-01'),3,'historical immutable receipt repricing remains date-only, without a current-date check');
 assert.equal(rentalDays('2026-02-30','2026-03-02'),null);assert.equal(rentalDays('2028-01-01','2028-12-31'),null);
});
test('submission snapshots and discount quotes enforce the same Oslo date limits',()=>{
 const codes=[{code:'TEST10',active:true,scope:'rent',percent:10}],base=input();
 for(const [start,end] of [['2028-01-01','2028-01-01'],['2028-01-01','2028-12-30'],['2028-03-25','2028-03-27']]){
  const next={...base,details:{...base.details,start,end}},snapshot=createEnquirySnapshot(validateSubmission(next,products),next,products,{now}),coupon=discountQuote({mode:'rent',code:'TEST10',basket:next.basket,start,end},products,codes,now);
  assert.equal(snapshot.total,coupon.subtotal);assert.equal(snapshot.receivedAt,now.toISOString());
 }
 for(const [start,end] of [['2027-12-31','2028-01-01'],['2028-01-01','2028-12-31'],['2028-02-30','2028-03-02'],['2028-01-02','2028-01-01']]){
  const next={...base,details:{...base.details,start,end}};
  assert.throws(()=>createEnquirySnapshot(validateSubmission(next,products),next,products,{now}),e=>e.status===400);
  assert.throws(()=>discountQuote({mode:'rent',code:'TEST10',basket:next.basket,start,end},products,codes,now),e=>e.status===400);
 }
});
test('actual terms versions follow the displayed tariff and distinguish rental, purchase and mixed contents',()=>{
 const rental=input(),buy={...input(),kind:'purchase',terms:versions.purchase},allBuy={...input(),basket:{pack:1},businessChoices:{pack:'buy'},terms:versions.purchase},mixed={...allBuy,basket:{pack:1,chair:1},terms:versions.rental+' | '+versions.purchase};
 for(const request of [rental,buy,allBuy,mixed])assert.equal(validateSubmission(request,products).terms,request.terms);
 assert.deepEqual(requiredEnquiryTerms({...allBuy,businessChoices:{pack:'try'}},products),[versions.rental]);
 assert.deepEqual(requiredEnquiryTerms({...mixed,customRequest:true},products),[versions.rental,versions.purchase]);
 for(const request of [{...rental,terms:'2026-00-00-anything'},{...rental,terms:versions.purchase},{...buy,terms:versions.rental},{...mixed,terms:versions.rental},{...allBuy,terms:mixed.terms},{...mixed,terms:versions.purchase+' | '+versions.rental}])assert.throws(()=>validateSubmission(request,products),e=>e.status===400);
 const changed=getTermsVersions({...defaultSettings.delivery,normalSingle:defaultSettings.delivery.normalSingle+1});assert.notEqual(changed.rental,versions.rental);assert.equal(changed.purchase,versions.purchase);
 assert.throws(()=>validateEnquiryTerms(rental,products,changed),e=>e.status===400);
 // The validator accepts future revision strings by exact shared value, without a hard-coded year pattern.
 const next={rental:'2027-01-01-leie-1-tariff',purchase:'2027-01-01-kjop-1'};
 assert.equal(validateEnquiryTerms({...rental,terms:next.rental},products,next),next.rental);
 assert.equal(validateEnquiryTerms({...mixed,terms:next.rental+' | '+next.purchase},products,next),next.rental+' | '+next.purchase);
});
test('pure business purchase omits rental dates while mixed contents still require rental dates and terms',()=>{
 const purchase={...input(),basket:{pack:1},businessChoices:{pack:'buy'},terms:versions.purchase,details:{...input().details,start:'',end:''}};
 assert.equal(createEnquirySnapshot(validateSubmission(purchase,products),purchase,products,{now}).total,6000);
 const mixed={...purchase,basket:{pack:1,chair:1},terms:versions.rental+' | '+versions.purchase};
 assert.throws(()=>createEnquirySnapshot(validateSubmission(mixed,products),mixed,products,{now}),e=>e.status===400);
});
test('already registered snapshots remain idempotent after date or terms rules change',async()=>{
 const legacy={...input(),terms:'2026-old-terms',details:{...input().details,start:'2020-01-01',end:'2020-01-02'}},snapshot={lines:[{id:'chair',name:'Stol',quantity:1,total:200}],facts:[],delivery:{total:0},total:200,vatIncluded:true};
 let registered=true,reservations=0,sends=0;
 const store={enabled:true,async readEnquiry(){return registered?{fingerprint:submissionFingerprint(legacy),snapshot}:null;},async pendingEnquiryMail(){return [];},async reserveEnquiry(){reservations++;throw Error('must not register');}};
 const sender=createSubmissionSender({SMTP_PASS:'local-test-only'},store,async()=>{sends++;});
 const repeat=await sender.submit(legacy,[],'local');assert.equal(repeat.receipt.total,200);
 registered=false;await assert.rejects(sender.submit(legacy,products,'local'),e=>e.status===400);
 assert.equal(reservations,0);assert.equal(sends,0);
});
