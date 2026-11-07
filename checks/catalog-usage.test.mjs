import test from 'node:test';
import assert from 'node:assert/strict';
import {proposedCatalogUsage,catalogUsageLabel} from '../public/catalog-usage-model.js?v=content20261107';
import {purposes} from '../public/rental-purpose-model.js?v=content20261107';
import {applyRentalScope,rentalRateSets} from '../public/rental-pricing-model.js?v=content20261107';
import {rentalEstimate} from '../public/catalog-model.js';

test('Every actual assortment purpose selects its existing price basis',()=>{
 for(const purpose of purposes.filter(item=>item.id!=='alle')){
  const proposal=proposedCatalogUsage({purpose:purpose.id,scope:'standard',currentScope:'standard',confirmed:true});
  assert.equal(proposal.purpose,purpose.id);
  assert.equal(proposal.scope,purpose.id==='boligsalg'?'standard':'messe');
  assert.equal(proposal.confirmed,true);
  assert.equal(catalogUsageLabel(proposal),purpose.label);
 }
 assert.equal(proposedCatalogUsage({purpose:'event'}).purpose,'messe');
});

test('Vis alle retains either confirmed basis and keeps it visible',()=>{
 for(const scope of ['standard','messe']){
  const proposal=proposedCatalogUsage({purpose:'alle',currentScope:scope,confirmed:true,hasItems:true});
  assert.equal(proposal.scope,scope);
  assert.equal(proposal.confirmed,true);
  assert.equal(proposal.scopeChanged,false);
  assert.equal(proposal.requiresConfirmation,false);
  assert.match(catalogUsageLabel(proposal),scope==='standard'?/^Vis alle · Leiepriser: Boligfoto og visning$/:/^Vis alle · Leiepriser: Arrangementer og annen bruk$/);
 }
});

test('Vis alle without a chosen basis remains unpriced, even with an unconfirmed fallback',()=>{
 for(const input of [{},{purpose:'alle'},{purpose:'unknown'},{purpose:'alle',currentScope:'messe',confirmed:false},{purpose:'alle',scope:'unknown',currentScope:'unknown',confirmed:true}]){
  const proposal=proposedCatalogUsage(input);
  assert.equal(proposal.purpose,'alle');
  assert.equal(proposal.scope,null);
  assert.equal(proposal.confirmed,false);
  assert.equal(proposal.requiresConfirmation,false);
  assert.equal(catalogUsageLabel(proposal),'Vis alle · Leiepriser: Velg prisgrunnlag');
  assert.match(proposal.messages.join(' '),/Velg prisgrunnlag/);
 }
 assert.equal(proposedCatalogUsage({purpose:'alle',occasion:'Bedrift'}).scope,null);
});

test('Vis alle allows a deliberate basis choice in the same selector',()=>{
 const proposal=proposedCatalogUsage({purpose:'alle',scope:'standard',currentScope:'messe',confirmed:true,hasItems:true});
 assert.equal(proposal.scope,'standard');
 assert.equal(proposal.scopeChanged,true);
 assert.equal(proposal.requiresConfirmation,true);
 assert.match(proposal.messages.join(' '),/beregnes på nytt/);
 assert.match(proposal.messages.join(' '),/Produkter, antall, tilvalg og leieperiode.*beholdes/);
 assert.match(proposal.messages.join(' '),/utenfor utvalget/);
});

test('An explicit actual use reports a conflicting occasion instead of silently accepting its tariff',()=>{
 const proposal=proposedCatalogUsage({purpose:'boligsalg',currentScope:'messe',confirmed:true,occasion:'Bedrift'});
 assert.equal(proposal.scope,'standard');
 assert.equal(proposal.occasionConflict,true);
 assert.equal(proposal.requiresConfirmation,true);
 assert.match(proposal.messages.join(' '),/Anledningen.*tømmes/);
 for(const occasion of ['Boligsalg','Boligfoto og visning']){
  assert.equal(proposedCatalogUsage({purpose:'boligsalg',currentScope:'standard',confirmed:true,occasion}).occasionConflict,false);
 }
 assert.equal(proposedCatalogUsage({purpose:'fest',currentScope:'messe',confirmed:true,occasion:'Bedrift'}).occasionConflict,false);
});

test('A same-tariff assortment change preserves basket state and does not require repricing confirmation',()=>{
 const input=Object.freeze({purpose:'jul',currentScope:'messe',confirmed:true,occasion:'Bryllup og fest',hasItems:true});
 const proposal=proposedCatalogUsage(input);
 assert.equal(proposal.requiresConfirmation,false);
 assert.equal(proposal.scopeChanged,false);
 assert.equal(proposal.occasionConflict,false);
 assert.equal(input.occasion,'Bryllup og fest');
 assert.doesNotMatch(proposal.messages.join(' '),/beregnes på nytt/);
 assert.match(proposal.messages.join(' '),/beholdes/);
});

test('A proposal does not alter existing rates, synthetic basket quantities or dates',()=>{
 const products=[{id:'test-chair',active:true,stock:8,unavailable:0,purchaseUnitPrice:2000,rentalPricingMode:'retail'}];
 products[0].rentalRates=rentalRateSets(products[0],products);
 const basket=Object.freeze({'test-chair':2}),dates=Object.freeze(['2026-11-01','2026-11-03']);
 const before=rentalEstimate(basket,applyRentalScope(products,'standard'),...dates);
 const proposal=proposedCatalogUsage({purpose:'bedrift',currentScope:'standard',confirmed:true,hasItems:true});
 const after=rentalEstimate(basket,applyRentalScope(products,proposal.scope),...dates);
 assert.equal(before.total,800);
 assert.equal(after.total,1200);
 assert.equal(before.days,after.days);
 assert.equal(after.lines[0].quantity,2);
 assert.deepEqual(basket,{'test-chair':2});
 assert.deepEqual(dates,['2026-11-01','2026-11-03']);
});


test('all rental purposes and categories receive their complete usage field before client scripts',async()=>{
 const {readHtmlTemplate}=await import('../server/html-templates.mjs');
 const {pageModel,renderSeo}=await import('../server/seo.mjs');
 const {catalogUsageMarkup}=await import('../public/catalog-usage-markup.js?v=content20261107');
 const source=await readHtmlTemplate('utvalg.html');
 const products=[{id:'chair',name:'Stol',category:'Stoler',active:true},{id:'package',name:'Pakke',category:'Pakker',isPackage:true,active:true}];
 for(const purpose of purposes)for(const category of ['Alle','Stoler','Pakker'])for(const scope of [null,'standard','messe']){
  const params=new URLSearchParams({bruk:purpose.id,kategori:category});if(scope)params.set('prisbruk',scope);
  const model=pageModel('/utvalg.html',params,products),html=renderSeo(source,model,products,true);
  assert.ok(html.includes('<section id="catalogUsage" class="catalog-usage" aria-labelledby="catalogUsageHeading">'+catalogUsageMarkup(model.catalogUsage)+'</section>'));
  const expected=purpose.id==='alle'?scope==='standard'?'Boligfoto og visning':scope==='messe'?'Arrangementer og annen bruk':'Velg prisgrunnlag':purpose.label;
  assert.ok(catalogUsageLabel(model.catalogUsage).includes(expected));
  assert.ok(html.indexOf('id="catalogUsageButton"')<html.indexOf('class="catalog-tools"'));
 }
 const unknown=pageModel('/utvalg.html',new URLSearchParams({bruk:'<script>',prisbruk:'invalid'}),products);
 assert.equal(unknown.catalogUsage.purpose,'alle');assert.equal(unknown.catalogUsage.confirmed,false);
});
