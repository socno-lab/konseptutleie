import {customerTransportPlan} from '../public/customer-transport-plan.js';
import {weekendRentalEnd,weekendDayDeliveryRequired,weekendCollectionRequired,weekendPeriodDeliveryRequired} from '../public/weekend-rental.js';
import {informationBoxMarkup} from '../public/information-box.js';
import {plannedTransportDates,transportWeekdayPolicy,transportDateLimits,transportDateError} from '../public/transport-weekdays.js';
import {scopeForOccasion} from '../public/rental-pricing-model.js';
import {priceMarkup} from '../public/price-display-model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {requiresTwoPeople,rentalDeliveryCapacity} from '../public/delivery-model.js?v=stockmobile20261107';

// Exercise the real mount/getter and capacity rules with fake route responses.
// No Google requests, real customer details or browser side effects are used.
async function mountedDelivery(){
 const source=await readFile(new URL('../public/customer-info.js?v=stockmobile20261107',import.meta.url),'utf8'),first=source.indexOf('function mountRentalDelivery(form){'),last=source.indexOf('\n// Scoped to enquiry drawers',first);
 const getter=source.match(/export function rentalDeliverySummary\(\)\{[^\n]+/)[0].replace('export ','');
 const values=['Henter og returnerer selv','Ønsker levering og henting','Kun levering – jeg returnerer selv','Kun henting – jeg henter selv','Avklares senere'];
 const listeners={},formListeners={},requests=[],events=[],timers=new Map();let now=1_000_000,timerId=0,mobile=false,quote={manual:false,prices:{onePerson:690,twoPeople:1190},receipt:'isolated-test-receipt'};
 const element=()=>({hidden:false,disabled:false,textContent:'',innerHTML:'',style:{},setAttribute(){},after(){},append(){}});
 let includedNote=null;const status=element(),legend={after(note){includedNote=note;}},prices=values.map(element),labels=values.map(element),radios=[];
 for(const [i,value] of values.entries()){
  const caption=element(),label=labels[i];label.after=node=>{label.following=node;};label.querySelector=selector=>selector==='span'?caption:null;
  let checked=i===0;const radio={...element(),name:'delivery',value,closest:()=>label};
  Object.defineProperty(radio,'checked',{get:()=>checked,set(next){if(next)for(const other of radios)if(other!==radio)other.checked=false;checked=!!next;}});radios.push(radio);
 }
 const group={...element(),querySelector(selector){if(selector==='[role="status"]')return status;if(selector==='legend')return legend;if(selector==='.rental-included-note')return includedNote;if(selector.includes(':checked'))return radios.find(radio=>radio.checked)||null;if(selector.startsWith('[name='))return radios[0];const match=selector.match(/data-delivery-price="(\d+)"/);if(match)return prices[Number(match[1])];throw Error('Unimplemented fixture selector: '+selector);},querySelectorAll(){return radios;}};
 const address={...element(),name:'address',value:'Testveien 1',closest:()=>element()},postalCode={...element(),name:'postalCode',value:'1470'},postalCity={...element(),name:'postalCity',value:'Teststed'},select={...element(),closest:()=>({replaceWith(){}})};
 const fields={start:{value:'2030-11-04'},end:{value:'2030-11-05'},occasion:{value:'Bedrift'},address,postalCode,postalCity,delivery:select},dialogListeners={},dialog={open:true,addEventListener(name,callback){dialogListeners[name]=callback;}};
 const form={elements:{namedItem:name=>fields[name]},querySelector(selector){return fields[selector.match(/name="([^"]+)"/)[1]];},closest:()=>dialog,contains:field=>Object.values(fields).includes(field),addEventListener(name,callback){(formListeners[name]??=[]).push(callback);}};
 const transportInputs=Object.fromEntries(['deliveryDate','pickupDate'].map(name=>[name,{value:'',setCustomValidity(){},closest:()=>element()}]));
 let weekdayNotice,pickupTimeNote;
 const document={activeElement:null,createElement:tag=>tag==='p'&&!pickupTimeNote?(pickupTimeNote=element()):tag==='section'?(weekdayNotice=element()):tag==='fieldset'?group:tag==='div'?{...element(),querySelector:selector=>selector.startsWith('[data-transport-')?null:transportInputs[selector.match(/name="([^"]+)"/)[1]]}:element(),addEventListener(name,callback){listeners[name]=callback;},dispatchEvent(event){events.push(event.type);}};
 const products=[{id:'chair',name:'Teststol',category:'Stoler'},{id:'sofa',name:'Testsofa',type:'sofa'},{id:'tree',deliveryIncluded:true,isService:true,offeringType:'service'}];
 let quoteGate=null;
 const context=vm.createContext({customerTransportPlan,weekendRentalEnd,weekendDayDeliveryRequired,weekendCollectionRequired,weekendPeriodDeliveryRequired,informationBoxMarkup,transportDateLimits,transportDateError,plannedTransportDates,transportWeekdayPolicy,scopeForOccasion,priceMarkup,document,form,deliverySelection:{basket:{},products},deliveryQuote:null,mountAddressFields(){},completeAddress:()=>[address.value,postalCode.value,postalCity.value].join(', '),matchMedia:()=>({matches:mobile}),requiresTwoPeople,rentalDeliveryCapacity,getSiteSettings:()=>({delivery:{maxMinutes:40}}),MutationObserver:class{observe(){}},AbortController,AbortSignal,Event,Date:class extends Date{static now(){return now;}},clearTimeout:id=>timers.delete(id),setTimeout(callback,delay){timers.set(++timerId,{callback,delay});return timerId;},requestAnimationFrame:callback=>callback(),fetch:async(url,init)=>{requests.push({url,init});if(init?.method==='POST'&&quoteGate)await quoteGate;return {ok:true,json:async()=>init?.method==='POST'?quote:{enabled:true}};}});
 vm.runInContext(getter+'\n'+source.slice(first,last)+'\nmountRentalDelivery(form);\nvar deliverySummaryProvider;',context);
 await new Promise(resolve=>setImmediate(resolve));
 const summary=()=>JSON.parse(JSON.stringify(context.rentalDeliverySummary()));
 const fire=(name,target)=>{for(const callback of formListeners[name]||[])callback({target});};
 return {summary,requests,events,radios,document,address,postalCode,prices,status,weekdayNotice,pickupTimeNote,labels,transportInputs,
  scheduled:()=>[...timers.values()].some(timer=>timer.delay===1800),
  occasion(value){fields.occasion.value=value;fields.occasion.name="occasion";fire("change",fields.occasion);},
  period(start,end){fields.start.value=start;fields.end.value=end;fields.start.name="start";fire("change",fields.start);},
  editTransport(name,value){const field=transportInputs[name];field.name=name;field.value=value;fire("change",field);},
  emit(basket,acquisition='rental',customRequest=false){listeners['rental-delivery-selection']({detail:{acquisition,basket,products,customRequest}});},
  choose(index){radios[index].checked=true;fire('change',radios[index]);},
  editAddress(value){address.value=value;fire('input',address);},
  editing(on){mobile=on;document.activeElement=on?address:null;if(!on)fire('focusout',address);},
  holdQuote(){let release;quoteGate=new Promise(resolve=>release=resolve);return ()=>{quoteGate=null;release();};},
  advance(ms){now+=ms;},setQuote(value){quote=value;},
  async calculate(){const pending=[...timers.values()].find(timer=>timer.delay===1800);assert.ok(pending,'a route calculation must be scheduled');timers.clear();await pending.callback();},
 };
}

test('summary uses current crew, visits and capacity instead of a stale rendered delivery quote',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);await ui.calculate();
 assert.deepEqual(ui.summary(),{total:1380,included:false,label:'Levering og henting'});
 ui.choose(2);assert.equal(ui.summary().total,690);
 ui.emit({sofa:1});assert.equal(ui.summary().total,1190,'current sofa requires two people');
 ui.choose(1);assert.equal(ui.summary().total,2380);
 ui.emit({sofa:2});assert.equal(ui.summary().total,null,'over-capacity load must not retain the previous tariff');
 ui.emit({chair:1});assert.equal(ui.summary().total,1380,'ordinary capacity restores the preceding transport choice');
 ui.choose(4);assert.equal(ui.summary().total,null);
 ui.choose(0);assert.equal(ui.summary().total,0);
 assert.equal(ui.requests.filter(request=>request.init?.method==='POST').length,1,'crew/visit changes reuse a current route quote without new Google calls');
});

test('mobile address editing invalidates the summary immediately while preserving focus',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);await ui.calculate();
 const requests=ui.requests.length,events=ui.events.length;ui.editing(true);ui.editAddress('Annen testvei 2');
 assert.equal(ui.summary().total,null);assert.equal(ui.document.activeElement,ui.address);
 assert.equal(ui.requests.length,requests);assert.ok(ui.events.length>events,'the bottom summary must update despite deferred contact rendering');
 ui.editing(false);await ui.calculate();assert.equal(ui.summary().total,1380);
 ui.advance(300001);assert.equal(ui.summary().total,null,'the getter rejects expired quotes without needing another UI render');
});

test('included transport, manual transport and outright purchase expose distinct summary states',async()=>{
 const ui=await mountedDelivery();ui.emit({tree:1});
 assert.deepEqual(ui.summary(),{total:0,included:true,label:'Levering og henting inkludert i fastprisen'});
 ui.emit({chair:1},'rental',true);assert.equal(ui.summary().total,null);assert.equal(ui.summary().included,false);
 ui.emit({chair:1},'purchase');assert.deepEqual(ui.summary(),{total:0,included:false,label:'Henter selv etter avtale'});
 ui.choose(2);assert.deepEqual(ui.summary(),{total:null,included:false,label:'Ønsker levering'});
 ui.emit({chair:1});ui.setQuote({manual:true,receipt:'isolated-manual-test'});await ui.calculate();assert.equal(ui.summary().total,null);
 ui.choose(0);ui.editAddress('');assert.equal(ui.summary().total,0,'own pickup stays free even while billing address is incomplete');
 assert.ok(ui.events.every(type=>type==='rental-delivery-updated'));
});

test('canonical mode and capacity changes remain accurate while mobile rendering is deferred',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);await ui.calculate();ui.editing(true);
 ui.emit({sofa:1});assert.equal(ui.summary().total,2380);
 ui.emit({sofa:2});assert.equal(ui.summary().total,null);
 ui.emit({tree:1});assert.equal(ui.summary().included,true);assert.equal(ui.summary().total,0);
 ui.emit({chair:1},'purchase');assert.equal(ui.summary().total,0,'rental return choice is reset to pickup in purchase mode');
 assert.equal(ui.document.activeElement,ui.address);
});

