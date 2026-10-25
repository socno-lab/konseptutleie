import test from 'node:test';
import assert from 'node:assert/strict';
import {mountEnquiryFlow} from '../public/enquiry-flow.js';
import {mountDiscount} from '../public/discount-ui.js';

class Element {
 constructor(){this.children=[];this.listeners=new Map();this.classList={add(){},remove(){}};this.hidden=false;this.value='';this.checked=false;this.type='';this.name='';this.textContent='';this.innerHTML='';}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=nodes;this.innerHTML='';}
 setAttribute(){}
 addEventListener(type,listener){this.listeners.set(type,[...(this.listeners.get(type)||[]),listener]);}
 removeEventListener(type,listener){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==listener));}
 dispatchEvent(event){if(!event.target)Object.defineProperty(event,'target',{value:this});for(const listener of this.listeners.get(event.type)||[])listener(event);if(event.bubbles)this.parentElement?.dispatchEvent(event);}
 querySelectorAll(){return [];}
 querySelector(){return null;}
 focus(){}
}
function environment(t){
 const original=Object.fromEntries(['document','window','location','sessionStorage','MutationObserver','fetch'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const storage=new Map(),window=new Element();let active={};
 Object.assign(globalThis,{window,location:{pathname:'/leieprodukt.html',origin:'https://example.invalid',assign(){}},sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},MutationObserver:class{observe(){}},document:{head:new Element(),createElement:()=>new Element(),getElementById:id=>active[id]||null,querySelector:()=>null}});
 t.after(()=>{for(const [key,descriptor]of Object.entries(original))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];});
 return {storage,window,setForm(form){active={cart:new Element(),form};}};
}
function makeForm(values={}){
 const form=new Element();form.elements=Object.entries({name:'',occasion:'Annet',start:'',end:'',stylist:'yes',stylingNotes:'',rentalTermsAccepted:'v1',termsAccepted:'v1',deliveryToken:'',website:'',...values}).map(([name,value])=>Object.assign(new Element(),{name,value,type:['stylist','rentalTermsAccepted','termsAccepted'].includes(name)?'checkbox':'text'}));
 for(const field of form.elements)field.parentElement=form;form.elements.namedItem=name=>form.elements.find(field=>field.name===name);return form;
}
function coupon(){const elements=Object.fromEntries(['input','#couponApply','#couponRemove','#couponStatus','#couponTotals'].map(selector=>[selector,new Element()]));return {elements,querySelector:selector=>elements[selector],set innerHTML(value){}};}
const flow=()=>mountEnquiryFlow({cartId:'cart',formId:'form',mode:'rent'});

test('enquiry navigation preserves explicit stylist choice and notes without consent or transport credentials',t=>{
 const env=environment(t),first=makeForm({name:'Test',occasion:'Bedrift',stylingNotes:'Hjelp med oppsett',deliveryToken:'private-transport-token'});env.setForm(first);flow();
 const occasion=first.elements.namedItem('occasion');assert.equal(occasion.value,'');occasion.value='Bedrift';occasion.dispatchEvent(new Event('change',{bubbles:true}));
 for(const name of ['stylist','rentalTermsAccepted','termsAccepted'])first.elements.namedItem(name).checked=true;
 first.dispatchEvent(new Event('change'));
 const draft=JSON.parse(env.storage.get('konsept-enquiry-draft-rent'));
 assert.equal(draft.stylist,true);assert.equal(draft.stylingNotes,'Hjelp med oppsett');assert.equal(draft.occasion,'Bedrift');assert.equal(draft.occasionConfirmed,true);
 for(const name of ['rentalTermsAccepted','termsAccepted','deliveryToken','website'])assert.equal(Object.hasOwn(draft,name),false);
 const second=makeForm();env.setForm(second);const restored=flow();
 assert.equal(second.elements.namedItem('stylist').checked,true);assert.equal(second.elements.namedItem('stylingNotes').value,'Hjelp med oppsett');assert.equal(restored.restoredField('occasion'),true);assert.equal(restored.restoredField('termsAccepted'),false);
 assert.equal(second.elements.namedItem('rentalTermsAccepted').checked,false);assert.equal(second.elements.namedItem('deliveryToken').value,'');
 second.elements.namedItem('stylist').checked=false;second.dispatchEvent(new Event('change'));
 const third=makeForm();third.elements.namedItem('stylist').checked=true;env.setForm(third);const thirdFlow=flow();assert.equal(third.elements.namedItem('stylist').checked,false);
 thirdFlow.clearDraft();third.dispatchEvent(new Event('input'));assert.equal(env.storage.has('konsept-enquiry-draft-rent'),false);assert.equal(thirdFlow.restoredField('stylist'),false);
});

