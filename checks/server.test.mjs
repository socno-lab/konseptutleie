import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
test('Portable server serves catalog and images while admin and private files remain unavailable',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(origin+'/')).status,200);
  const catalog=await (await fetch(origin+'/api/catalog')).json();
  assert.equal(catalog.canAdmin,false);
  const tables=catalog.products.filter(p=>/^Spisebord, eikefarget/.test(p.name));
  assert.equal(tables.length,2);assert.ok(tables.every(p=>p.maxQuantity===5));
  const image=await fetch(origin+tables[0].image);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');
  assert.equal((await fetch(origin+'/api/admin/catalog',{method:'PUT',headers:{'oai-authenticated-user-email':'admin@example.invalid'}})).status,503);
  assert.equal((await fetch(origin+'/admin/')).status,503);
  assert.equal((await fetch(origin+'/admin/index.html')).status,503);
  assert.equal((await fetch(origin+'/.env')).status,404);
  assert.equal((await fetch(origin+'/data/catalog-export-2026-10-17.json')).status,404);
  assert.equal((await fetch(origin+'/api/catalog',{method:'POST'})).status,405);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
