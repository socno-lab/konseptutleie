import test from 'node:test';
import assert from 'node:assert/strict';
import {splitAcquisitionBasket,acquisitionPurchasePrice,packagePurchaseSelectionPrice} from '../public/business-purchase-model.js';
import {withPackageAddons} from '../public/package-addon-model.js';
import {packageCartView} from '../public/package-cart-model.js';
import {getTermsVersions,requiredEnquiryTerms} from '../public/terms-versions.js';
import {validateSubmission} from '../server/submissions.mjs';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {enquiryEmail} from '../server/enquiry-email.mjs';
const textile='obj_textile_loungestol_30days',decor='obj_4768bc953cba43da88eb565feb753892';
const common={active:true,rentalEnabled:true,stock:30,unavailable:0,rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:600};
const products=withPackageAddons([
 {...common,id:'chair',name:'Lenestol',category:'Stoler',relatedAddOns:[textile]},
 {...common,id:'table',name:'Sofabord',category:'Bord',relatedAddOns:[decor,'styling']},
 {...common,id:textile,name:'Tekstilpakke til lenestol',category:'Dekor',addonOnly:true,isService:true,rentalPricingMode:'period',price:250},
 {...common,id:decor,name:'Dekorpakke til sofabord',category:'Dekor',addonOnly:true,isService:true,requiredProductId:'table',requiredProductQuantity:1,rentalPricingMode:'period',price:250},
 {...common,id:'styling',name:'Stylist',category:'Styling',offeringType:'service',isService:true,priceOnRequest:true},
 ...['lounge','waiting'].map((id,index)=>({...common,id,name:index?'Ventesone':'Loungepakken',isPackage:true,category:'Pakker',businessPurchase:true,purchasePriceMode:'manual',purchasePrice:index?8000:10000,components:[{id:'chair',quantity:2},{id:'table',quantity:1}]})),
 {...common,id:'unrelated',name:'Uavhengig tilvalg',addonOnly:true,isService:true,rentalPricingMode:'period',category:'Dekor',buyoutUnitPrice:50}
]);
const versions=getTermsVersions();
function input({basket={lounge:1,[textile]:2,[decor]:1},businessChoices={lounge:'buy'},cartLinks={[textile]:{parentId:'lounge',packageQuantity:2},[decor]:{parentId:'lounge',packageQuantity:1}},...rest}={}){
 return {id:'da00a2ed-899c-4514-9ca2-f545fa16171c',kind:'rental',name:'Isolert test',email:'test@example.invalid',terms:versions.purchase,basket,businessChoices,cartLinks,details:{phone:'00000000',address:'Eksempelveien 1, 2010 Strømmen',occasion:'Bedrift',start:'',end:'',delivery:'Henter og returnerer selv'},...rest};
}
const snapshot=(data,items=products)=>createEnquirySnapshot(validateSubmission(data,items),data,items,{now:new Date('2030-01-01T12:00:00Z'),verifyDelivery(){assert.fail('Pure purchases must not request a rental transport quote');}});
function rentalDetails(data){return {...data,terms:requiredEnquiryTerms(data,products).join(' | '),details:{...data.details,start:'2030-02-01',end:'2030-02-02'}};}

