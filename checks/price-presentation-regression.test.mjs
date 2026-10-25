import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ratePlan,rentalDays,moduleConfiguration} from '../public/catalog-model.js';
import {packageGroupRates,packageGroupPeriodTotal} from '../public/package-cart-model.js';
import {rentalUsageState} from '../public/rental-usage-model.js';
import {scopeForOccasion} from '../public/rental-pricing-model.js';
import {packageBuyoutOption} from '../public/buyout-model.js';
import {packagePurchaseSelectionPrice} from '../public/business-purchase-model.js';

const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const functionSource=name=>{const start=source.indexOf('function '+name+'(');assert.ok(start>=0);const firstLine=source.slice(start,source.indexOf('\n',start));return firstLine.endsWith('}')?firstLine:source.slice(start,source.indexOf('\n}',start)+2);};
const item=(id,extra={})=>({id,name:id,active:true,stock:30,unavailable:0,price:100,weekPrice:500,monthPrice:1000,...extra});
const end=item('end',{moduleSeries:'Sofa',moduleRole:'end',moduleWidth:100}),middle=item('middle',{moduleSeries:'Sofa',moduleRole:'middle',moduleWidth:80,price:80,weekPrice:300,monthPrice:800}),textile=item('textile',{price:400,weekPrice:400,monthPrice:400,rentalPricingMode:'period',addonOnly:true});
const products=[end,middle,textile],selection={end:2,middle:1},money=n=>n+' kr';
const dateAfter=days=>new Date(Date.UTC(2026,10,days)).toISOString().slice(0,10);

function renderModule(days=null,extra=textile){
 const context={products:products.map(p=>p.id===extra?.id?extra:p),moduleSelection:selection,config:moduleConfiguration('Sofa',selection,{},products),textile:extra,rentalScopeConfirmed:true,ratePlan,rentalDays,packageGroupPeriodTotal,money,html:String,addonPrice:()=>'',el:id=>({value:days?(id==='start'?'2026-11-01':dateAfter(days)):''})};
 return vm.runInNewContext(functionSource('rateGrid')+'\n'+functionSource('moduleSelectionPricing')+'\nmoduleSelectionPricing(config,textile)',context);
}

test('sofa builder keeps 400 kr period addon outside all three furniture tariffs',()=>{
 const html=renderModule();
 assert.match(html,/<span>Døgn<\/span><strong>280 kr<\/strong>/);
 assert.match(html,/<span>Uke · 7 døgn<\/span><strong>1300 kr<\/strong>/);
 assert.match(html,/<span>Måned · 30 døgn<\/span><strong>2800 kr<\/strong>/);
 assert.match(html,/400 kr per påbegynte 30 dager/);
 assert.doesNotMatch(html,/680 kr|1700 kr|3200 kr|rental-period-price/);
 assert.match(html,/Leiepriser uten tilvalg/);
});

test('sofa builder shows one actual full-period total after dates, renewing addon every 30 days',()=>{
 for(const days of [1,2,7,30,31,60,61]){
  const html=renderModule(days),expected=2*ratePlan(end,days).total+ratePlan(middle,days).total+400*Math.ceil(days/30);
  assert.equal((html.match(/class="rental-period-price"/g)||[]).length,1);
  assert.ok(html.includes('Valgt leieperiode med tilvalg · '+days+' døgn</span><strong>'+money(expected)),html);
 }
 assert.match(renderModule(2),/960 kr<\/strong>/);
});

test('sofa builder cannot claim a complete period total with unpriced textile',()=>{
 const html=renderModule(2,{...textile,priceOnRequest:true});
 assert.match(html,/Pris på forespørsel/);assert.match(html,/Samlet pris avklares/);
 assert.doesNotMatch(html,/Valgt leieperiode med tilvalg/);
});

