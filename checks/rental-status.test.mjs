import test from 'node:test';
import assert from 'node:assert/strict';
import {isRentedOut,rentalGroupRentedOut,rentalSeriesRentedOut,rentalStatusBadge,rentalStatusNotice} from '../public/rental-status.js';
import {remaining,normalizeBasket,moduleConfiguration,rentalEstimate} from '../public/catalog-model.js';
import {applyRentalScope} from '../public/rental-pricing-model.js';
import {saleEstimate} from '../public/sales-model.js';
import {recommendProducts} from '../public/recommendation-model.js';
import {renderRecommendations} from '../public/product-recommendations.js';
import {readHtmlTemplate} from '../server/html-templates.mjs';

const product=(id,extra={})=>({id,name:'Syntetisk loungestol '+id,category:'Stoler',active:true,rentalEnabled:true,saleEnabled:true,salePrice:2500,stock:4,unavailable:1,price:100,weekPrice:400,monthPrice:1200,image:'/assets/synthetic.webp',purposesExplicit:true,purposes:['boligsalg','messe'],...extra});
const senzo=()=>[
 product('base',{category:'Sofaer',moduleSeries:'Senzo',moduleRole:'base',moduleRequired:true,moduleWidth:220,stock:1,unavailable:0}),
 product('middle',{category:'Sofaer',moduleSeries:'Senzo',moduleRole:'middle',moduleWidth:81,stock:2,unavailable:0})
];

test('only an explicit editorial flag on a visible rental product displays the status',()=>{
 for(const rentalRentedOut of [undefined,false,'true',1,null])assert.equal(isRentedOut(product('a',{rentalRentedOut})),false);
 assert.equal(isRentedOut(product('a',{rentalRentedOut:true,stock:99,unavailable:0})),true);
 assert.equal(isRentedOut(product('a',{stock:0,unavailable:0})),false,'stock exhaustion does not create the editorial badge');
 for(const hidden of [{active:false},{deletedAt:'2026-10-29'},{rentalEnabled:false}])assert.equal(isRentedOut(product('a',{rentalRentedOut:true,...hidden})),false);
});

test('interchangeable variants remain unmarked while a displayed rental alternative is unmarked',()=>{
 const flagged=product('beige',{rentalRentedOut:true}),available=product('black');
 assert.equal(rentalGroupRentedOut([flagged,available]),false);
 assert.equal(rentalGroupRentedOut([flagged,{...available,rentalRentedOut:true}]),true);
 assert.equal(rentalGroupRentedOut([flagged,{...available,rentalEnabled:false}]),true);
 assert.equal(rentalGroupRentedOut([flagged,{...available,active:false}]),true);
 assert.equal(rentalGroupRentedOut([]),false);
 assert.equal(rentalGroupRentedOut([{...flagged,deletedAt:'2026-10-29'}]),false);
});

test('Senzo required base marks the whole sofa independently of product ordering',()=>{
 const [base,middle]=senzo();
 assert.equal(rentalSeriesRentedOut([{...middle,rentalRentedOut:true},base]),false,'optional middle alone must not mark the family');
 assert.equal(rentalSeriesRentedOut([middle,{...base,rentalRentedOut:true}]),true);
 assert.equal(rentalSeriesRentedOut([{...base,rentalRentedOut:true},middle]),true);
 const left={...base,id:'left',moduleRole:'left'},right={...base,id:'right',moduleRole:'right',rentalRentedOut:true};
 assert.equal(rentalSeriesRentedOut([left,right,middle]),true,'either required end marks a sofa that requires both');
});

test('builder status follows the selected modules and does not change the selection',()=>{
 const [base,middle]=senzo(),modules=Object.freeze([Object.freeze(base),Object.freeze({...middle,rentalRentedOut:true})]);
 const selection=Object.freeze({base:1,middle:0});
 assert.equal(rentalSeriesRentedOut(modules,selection),false);
 assert.equal(rentalSeriesRentedOut(modules,Object.freeze({base:1,middle:1})),true);
 assert.deepEqual(selection,{base:1,middle:0});
});

