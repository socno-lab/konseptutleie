import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {enquiryEmail} from '../server/enquiry-email.mjs';
import {addDateDays} from '../public/rental-dates.js';
import {rentalUsageLabels,rentalUsageDescriptions} from '../public/rental-usage-model.js';

const chair={id:'chair',name:'Stol',category:'Stoler',active:true,stock:20,unavailable:0,rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:500,saleEnabled:true,salePrice:2000,relatedAddOns:['textile']};
const textile={id:'textile',name:'Tekstilpakke til lenestol',category:'Tilvalg',active:true,isService:true,rentalPricingMode:'period',price:400};
const pack={id:'pack',name:'Bedriftspakke',category:'Pakker',active:true,isPackage:true,components:[{id:'chair',quantity:2}],businessPurchase:true,purchasePriceMode:'manual',purchasePrice:6000,rentalPricingMode:'manual',price:200,weekPrice:600,monthPrice:1000};
const products=[chair,textile,pack];
const now=new Date('2030-01-01T12:00:00Z');
const details={phone:'00000000',address:'Eksempelveien 1, 1470 Eksempelsted',occasion:'Bedrift',start:'2030-02-01',end:'2030-02-01',delivery:'Henter og returnerer selv'};
const identity={id:'pricing-basis-local-test',kind:'rental',name:'Lokal kontroll',email:'test@example.invalid',terms:'local-test'};
const occasionCases=[['Boligsalg','standard'],['Boligfoto og visning','standard'],['Bedrift','messe'],['Event og selskap','messe'],['Messe og stand','messe'],['Leie over tid','messe'],['Annet','messe']];
const expectedBasis={standard:['Boligfoto og visning','Til styling av bolig før fotografering og visning.'],messe:['Arrangementer og annen bruk','Til selskap, messe, arbeidsplassen eller daglig bruk.']};
const snapshot=(input={},value={})=>createEnquirySnapshot({...identity,...value},{basket:{chair:1},...input,details:{...details,...input.details}},products,{now,verifyDelivery:()=>{throw Error('Local pickup must not call a transport service');}});
const basisFacts=receipt=>receipt.facts.filter(([label])=>['Prisgrunnlag','Bruksområde','Anledning'].includes(label));

test('receipts distinguish the approved price basis from the explicitly selected occasion',()=>{
 for(const [occasion,scope] of occasionCases){
  const receipt=snapshot({details:{occasion}});
  const [label,description]=expectedBasis[scope];
  assert.equal(rentalUsageLabels[scope],label);assert.equal(rentalUsageDescriptions[scope],description);
  assert.deepEqual(basisFacts(receipt),[['Prisgrunnlag',label+'\n'+description],['Anledning',occasion]],occasion);
  for(const audience of ['customer','internal']){
   const mail=enquiryEmail(receipt,audience);
   assert.ok(mail.text.includes('Prisgrunnlag: '+label+'\n'+description),audience+' text / '+occasion);
   assert.ok(mail.html.includes('>Prisgrunnlag</span><br>'+label+'<br>'+description),audience+' HTML / '+occasion);
   assert.ok(mail.text.includes('Anledning: '+occasion),audience+' text / '+occasion);
   assert.ok(mail.html.includes('>Anledning</span><br>'+occasion),audience+' HTML / '+occasion);
   assert.ok(mail.text.indexOf('Prisgrunnlag:')<mail.text.indexOf('Anledning:'));
   assert.ok(mail.html.indexOf('>Prisgrunnlag<')<mail.html.indexOf('>Anledning<'));
   assert.doesNotMatch(mail.text,/Bruksområde:/);assert.doesNotMatch(mail.html,/>Bruksområde</);
  }
 }
});

test('rental submissions require an occasion and never infer it from visited product purposes',()=>{
 for(const occasion of ['',undefined,'  ']){
  assert.throws(()=>snapshot({purpose:'messe',rentalScope:'messe',details:{occasion}}),error=>error.status===400&&error.message==='Velg anledning.');
 }
 for(const purpose of ['bedrift','messe','fest','boligsalg']){
  const receipt=snapshot({purpose,rentalScope:'standard',details:{occasion:'Event og selskap'}});
  assert.deepEqual(basisFacts(receipt),[['Prisgrunnlag',expectedBasis.messe.join('\n')],['Anledning','Event og selskap']]);
  assert.equal(receipt.total,150);
 }
});

