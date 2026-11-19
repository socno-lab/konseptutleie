import test from 'node:test';
import assert from 'node:assert/strict';
import {productRecommendationsFirstPaint} from '../server/product-recommendations-first-paint.mjs';
import {renderRecommendations} from '../public/product-recommendations.js';
import {applyRentalScope} from '../public/rental-pricing-model.js?v=fest20261114';
import {productPageUrl} from '../public/product-page-model.js?v=launch20261024';

const product=(id,extra={})=>({id,name:'Loungestol '+id,category:'Stoler',active:true,image:'/assets/test.jpg',stock:4,unavailable:0,rentalEnabled:true,saleEnabled:true,salePrice:1000,price:100,weekPrice:500,monthPrice:1500,purposesExplicit:true,purposes:['boligsalg','messe'],...extra});
const current=product('current',{rentalAlternatives:['other'],recommendedProducts:['other']}),other=product('other',{name:'Stol <script> & "lys"',rentalRates:{standard:{price:200,weekPrice:1000,monthPrice:3000},messe:{price:300,weekPrice:1500,monthPrice:4500}}});

test('first-paint recommendations use the same scoped prices and links without replacing their DOM at startup',()=>{
 for(const buy of [false,true]){
  const mode=buy?'buy':'rent',returnTo=buy?'/kjop.html?sok=stol':'/utvalg.html?bruk=messe&kategori=Stoler';
  const markup=productRecommendationsFirstPaint({product:current,buy,productPurpose:'messe',productUsage:{scope:'messe',confirmed:true},productReturn:returnTo},[current,other],{});
  assert.match(markup,/id="productRecommendations"/);assert.match(markup,/Stol &lt;script&gt; &amp; &quot;lys&quot;/);
  assert.doesNotMatch(markup,/<script>/);
  assert.match(markup,/<svg class="icon-arrow-up-right"/);assert.doesNotMatch(markup,/↗/);
  const key=markup.match(/data-recommendation-render="([^"]+)"/)[1];let writes=0;
  const section={hidden:false,getAttribute:()=>key,set innerHTML(value){writes++;}};
  const items=buy?[current,other]:applyRentalScope([current,other],'messe');
  const context=buy?{}:{bruk:'messe',prisbruk:'messe',basket:{}};
  renderRecommendations({querySelector:()=>section},current,items,mode,context,id=>productPageUrl(id,mode,{...context,returnTo}));
  assert.equal(writes,0,'existing images, focus and VAT-adjusted text survive hydration');
  assert.equal(section.hidden,false);
 }
});

test('empty recommendations reserve no blank section and changed availability refreshes the cards',()=>{
 const markup=productRecommendationsFirstPaint({product:current,productPurpose:'messe',productUsage:{scope:'messe',confirmed:true}},[current],{});
 assert.match(markup,/ hidden><\/section>$/);
 const attrs={'data-recommendation-render':'old'},section={hidden:false,innerHTML:'old',getAttribute:name=>attrs[name],setAttribute:(name,value)=>attrs[name]=value};
 renderRecommendations({querySelector:()=>section},current,[current,other],'rent',{bruk:'messe',prisbruk:'messe',basket:{other:4}},id=>'/leieprodukt.html?produkt='+id);
 assert.equal(section.hidden,true);assert.equal(section.innerHTML,'');assert.notEqual(attrs['data-recommendation-render'],'old');
});

test('recommendation first paint rejects external return links and respects channel eligibility',()=>{
 const hidden=product('hidden',{active:false}),rentOnly=product('rent-only',{saleEnabled:false});
 const markup=productRecommendationsFirstPaint({product:{...current,recommendedProducts:['hidden','rent-only','other']},buy:true,productReturn:'https://evil.test/'},[current,hidden,rentOnly,other],{});
 assert.doesNotMatch(markup,/evil\.test|produkt=hidden|produkt=rent-only/);assert.match(markup,/retur=%2Fkjop.html/);
});
