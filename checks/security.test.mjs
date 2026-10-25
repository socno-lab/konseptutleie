import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequestGuard} from '../server/request-guard.mjs';
import {createServer} from '../app-server.mjs';
import {createDeliveryEstimator} from '../server/delivery.mjs';
import {storageNoticeDismissed,rememberStorageNotice} from '../public/storage-notice.js';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('HTTPS hosting sends host-only HSTS on pages, API responses and assets; HTTP preview stays unchanged',async()=>{
 for(const origin of ['https://konseptuell.no','http://127.0.0.1:8932']){
  const server=createServer({env:{},origin});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{for(const route of ['/','/style.css','/api/delivery-estimate']){
   const response=await fetch('http://127.0.0.1:'+server.address().port+route);
   assert.equal(response.headers.get('strict-transport-security'),origin.startsWith('https:')?'max-age=31536000':null);
  }}finally{await new Promise(resolve=>server.close(resolve));}
 }
});
test('Essential storage notice persists across sessions, migrates old sessions and expires',()=>{
 const saved=storage(),session=storage(),now=1000000;
 assert.equal(storageNoticeDismissed(saved,session,now),false);
 rememberStorageNotice(saved,session,now);
 assert.equal(storageNoticeDismissed(saved,storage(),now+86400000),true);
 assert.equal(storageNoticeDismissed(saved,storage(),now+181*86400000),false);
 const old=storage(),next=storage();old.setItem('konsept-cookie-info-v1','closed');
 assert.equal(storageNoticeDismissed(next,old,now),true);assert.equal(old.getItem('konsept-cookie-info-v1'),null);
 assert.equal(storageNoticeDismissed(next,storage(),now+100),true);
 assert.equal(storageNoticeDismissed(undefined,undefined,now),false);
 const fallback=storage();rememberStorageNotice(undefined,fallback,now);assert.equal(storageNoticeDismissed(undefined,fallback,now),true);
 next.setItem('konsept-cookie-info-v1','bad-json');assert.equal(storageNoticeDismissed(next,storage(),now),false);
});
test('Request guard bounds client/global work, concurrent requests and memory; recovery is timed',()=>{
 let now=0;const enter=createRequestGuard({now:()=>now,maxClients:2});
 const releases=Array.from({length:12},()=>enter('a'));assert.ok(releases.every(Boolean));assert.equal(enter('a'),null);
 for(const release of releases){release();release();}
 for(let i=12;i<120;i++){const release=enter('a');assert.ok(release);release();}assert.equal(enter('a'),null);
 enter('b')();assert.equal(enter('c'),null);now=60001;assert.ok(enter('c'));
 const global=createRequestGuard({now:()=>now});for(let i=0;i<600;i++)global(String(i))();assert.equal(global('new'),null);
});
test('API flood is rejected before database work, forwarding headers cannot bypass it',async()=>{
 let reads=0;const server=createServer({store:{enabled:true,readCatalog:async()=>{reads++;return {products:[]};}},requestGuard:{now:()=>0}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{for(let i=0;i<120;i++)assert.equal((await fetch(base+'/api/catalog',{headers:{'X-Forwarded-For':'10.1.1.'+i}})).status,200);
 const beforeDenied=reads;assert.ok(beforeDenied>0&&beforeDenied<=120);
 const denied=await fetch(base+'/api/catalog');assert.equal(denied.status,429);assert.equal(denied.headers.get('retry-after'),'60');assert.equal(reads,beforeDenied,'rate-limited requests must not reach storage, including with catalog caching');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('Empty baskets and invalid JSON never reach paid Google routing',async()=>{
 let calls=0;const estimator=createDeliveryEstimator({GOOGLE_MAPS_API_KEY:'not-real'},async()=>{calls++;throw Error('must not call');});
 for(const basket of [{},[],null])await assert.rejects(()=>estimator.estimate({address:'Gate 1, 2010 Strømmen',visits:1,basket}),{status:400});assert.equal(calls,0);
 const server=createServer({env:{},origin:'https://example.invalid'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{const response=await fetch(base+'/api/delivery-estimate',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:'null'});assert.equal(response.status,400);
 const home=await fetch(base+'/');assert.match(home.headers.get('content-security-policy'),/script-src 'self'/);assert.match(home.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(await home.text(),/http-equiv="Content-Security-Policy"/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('Only two authentication requests can occupy password verification at once',async()=>{
 let entered=0,release;const gate=new Promise(resolve=>release=resolve);
 const server=createServer({origin:'https://example.invalid',store:{enabled:true,attempt:async()=>true,admin:async()=>{entered++;await gate;return null;}}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const login=()=>fetch(base+'/api/admin/login',{method:'POST',headers:{Origin:'https://example.invalid','Content-Type':'application/json'},body:JSON.stringify({email:'test@example.invalid',password:'invalid-test-password'})});
 const first=login(),second=login();
 try{while(entered<2)await new Promise(resolve=>setImmediate(resolve));const third=await login();assert.equal(third.status,429);assert.equal(entered,2);release();assert.equal((await first).status,401);assert.equal((await second).status,401);
 }finally{release();await Promise.allSettled([first,second]);await new Promise(resolve=>server.close(resolve));}
});
