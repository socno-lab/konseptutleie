import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalProductOptions} from '../public/rental-product-options.js';
test('styling explanation and VAT share the single caption track, avoiding an implicit second card column',()=>{
 const renderer=rentalProductOptions({rentalScopeConfirmed:true});
 for(const stylingContinuation of [true,false]){
  const html=renderer.rateGrid({price:100,weekPrice:300,monthPrice:500,stylingContinuation});
  assert.equal((html.match(/class="rate-caption"/g)||[]).length,1);
  assert.match(html,/<\/div><p class="rate-caption">/);
  if(stylingContinuation)assert.match(html,/Etter 30 dager: halv pris på videre leie\.<br>Leiepriser inkl\. mva\./);
  else assert.doesNotMatch(html,/Etter 30 dager/);
 }
});
