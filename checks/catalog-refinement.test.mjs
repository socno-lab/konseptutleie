import test from 'node:test';
import assert from 'node:assert/strict';
import {productColors,matchesColor,normalizeRefinement,readRefinement,writeRefinement,rentalComparisonPrice,sortRentalCards,sortSaleProducts} from '../public/catalog-refinement-model.js';
import {catalogRefinementsMarkup} from '../public/catalog-refinements.js';
import {rentalCatalogView} from '../public/rental-catalog-view.js';
import {saleCatalogView} from '../public/sale-catalog-view.js';
import {catalogFilters,rentalSubcategoryCounts} from '../public/catalog-filters.js';
import {defaultSettings,configureSiteSettings} from '../public/site-settings.js?v=fest20261114';
import {pageModel,renderSeo} from '../server/seo.mjs';
import {readHtmlTemplate} from '../server/html-templates.mjs';
const settings=configureSiteSettings(defaultSettings);
const item=(id,name,extra={})=>({id,name,category:'Stoler',subcategory:'Spisestoler',active:true,stock:4,maxQuantity:4,material:'Stoff',color:'#b5ad99',price:100,weekPrice:400,monthPrice:900,rentalEnabled:true,saleEnabled:true,salePrice:1500,purposesExplicit:true,purposes:['messe'],...extra});
const ids=cards=>cards.map(c=>c.product?.id||c.id);

