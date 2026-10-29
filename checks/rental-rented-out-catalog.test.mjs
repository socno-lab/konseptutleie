import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCatalog} from '../server/catalog.mjs';
import {createServer,publicCatalog} from '../app-server.mjs';
import {digest} from '../server/auth.mjs';
import {remaining} from '../public/catalog-model.js';
import {saleEstimate} from '../public/sales-model.js';

const product={id:'test_sofa',name:'TEST sofa',category:'Sofaer',material:'Teststoff',description:'Syntetisk testprodukt',price:100,weekPrice:500,monthPrice:1500,stock:3,unavailable:1,active:true,isPackage:false,isExample:false,type:'sofa',color:'#ffffff',image:'',saleEnabled:true,salePrice:7500};

test('manual rental marker defaults off and round-trips both explicit values',()=>{
 const initial=validateCatalog([product])[0];
 assert.equal(initial.rentalRentedOut,false);
 const marked=validateCatalog([{...initial,rentalRentedOut:true}])[0];
 assert.equal(marked.rentalRentedOut,true);
 assert.equal(validateCatalog([marked])[0].rentalRentedOut,true);
 assert.equal(validateCatalog([{...marked,rentalRentedOut:false}],[marked])[0].rentalRentedOut,false);
});

test('omitted marker is preserved by product identity when another field changes',()=>{
 const marked=validateCatalog([{...product,rentalRentedOut:true}])[0];
 const {rentalRentedOut,...legacyPayload}=marked;
 const saved=validateCatalog([{...product,id:'other_sofa'},{...legacyPayload,name:'TEST oppdatert sofa'}],[marked]);
 assert.equal(saved.find(p=>p.id==='test_sofa').rentalRentedOut,true);
 assert.equal(saved.find(p=>p.id==='other_sofa').rentalRentedOut,false);
 assert.equal(saved.find(p=>p.id==='test_sofa').name,'TEST oppdatert sofa');
 assert.equal(marked.name,'TEST sofa','validation does not mutate the previous catalogue');
});

test('rented-out marker accepts booleans only',()=>{
 for(const rentalRentedOut of ['true','false',1,0,null,{},[]]){
  assert.throws(()=>validateCatalog([{...product,rentalRentedOut}]),/Ugyldig utleid-merking/);
 }
});

test('rental marking stays public without changing stock, visibility, prices or purchase eligibility',()=>{
 const normal=validateCatalog([product])[0],marked=validateCatalog([{...product,rentalRentedOut:true}])[0];
 const visible=publicCatalog({products:[marked]}).products;
 assert.equal(visible.length,1);
 assert.equal(visible[0].rentalRentedOut,true);
 assert.equal(marked.stock,normal.stock);
 assert.equal(marked.unavailable,normal.unavailable);
 assert.equal(marked.rentalEnabled,normal.rentalEnabled);
 assert.equal(remaining(marked.id,{},[marked]),remaining(normal.id,{},[normal]));
 assert.deepEqual(saleEstimate({test_sofa:2},[marked]),saleEstimate({test_sofa:2},[normal]));
 assert.deepEqual(visible[0].rentalRates,publicCatalog({products:[normal]}).products[0].rentalRates);
});

test('catalogue API saves, reads, preserves and clears the manual rental marker',async t=>{
 const token='r'.repeat(43),origin='http://marker.example.invalid';
 let catalogue={revision:1,products:validateCatalog([product]),updatedAt:'2026-10-29T00:00:00.000Z'};
 const store={
  enabled:true,
  async session(hash){return hash===digest(token)?{expiresAt:Date.now()+60000}:null;},
  async readCatalog(){return structuredClone(catalogue);},
  async saveCatalog(revision,products){
   if(revision!==catalogue.revision)return null;
   catalogue={...catalogue,revision:revision+1,products:structuredClone(products)};
   return structuredClone(catalogue);
  }
 };
 const server=createServer({store,origin,secureCookies:false,env:{}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base='http://127.0.0.1:'+server.address().port;
 const headers={Origin:origin,'Content-Type':'application/json',Cookie:'konsept_session='+token};
 async function read(path){
  const response=await fetch(base+path,{headers});
  assert.equal(response.status,200);
  return response.json();
 }
 async function save(data){
  const response=await fetch(base+'/api/admin/catalog',{method:'PUT',headers,body:JSON.stringify(data)});
  const saved=await response.json();
  assert.equal(response.status,200,JSON.stringify(saved));
  return saved;
 }
 async function assertMarker(expected){
  for(const path of ['/api/admin/catalog','/api/catalog']){
   const data=await read(path);
   assert.equal(data.products.length,1);
   assert.equal(data.products[0].rentalRentedOut,expected,path);
  }
 }
 await assertMarker(false);
 const initial=await read('/api/admin/catalog');
 const marked=await save({...initial,products:[{...initial.products[0],rentalRentedOut:true}]});
 await assertMarker(true);
 const {rentalRentedOut,...olderClientProduct}=marked.products[0];
 const renamed=await save({...marked,products:[{...olderClientProduct,name:'TEST endret navn'}]});
 assert.equal(renamed.products[0].name,'TEST endret navn');
 await assertMarker(true);
 await save({...renamed,products:[{...renamed.products[0],rentalRentedOut:false}]});
 await assertMarker(false);
});