test('draft restore ignores malformed values and never restores excluded fields from storage',t=>{
 const env=environment(t);env.storage.set('konsept-enquiry-draft-rent',JSON.stringify({stylist:'yes',rentalTermsAccepted:true,deliveryToken:'unexpected'}));const form=makeForm();env.setForm(form);flow();
 assert.equal(form.elements.namedItem('stylist').checked,false);assert.equal(form.elements.namedItem('rentalTermsAccepted').checked,false);assert.equal(form.elements.namedItem('deliveryToken').value,'');
 for(const value of ['null','[]','{bad']){env.storage.set('konsept-enquiry-draft-rent',value);env.setForm(makeForm());assert.doesNotThrow(flow);}
});

test('legacy occasion drafts are ignored without losing contact, dates or styling details',t=>{
 const env=environment(t),key='konsept-enquiry-draft-rent';env.storage.set(key,JSON.stringify({occasion:'Messe og stand',name:'Testkunde',email:'test@example.invalid',start:'2030-01-01',end:'2030-01-07',stylist:true,stylingNotes:'Behold stilønsket'}));
 const form=makeForm({email:''});env.setForm(form);const mounted=flow();
 assert.equal(form.elements.namedItem('occasion').value,'');assert.equal(mounted.restoredField('occasion'),false);
 for(const [name,value]of Object.entries({name:'Testkunde',email:'test@example.invalid',start:'2030-01-01',end:'2030-01-07',stylingNotes:'Behold stilønsket'})){assert.equal(form.elements.namedItem(name).value,value);assert.equal(mounted.restoredField(name),true);}
 assert.equal(form.elements.namedItem('stylist').checked,true);
 env.window.dispatchEvent(new Event('pagehide'));const draft=JSON.parse(env.storage.get(key));assert.equal(draft.occasion,'');assert.equal(draft.occasionConfirmed,false);assert.equal(draft.name,'Testkunde');assert.equal(draft.stylingNotes,'Behold stilønsket');
});

test('only an occasion field change confirms a choice and navigation preserves that explicit choice',t=>{
 const env=environment(t),key='konsept-enquiry-draft-rent',form=makeForm();env.setForm(form);flow();const occasion=form.elements.namedItem('occasion');
 assert.equal(occasion.value,'');occasion.value='Bedrift';form.dispatchEvent(new Event('change'));assert.equal(JSON.parse(env.storage.get(key)).occasionConfirmed,false);
 occasion.dispatchEvent(new Event('input',{bubbles:true}));env.window.dispatchEvent(new Event('pagehide'));assert.equal(JSON.parse(env.storage.get(key)).occasion,'');
 occasion.dispatchEvent(new Event('change',{bubbles:true}));form.elements.namedItem('name').value='Ny kunde';form.elements.namedItem('name').dispatchEvent(new Event('input',{bubbles:true}));env.window.dispatchEvent(new Event('pagehide'));
 assert.equal(JSON.parse(env.storage.get(key)).occasion,'Bedrift');assert.equal(JSON.parse(env.storage.get(key)).occasionConfirmed,true);
 const next=makeForm();env.setForm(next);const mounted=flow();assert.equal(next.elements.namedItem('occasion').value,'Bedrift');assert.equal(mounted.restoredField('occasion'),true);assert.equal(next.elements.namedItem('name').value,'Ny kunde');
 next.elements.namedItem('occasion').value='';next.elements.namedItem('occasion').dispatchEvent(new Event('change',{bubbles:true}));assert.equal(JSON.parse(env.storage.get(key)).occasionConfirmed,false);assert.equal(JSON.parse(env.storage.get(key)).occasion,'');
 const last=makeForm();env.setForm(last);const lastFlow=flow();assert.equal(last.elements.namedItem('occasion').value,'');assert.equal(lastFlow.restoredField('occasion'),false);
 lastFlow.clearDraft();last.dispatchEvent(new Event('change'));assert.equal(env.storage.has(key),false);
});