test('changing a paid visit to a weekend hides the preceding quote immediately and restores it for weekday visits',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);await ui.calculate();assert.equal(ui.summary().total,1380);
 ui.period('2030-11-02','2030-11-03');assert.equal(ui.summary().total,null);assert.match(ui.summary().label,/må beregnes/);
 ui.period('2030-11-04','2030-11-05');assert.equal(ui.summary().total,1380);
});

test('weekend alternatives never display a cached weekday price, even during mobile address editing',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);await ui.calculate();ui.choose(0);
 ui.editing(true);ui.period('2030-11-02','2030-11-03');
 assert.equal(ui.prices[1].innerHTML,'Må beregnes');
 ui.choose(1);assert.equal(ui.summary().total,null);assert.equal(ui.prices[1].innerHTML,'Må beregnes');
 ui.editing(false);assert.equal(ui.requests.filter(r=>r.init?.method==='POST').length,1,'no additional Maps call for a weekend');
});

test('a Maps response already in flight cannot restore a price after the visit becomes a weekend',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);const release=ui.holdQuote(),pending=ui.calculate();
 ui.period('2030-11-02','2030-11-03');assert.equal(ui.summary().total,null);
 release();await pending;assert.equal(ui.summary().total,null);assert.equal(ui.prices[1].innerHTML,'Må beregnes');
});

