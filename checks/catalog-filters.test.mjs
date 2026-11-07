import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogFilters} from '../public/catalog-filters.js';
import {defaultSettings} from '../public/site-settings.js?v=content20261107';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {readHtmlTemplate} from '../server/html-templates.mjs';
const settings=structuredClone(defaultSettings);
settings.categories.push({id:'custom',label:'Speil & rammer',subcategories:[]},{id:'unused',label:'Unused',subcategories:[]});
const products=[{id:'chair',category:'Stoler',active:true},{id:'mirror',category:'custom',active:true},{id:'pack',category:'Pakker',active:true,isPackage:true}];
test('server and client have identical category labels, order and selection for all catalogue routes',async()=>{
 const source=await readHtmlTemplate('utvalg.html');
 for(const purpose of ['fest','messe','jul','bedrift','boligsalg','alle'])for(const category of ['Alle','Enkeltprodukter','Pakker','Stoler','custom','Modulsofaer','unknown']){
  const model=pageModel('/utvalg.html',new URLSearchParams({bruk:purpose,kategori:category}),products);
  const html=renderSeo(source,model,products,true,settings),buttons=catalogFilters(products,settings,category,purpose);
  assert.ok(html.includes('<div class="filters" role="group" aria-label="Produktkategorier">'+buttons+'</div>'));
  assert.equal((buttons.match(/aria-pressed="true"/g)||[]).length,1);
  assert.match(buttons,/Enkeltprodukter/);assert.match(buttons,/Pakker og tjenester/);
  assert.match(buttons,/Speil &amp; rammer/);assert.doesNotMatch(buttons,/Unused/);
  if(purpose==='boligsalg')assert.match(buttons,/data-filter="Pakker"[^>]* hidden/);
 }
});
