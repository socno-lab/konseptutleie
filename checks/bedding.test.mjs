import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryStore} from './helpers/memory-store.mjs';
import {selectionDraft,normalizeBasket} from '../public/catalog-model.js';
import {addonRequirementError,cartChange} from '../public/addon-model.js';
import {validateCatalog} from '../server/catalog.mjs';
import {changeProductLifecycle} from '../server/product-lifecycle.mjs';

test('Bedding migrates to add-on only, survives saves and cannot be booked independently',async()=>{
 const {products}=await (await memoryStore()).readCatalog(),bed=products.find(p=>p.name==='Sammenleggbar stylingseng ILSKOV'),single=products.find(p=>p.name==='Full sengeoppredning, enkel'),double=products.find(p=>p.name==='Full sengeoppredning, dobbel');
 for(const [p,q] of [[single,1],[double,2]]){assert.equal(p.addonOnly,true);assert.equal(p.requiredProductId,bed.id);assert.equal(p.requiredProductQuantity,q);const saved=validateCatalog(products).find(x=>x.id===p.id);for(const key of ['addonOnly','requiredProductId','requiredProductQuantity','price','stock','image'])assert.deepEqual(saved[key],p[key]);assert.equal(selectionDraft({},products,p.id,1),null);}
 assert.equal(selectionDraft({},products,bed.id,1,double.id,1),null);
 assert.deepEqual(selectionDraft({},products,bed.id,2,double.id,1),{[bed.id]:2,[double.id]:1});
 assert.equal(selectionDraft({},products,bed.id,3,double.id,2),null);
 assert.deepEqual(selectionDraft({},products,bed.id,4,double.id,2),{[bed.id]:4,[double.id]:2});
 assert.equal(selectionDraft({},products,bed.id,1,single.id,2),null);
 const chosen={[bed.id]:2,[double.id]:1};assert.equal(cartChange(chosen,products,bed.id,1),null);assert.equal(cartChange(chosen,products,bed.id,0),null);assert.equal(cartChange(chosen,products,double.id,2),null);assert.deepEqual(cartChange(chosen,products,double.id,0),{[bed.id]:2});assert.deepEqual(chosen,{[bed.id]:2,[double.id]:1});
 const mixed={[bed.id]:3,[single.id]:1,[double.id]:1};assert.equal(addonRequirementError(mixed,products),'');assert(addonRequirementError({...mixed,[bed.id]:2},products));
 assert.deepEqual(normalizeBasket({[double.id]:1},products),{});assert.deepEqual(normalizeBasket(chosen,products),chosen);
 assert.equal(addonRequirementError(normalizeBasket({[bed.id]:1,[double.id]:2},products),products),'');
});

test('Fixed packages reserve both beds and bedding and requirements protect referenced beds',async()=>{
 const {products}=await (await memoryStore()).readCatalog(),bed=products.find(p=>p.name==='Sammenleggbar stylingseng ILSKOV'),double=products.find(p=>p.name==='Full sengeoppredning, dobbel'),pack={...products.find(p=>p.name==='Dobbeltseng med full oppredning'),active:true};const all=products.map(p=>p.id===pack.id?pack:p);
 assert.deepEqual(selectionDraft({},all,pack.id,1),{[pack.id]:1});
 assert.equal(selectionDraft({[pack.id]:1},all,bed.id,1,double.id,1),null);
 assert(selectionDraft({[pack.id]:1},all,bed.id,2,double.id,1));
 assert.equal(selectionDraft({},products.map(p=>p.id===pack.id?{...pack,components:[{id:bed.id,quantity:1},{id:double.id,quantity:1}]}:p),pack.id,1),null);
 assert.throws(()=>validateCatalog(products.map(p=>p.id===double.id?{...p,requiredProductQuantity:0}:p)),/regler for tilvalg/);
 assert.throws(()=>validateCatalog(products.map(p=>p.id===double.id?{...p,requiredProductId:'missing'}:p)),/hovedprodukt/);
 const withoutOtherLinks=products.map(p=>({...p,components:[],isPackage:false,relatedAddOns:[],relatedPackages:[]}));assert.throws(()=>changeProductLifecycle(withoutOtherLinks,bed.id,'trash'),/kreves av tilvalget/);
});
