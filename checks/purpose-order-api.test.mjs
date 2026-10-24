import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {validateCatalog} from '../server/catalog.mjs';
import {createServer,publicCatalog} from '../app-server.mjs';
import {digest} from '../server/auth.mjs';
import {matchesPurpose} from '../public/rental-purpose-model.js';
import {defaultSettings,configureSiteSettings} from '../public/site-settings.js';
import {memoryStore} from './helpers/memory-store.mjs';

// All request data is fictional; no production catalog, SMTP or Google API is used.
const fixture=()=>[
 {id:'priority_chair',name:'Teststol',category:'Stoler',material:'Testmateriale',description:'Fiktiv stol for API-kontroll.',type:'chair',color:'#445566',image:'/assets/test-chair.png',gallery:['/assets/test-chair-side.png'],price:123,weekPrice:456,monthPrice:789,purchaseUnitPrice:4455,rentalPricingMode:'manual',saleEnabled:true,salePrice:2345,rentalEnabled:true,stock:7,unavailable:2,active:true,isPackage:false,isService:false,isExample:false,purposesExplicit:true,purposes:['bedrift'],sortOrder:4},
 {id:'priority_table',name:'Testbord',category:'Bord',material:'Testmateriale',description:'Fiktivt bord for API-kontroll.',type:'coffee',color:'#667788',image:'/assets/test-table.png',gallery:[],price:89,weekPrice:321,monthPrice:654,rentalPricingMode:'manual',stock:5,unavailable:1,active:true,isPackage:false,isService:false,isExample:false,purposesExplicit:true,purposes:['jul','messe'],sortOrder:2}
];
const withoutPriority=product=>{const {purposeOrder,...rest}=product;return rest;};
const projection=products=>publicCatalog({revision:1,products,settings:structuredClone(defaultSettings)}).products;

test('purposeOrder survives catalog validation and public projection without changing commerce or imagery',()=>{
 const source=fixture(),baseline=validateCatalog(source),edited=structuredClone(source);
 edited[0].purposeOrder={jul:-3,bedrift:0,alle:8};
 const validated=validateCatalog(edited);
 assert.deepEqual(validated[0].purposeOrder,{jul:-3,bedrift:0,alle:8});
 assert.notEqual(validated[0].purposeOrder,edited[0].purposeOrder);
 assert.deepEqual(validated.map(withoutPriority),baseline.map(withoutPriority));
 const originalPublic=projection(baseline),updatedPublic=projection(validated);
 assert.deepEqual(updatedPublic.map(withoutPriority),originalPublic.map(withoutPriority));
 const chair=updatedPublic.find(p=>p.id==='priority_chair');
 assert.deepEqual(chair.purposeOrder,{jul:-3,bedrift:0,alle:8});
 assert.equal(chair.maxQuantity,5);
 assert.equal(chair.purchaseUnitPrice,undefined);
 assert.deepEqual(updatedPublic.map(p=>p.id),['priority_table','priority_chair']);
});

test('missing or cleared priorities normalize to empty objects, while zero remains explicit',()=>{
 const products=fixture();
 products[1].purposeOrder={};
 const validated=validateCatalog(products);
 assert.deepEqual(validated.map(p=>p.purposeOrder),[{},{}]);
 assert.deepEqual(projection(validated).map(p=>p.purposeOrder),[{},{}]);
 const bounds=validateCatalog([{...products[0],purposeOrder:{jul:-9999,bedrift:0,alle:9999}}])[0];
 assert.deepEqual(bounds.purposeOrder,{jul:-9999,bedrift:0,alle:9999});
});

test('catalog validation rejects malformed purpose priorities rather than silently dropping them',()=>{
 for(const purposeOrder of [null,[],42,'',{unknown:1},{event:1},{jul:'1'},{jul:''},{jul:null},{jul:true},{jul:1.5},{jul:10000},{jul:-10000},{jul:NaN},JSON.parse('{"__proto__":1}')]){
  assert.throws(()=>validateCatalog([{...fixture()[0],purposeOrder}]),/sortering per bruksområde/);
 }
});

