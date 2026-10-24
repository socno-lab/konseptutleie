import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkEnvironment,checkRuntime,publicOrigin,checkPublicHealth,main} from '../scripts/preflight.mjs';

const env={APP_ORIGIN:'https://shop.example.invalid',DB_HOST:'localhost',DB_NAME:'PRIVATE_DATABASE',DB_USER:'PRIVATE_USER',DB_PASSWORD:'PRIVATE_DB_PASSWORD',SMTP_USER:'post@konseptuell.no',SMTP_PASS:'PRIVATE_SMTP_PASSWORD',GOOGLE_MAPS_API_KEY:'PRIVATE_API_KEY',ADMIN_SETUP_KEY:'PRIVATE_SETUP_KEY_1234567890'};
test('optional config validation reports failures and never includes config values or secrets',()=>{
 const valid=checkEnvironment(env);assert.ok(valid.every(check=>check.status==='pass'));
 const serialized=JSON.stringify(valid);for(const value of Object.values(env).filter(value=>value.startsWith('PRIVATE_')))assert.ok(!serialized.includes(value));
 for(const patch of [{APP_ORIGIN:'https://user:PRIVATE_PASSWORD@shop.example.invalid'},{APP_ORIGIN:'https://shop.example.invalid/'},{DB_PASSWORD:''},{SMTP_USER:'PRIVATE_ADDRESS@example.invalid'},{SMTP_PORT:'25'},{SMTP_PASS:''},{ADMIN_SETUP_KEY:'short'}])assert.ok(checkEnvironment({...env,...patch}).some(check=>check.status==='fail'));
 assert.equal(checkEnvironment({...env,DB_HOST:'database.example.invalid',DB_SSL:'true'}).some(check=>check.check==='database-tls'),false);
 assert.ok(checkEnvironment({...env,DB_HOST:'database.example.invalid'}).some(check=>check.check==='database-tls'&&check.status==='warn'));
 assert.equal(checkRuntime('22.12.0').status,'fail');assert.equal(checkRuntime('22.13.0').status,'pass');
});
test('preflight is offline by default and rejects credentialed health URLs without a request',async()=>{
 let calls=0;const output=[],fetcher=async()=>{calls++;throw Error('must not contact a server');};
 assert.equal(await main([],{env,fetcher,write:value=>output.push(value)}),0);assert.equal(calls,0);
 assert.ok(!output.join('\n').includes('PRIVATE_'));assert.match(output[0],/"mode": "offline"/);
 assert.equal(await main(['--public-health','https://user:PRIVATE_PASSWORD@shop.example.invalid'],{env,fetcher,write:value=>output.push(value)}),2);assert.equal(calls,0);assert.ok(!output.join('\n').includes('PRIVATE_PASSWORD'));
 for(const value of ['file:///etc/passwd','https://shop.example.invalid/private','https://shop.example.invalid/?secret=x'])assert.throws(()=>publicOrigin(value));
});
test('public health uses only fixed anonymous read routes and returns no response content',async()=>{
 const requests=[];const fetcher=async(url,init)=>{
  requests.push({url,init});assert.ok(['HEAD','GET'].includes(init.method));assert.equal(init.redirect,'error');assert.equal(init.body,undefined);assert.equal(init.headers.Authorization,undefined);
  if(init.method==='HEAD')return new Response(null,{headers:{'content-security-policy':"default-src 'self'",'x-content-type-options':'nosniff'}});
  return Response.json(url.endsWith('/api/catalog')?{products:[{name:'PRIVATE_PRODUCT_DESCRIPTION'}]}:{enabled:true,unexpected:'PRIVATE_EMAIL@example.invalid'});
 };
 const report=await checkPublicHealth('https://shop.example.invalid',{fetcher});assert.equal(requests.length,4);assert.ok(report.every(check=>check.status==='pass'));assert.ok(!JSON.stringify(report).includes('PRIVATE_'));
 assert.deepEqual(requests.map(request=>new URL(request.url).pathname),['/','/api/catalog','/api/submissions','/api/delivery-estimate']);
 const failing=await checkPublicHealth('https://shop.example.invalid',{fetcher:async()=>{throw Error('PRIVATE_PASSWORD');}});assert.ok(failing.every(check=>check.status==='fail'));assert.ok(!JSON.stringify(failing).includes('PRIVATE_PASSWORD'));
});
test('dependency workflow has read-only credentials, pinned official actions and no deploy or secret input',async()=>{
 const workflow=await readFile(new URL('../.github/workflows/verify.yml',import.meta.url),'utf8');
 assert.match(workflow,/contents: read/);assert.match(workflow,/persist-credentials: false/);assert.equal([...workflow.matchAll(/uses: actions\/(?:checkout|setup-node)@[a-f0-9]{40}/g)].length,2);
 for(const command of ['npm ci','npm test','npm run build','npm audit --omit=dev --audit-level=high'])assert.ok(workflow.includes('run: '+command));
 assert.doesNotMatch(workflow,/pull_request_target|secrets\.|SMTP_PASS|DB_PASSWORD|GOOGLE_MAPS_API_KEY|id-token: write|contents: write|run:.*(?:deploy|ssh|scp|curl)/i);
});