test('switching to self pickup removes hidden transport overrides rather than submitting old delivery dates',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);ui.editTransport('deliveryDate','2030-11-02');ui.choose(0);
 ui.choose(1);await ui.calculate();assert.equal(ui.summary().total,1380);
});

test('locked date overrides cannot create a conflicting weekend quote',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);ui.editTransport('deliveryDate','2030-11-02');assert.equal(ui.transportInputs.deliveryDate.value,'2030-11-04');assert.equal(ui.transportInputs.deliveryDate.readOnly,true);
});

test('styling weekend explains Friday/Monday transport and unchanged lease price; other uses hide it',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.occasion('Boligfoto og visning');ui.period('2030-11-02','2030-11-03');ui.choose(1);
 assert.equal(ui.weekdayNotice.hidden,false);assert.match(ui.weekdayNotice.innerHTML,/Vi leverer og henter mandag til fredag\. Derfor foreslår vi levering fredag 1\. november og henting mandag 4\. november/);assert.doesNotMatch(ui.weekdayNotice.innerHTML,/08\.00–12\.00/);assert.match(ui.pickupTimeNote.textContent,/Levering og henting skjer normalt kl\. 08\.00–12\.00/);assert.match(ui.weekdayNotice.innerHTML,/ingen ekstra leiekostnad/);
 ui.choose(0);assert.equal(ui.weekdayNotice.hidden,false);assert.match(ui.weekdayNotice.innerHTML,/uthenting fredag 1\. november og retur mandag 4\. november/);ui.choose(1);ui.occasion('Messe og stand');assert.equal(ui.weekdayNotice.hidden,true);
});

