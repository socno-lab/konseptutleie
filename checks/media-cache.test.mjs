import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createCatalogThumbnailer} from '../server/catalog-thumbnails.mjs';
import {createServer} from '../app-server.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
const image={mime:'image/jpeg',body:Buffer.from('original')};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('thumbnail hits precede blob loading, requests deduplicate, cache evicts and clear invalidates',async()=>{
 let loads=0,transforms=0;const thumbnails=createCatalogThumbnailer({maxBytes:4,maxEntries:2,transform:async()=>{transforms++;return Buffer.from('xx');}}),load=async()=>{loads++;return image;};
 const [a,b]=await Promise.all([thumbnails.get('a',320,load),thumbnails.get('a',320,load)]);assert.equal(a,b);assert.equal(loads,1);assert.equal(transforms,1);await tick();
 await thumbnails.get('a',320,load);assert.equal(loads,1);await thumbnails.get('b',640,load);await tick();await thumbnails.get('c',1280,load);await tick();await thumbnails.get('a',320,load);assert.equal(loads,4);await tick();
 thumbnails.clear();await thumbnails.get('a',320,load);assert.equal(loads,5);assert.equal(await thumbnails.get('a',999,load),null);assert.equal(loads,5);
});

test('thumbnail workers and queue are bounded and never fetch an original as an overload fallback',async()=>{
 let release,loads=0;const thumbnails=createCatalogThumbnailer({maxConcurrent:1,maxQueued:1,maxWaitMs:1000,transform:async()=>{await new Promise(resolve=>{release=resolve;});return Buffer.from('thumb');}}),load=async()=>{loads++;return image;};
 const first=thumbnails.get('one',320,load);await tick();const queued=thumbnails.get('two',320,load);assert.equal(thumbnails.get('one',320,load),first);
 await assert.rejects(thumbnails.get('three',320,load),{status:503});assert.equal(loads,1);release();await first;await tick();assert.equal(loads,2);release();await queued;
});

test('a queued timeout and an invalidated conversion cannot retain stale cache data',async()=>{
 let release,loads=0;const thumbnails=createCatalogThumbnailer({maxConcurrent:1,maxQueued:1,maxWaitMs:10,transform:async()=>{await new Promise(resolve=>{release=resolve;});return Buffer.from('thumb');}}),load=async()=>{loads++;return image;};
 const first=thumbnails.get('one',320,load);await tick();await assert.rejects(thumbnails.get('two',320,load),{status:503});assert.equal(loads,1);thumbnails.clear();release();await first;await tick();const again=thumbnails.get('one',320,load);await tick();assert.equal(loads,2);release();await again;
});

test('HTTP media cache avoids repeated blob reads, checks purge before cache and permits production image indexing',async()=>{
 const store=await memoryStore(),bytes=await sharp({create:{width:1600,height:1000,channels:3,background:'#fff'}}).png().toBuffer(),uploaded=await store.addMedia('public.png','image/png',bytes),read=store.media.bind(store);let reads=0,purged=false;store.media=async id=>{reads++;return read(id);};store.mediaPurged=async()=>purged;
 const server=createServer({origin:'https://konseptuell.no',env:{},store});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,headers={'X-Forwarded-Host':'konseptuell.no'};
 try{
  const first=await fetch(base+uploaded.url+'?thumb=320',{headers});assert.equal(first.status,200);assert.match(first.headers.get('x-robots-tag'),/^index/);assert.match(first.headers.get('cache-control'),/immutable/);assert.equal((await sharp(Buffer.from(await first.arrayBuffer())).metadata()).width,320);
  const same=await fetch(base+uploaded.url+'?thumb=320',{headers});assert.equal(same.status,200);await same.arrayBuffer();assert.equal(reads,1);
  const wide=await fetch(base+uploaded.url+'?thumb=1280',{headers});assert.equal(wide.status,200);assert.equal((await sharp(Buffer.from(await wide.arrayBuffer())).metadata()).width,1280);assert.equal(reads,2);
  assert.equal((await fetch(base+uploaded.url+'?thumb=999',{headers})).status,400);assert.equal(reads,2);
  purged=true;assert.equal((await fetch(base+uploaded.url+'?thumb=320',{headers})).status,404);assert.equal(reads,2);
  purged=false;const preview=await fetch(base+uploaded.url+'?thumb=320');assert.match(preview.headers.get('x-robots-tag'),/noindex/);await preview.arrayBuffer();assert.equal(reads,2);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('failed thumbnail conversion returns a small retryable response rather than original image bytes',async()=>{
 const store=await memoryStore(),uploaded=await store.addMedia('public.jpg','image/jpeg',Buffer.alloc(100000,1));const server=createServer({store,thumbnailOptions:{transform:async()=>{throw Error('conversion failed');}}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const response=await fetch('http://127.0.0.1:'+server.address().port+uploaded.url+'?thumb=320');assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'2');assert.match(response.headers.get('cache-control'),/no-store/);assert.ok((await response.arrayBuffer()).byteLength<500);}finally{await new Promise(resolve=>server.close(resolve));}
});

test('local versioned fonts are served as WOFF2 with immutable caching',async()=>{
 const server=createServer({store:{enabled:false}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const response=await fetch('http://127.0.0.1:'+server.address().port+'/fonts/dm-sans-latin-v17.woff2');assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'font/woff2');assert.match(response.headers.get('cache-control'),/max-age=31536000, immutable/);assert.equal(Buffer.from(await response.arrayBuffer()).toString('ascii',0,4),'wOF2');}finally{await new Promise(resolve=>server.close(resolve));}
});
