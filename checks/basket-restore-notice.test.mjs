import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeBasket} from '../public/catalog-model.js';
import {saveSofa,restoreSofas} from '../public/sofa-model.js';
const source=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const sameBasket=vm.runInNewContext('('+source.match(/function sameBasket\(a,b\)\{[^\n]+/)[0]+')');
const end={id:'end',moduleSeries:'S',moduleRole:'end',moduleWidth:92,active:true,stock:6,unavailable:0,price:600};
const bed={id:'bed',active:true,stock:6,unavailable:0,price:300};
const products=[end,bed];
let saved=saveSofa([],{bed:1},products,{id:'a',series:'S',selection:{end:2},textileId:''});
for(let i=0;i<3;i++){
 const normalized=normalizeBasket(saved.cart,products);
 const restored=restoreSofas(normalized,saved.setups,products);
 assert.equal(sameBasket(saved.cart,normalized),true);
 assert.equal(sameBasket(normalized,restored.cart),true);
 saved=restored;
}
assert.equal(sameBasket(saved.cart,normalizeBasket(saved.cart,[{...end,stock:1},bed])),false);
assert.equal(sameBasket(saved.cart,normalizeBasket(saved.cart,[bed])),false);
assert.equal(sameBasket({end:2},{end:1}),false);
assert.match(source,/let changed=!sameBasket\(normalized,cart\)/);
assert.match(source,/changed=changed\|\|!sameBasket\(cart,normalized\)/);
