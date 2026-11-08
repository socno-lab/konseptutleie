import test from 'node:test';import assert from 'node:assert/strict';
import {migrateDimensions} from '../server/dimensions-migration.mjs';
import {validateDimensions,dimensionsMarkup} from '../public/product-dimensions.js';
test('labelled dimensions keep axes, seat dimensions, prose and idempotency',()=>{
 const p={material:'Eik · B50 × H80 × D51,5 cm',description:'En god stol. Sittehøyde: 45 cm. Maks belastning: 120 kg.\n\nFor innendørs bruk.'};
 const n=migrateDimensions(p);assert.deepEqual(n.dimensions,{width:50,height:80,depth:51.5,seatHeight:45});assert.equal(n.material,'Eik');assert.equal(n.description,'En god stol. Maks belastning: 120 kg.\n\nFor innendørs bruk.');assert.equal(migrateDimensions(n),n);assert.deepEqual(n.dimensionsLegacy,p);
});
test('unlabelled, approximate and component dimensions retain exact meaning',()=>{
 const n=migrateDimensions({material:'Natur · 30 × 140 × 105 cm · innerpotte Ø12 × H12 cm',description:'To moduler gir 240 cm bredde.'});assert.equal(n.dimensions.other,'30 × 140 × 105 cm · innerpotte Ø12 × H12 cm');assert.equal(n.dimensions.width,undefined);assert.equal(n.description,'To moduler gir 240 cm bredde.');
});
test('conflicting and package description measurements are not removed',()=>{
 const n=migrateDimensions({material:'B80 × D50 × H90 cm',description:'B100 × D50 × H90 cm.'});assert.equal(n.dimensions.width,80);assert.equal(n.description,'B100 × D50 × H90 cm.');
 const p=migrateDimensions({isPackage:true,material:'Lounge',description:'Høyde 150 cm.\n\nAnnet.'});assert.equal(p.description,'Høyde 150 cm.\n\nAnnet.');
});
test('validation rejects invalid data, and display omits empty values and escapes free text',()=>{
 for(const d of [{width:-1},{height:Infinity},{depth:'10'},{other:'a'.repeat(501)}])assert.throws(()=>validateDimensions(d));
 assert.equal(dimensionsMarkup({dimensions:{}}),'');assert.match(dimensionsMarkup({dimensions:{width:55.5,other:'<test>'}}),/55,5 cm/);assert.match(dimensionsMarkup({dimensions:{other:'<test>'}}),/&lt;test&gt;/);
});
test('catalog validation preserves dimensions on old clients and allows explicit clearing',async()=>{
 const {validateCatalog}=await import('../server/catalog.mjs');
 const {memoryStore}=await import('./helpers/memory-store.mjs');
 const store=await memoryStore();const current=(await store.readCatalog()).products.map(migrateDimensions);
 const p=current[0];assert.ok(Object.keys(p.dimensions).length);
 const old=current.map(({dimensions,...row})=>row);const saved=validateCatalog(old,current);assert.deepEqual(saved[0].dimensions,p.dimensions);
 const cleared=validateCatalog(current.map((row,i)=>i?row:{...row,dimensions:{}}),current);assert.deepEqual(cleared[0].dimensions,{});
 assert.deepEqual(cleared[0].dimensionsLegacy,p.dimensionsLegacy);
});
