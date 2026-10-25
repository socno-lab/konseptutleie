import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {requiresTwoPeople,rentalDeliveryCapacity} from '../public/delivery-model.js';

// Exercise the real mount/getter and capacity rules with fake route responses.
// No Google requests, real customer details or browser side effects are used.
async function mountedDelivery(){
 const source=await readFile(new URL('../public/customer-info.js',import.meta.url),'utf8'),first=source.indexOf('function mountRentalDelivery(form){'),last=source.indexOf('\n// Scoped to enquiry drawers',first);
 const getter=source.match(/export function rentalDeliverySummary\(\)\{[^\n]+/)[0].replace('export ','');
 const values=['Henter og returnerer selv','Ønsker levering og henting','Kun levering – jeg returnerer selv','Kun henting – jeg henter selv','Avklares senere'];
 const listeners={},formListeners={},requests=[],events=[],timers=new Map();let now=1_000_000,timerId=0,mobile=false,quote={manual:false,prices:{onePerson:690,twoPeople:1190},receipt:'isolated-test-receipt'};
 const element=()=>({hidden:false,disabled:false,textContent:'',innerHTML:'',style:{},setAttribute(){},after(){}});
 let includedNote=null;const status=element(),legend={after(note){includedNote=note;}},prices=values.map(element),labels=values.map(element),radios=[];
 for(const [i,value] of values.entries()){
  const caption=element(),label=labels[i];label.querySelector=selector=>selector==='span'?caption:null;
  let checked=i===0;const radio={...element(),name:'delivery',value,closest:()=>label};
  Object.defineProperty(radio,'checked',{get:()=>checked,set(next){if(next)for(const other of radios)if(other!==radio)other.checked=false;checked=!!next;}});radios.push(radio);
 }
 const group={...element(),querySelector(selector){if(selector==='[role="status"]')return status;if(selector==='legend')return legend;if(selector==='.rental-included-note')return includedNote;if(selector.includes(':checked'))return radios.find(radio=>radio.checked)||null;if(selector.startsWith('[name='))return radios[0];const match=selector.match(/data-delivery-price="(\d+)"/);if(match)return prices[Number(match[1])];throw Error('Unimplemented fixture selector: '+selector);},querySelectorAll(){return radios;}};
 const address={...element(),name:'address',value:'Testveien 1',closest:()=>element()},postalCode={...element(),name:'postalCode',value:'1470'},postalCity={...element(),name:'postalCity',value:'Teststed'},select={...element(),closest:()=>({replaceWith(){}})};
 const fields={address,postalCode,postalCity,delivery:select},dialogListeners={},dialog={open:true,addEventListener(name,callback){dialogListeners[name]=callback;}};
 const form={querySelector(selector){return fields[selector.match(/name="([^"]+)"/)[1]];},closest:()=>dialog,contains:field=>Object.values(fields).includes(field),addEventListener(name,callback){(formListeners[name]??=[]).push(callback);}};
 const document={activeElement:null,createElement:tag=>tag==='fieldset'?group:element(),addEventListener(name,callback){listeners[name]=callback;},dispatchEvent(event){events.push(event.type);}};
 const products=[{id:'chair',name:'Teststol',category:'Stoler'},{id:'sofa',name:'Testsofa',type:'sofa'},{id:'tree',deliveryIncluded:true,isService:true,offeringType:'service'}];
 const context=vm.createContext({document,form,deliverySelection:{basket:{},products},deliveryQuote:null,mountAddressFields(){},completeAddress:()=>[address.value,postalCode.value,postalCity.value].join(', '),matchMedia:()=>({matches:mobile}),requiresTwoPeople,rentalDeliveryCapacity,getSiteSettings:()=>({delivery:{maxMinutes:40}}),MutationObserver:class{observe(){}},AbortController,AbortSignal,Event,Date:class extends Date{static now(){return now;}},clearTimeout:id=>timers.delete(id),setTimeout(callback,delay){timers.set(++timerId,{callback,delay});return timerId;},requestAnimationFrame:callback=>callback(),fetch:async(url,init)=>{requests.push({url,init});return {ok:true,json:async()=>init?.method==='POST'?quote:{enabled:true}};}});
 vm.runInContext(getter+'\n'+source.slice(first,last)+'\nmountRentalDelivery(form);\nvar deliverySummaryProvider;',context);
 await new Promise(resolve=>setImmediate(resolve));
 const summary=()=>JSON.parse(JSON.stringify(context.rentalDeliverySummary()));
 const fire=(name,target)=>{for(const callback of formListeners[name]||[])callback({target});};
 return {summary,requests,events,radios,document,address,postalCode,
  emit(basket,acquisition='rental',customRequest=false){listeners['rental-delivery-selection']({detail:{acquisition,basket,products,customRequest}});},
  choose(index){radios[index].checked=true;fire('change',radios[index]);},
  editAddress(value){address.value=value;fire('input',address);},
  editing(on){mobile=on;document.activeElement=on?address:null;if(!on)fire('focusout',address);},
  advance(ms){now+=ms;},setQuote(value){quote=value;},
  async calculate(){const pending=[...timers.values()].find(timer=>timer.delay===1800);assert.ok(pending,'a route calculation must be scheduled');timers.clear();await pending.callback();},
 };
}

test('summary uses current crew, visits and capacity instead of a stale rendered delivery quote',async()=>{
 const ui=await mountedDelivery();ui.emit({chair:1});ui.choose(1);await ui.calculate();
 assert.deepEqual(ui.summary(),{total:1380,included:false,label:'Levering og henting etter leieperioden'});
 ui.choose(2);assert.equal(ui.summary().total,690);
 ui.emit({sofa:1});assert.equal(ui.summary().total,1190,'current sofa requires two people');
 ui.choose(1);assert.equal(ui.summary().total,2380);
 ui.emit({sofa:2});assert.equal(ui.summary().total,null,'over-capacity load must not retain the previous tariff');
 ui.emit({chair:1});assert.equal(ui.summary().total,1380,'ordinary capacity restores the preceding transport choice');
 ui.choose(4);assert.equal(ui.summary().total,null);
 ui.choose(0);assert.equal(ui.summary().total,0);
 assert.equal(ui.requests.filter(request=>request.init?.method==='POST').length,1,'crew/visit changes reuse a current route quote without new Google calls');
});

test('mobile address editing invalidates the summary immediately while preserving focus and deferred routing',async()=>{
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
