import {rememberedPurposeState,rememberRentalPurpose} from '../public/rental-purpose-memory.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {readPurposeState} from '../public/rental-purpose-model.js';

// Mount the real checkout navigation without opening a browser or submitting a request.
function checkout(mode){
 const node=()=>({children:[],classList:{add(){},remove(){}},append(...children){this.children.push(...children);},setAttribute(){},querySelector(selector){return this.innerHTML?.includes('<'+selector)?node():null;},querySelectorAll(){return [];},addEventListener(){},show(){},focus(){}});
 const cart=node(),form={elements:Object.assign([],{namedItem:()=>null})},host=node(),nodes={cart,requestForm:form,enquiryPage:host,cartPricingScope:node(),customRequestProductsHeading:{before(toolbar){cart.append(toolbar);}}};
 const intro={after(overview){cart.append(overview);}};
 cart.querySelector=selector=>selector==='.quote-cart-note'?intro:null;
 const context=vm.createContext({document:{getElementById:id=>nodes[id],createElement:node,querySelector:()=>null,head:node(),body:node(),addEventListener(){}},location:{pathname:'/foresporsel.html',origin:'https://konseptuell.no'},sessionStorage:{getItem:()=>null},window:{addEventListener(){}},performance:{getEntriesByType:()=>[{type:'back_forward'}]},MutationObserver:class{observe(){}},mode});
 const source=fs.readFileSync(new URL('../public/enquiry-flow.js',import.meta.url),'utf8');
 vm.runInContext(source.replace(/^import .*;\n/gm,'').replace('export function mountEnquiryFlow','function mountEnquiryFlow')+"\nmountEnquiryFlow({cartId:'cart',formId:'requestForm',mode});",context);
 const overview=cart.children.find(child=>child.className==='enquiry-overview');
 if(mode==='rent'){
  assert.equal(overview.children[1],nodes.cartPricingScope);
  assert.equal(cart.children.find(child=>child.className==='enquiry-products-toolbar').children[0],nodes.customRequestProductsHeading);
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
 const context=vm.createContext({URL,isProductPage:false,location:{href:'https://konseptuell.no/utvalg.html'},sessionStorage:{getItem:()=>stored,setItem:(key,value)=>{stored=value;}},rememberedPurposeState,rememberRentalPurpose:value=>rememberRentalPurpose(value,{sessionStorage:{setItem:(key,value)=>{stored=value;}}}),readPurposeState,cart:{chair:1},sofaSetups:[],readRefinement:()=>({}),isEnquiryPage:false,el:id=>id==='occasion'?{value:''}:search,catalogProducts:[],getSiteSettings:()=>({categories:[]}),syncPurpose(){},renderProducts(){}});
 vm.runInContext("let savedPurpose='boligsalg',purpose='boligsalg',refinement,filter,tableFilter;\n"+remember+'\n'+restore+'\nrestorePurpose();',context);
 assert.equal(vm.runInContext('purpose',context),'messe');
 stored='fest';vm.runInContext('restorePurpose()',context);assert.equal(vm.runInContext('purpose',context),'fest');
 context.location.href='https://konseptuell.no/utvalg.html?bruk=boligsalg';vm.runInContext('restorePurpose()',context);assert.equal(vm.runInContext('purpose',context),'boligsalg','an explicit new purpose remains authoritative');
 context.location.href='https://konseptuell.no/utvalg.html?bruk=alle';vm.runInContext('restorePurpose()',context);assert.equal(vm.runInContext('purpose',context),'boligsalg','view-all navigation must not erase the purpose of an existing basket');
});
