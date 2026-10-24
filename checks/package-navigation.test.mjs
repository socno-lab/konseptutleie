import test from 'node:test';
import assert from 'node:assert/strict';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {readPurposeState} from '../public/rental-purpose-model.js';
test('global package links override a previously selected housing purpose while explicit housing links stay scoped',()=>{
 const source='<html><head><title>Konseptuell</title></head><body><main><section id="occasionLanding"></section></main></body></html>';
 const products=[{id:'pack',name:'Loungepakken',active:true,isPackage:true,category:'Pakker'}];
 for(const [pathname,query] of [['/',''],['/anledning.html','bruk=messe&anledning=messe']]){
  const html=renderSeo(source,pageModel(pathname,new URLSearchParams(query),products),products,true);
  const links=[...html.matchAll(/href="([^"]+)"[^>]*>(?:Se ferdige pakker|Loungepakker og ferdige møbelpakker)</g)];assert.equal(links.length,pathname==='/'?1:2);
  for(const [,href] of links){const state=readPurposeState(new URL(href.replaceAll('&amp;','&'),'https://example.invalid'),'boligsalg');assert.equal(state.purpose,'alle');assert.equal(state.category,'Pakker');}
 }
 assert.deepEqual(readPurposeState('https://example.invalid/utvalg.html?bruk=boligsalg&kategori=Enkeltprodukter','alle'),{purpose:'boligsalg',category:'Enkeltprodukter',query:''});
});