test('buying a package moves precisely its selected addon quantities and needs only purchase terms and no dates',()=>{
 const data=input(),before=structuredClone(data),split=splitAcquisitionBasket(data.basket,data.businessChoices,products,data.cartLinks);
 assert.deepEqual(split,{rental:{},purchase:{[textile]:2,[decor]:1,lounge:1}});
 assert.deepEqual(requiredEnquiryTerms(data,products),[versions.purchase]);
 const receipt=snapshot(data);assert.equal(receipt.acquisition,'purchase');assert.equal(receipt.total,12100);
 assert.equal(receipt.delivery.label,'Henter selv etter avtale');assert.deepEqual(receipt.purchaseOptions,[]);
 assert.ok(!receipt.facts.some(([label])=>label==='Ønsket leieperiode'||label==='Svarfrist for kjøp'));
 assert.equal(receipt.lines.find(line=>line.id===textile).total,1200);assert.equal(receipt.lines.find(line=>line.id===decor).total,900);
 assert.equal(receipt.lines.reduce((sum,line)=>sum+line.total,0),receipt.total);
 for(const line of receipt.lines){assert.equal(line.group.id,'purchase:lounge');assert.doesNotMatch(line.basis,/30 dager|periode inntil|Leie/);}
 for(const id of [textile,decor])assert.deepEqual(receipt.lines.find(line=>line.id===id).addonFor,[{id:'lounge',name:'Loungepakken'}]);
 for(const audience of ['customer','internal']){const mail=enquiryEmail(receipt,audience);assert.match(mail.text,/12 100 kr/);assert.match(mail.html,/12 100 kr/);assert.doesNotMatch(mail.text,/Ønsket leieperiode|periode inntil 30 dager/);}
 assert.deepEqual(data,before,'partition and receipt generation do not mutate the cart');
});

test('purchase totals use addon unit values and chosen quantities, never rental tariffs or package quantity twice',()=>{
 for(const quantity of [1,2,3])for(const textileQuantity of [1,2*quantity]){
  const data=input({basket:{lounge:quantity,[textile]:textileQuantity,[decor]:quantity},cartLinks:{[textile]:{packageAllocations:{lounge:textileQuantity}},[decor]:{packageAllocations:{lounge:quantity}}}});
  const receipt=snapshot(data),group=packageCartView(data.basket,products,[],data.cartLinks).groups[0],expected=10000*quantity+600*textileQuantity+900*quantity;
  assert.equal(receipt.total,expected);assert.equal(packagePurchaseSelectionPrice(group.product,group.quantity,group.extras,products),expected);
 }
 assert.equal(acquisitionPurchasePrice(products.find(p=>p.id===textile),3),1800);
 const changed=products.map(p=>p.id===decor?{...p,buyoutUnitPrice:950.50}:p);assert.equal(snapshot(input(),changed).total,12150.50);
});

test('a shared addon is split between bought and rented packages without losing quantity or grouping',()=>{
 const data=rentalDetails(input({basket:{lounge:2,waiting:1,[decor]:3,[textile]:5},businessChoices:{lounge:'buy',waiting:'try'},cartLinks:{[decor]:{packageAllocations:{lounge:2,waiting:1}},[textile]:{packageAllocations:{lounge:3,waiting:2}}}}));
 const split=splitAcquisitionBasket(data.basket,data.businessChoices,products,data.cartLinks);
 assert.deepEqual(split,{purchase:{lounge:2,[decor]:2,[textile]:3},rental:{waiting:1,[decor]:1,[textile]:2}});
 assert.deepEqual(requiredEnquiryTerms(data,products),[versions.rental,versions.purchase]);
 const receipt=snapshot(data);assert.equal(receipt.acquisition,'mixed');
 for(const id of [decor,textile])assert.equal(receipt.lines.filter(line=>line.id===id).reduce((sum,line)=>sum+line.quantity,0),data.basket[id]);
 assert.equal(receipt.lines.find(line=>line.id===decor&&line.group.id==='purchase:lounge').total,1800);
 assert.equal(receipt.lines.find(line=>line.id===decor&&line.group.id==='fixed:waiting').total,250);
 assert.equal(receipt.purchaseOptions.length,1);assert.equal(receipt.purchaseOptions[0].id,'waiting');assert.equal(receipt.purchaseOptions[0].total,10100);
 assert.equal(receipt.total,receipt.lines.reduce((sum,line)=>sum+line.total,0));
});

