import test from 'node:test';
import assert from 'node:assert/strict';
import {addonBuyoutPrice,packageBuyoutOption,buyoutFacts} from '../public/buyout-model.js';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {enquiryEmail} from '../server/enquiry-email.mjs';
import {validateCatalog} from '../server/catalog.mjs';
import {readFileSync} from 'node:fs';
const sofaTextile='obj_1cd92777d68c44ddbc1fe0f9dc72b032',chairTextile='obj_textile_loungestol_30days',decor='obj_4768bc953cba43da88eb565feb753892';
const base={active:true,stock:20,unavailable:0,price:100,weekPrice:300,monthPrice:500,rentalPricingMode:'manual',isPackage:false,isService:false};
const products=[{...base,id:'sofa',name:'Sofa',type:'sofa',category:'Sofaer',relatedAddOns:[sofaTextile]},{...base,id:'chair',name:'Lenestol',category:'Stoler',relatedAddOns:[chairTextile]},{...base,id:'table',name:'Sofabord',category:'Bord',relatedAddOns:[decor]},{...base,id:'other',name:'Ekstra stol',category:'Stoler'},...[sofaTextile,chairTextile,decor].map((id,i)=>({...base,id,name:['Tekstilpakke til sofa','Tekstilpakke til lenestol','Dekorpakke til Luana-bord'][i],category:'Dekor',isService:true,rentalPricingMode:'period',price:250})),{...base,id:'pack',name:'Loungepakken',isPackage:true,category:'Pakker',businessPurchase:true,purchasePriceMode:'manual',purchasePrice:30462,price:1000,weekPrice:4000,monthPrice:13730,components:[{id:'sofa',quantity:1},{id:'chair',quantity:2},{id:'table',quantity:1}]}];
const input=()=>({basket:{pack:1,[sofaTextile]:1,[chairTextile]:2,[decor]:1},businessChoices:{pack:'try'},cartLinks:Object.fromEntries([sofaTextile,chairTextile,decor].map(id=>[id,{parentId:'pack',packageQuantity:id===chairTextile?2:1}])),details:{phone:'00000000',address:'Eksempelveien 1, 2010 Strømmen',occasion:'Bedrift',start:'2030-11-02',end:'2030-12-01',delivery:'Ønsker levering og henting'}});
const snapshot=(data=input(),items=products,verifyDelivery=()=>({total:2380,perVisit:1190,visits:2}))=>createEnquirySnapshot({id:'TEST',kind:'rental',name:'Eksempel',email:'test@example.invalid',terms:'test'},data,items,{verifyDelivery,now:new Date('2030-10-01T12:00:00Z')});
const fact=(s,label)=>s.facts.find(([l])=>l===label)?.[1];
test('approved addon buyout values are separate from rental and new-product prices; explicit admin override and unknown are respected',()=>{
 for(const [id,expected] of [[chairTextile,600],[sofaTextile,1200],[decor,900]])assert.equal(addonBuyoutPrice({id}),expected);
 assert.equal(addonBuyoutPrice({id:decor,buyoutUnitPrice:1100}),1100);assert.equal(addonBuyoutPrice({id:decor,buyoutUnitPrice:null}),null);assert.equal(addonBuyoutPrice({id:'unknown',purchaseUnitPrice:999}),null);
 const seed=JSON.parse(readFileSync(new URL('../data/catalog-export-2026-10-17.json',import.meta.url))).products,item=seed.find(p=>!p.isPackage);item.buyoutUnitPrice=600;
 const saved=validateCatalog(seed).find(p=>p.id===item.id);assert.equal(saved.buyoutUnitPrice,600);assert.equal(saved.price,item.price);
 for(const v of [-1,0,1.001,Infinity,'600']){item.buyoutUnitPrice=v;assert.throws(()=>validateCatalog(seed),/Kjøpspris etter leie/);}
});
test('option includes every selected physical addon at its own quantity, never stylist labour or incomplete totals',()=>{
 const pack=products.at(-1),extras={[sofaTextile]:1,[chairTextile]:2,[decor]:1};
 const result=packageBuyoutOption(pack,products,{extras});assert.equal(result.total,33762);assert.equal(result.lines.length,4);
 assert.equal(packageBuyoutOption(pack,products,{quantity:2,extras:{[chairTextile]:4}}).total,63324);
 assert.equal(packageBuyoutOption(pack,products,{custom:true,extras}).total,null);
 assert.equal(packageBuyoutOption(pack,products.map(p=>p.id===decor?{...p,buyoutUnitPrice:null}:p),{extras}).total,null);
});
test('server snapshots known optional price and actual return tariff without charging buyout in rental total',()=>{
 const s=snapshot();assert.equal(s.total,snapshot({...input(),businessChoices:{pack:'rent'}}).total);assert.ok(s.total<33762);assert.equal(s.purchaseOptions[0].total,33762);
 assert.equal(fact(s,'Samlet valgfri kjøpspris inkl. mva.'),'33 762 kr');assert.match(fact(s,'Fratrekk for forhåndsbetalt henting'),/1 190 kr/);assert.match(fact(s,'Beløp ved kjøp etter eventuelt fratrekk'),/32 572 kr/);
 assert.match(fact(s,'Svarfrist for kjøp'),/29\.11\.2030/);assert.ok(!s.facts.some(([,v])=>v.includes('kjøpspris avtales separat')));
 const forged=input();forged.purchaseOptions=[{total:1}];forged.returnCredit=50000;assert.deepEqual(snapshot(forged),s);
});
test('no automatic pickup credit when other furniture remains, transport is unknown, or per-visit tariff is not verified',()=>{
 const another=input();another.basket.other=1;const s=snapshot(another);assert.match(fact(s,'Returtransport ved kjøp'),/avklares/);assert.equal(fact(s,'Fratrekk for forhåndsbetalt henting'),undefined);
 assert.match(fact(snapshot(input(),products,()=>null),'Returtransport ved kjøp'),/avklares/);
 assert.match(fact(snapshot(input(),products,()=>({total:2380})),'Returtransport ved kjøp'),/avklares/);
});
test('pickup-only can be credited; delivery-only and self-return never discount purchase',()=>{
 const pickup=input();pickup.details.delivery='Kun henting – jeg henter selv';assert.match(fact(snapshot(pickup,products,()=>({total:1190,perVisit:1190,visits:1})),'Fratrekk for forhåndsbetalt henting'),/1 190/);
 for(const delivery of ['Henter og returnerer selv','Kun levering – jeg returnerer selv']){const d=input();d.details.delivery=delivery;assert.equal(fact(snapshot(d),'Fratrekk for forhåndsbetalt henting'),undefined);}
});
test('rent-only and outright purchase do not receive rental buyout terms; unavailable buyout price stays quoted',()=>{
 const rent=input();rent.businessChoices={pack:'rent'};assert.deepEqual(snapshot(rent).purchaseOptions,[]);
 const missing=products.map(p=>p.id==='pack'?{...p,purchasePrice:null}:p);assert.match(fact(snapshot(input(),missing),'Samlet valgfri kjøpspris inkl. mva.'),/Avklares/);
 assert.deepEqual(buyoutFacts([]),[]);
});
test('customer and internal HTML and plain text show the same immutable price, addons, deadline and conditional pickup credit',()=>{
 const s=snapshot();for(const audience of ['customer','internal']){const mail=enquiryEmail(s,audience);for(const text of [mail.text,mail.html]){assert.match(text,/33 762 kr/);assert.match(text,/32 572 kr/);assert.match(text,/29\.11\.2030/);assert.match(text,/Tekstilpakke til sofa/);assert.match(text,/dersom hentingen er betalt/);assert.ok(!text.includes('kjøpspris avtales separat'));}}
});

import {createDeliveryEstimator} from '../server/delivery.mjs';
test('pickup credit uses the signed server tariff without another route call or trusting client prices',async()=>{
 let calls=0;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'test-only'},async()=>{calls++;return Response.json({routes:[{legs:[{duration:'1200s'},{duration:'1200s'}]}]});});
 const d=input(),quote=await estimator.estimate({address:d.details.address,basket:d.basket,visits:2},'test',products);d.details.deliveryToken=quote.receipt;
 const verified=estimator.verifyQuote(quote.receipt,d.details.address,d.basket,false,2,products);assert.deepEqual(verified,{total:2380,perVisit:1190,visits:2});
 const s=snapshot(d,products,(...args)=>estimator.verifyQuote(...args,products));assert.match(fact(s,'Fratrekk for forhåndsbetalt henting'),/1 190 kr/);assert.equal(calls,1);
 d.details.deliveryToken+='tampered';assert.equal(fact(snapshot(d,products,(...args)=>estimator.verifyQuote(...args,products)),'Fratrekk for forhåndsbetalt henting'),undefined);
});
