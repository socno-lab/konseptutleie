import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {rentalProductOptions,initialOptionMarkup} from '../public/rental-product-options.js';
import {rentalModuleInitialState,rentalModuleView,rentalModuleSurface,rentalWallView,rentalWallSurface} from '../public/rental-builder-options.js';
import {productOverview} from '../server/product-overview.mjs';
import {productFirstPaint} from '../server/product-first-paint.mjs';
import {ratePlan} from '../public/catalog-model.js?v=longrent20261026';

const chair={id:'chair',name:'Stol',category:'Stoler',active:true,stock:8,unavailable:0,price:100,weekPrice:350,monthPrice:800,material:'Tre',image:'/assets/chair.jpg',description:'En stol',relatedAddOns:['textile']};
const textile={id:'textile',name:'Tekstilpakke til lenestol',active:true,stock:99,unavailable:0,isService:true,addonOnly:true,price:150,weekPrice:150,monthPrice:150,rentalPricingMode:'period'};
const context={products:[chair,textile],rentalScopeConfirmed:true};

test('ordinary rental first response contains final controls, default choices and total sections without live selector collisions',()=>{
 const renderer=rentalProductOptions(context),live=renderer.productOptions(chair),initial=renderer.productOptions(chair,{initial:true});
 assert.equal(initial,initialOptionMarkup(live));
 assert.match(initial,/id="initial-productQuantity"[^>]*value="1"/);
 assert.match(initial,/name="initial-productAddon" value="" checked/);
 assert.match(initial,/id="initial-selectionTotals"/);assert.match(initial,/id="initial-selectionPrices"/);
 assert.match(initial,/data-initial-selection-price=/);assert.match(initial,/data-initial-selection-ready hidden/);
 assert.doesNotMatch(initial,/\b(?:id="productQuantity"|name="productAddon"|data-add=|data-detail-step=)/);
 assert.match(initial,/data-price-gross="100"/);assert.match(initial,/data-initial-close="detail" hidden/);
 assert.match(initial,/Legg til leieforespørsel/);assert.match(initial,/Nei takk/);
 const unavailable=rentalProductOptions({...context,cart:{chair:8}}).productOptions(chair);
 assert.match(unavailable,/data-add="chair" disabled/);assert.match(unavailable,/Velg gyldig antall/);
});

test('selected rental period uses the authoritative tariff plan and never changes gross unit amounts',()=>{
 const days=45,renderer=rentalProductOptions({...context,days}),state=renderer.initialSelection(chair),expected=ratePlan(chair,days,context.products).total;
 assert.match(state.prices,new RegExp('data-price-gross="'+expected+'"'));
 assert.match(state.prices,/Valgt leieperiode · 45 døgn/);
 assert.match(state.totals,/data-price-gross="100"/);
 assert.doesNotMatch(rentalProductOptions({...context,rentalScopeConfirmed:false,days}).initialSelection(chair).prices,/data-price-gross/);
});

test('rental package defaults retain proposed addons and their canonical quantities',()=>{
 const plate={...chair,id:'plate',name:'Tallerken',relatedAddOns:[],stock:30},glass={...plate,id:'glass',name:'Vannglass'},proposal={...chair,id:'proposal',name:'Servise',isPackage:true,isProposal:true,minimumQuantity:4,maximumQuantity:12,components:[{id:'plate',quantity:1}],relatedAddOns:['glass'],suggestedAddOns:['glass']};
 const renderer=rentalProductOptions({products:[plate,glass,proposal],rentalScopeConfirmed:true,days:7});
 const state=renderer.initialSelection(proposal);
 assert.equal(state.quantity,4);assert.equal(state.valid,true);assert.deepEqual(state.extras,{glass:4});
 assert.match(renderer.productOptions(proposal),/name="packageAddon" value="glass" checked/);
 assert.match(state.prices,/4 × Vannglass/);
});

const modules=[{...chair,id:'end',name:'Ende',moduleSeries:'Sofa',moduleRole:'end',moduleWidth:100,relatedAddOns:['textile']},{...chair,id:'middle',name:'Midt',moduleSeries:'Sofa',moduleRole:'middle',moduleWidth:80,relatedAddOns:['textile']}];
test('module first view shares default, saved, inventory and total calculations with the editor',()=>{
 const products=[...modules,textile],context={products,rentalScopeConfirmed:true,days:7};
 const initial=rentalModuleInitialState('Sofa',products),view=rentalModuleView(context,initial);
 assert.equal(view.config.valid,true);assert.ok(view.config.count>=2);
 const saved={id:'saved',series:'Sofa',selection:{end:2,middle:1},textileId:'textile'},state=rentalModuleInitialState('Sofa',products,{cart:{end:2,middle:1,textile:1},setups:[saved],editingId:'saved'});
 assert.deepEqual(state.base,{});assert.deepEqual(state.selection,saved.selection);assert.equal(state.textile,true);
 const savedView=rentalModuleView(context,state),surface=rentalModuleSurface(context,state);
 assert.equal(savedView.config.width,280);assert.equal(savedView.saveLabel,'Lagre oppsettet');
 for(const part of ['choices','basePrices','textileChoices','summary'])assert.ok(surface.includes(savedView[part]));
 assert.match(surface,/data-initial-builder="modules"[^>]*inert/);assert.match(surface,/name="moduleTextileChoice" value="textile" checked/);
 assert.match(savedView.summary,/Valgt leieperiode · 7 døgn/);
});