test('occasion confirmation requires an exact true marker and a nonempty saved value',t=>{
 const env=environment(t),key='konsept-enquiry-draft-rent';
 for(const saved of [{occasion:'Annet'},{occasion:'Annet',occasionConfirmed:'true'},{occasion:'Annet',occasionConfirmed:false},{occasion:'',occasionConfirmed:true},{occasion:'   ',occasionConfirmed:true}]){
  env.storage.set(key,JSON.stringify({...saved,name:'Behold meg'}));const form=makeForm();env.setForm(form);const mounted=flow();assert.equal(form.elements.namedItem('occasion').value,'');assert.equal(form.elements.namedItem('name').value,'Behold meg');assert.equal(mounted.restoredField('occasion'),false);form.elements.namedItem('name').dispatchEvent(new Event('input',{bubbles:true}));assert.equal(JSON.parse(env.storage.get(key)).occasionConfirmed,false);
 }
 env.storage.set(key,JSON.stringify({occasion:'Annet',occasionConfirmed:true}));const form=makeForm();env.setForm(form);flow();assert.equal(form.elements.namedItem('occasion').value,'Annet');
});

test('rental and purchase codes survive remount separately and every mounted quote uses the current basket',async t=>{
 const env=environment(t),requests=[];
 globalThis.fetch=async(url,options)=>{const data=JSON.parse(options.body);requests.push(data);const subtotal=data.basket.chair*1000;return Response.json({code:data.code,mode:data.mode,percent:10,subtotal,discount:subtotal/10,total:subtotal*.9,hasUnpriced:false});};
 for(const mode of ['rent','buy']){
  let basket={chair:1};const payload=()=>({mode,basket,...(mode==='rent'?{start:'2030-01-01',end:'2030-01-02',scope:'messe'}:{})}),target=coupon(),mounted=mountDiscount(target,payload);
  target.elements.input.value=mode+'10';target.elements['#couponApply'].onclick();assert.equal((await mounted.refresh()).total,900);
  assert.equal(env.storage.get('konsept-discount-code-'+mode),mode.toUpperCase()+'10');
  basket={chair:3};const nextTarget=coupon(),requestCount=requests.length,next=mountDiscount(nextTarget,payload);
  assert.equal(next.code(),mode.toUpperCase()+'10');assert.equal(nextTarget.elements.input.value,next.code());assert.equal(nextTarget.elements['#couponRemove'].hidden,false);
  assert.equal(requests.length,requestCount,'catalog initialization controls when the restored code is revalidated');assert.match(next.lines().join('\n'),/ikke validert/);assert.equal(nextTarget.elements['#couponTotals'].innerHTML,'');
  assert.equal((await next.refresh()).total,2700);assert.deepEqual(requests.at(-1).basket,{chair:3});assert.equal(requests.length,requestCount+1);
  await next.refresh();assert.equal(requests.length,requestCount+1,'unchanged render does not duplicate the server quote');
  basket={chair:2};assert.equal((await next.refresh()).total,1800);assert.deepEqual(requests.at(-1).basket,{chair:2});
 }
 assert.equal(env.storage.get('konsept-discount-code-rent'),'RENT10');assert.equal(env.storage.get('konsept-discount-code-buy'),'BUY10');
 const rent=coupon(),discount=mountDiscount(rent,()=>({mode:'rent',basket:{chair:1}}));discount.clear();
 assert.equal(env.storage.has('konsept-discount-code-rent'),false);assert.equal(env.storage.get('konsept-discount-code-buy'),'BUY10');assert.equal(discount.code(),'');assert.equal(rent.elements.input.value,'');
});

