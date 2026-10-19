import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanBusinessChoices,splitAcquisitionBasket} from '../public/business-purchase-model.js';
const waiting='obj_8f62b216c40348b29d42b4c7b9c0c6a0',lounge='obj_b71d8247647e4575965649ddfa802485';
test('Only eligible packages and known acquisition modes survive persistence',()=>{
 assert.deepEqual(cleanBusinessChoices({[waiting]:'buy',[lounge]:'try',chair:'buy',unknown:'bad'}),{[waiting]:'buy',[lounge]:'try'});
 assert.deepEqual(cleanBusinessChoices([]),{});
});
test('Purchase lines never enter rental calculations; try-first remains rental',()=>{
 const basket={[waiting]:1,[lounge]:2,chair:3};
 assert.deepEqual(splitAcquisitionBasket(basket,{[waiting]:'buy',[lounge]:'try',chair:'buy'}),{purchase:{[waiting]:1},rental:{[lounge]:2,chair:3}});
 assert.deepEqual(basket,{[waiting]:1,[lounge]:2,chair:3});
 assert.deepEqual(splitAcquisitionBasket(basket,{}),{purchase:{},rental:basket});
});

import {businessPurchaseEnabled,configureBusinessPackages,packagePurchasePrice} from '../public/business-purchase-model.js';
import {validateCatalog} from '../server/catalog.mjs';
import {readFileSync} from 'node:fs';
import {matchesPurpose} from '../public/rental-purpose-model.js';
test('Admin defines purchase eligibility per package, never implicitly for its component products',()=>{
 const pack={id:'new_business',isPackage:true,businessPurchase:true,purchasePrice:12000};
 assert.equal(businessPurchaseEnabled(pack),true);
 assert.equal(businessPurchaseEnabled({id:waiting,isPackage:true,businessPurchase:false}),false);
 assert.equal(businessPurchaseEnabled({...pack,isPackage:false}),false);
 assert.equal(packagePurchasePrice(pack,2),24000);
 assert.equal(packagePurchasePrice({...pack,purchasePrice:null}),null);
 assert.equal(packagePurchasePrice({...pack,purchasePrice:0}),null);
 assert.equal(matchesPurpose(pack,'bedrift'),true);
 configureBusinessPackages([pack]);
 assert.deepEqual(cleanBusinessChoices({new_business:'try',[waiting]:'buy'}),{new_business:'try'});
 assert.deepEqual(splitAcquisitionBasket({new_business:1,chair:4},{new_business:'try',chair:'buy'}),{rental:{new_business:1,chair:4},purchase:{}});
 configureBusinessPackages([{id:waiting,isPackage:true},{id:lounge,isPackage:true}]);
});
test('Catalog validation preserves configured business prices and rejects invalid scope or monetary values',()=>{
 const {products}=JSON.parse(readFileSync(new URL('../data/catalog-export-2026-10-17.json',import.meta.url)));
 const pack=products.find(p=>p.isPackage&&!p.isProposal),item=products.find(p=>!p.isPackage);
 pack.businessPurchase=true;pack.purchasePrice=14500.50;
 assert.equal(validateCatalog(products).find(p=>p.id===pack.id).purchasePrice,14500.50);
 assert.equal(validateCatalog(products).find(p=>p.id===pack.id).businessPurchase,true);
 for(const price of [-1,0,1.001,Infinity,'12000']){pack.purchasePrice=price;assert.throws(()=>validateCatalog(products));}
 pack.purchasePrice=null;item.businessPurchase=true;
 assert.throws(()=>validateCatalog(products),/faste bedriftspakker/);
 item.businessPurchase=false;pack.businessPurchase=false;pack.purchasePrice=100;
 assert.throws(()=>validateCatalog(products),/Aktiver kjøpsmulighet/);
});

