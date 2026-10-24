import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the real mount against a narrow DOM adapter. No copied render logic,
// browser APIs, paid route lookups or real addresses are involved.
async function mountedDelivery(){
 const source=await readFile(new URL('../public/customer-info.js',import.meta.url),'utf8'),first=source.indexOf('function mountRentalDelivery(form){'),last=source.indexOf('\n// Scoped to enquiry drawers',first);
 assert.ok(first>=0&&last>first);
 const values=['Henter og returnerer selv','Ønsker levering og henting','Kun levering – jeg returnerer selv','Kun henting – jeg henter selv','Avklares senere'],listeners={},requests=[];
 const element=()=>({hidden:false,disabled:false,textContent:'',innerHTML:'',style:{},setAttribute(){},after(){}});
 let includedNote=null;const status=element(),legend={after(note){includedNote=note;}},prices=values.map(element),labels=values.map(element),radios=[];
 for(const [i,value] of values.entries()){
  const caption=element(),label=labels[i];label.querySelector=selector=>selector==='span'?caption:null;
  let checked=i===0;const radio={...element(),name:'delivery',value,closest:()=>label};
  Object.defineProperty(radio,'checked',{get:()=>checked,set(next){if(next)for(const other of radios)if(other!==radio)other.checked=false;checked=!!next;}});radios.push(radio);
 }
 const group={...element(),querySelector(selector){if(selector==='[role="status"]')return status;if(selector==='legend')return legend;if(selector==='.rental-included-note')return includedNote;if(selector.includes(':checked'))return radios.find(radio=>radio.checked)||null;if(selector.startsWith('[name='))return radios[0];const match=selector.match(/data-delivery-price="(\d+)"/);if(match)return prices[Number(match[1])];throw Error('Unimplemented fixture selector');},querySelectorAll(){return radios;}};
 const address={...element(),value:'Eksempelveien 1',closest:()=>element()},postalCode={...element(),value:'1470'},postalCity={...element(),value:'Eksempelsted'},select={...element(),closest:()=>({replaceWith(){}})};
 const fields={address,postalCode,postalCity,delivery:select},dialog={open:false,addEventListener(){}};
 const form={querySelector(selector){return fields[selector.match(/name="([^"]+)"/)[1]];},closest:()=>dialog,contains:()=>false,addEventListener(){}};
 const document={activeElement:null,createElement:tag=>tag==='fieldset'?group:element(),addEventListener(name,callback){listeners[name]=callback;}};
 const context=vm.createContext({document,form,deliverySelection:{basket:{},products:[]},deliveryQuote:null,mountAddressFields(){},completeAddress:()=>'',matchMedia:()=>({matches:false}),requiresTwoPeople:()=>false,rentalDeliveryCapacity:basket=>({manual:!!basket.capacity,includedOnly:!!basket.tree,reason:basket.capacity?'capacity':''}),getSiteSettings:()=>({delivery:{maxMinutes:40}}),MutationObserver:class{observe(){}},AbortController,AbortSignal,clearTimeout,setTimeout,requestAnimationFrame:callback=>callback(),fetch:async(url,init)=>{requests.push({url,init});assert.equal(init?.method,undefined,'only the public status GET may be requested');return {ok:true,json:async()=>({enabled:false})};}});
 vm.runInContext(source.slice(first,last)+'\nmountRentalDelivery(form);',context);
 await new Promise(resolve=>setImmediate(resolve));
 return {radios,status,labels,requests,emit(acquisition,basket={}){listeners['rental-delivery-selection']({detail:{acquisition,basket,products:[]}});},submitted(){return radios.filter(radio=>radio.checked&&!radio.disabled).map(radio=>radio.value);}};
}
test('purchase, included delivery, ordinary rental and capacity switches keep the selected radio submittable',async()=>{
 const ui=await mountedDelivery();
 ui.emit('purchase');assert.deepEqual(ui.submitted(),['Henter og returnerer selv']);assert.equal(ui.labels[0].querySelector('span').textContent,'Henter selv etter avtale');assert.deepEqual(ui.radios.map(radio=>radio.disabled),[false,true,false,true,true]);
 ui.radios[2].checked=true;ui.emit('purchase');assert.deepEqual(ui.submitted(),['Kun levering – jeg returnerer selv']);assert.equal(ui.labels[2].querySelector('span').textContent,'Ønsker levering');
 ui.emit('rental',{tree:1});assert.deepEqual(ui.submitted(),['Ønsker levering og henting']);assert.equal(ui.radios[1].disabled,false,'included transport must not inherit the purchase-only disabled state');assert.match(ui.status.textContent,/inkludert/);
 ui.emit('rental',{chair:1});assert.ok(ui.radios.every(radio=>!radio.disabled));assert.ok(ui.labels.every(label=>!label.hidden&&label.style.display!=='none'));assert.deepEqual(ui.submitted(),['Ønsker levering og henting']);
 ui.emit('rental',{capacity:1});assert.deepEqual(ui.submitted(),['Avklares senere']);assert.ok(ui.radios.slice(0,4).every(radio=>radio.disabled));
 ui.emit('purchase');assert.deepEqual(ui.submitted(),['Henter og returnerer selv']);assert.equal(ui.labels[0].querySelector('span').textContent,'Henter selv etter avtale');
 ui.emit('mixed',{chair:1});assert.ok(ui.radios.every(radio=>!radio.disabled));assert.equal(ui.labels[0].querySelector('span').textContent,'Jeg henter og returnerer selv');assert.equal(ui.requests.length,1,'mode switches must not start paid routing when no quote is enabled');
});