test('restored discount rejection shows no cached total, and remove prevents later restoration',async t=>{
 const env=environment(t);env.storage.set('konsept-discount-code-rent','EXPIRED');
 globalThis.fetch=async()=>Response.json({error:'Rabattkoden er utløpt.'},{status:400});const target=coupon(),discount=mountDiscount(target,()=>({mode:'rent',basket:{chair:1}}));
 assert.equal(await discount.refresh(),null);assert.equal(target.elements['#couponTotals'].innerHTML,'');assert.match(target.elements['#couponStatus'].textContent,/utløpt/);assert.match(discount.lines().join('\n'),/ikke validert/);
 target.elements['#couponRemove'].onclick();assert.equal(env.storage.has('konsept-discount-code-rent'),false);assert.equal(mountDiscount(coupon(),()=>({mode:'rent'})).code(),'');
});

test('clearing a code on submission or editing invalidates an in-flight quote and session memory',async t=>{
 const env=environment(t);let resolve;
 globalThis.fetch=()=>new Promise(done=>{resolve=done;});const target=coupon(),discount=mountDiscount(target,()=>({mode:'buy',basket:{chair:1}}));target.elements.input.value='BUY10';target.elements['#couponApply'].onclick();const pending=discount.refresh();
 await Promise.resolve();discount.clear();resolve(Response.json({code:'BUY10',mode:'buy',percent:10,subtotal:1000,discount:100,total:900}));assert.equal(await pending,null);assert.equal(target.elements['#couponTotals'].innerHTML,'');assert.equal(discount.code(),'');assert.equal(env.storage.has('konsept-discount-code-buy'),false);
 globalThis.fetch=async()=>Response.json({code:'BUY10',mode:'buy',percent:10,subtotal:1000,discount:100,total:900});target.elements.input.value='BUY10';target.elements['#couponApply'].onclick();await discount.refresh();target.elements.input.value='OTHER';target.elements.input.dispatchEvent(new Event('input'));assert.equal(discount.code(),'');assert.equal(env.storage.has('konsept-discount-code-buy'),false);
});

test('blocked session storage does not prevent using a coupon or saving the current enquiry',async t=>{
 const env=environment(t);globalThis.sessionStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};env.setForm(makeForm());assert.doesNotThrow(flow);
 globalThis.fetch=async()=>Response.json({code:'TEST10',mode:'buy',percent:10,subtotal:1000,discount:100,total:900});const target=coupon(),discount=mountDiscount(target,()=>({mode:'buy',basket:{chair:1}}));target.elements.input.value='TEST10';target.elements['#couponApply'].onclick();assert.equal((await discount.refresh()).total,900);assert.doesNotThrow(()=>discount.clear());
});

test('discount state and notifications expose pending and current quote without a mount callback',async t=>{
 const env=environment(t),events=[];env.storage.set('konsept-discount-code-rent','TEST10');let basket={chair:1},end='2030-01-02',scope='messe';
 globalThis.fetch=async(url,options)=>{const data=JSON.parse(options.body),subtotal=data.basket.chair*1000;return Response.json({code:data.code,mode:data.mode,percent:10,subtotal,discount:subtotal/10,total:subtotal*.9});};
 const target=coupon(),discount=mountDiscount(target,()=>({mode:'rent',basket,start:'2030-01-01',end,scope}),{onChange(value){assert.deepEqual(value,discount.state());events.push(value);}});
 assert.deepEqual(events,[],'mount must not call back before the caller initializes its controller');assert.deepEqual(discount.state(),{code:'TEST10',pending:false,result:null});
 const pending=discount.refresh();assert.deepEqual(events,[{code:'TEST10',pending:true,result:null}]);assert.deepEqual(discount.state(),events[0]);
 const quote=await pending;assert.equal(quote.total,900);assert.deepEqual(events.slice(1),[{code:'TEST10',pending:true,result:quote},{code:'TEST10',pending:false,result:quote}]);
 assert.deepEqual(discount.state(),events.at(-1));assert.match(discount.lines().join('\n'),/RABATTKODE: TEST10/);
 basket={chair:2};assert.equal(discount.state().result,null);assert.equal(discount.state().pending,false);assert.match(discount.lines().join('\n'),/ikke validert/);
 assert.equal((await discount.refresh()).total,1800);assert.equal(discount.state().result.total,1800);
 end='2030-01-03';assert.equal(discount.state().result,null);await discount.refresh();assert.ok(discount.state().result);
 scope='standard';assert.equal(discount.state().result,null);await discount.refresh();assert.ok(discount.state().result);
 discount.clear();assert.deepEqual(events.at(-1),{code:'',pending:false,result:null});assert.deepEqual(discount.state(),events.at(-1));
});

