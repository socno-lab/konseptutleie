import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readSavedRentalPeriod,periodPriceMarkup,rentalPeriodPresentation} from '../public/rental-period-display.js';
import {homeRateGrid} from '../public/home-sections.js';
import {ratePlan} from '../public/catalog-model.js';
import {productPeriodState} from '../public/product-rental-period.js';
import {rentalPeriodScript,assertRentalPeriodScript} from '../server/rental-period-script.mjs';
const storage=value=>({getItem:()=>typeof value==='string'?value:JSON.stringify(value)});
const options={today:'2026-11-19'};
const ordinary={id:'chair',name:'Stol',price:30,weekPrice:100,monthPrice:300};

test('saved period uses the same validation and messages as the live product date fields',()=>{
 for(const [start,end] of [['',''],['2026-11-20','2026-11-24'],['2026-11-18','2026-11-24'],['2026-11-24','2026-11-20'],['2026-02-30','2026-03-01'],['2026-11-20','2027-11-20'],['2026-11-20','']]){
  const actual=readSavedRentalPeriod(storage({start,end}),options),expected=productPeriodState(start,end,options);
  assert.equal(actual.days,expected.days);assert.equal(actual.message,expected.message);
 }
 for(const value of ['invalid','null','[]',{start:1,end:{}}])assert.equal(readSavedRentalPeriod(storage(value),options).days,null);
 assert.equal(readSavedRentalPeriod({getItem(){throw Error('denied');}},options).days,null);
 assert.equal(readSavedRentalPeriod(undefined,options).days,null);
});

test('saved date sanitization matches native date fields while retaining valid past values for correction',()=>{
 for(const [draft,start,end] of [
  [{start:'2026-02-30',end:'2026-11-24'},'','2026-11-24'],
  [{start:'2026-11-20',end:'not a date'},'2026-11-20',''],
  [{start:'2026-13-01',end:'2026-02-30'},'',''],
  [{start:'2026-11-18',end:'2026-11-24'},'2026-11-18','2026-11-24'],
 ]){
  const actual=readSavedRentalPeriod(storage(draft),options),expected=productPeriodState(start,end,options);
  assert.equal(actual.start,start);assert.equal(actual.end,end);assert.equal(actual.days,expected.days);assert.equal(actual.message,expected.message);
 }
});

test('early rows retain exact canonical package and long-rental prices without changing tariffs',()=>{
 const second={id:'table',price:10,weekPrice:40,monthPrice:120};
 const pack={id:'package',isPackage:true,rentalPricingMode:'components',components:[{id:'chair',quantity:2},{id:'table',quantity:1}]};
 for(const [p,days,products,total] of [[ordinary,5,[],100],[{...ordinary,stylingContinuation:true},31,[],315],[pack,5,[ordinary,second],240]]){
  const snapshot=structuredClone(p),view=rentalPeriodPresentation({kind:'row',product:p,products},days);
  assert.equal(ratePlan(p,days,products).total,total);assert.equal(view.visible,true);
  assert.ok(view.html.includes('data-price-gross="'+total+'"'));assert.ok(view.html.includes('Valgt leieperiode · '+days+' døgn'));
  assert.deepEqual(p,snapshot);
 }
});

test('no period adds no visible row or adjacent-grid class; special prices retain their existing presentation',()=>{
 const initial=periodPriceMarkup(ordinary),active=periodPriceMarkup(ordinary,{days:5});
 assert.match(initial,/ hidden>/);assert.doesNotMatch(initial,/class="rental-period-price"/);
 assert.match(active,/class="rental-period-price"/);assert.match(active,/data-price-gross="100"/);
 for(const p of [{...ordinary,rentalPricingMode:'fixed'},{...ordinary,priceOnRequest:true}])assert.doesNotMatch(homeRateGrid(p,{confirmed:true,days:5}),/data-rental-period=/);
 assert.doesNotMatch(homeRateGrid(ordinary,{confirmed:false,days:5}),/data-rental-period=/);
 const period={...ordinary,price:80,rentalPricingMode:'period'};
 assert.match(homeRateGrid(period,{confirmed:true,days:31}),/data-price-gross="160"/);
 assert.match(homeRateGrid(period,{confirmed:true,days:61}),/61 dagers leie · 3 perioder/);
 const textile=homeRateGrid({...period,name:'Tekstilpakke til sofa'},{confirmed:true,days:61});
 assert.match(textile,/data-price-gross="80"/);assert.match(textile,/data-price-gross="240"/);assert.match(textile,/per sofa · 3 perioder/);
});

