import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionDraft,rentalEstimate} from '../public/catalog-model.js';
import {cartChange,addonRequirementError} from '../public/addon-model.js';

test('Curated decor stays attached to enough tables and quote pricing is preserved',()=>{
 const table={id:'brook',name:'Brook Table S',stock:2,unavailable:0,price:300,weekPrice:1500,monthPrice:4500,relatedAddOns:['decor']};
 const decor={id:'decor',name:'Dekorpakke',addonOnly:true,isService:true,priceOnRequest:true,requiredProductId:'brook',requiredProductQuantity:1};
 const products=[table,decor].map(p=>({...p,active:true}));
 assert.equal(selectionDraft({},products,'decor',1),null);
 assert.equal(selectionDraft({},products,'brook',1,'decor',2),null);
 const chosen=selectionDraft({},products,'brook',1,'decor',1);
 assert.deepEqual(chosen,{brook:1,decor:1});
 assert.equal(cartChange(chosen,products,'brook',0),null);
 assert.equal(cartChange(chosen,products,'decor',2),null);
 assert.deepEqual(cartChange(chosen,products,'decor',0),{brook:1});
 assert.match(addonRequirementError({brook:1,decor:2},products),/Brook Table S/);
 assert(!addonRequirementError({brook:2,decor:2},products));
 const estimate=rentalEstimate(chosen,products,'2026-10-20','2026-10-21');
 assert.equal(estimate.hasUnpriced,true);
 assert.equal(estimate.lines.find(p=>p.id==='decor')?.plan,null);
});
