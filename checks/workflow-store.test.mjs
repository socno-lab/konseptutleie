import {defaultSettings} from '../public/site-settings.js?v=fest20261114';
import test from 'node:test';
import assert from 'node:assert/strict';
import {workflowStore} from '../server/workflow-store.mjs';
import {workflowRecord,documentDigest} from '../server/enquiry-workflow.mjs';
const product={id:'chair',name:'Stol',active:true,stock:2,unavailable:0,price:100,weekPrice:300,monthPrice:700,rentalPricingMode:'manual'};
function fixture(catalog=[product]){
 const make=id=>({...workflowRecord({id,company:'Testbedrift',email:'test@example.invalid',kind:'rental',address:'Testveien 1, 2010 Strømmen',receivedAt:'2026-11-20',facts:[['Ønsket leieperiode','2026-12-05 til 2026-12-06']],lines:[{id:'chair',name:'Stol',quantity:2,total:400}],delivery:{total:0}}),status:'accepted',lines:[{key:'0',id:'chair',name:'Stol',originalId:'chair',originalName:'Stol',quantity:2,total:400,review:'ok',image:''}],changeReason:'',history:[{id:'offer-'+id,type:'offer'}]});
 let state={records:[make('a'),make('b')],settings:structuredClone(defaultSettings),jobs:[],enquiries:[]},failQueue=false,tail=Promise.resolve();
 const execute=async(db,sql,args=[])=>{
  if(sql==='SELECT body FROM ku_enquiries WHERE id=?')return [db.enquiries.filter(e=>e.id===args[0]).map(e=>({body:JSON.stringify(e.snapshot)}))];
  if(sql==='SELECT body FROM ku_enquiries')return [db.enquiries.map(e=>({body:JSON.stringify(e.snapshot)}))];
  if(sql.startsWith('INSERT IGNORE INTO ku_workflow')){if(!db.records.some(r=>r.id===args[0]))db.records.push(JSON.parse(args[1]));return [{}];}
  if(sql==='SELECT body FROM ku_site_settings WHERE id=1')return [[{body:JSON.stringify(db.settings)}]];
  if(sql==='SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE')return [[{body:JSON.stringify(catalog)}]];
  if(sql.startsWith('SELECT body FROM ku_workflow'))return [db.records.map(r=>({body:JSON.stringify(r)}))];
  if(sql.startsWith('INSERT INTO ku_enquiries')){db.enquiries.push({id:args[0],snapshot:JSON.parse(args[2])});return [{}];}
  if(sql.startsWith('INSERT INTO ku_enquiry_mail')){if(failQueue===true||failQueue===(sql.includes("'internal'")?'internal':'customer'))throw Error('queue failure');db.jobs.push({id:args[0],status:'pending',channel:sql.includes('(?,?,?)')?args[1]:sql.includes("'internal'")?'internal':'customer'});return [{}];}
  if(sql.startsWith('UPDATE ku_workflow')){db.records=db.records.map(r=>r.id===args[1]?JSON.parse(args[0]):r);return [{}];}
  if(sql.startsWith('SELECT status FROM ku_enquiry_mail'))return [[db.jobs.find(j=>j.id===args[0])].filter(Boolean)];
  if(sql.startsWith("UPDATE ku_enquiry_mail SET status='sending'")){const job=db.jobs.find(j=>j.id===args[1]&&j.channel===args[2]&&j.status==='pending');if(job)job.status='sending';return [{affectedRows:job?1:0}];}
  if(sql.startsWith("UPDATE ku_enquiry_mail SET status='superseded'")){for(const j of db.jobs)if(j.id===args[0]&&j.status==='pending')j.status='superseded';return [{}];}
  if(sql.startsWith("UPDATE ku_enquiry_mail SET status='cancelled'")){for(const j of db.jobs)if(j.id===args[0]&&j.status==='pending')j.status='cancelled';return [{}];}
  if(sql==='DELETE FROM ku_enquiry_mail WHERE submission_id=?'){db.jobs=db.jobs.filter(j=>j.id!==args[0]);return [{}];}
  if(sql==='DELETE FROM ku_enquiries WHERE id=?'){db.enquiries=db.enquiries.filter(e=>e.id!==args[0]);return [{}];}
  if(sql==='DELETE FROM ku_submissions WHERE id=?')return [{}];
  if(sql==='DELETE FROM ku_workflow WHERE id=?'){db.records=db.records.filter(r=>r.id!==args[0]);return [{}];}
  throw Error('Unexpected SQL: '+sql);
 };
 const pool={execute:(...args)=>execute(state,...args),async getConnection(){let local,release;return {async beginTransaction(){const before=tail;tail=new Promise(r=>{release=r;});await before;local=structuredClone(state);},execute:(...args)=>execute(local,...args),async commit(){state=local;},async rollback(){},release(){release();}};}};
 return {store:workflowStore(async()=>{},pool,{today:()=>'2026-12-05'}),get state(){return state;},set failQueue(v){failQueue=v;}};
}
async function input(f,id='a',extra={}){const r=(await f.store.workflowRecords()).find(r=>r.id===id),data={...r,...extra};const preview=await f.store.workflowPreview(id,data,[product],'confirmation');return {...data,previewDigest:preview.previewDigest,reserve:true};}
test('confirmation reserves and queues one immutable document atomically, stale retry cannot double-send',async()=>{const f=fixture(),data=await input(f);const saved=await f.store.changeWorkflow('a',data,'confirmation',[product]);assert.equal(saved.reserved,true);assert.equal(saved.requirements[0].quantity,2);assert.equal(f.state.jobs.length,1);assert.equal(f.state.enquiries[0].snapshot.documentType,'confirmation');await assert.rejects(f.store.changeWorkflow('a',data,'confirmation',[product]),/endret/);assert.equal(f.state.jobs.length,1);});
test('queue insertion failure rolls back reservation and history together',async()=>{const f=fixture(),data=await input(f);f.failQueue=true;await assert.rejects(f.store.changeWorkflow('a',data,'confirmation',[product]),/queue failure/);assert.equal(f.state.records[0].reserved,false);assert.equal(f.state.enquiries.length,0);});
test('concurrent confirmations cannot reserve same units twice',async()=>{const f=fixture(),a=await input(f,'a'),b=await input(f,'b');const results=await Promise.allSettled([f.store.changeWorkflow('a',a,'confirmation',[product]),f.store.changeWorkflow('b',b,'confirmation',[product])]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.state.jobs.length,1);assert.equal(f.state.records.filter(r=>r.reserved).length,1);});
test('draft edits retain confirmed reservation; new confirmation replaces it and increments document version',async()=>{const f=fixture();let r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);r=await f.store.changeWorkflow('a',{...r,start:'2027-01-01',end:'2027-01-02',deliveryDate:'2027-01-01',pickupDate:'2027-01-02',changeReason:'Nye datoer'},'save',[product]);assert.equal(r.reservation.start,'2026-12-04');const doc=await input(f);r=await f.store.changeWorkflow('a',doc,'confirmation',[product]);assert.equal(r.reservation.start,'2027-01-01');assert.equal(r.history.at(-1).document.version,2);assert.equal(r.history[1].document.workflow.start,'2026-12-05');});
test('cancel frees reservation and prevents unsent confirmation from sending',async()=>{const f=fixture();const r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const cancelled=await f.store.changeWorkflow('a',r,'cancel',[product]);assert.equal(cancelled.reserved,false);assert.deepEqual(cancelled.requirements,[]);assert.equal(f.state.jobs[0].status,'cancelled');});
test('preview digest rejects unseen price or text changes',async()=>{const f=fixture(),data=await input(f);data.intro='Changed after preview';await assert.rejects(f.store.changeWorkflow('a',data,'confirmation',[product]),/forhåndsvisningen/);assert.equal(f.state.jobs.length,0);});
test('updated confirmation supersedes pending predecessor without deleting historical document',async()=>{const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const data=await input(f,'a',{changeReason:'Oppdatert tidsrom'});const saved=await f.store.changeWorkflow('a',data,'confirmation',[product]);assert.equal(f.state.jobs[0].status,'superseded');assert.equal(f.state.jobs[1].status,'pending');assert.equal(saved.history.filter(h=>h.type==='confirmation').length,2);});
test('a confirmed order cannot accidentally be downgraded to a new offer or accepted state',async()=>{const f=fixture();const r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);await assert.rejects(f.store.changeWorkflow('a',r,'accept',[product]),/aksept/);const data=await input(f);await assert.rejects(f.store.changeWorkflow('a',data,'offer',[product]),/bekreftet bestilling/);});
test('incomplete offer can be previewed with unknown prices, but cannot be sent',async()=>{const f=fixture(),r=f.state.records[0],data={...r,transport:null,lines:r.lines.map(l=>({...l,total:null,review:'pending'}))};const preview=await f.store.workflowPreview('a',data,[product],'offer');assert.equal(preview.canSend,false);assert.match(preview.warning,/Kontroller/);assert.match(preview.text,/Transport: Avklares/);assert.match(preview.text,/Totalt inkl. mva.: Avklares/);assert.match(preview.html,/Avklares/);await assert.rejects(f.store.changeWorkflow('a',{...data,previewDigest:preview.previewDigest},'offer',[product]),/Kontroller/);assert.equal(f.state.jobs.length,0);});
test('completed preview is sendable and escapes customer-controlled text',async()=>{const f=fixture(),r=f.state.records[0],preview=await f.store.workflowPreview('a',{...r,intro:'<script>alert(1)</script>'},[product],'offer');assert.equal(preview.canSend,true);assert.equal(preview.warning,'');assert.ok(!preview.html.includes('<script>'));assert.match(preview.html,/&lt;script&gt;/);});

