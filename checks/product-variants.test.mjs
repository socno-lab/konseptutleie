import test from 'node:test';
import assert from 'node:assert/strict';
import {variantFields,productVariants} from '../public/product-variants.js';
import {remaining,selectionDraft} from '../public/catalog-model.js';
import {validateCatalog} from '../server/catalog.mjs';
import {readFileSync} from 'node:fs';
test('Only active variants in the exact group and category appear; each colour keeps separate stock',()=>{
 const sand={id:'sand',name:'Mush, sand',category:'Belysning',variantGroup:'Mush Tall',variantLabel:'Sand',active:true,stock:2,unavailable:0},nickel={...sand,id:'nickel',name:'Mush, nikkel',variantLabel:'Nikkel'};
 const products=[sand,nickel,{...sand,id:'hidden',active:false},{...sand,id:'deleted',deletedAt:'2026-10-19T00:00:00.000Z'},{...sand,id:'different',variantGroup:'Mush Short'},{...sand,id:'table',category:'Bord'}];
 assert.deepEqual(productVariants(sand,products).map(p=>p.id),['nickel','sand']);
 const cart=selectionDraft({},products,'sand',2);
 assert.equal(remaining('sand',cart,products),0);assert.equal(remaining('nickel',cart,products),2);
 assert.equal(selectionDraft(cart,products,'nickel',2).nickel,2);
 assert.deepEqual(productVariants({...sand,isPackage:true},products),[]);
 assert.equal(variantFields({name:'Konsollbord med hylle, hvitt'}).variantLabel,'Hvit');
 assert.deepEqual(variantFields({name:'Konsollbord med hylle, hvitt',variantGroup:'',variantLabel:''}),{variantGroup:'',variantLabel:''});
});
test('Colour group and label survive catalog validation and malformed combinations are rejected',()=>{
 const {products}=JSON.parse(readFileSync(new URL('../data/catalog-export-2026-10-17.json',import.meta.url)));
 const p=products.find(x=>!x.isPackage&&!x.addonOnly&&!x.moduleSeries&&!x.wallGroup);
 p.variantGroup='Mush Tall';p.variantLabel='Sand';
 assert.equal(validateCatalog(products).find(x=>x.id===p.id).variantLabel,'Sand');
 p.variantLabel='';assert.throws(()=>validateCatalog(products),/Fargevarianter/);
 p.variantLabel='Sand';p.variantGroup=42;assert.throws(()=>validateCatalog(products),/Fargevarianter/);
});

test('rental colours exclude sale-only, zero-stock and hidden colours; furniture stays separate',async()=>{
 const {rentalVariants,groupedRentalCards}=await import('../public/product-variants.js');
 const sand={id:'sand',name:'BringMe, sand',category:'Belysning',variantGroup:'BringMe',variantLabel:'Sand',active:true,rentalEnabled:true,stock:4,unavailable:0};
 const green={...sand,id:'green',variantLabel:'Grønn'},sold={...sand,id:'black',variantLabel:'Sort',rentalEnabled:false,stock:0},hidden={...sand,id:'hidden',active:false},zero={...sand,id:'zero',stock:0};
 assert.deepEqual(rentalVariants(sand,[sand,green,sold,hidden,zero]).map(p=>p.id),['green','sand']);
 assert.equal(groupedRentalCards([sand,green]).length,1);
 assert.equal(groupedRentalCards([sand,green].map(p=>({...p,category:'Stoler'}))).length,2);
 const cart=selectionDraft({},[sand,green],sand.id,4);assert.equal(remaining(green.id,cart,[sand,green]),4);
});
test('joining and leaving groups preserves unselected previous members',async()=>{
 const {linkVariantProducts}=await import('../public/product-variants.js');
 const base={category:'Belysning',active:true,name:'Lampe',variantGroup:'A',variantLabel:'Sand'};
 const a={...base,id:'a'},b={...base,id:'b',variantLabel:'Grønn'},c={...base,id:'c',variantLabel:'Sort'};
 const added={...base,id:'new',variantLabel:'Blå'};
 const joined=linkVariantProducts(added,[a,b,c,added],[{id:'a',label:'Sand'},{id:'b',label:'Grønn'},{id:'c',label:'Sort'}],null);
 assert.equal(joined.filter(p=>p.variantGroup==='A').length,4);
 const left=linkVariantProducts({...a,variantGroup:'',variantLabel:''},[a,b,c],[],a);
 assert.equal(left.find(p=>p.id==='b').variantGroup,'A');assert.equal(left.find(p=>p.id==='c').variantGroup,'A');
 const removed=linkVariantProducts(a,[a,b,c],[{id:'b',label:'Grønn'}],a);
 assert.equal(removed.find(p=>p.id==='c').variantGroup,'');
});
