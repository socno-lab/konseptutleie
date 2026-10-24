import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {createSubmissionSender,submissionFingerprint,validateSubmission} from '../server/submissions.mjs';
import {receiptSofaLines} from '../server/receipt-sofas.mjs';
import {receiptEntries,receiptGroupLabel} from '../public/receipt-layout.js';
import {enquiryEmail} from '../server/enquiry-email.mjs';
import {sofaBasket,saveSofa,withoutSofas} from '../public/sofa-model.js';

const module={active:true,category:'Sofaer',stock:12,unavailable:0,rentalPricingMode:'manual',price:100.11,weekPrice:300.33,monthPrice:500.55,moduleSeries:'Eksempelsofa',rentalModuleMinimum:2,moduleWidth:90,type:'sofa',relatedAddOns:['textile'],deliveryIncluded:true};
// Included transport isolates these receipt tests from the independent capacity/Google models.
const products=[{...module,id:'end',name:'Endemodul',moduleRole:'end'},{...module,id:'middle',name:'Midtmodul',moduleRole:'middle',moduleWidth:70,price:80.22,weekPrice:240.66,monthPrice:401.10},{id:'textile',name:'Tekstilpakke til sofa',category:'Tilvalg',active:true,isService:true,addonOnly:true,rentalPricingMode:'period',stock:0,unavailable:0,price:400,weekPrice:400,monthPrice:400},{id:'pack',name:'Fast sofapakke',category:'Pakker',active:true,isPackage:true,rentalPricingMode:'manual',price:170.01,weekPrice:510.03,monthPrice:850.05,components:[{id:'end',quantity:2}]}];
const a={id:'sofa-a',series:'Eksempelsofa',selection:{end:2,middle:1},textileId:'textile'},b={id:'sofa-b',series:'Eksempelsofa',selection:{end:2},textileId:''};
const sample=(rentalSofas=[a,b],basket=sofaBasket(rentalSofas))=>({id:'efc79d30-2390-43e7-9c3b-46e287867060',kind:'rental',name:'Lokal kontroll',email:'test@example.invalid',terms:'2026-10-22-leie-9-test',basket,rentalSofas,details:{phone:'00000000',address:'Eksempelveien 1, 1470 Eksempelsted',occasion:'Boligfoto og visning',start:'2030-03-30',end:'2030-04-02',delivery:'Henter og returnerer selv'}});
const snapshot=(input=sample(),catalog=products)=>createEnquirySnapshot({id:input.id,kind:input.kind,name:input.name,email:input.email,terms:input.terms},input,catalog);
const sum=lines=>Math.round(lines.reduce((n,l)=>n+(l.total||0),0)*100)/100;
const groups=s=>receiptEntries(s.lines).filter(e=>e.type==='group').map(e=>e.group);

test('two rental sofas preserve separate modules, exact prices and textile on its selected sofa only',()=>{
 const input=sample(),s=snapshot(input),legacy=snapshot({...input,rentalSofas:undefined}),g=groups(s);
 assert.equal(g.length,2);assert.equal(receiptGroupLabel(g[0]),'Eksempelsofa · Sofa 1');assert.equal(g[0].description,'3 moduler · ca. 250 cm bred');assert.equal(g[1].description,'2 moduler · ca. 180 cm bred');
 assert.equal(sum(s.lines),sum(legacy.lines));assert.equal(s.total,legacy.total);assert.deepEqual(s.lines.filter(l=>l.id==='end').map(l=>l.quantity),[2,2]);
 const textile=s.lines.find(l=>l.id==='textile');assert.equal(textile.quantity,1);assert.equal(textile.group.id,g[0].id);assert.equal(textile.addonFor[0].name,g[0].name);assert.ok(!s.lines.some(l=>l.id==='textile'&&l.group.id===g[1].id));
 const ordered=receiptEntries(s.lines);assert.equal(ordered.filter(e=>e.type==='subtotal').length,0);const first=ordered.filter(e=>e.type==='line'&&e.line.group.id===g[0].id);assert.deepEqual(first.map(e=>e.line.id),['end','middle','textile']);
 for(const audience of ['customer','internal']){const mail=enquiryEmail(s,audience);assert.match(mail.text,/Eksempelsofa · Sofa 1/);assert.match(mail.text,/Eksempelsofa · Sofa 2/);assert.match(mail.text,/Tilvalg til Eksempelsofa · Sofa 1: 1 × Tekstilpakke/);assert.doesNotMatch(mail.text,/Sofa 2: 1 × Tekstilpakke|Sofa 1 · 1 pakke/);assert.doesNotMatch(mail.text,/Delsum Eksempelsofa/);assert.doesNotMatch(mail.html,/Delsum Eksempelsofa/);assert.match(mail.text,/Foreløpig total/);assert.ok(mail.html.indexOf('Eksempelsofa · Sofa 1')<mail.html.indexOf('Eksempelsofa · Sofa 2'));}
});

