import test from 'node:test';
import assert from 'node:assert/strict';
import {readHtmlTemplate} from '../server/html-templates.mjs';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {defaultSettings,configureSiteSettings} from '../public/site-settings.js';
import {publicCatalog} from '../app-server.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
import {rentalCatalogView} from '../public/rental-catalog-view.js';
import {applyRentalScope} from '../public/rental-pricing-model.js';
import {renderCatalogCard,readInitialCatalog} from '../public/catalog-card-markup.js';
import {renderArrowIcons} from '../server/arrow-icons.mjs';
const source=await readHtmlTemplate('utvalg.html');
const store=await memoryStore(),data=publicCatalog({...await store.readCatalog(),settings:defaultSettings});

test('HTML contains the exact initial card batch and counts, with remaining cards deferred',()=>{
 configureSiteSettings(data.settings);
 for(const purpose of ['alle','messe','fest','jul','bedrift','boligsalg'])for(const filter of ['Alle','Enkeltprodukter','Stoler','Bord','Sofaer','Pakker'])for(const query of ['','bord','no-match-xyz']){
  const params=new URLSearchParams({bruk:purpose,kategori:filter,sok:query,prisbruk:'messe'}),model=pageModel('/utvalg.html',params,data.products);
  const effectiveFilter=purpose==='boligsalg'&&filter==='Pakker'?'Enkeltprodukter':filter;
  const view=rentalCatalogView({products:applyRentalScope(data.products.filter(p=>p.rentalEnabled!==false),model.catalogUsage.scope),settings:data.settings,purpose,filter:effectiveFilter,query,rentalScopeConfirmed:true});
  const html=renderSeo(source,model,data.products,true,data.settings),count=Math.min(view.count,view.tailHtml?23:24);
  assert.ok(html.includes('>'+view.desktopCount+'</p>'));
  assert.ok(html.includes('>'+view.mobileCount+'</p>'));
  assert.equal((html.match(/data-catalog-render=/g)||[]).length,count);
  assert.equal((html.match(/class="header-favorite-toggle card-favorite-toggle"/g)||[]).length,count);
  assert.ok(html.includes(renderArrowIcons(view.orderedCards.slice(0,count).map(renderCatalogCard).join(''))));
  assert.equal((html.match(/id="rentalTableTypes"/g)||[]).length,1);
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