test('changing confirmation wording preserves tariff scope and period-based addon amounts',()=>{
 const cases=[[1,100,150],[2,200,300],[7,300,450],[30,500,750],[31,550,900],[60,750,1500],[61,800,1650]];
 for(const [days,standard,messe] of cases)for(const quantity of [1,2])for(const [occasion,scope] of occasionCases){
  const receipt=snapshot({basket:{chair:quantity,textile:quantity},details:{occasion,end:addDateDays(details.start,days-1)}});
  assert.equal(receipt.lines.find(line=>line.id==='chair').total,(scope==='standard'?standard:messe)*quantity,occasion+' / '+days+' days');
  assert.equal(receipt.lines.find(line=>line.id==='textile').total,400*Math.ceil(days/30)*quantity);
  assert.equal(receipt.total,(scope==='standard'?standard:messe)*quantity+400*Math.ceil(days/30)*quantity);
 }
});

test('mixed and custom rental enquiries include a basis, pure purchases do not inherit one',()=>{
 const purchased=snapshot({basket:{pack:1},businessChoices:{pack:'buy'},details:{occasion:'',start:'',end:''}});
 const direct=snapshot({basket:{chair:1},details:{occasion:'',start:'',end:'',delivery:'Henter selv etter avtale'}},{kind:'purchase'});
 for(const receipt of [purchased,direct]){
  assert.equal(receipt.acquisition,'purchase');assert.deepEqual(basisFacts(receipt),[]);
  for(const audience of ['customer','internal']){
   const mail=enquiryEmail(receipt,audience);assert.doesNotMatch(mail.text,/Prisgrunnlag:|Bruksområde:|Anledning:/);assert.doesNotMatch(mail.html,/>Prisgrunnlag<|>Bruksområde<|>Anledning</);
  }
 }
 assert.equal(purchased.total,6000);assert.equal(direct.total,2000);
 const mixed=snapshot({basket:{pack:1,chair:1},businessChoices:{pack:'buy'}});
 assert.equal(mixed.acquisition,'mixed');assert.equal(mixed.total,6150);assert.deepEqual(basisFacts(mixed),[['Prisgrunnlag',expectedBasis.messe.join('\n')],['Anledning','Bedrift']]);
 const custom=snapshot({basket:{},details:{customRequest:'Et spesielt oppsett'}},{customRequest:true});
 assert.equal(custom.acquisition,'rental');assert.equal(custom.total,null);assert.deepEqual(basisFacts(custom),[['Prisgrunnlag',expectedBasis.messe.join('\n')],['Anledning','Bedrift']]);
});

test('web confirmation renders the same label and description on separate lines',async t=>{
 const previous=globalThis.document;
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.style={};this.ownText='';}
  set textContent(value){this.ownText=String(value);this.children=[];}
  get textContent(){return this.ownText+this.children.map(child=>child.textContent).join('');}
  append(...children){this.children.push(...children);}
 }
 globalThis.document={querySelectorAll:()=>[],createElement:tag=>new Element(tag)};
 t.after(()=>{globalThis.document=previous;});
 const {enquiryReceipt}=await import('../public/submission-ui.js');
 for(const [occasion,scope] of occasionCases){
  const node=enquiryReceipt(snapshot({details:{occasion}}));
  const facts=node.children.filter(child=>child.tagName==='p'&&child.children[0]?.textContent==='Prisgrunnlag');
  assert.equal(facts.length,1);assert.equal(facts[0].children[1].textContent,expectedBasis[scope].join('\n'));
  assert.match(facts[0].children[1].style.cssText,/white-space:pre-line/);
  const occasionFacts=node.children.filter(child=>child.tagName==='p'&&child.children[0]?.textContent==='Anledning');
  assert.equal(occasionFacts.length,1);assert.equal(occasionFacts[0].children[1].textContent,occasion);
  assert.ok(node.children.indexOf(facts[0])<node.children.indexOf(occasionFacts[0]));
  assert.doesNotMatch(node.textContent,/Bruksområde/);
 }
});
