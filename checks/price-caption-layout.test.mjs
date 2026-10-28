import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {productPeriodState} from '../public/product-rental-period.js';
test('styling explanation and VAT share the single caption track, avoiding an implicit second card column',async()=>{
 const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const render=['selectedRentalDays','rateGrid'].map(name=>source.split('\n').find(line=>line.startsWith('function '+name+'('))).join('\n');
 const context=vm.createContext({rentalScopeConfirmed:true,el:()=>null,productPeriodState,money:n=>n+' kr',products:[]});
 vm.runInContext(render,context);
 for(const stylingContinuation of [true,false]){
  const html=context.rateGrid({price:100,weekPrice:300,monthPrice:500,stylingContinuation});
  assert.equal((html.match(/class="rate-caption"/g)||[]).length,1);
  assert.match(html,/<\/div><p class="rate-caption">/);
  if(stylingContinuation)assert.match(html,/Etter 30 dager: halv pris på videre leie\.<br>Leiepriser inkl\. mva\./);
  else assert.doesNotMatch(html,/Etter 30 dager/);
 }
});
