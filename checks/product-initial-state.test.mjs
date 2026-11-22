import test from 'node:test';
import assert from 'node:assert/strict';
import {initialProductState,projectInitialProduct,mountInitialProductState} from '../public/product-initial-state.js';
import {addDateDays,osloToday} from '../public/rental-dates.js';

const rates={standard:{price:100,weekPrice:400,monthPrice:900,stylingContinuation:true},messe:{price:150,weekPrice:600,monthPrice:1400,stylingContinuation:false}};
const chair={id:'chair',name:'Stol',category:'Stoler',material:'Beige stoff',description:'Stol til leie.',image:'/assets/chair.jpg',active:true,stock:8,unavailable:1,price:100,weekPrice:400,monthPrice:900,rentalRates:rates,saleEnabled:true,salePrice:1000};
const end={...chair,id:'end',name:'Sofa ende',category:'Sofaer',moduleSeries:'S',moduleRole:'end',moduleWidth:92,stock:6,unavailable:0,relatedAddOns:['textile']};
const mid={...end,id:'mid',name:'Sofa midt',moduleRole:'middle',moduleWidth:70,stock:4};
const textile={...chair,id:'textile',name:'Tekstilpakke',category:'Tekstiler',isService:true,stock:0,unavailable:0,saleEnabled:false};
const pack={...chair,id:'pack',name:'Bedriftspakke',isPackage:true,businessPurchase:true,purchasePrice:5000,components:[{id:'chair',quantity:2}]};
const products=[chair,end,mid,textile,pack,{...chair,id:'inactive',active:false},{...chair,id:'disabled',rentalEnabled:false,saleEnabled:false}];
const data={settings:{},products,occasionChoices:['Boligfoto og visning','Boligsalg','Bedrift','Event og selskap','Messe og stand','Foto, film og reklame','Fest og sesong','Leie over tid','Annet']};
const rent='https://konseptuell.no/leieprodukt.html?produkt=chair';
const buy='https://konseptuell.no/kjopsprodukt.html?produkt=end';
function memory(values={}){
 const stored=new Map(Object.entries(values).map(([key,value])=>[key,typeof value==='string'?value:JSON.stringify(value)]));
 return {getItem:key=>stored.get(key)??null,setItem(){assert.fail('Early rendering must not persist a cart or customer choices');},removeItem(){assert.fail('Early rendering must not remove customer choices');}};
}
const storage=(local={},session={})=>({localStorage:memory(local),sessionStorage:memory(session)});
const nextPeriod=()=>{const start=addDateDays(osloToday(),10);return {start,end:addDateDays(start,7)};};

test('saved rental dates use inclusive Oslo calendar days and leave the snapshot untouched',()=>{
 const draft={...nextPeriod(),name:'Customer name must not reach markup',email:'private@example.test'};
 const original=JSON.stringify(data),state=initialProductState(data,rent+'&bruk=boligsalg',storage({}, {'konsept-enquiry-draft-rent':draft}));
 assert.equal(state.period.days,8);assert.equal(state.context.days,8);assert.equal(state.period.message,'');
 assert.equal(state.context.rentalScope,'standard');assert.equal(state.product.price,100);
 assert.equal(JSON.stringify(data),original);
 assert.equal(JSON.stringify(state).includes(draft.email),false);
});

test('expired, inverted, malformed and overly long saved periods never supply a price duration',()=>{
 const start=addDateDays(osloToday(),10);
 for(const draft of [{start:addDateDays(osloToday(),-1),end:start},{start,end:addDateDays(start,-1)},{start,end:addDateDays(start,365)},{start:'2030-02-30',end:'2030-03-03'},{start:[],end:{}},[]]){
  const state=initialProductState(data,rent,storage({}, {'konsept-enquiry-draft-rent':draft}));
  assert.equal(state.period.days,null);assert.equal(state.context.days,null);
 }
});

