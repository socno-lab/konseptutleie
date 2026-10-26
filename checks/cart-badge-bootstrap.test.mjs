import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {publicHtmlNames,readHtmlTemplate} from '../server/html-templates.mjs';

const source=await readFile(new URL('../public/cart-badge-bootstrap.js',import.meta.url),'utf8');
function browser({local={},session={},blocked=false}={}){
 const nodes=new Map(),listeners=new Map(),header={nextElementSibling:null};
 let observer,active=false;
 const storage=values=>({getItem(key){if(blocked)throw Error('Storage unavailable');return values[key]??null;}});
 const context={window:{localStorage:storage(local),sessionStorage:storage(session)},document:{documentElement:{},getElementById:id=>nodes.get(id),addEventListener:(name,handler)=>listeners.set(name,handler)},MutationObserver:class {
  constructor(handler){observer=handler;}
  observe(){active=true;}
  disconnect(){active=false;}
 }};
 vm.runInNewContext(source,context);
 return {
  append(id='count',text='0'){const node={textContent:text,closest:selector=>selector==='header'?header:null};nodes.set(id,node);if(active)observer();return node;},
  parseText(node,text){node.textContent+=text;if(active)observer();},
  finishHeader(){header.nextElementSibling={};if(active)observer();},
  finishDocument(){listeners.get('DOMContentLoaded')?.();},
  changed(){if(active)observer();},
  get observing(){return active;}
 };
}

test('saved rental quantities appear while parsing, without waiting for catalogue modules',()=>{
 const page=browser({local:{'konsept-cart-v1':JSON.stringify({chair:2,'sofa-end':2,'sofa-middle':1,textile:1,package:1})},session:{'konsept-custom-request-v1':JSON.stringify({active:true,text:'Et tilpasset bord'})}});
 const badge=page.append();
 assert.equal(badge.textContent,'8','same basket sum as the rental app; sofa/package metadata is not added twice');
 page.finishHeader();assert.equal(page.observing,false);
 badge.textContent='7';page.changed();assert.equal(badge.textContent,'7','catalogue validation retains authority after bootstrap');
});

test('rental and purchase badges use their separate saved baskets',()=>{
 const settings={local:{'konsept-cart-v1':'{"chair":2}','konsept-sale-cart-v1':'{"table":4,"chair":3}'},session:{'konsept-custom-request-v1':'{"active":true,"text":"Something else"}'}};
 assert.equal(browser(settings).append('count').textContent,'3');
 assert.equal(browser(settings).append('saleCount').textContent,'7');
});

test('empty, unavailable and malformed storage produce a safe empty count',()=>{
 for(const settings of [{},{blocked:true},{local:{'konsept-cart-v1':'{' }},{local:{'konsept-cart-v1':'[1,2,3]'}},{local:{'konsept-cart-v1':'null'}}])assert.equal(browser(settings).append().textContent,'0');
 assert.equal(browser({local:{'konsept-cart-v1':'{"ok":2,"legacy":"3","bad":"text","zero":0,"negative":-1,"fraction":1.5,"tooLarge":100}'},session:{'konsept-custom-request-v1':'{"active":"true","text":"No"}'}}).append().textContent,'5');
 assert.equal(browser({local:{'konsept-sale-cart-v1':'{"ok":2,"string":"3"}'}}).append('saleCount').textContent,'2','purchase quantities are strict integers');
});

test('network chunks cannot append the original fallback digit to a restored count',()=>{
 const page=browser({local:{'konsept-cart-v1':'{"chair":6}'}}),badge=page.append('count','');
 assert.equal(badge.textContent,'6');
 page.parseText(badge,'0');assert.equal(badge.textContent,'6');
 page.finishHeader();assert.equal(page.observing,false);
});

test('bootstrap disconnects at DOM ready even if the page has no count node',()=>{
 const page=browser();assert.equal(page.observing,true);page.finishDocument();assert.equal(page.observing,false);
});

test('an early purchase-cart refresh cannot clear the saved basket before the catalogue arrives',async()=>{
 const shop=await readFile(new URL('../public/shop.js',import.meta.url),'utf8');
 const render=shop.slice(shop.indexOf('function renderCart(){'),shop.indexOf('function saleSofaRows(){'));
 const state={catalogReady:false,basket:{chair:2},products:[],enquiryFlow:{ready(){assert.fail('The cart must remain pending');}},saleEstimate(){assert.fail('An empty not-yet-loaded catalogue is not an empty basket');},save(){assert.fail('Saved basket must remain untouched');}};
 vm.runInNewContext(render+'\nrenderCart();',state);
 assert.deepEqual(state.basket,{chair:2});
});

test('storefront basket templates run a same-origin classic bootstrap before body and deferred app scripts',async()=>{
 for(const name of publicHtmlNames){
  const html=await readHtmlTemplate(name),head=html.slice(0,html.indexOf('</head>'));
  if(name==='kundeinfo.html'){assert.doesNotMatch(head,/cart-badge-bootstrap/);continue;}
  const scripts=[...head.matchAll(/<script\b([^>]*)src="(\/cart-badge-bootstrap\.js\?[^\"]*)"([^>]*)><\/script>/g)];
  assert.equal(scripts.length,1,name);
  assert.doesNotMatch(scripts[0][1]+scripts[0][3],/\b(?:type|defer|async)\b/,'must execute while parsing');
  assert.match(scripts[0][2],/cartfirstpaint20261026/);
  assert.doesNotMatch(html,/<span id="(?:count|saleCount)">…<\/span>/);
 }
});