test('retention removes closed workflow and document queue together while preserving active enquiry',async()=>{const f=fixture();const r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const cancelled=await f.store.changeWorkflow('a',r,'cancel',[product]);const at=Date.parse(cancelled.closedAt);await f.store.pruneWorkflow(at+30*86400000-1);assert.equal(f.state.records.length,2);await f.store.pruneWorkflow(at+30*86400000);assert.deepEqual(f.state.records.map(r=>r.id),['b']);assert.equal(f.state.enquiries.length,0);assert.equal(f.state.jobs.length,0);});
test('manual written acceptance supports external offers and does not edit unpriced lines',async()=>{const f=fixture();f.state.records[0].status='new';f.state.records[0].history=[];f.state.records[0].lines[0].total=null;const before=structuredClone(f.state.records[0].lines);const r=await f.store.changeWorkflow('a',{revision:1},'accept',[]);assert.equal(r.status,'accepted');assert.equal(r.acceptanceSource,'admin');assert.deepEqual(r.lines,before);assert.equal(f.state.jobs.length,0);assert.equal(r.reserved,false);const repeated=await f.store.changeWorkflow('a',{revision:r.revision},'accept',[]);assert.equal(repeated.revision,r.revision);});
async function offered(f){f.state.records[0].status='new';f.state.records[0].history=[];const r=await f.store.changeWorkflow('a',await input(f),'offer',[product]);return {record:r,token:new URL(r.history.at(-1).document.acceptUrl).searchParams.get('token')};}
test('opening offer link is read-only; customer acceptance queues one internal notification and never reserves',async()=>{const f=fixture(),{token}=await offered(f);const before=f.state.records[0].revision;const viewed=await f.store.offerAcceptance(token);assert.equal(viewed.accepted,false);assert.equal(f.state.records[0].revision,before);assert.doesNotMatch(viewed.html,/Aksepter tilbud<\/a>/);await Promise.all([f.store.offerAcceptance(token,true),f.store.offerAcceptance(token,true)]);assert.equal(f.state.records[0].status,'accepted');assert.equal(f.state.records[0].acceptanceSource,'customer');assert.equal(f.state.records[0].reserved,false);assert.equal(f.state.jobs.length,2);assert.equal(f.state.jobs[1].channel,'internal');assert.equal(f.state.enquiries.filter(e=>e.snapshot.documentType==='acceptance').length,1);assert.equal((await f.store.offerAcceptance(token)).accepted,true);});
test('expired, cancelled and superseded offer links cannot accept; notification failure rolls back acceptance',async()=>{const f=fixture(),{token}=await offered(f);f.state.records[0].offerAcceptance.expiresAt=Date.now()-1;await assert.rejects(f.store.offerAcceptance(token,true),/oppdatert tilbud/);f.state.records[0].offerAcceptance.expiresAt=Date.now()+100000;f.failQueue=true;await assert.rejects(f.store.offerAcceptance(token,true),/queue failure/);assert.equal(f.state.records[0].status,'offered');assert.equal(f.state.jobs.length,1);f.failQueue=false;await f.store.changeWorkflow('a',await input(f),'offer',[product]);await assert.rejects(f.store.offerAcceptance(token,true),/ugyldig|erstattet/);const latest=new URL(f.state.records[0].history.at(-1).document.acceptUrl).searchParams.get('token');await f.store.changeWorkflow('a',f.state.records[0],'cancel',[product]);await assert.rejects(f.store.offerAcceptance(latest,true),/ikke lenger/);});
test('concurrent pickup acceptances cannot book the same slot and cancellation releases it',async t=>{t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-20T10:00:00Z')});const f=fixture();f.state.records[0].deliveryMode='pickup';f.state.records[1].deliveryMode='pickup';const a=await offered(f);const b=await f.store.changeWorkflow('b',await input(f,'b'),'offer',[product]);const tokenB=new URL(b.history.at(-1).document.acceptUrl).searchParams.get('token');const times={pickupTime:'08:00',returnTime:'08:00'};const results=await Promise.allSettled([f.store.offerAcceptance(a.token,true,times),f.store.offerAcceptance(tokenB,true,times)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const winner=f.state.records.find(r=>r.appointments?.length);const loser=winner.id==='a'?tokenB:a.token;const viewed=await f.store.offerAcceptance(loser);assert.ok(!viewed.slots[0].times.includes('08:00'));await f.store.changeWorkflow(winner.id,{revision:winner.revision},'cancel',[product]);assert.ok((await f.store.offerAcceptance(loser)).slots[0].times.includes('08:00'));await f.store.offerAcceptance(loser,true,times);assert.equal(f.state.records.filter(r=>r.status==='accepted').length,1);});
test('pickup draft changes keep existing appointment until updated confirmation replaces it',async t=>{t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-20T10:00:00Z')});const f=fixture();f.state.records[0].deliveryMode='pickup';const {token}=await offered(f);await f.store.offerAcceptance(token,true,{pickupTime:'08:00',returnTime:'08:00'});let r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);r=await f.store.changeWorkflow('a',{...r,pickupTime:'09:00',changeReason:'Nytt hentetidspunkt'},'save',[product]);assert.equal(r.appointments[0].time,'08:00');r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);assert.equal(r.appointments[0].time,'09:00');});
test('offer freezes rental terms and confirmation preserves them after tariff updates',async()=>{const f=fixture(),{record:r,token}=await offered(f),terms=r.history.at(-1).document.rentalTerms;assert.ok(terms.html.includes('Leie for bedrifter'));f.state.settings.delivery.normalSingle+=100;const viewed=await f.store.offerAcceptance(token);assert.deepEqual(viewed.rentalTerms,terms);await f.store.offerAcceptance(token,true);const confirmed=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);assert.deepEqual(confirmed.history.at(-1).document.rentalTerms,terms);const other=await f.store.changeWorkflow('b',await input(f,'b'),'offer',[product]);assert.notEqual(other.history.at(-1).document.rentalTerms.version,terms.version);});
test('changing current terms after preview requires a new preview before offer can be sent',async()=>{const f=fixture();f.state.records[0].status='new';f.state.records[0].history=[];const data=await input(f);f.state.settings.delivery.normalSingle+=50;await assert.rejects(f.store.changeWorkflow('a',data,'offer',[product]),/forhåndsvisningen/);assert.equal(f.state.jobs.length,0);});
test('change request stores follow-up status and sends message once without accepting or retaining message in workflow',async()=>{const f=fixture(),{token}=await offered(f);await assert.rejects(f.store.offerAcceptance(token,true,{decision:'change',message:'  '}),/Beskriv/);const response=await f.store.offerAcceptance(token,true,{decision:'change',message:'Vi ønsker et ekstra bord.'});assert.equal(response.response,'change');assert.equal(response.accepted,false);assert.equal(f.state.records[0].status,'changes_requested');assert.equal(f.state.records[0].reserved,false);assert.ok(!JSON.stringify(f.state.records[0]).includes('ekstra bord'));assert.equal(f.state.enquiries.at(-1).snapshot.customerMessage,'Vi ønsker et ekstra bord.');await f.store.offerAcceptance(token,true,{decision:'change',message:'Vi ønsker et ekstra bord.'});assert.equal(f.state.jobs.length,2);assert.equal((await f.store.offerAcceptance(token)).response,'change');});
test('decline releases appointments and closes enquiry without requiring pickup times',async()=>{const f=fixture();f.state.records[0].deliveryMode='pickup';const {token}=await offered(f);f.state.records[0].appointments=[{date:'2026-12-04',time:'08:00'}];const response=await f.store.offerAcceptance(token,true,{decision:'decline',message:'Vi trenger ikke møblene likevel.'});assert.equal(response.response,'decline');assert.equal(response.accepted,false);assert.equal(f.state.records[0].status,'cancelled');assert.deepEqual(f.state.records[0].appointments,[]);assert.ok(f.state.records[0].closedAt);assert.equal((await f.store.offerAcceptance(token)).response,'decline');await f.store.offerAcceptance(token,true,{decision:'decline'});assert.equal(f.state.jobs.length,2);});


test('early consumer acceptance requires explicit boolean consent and queues a durable receipt exactly once',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-25T10:00:00Z')});
 const f=fixture();f.state.records[0].customerType='consumer';const {token}=await offered(f);
 const initial=await f.store.offerAcceptance(token);assert.equal(initial.earlyStart.required,true);const revision=f.state.records[0].revision;
 for(const earlyStartConsent of [undefined,false,'true'])await assert.rejects(f.store.offerAcceptance(token,true,{earlyStartConsent}),/Godkjenn særskilt/);
 assert.equal(f.state.records[0].revision,revision);assert.equal(f.state.jobs.length,1);
 await f.store.offerAcceptance(token,true,{earlyStartConsent:true});
 const saved=f.state.records[0];assert.equal(saved.earlyStartConsent.text,initial.earlyStart.text);assert.equal(saved.earlyStartConsent.deliveryDate,'2026-12-04');assert.equal(saved.earlyStartConsent.offerId,saved.acceptedOfferId);
 assert.deepEqual(f.state.jobs.map(j=>j.channel),['customer','internal','customer']);
 const snapshot=f.state.enquiries.at(-1).snapshot;const {workflowEmail}=await import('../server/enquiry-workflow.mjs');
 for(const channel of ['internal','customer']){const mail=workflowEmail({...snapshot,channel});assert.ok(mail.text.includes(initial.earlyStart.text));assert.ok(mail.html.includes(initial.earlyStart.text));}
 const confirmed=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);assert.ok(workflowEmail(confirmed.history.at(-1).document).text.includes(initial.earlyStart.text));
 await f.store.offerAcceptance(token,true,{earlyStartConsent:true});assert.equal(f.state.jobs.length,4);
});
test('consumer can request changes without early-start consent and business acceptance does not require it',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-25T10:00:00Z')});
 const f=fixture();f.state.records[0].customerType='consumer';const {token}=await offered(f);await f.store.offerAcceptance(token,true,{decision:'change',message:'Ny dato takk'});assert.equal(f.state.records[0].earlyStartConsent,undefined);
 const g=fixture(),offer=await offered(g);assert.equal((await g.store.offerAcceptance(offer.token)).earlyStart.required,false);await g.store.offerAcceptance(offer.token,true);assert.equal(g.state.jobs.length,2);
});

