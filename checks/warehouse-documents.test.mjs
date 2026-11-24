import test from 'node:test';
import assert from 'node:assert/strict';
import {warehouseItems,warehouseMessage} from '../server/warehouse-documents.mjs';
import {createSubmissionSender} from '../server/submissions.mjs';

const products=[
 {id:'chair',name:'Stol',image:'/assets/skansnas-brun.webp'},
 {id:'sofa',name:'Basesett',moduleSeries:'Skibby',moduleRole:'base'},
 {id:'kit',name:'Tekstilpakke',isService:true},
 {id:'service',name:'Styling',isService:true},
 {id:'package',name:'Møbelpakke',isPackage:true,components:[{id:'chair',quantity:4},{id:'sofa',quantity:1}]}
];
const items=warehouseItems(['package','kit','service'].map(id=>({id,quantity:1})),products);
const snapshot={documentType:'confirmation',version:2,workflow:{id:'test',start:'2026-12-05',end:'2026-12-06',deliveryDate:'2026-12-04',pickupDate:'2026-12-07',deliveryMode:'pickup'},warehouse:{items,name:'Eksempelkunde'},lines:[]};
test('warehouse mail sends the printable files to the warehouse with a page per physical unit',async()=>{
 assert.equal(items.length,5);
 assert.deepEqual(items.map(i=>i.physical),[true,true,true,true,false]);
 assert.deepEqual(items.slice(1,3).map(i=>i.context),['Møbelpakke / Skibby','Møbelpakke / Skibby']);
 let delivered;
 const store={enabled:true,pendingEnquiryMail:async()=>[{id:'test',channel:'internal',snapshot}],claimEnquiryMail:async()=>true,finishEnquiryMail:async(id,ch,status)=>assert.equal(status,'sent')};
 await createSubmissionSender({SMTP_PASS:'test'},store,async msg=>{delivered=msg;return {accepted:[msg.to]};}).flush();
 assert.equal(delivered.to,'post@konseptuell.no');
 assert.match(delivered.text,/erstatter tidligere versjon/);
 assert.deepEqual(delivered.attachments.map(a=>a.filename),['Plukkliste.pdf','Reservasjonsark.pdf']);
 assert.deepEqual(delivered.attachments.map(a=>a.content.toString('latin1').match(/\/Type \/Page\b/g).length),[1,7]);
});
test('an order consisting exclusively of services only needs the checklist',async()=>{
 const message=await warehouseMessage({...snapshot,warehouse:{items:items.filter(i=>!i.physical)}});
 assert.equal(message.attachments.length,1);
});