test('three setups, duplication, removal and textile edits keep only their current quantities and prices',()=>{
 let state=saveSofa([],{},products,a);state=saveSofa(state.setups,state.cart,products,b);state=saveSofa(state.setups,state.cart,products,{...a,id:'sofa-c',selection:{...a.selection}});
 const three=snapshot(sample(state.setups,state.cart));assert.equal(groups(three).length,3);assert.equal(three.lines.filter(l=>l.id==='textile').length,2);assert.equal(three.lines.filter(l=>l.id==='end').reduce((n,l)=>n+l.quantity,0),6);
 const removed=withoutSofas(state.cart,[a]),remaining=state.setups.filter(s=>s.id!==a.id),two=snapshot(sample(remaining,removed));assert.equal(groups(two).length,2);assert.equal(two.lines.filter(l=>l.id==='textile').length,1);assert.equal(two.lines.find(l=>l.id==='textile').group.id,'rental-sofa:sofa-c');assert.equal(Math.round(sum(two.lines)*100),Math.round(sum(three.lines)*100)-Math.round(sum(three.lines.filter(l=>l.group.id==='rental-sofa:sofa-a'))*100));
 const edited=saveSofa(remaining,removed,products,{...remaining[1],textileId:''},'sofa-c');const noTextile=snapshot(sample(edited.setups,edited.cart));assert.ok(!noTextile.lines.some(l=>l.id==='textile'));assert.equal(Math.round(sum(noTextile.lines)*100),Math.round(sum(two.lines)*100)-40000);
});

test('sofa and package claims cannot double allocate modules or textiles, and loose quantities remain separate',()=>{
 const input=sample([a],{end:3,middle:1,textile:2,pack:1}),s=snapshot(input),legacy=snapshot({...input,rentalSofas:undefined});assert.equal(sum(s.lines),sum(legacy.lines));assert.equal(groups(s).length,2);const subtotals=receiptEntries(s.lines).filter(e=>e.type==='subtotal');assert.equal(subtotals.length,1);assert.equal(subtotals[0].group.name,'Fast sofapakke');for(const audience of ['customer','internal']){const mail=enquiryEmail(s,audience);assert.match(mail.text,/Delsum Fast sofapakke/);assert.doesNotMatch(mail.text,/Delsum Eksempelsofa/);}assert.equal(s.lines.find(l=>l.id==='end'&&!l.group).quantity,1);assert.equal(s.lines.find(l=>l.id==='textile'&&!l.group).quantity,1);assert.equal(s.lines.filter(l=>l.id==='textile'&&l.group?.type==='sofa').reduce((n,l)=>n+l.quantity,0),1);
 assert.throws(()=>snapshot(sample([a,b],{end:2,middle:1,textile:1,pack:1})),e=>e.status===400);
 assert.throws(()=>snapshot({...sample([a]),packageGroups:[{id:'custom:pack',packageId:'pack',quantity:1,selection:{end:2,middle:1,textile:1}}]}),e=>e.status===400);
});