test('customer consent receipt queue failure rolls back acceptance and internal notification',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-25T10:00:00Z')});const f=fixture();f.state.records[0].customerType='consumer';const {token}=await offered(f);f.failQueue='customer';
 await assert.rejects(f.store.offerAcceptance(token,true,{earlyStartConsent:true}),/queue failure/);assert.equal(f.state.records[0].status,'offered');assert.equal(f.state.records[0].earlyStartConsent,undefined);assert.equal(f.state.jobs.length,1);
});

test('proposal imports once without free text and progresses from an empty draft to a reserved rental',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-11-20T10:00:00Z')});const f=fixture();
 const source={id:'proposal',kind:'rental',acquisition:'proposal',email:'proposal@example.invalid',name:'Private name',phone:'98765432',receivedAt:'2026-11-20T09:00:00Z',facts:[['Hva trenger du?','Secret request'],['Dato eller periode','En helg i januar'],['Sted','Private venue'],['Budsjett','Private budget']],lines:[],delivery:null};
 f.state.enquiries.push({id:source.id,snapshot:source});
 let r=(await f.store.workflowRecords()).find(r=>r.id===source.id);assert.equal(r.requestType,'proposal');assert.equal(r.status,'new');assert.equal(r.start,'');assert.equal(r.deliveryMode,'undecided');assert.equal(r.transport,null);assert.equal(r.lines.length,0);
 assert.doesNotMatch(JSON.stringify(r),/Private name|98765432|Secret request|Private venue|Private budget|En helg i januar/);
 await f.store.workflowRecords();assert.equal(f.state.records.filter(r=>r.id===source.id).length,1);
 r=await f.store.changeWorkflow(source.id,r,'save',[product]);assert.equal(r.lines.length,0);
 const empty=await f.store.workflowPreview(source.id,r,[product],'offer');assert.equal(empty.canSend,false);assert.match(empty.warning,/Legg til produkter/);assert.doesNotMatch(empty.text,/NaN/);
 r=await f.store.changeWorkflow(source.id,{...r,lines:[{key:'new-123',id:product.id,quantity:1,review:'ok',total:null}]},'save',[product]);assert.equal(r.lines[0].total,null);
 r=await f.store.changeWorkflow(source.id,{...r,start:'2027-01-05',end:'2027-01-06',deliveryDate:'',pickupDate:'',scope:'standard',deliveryMode:'delivery',deliveryAddress:'Testveien 1, 2010 Strømmen',transport:100},'save',[product]);assert.ok(r.lines[0].total>0);assert.equal(r.deliveryMode,'delivery');assert.equal(r.deliveryDate,'2027-01-05');assert.equal(r.pickupDate,'2027-01-06');
 const preview=await f.store.workflowPreview(source.id,r,[product],'offer');assert.equal(preview.canSend,true);
 r=await f.store.changeWorkflow(source.id,{...r,previewDigest:preview.previewDigest},'offer',[product]);assert.ok(r.history.at(-1).document.rentalTerms);
 const token=new URL(r.history.at(-1).document.acceptUrl).searchParams.get('token');await f.store.offerAcceptance(token,true);
 const confirmed=await f.store.changeWorkflow(source.id,await input(f,source.id),'confirmation',[product]);assert.equal(confirmed.reserved,true);assert.equal(confirmed.requirements[0].id,product.id);
 const closed=await f.store.changeWorkflow(source.id,{revision:confirmed.revision},'cancel',[product]);assert.equal(closed.reserved,false);assert.deepEqual(closed.requirements,[]);
});