test('colour search uses actual named colours and ignores illustration fallback hex values',()=>{
 assert.deepEqual(productColors(item('a','Stol',{color:'#00ff00',swatchColor:'#ff0000',material:'FSC-sertifisert eik og stål'})),[]);
 assert.deepEqual(productColors(item('b','Hübsch Stilt barstol, sand',{material:'Sand / natur · FSC-sertifisert eik og jern'})),['beige','natur']);
 assert.deepEqual(productColors(item('c','Bord',{variantLabel:'Lys grønn'})),['gronn']);
 assert.deepEqual(productColors(item('d','Lenestol grått stoff, mørk blå')) ,['gra','bla']);
 assert.deepEqual(productColors(item('e','Belysning, matt sort',{material:'Brass / nickel'})),['svart','gull','solv']);
 assert.equal(matchesColor(item('f','Naturvitenskap bok'),'natur'),false);
 assert.equal(matchesColor(item('g','Stol brunert'),'brun'),true);
});
test('one selector choice uses bounded state, clears the other mode and preserves unrelated URL state',()=>{
 assert.deepEqual(normalizeRefinement({color:'<script>',sort:'constructor',period:'all'}),{color:'',sort:'default',period:'day'});
 const params=new URLSearchParams('bruk=messe&kategori=Stoler&sok=stol&farge=beige&sortering=price-desc&periode=month');
 assert.deepEqual(readRefinement(params),{color:'beige',sort:'default',period:'day'});
 writeRefinement(params,{color:'gronn',sort:'price-asc',period:'week'});
 assert.equal(params.get('bruk'),'messe');assert.equal(params.get('kategori'),'Stoler');assert.equal(params.get('sok'),'stol');
 assert.equal(params.get('farge'),'gronn');assert.equal(params.has('sortering'),false);assert.equal(params.has('periode'),false);
 writeRefinement(params,{sort:'price-asc',period:'day'});assert.equal(params.has('farge'),false);assert.equal(params.get('sortering'),'price-asc');
 const legacy=new URLSearchParams('sortering=price-desc&periode=month');assert.deepEqual(readRefinement(legacy),{color:'',sort:'price-desc',period:'month'});
 writeRefinement(params,normalizeRefinement());assert.equal(params.has('farge'),false);assert.equal(params.has('sortering'),false);assert.equal(params.has('periode'),false);
 writeRefinement(params,{sort:'price-desc',period:'month'},{sale:true});assert.equal(params.has('periode'),false);
});
test('rental sort compares the chosen tariff, preserves ties, and places unknowns last in either direction',()=>{
 const cards=[{product:item('first','Først',{price:40,weekPrice:200})},{product:item('tie','Lik',{price:40,weekPrice:180})},{product:item('cheap','Billigst',{price:10,weekPrice:250})},{product:item('quote','Tilbud',{price:0,priceOnRequest:true})},{product:item('fixed','Sesong',{price:5,rentalPricingMode:'fixed'})},{product:item('period','30 dager',{price:90,rentalPricingMode:'period'})}];
 assert.deepEqual(ids(sortRentalCards(cards,{sort:'price-asc',period:'day'})),['cheap','first','tie','quote','fixed','period']);
 assert.deepEqual(ids(sortRentalCards(cards,{sort:'price-desc',period:'week'})),['cheap','first','tie','quote','fixed','period']);
 assert.deepEqual(ids(sortRentalCards(cards,{sort:'price-asc',period:'month'})),['period','first','tie','cheap','quote','fixed']);
 assert.equal(sortRentalCards(cards,{sort:'default'}),cards);
 assert.equal(sortRentalCards(cards,{sort:'price-asc',confirmed:false}),cards);
 assert.equal(rentalComparisonPrice({price:20},'week'),100);
 assert.equal(rentalComparisonPrice({price:20},'month'),300);
 assert.equal(rentalComparisonPrice({price:20,weekPrice:Infinity},'week'),null);
});
test('displayed sofa total or per-module price controls ordering, never the first hidden module',()=>{
 const cards=[{product:item('sofa','Sofa',{price:10}),comparisonProduct:{price:500,weekPrice:1500,monthPrice:3000}},{product:item('ordinary','Stol',{price:100})},{product:item('unconfigured','Velg sofa',{price:1}),comparisonProduct:null}];
 assert.deepEqual(ids(sortRentalCards(cards,{sort:'price-asc'})),['ordinary','sofa','unconfigured']);
 assert.deepEqual(ids(sortRentalCards(cards,{sort:'price-desc'})),['sofa','ordinary','unconfigured']);
});
test('purchase sorting uses displayed sale price and leaves quote-only products last',()=>{
 const products=[item('a','A',{salePrice:800}),item('b','B',{salePrice:200}),item('c','C',{salePrice:null,purchaseUnitPrice:null})];
 assert.deepEqual(ids(sortSaleProducts(products,{sort:'price-asc'})),['b','a','c']);
 assert.deepEqual(ids(sortSaleProducts(products,{sort:'price-desc'})),['a','b','c']);
});
const products=[item('beige','Stol beige',{weekPrice:700}),item('green','Stol grønn',{weekPrice:300}),item('other','Lenestol grønn',{subcategory:'Loungestoler'}),item('lamp-white','Lampe hvit',{category:'Belysning',variantGroup:'Lampe',variantLabel:'Hvit',variantOrder:1}),item('lamp-green','Lampe grønn',{category:'Belysning',variantGroup:'Lampe',variantLabel:'Grønn',variantOrder:2}),item('addon','Pute grønn',{addonOnly:true})];
test('colour selects the matching grouped variant and combines with category, search and counts',()=>{
 const refinement={color:'gronn',sort:'price-asc',period:'week'};
 const view=rentalCatalogView({products,settings,filter:'Alle',purpose:'messe',refinement,rentalScopeConfirmed:true});
 assert.deepEqual(new Set(ids(view.orderedCards)),new Set(['green','other','lamp-green']));
 assert.deepEqual(ids(view.orderedCards),ids(rentalCatalogView({products,settings,filter:'Alle',purpose:'messe',refinement:{color:'gronn'},rentalScopeConfirmed:true}).orderedCards));
 assert.equal(view.cards.some(c=>c.product.id==='lamp-white'),false);
 const filtered=rentalCatalogView({products,settings,filter:'Stoler',purpose:'messe',query:'stol',tableFilter:'Spisestoler',refinement,rentalScopeConfirmed:true});
 assert.deepEqual(ids(filtered.orderedCards),['green']);
 const counts=catalogFilters(products,settings,'Stoler','messe','',refinement);
 assert.match(counts,/data-filter="Stoler"[^>]*>Stoler <span[^>]*>\(2\)/);
 assert.match(counts,/data-filter="Belysning"[^>]*>Belysning <span[^>]*>\(1\)/);
 assert.deepEqual(rentalSubcategoryCounts(products,settings,'messe','Stoler','',['Spisestoler','Loungestoler'],refinement),{'':2,Spisestoler:1,Loungestoler:1});
 const sale=saleCatalogView({products,refinement});
 assert.equal(sale.shown.some(p=>p.id==='lamp-white'),false);assert.equal(sale.shown.some(p=>p.id==='lamp-green'),true);
 assert.match(sale.renderItem(sale.shown[0],0),/farge%3Dgronn/);assert.doesNotMatch(sale.renderItem(sale.shown[0],0),/sortering%3Dprice-asc/);
});
test('SSR shows one dropdown with price choices before colours and preserves the selected colour',async()=>{
 for(const path of ['/utvalg.html','/kjop.html']){
  const params=new URLSearchParams({bruk:'messe',prisbruk:'messe',farge:'gronn',sortering:'price-asc',periode:'week',kategori:'Stoler'});
  const model=pageModel(path,params,products),source=await readHtmlTemplate(path.slice(1)),html=renderSeo(source,model,products,true,settings);
  const markup=html.match(/<div id="(?:rental|sale)Refinements"[\s\S]*?<\/div>/)?.[0]||'';
  assert.equal((markup.match(/<select\b/g)||[]).length,1);
  assert.match(markup,/data-refinement="choice"/);assert.doesNotMatch(markup,/data-refinement="(?:color|period|sort)"/);
  assert.match(markup,/<option value="color:gronn" selected>/);assert.match(markup,/<optgroup label="Farge">/);
  assert.ok(markup.indexOf('value="price-asc"')<markup.indexOf('value="price-desc"'));
  assert.ok(markup.indexOf('value="price-desc"')<markup.indexOf('<optgroup label="Farge">'));
  assert.doesNotMatch(html,/data-(?:detail|product)="beige"/);
  assert.equal((html.match(/id="(?:rental|sale)Refinements"/g)||[]).length,1);
 }
});
test('unconfirmed rental scope disables price choices but leaves colour filtering available',()=>{
 const markup=catalogRefinementsMarkup({state:{color:'gronn'},products,confirmed:false});
 assert.doesNotMatch(markup,/<select[^>]*disabled/);
 assert.match(markup,/<optgroup label="Pris" disabled><option value="price-asc">[^<]*<\/option><option value="price-desc">[^<]*<\/option><\/optgroup>/);
 assert.doesNotMatch(markup,/<optgroup label="Farge"[^>]*disabled/);
 assert.match(markup,/<option value="color:gronn" selected>/);
 assert.doesNotMatch(markup,/<option value="color:gronn"[^>]*disabled/);
 const sale=catalogRefinementsMarkup({state:{sort:'price-desc'},products,sale:true});assert.equal((sale.match(/<select\b/g)||[]).length,1);assert.doesNotMatch(sale,/disabled/);
});