test('styling retains locked Monday collection when a Sunday override is attempted',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.occasion('Boligfoto og visning');ui.period('2030-11-02','2030-11-03');ui.choose(1);ui.editTransport('pickupDate','2030-11-03');assert.equal(ui.transportInputs.pickupDate.value,'2030-11-04');assert.equal(ui.weekdayNotice.hidden,false);
});

test('one details panel follows the currently selected transport option',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);const panel=ui.labels[1].following;
 assert.equal(panel.className,'rental-delivery-details');ui.choose(2);assert.equal(ui.labels[2].following,panel);ui.choose(0);assert.equal(ui.labels[0].following,panel);
});

test('the two partial transport cards explain who handles the other leg',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});
 assert.match(ui.labels[2].querySelector('span').innerHTML,/>Kun levering<.*Du returnerer dem på lageret/);
 assert.match(ui.labels[3].querySelector('span').innerHTML,/>Vi henter ved leieslutt<.*Du henter på lageret/);
 ui.emit({chair:1},'purchase');
 assert.match(ui.labels[2].querySelector('span').innerHTML,/>Ønsker levering</);
 assert.doesNotMatch(ui.labels[2].querySelector('span').innerHTML,/returnerer/);
});

test('route attribution cannot shrink a selected transport choice below the other choices',async()=>{
 const ui=await mountedDelivery();for(const label of ui.labels)label.getBoundingClientRect=()=>({height:44});ui.emit({chair:1});ui.choose(1);await ui.calculate();
 ui.labels[1].getBoundingClientRect=()=>({height:40});ui.choose(1);
 assert.ok(ui.labels.every(label=>label.style.minHeight==='44px'));
});

test('styling Friday to Sunday sets Monday collection before showing the pending tariff',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.occasion('Boligfoto og visning');ui.period('2030-11-01','2030-11-03');ui.choose(1);
 assert.equal(ui.prices[1].innerHTML,'Beregner …');assert.equal(ui.status.textContent,'Beregner transportpris …');assert.equal(ui.weekdayNotice.hidden,false);
 await ui.calculate();const request=JSON.parse(ui.requests.find(r=>r.init?.method==='POST').init.body);assert.equal(request.pickupDate,'2030-11-04');assert.equal(request.deliveryDate,'2030-11-01');assert.equal(ui.summary().total,1380);
});


test('complete address prefetches all weekday prices before choosing transport',async()=>{
 const ui=await mountedDelivery();ui.editAddress('');ui.emit({chair:1});assert.equal(ui.scheduled(),false);
 ui.editAddress('Testveien 1');assert.equal(ui.scheduled(),true);assert.equal(ui.radios[0].checked,true);
 await ui.calculate();assert.match(ui.prices[1].innerHTML,/1.?380/);assert.match(ui.prices[2].innerHTML,/690/);assert.match(ui.prices[3].innerHTML,/690/);
 assert.equal(ui.summary().total,0);assert.equal(ui.radios[0].checked,true);assert.equal(ui.weekdayNotice.hidden,true);
 ui.choose(1);assert.equal(ui.summary().total,1380);assert.equal(ui.scheduled(),false);assert.equal(ui.requests.filter(r=>r.init?.method==='POST').length,1);
});

test('prefetch resolves styling Friday/Monday dates without exposing date fields',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.occasion('Boligfoto og visning');ui.period('2030-11-02','2030-11-03');await ui.calculate();
 const request=JSON.parse(ui.requests.find(r=>r.init?.method==='POST').init.body);assert.equal(request.mode,'delivery');assert.equal(request.deliveryDate,'2030-11-01');assert.equal(request.pickupDate,'2030-11-04');assert.equal(ui.radios[0].checked,true);
 ui.choose(1);assert.equal(ui.summary().total,1380);assert.equal(ui.weekdayNotice.hidden,false);
});

