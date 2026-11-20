import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {createServer} from '../app-server.mjs';
import {digest} from '../server/auth.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
test('workflow endpoints require admin auth and same-origin mutations; public availability never exposes customer records',async t=>{
 const store=await memoryStore(),token=randomBytes(32).toString('base64url');await store.addSession(digest(token),Date.now()+60000);
 const product=(await store.readCatalog()).products.find(p=>p.active&&!p.isService&&!p.isPackage);
 store.workflowRecords=async()=>[{id:'private-reference',email:'private@example.invalid',intro:'Private content',reserved:true,reservation:{start:'2026-12-01',end:'2026-12-10'},requirements:[{id:product.id,quantity:2}]}];store.enquiryMailStatus=async()=>[];
 const origin='http://127.0.0.1:4198',server=createServer({store,origin,secureCookies:false,env:{}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/api/admin/enquiries')).status,401);
 const headers={Cookie:'konsept_session_mfa='+token};const admin=await fetch(base+'/api/admin/enquiries',{headers});assert.equal(admin.status,200);assert.equal((await admin.json()).records[0].email,'private@example.invalid');
 const bad=await fetch(base+'/api/admin/enquiries/00000000-0000-0000-0000-000000000001/save',{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:'https://other.invalid'},body:'{}'});assert.equal(bad.status,403);
 const publicResult=await fetch(base+'/api/rental-availability?start=2026-12-05&end=2026-12-06');assert.equal(publicResult.status,200);const text=await publicResult.text();assert.doesNotMatch(text,/private|email|intro|reference/i);assert.equal(JSON.parse(text).reserved[product.id],2);
 const other=await fetch(base+'/api/rental-availability?start=2027-01-05&end=2027-01-06');assert.equal((await other.json()).reserved[product.id],0);
});