test('purpose, explicit usage and saved usage resolve the same tariff precedence as the application',()=>{
 const cases=[
  {url:rent,local:{'konsept-rental-scope-v1':'standard'},scope:'standard',confirmed:true},
  {url:rent,session:{'konsept-purpose-v1':'boligsalg'},scope:'standard',confirmed:true},
  {url:rent+'&bruk=bedrift&prisbruk=standard',scope:'messe',confirmed:true},
  {url:rent+'&bruk=alle&prisbruk=standard',local:{'konsept-rental-scope-v1':'messe'},scope:'standard',confirmed:true},
  {url:rent+'&bruk=unknown&prisbruk=unknown',local:{'konsept-rental-scope-v1':'unknown'},scope:'messe',confirmed:false},
 ];
 for(const {url,local,session,scope,confirmed} of cases){const state=initialProductState(data,url,storage(local,session));assert.equal(state.context.rentalScope,scope);assert.equal(state.context.rentalScopeConfirmed,confirmed);assert.equal(state.product.price,rates[scope].price);}
});

test('a valid confirmed saved occasion overrides URL purpose while unknown or unconfirmed occasions do not',()=>{
 for(const [occasion,confirmed,scope] of [['Bedrift',true,'messe'],['Boligsalg',true,'standard'],['Bedrift',false,'standard'],['Bedrift','true','standard'],['Unknown',true,'standard'],[' Bedrift ',true,'standard'],['',true,'standard']]){
  const state=initialProductState(data,rent+'&bruk=boligsalg',storage({}, {'konsept-enquiry-draft-rent':{occasion,occasionConfirmed:confirmed}}));
  assert.equal(state.context.rentalScope,scope,JSON.stringify({occasion,confirmed}));
 }
 const reversed=initialProductState(data,rent+'&bruk=bedrift',storage({}, {'konsept-enquiry-draft-rent':{occasion:'Boligsalg',occasionConfirmed:true}}));
 assert.equal(reversed.context.rentalScope,'standard');assert.equal(reversed.product.price,100);
});

test('saved rental basket is stock-normalized and disabled or unknown products never claim stock',()=>{
 const state=initialProductState(data,rent,storage({'konsept-cart-v1':{chair:50,inactive:2,disabled:1,unknown:1},'konsept-sofas-v1':[]}));
 assert.deepEqual(state.context.cart,{chair:7});assert.equal(state.products.some(p=>p.id==='disabled'),false);
 assert.equal(initialProductState(data,rent.replace('chair','inactive')).product,undefined);
});

test('legacy rental sofa and linked textile restoration keeps the same cart quantities',()=>{
 const cart={chair:1,end:2,mid:1,textile:1};
 const state=initialProductState(data,rent.replace('chair','end'),storage({'konsept-cart-v1':cart,'konsept-cart-links-v1':{textile:{parentId:'end'}}}));
 assert.deepEqual(state.context.cart,cart);assert.equal(state.setups.length,1);
 assert.deepEqual(state.setups[0],{id:'legacy_0',series:'S',selection:{end:2,mid:1},textileId:'textile'});
});

test('valid saved rental setups retain editing identity while malformed selections are rejected',()=>{
 const setup={id:'my-sofa',series:'S',selection:{end:2,mid:1},textileId:'textile'};
 const malformed=[{...setup,id:'fraction',selection:{end:1.5}},{...setup,id:'large',selection:{end:100}},{...setup,id:'array',selection:[]},null];
 const state=initialProductState(data,rent.replace('chair','end')+'&oppsett=my-sofa',storage({'konsept-cart-v1':{end:2,mid:1,textile:1},'konsept-sofas-v1':[setup,...malformed]}));
 assert.equal(state.editingId,'my-sofa');assert.deepEqual(state.setups,[setup]);assert.deepEqual(state.context.cart,{end:2,mid:1,textile:1});
});