import {packagePurchaseBreakdown,resolvedPackagePurchasePrice} from '../public/business-purchase-model.js';
import {publicCatalog} from '../app-server.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
test('Package purchase price multiplies quantities and never shows partial totals',()=>{
 const pack={id:waiting,isPackage:true,businessPurchase:true,purchasePriceMode:'components',components:[{id:'chair',quantity:4},{id:'table',quantity:1}]};
 const items=[{id:'chair',name:'Stol',purchaseUnitPrice:1999},{id:'table',name:'Bord',purchaseUnitPrice:3000.50}];
 assert.equal(resolvedPackagePurchasePrice(pack,items),10996.50);
 items[0].purchaseUnitPrice=2000;assert.equal(resolvedPackagePurchasePrice(pack,items),11000.50);
 items[1].purchaseUnitPrice=null;assert.equal(resolvedPackagePurchasePrice(pack,items),null);assert.deepEqual(packagePurchaseBreakdown(pack,items).missing.map(x=>x.id),['table']);
 assert.equal(resolvedPackagePurchasePrice({...pack,businessPurchase:false},items),null);
 assert.equal(resolvedPackagePurchasePrice({...pack,purchasePriceMode:'manual',purchasePrice:12500},items),12500);
 assert.equal(resolvedPackagePurchasePrice({...pack,components:[]},items),null);
 assert.equal(resolvedPackagePurchasePrice({...pack,components:[{id:'missing',quantity:1}]},items),null);
 assert.equal(packagePurchaseBreakdown({components:[{id:'x',quantity:3}]},[{id:'x',purchaseUnitPrice:1.11}]).total,3.33);
});
test('Component price fields survive saves and invalid prices are rejected',()=>{
 const {products}=JSON.parse(readFileSync(new URL('../data/catalog-export-2026-10-17.json',import.meta.url)));
 const item=products.find(p=>!p.isPackage),pack=products.find(p=>p.isPackage);
 item.purchaseUnitPrice=1999;
 assert.equal(validateCatalog(products).find(p=>p.id===item.id).purchaseUnitPrice,1999);
 for(const value of [-1,0,1.001,Infinity,'1999']){item.purchaseUnitPrice=value;assert.throws(()=>validateCatalog(products),/Kjøpspris per produkt/);}
 item.purchaseUnitPrice=null;pack.purchaseUnitPrice=10;assert.throws(()=>validateCatalog(products),/Kjøpspris per produkt/);
});
test('Public catalog calculates package prices and keeps component prices in admin',async()=>{
 const store=await memoryStore();const data=await store.readCatalog();const pack=data.products.find(p=>p.isPackage&&!p.isProposal);pack.active=true;pack.businessPurchase=true;pack.purchasePriceMode='components';pack.purchasePrice=null;
 for(const component of pack.components)data.products.find(p=>p.id===component.id).purchaseUnitPrice=1234.50;
 const expected=pack.components.reduce((total,c)=>total+c.quantity*1234.50,0);
 const catalog=publicCatalog(data);assert.equal(catalog.products.find(p=>p.id===pack.id).purchasePrice,expected);assert.ok(catalog.products.every(p=>!Object.hasOwn(p,'purchaseUnitPrice')));
 data.products.find(p=>p.id===pack.components[0].id).purchaseUnitPrice=null;
 assert.equal(publicCatalog(data).products.find(p=>p.id===pack.id).purchasePrice,null);
});
test('Acquisition cost is internal and never becomes a rental or package sale price',()=>{
 const {products}=JSON.parse(readFileSync(new URL('../data/catalog-export-2026-10-17.json',import.meta.url)));
 const item=products.find(p=>!p.isPackage);item.acquisitionCost=3199;
 const saved=validateCatalog(products),stored=saved.find(p=>p.id===item.id);
 assert.equal(stored.acquisitionCost,3199);assert.equal(stored.purchaseUnitPrice,null);assert.equal(stored.price,item.price);
 assert.ok(publicCatalog({products:saved}).products.every(p=>!Object.hasOwn(p,'acquisitionCost')));
 for(const invalid of [-1,3.199,Infinity,'3199']){item.acquisitionCost=invalid;assert.throws(()=>validateCatalog(products),/Innkjøpspris/);}
});
