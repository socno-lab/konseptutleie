import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.document={querySelectorAll:()=>[]};
const {submitEnquiry}=await import('../public/submission-ui.js');
const nativeFormData=globalThis.FormData;
const fields={name:'Lokal kontroll',email:'preview@example.invalid',rentalTermsAccepted:'test',phone:'00000000'};
const options={kind:'rental',basket:{chair:1},lines:[]};
async function run(responses,check){
 const oldFetch=globalThis.fetch,oldStorage=globalThis.sessionStorage,calls=[];
 globalThis.FormData=class{constructor(){}[Symbol.iterator](){return Object.entries(fields)[Symbol.iterator]();}};
 globalThis.sessionStorage={getItem:()=>null,setItem:()=>{}};
 globalThis.fetch=async(url,init)=>{calls.push(JSON.parse(init.body));return responses.shift();};
 try{await check({},calls);}finally{globalThis.fetch=oldFetch;globalThis.FormData=nativeFormData;globalThis.sessionStorage=oldStorage;}
}
test('recovers a non-JSON gateway response using the identical submission id and body',async()=>{
 await run([new Response('<html>Restart</html>',{status:503}),Response.json({ok:true,reference:'received',receipt:{lines:[]}})],async(form,calls)=>{
  const result=await submitEnquiry(form,options);assert.equal(result.reference,'received');assert.equal(calls.length,2);assert.deepEqual(calls[0],calls[1]);
  await submitEnquiry(form,options);assert.equal(calls.length,2);
 });
});
test('keeps a failed response retryable and reports its status and reference without parsing HTML',async()=>{
 await run([new Response('',{status:502}),new Response('<html>Unavailable</html>',{status:503}),Response.json({ok:true,reference:'received'})],async(form,calls)=>{
  await assert.rejects(submitEnquiry(form,options),/HTTP 503.*Kurven er beholdt.*Referanse:/);
  const result=await submitEnquiry(form,options);assert.equal(result.reference,'received');assert.deepEqual(calls[0],calls[2]);
 });
});
test('does not retry an ordinary validation rejection',async()=>{
 await run([Response.json({error:'Kontroller datoene.'},{status:400})],async(form,calls)=>{
  await assert.rejects(submitEnquiry(form,options),/Kontroller datoene/);assert.equal(calls.length,1);
 });
});