test('return completion queues optional thank-you atomically and never sends twice',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-12-10T10:00:00Z')});const f=fixture(),r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);
 assert.equal((await f.store.workflowAvailability([product],'2027-01-01','2027-01-02'))[0].unavailable,2);
 const preview=await f.store.workflowPreview('a',{revision:r.revision},[product],'return');assert.match(preview.html,/Gi en anmeldelse på Google/);assert.equal(f.state.jobs.length,1);
 const data={revision:r.revision,sendThanks:true,previewDigest:preview.previewDigest};const results=await Promise.allSettled([f.store.changeWorkflow('a',data,'complete',[product]),f.store.changeWorkflow('a',data,'complete',[product])]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const done=f.state.records.find(r=>r.id==='a');assert.equal(done.status,'completed');assert.equal(done.reserved,false);assert.equal(done.returnedAt,'2026-12-10T10:00:00.000Z');assert.deepEqual(done.requirements,[]);assert.deepEqual(done.appointments,[]);assert.equal(f.state.jobs.length,2);assert.equal(f.state.enquiries.at(-1).snapshot.documentType,'return');
 await f.store.changeWorkflow('a',{revision:done.revision,sendThanks:true},'complete',[product]);assert.equal(f.state.jobs.length,2);assert.equal((await f.store.workflowAvailability([product],'2027-01-01','2027-01-02'))[0].unavailable,0);
 await assert.rejects(f.store.changeWorkflow('a',done,'save',[product]),/avsluttet/);
 const at=Date.parse(done.returnedAt);await f.store.pruneWorkflow(at+30*86400000-1);assert.ok(f.state.records.some(r=>r.id==='a'));await f.store.pruneWorkflow(at+30*86400000);assert.ok(!f.state.records.some(r=>r.id==='a'));assert.equal(f.state.jobs.length,0);
});
test('return without thank-you queues nothing and failure to queue selected thank-you leaves rental active',async()=>{
 const f=fixture();let r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const preview=await f.store.workflowPreview('a',{revision:r.revision},[product],'return');f.failQueue=true;await assert.rejects(f.store.changeWorkflow('a',{revision:r.revision,sendThanks:true,previewDigest:preview.previewDigest},'complete',[product]),/queue failure/);assert.equal(f.state.records[0].status,'confirmed');assert.equal(f.state.records[0].reserved,true);assert.equal(f.state.jobs.length,1);
 f.failQueue=false;r=await f.store.changeWorkflow('a',{revision:r.revision,sendThanks:false},'complete',[product]);assert.equal(r.thankYouRequested,false);assert.equal(f.state.jobs.length,1);
 await assert.rejects(f.store.changeWorkflow('b',{revision:1},'complete',[product]),/Kun et ordrebekreftet/);
});
test('stale thank-you preview cannot close an edited rental',async()=>{const f=fixture();let r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const preview=await f.store.workflowPreview('a',{revision:r.revision},[product],'return');r=await f.store.changeWorkflow('a',{...r,changeReason:'Dato avklares'},'save',[product]);await assert.rejects(f.store.changeWorkflow('a',{revision:r.revision,sendThanks:true,previewDigest:preview.previewDigest},'complete',[product]),/forhåndsvisningen/);assert.equal(f.state.records[0].status,'confirmed');});
test('test thank-you queues a marked standalone message without changing rentals',async()=>{const f=fixture(),before=structuredClone(f.state.records);for(const email of ['bad','andreas@example.invalid\r\nBcc:a@b.no'])await assert.rejects(f.store.queueRentalReturnTest(email),/testadresse/);const sent=await f.store.queueRentalReturnTest('test@example.invalid');assert.ok(sent.reference);assert.deepEqual(f.state.records,before);assert.equal(f.state.jobs.length,1);assert.equal(f.state.enquiries[0].snapshot.test,true);assert.equal(f.state.enquiries[0].snapshot.email,'test@example.invalid');});