test('only eligible business packages still present in the restored basket retain purchase or trial mode',()=>{
 const local={'konsept-cart-v1':{pack:1},'konsept-business-choices-v1':{chair:'buy',pack:'try',unknown:'buy'}};
 const state=initialProductState(data,rent.replace('chair','pack'),storage(local));
 assert.equal(state.context.mode,'try');assert.deepEqual(state.context.businessChoices,{pack:'try'});
 assert.equal(initialProductState(data,rent,storage(local)).context.mode,'rent');
 for(const cart of [{}, {chair:7,pack:1}]){
  const restored=initialProductState(data,rent.replace('chair','pack'),storage({...local,'konsept-cart-v1':cart}));
  assert.equal(restored.context.cart.pack,undefined);assert.deepEqual(restored.context.businessChoices,{});assert.equal(restored.context.mode,'rent');
 }
 assert.equal(initialProductState(data,rent.replace('chair','pack'),storage({'konsept-business-choices-v1':{pack:'malicious'}})).context.mode,'rent');
});

test('purchase setup editing restores validated basket quantities and normal opening uses a fresh selection',()=>{
 const local={'konsept-sale-cart-v1':{end:2,mid:1},'konsept-sale-sofas-v1':[{id:'sale-a',series:'S',selection:{end:2,mid:1}}]};
 assert.deepEqual(initialProductState(data,buy+'&oppsett=sale-a',storage(local)).selection,{end:2,mid:1});
 assert.deepEqual(initialProductState(data,buy,storage(local)).selection,{end:1,mid:0});
 assert.deepEqual(initialProductState(data,buy+'&oppsett=missing',storage(local)).selection,{end:0,mid:0});
 const invalid={'konsept-sale-cart-v1':{end:2},'konsept-sale-sofas-v1':[{id:'sale-a',series:'S',selection:{end:2,mid:1}}]};
 assert.deepEqual(initialProductState(data,buy+'&oppsett=sale-a',storage(invalid)).selection,{end:0,mid:0});
 assert.deepEqual(initialProductState(data,buy+'&oppsett=legacy-sale-0',storage(invalid)).selection,{end:2,mid:0});
});

test('corrupt, wrong-shaped and inaccessible browser storage safely fall back without writes',()=>{
 const keys=['konsept-cart-v1','konsept-sofas-v1','konsept-cart-links-v1','konsept-business-choices-v1','konsept-sale-cart-v1','konsept-sale-sofas-v1','konsept-enquiry-draft-rent'];
 for(const raw of ['{broken','null','[]','3','"text"']){
  const values=Object.fromEntries(keys.map(key=>[key,raw]));
  const state=initialProductState(data,rent,storage(values,values));
  assert.deepEqual(state.context.cart,{});assert.deepEqual(state.setups,[]);assert.equal(state.period.days,null);
  assert.deepEqual(initialProductState(data,buy,storage(values,values)).selection,{end:1,mid:0});
 }
 const denied={getItem(){throw new Error('Storage blocked');}};
 assert.deepEqual(initialProductState(data,rent,{localStorage:denied,sessionStorage:denied}).context.cart,{});
 const hostile=storage({'konsept-cart-v1':'{"__proto__":{"polluted":true},"chair":2}','konsept-business-choices-v1':'{"__proto__":"buy","constructor":"buy"}'});
 assert.deepEqual(initialProductState(data,rent,hostile).context.cart,{chair:2});assert.equal({}.polluted,undefined);
});

function projectionDocument(snapshot=data){
 const options={innerHTML:''},summary={outerHTML:''},recommendations={innerHTML:'',attributes:new Map(),setAttribute(key,value){this.attributes.set(key,value);},getAttribute(key){return this.attributes.get(key);}};
 const host={querySelector(selector){return selector==='[data-initial-product-options]'?options:selector==='[data-product-summary]'?summary:selector==='#productRecommendations'?recommendations:null;}};
 const period={hidden:false,buttons:{start:{dataset:{},setAttribute(){}},end:{dataset:{},setAttribute(){}}},message:{textContent:''},querySelector(selector){return selector==='[data-period-message]'?this.message:this.buttons[/"(start|end)"/.exec(selector)?.[1]];}};
 const doc={ready:false,getElementById(id){return id==='initialProductCatalog'?{textContent:JSON.stringify(snapshot)}:id==='productPageHost'?host:null;},querySelector(){return this.ready?{}:null;},querySelectorAll(selector){return selector==='[data-product-rental-period]'?[period]:[];}};
 return {doc,options,summary,recommendations,period};
}

