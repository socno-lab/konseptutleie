import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {createServer} from '../app-server.mjs';
import {validateCatalog} from '../server/catalog.mjs';
import {migrateProducts} from '../server/walls.mjs';
import {isWall,presetFrames} from '../public/wall-model.js';
import {imageMime} from '../server/images.mjs';

import {memoryStore} from './helpers/memory-store.mjs';
test('Admin setup, sessions, CSRF, revision conflicts, media assignment and wall metadata',async()=>{
 const store=await memoryStore(),key=randomBytes(24).toString('base64url'),password=randomBytes(18).toString('base64url'),origin='http://admin.example.invalid';
 const server=createServer({store,setupKey:key,origin,secureCookies:false});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=(url,body,cookie='',extra={})=>fetch(base+url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie,...extra},body:JSON.stringify(body)});
 let cookie='';
 try{
  assert.equal((await fetch(base+'/api/admin/catalog',{headers:{'oai-authenticated-user-id':'spoof','oai-authenticated-user-email':'admin@example.invalid'}})).status,401);
  assert.equal((await fetch(base+'/admin',{redirect:'manual'})).headers.get('location'),'/admin/login');
  assert.equal((await fetch(base+'/admin/index.html',{redirect:'manual'})).status,302);
  assert.equal((await post('/api/admin/setup',{key,email:'admin@example.invalid',password},'',{Origin:'https://foreign.invalid'})).status,403);
  assert.equal((await post('/api/admin/setup',{key:'wrong',email:'admin@example.invalid',password})).status,403);
  const setup=await post('/api/admin/setup',{key,email:'admin@example.invalid',password});assert.equal(setup.status,200);cookie=setup.headers.get('set-cookie').split(';')[0];assert.match(setup.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  assert.equal((await post('/api/admin/setup',{key,email:'other@example.invalid',password})).status,409);
  assert.equal((await fetch(base+'/api/admin/status')).status,200);
  assert.equal((await (await fetch(base+'/api/admin/status')).json()).setupRequired,false);
  assert.equal((await fetch(base+'/admin',{headers:{cookie}})).status,200);
  const data=await (await fetch(base+'/api/admin/catalog',{headers:{cookie}})).json();assert.equal(data.products.length,54);
  const put=(catalog,rev=data.revision)=>fetch(base+'/api/admin/catalog',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json',cookie},body:JSON.stringify({revision:rev,products:catalog})});
  const wall=data.products.find(isWall),renamed=structuredClone(data.products);renamed.find(p=>p.id===wall.id).name='Nytt valgnavn';
  const saved=await put(renamed);assert.equal(saved.status,200);let current=await saved.json();assert.ok(isWall(current.products.find(p=>p.id===wall.id)));
  assert.equal((await put(data.products)).status,409);
  assert.equal((await fetch(base+'/api/admin/media',{method:'POST',headers:{Origin:origin,cookie,'Content-Type':'image/png'},body:'<svg onload="alert(1)"></svg>'})).status,415);
  const png=await readFile(new URL('../public/assets/spisebord-eikefarget-illustrasjon.png',import.meta.url));
  const upload=await fetch(base+'/api/admin/media',{method:'POST',headers:{Origin:origin,cookie,'Content-Type':'image/png','X-Filename':'bord.png'},body:png});assert.equal(upload.status,201);const image=await upload.json();assert.match(image.url,/^\/media\/[a-f0-9]{32}$/);
  assert.equal((await fetch(base+image.url)).headers.get('content-type'),'image/png');
  current.products.find(p=>p.id===wall.id).image=image.url;const assigned=await put(current.products,current.revision);assert.equal(assigned.status,200);
  const library=await (await fetch(base+'/api/admin/media',{headers:{cookie}})).json();assert.ok(library.images.find(m=>m.url===image.url).usedBy.some(p=>p.id===wall.id));
  assert.equal((await post('/api/admin/logout',{},cookie)).status,200);assert.equal((await fetch(base+'/api/admin/catalog',{headers:{cookie}})).status,401);
  assert.equal((await post('/api/admin/login',{email:'admin@example.invalid',password:'incorrect'})).status,401);
  const login=await post('/api/admin/login',{email:'admin@example.invalid',password});assert.equal(login.status,200);assert.notEqual(login.headers.get('set-cookie').split(';')[0],cookie);
 }finally{await new Promise(r=>server.close(r));}
});
test('Product validation rejects invalid walls and preserves ordinary products without module settings',async()=>{
 const store=await memoryStore(),data=await store.readCatalog();const valid=validateCatalog(data.products);assert.equal(valid.length,54);
 const table=valid.find(p=>p.name==='Charlie bord, svart');assert.equal(table.moduleSeries,'');assert.equal(table.moduleRole,'');
 const wall=valid.find(isWall);const changed=structuredClone(valid);changed.find(p=>p.id===wall.id).wallFrames=[{x:90,y:0,width:30,height:10}];assert.throws(()=>validateCatalog(changed),/Rammene/);
 assert.equal(presetFrames('quad').length,4);assert.equal(imageMime(Buffer.from('<html>not an image</html>')),null);
});
