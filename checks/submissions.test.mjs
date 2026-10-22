import test from 'node:test';
import assert from 'node:assert/strict';
import {createSubmissionSender,validateSubmission} from '../server/submissions.mjs';
import {createServer} from '../app-server.mjs';
const products=[{id:'chair',name:'Stol',active:true}],env={SMTP_PASS:'test-only',SMTP_USER:'post@konseptuell.no'};
const sample=()=>({id:'efc79d30-2390-43e7-9c3b-46e287867060',kind:'rental',name:'Test',email:'customer@example.invalid',terms:'2026-10-22-leie-8-test',text:'1 × Stol. Uforpliktende.',basket:{chair:1}});
function memory(){const rows=new Map();return {enabled:true,async reserveSubmission(id,fingerprint){const row=rows.get(id);if(row)return row.fingerprint===fingerprint?row.status:'conflict';rows.set(id,{fingerprint,status:'sending'});return 'new';},async completeSubmission(id,status){rows.get(id).status=status;}};}
test('Mail always uses the business mailbox, safe Reply-To and idempotent accepted receipt',async()=>{
 const messages=[],sender=createSubmissionSender(env,memory(),async message=>{messages.push(message);return {accepted:['post@konseptuell.no']};});
 const value=sample();assert.equal((await sender.submit(value,products,'client')).ok,true);assert.equal((await sender.submit(value,products,'client')).ok,true);
 assert.equal(messages.length,1);assert.equal(messages[0].to,'post@konseptuell.no');assert.equal(messages[0].from.address,'post@konseptuell.no');assert.equal(messages[0].replyTo.address,value.email);assert.equal(messages[0].disableFileAccess,true);assert.match(messages[0].text,/ikke en bindende avtale/);
 await assert.rejects(sender.submit({...value,text:'Changed'},products,'client'),e=>e.status===409);
});
test('Invalid headers, unavailable products, unaccepted terms, empty basket and honeypot are rejected',()=>{
 for(const patch of [{email:'test@example.invalid\r\nBcc:evil@example.invalid'},{name:'Test\nBCC'},{terms:''},{basket:{missing:1}},{basket:{chair:0}},{basket:{}},{website:'spam'},{text:'x'.repeat(60001)}])assert.throws(()=>validateSubmission({...sample(),...patch},products));
 assert.doesNotThrow(()=>validateSubmission({...sample(),basket:{},customRequest:true},products));
 assert.throws(()=>validateSubmission({...sample(),kind:'purchase',basket:{},customRequest:true},products));
});
test('Disabled and uncertain sending never produce a success or blindly retry SMTP',async()=>{
 await assert.rejects(createSubmissionSender({},memory()).submit(sample(),products,'client'),e=>e.status===503);
 let calls=0;const sender=createSubmissionSender(env,memory(),async()=>{calls++;throw Object.assign(Error('Private SMTP details'),{code:'ECONNECTION'});});
 await assert.rejects(sender.submit(sample(),products,'client'),e=>e.status===503&&!e.message.includes('Private'));
 await assert.rejects(sender.submit(sample(),products,'client'),e=>e.status===409);assert.equal(calls,1);
 const limited=createSubmissionSender(env,{enabled:true,reserveSubmission:async()=> 'limited'},async()=>{throw Error('Must not send');});await assert.rejects(limited.submit(sample(),products,'client'),e=>e.status===429);
});
test('Public email endpoint enforces origin and JSON, and fails closed without SMTP',async()=>{
 const server=createServer({env:{},origin:'https://konseptuell.no'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 try{
 assert.deepEqual(await (await fetch(base+'/api/submissions')).json(),{enabled:false});
 assert.equal((await fetch(base+'/api/submissions',{method:'POST',headers:{origin:'https://evil.invalid','content-type':'application/json'},body:JSON.stringify(sample())})).status,403);
 assert.equal((await fetch(base+'/api/submissions',{method:'POST',headers:{origin:'https://konseptuell.no','content-type':'application/json'},body:JSON.stringify(sample())})).status,503);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