test('a priority in a different purpose never enables a hidden purpose or changes membership',()=>{
 const before=validateCatalog(fixture()),after=validateCatalog(fixture().map(p=>({...p,purposeOrder:{jul:-10,boligsalg:0,fest:2}})));
 for(const purpose of ['boligsalg','messe','bedrift','fest','jul','alle']){
  const visible=products=>projection(products).filter(p=>matchesPurpose(p,purpose)).map(p=>p.id);
  assert.deepEqual(visible(after),visible(before),purpose);
 }
 const chair=after.find(p=>p.id==='priority_chair');
 assert.equal(matchesPurpose(chair,'jul'),false);
 assert.equal(matchesPurpose(chair,'bedrift'),true);
 assert.deepEqual(chair.purposes,['bedrift']);
});

test('authenticated admin save round-trips purpose priorities and invalidates cached public data',async()=>{
 const store=await memoryStore(),seed=await store.readCatalog();
 await store.saveCatalog(seed.revision,validateCatalog(fixture()));
 store.readSiteSettings=async()=>({revision:1,settings:structuredClone(defaultSettings)});
 const token=randomBytes(32).toString('base64url');
 await store.addSession(digest(token),Date.now()+60000);
 const origin='http://purpose-order.example.invalid',cookie='konsept_session='+token;
 const server=createServer({store,origin,secureCookies:false,publicCatalogCache:{ttlMs:60000}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const readPublic=async()=>{const response=await fetch(base+'/api/catalog');assert.equal(response.status,200);return response.json();};
 const put=(data,{source=origin,session=cookie}={})=>fetch(base+'/api/admin/catalog',{method:'PUT',headers:{Origin:source,cookie:session,'Content-Type':'application/json'},body:JSON.stringify(data)});
 try{
  const before=await readPublic();
  const response=await fetch(base+'/api/admin/catalog',{headers:{cookie}});
  assert.equal(response.status,200);
  const current=await response.json(),edited=structuredClone(current);
  edited.products.find(p=>p.id==='priority_chair').purposeOrder={jul:-6,bedrift:0};
  assert.equal((await put(edited,{session:''})).status,401);
  assert.equal((await put(edited,{source:'http://foreign.example.invalid'})).status,403);
  const malformed=structuredClone(edited);
  malformed.products[0].purposeOrder={jul:'-6'};
  assert.equal((await put(malformed)).status,400);
  assert.equal((await store.readCatalog()).revision,current.revision);
  const savedResponse=await put(edited);
  assert.equal(savedResponse.status,200);
  const saved=await savedResponse.json();
  assert.equal(saved.revision,current.revision+1);
  assert.deepEqual(saved.products.find(p=>p.id==='priority_chair').purposeOrder,{jul:-6,bedrift:0});
  assert.deepEqual(saved.products.map(withoutPriority),current.products.map(withoutPriority));
  const stored=await store.readCatalog(),after=await readPublic();
  assert.equal(after.revision,saved.revision);
  assert.deepEqual(stored.products.find(p=>p.id==='priority_chair').purposeOrder,{jul:-6,bedrift:0});
  assert.deepEqual(after.products.find(p=>p.id==='priority_chair').purposeOrder,{jul:-6,bedrift:0});
  assert.deepEqual(after.products.map(withoutPriority),before.products.map(withoutPriority));
  assert.equal((await put(edited)).status,409);
  saved.products.find(p=>p.id==='priority_chair').purposeOrder={};
  assert.equal((await put(saved)).status,200);
  assert.deepEqual((await readPublic()).products.find(p=>p.id==='priority_chair').purposeOrder,{});
 }finally{
  await new Promise(resolve=>server.close(resolve));
  configureSiteSettings();
 }
});
