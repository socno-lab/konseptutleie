import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createServer} from '../app-server.mjs';
import {defaultSettings,configureSiteSettings} from '../public/site-settings.js?v=optionimages20261108';
import {memoryStore} from './helpers/memory-store.mjs';

test('visual homepage drafts use the existing validated, revision-checked save and only publish on save',async()=>{
 const store=await memoryStore();
 const settings=structuredClone(defaultSettings);
 settings.home.products=[];settings.home.packages=[];
 settings.home.occasions.forEach(c=>{c.productId='';c.image='/assets/hero.jpg';});
 let site={revision:1,settings};
 store.readSiteSettings=async()=>structuredClone(site);
 store.saveSiteSettings=async(revision,settings)=>revision===site.revision?structuredClone(site={revision:revision+1,settings:structuredClone(settings)}):null;
 const origin='http://visual.example.invalid',key=randomBytes(24).toString('base64url');
 const server=createServer({store,origin,setupKey:key,secureCookies:false});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  const setup=await fetch(base+'/api/admin/setup',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({key,email:'admin@example.invalid',password:randomBytes(18).toString('base64url')})});
  const cookie=setup.headers.get('set-cookie').split(';')[0];
  const draft=structuredClone(settings);draft.home.occasions[0].title='Visuelt oppdatert kort';draft.home.occasions[1].visible=false;draft.home.seasonEnabled=false;
  assert.doesNotMatch(await(await fetch(base+'/')).text(),/Visuelt oppdatert kort/);
  const put=(revision,value=draft)=>fetch(base+'/api/admin/site-settings',{method:'PUT',headers:{origin,cookie,'Content-Type':'application/json'},body:JSON.stringify({revision,settings:value})});
  assert.equal((await put(1)).status,200);
  assert.equal((await put(1)).status,409);
  const saved=await(await fetch(base+'/api/admin/site-settings',{headers:{cookie}})).json();
  assert.equal(saved.settings.home.occasions[0].title,draft.home.occasions[0].title);
  assert.equal(saved.settings.home.occasions[1].visible,false);
  assert.equal(saved.settings.home.seasonEnabled,false);
  const html=await(await fetch(base+'/')).text();assert.match(html,/Visuelt oppdatert kort/);
  const invalid=structuredClone(draft);invalid.home.seasonFromMonth=13;
  assert.equal((await put(2,invalid)).status,400);
  assert.equal((await(await fetch(base+'/api/admin/site-settings',{headers:{cookie}})).json()).revision,2);
 }finally{await new Promise(resolve=>server.close(resolve));configureSiteSettings();}
});
