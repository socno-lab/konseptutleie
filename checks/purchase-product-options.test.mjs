import test from 'node:test';
import assert from 'node:assert/strict';
import {saleQuantityControl,purchaseInitialSelection,purchaseModuleState,purchaseProductOptionsMarkup} from '../public/purchase-product-options.js';

const chair={id:'chair',name:'Stol & krakk',category:'Stoler',active:true,saleEnabled:true,salePrice:300,description:'En stol <uten tilvalg>.',deliveryNote:'Avtales særskilt'};
const end={id:'end',name:'Ende',category:'Sofaer',active:true,saleEnabled:true,salePrice:1000,moduleSeries:'Sofa',moduleRole:'end',moduleWidth:92};
const middle={...end,id:'middle',name:'Midt',salePrice:600,moduleRole:'middle',moduleWidth:70};
const base={...end,id:'base',name:'Grunnsofa',salePrice:1800,moduleRole:'base',moduleWidth:184,moduleRequired:true};
const inputFor=(markup,id)=>[...markup.matchAll(/<input\b[^>]*>/g)].map(match=>match[0]).find(input=>input.includes(`data-module="${id}"`));

test('ordinary purchase starts with the live quantity, action, delivery and rental-link markup',()=>{
 const markup=purchaseProductOptionsMarkup(chair,[chair],{rentalHref:'/leieprodukt.html?produkt=chair&retur=%2Futvalg.html'});
 assert.match(markup,/class="sale-actions"/);
 assert.match(markup,/<input[^>]*min="1" max="99" step="1" value="1"[^>]*id="saleQuantity"/);
 assert.match(markup,/data-sale-step="-1"[^>]*disabled/);
 assert.match(markup,/data-add="chair">Legg i handlekurv/);
 assert.match(markup,/Antall Stol &amp; krakk/);
 assert.match(markup,/<details class="sale-product-info"><summary>Produktinformasjon og levering<\/summary>/);
 assert.match(markup,/En stol &lt;uten tilvalg&gt;\./);
 assert.match(markup,/Nytt produkt · Avtales særskilt/);
 assert.match(markup,/href="\/leieprodukt.html\?produkt=chair&amp;retur=%2Futvalg.html"/);
 assert.doesNotMatch(markup,/data-module|sale-module-controls/);
 assert.doesNotMatch(purchaseProductOptionsMarkup({...chair,rentalEnabled:false},[chair]),/Dette produktet kan også leies/);
 assert.match(saleQuantityControl(chair.name,99,1,'data-quantity="chair"'),/data-sale-step="1"[^>]*disabled/);
});

