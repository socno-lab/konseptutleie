import test from 'node:test';import assert from 'node:assert/strict';
import {receiptTotalLabel} from '../public/receipt-layout.js';
import {enquiryEmail} from '../server/enquiry-email.mjs';
test('receipt total wording follows actual acquisition and known transport, including free included delivery',()=>{
 for(const [acquisition,label] of [['rental','Beregnet leiesum'],['purchase','Beregnet kjøpesum'],['mixed','Beregnet sum for leie og kjøp']]){
  for(const [delivery,suffix] of [[{label:'Henter og returnerer selv',total:0},''],[{label:'Henter selv etter avtale',total:0},''],[{label:'Transport avklares i tilbudet',total:null},''],[{label:'Ønsker levering',total:1000},' inkl. transport'],[{label:'Levering og henting inkludert i fastprisen',total:0},' inkl. transport']]){
   const receipt={id:'TEST',kind:'rental',acquisition,name:'Test',email:'test@example.invalid',lines:[],facts:[],delivery,total:1000};
   assert.equal(receiptTotalLabel(receipt),label+suffix);
   for(const audience of ['customer','internal']){const mail=enquiryEmail(receipt,audience);assert.ok(mail.text.includes(label+suffix+': '));assert.ok(mail.html.includes('<strong>'+label+suffix+'</strong>'));assert.doesNotMatch(mail.text,/Foreløpig total/);}
  }
 }
 assert.equal(receiptTotalLabel({kind:'purchase'}),'Beregnet kjøpesum');
});
test('unknown overall prices remain unquoted in both email formats',()=>{
 const mail=enquiryEmail({id:'TEST',kind:'rental',name:'Test',email:'test@example.invalid',lines:[],facts:[],delivery:{label:'Transport avklares',total:null},total:null});
 assert.match(mail.html,/Samlet pris avklares/);assert.match(mail.text,/Samlet pris avklares/);assert.doesNotMatch(mail.text,/Beregnet leiesum:|Foreløpig total/);
});
