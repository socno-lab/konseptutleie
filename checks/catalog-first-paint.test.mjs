import test from 'node:test';
import assert from 'node:assert/strict';
import {readHtmlTemplate} from '../server/html-templates.mjs';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {defaultSettings,configureSiteSettings} from '../public/site-settings.js?v=produktvalg2';
import {publicCatalog} from '../app-server.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
import {rentalCatalogView} from '../public/rental-catalog-view.js?v=empty20261107';
import {applyRentalScope} from '../public/rental-pricing-model.js?v=stockmobile20261107';
import {renderCatalogCard,readInitialCatalog} from '../public/catalog-card-markup.js';
import {renderArrowIcons} from '../server/arrow-icons.mjs';
const source=await readHtmlTemplate('utvalg.html');
const store=await memoryStore(),data=publicCatalog({...await store.readCatalog(),settings:defaultSettings});

test('HTML contains the exact initial card batch and counts, with remaining cards deferred',()=>{
 configureSiteSettings(data.settings);
 for(const purpose of ['alle','messe','fest','jul','bedrift','boligsalg'])for(const filter of ['Alle','Enkeltprodukter','Stoler','Bord','Sofaer','Pakker'])for(const query of ['','bord','no-match-xyz']){
  const params=new URLSearchParams({bruk:purpose,kategori:filter,sok:query,prisbruk:'messe'}),model=pageModel('/utvalg.html',params,data.products);
  const effectiveFilter=purpose==='boligsalg'&&filter==='Pakker'?'Enkeltprodukter':filter;
  const view=rentalCatalogView({products:applyRentalScope(data.products.filter(p=>p.rentalEnabled!==false),model.catalogUsage.scope),settings:data.settings,purpose,filter:effectiveFilter,query,rentalScopeConfirmed:true,rentalScope:model.catalogUsage.scope});
  const html=renderSeo(source,model,data.products,true,data.settings),count=Math.min(view.count,view.tailHtml?23:24);
  assert.ok(html.includes('>'+view.desktopCount+'</p>'));
  assert.ok(html.includes('>'+view.mobileCount+'</p>'));
  assert.equal((html.match(/data-catalog-render=/g)||[]).length,count);
  assert.equal((html.match(/class="header-favorite-toggle card-favorite-toggle"/g)||[]).length,count);
  assert.ok(html.includes(renderArrowIcons(view.orderedCards.slice(0,count).map(renderCatalogCard).join(''))));
  assert.equal((html.match(/id="rentalTableTypes"/g)||[]).length,1);
  assert.equal((html.match(/class="catalog-pagination"/g)||[]).length,1);
  assert.ok(html.includes('Viser '+count+' av '+view.count+' produkter'));
  for(const card of html.matchAll(/<article data-catalog-render="[^"]*"[\s\S]*?<\/article>/g)){
   assert.match(card[0],/class="[^"]*catalog-product-card/);
   assert.match(card[0],/class="catalog-card-link"/);
   assert.doesNotMatch(card[0],/<button\b[^>]*data-(?:detail|build|wall|rental-colour)=/);
   assert.doesNotMatch(card[0],/class="(?:add|button dark module-build-button)"/);
  }
  assert.match(html,/<noscript><style>#products\{display:none!important\}<\/style>/);
  const serialized=html.match(/<script type="application\/json" id="initialRentalCatalog">([\s\S]*?)<\/script>/)[1];
  assert.deepEqual(readInitialCatalog({getElementById:()=>({textContent:serialized})}),JSON.parse(JSON.stringify({products:data.products,settings:data.settings})));
 }
});
test('initial public JSON safely roundtrips markup and cannot terminate the script element',()=>{
 const products=[{...data.products[0],name:'</script><script>alert(1)</script> & $&'}];
 const model=pageModel('/utvalg.html',new URLSearchParams({bruk:'messe'}),products),html=renderSeo(source,model,products,true,data.settings);
 const serialized=html.match(/<script type="application\/json" id="initialRentalCatalog">([\s\S]*?)<\/script>/)[1];
 assert.ok(!serialized.includes('<'));assert.deepEqual(JSON.parse(serialized).products,JSON.parse(JSON.stringify(products)));
 assert.doesNotMatch(html,/<script>alert/);
});
test('only the first four card images are eager; load-more cards stay lazy',()=>{
 const card={render:()=>'<article><img src="/assets/test.jpg" loading="lazy" decoding="async"></article>'};
 assert.match(renderCatalogCard(card,0),/fetchpriority="high"/);
 for(let i=0;i<8;i++)assert.match(renderCatalogCard(card,i),new RegExp('loading="'+(i<4?'eager':'lazy')+'"'));
 assert.equal(readInitialCatalog({getElementById:()=>null}),null);
 assert.equal(readInitialCatalog({getElementById:()=>({textContent:'broken'})}),null);
});

