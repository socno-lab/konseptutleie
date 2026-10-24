import test from 'node:test';
import assert from 'node:assert/strict';
import {productPageUrl,safeCatalogReturn} from '../public/product-page-model.js';
test('dedicated buy and rental URLs preserve the exact product identity',()=>{assert.equal(productPageUrl('obj_123','buy'),'/kjopsprodukt.html?produkt=obj_123');assert.equal(productPageUrl('obj_123','rent'),'/leieprodukt.html?produkt=obj_123');});
test('return links preserve category search subcategory and usage',()=>{const back='/utvalg.html?bruk=boligsalg&kategori=Sofaer&underkategori=Modulsofaer&sok=Kid#utvalg';const u=new URL(productPageUrl('obj_kid','rent',{returnTo:back,bruk:'boligsalg',prisbruk:'standard',oppsett:'saved-1'}),'https://konseptuell.invalid');assert.equal(u.searchParams.get('retur'),back);assert.equal(u.searchParams.get('oppsett'),'saved-1');assert.equal(u.searchParams.get('prisbruk'),'standard');});
test('catalogue return rejects external sites scripts and admin',()=>{for(const target of ['https://bad.example','//bad.example','javascript:alert(1)','/admin','/kjopsprodukt.html?produkt=x'])assert.equal(safeCatalogReturn(target,'buy'),'/kjop.html');});
test('legacy product parameters are removed from a catalogue return',()=>{assert.equal(safeCatalogReturn('/kjop.html?produkt=old&sok=stol','buy'),'/kjop.html?sok=stol');});