test('classic parser projection waits for a complete price slot and matches runtime before modules load',async()=>{
 const source=await rentalPeriodScript(),nodes=[],selections=[],observers=[],listeners=new Map();
 const doc={readyState:'loading',documentElement:{},querySelectorAll:selector=>selector==='[data-rental-period]'?nodes:selections,addEventListener:(type,fn)=>listeners.set(type,fn)};
 class Observer{constructor(callback){this.callback=callback;this.active=false;observers.push(this);}observe(){this.active=true;}disconnect(){this.active=false;}}
 class CurrentDate extends Date{constructor(...args){super(...(args.length?args:['2026-11-19T12:00:00Z']));}}
 const window={sessionStorage:storage({start:'2026-11-20',end:'2026-11-24'})};
 vm.runInNewContext(source,{document:doc,window,MutationObserver:Observer,Date:CurrentDate,Intl,console});
 assert.equal(window.konseptInitialRentalPeriod.days,5);
 const node={complete:false,hidden:true,className:'',innerHTML:'',getAttribute:()=>JSON.stringify({kind:'row',product:ordinary,products:[]}),querySelector(){return this.complete?{}:null;}};
 nodes.push(node);observers[0].callback();assert.equal(node.hidden,true);assert.equal(node.innerHTML,'');
 node.complete=true;observers[0].callback();assert.equal(node.hidden,false);assert.equal(node.className,'rental-period-price');
 assert.ok(node.innerHTML.includes('data-price-gross="100"'));assert.match(node.innerHTML,/Valgt leieperiode · 5 døgn/);
 const original=node.innerHTML;observers[0].callback();assert.equal(node.innerHTML,original);
 const extra={id:'textile',name:'Tekstilpakke til stol',price:80,rentalPricingMode:'period'},supplement={name:'saved buyout summary'};
 const selection={complete:false,innerHTML:'SSR awaiting dates',getAttribute:()=>JSON.stringify({product:ordinary,products:[ordinary,extra],quantity:2,extras:{textile:1},confirmed:true,mode:'try',valid:true}),querySelector(selector){return selector==='[data-initial-selection-ready]'?(this.complete?{}:null):selector==='.business-purchase-summary'?supplement:null;},append(node){this.supplement=node;}};
 selections.push(selection);observers[0].callback();assert.equal(selection.innerHTML,'SSR awaiting dates');
 selection.complete=true;observers[0].callback();assert.match(selection.innerHTML,/data-price-gross="280"/);assert.equal(selection.supplement,supplement);
 assert.match(selection.innerHTML,/Beregnet leiesum for dette produktet med tilvalg/);
 const last={...node,innerHTML:'',className:'',hidden:true};nodes.push(last);
 doc.readyState='interactive';listeners.get('DOMContentLoaded')();assert.equal(observers[0].active,false);
 assert.match(last.innerHTML,/Valgt leieperiode · 5 døgn/,'the final parsed price slot is projected even if readiness changed first');
 const owned={...last,innerHTML:'Client-selected price',hidden:false};nodes.push(owned);window.konseptRentalPeriodClientReady=true;
 observers[0].callback();assert.equal(owned.innerHTML,'Client-selected price');
 await assertRentalPeriodScript();
});
