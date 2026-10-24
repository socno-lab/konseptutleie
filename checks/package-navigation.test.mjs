import test from 'node:test';
import assert from 'node:assert/strict';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {readPurposeState} from '../public/rental-purpose-model.js';
import {readHtmlTemplate} from '../server/html-templates.mjs';
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

test('rendered home links show all products despite a saved housing purpose, while the housing card stays scoped',async()=>{
 const products=[{id:'pack',name:'Loungepakken',active:true,isPackage:true,category:'Pakker'}],source=await readHtmlTemplate('index.html');
 const html=renderSeo(source,pageModel('/',new URLSearchParams(),products),products,true);
 const anchors=[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([,attributes,content])=>({href:attributes.match(/\bhref="([^"]+)"/)?.[1]?.replaceAll('&amp;','&'),text:content.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()}));
 const allProducts=anchors.filter(anchor=>/^Se alle produkter(?:\s*↗)?$/.test(anchor.text));
 assert.equal(allProducts.length,2,'both home entry points must lead to the complete catalogue');
 for(const {href} of allProducts)assert.deepEqual(readPurposeState(new URL(href,'https://example.invalid'),'boligsalg'),{purpose:'alle',category:'Alle',query:''});
 const housing=anchors.find(anchor=>anchor.href&&new URL(anchor.href,'https://example.invalid').searchParams.get('bruk')==='boligsalg');
 assert.ok(housing,'the explicit housing entry point must remain available');
 assert.deepEqual(readPurposeState(new URL(housing.href,'https://example.invalid'),'alle'),{purpose:'boligsalg',category:'Enkeltprodukter',query:''});
});
