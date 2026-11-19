import test from 'node:test';
import assert from 'node:assert/strict';
import {proposedCatalogUsage,catalogUsageLabel} from '../public/catalog-usage-model.js?v=stockmobile20261107';
import {purposes} from '../public/rental-purpose-model.js?v=stockmobile20261107';
import {applyRentalScope,rentalRateSets} from '../public/rental-pricing-model.js?v=stockmobile20261107';
import {rentalEstimate} from '../public/catalog-model.js';
import {catalogUsageMarkup} from '../public/catalog-usage-markup.js?v=fest20261114';
import {mountCatalogUsage} from '../public/catalog-usage.js?v=confirm20261116';
import {pricePickerContent} from '../public/price-display-markup.js?v=picker20261119';

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
 const {catalogUsageMarkup}=await import('../public/catalog-usage-markup.js?v=stockmobile20261107');
 const source=await readHtmlTemplate('utvalg.html');
 const products=[{id:'chair',name:'Stol',category:'Stoler',active:true},{id:'package',name:'Pakke',category:'Pakker',isPackage:true,active:true}];
 for(const purpose of purposes)for(const category of ['Alle','Stoler','Pakker'])for(const scope of [null,'standard','messe']){
  const params=new URLSearchParams({bruk:purpose.id,kategori:category});if(scope)params.set('prisbruk',scope);
  const model=pageModel('/utvalg.html',params,products),html=renderSeo(source,model,products,true);
  assert.ok(html.includes('<section id="catalogUsage" class="catalog-usage has-price-display" aria-labelledby="catalogUsageHeading">'+catalogUsageMarkup(model.catalogUsage)+'</section>'));
  const usage=html.match(/<section id="catalogUsage"[^>]*>([\s\S]*?)<\/section>/)?.[1];
  assert.equal((usage.match(/class="price-display-picker"/g)||[]).length,1,'the initial HTML already has exactly one VAT picker');
  assert.equal((usage.match(/class="mobile-price-switch"/g)||[]).length,1,'the initial HTML already has exactly one mobile VAT switch');
  const expected=purpose.id==='alle'?scope==='standard'?'Boligfoto og visning':scope==='messe'?'Arrangementer og annen bruk':'Velg prisgrunnlag':purpose.label;
  assert.ok(catalogUsageLabel(model.catalogUsage).includes(expected));
  assert.ok(html.indexOf('id="catalogUsageButton"')<html.indexOf('class="catalog-tools"'));
 }
 const unknown=pageModel('/utvalg.html',new URLSearchParams({bruk:'<script>',prisbruk:'invalid'}),products);
 assert.equal(unknown.catalogUsage.purpose,'alle');assert.equal(unknown.catalogUsage.confirmed,false);
});

test('initial desktop picker and mobile switch keep approved labels with the correct purpose default',()=>{
 for(const purpose of purposes){
  const mode=['messe','event','bedrift','produksjon'].includes(purpose.id)?'excl':'incl';
  const html=catalogUsageMarkup({purpose:purpose.id,scope:purpose.id==='boligsalg'?'standard':'messe',confirmed:true});
  assert.ok(html.endsWith('<div class="price-display-picker" role="group" aria-label="Vis priser">'+pricePickerContent(mode)+'</div>'));
  assert.equal((html.match(/data-price-mode="incl"/g)||[]).length,1);
  assert.equal((html.match(/data-price-mode="excl"/g)||[]).length,1);
  assert.match(html,new RegExp('data-price-mode="incl" aria-pressed="'+(mode==='incl')+'">Inkl\\. mva\\.</button>'));
  assert.match(html,new RegExp('data-price-mode="excl" aria-pressed="'+(mode==='excl')+'">Ekskl\\. mva\\.</button>'));
  assert.ok(html.includes('<p id="catalogUsageHelp">Utvalg og leiepriser tilpasses bruksområdet. Alle priser inkluderer mva. <button type="button" class="mobile-price-switch">'+(mode==='incl'?'Vis priser ekskl. mva.':'Vis priser inkl. mva.')+'</button></p>'),'the mobile switch is in the initial help text and names the opposite display mode');
 }
 assert.match(catalogUsageMarkup(),/class="mobile-price-switch">Vis priser ekskl\. mva\.<\/button>/);
});

test('mount preserves the SSR picker and layout classes, and supplies the same picker for an empty host',()=>{
 const originalDocument=globalThis.document;
 try{
  const dialogs=[];
  globalThis.document={createElement:()=>({setAttribute(){},addEventListener(){}}),body:{append:dialog=>dialogs.push(dialog)}};
  for(const firstPaint of [true,false]){
   const current={currentPurpose:'bedrift',currentScope:'messe',confirmed:true};
   const label={textContent:''},button={querySelector:()=>label},vatButton={querySelector:()=>({textContent:''})};
   const initial=catalogUsageMarkup({purpose:current.currentPurpose,scope:current.currentScope,confirmed:true});
   let contents=firstPaint?initial:'',classes='catalog-usage has-price-display extra-layout',replacements=0;
   const transitions=[];
   const host={
    get className(){return classes;},set className(value){classes=value;transitions.push(value);},
    get innerHTML(){return contents;},set innerHTML(value){contents=value;replacements++;},
    querySelector(selector){return selector==='#catalogUsageButton'&&contents.includes('id="catalogUsageButton"')?button:selector==='button'?vatButton:null;}
   };
   host.classList={add:(...tokens)=>{host.className=[...new Set([...classes.split(' '),...tokens])].join(' ');}};
   const mounted=mountCatalogUsage(host,{state:()=>current,apply(){}});
   assert.ok(transitions.every(value=>['catalog-usage','has-price-display','extra-layout'].every(token=>value.split(' ').includes(token))),'mount must never strip the first-paint layout classes');
   assert.equal(contents,initial,'existing first-paint nodes are retained and fallback markup is identical');
   assert.equal(replacements,firstPaint?0:1);
   assert.equal((contents.match(/class="price-display-picker"/g)||[]).length,1);
   assert.equal((contents.match(/class="mobile-price-switch"/g)||[]).length,1);
   assert.match(contents,/class="mobile-price-switch">Vis priser inkl\. mva\.<\/button>/);
   assert.equal(mounted.button,button);
   assert.equal(typeof button.onclick,'function');
   assert.equal(vatButton.onclick,undefined,'the usage dialog is bound only to its own button');
   assert.equal(label.textContent,catalogUsageLabel({purpose:'bedrift',scope:'messe',confirmed:true}));
  }
  assert.equal(dialogs.length,2);
 }finally{
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
 }
});
