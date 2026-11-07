import test from 'node:test';import assert from 'node:assert/strict';
import {readHtmlTemplate} from '../server/html-templates.mjs';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {defaultSettings,configureSiteSettings} from '../public/site-settings.js?v=jul20261107';
import {publicCatalog} from '../app-server.mjs';import {memoryStore} from './helpers/memory-store.mjs';
import {saleCatalogView} from '../public/sale-catalog-view.js?v=jul20261107';
import {readInitialCatalog} from '../public/catalog-card-markup.js';
import {renderArrowIcons} from '../server/arrow-icons.mjs';
const store=await memoryStore(),data=publicCatalog({...await store.readCatalog(),settings:defaultSettings}),source=await readHtmlTemplate('kjop.html');
test('purchase HTML contains the same filtered count, categories and initial cards as the browser',()=>{
 configureSiteSettings(data.settings);
 for(const category of ['','Stoler','Bord','Belysning','missing'])for(const sub of ['','Spisestoler','Sidebord'])for(const query of ['','bord','no-match-xyz']){
  const params=new URLSearchParams({kategori:category,underkategori:sub,sok:query}),model=pageModel('/kjop.html',params,data.products),html=renderSeo(source,model,data.products,true,data.settings);
  const view=saleCatalogView({products:data.products,category,tableFilter:sub,query}),n=Math.min(view.shown.length,24);
  assert.ok(html.includes('>'+view.status+'</p>'));assert.ok(html.includes(view.categoryHtml));assert.ok(html.includes(view.subcategoryHtml));
  assert.equal((html.match(/data-catalog-render=/g)||[]).length,n);
  assert.equal((html.match(/class="header-favorite-toggle card-favorite-toggle"/g)||[]).length,n);
  assert.ok(html.includes(renderArrowIcons(view.shown.slice(0,n).map(view.renderItem).join(''))));
  assert.equal((html.match(/id="saleTableTypes"/g)||[]).length,1);assert.doesNotMatch(html,/Laster produkter/);
  const snap=html.match(/id="initialSaleCatalog">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(readInitialCatalog({getElementById:id=>id==='initialSaleCatalog'?{textContent:snap}:null}),JSON.parse(JSON.stringify({products:data.products,settings:data.settings})));
  assert.match(html,/<noscript><style>#saleProducts\{display:none!important\}/);
 }
});
test('first purchase batch is bounded; eager images and hearts exist before JavaScript',()=>{
 const p={...data.products.find(p=>p.saleEnabled),image:'/media/12345678901234567890123456789012',moduleSeries:'',variantGroup:''};
 const products=Array.from({length:61},(_,i)=>({...p,id:'test-'+i,name:'Stol '+i}));
 const view=saleCatalogView({products}),html=renderSeo(source,pageModel('/kjop.html',new URLSearchParams(),products),products,true,data.settings);
 assert.equal((html.match(/data-catalog-render=/g)||[]).length,24);
 for(let i=0;i<30;i++){
  const card=view.renderItem(view.shown[i],i);assert.match(card,new RegExp('loading="'+(i<4?'eager':'lazy')+'"'));
  assert.match(card,/class="[^\"]*catalog-product-card/);assert.doesNotMatch(card,/<button[^>]+data-product=/);
  assert.match(card,/class="catalog-card-link"/);assert.match(card,/card-favorite-toggle/);
 }
 assert.match(view.renderItem(view.shown[0],0),/fetchpriority="high"/);
});
test('snapshot and search text cannot inject HTML, and detail pages retain their own loading flow',()=>{
 const products=[{...data.products.find(p=>p.saleEnabled),name:'</script><script>bad()</script> & $&'}],q='"><script>bad()</script>';
 const html=renderSeo(source,pageModel('/kjop.html',new URLSearchParams({sok:q}),products),products,true,data.settings);
 const raw=html.match(/id="initialSaleCatalog">([\s\S]*?)<\/script>/)[1];assert.ok(!raw.includes('<'));assert.equal(JSON.parse(raw).products[0].name,products[0].name);assert.doesNotMatch(html,/<script>bad/);
 const detail=renderSeo(source,pageModel('/kjopsprodukt.html',new URLSearchParams({produkt:products[0].id}),products),products,true,data.settings);assert.ok(!detail.includes('id="initialSaleCatalog"'));
});