test('automatic reminder queue is atomic and deduplicated across concurrent ticks and restarts',async()=>{
 const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const now=Date.parse('2026-12-03T09:00:00Z');
 const counts=await Promise.all([f.store.queueWorkflowReminders(now),f.store.queueWorkflowReminders(now)]);assert.equal(counts.reduce((a,b)=>a+b,0),1);assert.equal(await f.store.queueWorkflowReminders(now+60000),0);
 const r=f.state.records[0],h=r.history.find(h=>h.type==='reminder');assert.ok(h);assert.equal(h.document.workflow.deliveryDate,'2026-12-04');assert.equal(h.document.lines.length,0);
 assert.equal(await f.store.claimWorkflowReminder(h.id,h.document,now),true);assert.equal(await f.store.claimWorkflowReminder(h.id,h.document,now),false);
});
test('reminder queue failure rolls back both history and mail and the next tick can retry',async()=>{
 const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);f.failQueue=true;const now=Date.parse('2026-12-03T09:00Z');await assert.rejects(f.store.queueWorkflowReminders(now),/queue failure/);assert.equal(f.state.records[0].history.filter(h=>h.type==='reminder').length,0);f.failQueue=false;assert.equal(await f.store.queueWorkflowReminders(now),1);
});
test('latest confirmation supersedes queued reminder; saved draft alone does not',async()=>{
 const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const now=Date.parse('2026-12-03T09:00Z');await f.store.queueWorkflowReminders(now);
 const h=f.state.records[0].history.find(h=>h.type==='reminder');await f.store.changeWorkflow('a',{...f.state.records[0],deliveryDate:'2026-12-05',changeReason:'Ny levering'},'save',[product]);
 assert.equal(await f.store.queueWorkflowReminders(now),0);const data=await input(f);await f.store.changeWorkflow('a',data,'confirmation',[product]);
 assert.equal(await f.store.claimWorkflowReminder(h.id,h.document,now),false);assert.equal(f.state.jobs.find(j=>j.id===h.id).status,'cancelled');assert.equal(await f.store.queueWorkflowReminders(Date.parse('2026-12-04T09:00Z')),1);
});
test('cancellation and confirmed return prevent reminders, including queued mail; in-flight reminders serialize changes',async()=>{
 for(const action of ['cancel','complete']){const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const now=Date.parse('2026-12-03T09:00Z');await f.store.queueWorkflowReminders(now);const h=f.state.records[0].history.find(h=>h.type==='reminder');
 await f.store.changeWorkflow('a',f.state.records[0],action,[product]);assert.equal(await f.store.claimWorkflowReminder(h.id,h.document,now),false);assert.equal(await f.store.queueWorkflowReminders(now),0);}
 const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const now=Date.parse('2026-12-03T09:00Z');await f.store.queueWorkflowReminders(now);const h=f.state.records[0].history.find(h=>h.type==='reminder');assert.equal(await f.store.claimWorkflowReminder(h.id,h.document,now),true);await assert.rejects(f.store.changeWorkflow('a',f.state.records[0],'cancel',[product]),/påminnelse sendes/);
});