test('multiple bought packages share a single addon ID while retaining distinct receipt allocations',()=>{
 const data=input({basket:{lounge:1,waiting:2,[decor]:3},businessChoices:{lounge:'buy',waiting:'buy'},cartLinks:{[decor]:{packageAllocations:{lounge:1,waiting:2}}}}),receipt=snapshot(data);
 assert.equal(receipt.acquisition,'purchase');assert.equal(receipt.total,28700);
 assert.deepEqual(receipt.lines.filter(line=>line.id===decor).map(line=>[line.quantity,line.total,line.addonFor[0].id]),[[1,900,'lounge'],[2,1800,'waiting']]);
});

test('rent and optional purchase-after-rental keep all addons rented and preserve rental terms',()=>{
 for(const mode of ['rent','try']){
  const data=rentalDetails(input({businessChoices:{lounge:mode}})),split=splitAcquisitionBasket(data.basket,data.businessChoices,products,data.cartLinks);
  assert.deepEqual(split,{rental:data.basket,purchase:{}});assert.deepEqual(requiredEnquiryTerms(data,products),[versions.rental]);
  const receipt=snapshot(data);assert.equal(receipt.acquisition,'rental');assert.equal(receipt.lines.find(line=>line.id===decor).total,250);
  assert.equal(receipt.purchaseOptions.length,mode==='try'?1:0);if(mode==='try')assert.equal(receipt.purchaseOptions[0].total,12100);
 }
});

test('custom package claims and loose rental items retain their addon quantities when another package is bought',()=>{
 const data=rentalDetails(input({basket:{lounge:1,chair:2,table:1,[decor]:2,[textile]:3},cartLinks:{[decor]:{packageAllocations:{lounge:1}},[textile]:{packageAllocations:{lounge:2}}},packageGroups:[{id:'custom:waiting',packageId:'waiting',quantity:1,selection:{chair:2,table:1,[decor]:1,[textile]:1}}]}));
 assert.deepEqual(splitAcquisitionBasket(data.basket,data.businessChoices,products,data.cartLinks,data.packageGroups),{rental:{chair:2,table:1,[decor]:1,[textile]:1},purchase:{lounge:1,[decor]:1,[textile]:2}});
 const receipt=snapshot(data);assert.equal(receipt.lines.find(line=>line.id===decor&&line.group.id==='custom:waiting').quantity,1);assert.equal(receipt.lines.find(line=>line.id===decor&&line.group.id==='purchase:lounge').quantity,1);
});

test('unknown addon purchase price keeps complete purchase total unknown and never falls back to rental price',()=>{
 const items=products.map(p=>p.id===decor?{...p,buyoutUnitPrice:null}:p),data=input(),receipt=snapshot(data,items),group=packageCartView(data.basket,items,[],data.cartLinks).groups[0];
 assert.equal(receipt.total,null);assert.equal(receipt.lines.find(line=>line.id===decor).total,null);assert.equal(packagePurchaseSelectionPrice(group.product,1,group.extras,items),null);
 const service=input({basket:{lounge:1,styling:1},cartLinks:{styling:{parentId:'lounge',packageQuantity:1}}}),serviceReceipt=snapshot(service);
 assert.equal(serviceReceipt.acquisition,'purchase');assert.equal(serviceReceipt.total,null);assert.equal(serviceReceipt.lines.find(line=>line.id==='styling').total,null);
});

test('a forged relationship cannot convert an unrelated addon to purchase and invalid decor quantities still fail validation',()=>{
 const data=input({basket:{lounge:1,unrelated:1},cartLinks:{unrelated:{parentId:'lounge',packageQuantity:1}}});
 assert.deepEqual(splitAcquisitionBasket(data.basket,data.businessChoices,products,data.cartLinks),{rental:{unrelated:1},purchase:{lounge:1}});
 assert.deepEqual(requiredEnquiryTerms(data,products),[versions.rental,versions.purchase]);
 assert.throws(()=>snapshot(data),/Vilkårene/);
 assert.throws(()=>snapshot(input({basket:{lounge:1,[decor]:2},cartLinks:{[decor]:{parentId:'lounge',packageQuantity:2}}})),/Tilvalgene krever/);
});
