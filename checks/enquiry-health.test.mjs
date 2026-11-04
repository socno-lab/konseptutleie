import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {enquiryHealth} from '../server/enquiry-health.mjs';
test('healthy or empty mail queue does not raise an alert',()=>{
 assert.equal(enquiryHealth().needsAttention,false);
 assert.equal(enquiryHealth({failed:null,uncertain:null,delayed:null}).needsAttention,false);
});
test('disabled sending, failed, uncertain and delayed delivery each require attention',()=>{
 assert.equal(enquiryHealth({},false).needsAttention,true);
 for(const key of ['failed','uncertain','delayed'])assert.equal(enquiryHealth({[key]:'2'}).needsAttention,true,key);
});
test('admin health includes counts only, not customer fields or references',()=>{
 assert.deepEqual(enquiryHealth({failed:'1',uncertain:2,delayed:3,email:'private@example.invalid',reference:'private'}),{enabled:true,failed:1,uncertain:2,delayed:3,needsAttention:true});
});
test('rental HTML contains production send wording before JavaScript runs',async()=>{
 for(const file of ['index.html','utvalg.html','anledning.html','leieprodukt.html']){
  const html=await readFile(new URL('../public/'+file,import.meta.url),'utf8');
  assert.doesNotMatch(html,/privat prøveversjon|Den sendes ikke til Konseptuell|Last ned tilbudsforespørsel/);
  assert.match(html,/Send leieforespørsel/);assert.match(html,/mottaksbekreftelse på e-post/);
 }
});
