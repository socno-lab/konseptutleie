import test from 'node:test';
import assert from 'node:assert/strict';
import {priceDisplayKey,priceDefaultKey,defaultPriceMode,saveDefaultPriceMode,priceParts,displayedPrice,priceMarkup,readPriceMode,savePriceMode,taxDisplayText} from '../public/price-display-model.js';
import {submitSummaryModel} from '../public/enquiry-submit-summary.js';
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};
test('business purposes default net; private purposes default gross, independently of rental tariff',()=>{
 for(const purpose of ['messe','event','bedrift','produksjon'])assert.equal(defaultPriceMode({purpose}),'excl');
 for(const purpose of ['boligsalg','fest','jul'])assert.equal(defaultPriceMode({purpose,scope:'messe',occasion:'Bedrift'}),'incl');
 assert.equal(defaultPriceMode({purpose:'alle',occasion:'Messe og stand'}),'excl');
 assert.equal(defaultPriceMode({purpose:'alle',occasion:'Event og selskap'}),'incl');
 assert.equal(defaultPriceMode({purpose:'alle',scope:'messe'}),null);
 assert.equal(defaultPriceMode({purpose:'alle',scope:'standard'}),'incl');
});
test('automatic display follows usage until a customer choice, which persists across every later context',()=>{
 const local=storage(),session=storage();
 assert.equal(saveDefaultPriceMode({purpose:'messe'},local,session),'excl');
 assert.equal(local.getItem(priceDisplayKey),null,'automatic default must never become a customer override');
 assert.equal(readPriceMode(local,storage()),'excl','retained on product, purchase and basket pages');
 assert.equal(saveDefaultPriceMode({purpose:'fest'},local,session),'incl');
 assert.equal(saveDefaultPriceMode({purpose:'bedrift'},local,session),'excl');
 savePriceMode('incl',local,session);
 for(const purpose of ['messe','produksjon','fest','boligsalg'])assert.equal(saveDefaultPriceMode({purpose},local,storage()),'incl');
 savePriceMode('excl',local,session);
 assert.equal(saveDefaultPriceMode({purpose:'boligsalg'},local,session),'excl');
 assert.equal(readPriceMode(local,storage()),'excl');
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 const fallback=storage();
 assert.equal(saveDefaultPriceMode({purpose:'messe'},blocked,fallback),'excl');
 assert.equal(fallback.getItem(priceDefaultKey),'excl');
 savePriceMode('incl',blocked,fallback);
 assert.equal(saveDefaultPriceMode({purpose:'messe'},blocked,fallback),'incl');
 assert.equal(saveDefaultPriceMode({purpose:'messe'},blocked,blocked),'excl');
});
test('VAT projection preserves canonical gross amounts, discounts, zero and cents',()=>{
 for(const gross of [0,250,400,3949,8690,1100.69,-100.06]){
  const original=gross,parts=priceParts(gross);
  assert.equal(Math.round((parts.net+parts.vat)*100),Math.round(gross*100));
  for(let i=0;i<20;i++){assert.equal(displayedPrice(gross,'excl'),parts.net);assert.equal(displayedPrice(gross,'incl'),original);}
 }
 assert.deepEqual(priceParts(8690),{gross:8690,net:6952,vat:1738});
 assert.equal(displayedPrice(3949,'excl'),3159.2);
 assert.match(priceMarkup(400),/data-price-gross="400">400\s+kr/);
 for(const unknown of [null,undefined,NaN,Infinity,'400','<img>'])assert.equal(priceMarkup(unknown),'Pris på forespørsel');
});
test('explicit preference persists across pages, defaults inclusive, and tolerates blocked storage',()=>{
 const local=storage(),session=storage();assert.equal(readPriceMode(local,session),'incl');
 savePriceMode('excl',local,session);assert.equal(readPriceMode(local,storage()),'excl');
 savePriceMode('incl',local,session);assert.equal(readPriceMode(local,storage()),'incl');
 local.setItem(priceDisplayKey,'untrusted');assert.equal(readPriceMode(local,session),'incl');
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 savePriceMode('excl',blocked,session);assert.equal(readPriceMode(blocked,session),'excl');
 assert.equal(readPriceMode(blocked,blocked),'incl');assert.doesNotThrow(()=>savePriceMode('excl',blocked,blocked));
 const readOnly={getItem:()=> 'incl',setItem(){throw Error('quota');}};
 savePriceMode('excl',readOnly,session);assert.equal(readPriceMode(readOnly,session),'excl');
});
test('discount, delivery and final gross total are identical in both display modes; unknown remains unknown',()=>{
 const state={hasItems:true,needsDates:true,datesReady:true,subtotal:1000.55,discount:{code:'TEST10',result:{subtotal:1000.55,discount:100.06,total:900.49}},delivery:{total:200.20}};
 const snapshot=structuredClone(state),canonical=submitSummaryModel(state),local=storage(),session=storage();
 for(const mode of ['excl','incl','excl']){
  savePriceMode(mode,local,session);
  const model=submitSummaryModel(state);
  assert.deepEqual(model,canonical);assert.equal(model.total,1100.69);assert.deepEqual(state,snapshot);
  assert.equal(submitSummaryModel({...state,delivery:{total:null}}).total,null);
  assert.equal(submitSummaryModel({...state,hasUnpriced:true}).total,null);
 }
 assert.equal(taxDisplayText('Leiepriser inkl. mva.','excl'),'Leiepriser ekskl. mva.');
});
