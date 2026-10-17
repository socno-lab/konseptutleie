import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from '../app-server.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
import {planTrashPurge} from '../server/trash-purge.mjs';

test('Permanent product deletion protects references from live and trashed owners, supports batch deletion',async()=>{
 const catalog=await (await memoryStore()).readCatalog(),item={...catalog.products[0],id:'purge_item',deletedAt:new Date().toISOString(),active:false,isPackage:false,components:[]},owner={...item,id:'purge_owner',relatedAddOns:[item.id]};
 const c={products:[item,owner]},input={productIds:[item.id],mediaUrls:[],confirmation:'SLETT'};
 assert.throws(()=>planTrashPurge(c,[],input),/koblet til/);
 assert.throws(()=>planTrashPurge({products:[{...item,deletedAt:''}]},[],input),/Bare produkter/);
 assert.throws(()=>planTrashPurge(c,[],{...input,confirmation:''}),/Skriv SLETT/);
 assert.deepEqual(planTrashPurge(c,[],{...input,productIds:[item.id,owner.id]}).products,[]);
 const image={url:item.image,name:'fixture',deletedAt:new Date().toISOString()};
 assert.throws(()=>planTrashPurge(c,[image],{productIds:[],mediaUrls:[item.image],confirmation:'SLETT'}),/brukes av/);
 assert.equal(planTrashPurge(c,[image],{productIds:[item.id,owner.id],mediaUrls:[item.image],confirmation:'SLETT'}).mediaUrls.length,1);
});

test('Permanent trash API checks auth, origin, confirmation and revision; removes upload bytes and blocks bundled images after restart',async()=>{
 const store=await memoryStore(),key=randomBytes(24).toString('base64url'),origin='http://admin.example.invalid',server=createServer({store,setupKey:key,origin,secureCookies:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body,cookie='',source=origin)=>fetch(base+path,{method:'POST',headers:{Origin:source,'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
 try{
  assert.equal((await post('/api/admin/trash/purge',{})).status,401);
  const setup=await post('/api/admin/setup',{key,email:'admin@example.invalid',password:randomBytes(18).toString('base64url')}),cookie=setup.headers.get('set-cookie').split(';')[0];
  const catalog=await store.readCatalog(),table=catalog.products.find(p=>p.name==='Charlie bord, svart');
  const trashed=await (await post('/api/admin/products/'+table.id+'/trash',{revision:catalog.revision},cookie)).json();
  const input={revision:trashed.revision,productIds:[table.id],mediaUrls:[],confirmation:'SLETT'};
  assert.equal((await post('/api/admin/trash/purge',input,cookie,'https://foreign.invalid')).status,403);
  assert.equal((await post('/api/admin/trash/purge',{...input,confirmation:''},cookie)).status,400);
  assert.equal((await post('/api/admin/trash/purge',{...input,revision:-1},cookie)).status,409);
  const purged=await post('/api/admin/trash/purge',input,cookie);assert.equal(purged.status,200);const after=await purged.json();assert(!after.products.some(p=>p.id===table.id));assert.equal(after.products.length,catalog.products.length-1);
  assert.equal((await post('/api/admin/products/'+table.id+'/restore',{revision:after.revision},cookie)).status,404);
  const bytes=await readFile(new URL('../public/assets/verticus-eik-hvit.jpg',import.meta.url)),upload=await store.addMedia('fixture.jpg','image/jpeg',bytes);
  const imageInput={revision:after.revision,productIds:[],mediaUrls:[upload.url],confirmation:'SLETT'};
  assert.equal((await post('/api/admin/trash/purge',imageInput,cookie)).status,409);
  await post('/api/admin/media/trash',{url:upload.url},cookie);
  assert.equal((await post('/api/admin/trash/purge',imageInput,cookie)).status,200);
  assert.equal(await store.media(upload.id),null);assert.equal((await fetch(base+upload.url)).status,404);
  const library=await (await fetch(base+'/api/admin/media',{headers:{cookie}})).json();assert(!library.images.some(m=>m.url===upload.url));
  const unused=library.images.find(m=>m.source==='asset'&&!m.usedBy.length);await post('/api/admin/media/trash',{url:unused.url},cookie);
  const current=await store.readCatalog();assert.equal((await post('/api/admin/trash/purge',{revision:current.revision,productIds:[],mediaUrls:[unused.url],confirmation:'SLETT'},cookie)).status,200);
  assert.equal((await fetch(base+unused.url)).status,404);assert.equal((await post('/api/admin/media/restore',{url:unused.url},cookie)).status,404);
  const latest=await store.readCatalog();latest.products[0].image=unused.url;
  assert.equal((await fetch(base+'/api/admin/catalog',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json',cookie},body:JSON.stringify(latest)})).status,409);
  const restarted=createServer({store,origin,secureCookies:false});await new Promise(r=>restarted.listen(0,'127.0.0.1',r));try{assert.equal((await fetch('http://127.0.0.1:'+restarted.address().port+unused.url)).status,404);}finally{await new Promise(r=>restarted.close(r));}
 }finally{await new Promise(r=>server.close(r));}
});