test('a queued reminder does not send the next day and a cancelled event can be restored without duplicates',async()=>{
 const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const now=Date.parse('2026-12-03T09:00Z');await f.store.queueWorkflowReminders(now);const h=f.state.records[0].history.find(h=>h.type==='reminder');
 assert.equal(await f.store.claimWorkflowReminder(h.id,h.document,now+86400000),false);assert.equal(await f.store.queueWorkflowReminders(now),1);assert.equal(await f.store.queueWorkflowReminders(now),0);
});

test('actual mail completion records one send timestamp in existing document history',async()=>{const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const id=f.state.records[0].history.at(-1).id,now=Date.parse('2026-11-21T12:00Z');await f.store.recordWorkflowMailSent(id,now);const h=f.state.records[0].history.at(-1);assert.equal(h.sentAt,'2026-11-21T12:00:00.000Z');const count=f.state.records[0].history.length;await f.store.recordWorkflowMailSent(id,now+1000);assert.equal(f.state.records[0].history.length,count);assert.equal(f.state.records[0].history.at(-1).sentAt,h.sentAt);});

test('server rejects premature return and return preview without releasing reservation or sending thanks',async()=>{const f=fixture();await f.store.changeWorkflow('a',await input(f,'a',{start:'2026-12-08',end:'2026-12-09',deliveryDate:'2026-12-08',pickupDate:'2026-12-09'}),'confirmation',[product]);const r=f.state.records[0],count=f.state.jobs.length;await assert.rejects(f.store.changeWorkflow('a',{...r,sendThanks:false},'complete',[product]),/før den bekreftede leieperioden/);await assert.rejects(f.store.workflowPreview('a',r,[product],'return'),/før den bekreftede leieperioden/);assert.equal(f.state.records[0].reserved,true);assert.equal(f.state.jobs.length,count);});

