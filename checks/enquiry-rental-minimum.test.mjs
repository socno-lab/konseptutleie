import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSubmission} from '../server/submissions.mjs';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {getTermsVersions} from '../public/terms-versions.js';

const module={id:'module',name:'Endemodul',active:true,stock:20,unavailable:0,category:'Sofaer',moduleSeries:'Testsofa',moduleRole:'end',rentalModuleMinimum:2,rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:500};
const pack=quantity=>({id:'pack',name:'Kjøpspakke',active:true,isPackage:true,category:'Pakker',components:[{id:'module',quantity}],businessPurchase:true,purchasePriceMode:'manual',purchasePrice:6000,rentalPricingMode:'manual',price:200,weekPrice:600,monthPrice:1000});
const request=(basket,businessChoices={})=>{
 const versions=getTermsVersions(),mixed=Object.entries(basket).some(([id])=>businessChoices[id]!=='buy'),purchase=Object.values(businessChoices).includes('buy');
 return {id:'da00a2ed-899c-4514-9ca2-f545fa16171c',kind:'rental',name:'Lokal kontroll',email:'test@example.invalid',terms:[mixed&&versions.rental,purchase&&versions.purchase].filter(Boolean).join(' | '),basket,businessChoices,details:{phone:'00000000',address:'Eksempelveien 1, 1470 Eksempelsted',occasion:'Bedrift',start:mixed?'2030-04-02':'',end:mixed?'2030-04-02':'',delivery:'Henter og returnerer selv'}};
};
const snapshot=(input,products)=>createEnquirySnapshot(validateSubmission(input,products),input,products);

test('rental minimum uses only actual rental modules in legacy and mixed requests',()=>{
 const products=[module,pack(2)];
 assert.throws(()=>snapshot(request({module:1}),products),e=>e.status===400&&/minst 2/.test(e.message));
 assert.throws(()=>snapshot(request({module:1,pack:1},{pack:'buy'}),products),e=>e.status===400&&/minst 2/.test(e.message));
 const mixed=snapshot(request({module:2,pack:1},{pack:'buy'}),products);
 assert.equal(mixed.acquisition,'mixed');assert.equal(mixed.lines.find(l=>l.id==='module').quantity,2);assert.equal(mixed.lines.find(l=>l.id==='pack').total,6000);
 const rental=snapshot(request({pack:1}),products);assert.equal(rental.acquisition,'rental');assert.equal(rental.lines.reduce((q,l)=>q+l.quantity,0),2);
});

test('rental minimum never applies to purchased package components',()=>{
 const input=request({pack:1},{pack:'buy'}),s=snapshot(input,[module,pack(1)]);
 assert.equal(s.acquisition,'purchase');assert.equal(s.total,6000);assert.equal(s.lines.length,1);assert.equal(s.lines[0].id,'pack');
 assert.equal(s.delivery.label,'Henter selv etter avtale');
});

test('business choices cannot introduce facts for absent or ineligible products',()=>{
 const products=[module,pack(2)],base=request({module:2});
 for(const businessChoices of [{missing:'try'},{pack:'try'},{module:'try'},{pack:'invalid'},{pack:null}]){
  const input={...base,businessChoices};
  assert.throws(()=>snapshot(input,products),e=>e.status===400&&/kjøpsvalg/.test(e.message));
 }
 const selected=snapshot(request({pack:1},{pack:'try'}),products);
 assert.equal(selected.facts.find(([label])=>label==='Samlet valgfri kjøpspris inkl. mva.')?.[1],'6 000 kr');assert.ok(!selected.facts.some(([,v])=>v.includes('kjøpspris avtales separat')));
});
