import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../app-server.mjs';
test('missing pages return a useful branded 404 while API and file responses retain their types',async()=>{
 const server=createServer({env:{NODE_ENV:'test'}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 try{
  for(const route of ['/hus','/borte.html','/404.html','/leieprodukt.html?produkt=does-not-exist']){const r=await fetch(origin+route);assert.equal(r.status,404);assert.match(r.headers.get('content-type'),/text\/html/);assert.match(r.headers.get('x-robots-tag'),/noindex/);const body=await r.text();assert.match(body,/Siden finnes ikke/);assert.match(body,/href="\/utvalg.html/);}
  const api=await fetch(origin+'/api/not-found');assert.equal(api.status,404);assert.match(api.headers.get('content-type'),/json/);
  const catalog=await fetch(origin+'/api/catalog');assert.equal(catalog.status,200);
  const image=await fetch(origin+'/assets/not-found.png');assert.equal(image.status,404);assert.doesNotMatch(image.headers.get('content-type'),/html/);
  const head=await fetch(origin+'/hus',{method:'HEAD'});assert.equal(head.status,404);assert.equal(await head.text(),'');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