test('updated confirmation freezes differences from the last actually sent order for preview and history',async()=>{const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);f.state.jobs[0].status='sent';const r=f.state.records[0],data={...r,changeReason:'En stol mindre',lines:r.lines.map(l=>({...l,quantity:1}))};const preview=await f.store.workflowPreview('a',data,[product],'confirmation');assert.match(preview.html,/Endret antall/);const saved=await f.store.changeWorkflow('a',{...data,reserve:true,previewDigest:preview.previewDigest},'confirmation',[product]);assert.equal(saved.history.at(-1).document.confirmationChanges.rows[0][0].text,'2 → 1 stk.');assert.equal(saved.history[1].document.confirmationChanges,null);});

test('invoice reminders use internal channel once per delivery day and cancel when latest confirmation changes',async()=>{const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);const now=Date.parse('2026-12-04T07:00Z');assert.equal(await f.store.queueWorkflowReminders(now),1);assert.equal(await f.store.queueWorkflowReminders(now),0);const h=f.state.records[0].history.find(h=>h.type==='invoice_reminder');assert.equal(f.state.jobs.find(j=>j.id===h.id).channel,'internal');await f.store.changeWorkflow('a',await input(f,'a',{changeReason:'Ny pris',transport:100}),'confirmation',[product]);assert.equal(await f.store.claimWorkflowReminder(h.id,h.document,now),false);assert.equal(await f.store.queueWorkflowReminders(now),1);const latest=f.state.records[0].history.filter(h=>h.type==='invoice_reminder').at(-1);assert.equal(latest.document.workflow.transport,100);assert.equal(await f.store.claimWorkflowReminder(latest.id,latest.document,now),true);f.state.jobs.find(j=>j.id===latest.id).status='sent';assert.equal(await f.store.queueWorkflowReminders(now),0);});

test('updated confirmation can send automatic change explanation without mandatory free text',async()=>{const f=fixture();await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);f.state.jobs[0].status='sent';const r=f.state.records[0],data={...r,changeReason:'',lines:r.lines.map(l=>({...l,quantity:1}))};const preview=await f.store.workflowPreview('a',data,[product],'confirmation');assert.match(preview.text,/Antallet av Stol er endret fra 2 til 1/);const saved=await f.store.changeWorkflow('a',{...data,reserve:true,previewDigest:preview.previewDigest},'confirmation',[product]);assert.equal(saved.history.at(-1).document.workflow.changeReason,'');assert.match(saved.history.at(-1).document.confirmationChanges.summary,/Antallet av Stol/);});

test('first confirmation previews and freezes a missing-item replacement made after accepting the offer',async()=>{
 const replacement={...product,id:'replacement',name:'Alternativ stol'};const catalog=[product,replacement],f=fixture(catalog),r=f.state.records[0];
 r.acceptedOfferId='accepted-offer';r.history=[{id:'accepted-offer',type:'offer',sentAt:'2026-11-21T12:00Z',document:{workflow:structuredClone({...r,history:[]})}}];
 const data={...r,lines:r.lines.map(l=>({...l,id:replacement.id,review:'missing',originalMissing:true}))};
 const preview=await f.store.workflowPreview('a',data,catalog,'confirmation');assert.equal(preview.canSend,true);assert.match(preview.html,/Erstatning ved mangel/);assert.match(preview.html,/Erstatter Stol/);assert.match(preview.text,/Stol er dessverre ikke tilgjengelig i ønsket antall/);assert.match(preview.text,/erstattet den med Alternativ stol/);
 const saved=await f.store.changeWorkflow('a',{...data,reserve:true,previewDigest:preview.previewDigest},'confirmation',catalog);
 assert.equal(saved.history.at(-1).document.confirmationChanges.rows[0][0].label,'Erstatning ved mangel');assert.equal(saved.requirements[0].id,replacement.id);
});

