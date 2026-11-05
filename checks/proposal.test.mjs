import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSubmission,createSubmissionSender} from '../server/submissions.mjs';
import {createProposalSnapshot,proposalEmail} from '../server/proposal.mjs';
import {proposalPageHtml} from '../server/proposal-page.mjs';
import {readHtmlTemplate} from '../server/html-templates.mjs';
import {createServer} from '../app-server.mjs';
import {memoryStore} from './helpers/memory-store.mjs';
const sample=()=>({id:'efc79d30-2390-43e7-9c3b-46e287867060',kind:'rental',requestType:'proposal',name:'Kari Eksempel',email:'kari@example.invalid',basket:{},customRequest:true,details:{customRequest:'Lounge for 20 gjester <script>alert(1)</script>',place:'Lillestrøm',period:'En helg i desember, ikke bestemt',budget:'Ca. 15 000 kr inkl. mva.',company:'Eksempel AS',phone:'',occasion:'Messe og stand'}});
function outbox(){const rows=new Map(),jobs=[];return {enabled:true,rows,jobs,async readEnquiry(id){return rows.get(id);},async reserveEnquiry(id,fingerprint,snapshot){if(rows.has(id))return {conflict:true};rows.set(id,{fingerprint,snapshot});for(const channel of ['internal','customer'])jobs.push({id,channel,snapshot,status:'pending'});return {snapshot};},async pruneEnquiries(){},async pendingEnquiryMail(){return jobs.filter(j=>j.status==='pending');},async claimEnquiryMail(id,channel){const j=jobs.find(j=>j.id===id&&j.channel===channel);if(j.status!=='pending')return false;j.status='sending';return true;},async finishEnquiryMail(id,channel,status){jobs.find(j=>j.id===id&&j.channel===channel).status=status;}};}
async function settle(store){for(let i=0;i<100&&store.jobs.some(j=>j.status==='pending'||j.status==='sending');i++)await new Promise(r=>setTimeout(r,5));}
test('short enquiries accept flexible or unknown dates, budget and no invoice address or terms',()=>{
 for(const period of ['',sample().details.period]){const input=sample();input.details.period=period;const s=createProposalSnapshot(validateSubmission(input,[]),input);assert.equal(s.acquisition,'proposal');assert.equal(s.address,'');assert.equal(s.terms,'');assert.equal(s.delivery,null);assert.equal(s.lines.length,0);assert.ok(s.facts.some(([k,v])=>k==='Budsjett'&&v.includes('15 000')));assert.ok(s.facts.some(([k,v])=>k==='Dato eller periode'&&v));}
});
test('short form cannot bypass product terms, inject headers or submit unbounded fields',()=>{
 const product={id:'chair',active:true,rentalEnabled:true};
 for(const change of [{basket:{chair:1}},{kind:'purchase'},{customRequest:false},{email:'a@example.invalid\r\nBcc:x@example.invalid'},{name:'Kari\nBcc:evil'},{website:'spam'},{requestType:'other'}])assert.throws(()=>validateSubmission({...sample(),...change},[product]));
 for(const details of [{customRequest:''},{place:' '},{budget:'x'.repeat(201)},{period:42},{phone:'abc'},{customRequest:'x'.repeat(3001)},{place:'a\0b'}]){const input={...sample(),details:{...sample().details,...details}};assert.throws(()=>createProposalSnapshot(validateSubmission(input,[]),input));}
 const legacy={...sample()};delete legacy.requestType;assert.throws(()=>validateSubmission(legacy,[]),/terms/);
});
test('proposal email escapes customer text and omits checkout totals, terms and payments',()=>{
 const input=sample(),snapshot=createProposalSnapshot(validateSubmission(input,[]),input);
 for(const audience of ['internal','customer']){const email=proposalEmail(snapshot,audience);assert.match(email.html,/&lt;script&gt;/);assert.doesNotMatch(email.html,/<script>/);assert.match(email.text,/15 000 kr/);assert.match(email.text,/Lillestrøm/);assert.doesNotMatch(email.text,/Rabattkode|Vilkårsversjon|Beregnet leiesum|Vipps|Handlekurven er tømt/);assert.equal(email.html.includes('/admin'),audience==='internal');}
});
test('short form shares immutable storage, both recipient channels and duplicate protection',async()=>{
 const store=outbox(),messages=[],sender=createSubmissionSender({SMTP_PASS:'test-only'},store,async m=>{messages.push(m);return {accepted:[m.to]};});
 const input=sample(),first=await sender.submit(input,[],'client');await settle(store);const second=await sender.submit(input,[],'client');assert.deepEqual(first,second);assert.equal(messages.length,2);assert.ok(store.jobs.every(j=>j.status==='sent'));assert.equal(messages.find(m=>m.to==='post@konseptuell.no').replyTo.address,input.email);assert.equal(first.receipt.acquisition,'proposal');assert.ok(messages.every(m=>m.attachments.length===1));await assert.rejects(sender.submit({...input,details:{...input.details,budget:'Nytt budsjett'}},[],'client'),e=>e.status===409);
 const limited=createSubmissionSender({SMTP_PASS:'test-only'},{...outbox(),reserveEnquiry:async()=>({limited:true})},async()=>{});await assert.rejects(limited.submit(input,[],'client'),e=>e.status===429);
});
test('short form page reuses the shell and server origin checks, without checkout bootstrap',async()=>{
 const source=await readHtmlTemplate('index.html'),html=proposalPageHtml(source);assert.match(html,/name="budget"/);assert.match(html,/name="place"[^>]*required/);assert.doesNotMatch(html,/<script[^>]*src="\/app\.js|id="requestForm"|name="rentalTermsAccepted"/);assert.match(html,/noindex/);assert.match(html,/class="brand"/);
 const store=Object.assign(await memoryStore(),outbox()),messages=[],server=createServer({store,env:{SMTP_PASS:'test-only'},origin:'http://localhost',secureCookies:false,sendMail:async m=>{messages.push(m);return {accepted:[m.to]};}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{const page=await fetch(base+'/tilpasset-foresporsel.html');assert.equal(page.status,200);assert.match(page.headers.get('x-robots-tag'),/noindex/);const input=sample();assert.equal((await fetch(base+'/api/submissions',{method:'POST',headers:{origin:'https://evil.invalid','content-type':'application/json'},body:JSON.stringify(input)})).status,403);const response=await fetch(base+'/api/submissions',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify(input)});assert.equal(response.status,200);assert.equal((await response.json()).receipt.acquisition,'proposal');await settle(store);assert.equal(messages.length,2);}finally{await new Promise(r=>server.close(r));}
});