test('event weekend never prefetches a misleading weekday tariff from self pickup dates',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.period('2030-11-02','2030-11-03');assert.equal(ui.scheduled(),false);assert.equal(ui.prices[1].innerHTML,'Må beregnes');assert.equal(ui.prices[2].innerHTML,'Må beregnes');assert.equal(ui.requests.filter(r=>r.init?.method==='POST').length,0);
});

test('Friday to Sunday event allows self pickup Friday but requires collection Sunday',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.period('2030-11-01','2030-11-03');assert.equal(ui.radios[3].checked,true);assert.deepEqual(ui.radios.map(r=>r.disabled),[true,false,true,false,true]);assert.equal(ui.scheduled(),false);assert.equal(ui.transportInputs.pickupDate.value,'2030-11-03');assert.equal(ui.transportInputs.pickupDate.readOnly,true);
 ui.editTransport('pickupDate','2030-11-04');assert.equal(ui.transportInputs.pickupDate.value,'2030-11-03');ui.choose(1);assert.equal(ui.radios[1].checked,true);assert.equal(ui.summary().total,null);
 ui.period('2030-11-04','2030-11-05');assert.ok(ui.radios.every(r=>!r.disabled));assert.equal(ui.transportInputs.pickupDate.readOnly,true);
});

test('mobile address debounce can prefetch without changing focus or selected transport',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.editing(true);ui.editAddress('Ny testvei 2');await ui.calculate();assert.equal(ui.document.activeElement,ui.address);assert.equal(ui.radios[0].checked,true);assert.equal(ui.summary().total,0);
 ui.editing(false);assert.match(ui.prices[1].innerHTML,/1.?380/);assert.equal(ui.scheduled(),false);
});


test('prefetching a weekday leg preserves the selected weekend transport notice',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.period('2030-11-01','2030-11-03');ui.choose(1);
 assert.equal(ui.status.className,'transport-note transport-note-warning');assert.match(ui.status.innerHTML,/Transport i helgen prises individuelt/);assert.notEqual(ui.status.textContent,'Beregner transportpris …');assert.equal(ui.scheduled(),false);assert.equal(ui.summary().total,null);assert.equal(ui.prices[1].innerHTML,'Må beregnes');assert.equal(ui.radios[2].disabled,true);
});


test('event one-day weekend hire locks only delivery and collection on the same day',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(2);ui.period('2030-11-02','2030-11-02');
 assert.equal(ui.radios[1].checked,true);assert.deepEqual(ui.radios.map(r=>r.disabled),[true,false,true,true,true]);assert.ok(ui.labels.every(l=>!l.hidden));assert.match(ui.status.innerHTML,/Transport i helgen prises individuelt/);assert.equal(ui.prices[1].innerHTML,'Må beregnes');assert.equal(ui.transportInputs.deliveryDate.value,'2030-11-02');assert.equal(ui.transportInputs.pickupDate.value,'2030-11-02');assert.equal(ui.scheduled(),false);
 ui.editTransport('pickupDate','2030-11-04');assert.equal(ui.transportInputs.pickupDate.value,'2030-11-02');
 ui.period('2030-11-04','2030-11-05');assert.ok(ui.radios.every(r=>!r.disabled));assert.equal(ui.radios[2].checked,true);assert.equal(ui.transportInputs.pickupDate.readOnly,true);
});

test('styling self pickup explains Monday return without changing the requested period or price basis',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.occasion('Boligfoto og visning');ui.period('2030-11-01','2030-11-03');
 assert.equal(ui.radios[0].checked,true);assert.ok(ui.radios.every(r=>!r.disabled));assert.equal(ui.weekdayNotice.hidden,false);assert.match(ui.weekdayNotice.innerHTML,/mandag 4\. november/);assert.match(ui.weekdayNotice.innerHTML,/08.00–15.45/);assert.match(ui.weekdayNotice.innerHTML,/ingen ekstra leiekostnad/);assert.equal(ui.transportInputs.pickupDate.value,'2030-11-04');assert.equal(ui.summary().total,0);
 ui.period('2030-11-04','2030-11-05');assert.equal(ui.weekdayNotice.hidden,true);
 ui.period('2030-11-02','2030-11-02');assert.equal(ui.radios[0].checked,true);assert.ok(ui.radios.every(r=>!r.disabled));assert.match(ui.weekdayNotice.innerHTML,/minimum to døgn/);
});

