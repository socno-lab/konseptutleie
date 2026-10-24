import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicCatalogCache} from '../server/public-catalog-cache.mjs';
import {createServer} from '../app-server.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
import {defaultSettings} from '../public/site-settings.js';
import {digest} from '../server/auth.mjs';

test('public cache deduplicates reads, expires, excludes private source fields and is bounded',async()=>{
 let reads=0,time=0;const cache=createPublicCatalogCache(async()=>({revision:++reads,products:[],settings:{},admin:'private',discounts:['private']}),x=>x,{now:()=>time,ttlMs:100,maxBytes:200});
 const [first,same]=await Promise.all([cache.get(),cache.get()]);assert.equal(first,same);assert.equal(reads,1);assert.equal(first.admin,undefined);assert.equal(first.discounts,undefined);
 time=99;assert.equal(await cache.get(),first);time=101;assert.equal((await cache.get()).revision,2);
 cache.invalidate();assert.equal((await cache.get()).revision,3);
 let largeReads=0;const large=createPublicCatalogCache(async()=>({revision:++largeReads,products:['x'.repeat(200)],settings:{}}),x=>x,{maxBytes:10});await large.get();await large.get();assert.equal(largeReads,2);
});

test('an admin invalidation during a public read cannot restore the stale revision',async()=>{
 let revision=1,release;const cache=createPublicCatalogCache(async()=>{const read=revision;if(read===1)await new Promise(resolve=>{release=resolve;});return {revision:read,products:[],settings:{}};},x=>x);
 const old=cache.get();revision=2;cache.invalidate();assert.equal((await cache.get()).revision,2);release();assert.equal((await old).revision,2);assert.equal((await cache.get()).revision,2);
});

test('HTTP public projection shares a short cache while auth and admin reads stay separate; saves invalidate it',async()=>{
 const store=await memoryStore(),originalRead=store.readCatalog.bind(store);let reads=0,settingsReads=0,site={revision:1,settings:structuredClone(defaultSettings)};
 site.settings.home.products=[];site.settings.home.packages=[];site.settings.home.occasions.forEach(c=>{c.productId='';});
 store.readCatalog=async()=>{reads++;return originalRead();};store.readSiteSettings=async()=>{settingsReads++;return structuredClone(site);};store.saveSiteSettings=async(revision,settings)=>revision===site.revision?(site={revision:revision+1,settings:structuredClone(settings)}):null;
 const token='a'.repeat(43);await store.addSession(digest(token),Date.now()+60000);const cookie='konsept_session='+token,origin='http://admin.example.invalid';
 const server=createServer({origin,store,secureCookies:false,publicCatalogCache:{ttlMs:60000}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 const request=(url,data)=>fetch(base+url,{method:'PUT',headers:{cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
 try{
  const first=await (await fetch(base+'/api/catalog')).json();assert.equal(first.canAdmin,false);
  assert.equal((await (await fetch(base+'/api/catalog',{headers:{cookie}})).json()).canAdmin,true);
  assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/api/site-settings')).status,200);assert.equal(reads,1);assert.equal(settingsReads,1);
  const admin=await (await fetch(base+'/api/admin/catalog',{headers:{cookie}})).json();assert.equal(reads,2);assert.equal(settingsReads,2);
  const edited=admin.products.find(p=>p.id===first.products[0].id);edited.name='Updated public product';const saved=await request('/api/admin/catalog',{revision:admin.revision,products:admin.products});assert.equal(saved.status,200);
  const next=await (await fetch(base+'/api/catalog')).json();assert.equal(next.revision,admin.revision+1);assert.equal(next.products.find(p=>p.id===edited.id).name,'Updated public product');
  const changed=structuredClone(site.settings);changed.delivery.normalSingle+=10;const settingsSave=await request('/api/admin/site-settings',{revision:site.revision,settings:changed});assert.equal(settingsSave.status,200);
  const refreshed=await (await fetch(base+'/api/site-settings')).json();assert.equal(refreshed.settings.delivery.normalSingle,changed.delivery.normalSingle);
  const conflict=await request('/api/admin/catalog',{revision:admin.revision,products:admin.products});assert.equal(conflict.status,409);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
