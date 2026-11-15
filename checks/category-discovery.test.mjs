import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../app-server.mjs';
import {defaultSettings} from '../public/site-settings.js?v=optionimages20261108';

test('public category links and page titles use saved labels while retaining category IDs in URLs',async()=>{
 const settings=structuredClone(defaultSettings);
 settings.categories.push({id:'kategori_db7c0f23',label:'Speil',subcategories:[]},{id:'kategori_a876e2dd',label:'Skap',subcategories:[]});
 const products=settings.categories.slice(-2).map(c=>({id:c.id+'product',name:c.label+' produkt',category:c.id,active:true,rentalEnabled:true,image:'/assets/hero.jpg',price:100}));
 const store={enabled:true,readCatalog:async()=>({products,settings,revision:1}),readSiteSettings:async()=>({settings,revision:1})};
 const server=createServer({origin:'http://category.example.invalid',store,env:{}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
  const html=await(await fetch(base+'/')).text();
  const links=html.match(/<nav[^>]*aria-label="Leiekategorier">([\s\S]*?)<\/nav>/)[1];
  assert.match(links,/>Speil til leie<\/a>/);assert.match(links,/>Skap til leie<\/a>/);
  assert.match(links,/kategori=kategori_db7c0f23/);assert.match(links,/kategori=kategori_a876e2dd/);
  assert.doesNotMatch(links,/>kategori_/);
  const category=await(await fetch(base+'/utvalg.html?kategori=kategori_a876e2dd')).text();
  assert.match(category,/<title>Skap til leie \| Konseptuell<\/title>/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