test('projection waits for complete markup then restores rental dates, selection total and stock before modules',()=>{
 const view=projectionDocument(),draft=nextPeriod(),stored=storage({'konsept-cart-v1':{chair:6}},{'konsept-enquiry-draft-rent':draft});
 assert.equal(projectInitialProduct(view.doc,rent+'&bruk=boligsalg',stored),false);assert.equal(view.options.innerHTML,'');
 view.doc.ready=true;assert.equal(projectInitialProduct(view.doc,rent+'&bruk=boligsalg',stored),true);
 assert.match(view.options.innerHTML,/data-price-gross="500"/);assert.match(view.options.innerHTML,/max="1"/);
 assert.equal(view.period.buttons.start.textContent,draft.start.split('-').reverse().join('.'));assert.equal(view.period.buttons.end.dataset.selected,'true');assert.equal(view.period.message.textContent,'');
 assert.doesNotMatch(view.summary.outerHTML,/Valgt leieperiode/);
});

test('impossible saved date values are left empty just like native date inputs during live restoration',()=>{
 const view=projectionDocument();view.doc.ready=true;
 // The legacy parsing script accepts YYYY-MM-DD and may already show an impossible date.
 view.period.buttons.start.textContent='30.02.2030';view.period.buttons.start.dataset.selected='true';
 projectInitialProduct(view.doc,rent+'&bruk=boligsalg',storage({}, {'konsept-enquiry-draft-rent':{start:'2030-02-30',end:'2030-03-03'}}));
 assert.equal(view.period.buttons.start.textContent,'Velg dato');assert.equal(view.period.buttons.start.dataset.selected,'false');
 assert.equal(view.period.buttons.end.textContent,'03.03.2030');assert.equal(view.period.message.textContent,'Velg en gyldig fra-dato og til-dato.');
});

test('purchase projection escapes product labels and never uses external return URLs',()=>{
 const malicious={...chair,name:'<img src=x onerror=alert(1)>',description:'<script>evil()</script>'};
 const view=projectionDocument({...data,products:[malicious,{...chair,id:'other'}]});view.doc.ready=true;
 assert.equal(projectInitialProduct(view.doc,'https://konseptuell.no/kjopsprodukt.html?produkt=chair&retur=https%3A%2F%2Fevil.test%2F',storage()),true);
 assert.match(view.options.innerHTML,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(view.options.innerHTML,/<script>|<img src=x onerror=/);
 assert.doesNotMatch(view.recommendations.innerHTML,/evil\.test/);
});

test('DOMContentLoaded final projection includes the last parser nodes and yields to the live application',()=>{
 for(const clientReady of [false,true]){
  const view=projectionDocument();let callback,observer;
  view.doc.documentElement={};view.doc.addEventListener=(name,fn)=>{if(name==='DOMContentLoaded')callback=fn;};
  const win={location:{href:rent+'&bruk=boligsalg'},...storage(),MutationObserver:class{constructor(fn){this.fn=fn;observer=this;}observe(){}disconnect(){this.disconnected=true;}}};
  mountInitialProductState(view.doc,win);assert.equal(view.options.innerHTML,'');
  view.doc.ready=true;win.konseptProductClientReady=clientReady;callback();
  assert.equal(Boolean(view.options.innerHTML),!clientReady);assert.equal(observer.disconnected,true);
 }
});


test('a reopened product restores purpose and prices from the same persistent storage as its basket',()=>{
 const state=initialProductState(data,rent+'&bruk=alle',storage({'konsept-purpose-v1':'boligsalg','konsept-cart-v1':{chair:1}},{}));assert.equal(state.context.purpose,'boligsalg');assert.equal(state.context.rentalScopeConfirmed,true);assert.equal(state.context.rentalScope,'standard');assert.equal(state.product.price,100);assert.equal(state.context.cart.chair,1);
});