test('wall first view has the final selector, selected layout, quantity and date section',()=>{
 const walls=[{...chair,id:'wall',name:'Bildevegg',category:'Bilder',isService:true,wallGroup:'Gallery',wallOrder:2},{...chair,id:'wall2',name:'Liten bildevegg',category:'Bilder',isService:true,wallGroup:'Gallery',wallOrder:1}];
 const context={products:walls,rentalScopeConfirmed:true,days:7},view=rentalWallView(context,'wall'),surface=rentalWallSurface(context,'wall');
 assert.ok(surface.includes(view.layouts));assert.ok(surface.includes(view.summary));
 assert.match(surface,/name="wallLayout" value="wall" checked/);assert.match(surface,/id="wallQuantity"/);
 assert.match(surface,/data-product-rental-period/);assert.ok(surface.indexOf('value="wall2"')<surface.indexOf('value="wall"'));
 assert.equal(rentalWallView({...context,cart:{wall:99}},'wall').valid,false);
});

test('server builder replaces its hidden dialog so real control IDs exist only once',async()=>{
 const template=await readFile(new URL('../public/leieprodukt.html',import.meta.url),'utf8');
 for(const product of [modules[0],{...chair,id:'wall',name:'Bildevegg',category:'Bilder',isService:true,wallGroup:'Gallery'}]){
  const products=product.moduleSeries?modules:[product],id=product.moduleSeries?'modules':'wall';
  const html=productFirstPaint(template,{product,status:200,buy:false,productUsage:{scope:'messe',confirmed:true}},products,{});
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  assert.match(html,new RegExp('<section id="'+id+'" class="product-page-surface"'));
  assert.doesNotMatch(html,new RegExp('<dialog id="'+id+'"'));
  assert.match(html,/data-initial-product-ready hidden/);
 }
 const ordinary=productOverview({product:chair,buy:false,productUsage:{scope:'messe',confirmed:true}},context.products,{});
 assert.match(ordinary,/data-initial-product-options inert/);assert.match(ordinary,/initial-productQuantity/);assert.doesNotMatch(ordinary,/Gjør valg klare/);
});

test('example service description is already present once before the quantity controls',()=>{
 const service={...chair,id:'service',name:'Kafésett',isService:true,isExample:true,description:'Tilpasset eksempelbeskrivelse',relatedAddOns:[]};
 const renderer=rentalProductOptions({products:[service],rentalScopeConfirmed:true});
 const initial=renderer.productOptions(service,{initial:true});
 assert.ok(initial.startsWith('<p class="hint">Tilpasset eksempelbeskrivelse</p>'));
 assert.ok(initial.indexOf('Tilpasset eksempelbeskrivelse')<initial.indexOf('class="product-quantity"'));
});
test('detail stock hint and maximum reflect reserved stock and recover for another period',()=>{const available={...chair,relatedAddOns:[],unavailable:4},options=rentalProductOptions({products:[available],cart:{}});assert.equal(options.productAvailabilityHint(available),'4 stk. kan legges til');assert.match(options.productOptions(available),/id="productQuantity"[^>]*max="4"/);const full=rentalProductOptions({products:[chair],cart:{}});assert.equal(full.productAvailabilityHint(chair),'8 stk. kan legges til');assert.match(full.productOptions(chair),/id="productQuantity"[^>]*max="8"/);const none={...chair,relatedAddOns:[],unavailable:8};assert.equal(rentalProductOptions({products:[none],cart:{}}).productAvailabilityHint(none),'0 stk. kan legges til');});

test('Skibby opens with the pictured base pair and middle, while editing restores the saved sofa',()=>{
 const series='JYSK SKIBBY, sand',gallery=['/media/9ed8bbde97fa7549978a7df6bdbbae45'];
 const base={...chair,id:'obj_jysk_skibby_base_sand',moduleSeries:series,moduleRole:'base',rentalRequiredQuantity:1,rentalStartQuantity:1,gallery,stock:1};
 const middle={...base,id:'obj_jysk_skibby_midt_sand',moduleRole:'middle',rentalRequiredQuantity:0,rentalStartQuantity:0};
 const products=[base,middle],context={products,rentalScopeConfirmed:true},pictured={[base.id]:1,[middle.id]:1};
 const initial=rentalModuleInitialState(series,products);
 assert.deepEqual(initial.selection,pictured);
 const view=rentalModuleView(context,initial);
 assert.equal(view.config.count,3);
 assert.equal(view.config.price,base.price+middle.price);
 assert.equal(view.config.valid,true);
 const saved={id:'one',series,selection:{[base.id]:1}},cart={[base.id]:1};
 const edit=rentalModuleInitialState(series,products,{cart,setups:[saved],editingId:'one'});
 assert.deepEqual(edit.selection,saved.selection);
 const extra=rentalModuleInitialState(series,products,{cart,setups:[saved]});
 assert.deepEqual(extra.selection,pictured);
 const extraView=rentalModuleView(context,extra);
 assert.equal(extraView.config.valid,false);
 assert.match(extraView.summary,/Kurven inneholder allerede moduler/);
});
