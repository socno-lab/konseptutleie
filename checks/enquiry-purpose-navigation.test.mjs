import {rememberedPurposeState,rememberRentalPurpose} from '../public/rental-purpose-memory.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readPurposeState} from '../public/rental-purpose-model.js';

// Mount the real checkout navigation without opening a browser or submitting a request.
function checkout(mode){
 const node=tag=>({
  tag,children:[],classList:{add(){},remove(){}},
  append(...children){for(const child of children){if(child.parent)child.parent.children.splice(child.parent.children.indexOf(child),1);child.parent=this;this.children.push(child);}},
  setAttribute(){},
  querySelector(selector){return this.children.find(child=>child.tag===selector)||(this.innerHTML?.includes('<'+selector)?node():null);},
  querySelectorAll(){return [];},addEventListener(){},show(){},focus(){},after(){},closest(){return node();},
  replaceWith(next){this.parent.children[this.parent.children.indexOf(this)]=next;next.parent=this.parent;},
 });
 const cart=node(),form=Object.assign(node(),{elements:Object.assign([],{namedItem:()=>null})}),host=node();
 const productsHeading=Object.assign(node('h2'),{before(section){cart.append(section);}});
 const nodes={cart,requestForm:form,enquiryPage:host,cartPricingScope:node(),customRequestProductsHeading:productsHeading,
  moduleCartSummary:node(),cartItems:node(),wallCartActions:node(),cartSuggestion:node()};
 form.querySelector=selector=>selector==='.enquiry-review'?null:node();
 const contact=node('fieldset');contact.append(node('legend'));
 const name=Object.assign(node(),{closest:()=>contact});
 const queryForm=form.querySelector;form.querySelector=selector=>selector==='[name="name"]'?name:queryForm(selector);
 const intro={after(overview){cart.append(overview);}};
 cart.querySelector=selector=>selector==='.quote-cart-note'?intro:null;
 const context=vm.createContext({document:{getElementById:id=>nodes[id],createElement:node,querySelector:()=>null,head:node(),body:node(),addEventListener(){}},location:{pathname:'/foresporsel.html',origin:'https://konseptuell.no'},sessionStorage:{getItem:()=>null},window:{addEventListener(){}},performance:{getEntriesByType:()=>[{type:'back_forward'}]},MutationObserver:class{observe(){}},mode});
 const source=fs.readFileSync(new URL('../public/enquiry-flow.js',import.meta.url),'utf8');
 vm.runInContext(source.replace('export function mountEnquiryFlow','function mountEnquiryFlow')+"\nmountEnquiryFlow({cartId:'cart',formId:'requestForm',mode});",context);
 const overview=cart.children.find(child=>child.className==='enquiry-overview');
 if(mode==='rent'){
  assert.equal(overview.children[1].children[1],nodes.cartPricingScope);
  assert.equal(cart.children.find(child=>child.className==='enquiry-section enquiry-products').children[0],productsHeading);
  assert.equal(form.children.at(-1).className,'enquiry-final');
 }
 else assert.equal(overview,undefined);
 return host.children.find(child=>child.className==='text-button enquiry-back').href;
}

test('continue shopping preserves every saved rental purpose rather than explicitly selecting all uses',()=>{
 const href=checkout('rent');
 for(const purpose of ['boligsalg','messe','bedrift','fest','jul','produksjon'])assert.equal(readPurposeState(new URL(href,'https://konseptuell.no').href,purpose).purpose,purpose);
 assert.equal(readPurposeState(new URL(href,'https://konseptuell.no').href).purpose,'alle','a new visitor still chooses their purpose');
 assert.equal(checkout('buy'),'/kjop.html');
});

test('history restoration reads the latest saved purpose instead of the page startup snapshot',()=>{
 const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const restore=source.match(/^function restorePurpose\(\).*$/m)[0],remember=source.match(/^function rememberPurpose\(\).*$/m)[0];
 let stored='messe';const search={value:''};
 const context=vm.createContext({URL,location:{href:'https://konseptuell.no/utvalg.html'},sessionStorage:{getItem:()=>stored,setItem:(key,value)=>{stored=value;}},rememberedPurposeState,rememberRentalPurpose:value=>rememberRentalPurpose(value,{sessionStorage:{setItem:(key,value)=>{stored=value;}}}),readPurposeState,cart:{chair:1},sofaSetups:[],readRefinement:()=>({}),isEnquiryPage:false,el:id=>id==='occasion'?{value:''}:search,catalogProducts:[],getSiteSettings:()=>({categories:[]}),syncPurpose(){},renderProducts(){}});
 vm.runInContext("let savedPurpose='boligsalg',purpose='boligsalg',refinement,filter,tableFilter;\n"+remember+'\n'+restore+'\nrestorePurpose();',context);
 assert.equal(vm.runInContext('purpose',context),'messe');
 stored='fest';vm.runInContext('restorePurpose()',context);assert.equal(vm.runInContext('purpose',context),'fest');
 context.location.href='https://konseptuell.no/utvalg.html?bruk=boligsalg';vm.runInContext('restorePurpose()',context);assert.equal(vm.runInContext('purpose',context),'boligsalg','an explicit new purpose remains authoritative');
 context.location.href='https://konseptuell.no/utvalg.html?bruk=alle';vm.runInContext('restorePurpose()',context);assert.equal(vm.runInContext('purpose',context),'boligsalg','view-all navigation must not erase the purpose of an existing basket');
});
