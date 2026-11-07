import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogPositionKey} from '../public/catalog-position.js';
test('return position survives reordered filters, encoding and catalogue anchor',()=>{
 assert.equal(catalogPositionKey('/kjop.html?sok=lys%20grå&kategori=Stoler#utvalg'),catalogPositionKey('/kjop.html?kategori=Stoler&sok=lys+gr%C3%A5'));
});
test('different filters, uses and sale/rental lists keep distinct positions',()=>{
 const urls=['/kjop.html?sok=stol','/kjop.html?sok=bord','/utvalg.html?sok=stol','/utvalg.html?bruk=messe','/utvalg.html?bruk=fest','/utvalg.html?bruk=messe&underkategori=Spisestoler'];
 assert.equal(new Set(urls.map(url=>catalogPositionKey(url))).size,urls.length);
});
