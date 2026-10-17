import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createServer} from '../app-server.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
import {changeProductLifecycle,productDependencies} from '../server/product-lifecycle.mjs';
import {validateCatalog} from '../server/catalog.mjs';

test('Trash requires no incoming links, keeps data, restores hidden and blocks broken restores',async()=>{
 const data=await (await memoryStore()).readCatalog();const bed=data.products.find(p=>p.name==='Sammenleggbar stylingseng ILSKOV');assert(productDependencies(data.products,bed.id).length>=2);assert.throws(()=>changeProductLifecycle(data.products,bed.id,'trash'),/Fjern koblingene/);
 const table=data.products.find(p=>p.name==='Charlie bord, svart');const deleted=validateCatalog(changeProductLifecycle(data.products,table.id,'trash'));const row=deleted.find(p=>p.id===table.id);assert(row.deletedAt);assert.equal(row.active,false);for(const key of ['image','price','stock','name'])assert.equal(row[key],table[key]);const restored=changeProductLifecycle(deleted,table.id,'restore').find(p=>p.id===table.id);assert.equal(restored.deletedAt,'');assert.equal(restored.active,false);
 const invalid=structuredClone(deleted);invalid.find(p=>p.id===table.id).active=true;assert.throws(()=>validateCatalog(invalid),/slettet produkt/);
 const owner={...table,id:'test_owner',isPackage:true,category:'Pakker',components:[{id:table.id,quantity:1}],deletedAt:new Date().toISOString(),active:false};assert.throws(()=>changeProductLifecycle([...deleted,owner],owner.id,'restore'),/Gjenopprett først/);
});
test('Live HTTP trash/restore enforces auth, origin, revisions and public visibility',async()=>{
 const store=await memoryStore(),key=randomBytes(24).toString('base64url'),password=randomBytes(18).toString('base64url'),origin='http://admin.example.invalid';const server=createServer({store,setupKey:key,origin,secureCookies:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body,cookie='',source=origin)=>fetch(base+path,{method:'POST',headers:{Origin:source,'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
 try{
  let data=await store.readCatalog();const table=data.products.find(p=>p.name==='Charlie bord, svart'),url='/api/admin/products/'+table.id;
  assert.equal((await post(url+'/trash',{revision:data.revision})).status,401);const setup=await post('/api/admin/setup',{key,email:'admin@example.invalid',password});const cookie=setup.headers.get('set-cookie').split(';')[0];
  assert.equal((await post(url+'/trash',{revision:data.revision},cookie,'https://foreign.invalid')).status,403);
  assert.equal((await post(url+'/trash',{revision:-1},cookie)).status,409);
  const bed=data.products.find(p=>p.name==='Sammenleggbar stylingseng ILSKOV');assert.equal((await post('/api/admin/products/'+bed.id+'/trash',{revision:data.revision},cookie)).status,409);
  let response=await post(url+'/trash',{revision:data.revision},cookie);assert.equal(response.status,200);data=await response.json();assert(data.products.find(p=>p.id===table.id).deletedAt);assert.equal(data.products.length,54);assert.equal((await (await fetch(base+'/api/catalog')).json()).products.some(p=>p.id===table.id),false);
  response=await post(url+'/restore',{revision:data.revision},cookie);assert.equal(response.status,200);data=await response.json();assert.equal(data.products.find(p=>p.id===table.id).deletedAt,'');assert.equal(data.products.find(p=>p.id===table.id).active,false);assert.equal(data.products.find(p=>p.id===table.id).image,table.image);
 }finally{await new Promise(r=>server.close(r));}
});