test('a response for a payload changed during validation never becomes a valid discount',async t=>{
 const env=environment(t),events=[];env.storage.set('konsept-discount-code-buy','TEST10');let basket={chair:1},resolve;
 globalThis.fetch=()=>new Promise(done=>{resolve=done;});const target=coupon(),discount=mountDiscount(target,()=>({mode:'buy',basket}),{onChange:value=>events.push(value)});
 const pending=discount.refresh();await Promise.resolve();basket={chair:2};resolve(Response.json({code:'TEST10',mode:'buy',percent:10,subtotal:1000,discount:100,total:900}));
 assert.equal(await pending,null);assert.deepEqual(discount.state(),{code:'TEST10',pending:false,result:null});assert.equal(target.elements['#couponTotals'].innerHTML,'');assert.match(target.elements['#couponStatus'].textContent,/Utvalget er endret/);
 assert.deepEqual(events.map(({pending,result})=>({pending,result})),[{pending:true,result:null},{pending:true,result:null},{pending:false,result:null}]);
});

test('out-of-order responses cannot overwrite a newer basket quote or emit stale notifications',async t=>{
 const env=environment(t),events=[],requests=[];env.storage.set('konsept-discount-code-buy','TEST10');let basket={chair:1};
 globalThis.fetch=(url,options)=>new Promise(resolve=>requests.push({resolve,data:JSON.parse(options.body)}));const discount=mountDiscount(coupon(),()=>({mode:'buy',basket}),{onChange:value=>events.push(value)});
 const old=discount.refresh();await Promise.resolve();basket={chair:2};const current=discount.refresh();await Promise.resolve();
 requests[1].resolve(Response.json({code:'TEST10',mode:'buy',percent:10,subtotal:2000,discount:200,total:1800}));await current;const count=events.length;
 requests[0].resolve(Response.json({code:'TEST10',mode:'buy',percent:10,subtotal:1000,discount:100,total:900}));assert.equal(await old,null);assert.equal(events.length,count);assert.equal(discount.state().result.total,1800);assert.equal(discount.state().pending,false);
});

test('synchronous quote failures notify failure and completion, and absent targets remain safe',async t=>{
 const env=environment(t),events=[];env.storage.set('konsept-discount-code-buy','TEST10');globalThis.fetch=()=>{throw Error('Simulert nettverksfeil');};
 const target=coupon(),discount=mountDiscount(target,()=>({mode:'buy',basket:{chair:1}}),{onChange:value=>events.push(value)});
 assert.equal(await discount.refresh(),null);assert.deepEqual(events,[{code:'TEST10',pending:true,result:null},{code:'TEST10',pending:true,result:null},{code:'TEST10',pending:false,result:null}]);assert.match(target.elements['#couponStatus'].textContent,/Simulert nettverksfeil/);
 let callbacks=0;const absent=mountDiscount(null,()=>{assert.fail('absent target does not read payload');},{onChange(){callbacks++;}});assert.equal(callbacks,0);assert.deepEqual(absent.state(),{code:'',pending:false,result:null});assert.equal(await absent.refresh(),null);absent.clear();assert.deepEqual(absent.lines(),[]);assert.equal(absent.code(),'');
});
