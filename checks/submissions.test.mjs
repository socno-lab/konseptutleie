import test from 'node:test';
import assert from 'node:assert/strict';
import {createSubmissionSender,validateSubmission,submissionFingerprint,retryableMailError} from '../server/submissions.mjs';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {enquiryEmail} from '../server/enquiry-email.mjs';
import {createServer} from '../app-server.mjs';
import {configureSiteSettings,defaultSettings} from '../public/site-settings.js';
const products=[{id:'chair',name:'Stol med et langt navn og <uønsket> HTML & tekst',active:true,stock:10,unavailable:0,rentalPricingMode:'manual',price:100,weekPrice:300,monthPrice:500,saleEnabled:true,salePrice:1990,category:'Stoler'}],env={SMTP_PASS:'test-only',SMTP_USER:'post@konseptuell.no'};
const sample=()=>({id:'efc79d30-2390-43e7-9c3b-46e287867060',kind:'rental',name:'Emilie Eksempel',email:'customer@example.invalid',terms:'2026-10-22-leie-8-test',basket:{chair:1},details:{start:'2026-11-01',end:'2026-11-02',delivery:'Henter og returnerer selv',occasion:'Boligfoto og visning',notes:'<script>alert(1)</script>'}});
function memory(){const rows=new Map(),jobs=[];return {enabled:true,rows,jobs,async readEnquiry(id){return rows.get(id);},async reserveEnquiry(id,fingerprint,snapshot){if(rows.has(id))return rows.get(id).fingerprint===fingerprint?rows.get(id):{conflict:true};rows.set(id,{fingerprint,snapshot:structuredClone(snapshot)});for(const channel of ['internal','customer'])jobs.push({id,channel,snapshot:structuredClone(snapshot),status:'pending',next:0});return {snapshot};},async pruneEnquiries(){},async pendingEnquiryMail(now){return jobs.filter(j=>j.status==='pending'&&j.next<=now);},async claimEnquiryMail(id,channel){const j=jobs.find(j=>j.id===id&&j.channel===channel);if(j.status!=='pending')return false;j.status='sending';return true;},async finishEnquiryMail(id,channel,status,now){const j=jobs.find(j=>j.id===id&&j.channel===channel);j.status=status;j.next=now+300000;}};}
async function settle(store){for(let i=0;i<100&&store.jobs.some(j=>['pending','sending'].includes(j.status)&&j.next<=Date.now());i++)await new Promise(r=>setTimeout(r,5));}
test('one registered snapshot sends distinct HTML + text customer and internal messages exactly once on repeat',async()=>{
 const messages=[],store=memory(),sender=createSubmissionSender(env,store,async message=>{messages.push(message);return {accepted:[message.to]};});const value=sample();
 await sender.submit(value,products,'client');await settle(store);await sender.submit(value,products,'client');await sender.flush();
 assert.equal(messages.length,2);const internal=messages.find(m=>m.to==='post@konseptuell.no'),customer=messages.find(m=>m.to===value.email);
 assert.equal(customer.from.address,'post@konseptuell.no');assert.equal(customer.replyTo.address,'post@konseptuell.no');assert.equal(internal.replyTo.address,value.email);assert.notEqual(customer.messageId,internal.messageId);
 for(const m of messages){assert.match(m.text,/200 kr/);assert.match(m.text,new RegExp(value.id));assert.ok(m.attachments[0].content.length>100);assert.match(m.html,/&lt;script&gt;/);assert.doesNotMatch(m.html,/<script>/);assert.equal(m.disableUrlAccess,true);}
 assert.doesNotMatch(customer.html,/konseptuell.no\/admin|Vilkårsversjon/);assert.match(internal.html,/konseptuell.no\/admin/);
 await assert.rejects(sender.submit({...value,name:'Annen'},products,'client'),e=>e.status===409);
 // A later catalog change must never change an already registered request or resend it.
 await sender.submit(value,[],'client');assert.equal(messages.length,2);
});
test('independent channel failure retries only the failed recipient from the persisted snapshot',async()=>{
 const store=memory(),calls=[];let failCustomer=true;const send=async m=>{calls.push(m.to);if(m.to!=='post@konseptuell.no'&&failCustomer)throw Object.assign(Error('Secret'),{responseCode:451,command:'DATA'});return {accepted:[m.to]};};
 const sender=createSubmissionSender(env,store,send);await sender.submit(sample(),products,'client');await settle(store);
 assert.deepEqual(store.jobs.map(j=>j.status),['sent','pending']);failCustomer=false;store.jobs[1].next=0;
 // A new sender simulates a restart; the successful channel stays sent.
 await createSubmissionSender(env,store,send).flush();assert.deepEqual(calls,['post@konseptuell.no','customer@example.invalid','customer@example.invalid']);assert.ok(store.jobs.every(j=>j.status==='sent'));
});
test('ambiguous DATA acknowledgement is quarantined, not blindly sent twice',async()=>{
 assert.equal(retryableMailError({command:'DATA',code:'ETIMEDOUT'}),false);assert.equal(retryableMailError({command:'CONN',code:'ETIMEDOUT'}),true);
 const store=memory();let calls=0;const sender=createSubmissionSender(env,store,async()=>{calls++;throw Object.assign(Error('Timeout'),{command:'DATA',code:'ETIMEDOUT'});});await sender.submit(sample(),products,'client');await settle(store);await sender.flush();assert.equal(calls,2);assert.ok(store.jobs.every(j=>j.status==='uncertain'));
});
test('server ignores client prices; purchase, empty optional fields, custom requests, dates and period additions',()=>{
 configureSiteSettings(defaultSettings);const input=sample(),value=validateSubmission(input,products),s=createEnquirySnapshot(value,{...input,total:1,details:{...input.details,total:1}},products);assert.equal(s.total,200);
 const buy={...input,kind:'purchase',details:{delivery:'Henter selv etter avtale'}};const snap=createEnquirySnapshot(validateSubmission(buy,products),buy,products);assert.equal(snap.total,1990);assert.ok(!enquiryEmail(snap).text.includes('Ønsket leieperiode'));
 const extra={...products[0],rentalPricingMode:'period',price:400};const long={...input,details:{...input.details,end:'2026-12-01'}};assert.equal(createEnquirySnapshot(value,long,[extra]).lines[0].total,800);
 for(const patch of [{email:'test@example.invalid\r\nBcc:evil@example.invalid'},{name:'Test\nBCC'},{terms:''},{basket:{missing:1}},{basket:{chair:0}},{basket:{}},{website:'spam'}])assert.throws(()=>validateSubmission({...input,...patch},products));
 for(const details of [{...input.details,end:'2026-02-30'},{...input.details,end:'2026-10-01'},{...input.details,notes:'x'.repeat(3001)}])assert.throws(()=>createEnquirySnapshot(value,{...input,details},products));
 const custom={...input,basket:{},customRequest:true,details:{delivery:'Avklares senere',customRequest:'Et rom med stoler'}};assert.equal(createEnquirySnapshot(validateSubmission(custom,products),custom,products).total,null);
 assert.equal(submissionFingerprint({...input,text:'old generated price'}),submissionFingerprint({...input,text:'different generated price'}));
});
test('origin, unavailable SMTP, spam limits and module minimum remain enforced',async()=>{
 await assert.rejects(createSubmissionSender({},memory()).submit(sample(),products,'client'),e=>e.status===503);
 const limited=createSubmissionSender(env,{enabled:true,readEnquiry:async()=>null,reserveEnquiry:async()=>({limited:true})},async()=>{});await assert.rejects(limited.submit(sample(),products,'client'),e=>e.status===429);
 const lagoon=products.map(p=>({...p,moduleSeries:'Lagoon',rentalModuleMinimum:2,moduleRole:'left'}));assert.throws(()=>validateSubmission(sample(),lagoon),/minst 2/);
 const server=createServer({env:{},origin:'https://konseptuell.no'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{assert.deepEqual(await(await fetch(base+'/api/submissions')).json(),{enabled:false});assert.equal((await fetch(base+'/api/submissions',{method:'POST',headers:{origin:'https://evil.invalid','content-type':'application/json'},body:JSON.stringify(sample())})).status,403);}finally{await new Promise(resolve=>server.close(resolve));}
});
