import test from 'node:test';
import assert from 'node:assert/strict';
import {rememberRentalPurpose,rememberedRentalPurpose,rememberedPurposeState} from '../public/rental-purpose-memory.js';
const storage=values=>{const map=new Map(Object.entries(values||{}));return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};};
test('a new tab restores the concrete purpose together with a persistent basket',()=>{
 const localStorage=storage(),first={localStorage,sessionStorage:storage()};rememberRentalPurpose('boligsalg',first);
 const reopened={localStorage,sessionStorage:storage()};assert.equal(rememberedRentalPurpose(reopened),'boligsalg');
 assert.equal(rememberedPurposeState('https://konseptuell.no/utvalg.html?bruk=alle',reopened,{hasItems:true}).purpose,'boligsalg');
 assert.equal(rememberedPurposeState('https://konseptuell.no/leieprodukt.html?produkt=chair',reopened,{hasItems:true}).purpose,'boligsalg');
 assert.equal(rememberedPurposeState('https://konseptuell.no/utvalg.html?bruk=messe',reopened,{hasItems:true}).purpose,'messe');
});
test('view all does not erase the remembered cart purpose; explicit all remains possible without a basket',()=>{
 const host={localStorage:storage(),sessionStorage:storage()};rememberRentalPurpose('fest',host);rememberRentalPurpose('alle',host);
 assert.equal(rememberedRentalPurpose(host),'fest');assert.equal(rememberedPurposeState('https://konseptuell.no/utvalg.html?bruk=alle',host).purpose,'alle');
});
test('legacy confirmed draft restores a purpose but an internal tariff alone never invents one',()=>{
 const host={localStorage:storage({'konsept-rental-scope-v1':'standard'}),sessionStorage:storage({'konsept-enquiry-draft-rent':JSON.stringify({occasion:'Boligfoto og visning',occasionConfirmed:true})})};assert.equal(rememberedRentalPurpose(host),'boligsalg');
 host.sessionStorage=storage({'konsept-enquiry-draft-rent':JSON.stringify({occasion:'Boligfoto og visning',occasionConfirmed:false})});assert.equal(rememberedRentalPurpose(host),'alle');
});
test('blocked or corrupt storage leaves a new visitor unconfirmed',()=>{
 const host={get localStorage(){throw Error('blocked');},sessionStorage:{getItem:()=>'{broken',setItem(){throw Error('blocked');}}};assert.equal(rememberedRentalPurpose(host),'alle');assert.doesNotThrow(()=>rememberRentalPurpose('messe',host));
});
