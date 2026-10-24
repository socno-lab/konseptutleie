import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {enquiryEmail} from '../server/enquiry-email.mjs';
const chair={id:'chair',name:'Stol',active:true,stock:5,unavailable:0,category:'Stoler',rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:500};
const pack={id:'pack',name:'Bedriftspakke',active:true,isPackage:true,category:'Pakker',components:[{id:'chair',quantity:2}],businessPurchase:true,purchasePriceMode:'manual',purchasePrice:6000,rentalPricingMode:'manual',price:200,weekPrice:600,monthPrice:1000};
const base={id:'local',kind:'rental',name:'Lokal kontroll',email:'test@example.invalid',basket:{pack:1},businessChoices:{pack:'buy'},details:{phone:'00000000',address:'Eksempelveien 1, 1470 Eksempelsted',occasion:'Bedrift',start:'',end:'',delivery:'Henter og returnerer selv'}};
test('purchase packages in the rental cart get purchase receipts and one-way transport without a Google quote',()=>{
 for(const [choice,label,total] of [['Henter og returnerer selv','Henter selv etter avtale',6000],['Ønsker levering og henting','Ønsker levering',null]]){
  const input={...base,details:{...base.details,delivery:choice}},s=createEnquirySnapshot(base,input,[chair,pack],{verifyDelivery:()=>{throw Error('Purchase must not verify rental transport');}});assert.equal(s.kind,'rental');assert.equal(s.acquisition,'purchase');assert.equal(s.delivery.label,label);assert.equal(s.total,total);assert.ok(!s.facts.some(([key])=>key==='Ønsket leieperiode'));
  const customer=enquiryEmail(s),internal=enquiryEmail(s,'internal');assert.match(customer.text,/forespørselen din om kjøp/);assert.doesNotMatch(customer.text,/leieforespørsel|returnerer selv|Ønsket leieperiode/);assert.match(internal.subject,/^Kjøpsforespørsel/);
 }
});
test('mixed content and legacy purchase/rental snapshots retain their correct language',()=>{
 const input={...base,basket:{pack:1,chair:1},details:{...base.details,start:'2030-04-02',end:'2030-04-02'}},s=createEnquirySnapshot(base,input,[chair,pack]);assert.equal(s.acquisition,'mixed');assert.match(enquiryEmail(s).text,/forespørselen din om leie og kjøp/);assert.match(enquiryEmail(s,'internal').subject,/^Forespørsel om leie og kjøp/);assert.equal(s.delivery.label,'Henter og returnerer selv');
 for(const kind of ['rental','purchase'])assert.match(enquiryEmail({...s,acquisition:undefined,kind},'internal').subject,kind==='rental'?/^Leieforespørsel/:/^Kjøpsforespørsel/);
});