test('custom package separates multiple period addons while actual duration still includes them',()=>{
 const group={custom:true,selection:{end:2,middle:1,textile:2},product:{packageCustomPricing:'items'}},rates=packageGroupRates(group,products);
 assert.deepEqual([rates.price,rates.weekPrice,rates.monthPrice],[280,1300,2800]);
 assert.equal(rates.separateCharges[0].quantity,2);assert.equal(rates.separateCharges[0].total,800);
 for(const days of [null,1,2,7,30,31,60,61]){
  const period=packageGroupPeriodTotal(group,products,days),html=vm.runInNewContext(functionSource('packageRentalPrices')+'\npackageRentalPrices(group,rates,days,period)',{group,rates,days,period,money,html:String});
  assert.match(html,/280 kr \/ døgn · 1300 kr \/ uke · 2800 kr \/ måned/);
  assert.match(html,/2 × textile<br>800 kr per påbegynte 30 dager/);
  if(days){const expected=2*ratePlan(end,days).total+ratePlan(middle,days).total+800*Math.ceil(days/30);assert.equal(period,expected);assert.ok(html.includes('Valgt leieperiode med tilvalg: <strong>'+money(expected)));}
  else assert.doesNotMatch(html,/Valgt leieperiode/);
 }
 const unknown=packageGroupRates(group,[end,middle,{...textile,priceOnRequest:true}]);
 assert.equal(unknown.priceOnRequest,true);assert.equal(packageGroupPeriodTotal(group,[end,middle,{...textile,priceOnRequest:true}],2),null);
});

test('category navigation never invents or replaces a customer occasion, and preserves its pricing tier',()=>{
 const run=({occasion='',purpose='alle',lastPricingPurpose=null,savedRentalScope='messe'}={})=>{
  const field={value:occasion},calls=[],context={lastPricingPurpose,purpose,savedRentalScope,URL,location:{href:'https://example.invalid/foresporsel.html'},el:()=>field,rentalUsageState,scopeForOccasion,setRentalScope:(...args)=>calls.push(args)};
  vm.runInNewContext(functionSource('syncRentalPurpose')+'\nsyncRentalPurpose()',context);return {occasion:field.value,calls};
 };
 for(const purpose of ['alle','bedrift','messe','fest','jul','boligsalg']){
  assert.equal(run({purpose}).occasion,'');
  const chosen=run({occasion:'Bedrift',purpose});assert.equal(chosen.occasion,'Bedrift');assert.deepEqual(chosen.calls,[['messe',true]]);
  assert.deepEqual(run({occasion:'Boligfoto og visning',purpose}).calls,[['standard',true]]);
 }
});
test('active occasion choice switches all rental prices and announces both tier changes',()=>{
 for(const [value,before,expected] of [['Boligfoto og visning','messe','standard'],['Bedrift','standard','messe'],['Annet','standard','messe']]){
  const calls=[],notices=[],context={el:()=>({value}),rentalScope:before,purpose:'alle',scopeForOccasion,rentalUsageLabels:{standard:'Boligfoto og visning',messe:'Arrangementer og annen bruk'},isCatalogPage:false,setRentalScope:scope=>calls.push(scope),toast:message=>notices.push(message)};
  vm.runInNewContext(functionSource('applyOccasionChoice')+'\napplyOccasionChoice()',context);assert.deepEqual(calls,[expected]);assert.equal(notices[0],'Prisgrunnlaget er endret til '+context.rentalUsageLabels[expected]+'.');
 }
});
test('explicit incompatible pricing basis clears occasion instead of silently relabelling the choice',()=>{
 for(const [value,scope,cleared] of [['Bedrift','standard',true],['Boligfoto og visning','messe',true],['Bedrift','messe',false],['','standard',false]]){
  const events=[],notices=[],field={value,dispatchEvent:event=>events.push(event.type)};
  vm.runInNewContext(functionSource('clearConflictingOccasion')+'\nclearConflictingOccasion(scope)',{scope,el:()=>field,scopeForOccasion,Event,toast:message=>notices.push(message)});
  assert.equal(field.value,cleared?'':value);assert.equal(events.length,cleared?1:0);assert.equal(notices.length,cleared?1:0);
 }
});

test('direct purchase detail summary includes addon purchase values and never hides an unknown extra',()=>{
 const pack=item('pack',{isPackage:true,businessPurchase:true,purchasePrice:30000}),extra={...textile,buyoutUnitPrice:1200},stylist=item('stylist',{category:'Styling',offeringType:'service',priceOnRequest:true}),items=[pack,extra,stylist];
 const render=extras=>vm.runInNewContext(functionSource('businessPurchaseSummary')+'\nbusinessPurchaseSummary(pack,2,extras,false,"buy",true)',{pack,extras,products:items,packageBuyoutOption,packagePurchaseSelectionPrice,money,html:String});
 assert.match(render({textile:2}),/Kjøpspris for pakken: 62400 kr/);
 assert.doesNotMatch(render({textile:2}),/60800 kr/);
 assert.match(render({textile:2,stylist:1}),/Kjøpspris for pakken: Pris på forespørsel/);
});
