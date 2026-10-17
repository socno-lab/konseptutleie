import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesPurpose,productPurposes,prioritizePackages,readPurposeState,purposeUrl,validatePurposes} from '../public/purpose-model.js';
import {migrateProducts} from '../server/walls.mjs';
import {validateCatalog} from '../server/catalog.mjs';
import {readFile} from 'node:fs/promises';

test('Multi-purpose membership, unreviewed products and explicit admin overrides',()=>{
 const p={id:'custom',purposes:['messe','event']};assert(matchesPurpose(p,'messe'));assert(matchesPurpose(p,'event'));assert(!matchesPurpose(p,'boligsalg'));assert(matchesPurpose({id:'unknown'},'alle'));assert(!matchesPurpose({id:'unknown'},'event'));
 assert.deepEqual(productPurposes({id:'obj_e5a2795d240d491dbfc531978cbd09fe'}),['messe','event']);assert.deepEqual(productPurposes({id:'obj_e5a2795d240d491dbfc531978cbd09fe',purposes:[]}),[]);
 assert.throws(()=>validatePurposes(['unknown']));assert.throws(()=>validatePurposes(['event','event']));assert.throws(()=>validatePurposes('messe'));
});
test('Packages first without changing source data; state round trips and invalid links',()=>{
 const source=[{id:'chair'},{id:'p',isPackage:true},{id:'table'},{id:'p2',isPackage:true}];assert.deepEqual(prioritizePackages(source).map(p=>p.id),['p','p2','chair','table']);assert.equal(source[0].id,'chair');
 const state={purpose:'messe',category:'Stoler',query:'eik'};const u=purposeUrl('https://example.test/?existing=1#utvalg',state);assert.deepEqual(readPurposeState('https://example.test'+u),state);assert(u.includes('existing=1'));assert(u.endsWith('#utvalg'));assert.equal(readPurposeState('https://example.test/').purpose,'alle');assert.equal(readPurposeState('https://example.test/','event').purpose,'event');assert.equal(readPurposeState('https://example.test/?bruk=wrong','event').purpose,'alle');assert.equal(readPurposeState('https://example.test/?bruk=alle','event').purpose,'alle');
});
test('Catalog migration and save preserve uses, prices, images, stock and archive flags',async()=>{
 const seed=JSON.parse(await readFile(new URL('../data/catalog-export-2026-10-17.json',import.meta.url),'utf8'));const migrated=migrateProducts(seed.products);const saved=validateCatalog(migrated);for(let i=0;i<saved.length;i++){for(const key of ['id','price','image','stock','active'])assert.equal(saved[i][key],seed.products[i][key]);assert.deepEqual(saved[i].purposes,migrated[i].purposes);}
 saved[12].purposes=[];assert.deepEqual(migrateProducts(validateCatalog(saved))[12].purposes,[]);
 assert.equal(migrated.filter(p=>p.active&&p.isPackage).length,0);
});
