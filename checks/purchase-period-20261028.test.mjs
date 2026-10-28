import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {purchaseProductText} from '../public/purchase-copy.js';
import {productPeriodState,periodChangeNotice} from '../public/product-rental-period.js';
import {detailSelectionPrices} from '../public/detail-price-model.js';
import {rentalEstimate} from '../public/catalog-model.js';
import {applyRentalScope} from '../public/rental-pricing-model.js';
import {pageModel,renderSeo,productContent} from '../server/seo.mjs';
const options={today:'2026-10-28'};

test('shared storefront scripts use one customer-information instance and purchase submit copy',()=>{
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),shop=readFileSync(new URL('../public/shop.js',import.meta.url),'utf8'),feedback=readFileSync(new URL('../public/storefront-feedback.js',import.meta.url),'utf8');
 for(const source of [app,shop,feedback])assert.match(source,/customer-info\.js\?v=period20261028e/);
 for(const source of [app,shop])assert.match(source,/submission-ui\.js\?v=copy20261028/);
 assert.match(readFileSync(new URL('../public/submission-ui.js',import.meta.url),'utf8'),/Send kjøpsforespørsel/);
 assert.match(readFileSync(new URL('../public/mobile-rental-dates.js',import.meta.url),'utf8'),/rentalDatesMounted/);
});

test('shared purchase copy hides rental-only sentences without changing source',()=>{
 const text='Hvitt spisebord. Duk inkludert ved leie. Bredde 120 cm.';
 assert.equal(purchaseProductText(text),'Hvitt spisebord. Bredde 120 cm.');
 assert.match(text,/Duk inkludert ved leie/);
 assert.equal(purchaseProductText('Metall · Duk inkludert ved leie'),'Metall');
 assert.equal(purchaseProductText('Bord. Brukes til boligstyling. Ø 120 cm.'),'Bord. Ø 120 cm.');
});
test('missing, partial, past, reversed, impossible and excessive date ranges have no total',()=>{
 for(const [start,end] of [['',''],['2026-11-01',''],['2026-10-01','2026-10-02'],['2026-11-05','2026-11-01'],['2026-02-30','2026-03-02'],['2026-11-01','2028-11-01']]){const state=productPeriodState(start,end,options);assert.equal(state.days,null);assert.ok(state.message);}
 assert.equal(productPeriodState('2026-11-01','2026-11-01',options).days,1);
});
test('period impact is explicit only when a changed period affects existing rental items',()=>{
 assert.match(periodChangeNotice('2026-11-02','2026-11-04','2026-11-01','2026-11-03',true),/alle leievarer/);
 assert.equal(periodChangeNotice('a','b','a','b',true),'');
 assert.equal(periodChangeNotice('a','b','','',false),'');
});
test('product and cart prices match for both scopes, quantities, addons and period boundaries',()=>{
 const main={id:'main',active:true,rentalRates:{standard:{price:100,weekPrice:400,monthPrice:1000,stylingContinuation:true},messe:{price:150,weekPrice:600,monthPrice:1800}}};
 const extra={id:'extra',active:true,rentalPricingMode:'period',price:400};
 for(const scope of ['standard','messe'])for(const quantity of [1,2,3])for(const extraCount of [0,1,2])for(const end of ['2026-11-01','2026-11-07','2026-11-30','2026-12-01','2026-12-31']){
  const products=applyRentalScope([main,extra],scope),days=productPeriodState('2026-11-01',end,options).days;
  const detail=detailSelectionPrices(products[0],quantity,extraCount?{extra:extraCount}:{},products,days);
  const cart=rentalEstimate({main:quantity,...(extraCount?{extra:extraCount}:{})},products,'2026-11-01',end);
  assert.equal(detail.selectedTotal,cart.total,scope+' '+quantity+' '+extraCount+' '+end);
 }
});
test('purchase FAQ and noscript product do not contain rental inclusions; rental stays intact',()=>{
 const p={id:'test',name:'TEST',active:true,saleEnabled:true,isExample:false,salePrice:100,category:'Bord',description:'Bord. Duk inkludert ved leie.',price:100};
 const template=readFileSync(new URL('../public/kjop.html',import.meta.url),'utf8');
 const buy=renderSeo(template,pageModel('/kjop.html',new URLSearchParams(),[p]),[p],false);
 assert.match(buy,/Hvordan sender jeg en kjøpsforespørsel/);assert.doesNotMatch(buy,/Hvordan leier jeg møbler|hente og returnere|send oss bestillingen/);
 assert.doesNotMatch(productContent(pageModel('/kjopsprodukt.html',new URLSearchParams('produkt=test'),[p]),[p]),/Duk inkludert ved leie/);
 assert.match(productContent(pageModel('/leieprodukt.html',new URLSearchParams('produkt=test'),[p]),[p]),/Duk inkludert ved leie/);
});