test('a module family with no required components needs all rental options marked',()=>{
 const one=product('one',{moduleRole:'middle',rentalRentedOut:true}),two=product('two',{moduleRole:'middle'});
 assert.equal(rentalSeriesRentedOut([one,two]),false);
 assert.equal(rentalSeriesRentedOut([one,{...two,rentalRentedOut:true}]),true);
 assert.equal(rentalSeriesRentedOut([one,two],{one:1}),true);
 assert.equal(rentalSeriesRentedOut([one,two],{two:1}),false);
});

test('manual rental status leaves inventory, normalization, rental prices and sales estimates unchanged',()=>{
 const products=senzo().map(p=>({...p,rentalRates:{standard:{price:100,weekPrice:400,monthPrice:1200},messe:{price:200,weekPrice:800,monthPrice:2400}}}));
 const marked=products.map(p=>({...p,rentalRentedOut:true})),basket={base:1,middle:1};
 for(const p of products)assert.equal(remaining(p.id,{middle:1},marked),remaining(p.id,{middle:1},products));
 assert.deepEqual(normalizeBasket(basket,marked),normalizeBasket(basket,products));
 for(const scope of ['standard','messe']){
  const normal=applyRentalScope(products,scope),flagged=applyRentalScope(marked,scope);
  for(const [start,end] of [['2026-11-01','2026-11-01'],['2026-11-01','2026-11-07'],['2026-11-01','2026-12-31']])assert.deepEqual(rentalEstimate(basket,flagged,start,end),rentalEstimate(basket,normal,start,end));
  const {modules:originalModules,...original}=moduleConfiguration('Senzo',basket,{},normal);
  const {modules:markedModules,...actual}=moduleConfiguration('Senzo',basket,{},flagged);
  assert.equal(original.valid,true);assert.deepEqual(actual,original);
 }
 assert.deepEqual(saleEstimate(basket,marked),saleEstimate(basket,products));
});

test('the editorial flag does not filter or reorder rental alternatives',()=>{
 const current=product('current',{rentalAlternatives:['b','a']}),a=product('a'),b=product('b');
 const products=[current,a,b],marked=[current,{...a,rentalRentedOut:true},{...b,rentalRentedOut:true}];
 assert.deepEqual(recommendProducts(current,marked,'rent').map(p=>p.id),recommendProducts(current,products,'rent').map(p=>p.id));
});

test('rental recommendation images show the label while purchase rendering stays identical',()=>{
 const current=product('current',{rentalAlternatives:['other'],recommendedProducts:['other']}),other=product('other');
 const render=(products,mode)=>{const section={hidden:false,innerHTML:''};renderRecommendations({querySelector:()=>section},current,products,mode,{prisbruk:'standard'},id=>'/synthetic/'+id);return section.innerHTML;};
 const plain=[current,other],marked=[current,{...other,rentalRentedOut:true}];
 assert.match(render(marked,'rent'),/class="rental-status-badge"[^>]*>UTLEID/);
 assert.doesNotMatch(render(plain,'rent'),/UTLEID/);
 assert.equal(render(marked,'buy'),render(plain,'buy'));
 assert.doesNotMatch(render(marked,'buy'),/UTLEID|rental-status/);
});

test('status copy confirms availability for the requested period without promising reservation',()=>{
 assert.equal(rentalStatusBadge(false),'');assert.equal(rentalStatusNotice(false),'');
 assert.match(rentalStatusBadge(true),/>UTLEID</);
 assert.match(rentalStatusBadge(true),/ønsket periode må bekreftes/);
 assert.match(rentalStatusNotice(true),/ønsket leieperiode må bekreftes i tilbudet/);
});

test('only rental page templates load the overlay stylesheet',async()=>{
 for(const name of ['index.html','utvalg.html','anledning.html','leieprodukt.html'])assert.match(await readHtmlTemplate(name),/rental-status\.css\?v=rented20261029b/);
 for(const name of ['kjop.html','kjopsprodukt.html','kundeinfo.html'])assert.doesNotMatch(await readHtmlTemplate(name),/rental-status\.css/);
});