test('first-paint options keep final fields and VAT amounts without intercepting live form selectors',()=>{
 const products=[end,middle],selection={end:2,middle:1};
 const live=purchaseProductOptionsMarkup(end,products,{selection});
 const initial=purchaseProductOptionsMarkup(end,products,{selection,initial:true});
 assert.match(initial,/^<div data-initial-purchase-options inert>/);
 assert.match(initial,/id="initial-saleModuleTotal"/);
 assert.match(initial,/data-initial-module="end"/);
 assert.match(initial,/data-price-gross="2600"/);
 assert.doesNotMatch(initial,/\b(?:id="sale|data-(?:module|sale-step|add|add-series|product)=)/);
 const restored=initial.replace(/^<div data-initial-purchase-options inert>/,'').replace(/<\/div>$/,'').replace(/id="initial-/g,'id="').replace(/data-initial-/g,'data-');
 assert.equal(restored,live,'the inert first paint must retain exactly the live form geometry, values and prices');
 const ordinary=purchaseProductOptionsMarkup(chair,[chair],{initial:true});
 assert.match(ordinary,/id="initial-saleQuantity"/);
 assert.match(ordinary,/data-initial-add="chair"/);
});

test('default module choices and totals agree with required bases and clicked modules',()=>{
 const products=[base,middle];
 assert.deepEqual(purchaseInitialSelection(base,products),{base:1,middle:0});
 assert.deepEqual(purchaseInitialSelection(middle,products),{base:1,middle:1});
 const state=purchaseModuleState(middle,products),markup=purchaseProductOptionsMarkup(middle,products);
 assert.equal(state.quote.total,2400);
 assert.equal(state.width,254);
 assert.deepEqual(state.limits,{base:1,middle:99});
 assert.match(state.totalHtml,/data-price-gross="2400"/);
 assert.match(state.totalHtml,/254 cm bred/);
 assert.match(state.previewHtml,/Valgt oppsett: 1 × Grunnsofa, 1 × Midt/);
 assert.match(inputFor(markup,'base'),/min="1" max="1" step="1" value="1"/);
 assert.match(inputFor(markup,'middle'),/min="0" max="99" step="1" value="1"/);
 assert.match(markup,/Grunnsofaen omfatter begge endene/);
 assert.match(markup,/data-sale-step="1" aria-label="Flere Grunnsofa" disabled/);
});

test('saved selections and endpoint errors use the same model as the visible editor',()=>{
 const products=[end,middle],selection=purchaseInitialSelection(end,products,{end:2,middle:3});
 assert.deepEqual(selection,{end:2,middle:3});
 const state=purchaseModuleState(end,products,selection),markup=purchaseProductOptionsMarkup(end,products,{selection,editing:true});
 assert.equal(state.quote.total,3800);
 assert.equal(state.width,394);
 assert.deepEqual(state.limits,{end:2,middle:99});
 assert.match(inputFor(markup,'middle'),/value="3"/);
 assert.match(markup,/>Lagre endringer<\/button>/);
 const invalid=purchaseModuleState(end,products,{end:3});
 assert.match(invalid.layoutError,/maks to endemoduler/);
 assert.match(invalid.previewHtml,/class="module-photo-empty"/);
 assert.match(purchaseProductOptionsMarkup(end,products,{selection:{end:3}}),/data-add-series="Sofa" disabled/);
 const empty=purchaseModuleState(end,products,{});
 assert.equal(empty.quote.total,0);
 assert.equal(empty.width,0);
 assert.equal(empty.layoutError,'');
 assert.match(empty.previewHtml,/Velg moduler for å se oppsettet/);
});

test('unpriced modules stay explicit and unavailable modules never become purchase controls',()=>{
 const unpriced={...middle,salePrice:null},inactive={...middle,id:'inactive',active:false},rentalOnly={...middle,id:'rental',saleEnabled:false},deleted={...middle,id:'deleted',deletedAt:'2026-11-19'};
 const products=[end,unpriced,inactive,rentalOnly,deleted],state=purchaseModuleState(end,products,{end:2,middle:1,inactive:1,rental:1,deleted:1});
 assert.deepEqual(state.modules.map(p=>p.id),['end','middle']);
 assert.equal(state.quote.knownSubtotal,2000);
 assert.equal(state.quote.total,null);
 assert.equal(state.quote.hasUnpriced,true);
 assert.match(state.totalHtml,/data-price-gross="2000"/);
 assert.match(state.totalHtml,/\+ produkter på forespørsel/);
 const markup=purchaseProductOptionsMarkup(end,products,{selection:state.selection});
 assert.match(markup,/Midt · Pris på forespørsel/);
 assert.doesNotMatch(markup,/data-module="(?:inactive|rental|deleted)"/);
});

test('colour choices retain selected states and become neutral first-paint controls',()=>{
 const white={...chair,id:'white',variantGroup:'Stol',variantLabel:'Hvit'},green={...white,id:'green',variantLabel:'Grønn'};
 const live=purchaseProductOptionsMarkup(white,[white,green]);
 assert.match(live,/Finnes i 2 farger · Valgt: Hvit/);
 assert.match(live,/data-product="white"[^>]*aria-pressed="true"/);
 assert.match(live,/data-product="green"[^>]*aria-pressed="false"/);
 const initial=purchaseProductOptionsMarkup(white,[white,green],{initial:true});
 assert.match(initial,/data-initial-product="green"/);
 assert.doesNotMatch(initial,/\bdata-product=/);
});