test('replacement reason stays consistent across updated offers, first confirmation and updated confirmation',async()=>{
 for(const missing of [true,false]){
  const alternative={...product,id:'alternative',name:'Alternativ stol'},replacement={...product,id:'replacement',name:'Ny erstatningsstol'},catalog=[product,alternative,replacement],f=fixture(catalog);
  let r=f.state.records[0];r.status='new';r.history=[];
  const send=async(action,data)=>{const preview=await f.store.workflowPreview('a',data,catalog,action);assert.equal(preview.canSend,true);const saved=await f.store.changeWorkflow('a',{...data,reserve:true,previewDigest:preview.previewDigest},action,catalog);for(const job of f.state.jobs)job.status='sent';return {preview,saved};};
  r=(await send('offer',r)).saved;
  r=await f.store.changeWorkflow('a',{...r,lines:r.lines.map(l=>({...l,id:alternative.id,review:missing?'missing':'alternative',originalMissing:missing}))},'save',catalog);
  const updatedOffer=await send('offer',r);assert.equal(/ikke ønsket antall tilgjengelig/.test(updatedOffer.preview.text),missing);assert.match(updatedOffer.preview.text,/Alternativ stol/);
  r=await f.store.changeWorkflow('a',{revision:updatedOffer.saved.revision},'accept',catalog);
  const confirmation=await send('confirmation',r);assert.doesNotMatch(confirmation.preview.text,/ikke tilgjengelig|Byttet vare|Erstatning ved mangel/,'accepted replacement is not announced as new');r=confirmation.saved;
  r=await f.store.changeWorkflow('a',{...r,lines:r.lines.map(l=>({...l,id:replacement.id,review:missing?'missing':'alternative',originalMissing:missing}))},'save',catalog);
  const updated=await send('confirmation',r);assert.equal(/ikke tilgjengelig i ønsket antall/.test(updated.preview.text),missing);assert.match(updated.preview.text,missing?/Alternativ stol er dessverre/:/Vi har byttet Alternativ stol/);
  assert.equal(updated.saved.history.at(-1).document.confirmationChanges.rows[0][0].label,missing?'Erstatning ved mangel':'Byttet vare');assert.equal(updated.saved.requirements[0].id,replacement.id);
 }
});

test('sent confirmations queue internal calendar requests once, update the changed leg and cancel both',async()=>{
 const f=fixture(), calendar=()=>f.state.enquiries.map(e=>e.snapshot).filter(s=>s.documentType==='transport_calendar');
 const first=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);
 const sent=record=>f.store.recordWorkflowMailSent(record.history.at(-1).id,Date.now());
 assert.equal(calendar().length,0);
 await sent(first);await sent(first);
 assert.deepEqual(calendar().map(s=>[s.method,s.event.phase,s.sequence]),[['REQUEST','outbound',0],['REQUEST','return',0]]);
 const revised=await f.store.changeWorkflow('a',await input(f,'a',{pickupDate:'2026-12-08',changeReason:'Ny hentedato'}),'confirmation',[product]);
 await sent(revised);
 assert.deepEqual(calendar().slice(2).map(s=>[s.event.phase,s.event.date,s.sequence]),[['return','2026-12-08',1]]);
 await f.store.changeWorkflow('a',f.state.records[0],'cancel',[product]);
 assert.deepEqual(calendar().slice(3).map(s=>[s.method,s.event.phase,s.sequence]),[['CANCEL','outbound',1],['CANCEL','return',2]]);
 assert.ok(calendar().every(s=>f.state.jobs.find(j=>j.id===s.id).channel==='internal'));
});

test('calendar backfill uses the sent confirmation once and never requeues customer mail',async()=>{
 const f=fixture();
 const r=await f.store.changeWorkflow('a',await input(f),'confirmation',[product]);
 await assert.rejects(f.store.changeWorkflow('a',r,'calendar',[product]),/sendt først/);
 f.state.jobs[0].status='sent';
 const draft=await f.store.changeWorkflow('a',{...r,pickupDate:'2026-12-15'},'save',[product]);
 const after=await f.store.changeWorkflow('a',draft,'calendar',[product]);
 await f.store.changeWorkflow('a',after,'calendar',[product]);
 assert.equal(f.state.jobs.filter(j=>j.channel==='customer').length,1);
 assert.equal(f.state.jobs.filter(j=>j.channel==='internal').length,2);
 assert.equal(after.history.at(-1).calendarVisits[1].event.date,r.pickupDate);
 assert.equal(after.pickupDate,'2026-12-15');
});