test('Friday to Sunday event hire shows weekend manual pricing notice',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.period('2030-11-01','2030-11-03');ui.choose(1);assert.match(ui.status.innerHTML,/Transport i helgen prises individuelt/);assert.equal(ui.prices[1].innerHTML,'Må beregnes');assert.deepEqual(ui.radios.map(r=>r.disabled),[true,false,true,false,true]);
});

test('single-day styling weekend explains weekday logistics under minimum hire heading',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.occasion('Boligfoto og visning');ui.period('2030-11-02','2030-11-02');ui.choose(1);
 assert.match(ui.weekdayNotice.innerHTML,/Helgeleie – minimum to døgn/);assert.match(ui.pickupTimeNote.textContent,/Levering og henting skjer normalt kl\. 08\.00–12\.00/);assert.match(ui.weekdayNotice.innerHTML,/fredag 1\. november/);assert.match(ui.weekdayNotice.innerHTML,/mandag 4\. november/);assert.doesNotMatch(ui.weekdayNotice.innerHTML,/Vi tilbyr også éndagsleie/);
 ui.choose(0);assert.match(ui.weekdayNotice.innerHTML,/08.00–15.45/);assert.match(ui.weekdayNotice.innerHTML,/retur mandag 4\. november/);
});

test('weekend collection explains the warehouse rule only for self pickup with provider collection',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.period('2030-11-01','2030-11-03');
 ui.choose(1);
 assert.match(ui.status.innerHTML,/Henting hos deg utføres av oss eller vår transportør siste leiedag/);
 assert.doesNotMatch(ui.status.innerHTML,/lageret|egen retur|éndagsleie/i);
 assert.match(ui.pickupTimeNote.textContent,/Levering fredag skjer normalt kl\. 08\.00–12\.00\. Tidspunkt for henting søndag avtales i tilbudet\./);
 ui.choose(3);
 assert.match(ui.status.innerHTML,/Lageret tar kun imot egen retur på hverdager/);
 assert.match(ui.pickupTimeNote.textContent,/Tidspunkt for henting avtales i tilbudet/);
 assert.match(ui.pickupTimeNote.textContent,/Tidspunkt for uthenting på lageret/);
 assert.doesNotMatch(ui.pickupTimeNote.textContent,/08\.00/);
 ui.period('2030-11-02','2030-11-02');
 assert.match(ui.status.innerHTML,/Éndagsleie i helgen.*levering og henting samme dag/);
 assert.doesNotMatch(ui.status.innerHTML,/lageret/i);
 assert.equal(ui.pickupTimeNote.textContent,'Tidspunkt for levering og henting avtales i tilbudet.');
});


test('weekday tentative dates are maintained for every concrete transport mode regardless of purpose',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});
 for(const purpose of ['Boligfoto og visning','Messe, stand og event','Bedrift','Bryllup og fest','Foto, film og reklame']){ui.occasion(purpose);ui.period('2030-11-04','2030-11-05');for(const choice of [0,1,2,3]){ui.choose(choice);assert.equal(ui.transportInputs.deliveryDate.value,'2030-11-04');assert.equal(ui.transportInputs.pickupDate.value,'2030-11-05');if(choice===0||choice===3){assert.equal(ui.transportInputs.deliveryDate.readOnly,true);assert.equal(ui.transportInputs.pickupDate.readOnly,true);}}}
});

test('Saturday to Sunday event hire requires provider transport while styling keeps Friday/Monday self pickup',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.period('2030-11-02','2030-11-03');assert.equal(ui.radios[1].checked,true);assert.deepEqual(ui.radios.map(r=>r.disabled),[true,false,true,true,true]);assert.equal(ui.transportInputs.deliveryDate.value,'2030-11-02');assert.equal(ui.transportInputs.pickupDate.value,'2030-11-03');assert.equal(ui.transportInputs.deliveryDate.readOnly,true);assert.equal(ui.transportInputs.pickupDate.readOnly,true);assert.match(ui.status.innerHTML,/Leie i helgen tilbys kun med levering og henting utført av oss eller vår transportør/);assert.doesNotMatch(ui.status.innerHTML,/Éndagsleie/);
 ui.occasion('Boligfoto og visning');ui.choose(0);assert.ok(ui.radios.every(r=>!r.disabled));assert.equal(ui.transportInputs.deliveryDate.value,'2030-11-01');assert.equal(ui.transportInputs.pickupDate.value,'2030-11-04');
});

