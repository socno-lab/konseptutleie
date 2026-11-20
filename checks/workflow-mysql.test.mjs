import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createMysqlStore} from '../server/store.mjs';
const enabled=process.env.WORKFLOW_MYSQL_TEST==='1';
test('real MySQL: persisted enquiry, atomic concurrent reservations, replacement and cancellation', {skip:!enabled},async()=>{
 const name=process.env.WORKFLOW_TEST_DATABASE;if(!/^ku_workflow_test[a-z0-9_]*$/.test(name||''))throw Error('An isolated ku_workflow_test database is required');
 const env={DB_HOST:'127.0.0.1',DB_PORT:process.env.WORKFLOW_TEST_PORT||'3306',DB_USER:'root',DB_PASSWORD:process.env.WORKFLOW_TEST_PASSWORD,DB_NAME:name};
 const p={id:'workflow-test-chair',name:'Teststol',category:'Stoler',active:true,stock:2,unavailable:0,price:100,weekPrice:300,monthPrice:700,rentalPricingMode:'manual'};
 const store=createMysqlStore(env,{revision:1,products:[p]});
 try{await store.init();const ids=[randomUUID(),randomUUID()];
 for(const id of ids){const s={id,email:'test@example.invalid',name:'Must not be copied',address:'Must not be copied',kind:'rental',acquisition:'rental',receivedAt:new Date().toISOString(),facts:[['Ønsket leieperiode','2027-01-05 til 2027-01-06'],['Prisgrunnlag','Boligfoto og visning']],lines:[{id:p.id,name:p.name,quantity:2,total:400}],delivery:{total:0}};await store.reserveEnquiry(id,'a'.repeat(64),s,'test',Date.now());}
 const get=async id=>(await store.workflowRecords()).find(r=>r.id===id);
 for(const id of ids){let r=await get(id);assert.equal(r.name,undefined);r.lines[0].review='ok';r=await store.changeWorkflow(id,r,'save',[p]);let preview=await store.workflowPreview(id,r,[p],'offer');r=await store.changeWorkflow(id,{...r,previewDigest:preview.previewDigest},'offer',[p]);await store.changeWorkflow(id,r,'accept',[p]);}
 const drafts=await Promise.all(ids.map(async id=>{const r=await get(id),preview=await store.workflowPreview(id,r,[p],'confirmation');return {...r,reserve:true,previewDigest:preview.previewDigest};}));
 const results=await Promise.allSettled(ids.map((id,i)=>store.changeWorkflow(id,drafts[i],'confirmation',[p])));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 let r=results.find(x=>x.status==='fulfilled').value;assert.equal(r.requirements[0].quantity,2);const id=r.id;
 const stale={...r};r=await store.changeWorkflow(id,{...r,changeReason:'En stol færre',lines:r.lines.map(l=>({...l,quantity:1}))},'save',[p]);assert.equal(r.requirements[0].quantity,2);
 const preview=await store.workflowPreview(id,r,[p],'confirmation');r=await store.changeWorkflow(id,{...r,reserve:true,previewDigest:preview.previewDigest},'confirmation',[p]);assert.equal(r.requirements[0].quantity,1);assert.equal(r.history.at(-1).document.version,2);
 await assert.rejects(store.changeWorkflow(id,stale,'cancel',[p]),/endret/);
 r=await store.changeWorkflow(id,r,'cancel',[p]);assert.equal(r.reserved,false);
 const jobs=await store.enquiryMailStatus();assert.ok(jobs.some(j=>j.status==='superseded'));assert.ok(jobs.some(j=>j.status==='cancelled'));
 }finally{await store.close();}
});