test('malformed, unknown, unavailable and overclaimed sofa metadata fails closed; client prices/names never enter receipts',()=>{
 const input=sample();
 for(const raw of [null,{},Array(51).fill(a),[a,a],[{...a,id:'<script>'}],[{...a,series:'Other'}],[{...a,selection:{end:2,textile:1}}],[{...a,selection:{end:3}}],[{...a,selection:{middle:1}}],[{...a,selection:{end:1.5}}],[{...a,selection:{missing:2}}],[{...a,textileId:'middle'}],[{...a,textileId:'unknown'}],[a,{...b,textileId:'textile'}]])assert.throws(()=>snapshot({...input,rentalSofas:raw}),e=>e.status===400);
 for(const patch of [{active:false},{rentalEnabled:false},{deletedAt:'2030-01-01'}])assert.throws(()=>snapshot(input,products.map(p=>p.id==='end'?{...p,...patch}:p)),e=>e.status===400);
 const forged=snapshot({...input,rentalSofas:[{...a,name:'Forged',price:0,total:0,group:{id:'fixed:pack'}},b]});assert.equal(sum(forged.lines),sum(snapshot(input).lines));assert.ok(!JSON.stringify(forged).includes('Forged'));
 assert.deepEqual(receiptSofaLines([{id:'old',quantity:1,total:123}],undefined,products),[{id:'old',quantity:1,total:123}]);assert.deepEqual(receiptSofaLines([{id:'old',quantity:1,total:123}],[],products),[{id:'old',quantity:1,total:123}]);
});

test('unknown-price sofas stay unpriced and cent allocation conserves every original amount',()=>{
 const input=sample(),unpriced=snapshot(input,products.map(p=>p.id==='middle'?{...p,priceOnRequest:true}:p));assert.equal(unpriced.total,null);assert.equal(unpriced.lines.find(l=>l.id==='middle').total,null);assert.ok(!receiptEntries(unpriced.lines).some(e=>e.type==='subtotal'));
 const exact=receiptSofaLines([{id:'end',name:'Endemodul',quantity:4,total:0.03}],[{...a,selection:{end:2},textileId:''},b],products);assert.equal(sum(exact),0.03);assert.deepEqual(exact.map(l=>l.total),[0.02,0.01]);
});

test('identical sofa retries recover their immutable snapshot without new mail or repricing',async()=>{
 const rows=new Map(),jobs=[],messages=[];const store={enabled:true,async readEnquiry(id){return rows.get(id);},async reserveEnquiry(id,fingerprint,snapshot){if(rows.has(id))return rows.get(id);const row={fingerprint,snapshot:structuredClone(snapshot)};rows.set(id,row);for(const channel of ['customer','internal'])jobs.push({id,channel,snapshot:row.snapshot,status:'pending'});return row;},async pruneEnquiries(){},async pendingEnquiryMail(){return jobs.filter(j=>j.status==='pending');},async claimEnquiryMail(id,channel){const job=jobs.find(j=>j.id===id&&j.channel===channel);if(job.status!=='pending')return false;job.status='sending';return true;},async finishEnquiryMail(id,channel,status){jobs.find(j=>j.id===id&&j.channel===channel).status=status;}};
 const sender=createSubmissionSender({SMTP_USER:'post@konseptuell.no',SMTP_PASS:'isolated-test-only'},store,async message=>{messages.push(message);return {accepted:[message.to]};}),input=sample();
 // Terms are verified independently; use the current normalized version when available.
 const {getTermsVersions}=await import('../public/terms-versions.js');input.terms=getTermsVersions().rental;
 validateSubmission(input,products);const first=await sender.submit(input,products,'isolated-test');for(let i=0;i<100&&jobs.some(j=>j.status!=='sent');i++)await new Promise(resolve=>setTimeout(resolve,5));
 const repeated=await sender.submit(input,[],'isolated-test');assert.deepEqual(first.receipt,repeated.receipt);assert.equal(messages.length,2);assert.ok(jobs.every(j=>j.status==='sent'));assert.notEqual(submissionFingerprint(input),submissionFingerprint({...input,rentalSofas:[{...a,textileId:''},b]}));await assert.rejects(sender.submit({...input,rentalSofas:[b,a]},products,'isolated-test'),e=>e.status===409);
});