const mobileCategoryLabel=html=>html.match(/id="mobileCategoryButton"[^>]*><span>([\s\S]*?)<\/span>/)?.[1];
test('housing category and its count are present in initial mobile HTML before JavaScript',()=>{
 configureSiteSettings(data.settings);
 for(const requested of ['Enkeltprodukter','Pakker']){
  const model=pageModel('/utvalg.html',new URLSearchParams({bruk:'boligsalg',kategori:requested}),data.products);
  const view=rentalCatalogView({products:applyRentalScope(data.products.filter(p=>p.rentalEnabled!==false),model.catalogUsage.scope),settings:data.settings,purpose:'boligsalg',filter:'Enkeltprodukter'});
  const html=renderSeo(source,model,data.products,true,data.settings);
  assert.equal(mobileCategoryLabel(html),'Enkeltprodukter ('+view.count+')');
  assert.match(html,/id="mobileCategoryButton"[^>]*aria-label="Velg kategori: Enkeltprodukter \(\d+\)"[^>]*><span>Enkeltprodukter \(\d+\)<\/span><span aria-hidden="true">⌄<\/span>/);
 }
});

test('initial mobile category count follows colour and search but not the chosen subcategory',()=>{
 const item=(id,name,subcategory)=>({id,name,category:'Stoler',subcategory,active:true,stock:4,maxQuantity:4,material:'Stoff',price:100,weekPrice:400,monthPrice:900,rentalEnabled:true,purposesExplicit:true,purposes:['messe']});
 const products=[item('green-chair','Spisestol grønn','Spisestoler'),item('green-lounge','Lenestol grønn','Loungestoler'),item('beige-chair','Spisestol beige','Spisestoler')];
 configureSiteSettings(data.settings);
 const params=new URLSearchParams({bruk:'messe',kategori:'Stoler',underkategori:'Spisestoler',farge:'gronn'});
 let model=pageModel('/utvalg.html',params,products),html=renderSeo(source,model,products,true,data.settings);
 assert.equal(mobileCategoryLabel(html),'Stoler (2)');
 assert.match(html,/>1 produkt<\/p>/);
 params.set('sok','Spisestol');model=pageModel('/utvalg.html',params,products);html=renderSeo(source,model,products,true,data.settings);
 assert.equal(mobileCategoryLabel(html),'Stoler (1)');
 params.set('sok','ingen-treff');model=pageModel('/utvalg.html',params,products);html=renderSeo(source,model,products,true,data.settings);
 assert.equal(mobileCategoryLabel(html),'Stoler (0)');
});

test('initial mobile label preserves custom category text as escaped text and retains the arrow',()=>{
 const customSettings=configureSiteSettings({...data.settings,categories:[...data.settings.categories,{id:'kategori_test',label:'Plater & "lys"',subcategories:[]}]});
 try{
  const products=[{id:'custom-board',name:'Plate beige',category:'kategori_test',active:true,stock:1,maxQuantity:1,material:'Tre',price:100,weekPrice:400,monthPrice:900,rentalEnabled:true}];
  const model=pageModel('/utvalg.html',new URLSearchParams({bruk:'alle',kategori:'kategori_test'}),products),html=renderSeo(source,model,products,true,customSettings);
  assert.equal(mobileCategoryLabel(html),'Plater &amp; &quot;lys&quot; (1)');
  assert.match(html,/id="mobileCategoryButton"[^>]*aria-label="Velg kategori: Plater &amp; &quot;lys&quot; \(1\)"/);
  assert.match(html,/id="mobileCategoryButton"[^>]*><span>[^<]*<\/span><span aria-hidden="true">⌄<\/span>/);
  assert.doesNotMatch(mobileCategoryLabel(html),/&amp;amp;/);
 }finally{configureSiteSettings(data.settings);}
});

 test('empty results expose recovery actions before JavaScript without duplicate custom cards',()=>{
  const model=pageModel('/utvalg.html',new URLSearchParams({bruk:'messe',kategori:'Stoler',sok:'no-match-xyz'}),data.products);
  const html=renderSeo(source,model,data.products,true,data.settings);
  assert.match(html,/<div id="empty" class="catalog-empty">/);
  assert.match(html,/id="showAllFurniture">Nullstill filtre/);
  assert.match(html,/data-catalog-custom>Fortell oss hva du trenger/);
  assert.doesNotMatch(html,/class="custom-package-card custom-product-card"/);
 });