test('weekend start with weekday end requires provider delivery but permits own weekday return',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.period('2030-11-02','2030-11-04');assert.equal(ui.radios[2].checked,true);assert.deepEqual(ui.radios.map(r=>r.disabled),[true,false,false,true,true]);assert.equal(ui.transportInputs.deliveryDate.value,'2030-11-02');assert.equal(ui.transportInputs.pickupDate.value,'2030-11-04');assert.match(ui.status.innerHTML,/Transport i helgen/);assert.equal(ui.scheduled(),false);
 assert.match(ui.status.innerHTML,/Egen uthenting på lageret/);
 assert.match(ui.pickupTimeNote.textContent,/Tidspunkt for levering avtales i tilbudet.*Tidspunkt for retur på lageret/);
 assert.doesNotMatch(ui.pickupTimeNote.textContent,/08\.00/);
 ui.choose(1);
 assert.doesNotMatch(ui.status.innerHTML,/lageret/i);
 assert.match(ui.pickupTimeNote.textContent,/Henting mandag skjer normalt kl\. 08\.00–12\.00\. Tidspunkt for levering lørdag avtales i tilbudet\./);
});

test('large loads keep self pickup free and available while paid transport is quoted manually',async()=>{
 const ui=await mountedDelivery();ui.emit({sofa:2});assert.equal(ui.radios[0].disabled,false);assert.equal(ui.radios[0].checked,true);assert.equal(ui.summary().total,0);assert.match(ui.status.innerHTML,/egnet kjøretøy/);ui.choose(1);assert.equal(ui.summary().total,null);assert.match(ui.status.innerHTML,/utvidet transport/);
});

test('styling delivery with own return explains both Friday delivery and Monday warehouse return',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.occasion('Boligfoto og visning');ui.period('2030-11-02','2030-11-03');ui.choose(2);
 assert.equal(ui.weekdayNotice.hidden,false);assert.match(ui.weekdayNotice.innerHTML,/Levering og retur på hverdager/);assert.match(ui.weekdayNotice.innerHTML,/levering fredag 1\. november og egen retur til lageret mandag 4\. november/);assert.match(ui.weekdayNotice.innerHTML,/Disse tilpasningene gir ingen ekstra leiekostnad/);
 ui.period('2030-11-01','2030-11-03');assert.equal(ui.weekdayNotice.hidden,false);assert.match(ui.weekdayNotice.innerHTML,/egen retur til lageret mandag 4\. november/);
});


test('each styling transport choice explains which leg moves and whose weekday schedule applies',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.occasion('Boligfoto og visning');
 ui.period('2030-11-02','2030-11-04');
 for(const [choice,reason,visit] of [
  [0,'Henting og retur på lageret skjer på hverdager','uthenting fredag 1. november'],
  [2,'Vi leverer mandag til fredag','levering fredag 1. november'],
  [3,'Uthenting på lageret skjer på hverdager','uthenting på lageret fredag 1. november']
 ]){
  ui.choose(choice);
  assert.equal(ui.weekdayNotice.hidden,false);
  assert.ok(ui.weekdayNotice.innerHTML.includes(reason));
  assert.ok(ui.weekdayNotice.innerHTML.includes(visit));
  assert.doesNotMatch(ui.weekdayNotice.innerHTML,/(retur|henting hos deg) mandag 4\. november/);
 }
 ui.period('2030-11-01','2030-11-03');
 ui.choose(2);
 assert.match(ui.weekdayNotice.innerHTML,/Lageret tar imot retur på hverdager.*egen retur til lageret mandag 4\. november/);
 assert.doesNotMatch(ui.weekdayNotice.innerHTML,/Vi leverer|levering fredag/);
 ui.choose(3);
 assert.match(ui.weekdayNotice.innerHTML,/Vi henter mandag til fredag.*henting hos deg mandag 4\. november/);
 assert.doesNotMatch(ui.weekdayNotice.innerHTML,/lageret/);
 ui.period('2030-11-02','2030-11-03');
 assert.match(ui.weekdayNotice.innerHTML,/Uthenting på lageret skjer på hverdager, og vi henter mandag til fredag/);
 assert.match(ui.weekdayNotice.innerHTML,/uthenting på lageret fredag 1\. november og henting hos deg mandag 4\. november/);
});
