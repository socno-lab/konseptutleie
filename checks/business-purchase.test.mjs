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
