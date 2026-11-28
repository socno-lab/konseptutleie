import test from 'node:test';
import assert from 'node:assert/strict';
import {memoryStore} from './helpers/memory-store.mjs';
import {validateCatalog} from '../server/catalog.mjs';
import {digest} from '../server/auth.mjs';
import {createServer} from '../app-server.mjs';
import {missingPhotos, photoAlt, schemaPhotos} from '../public/product-image-descriptions.js';

test('image descriptions follow exact product and URL through reorder, replacement and legacy saves',async()=>{
 const {products}=await (await memoryStore()).readCatalog();
 const p=products.find(row=>row.image&&!row.isPackage&&!row.isService);
 const main=p.image, gallery='/assets/camino-loungestol-beige-front.jpg';
 p.gallery=[gallery];p.imageDescriptions={[main]:'Hovedmotiv',[gallery]:'Egen detaljtekst'};
 assert.deepEqual(missingPhotos(p),[]);
 assert.deepEqual(schemaPhotos(p,'https://konseptuell.no').image,[main,gallery].map(url=>'https://konseptuell.no'+url));
 const older={...p,image:gallery,gallery:[main]};delete older.imageDescriptions;
 const save=raw=>validateCatalog(products.map(row=>row.id===p.id?raw:row),products).find(row=>row.id===p.id);
 assert.deepEqual(save(older).imageDescriptions,p.imageDescriptions);
 assert.deepEqual(save({...older,gallery:[]}).imageDescriptions,{[gallery]:'Egen detaljtekst'});
 assert.equal(save({...older,imageDescriptions:{}}).imageDescriptions,undefined);
 assert.throws(()=>save({...older,imageDescriptions:{[main]:['feil']}}),/Bildebeskriv/);
 assert.match(photoAlt({...p,imageDescriptions:{}},gallery),/sett forfra$/);
});

test('admin bulk approval persists only missing descriptions and both storefronts deliver them before scripts',async t=>{
 const store=await memoryStore(),original=await store.readCatalog();
 const p=original.products.find(row=>row.image&&!row.isService&&!row.isPackage&&!row.moduleSeries&&!row.wallGroup);
 p.saleEnabled=true;p.salePrice=500;p.active=true;p.rentalEnabled=true;p.image='/assets/camino-loungestol-beige-produkt.jpg';
 const gallery='/assets/camino-loungestol-beige-front.jpg';p.gallery=[gallery];
 p.imageDescriptions={[p.image]:'Min godkjente beskrivelse'};
 const seed=await store.saveCatalog(original.revision,original.products);
 await store.addSession(digest('a'.repeat(43)),Date.now()+60000);
 const origin='http://localhost',server=createServer({store,origin,secureCookies:false});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const batch=revision=>fetch(base+'/api/admin/catalog/image-descriptions',{method:'POST',headers:{Origin:origin,Cookie:'konsept_session_mfa='+'a'.repeat(43),'Content-Type':'application/json'},body:JSON.stringify({revision,entries:[{id:p.id,url:p.image,text:'Overskriv aldri'},{id:p.id,url:gallery,text:'Stolen sett forfra & fra siden'}]})});
 assert.equal((await batch(seed.revision)).status,200);
 assert.equal((await batch(seed.revision)).status,409);
 const current=await store.readCatalog(),saved=current.products.find(row=>row.id===p.id);
 assert.deepEqual(saved.imageDescriptions,{[p.image]:'Min godkjente beskrivelse',[gallery]:'Stolen sett forfra & fra siden'});
 assert.equal((await batch(current.revision)).status,200);
 assert.equal((await store.readCatalog()).revision,current.revision);
 for(const path of ['leieprodukt','kjopsprodukt']){
  const response=await fetch(base+'/'+path+'.html?produkt='+p.id),body=await response.text();
  assert.equal(response.status,200);
  assert.match(body,/<img [^>]*alt="Min godkjente beskrivelse"/);
  assert.match(body,/<img [^>]*alt="Stolen sett forfra &amp; fra siden"/);
  const graph=JSON.parse(body.match(/<script type="application\/ld\+json"[^>]*>([\s\S]+?)<\/script>/)[1])['@graph'];
  const entity=graph.find(row=>['Product','Service'].includes(row['@type']));
  assert.deepEqual(entity.image.map(url=>new URL(url).pathname),[p.image,gallery]);
 }
});
