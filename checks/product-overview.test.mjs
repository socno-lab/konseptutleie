import test from 'node:test';import assert from 'node:assert/strict';
import {productOverview} from '../server/product-overview.mjs';
import {productSummary,productUnitPrice} from '../public/product-summary.js?v=stockmobile20261107';
import {initialProductCarousel,productCarouselContent} from '../public/product-carousel-markup.js';
const product={id:'chair',active:true,isExample:false,name:'Stol <ett>',category:'Stoler',material:'Eik',image:'/media/12345678901234567890123456789012',rentalRates:{standard:{price:100,weekPrice:300,monthPrice:500,stylingContinuation:true},messe:{price:150,weekPrice:450,monthPrice:800}},saleEnabled:true,salePrice:3949};
test('first HTML has visible product image, name and the selected rental rates without a catalogue fetch',()=>{
 const html=productOverview({product,buy:false,productUsage:{scope:'messe',confirmed:true}},[product],{});
 const visible=html.split('<template')[0];
 assert.match(visible,/<h1>Stol &lt;ett&gt;<\/h1>/);assert.match(visible,/loading="eager" fetchpriority="high"/);
 assert.match(visible,/150\s+kr/);assert.match(visible,/450\s+kr/);assert.doesNotMatch(visible,/100\s+kr/);
 assert.match(html,/id="initialProductPrice-standard"/);assert.match(html,/100\s+kr/);
 const summary=productSummary({...product,...product.rentalRates.messe},[product],{confirmed:true});assert.ok(visible.includes(summary));
});
test('unknown usage does not expose the default rate as a confirmed rental price',()=>{
 const html=productOverview({product,buy:false,productUsage:{scope:'messe',confirmed:false}},[product],{}).split('<template')[0];
 assert.match(html,/Velg bruk for å se leiepris/);assert.doesNotMatch(html,/150 kr|100 kr/);
});
test('unit prices distinguish fixed periods, unpriced products and module configuration totals',()=>{
 assert.match(productUnitPrice({...product,price:500,rentalPricingMode:'period'}),/påbegynte 30 dager/);
 assert.match(productUnitPrice({...product,price:500,rentalPricingMode:'fixed',servicePeriod:'Sesong'}),/fastpris/);
 assert.match(productUnitPrice({...product,price:500,priceOnRequest:true}),/Pris på forespørsel/);
 assert.match(productUnitPrice({...product,moduleSeries:'Modulsofa',price:500}),/Velg oppsett/);
 assert.doesNotMatch(productUnitPrice({...product,moduleSeries:'Modulsofa',price:500}),/500 kr/);
});
test('purchase HTML uses the sale price and filters rental wording from the material description',()=>{
 const p={...product,material:'Massiv eik. Returneres etter leie.'};
 const html=productOverview({product:p,buy:true},[p],{});
 assert.match(html,/3\s949(?:,00)?\s(?:kr|NOK)/);assert.match(html,/Massiv eik/);assert.doesNotMatch(html,/Returneres/);
 assert.ok(html.includes(productSummary(p,[p],{buy:true})));assert.doesNotMatch(html,/initialProductPrice-standard/);
});

test('purchase module first view keeps the same deduplicated gallery and carousel row as the live builder',()=>{
 const p={...product,moduleSeries:'Testsofa',moduleRole:'middle',moduleWidth:80,gallery:[product.image,'/assets/side.jpg','/assets/back.jpg','/assets/side.jpg']};
 const rentalOnly={...p,id:'rent-only',name:'Bare til leie',saleEnabled:false,moduleRequired:true,image:'/assets/rental-only.jpg'};
 const html=productOverview({product:p,buy:true},[p,rentalOnly],{});
 assert.match(html,/class="initial-product-image initial-sale-module sale-image-stage has-gallery"><div class="sale-module-preview">/);
 assert.ok(html.includes(initialProductCarousel('Valgt oppsett')));assert.ok(html.includes(productCarouselContent('Valgt oppsett')));
 assert.deepEqual([...html.matchAll(/data-photo="([^"]+)"/g)].map(m=>m[1]),[product.image,'/assets/side.jpg','/assets/back.jpg']);
 assert.doesNotMatch(html,/Bare til leie|rental-only\.jpg|Startoppsett/);
 assert.equal((html.match(/data-initial-image-controls/g)||[]).length,1);
 const rental=productOverview({product:p,buy:false},[p,rentalOnly],{});assert.doesNotMatch(rental,/data-initial-gallery|data-initial-image-controls|initial-sale-module/);
});

test('ordinary galleries reserve the final controls while a single image adds no carousel row',()=>{
 for(const buy of [false,true]){
  const single=productOverview({product,buy},[product],{});assert.doesNotMatch(single,/data-initial-image-controls|has-gallery/);
  const p={...product,gallery:['/assets/other.jpg',product.image]},multiple=productOverview({product:p,buy},[p],{});
  assert.ok(multiple.includes(initialProductCarousel('1 / 2')));assert.match(multiple,/initial-product-image has-gallery/);
 }
});
