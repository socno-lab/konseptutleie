import {rentalTermsSnapshot} from '../server/rental-terms-pdf.mjs';
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
test('customer acceptance requires a same-origin POST while opening the link is read-only',async t=>{const store=await memoryStore();let mutations=0;store.offerAcceptance=async(token,accept)=>{assert.equal(token,'a'.repeat(43));if(accept)mutations++;return {accepted:accept,html:'<p>Tilbud</p>',rentalTerms:rentalTermsSnapshot()};};const origin='https://konseptuell.no',server=createServer({store,origin,secureCookies:false,env:{}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port;const page=await fetch(base+'/aksepter-tilbud.html');assert.equal(page.status,200);assert.match(page.headers.get('x-robots-tag'),/noindex/);assert.equal(page.headers.get('referrer-policy'),'no-referrer');const viewed=await fetch(base+'/api/offer-acceptance?token='+'a'.repeat(43));assert.equal(viewed.status,200);assert.equal(mutations,0);assert.equal(viewed.headers.get('cache-control'),'no-store');const pdf=await fetch(base+'/api/offer-terms?token='+'a'.repeat(43));assert.equal(pdf.status,200);assert.equal(pdf.headers.get('content-type'),'application/pdf');assert.match(pdf.headers.get('content-disposition'),/attachment/);assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(),'%PDF-');assert.equal(mutations,0);const input={method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.invalid'},body:JSON.stringify({token:'a'.repeat(43)})};assert.equal((await fetch(base+'/api/offer-acceptance',input)).status,403);assert.equal(mutations,0);input.headers.Origin=origin;assert.equal((await fetch(base+'/api/offer-acceptance',input)).status,200);assert.equal(mutations,1);});

test('return preview, completion and test email endpoints require authenticated same-origin requests',async t=>{
 const store=await memoryStore(),token=randomBytes(32).toString('base64url');await store.addSession(digest(token),Date.now()+60000);store.pendingEnquiryMail=async()=>[];let completed=0,testSent=0;
 store.workflowPreview=async(id,input,products,type)=>{assert.equal(type,'return');return {canSend:true,html:'<p>Retur</p>'};};store.changeWorkflow=async(id,input,action)=>{assert.equal(action,'complete');completed++;return {id,status:'completed'};};store.queueRentalReturnTest=async email=>{assert.equal(email,'test@example.invalid');testSent++;return {reference:'test-mail'};};
 const origin='https://konseptuell.no',server=createServer({store,origin,secureCookies:false,env:{SMTP_PASS:'fake'},sendMail:async()=>{throw Error('No message should be sent by this route test');}});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port,headers={Cookie:'konsept_session_mfa='+token,'Content-Type':'application/json',Origin:origin};
 assert.equal((await fetch(base+'/api/admin/return-email-test')).status,401);
 const preview=await fetch(base+'/api/admin/return-email-test',{headers});assert.equal(preview.status,200);assert.match((await preview.json()).html,/TEST/);
 const path='/api/admin/enquiries/00000000-0000-0000-0000-000000000001/';
 assert.equal((await fetch(base+path+'preview',{method:'POST',headers,body:JSON.stringify({revision:1,documentType:'return'})})).status,200);
 for(const endpoint of [path+'complete','/api/admin/return-email-test'])assert.equal((await fetch(base+endpoint,{method:'POST',headers:{...headers,Origin:'https://other.invalid'},body:'{}'})).status,403);
 assert.equal((await fetch(base+path+'complete',{method:'POST',headers,body:JSON.stringify({revision:1,sendThanks:false})})).status,200);
 assert.equal((await fetch(base+'/api/admin/return-email-test',{method:'POST',headers,body:JSON.stringify({email:'test@example.invalid'})})).status,200);assert.equal(completed,1);assert.equal(testSent,1);
});

test('targeted pricing diagnostics require login and expose only dates and line pricing, without contact details',async t=>{
 const store=await memoryStore(),token=randomBytes(32).toString('base64url');await store.addSession(digest(token),Date.now()+60000);const p=(await store.readCatalog()).products.find(p=>p.active&&!p.isPackage&&!p.priceOnRequest),id='00000000-0000-0000-0000-000000000001';
 store.workflowRecords=async()=>[{id,email:'private@example.invalid',deliveryAddress:'Private street 1',intro:'Private message',revision:2,status:'accepted',start:'',end:'',deliveryDate:'',pickupDate:'',scope:'messe',lines:[{id:p.id,name:p.name,quantity:1,total:null}]}];const server=createServer({store,env:{},secureCookies:false});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());const base='http://127.0.0.1:'+server.address().port,path='/api/admin/enquiries/'+id+'/diagnostics?start=2026-11-21&end=2026-11-21';
 assert.equal((await fetch(base+path)).status,401);const response=await fetch(base+path,{headers:{Cookie:'konsept_session_mfa='+token}});assert.equal(response.status,200);const body=await response.text();assert.doesNotMatch(body,/private@example|Private street|Private message|purchaseUnitPrice|acquisitionCost/);assert.equal(response.headers.get('x-konseptuell-version'),'20261121-rental-reminders');const data=JSON.parse(body);assert.equal(data.storedDays,null);assert.equal(data.comparisonPeriod.start,'2026-11-21');assert.equal(data.lines[0].storedTotal,null);
});
