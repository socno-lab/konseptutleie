import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createServer} from '../app-server.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
test('Image trash protects used images, retains bytes and restores uploads and bundled assets',async()=>{
 const store=await memoryStore(),key=randomBytes(24).toString('base64url'),password=randomBytes(18).toString('base64url'),origin='http://admin.example.invalid';const server=createServer({store,setupKey:key,origin,secureCookies:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(path,body,cookie='',source=origin)=>fetch(base+path,{method:'POST',headers:{Origin:source,'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
 try{
  assert.equal((await post('/api/admin/media/trash',{url:'/assets/example.png'})).status,401);
  const setup=await post('/api/admin/setup',{key,email:'admin@example.invalid',password});const cookie=setup.headers.get('set-cookie').split(';')[0];
  const catalog=await store.readCatalog(),used=catalog.products.find(p=>p.image.startsWith('/assets/')).image;
  assert.equal((await post('/api/admin/media/trash',{url:used},cookie)).status,409);
  assert.equal((await post('/api/admin/media/trash',{url:used},cookie,'https://foreign.invalid')).status,403);
  assert.equal((await post('/api/admin/media/trash',{url:'/assets/missing.png'},cookie)).status,404);
  const bytes=await readFile(new URL('../public/assets/verticus-eik-hvit.jpg',import.meta.url));const uploaded=await store.addMedia('test.jpg','image/jpeg',bytes);
  assert.equal((await post('/api/admin/media/trash',{url:uploaded.url},cookie)).status,200);
  let library=await (await fetch(base+'/api/admin/media',{headers:{cookie}})).json();assert(library.images.find(m=>m.url===uploaded.url).deletedAt);assert.equal((await fetch(base+uploaded.url)).status,200);
  assert.equal((await post('/api/admin/media/restore',{url:uploaded.url},cookie)).status,200);
  library=await (await fetch(base+'/api/admin/media',{headers:{cookie}})).json();assert.equal(library.images.find(m=>m.url===uploaded.url).deletedAt,'');
  const unused=library.images.find(m=>m.source==='asset'&&!m.usedBy.length);assert(unused);assert.equal((await post('/api/admin/media/trash',{url:unused.url},cookie)).status,200);assert.equal((await post('/api/admin/media/restore',{url:unused.url},cookie)).status,200);
  assert.deepEqual(await store.readCatalog(),catalog);
 }finally{await new Promise(r=>server.close(r));}
});
