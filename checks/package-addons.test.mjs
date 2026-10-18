import test from 'node:test';
import assert from 'node:assert/strict';
import {packageSelectionDraft,remaining,normalizeBasket,rentalEstimate} from '../public/catalog-model.js';
import {cartChange} from '../public/addon-model.js';
const common={active:true,price:0,weekPrice:0,monthPrice:0,priceOnRequest:true,unavailable:0};
const products=[
 {...common,id:'dinner',name:'Dinner plate',stock:40,addonOnly:true},
 {...common,id:'dessert',name:'Dessert plate',stock:40,addonOnly:true},
 {...common,id:'cutlery',name:'Cutlery',stock:40,addonOnly:true},
 {...common,id:'pack',name:'Borddekkingspakke',isPackage:true,components:['dinner','dessert','cutlery'].map(id=>({id,quantity:4})),relatedAddOns:['red','water']},
 ...['red','water'].map(id=>({...common,id,name:id,stock:10,addonOnly:true,requiredProductId:'pack',requiredProductQuantity:1})),
];
test('Four-person package supports several independent glass types up to 40 people',()=>{
 assert.equal(remaining('pack',{},products),10);
 assert.equal(packageSelectionDraft({},products,'pack',11,[]),null);
 const basket=packageSelectionDraft({},products,'pack',10,['red','water']);
 assert.deepEqual(basket,{pack:10,red:10,water:10});
 assert.equal(remaining('pack',basket,products),0);
 assert.deepEqual(normalizeBasket(basket,products),basket);
 assert.equal(rentalEstimate(basket,products,'2026-11-01','2026-11-01').total,null);
 assert.equal(cartChange(basket,products,'pack',9),null);
 assert.deepEqual(cartChange(basket,products,'red',0),{pack:10,water:10});
 assert.equal(packageSelectionDraft({},products,'pack',1,['red','red']),null);
 assert.equal(packageSelectionDraft({},products,'pack',1,['dinner']),null);
});
test('A scarce glass type cannot oversell or block package-only hire',()=>{
 const limited=products.map(p=>p.id==='water'?{...p,stock:3}:p);
 assert.equal(packageSelectionDraft({},limited,'pack',4,['water']),null);
 assert.deepEqual(packageSelectionDraft({},limited,'pack',4,[]),{pack:4});
 assert.deepEqual(packageSelectionDraft({},limited,'pack',3,['red','water']),{pack:3,red:3,water:3});
});

import {changeProposalCart} from '../public/catalog-model.js';
test('Per-person proposals allow 4 through 40, preserve fixed service and list optional items separately',()=>{
 const proposal=products.map(p=>p.id==='pack'?{...p,isProposal:true,minimumQuantity:4,maximumQuantity:40,components:['dinner','dessert'].map(id=>({id,quantity:1})),relatedAddOns:['cutlery','red','water']}:['red','water'].includes(p.id)?{...p,stock:40}:p.id==='cutlery'?{...p,requiredProductId:'pack',requiredProductQuantity:1}:p);
 assert.equal(remaining('pack',{},proposal),40);
 for(const q of [0,1,3,4.5,41])assert.equal(packageSelectionDraft({},proposal,'pack',q,['red','water']),null);
 for(const q of [4,5,7,40])assert.deepEqual(packageSelectionDraft({},proposal,'pack',q,['cutlery','red','water']),{pack:q,cutlery:q,red:q,water:q});
 const chosen=packageSelectionDraft({},proposal,'pack',7,['red','water']);
 assert.deepEqual(changeProposalCart(chosen,proposal,'pack',8),{pack:8,red:8,water:8});
 assert.deepEqual(changeProposalCart(chosen,proposal,'pack',6),{pack:6,red:6,water:6});
 assert.equal(changeProposalCart(chosen,proposal,'pack',3),null);
 assert.deepEqual(changeProposalCart(chosen,proposal,'pack',0),{});
 assert.deepEqual(packageSelectionDraft({},proposal,'pack',4,[]),{pack:4});
 const limited=proposal.map(p=>p.id==='water'?{...p,stock:7}:p);
 assert.equal(changeProposalCart(chosen,limited,'pack',8),null);
});

import {validateCatalog} from '../server/catalog.mjs';
test('Proposal settings and defaults survive admin saves and reject invalid ranges or defaults',()=>{
 const catalogue=products.map(p=>({category:'Annet',material:'',description:'',type:'generic',color:'#b5ad99',image:'',gallery:[],isService:false,isExample:false,isPackage:false,stock:0,relatedAddOns:[],...p,...(p.id==='pack'?{isProposal:true,minimumQuantity:4,maximumQuantity:40,suggestedAddOns:['water','red']}:{} )}));
 const saved=validateCatalog(catalogue).find(p=>p.id==='pack');
 assert.equal(saved.isProposal,true);assert.equal(saved.minimumQuantity,4);assert.equal(saved.maximumQuantity,40);assert.deepEqual(saved.suggestedAddOns,['water','red']);
 assert.throws(()=>validateCatalog(catalogue.map(p=>p.id==='pack'?{...p,maximumQuantity:3}:p)),/forslag/);
 assert.throws(()=>validateCatalog(catalogue.map(p=>p.id==='pack'?{...p,suggestedAddOns:['unknown']}:p)),/forslag/);
});

test('A table styling quote is one request regardless of guest count and stays optional',()=>{
 const catalogue=products.map(p=>p.id==='pack'?{...p,isProposal:true,minimumQuantity:4,maximumQuantity:40,components:['dinner','dessert'].map(id=>({id,quantity:1})),relatedAddOns:['red','water','stylist']}:['red','water'].includes(p.id)?{...p,stock:40}:p);
 catalogue.push({...common,id:'stylist',name:'Stylist til borddekking – Jul',category:'Styling',addonOnly:true,isService:true,requiredProductId:'pack',requiredProductQuantity:1});
 const draft=packageSelectionDraft({},catalogue,'pack',7,['red','water','stylist']);
 assert.deepEqual(draft,{pack:7,red:7,water:7,stylist:1});
 assert.deepEqual(changeProposalCart(draft,catalogue,'pack',8),{pack:8,red:8,water:8,stylist:1});
 assert.equal(packageSelectionDraft(draft,catalogue,'pack',4,['stylist']).stylist,1);
 assert.deepEqual(changeProposalCart(draft,catalogue,'pack',0),{});
 assert(!('stylist' in packageSelectionDraft({},catalogue,'pack',7,['water'])));
 assert.equal(rentalEstimate(draft,catalogue,'2026-11-01','2026-11-01').total,null);
});

test('Decorated Christmas tree packages can be quoted without inventing owned stock',()=>{
 const tree={...common,id:'tree150',name:'Pyntet juletre 150 cm med oppsett',isService:true,stock:0,addonOnly:true};
 const gifts={...common,id:'gifts',name:'Dekorative gavepakker',isService:true,stock:0,addonOnly:true};
 const pack={...common,id:'christmas150',name:'Klart til jul – 150 cm',isPackage:true,components:[{id:tree.id,quantity:1}],relatedAddOns:[gifts.id]};
 const catalog=[tree,gifts,pack];
 assert.equal(remaining(pack.id,{},catalog),99);
 const basket=packageSelectionDraft({},catalog,pack.id,2,[gifts.id]);
 assert.deepEqual(basket,{christmas150:2,gifts:2});
 assert.deepEqual(normalizeBasket(basket,catalog),basket);
 assert.equal(rentalEstimate(basket,catalog,'2026-12-01','2026-12-10').total,null);
});
