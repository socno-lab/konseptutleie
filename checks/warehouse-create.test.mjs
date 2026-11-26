import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../app-server.mjs';
import {digest} from '../server/auth.mjs';
import {memoryStore} from './helpers/memory-store.mjs';

test('warehouse editor creates one catalog entry and QR stock controls rental availability',async()=>{
 const store=await memoryStore();
 const read=store.readCatalog.bind(store),save=store.saveCatalog.bind(store);
 const warehouse=new Map();
 store.readCatalog=async()=>{
  const data=await read();
  return {...data,products:data.products.map(p=>{
   const units=warehouse.get(p.id);
   return units?{...p,qrStock:true,stock:units.length,unavailable:units.filter(i=>i.state!=='ready').length}:p;
  })};
 };
 store.admin=async()=>({email:'admin@example.invalid'});
 store.saveCatalogWithStyling=async(revision,products,{product,count,actor})=>{
  assert.equal(actor,'admin@example.invalid');
  assert.equal(product.stock,0);
  const result=await save(revision,products);
  if(!result)return null;
  const units=Array.from({length:count},(_,i)=>({id:'K-'+String(i+1).padStart(16,'0'),state:'held'}));
  warehouse.set(product.id,units);
  return {...result,ids:units.map(i=>i.id)};
 };
 store.stylingMove=async({id,action})=>{
  const unit=[...warehouse.values()].flat().find(i=>i.id===id);
  unit.state=action;
  return unit;
 };
 const token='a'.repeat(43),origin='http://localhost';
 await store.addSession(digest(token),Date.now()+60000);
 const server=createServer({store,origin,secureCookies:false});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const request=(path,method,body)=>fetch(base+path,{method,headers:{Origin:origin,Cookie:'konsept_session_mfa='+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const publicProducts=async()=>(await(await fetch(base+'/api/catalog')).json()).products;
 try{
  const initial=await store.readCatalog();
  const manual=initial.products.find(p=>p.name==='Charlie bord, svart');
  const product={...manual,id:'obj_test_qr_stock',name:'QR-testbord',articleNumber:'QR-TEST-1',stock:2,active:true};
  const registration={revision:initial.revision,products:[...initial.products,product],registerStock:{id:product.id,count:2}};
  const response=await request('/api/admin/catalog','PUT',registration);
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(new Set(result.ids).size,2);
  let rows=await publicProducts();
  let item=rows.find(p=>p.id===product.id);
  assert.equal(item.stock,2);assert.equal(item.unavailable,2);assert.equal(item.maxQuantity,0);assert.equal(item.rentalRentedOut,true);
  assert.equal((await request('/api/styling/move','POST',{id:result.ids[0],action:'ready',revision:1})).status,200);
  rows=await publicProducts();
  item=rows.find(p=>p.id===product.id);
  assert.equal(item.stock,2);assert.equal(item.unavailable,1);assert.equal(item.maxQuantity,1);assert.equal(item.rentalRentedOut,false);
  assert.equal(rows.find(p=>p.id===manual.id).stock,manual.stock);
  const duplicate={...product,id:'obj_other_qr_stock',name:'Annet navn'};
  const current=await store.readCatalog();
  const rejected=await request('/api/admin/catalog','PUT',{revision:current.revision,products:[...current.products,duplicate],registerStock:{id:duplicate.id,count:1}});
  assert.equal(rejected.status,409);
  assert.equal(warehouse.size,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
