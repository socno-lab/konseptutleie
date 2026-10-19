import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesPurpose,resolvedProductPurposes} from '../public/rental-purpose-model.js';
import {validateCatalog} from '../server/catalog.mjs';
import {linkVariantProducts,productVariants} from '../public/product-variants.js';
import {readFileSync} from 'node:fs';
test('Explicit admin use areas override legacy mappings, including empty selection',()=>{
 const p={id:'obj_a6ca0b4ab5d94e0b811e2fddf13b13b9',isPackage:true,businessPurchase:true,purposes:['fest','jul'],purposesExplicit:true};
 assert(matchesPurpose(p,'fest'));assert(matchesPurpose(p,'jul'));assert(!matchesPurpose(p,'bedrift'));assert(!matchesPurpose(p,'messe'));assert(!matchesPurpose({...p,purposes:[]},'jul'));assert(matchesPurpose({...p,purposes:[]},'alle'));
 const legacy={id:'old',category:'Stoler',purposes:['messe','event']};assert.deepEqual(resolvedProductPurposes(legacy),['messe','bedrift','fest']);
});
test('New assignments and legacy event assignments survive catalog validation',()=>{
 const {products}=JSON.parse(readFileSync(new URL('../data/catalog-export-2026-10-17.json',import.meta.url)));products[0].purposes=['boligsalg','messe','bedrift','fest','jul'];products[0].purposesExplicit=true;
 const saved=validateCatalog(products);assert.deepEqual(saved[0].purposes,products[0].purposes);assert.equal(saved[0].purposesExplicit,true);assert.throws(()=>validateCatalog([{...products[0],purposes:['invalid']}]),/bruksområde/);
});
test('Variant links update peers together without changing stock, images or prices; unlink and rename work',()=>{
 const a={id:'a',name:'Lamp, sand',category:'Belysning',variantGroup:'Old',variantLabel:'Sand',active:true,stock:2,price:100,image:'/a.jpg'},b={...a,id:'b',variantLabel:'Nikkel'},c={...a,id:'c',variantLabel:'Grønn'};
 const next=linkVariantProducts({...a,variantGroup:'New'},[a,b,c],[{id:'b',label:'Nikkel'}]);assert.equal(next[1].variantGroup,'New');assert.equal(next[2].variantGroup,'');for(let i=0;i<3;i++)for(const key of ['stock','price','image'])assert.equal(next[i][key],[a,b,c][i][key]);assert.equal(productVariants(next[0],next).length,2);
 assert.throws(()=>linkVariantProducts(a,[a,{...b,category:'Bord'}],[{id:'b',label:'Nikkel'}]),/samme kategori/);
 assert.throws(()=>linkVariantProducts(a,[a,b],[{id:'b',label:''}]),/samme kategori/);
});
