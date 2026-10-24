import test from 'node:test';
import assert from 'node:assert/strict';
import {syncEnquiryTerms,acceptedEnquiryTerms} from '../public/enquiry-terms.js';
import {validateSubmission} from '../server/submissions.mjs';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {readFile} from 'node:fs/promises';
import {publicHtmlNames,readHtmlTemplate} from '../server/html-templates.mjs';
import {getTermsVersions} from '../public/terms-versions.js';
import {osloToday,addDateDays} from '../public/rental-dates.js';
globalThis.document={querySelectorAll:()=>[]};
const {submitEnquiry}=await import('../public/submission-ui.js');
const {rental:rentalVersion,purchase:purchaseVersion}=getTermsVersions();
function formFixture(){
 const fields={rentalTermsAccepted:{value:rentalVersion},termsAccepted:{value:purchaseVersion}};
 for(const field of Object.values(fields)){field.label={hidden:false,style:{display:'',priority:'',setProperty(name,value,priority){this[name]=value;this.priority=priority;},removeProperty(name){this[name]='';this.priority='';},getPropertyPriority(){return this.priority;}}};field.checked=true;field.closest=()=>field.label;}
 return {fields,querySelector(selector){return fields[selector.match(/name="([^"]+)"/)[1]];}};
}
test('rental-cart terms follow rental, purchase and mixed contents without a hidden required checkbox',()=>{
 const form=formFixture();
 for(const state of [{rental:false,purchase:true},{rental:true,purchase:true},{rental:true,purchase:false}]){
  syncEnquiryTerms(form,state);
  for(const [name,needed] of [['rentalTermsAccepted',state.rental],['termsAccepted',state.purchase]]){
   const field=form.fields[name];assert.equal(field.required,needed);assert.equal(field.disabled,!needed);assert.equal(field.label.hidden,!needed);assert.equal(field.label.style.display,needed?'':'none');assert.equal(field.label.style.getPropertyPriority('display'),needed?'':'important');
  }
 }
 assert.equal(acceptedEnquiryTerms({rentalTermsAccepted:rentalVersion,termsAccepted:purchaseVersion}),rentalVersion+' | '+purchaseVersion);
});
test('pure business purchase and mixed rental/purchase submit their required terms and server-priced receipt',async()=>{
 const chair={id:'chair',name:'Stol',category:'Stoler',active:true,stock:10,unavailable:0,price:100,weekPrice:300,monthPrice:500,rentalPricingMode:'manual'};
 const pack={id:'pack',name:'Bedriftspakke',category:'Pakker',active:true,isPackage:true,components:[{id:'chair',quantity:2}],businessPurchase:true,purchasePriceMode:'manual',purchasePrice:6000,price:200,weekPrice:600,monthPrice:1000,rentalPricingMode:'manual'};
 const nativeFormData=globalThis.FormData,oldFetch=globalThis.fetch,oldStorage=globalThis.sessionStorage;
 globalThis.sessionStorage={getItem:()=>null,setItem:()=>{}};
 globalThis.FormData=class{constructor(form){this.entries={name:'Lokal kontroll',email:'preview@example.invalid',phone:'00000000',address:'Eksempelveien 1, 1470 Eksempelsted',occasion:'Boligfoto og visning',delivery:'Henter og returnerer selv',start:form.rental?addDateDays(osloToday(),3):'',end:form.rental?addDateDays(osloToday(),3):''};for(const [name,field] of Object.entries(form.fields))if(!field.disabled&&field.checked)this.entries[name]=field.value;}[Symbol.iterator](){return Object.entries(this.entries)[Symbol.iterator]();}};
 try{
  for(const rental of [false,true]){
   const form=formFixture();form.rental=rental;syncEnquiryTerms(form,{rental,purchase:true});
   globalThis.fetch=async(url,init)=>{const input=JSON.parse(init.body);assert.equal(input.terms,rental?rentalVersion+' | '+purchaseVersion:purchaseVersion);const value=validateSubmission(input,[chair,pack]),receipt=createEnquirySnapshot(value,input,[chair,pack]);assert.equal(receipt.total,rental?6100:6000);assert.equal(receipt.facts.some(([label])=>label==='Ønsket leieperiode'),rental);return Response.json({ok:true,reference:input.id,receipt});};
   const sent=await submitEnquiry(form,{kind:'rental',basket:rental?{pack:1,chair:1}:{pack:1},businessChoices:{pack:'buy'}});assert.equal(sent.ok,true);
  }
 }finally{globalThis.FormData=nativeFormData;globalThis.fetch=oldFetch;globalThis.sessionStorage=oldStorage;}
});
test('release URLs refresh rental and purchase terms once without loading a second stale customer-info module',async()=>{
 const token='launch20261024',receiptToken='sofareceipt20261024';
 const customerInfo=await readFile(new URL('../public/customer-info.js',import.meta.url),'utf8');assert.match(customerInfo,/id="purchaseTermsLabel" hidden style="display:none!important"/,'inactive purchase terms must stay hidden before cart synchronisation despite important label display rules');
 for(const name of publicHtmlNames){
  const html=await readHtmlTemplate(name),scripts=[...html.matchAll(/src="\/(app|shop|customer-info)\.js\?([^\"]+)"/g)];
  assert.ok(scripts.length,'bootstrap missing from '+name);for(const [,module,query] of scripts)assert.equal(new URLSearchParams(query).get('v'),'pricingchoices20261024',name+' loads stale '+module);
 }
 const files=await Promise.all(['app','shop','storefront-feedback','submission-ui'].map(async name=>[name,await readFile(new URL('../public/'+name+'.js',import.meta.url),'utf8')]));
 const moduleUrls=name=>files.flatMap(([file,source])=>[...source.matchAll(new RegExp("['\"](?:\\./)("+name+"\\.js[^'\"]*)['\"]",'g'))].map(([,url])=>({file,url})));
 for(const name of ['customer-info','storefront-feedback','submission-ui','enquiry-terms']){
  const imports=moduleUrls(name);assert.ok(imports.length,name+' import missing');assert.deepEqual([...new Set(imports.map(x=>x.url))],[name+'.js?v='+(name==='submission-ui'?receiptToken:['customer-info','storefront-feedback'].includes(name)?'pricingchoices20261024':token)],name+' must have one release URL to avoid duplicate mounting');
 }
});
