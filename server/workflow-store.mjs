import {rentalTermsSnapshot} from './rental-terms-pdf.mjs';
import {availableSlots,scheduleAppointments} from './pickup-schedule.mjs';
import {customerVisits} from '../public/admin/transport-model.js';
import {configureSiteSettings} from '../public/site-settings.js?v=fest20261114';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {documentDigest,workflowRecord,editWorkflow,checkReservation,validateSend,workflowEmail,reservedQuantity,workflowExpired} from './enquiry-workflow.mjs';
const tokenHash=token=>createHash('sha256').update(token).digest('hex');
function validateConfirmationTransport(r,all){if(r.deliveryMode&&r.deliveryMode!=='pickup'&&!r.deliveryAddress)fail('Fyll inn leverings-/henteadresse før ordrebekreftelse.',400);if(r.deliveryMode==='undecided')fail('Velg leveringsmåte før ordrebekreftelse.',400);return scheduleAppointments(r,all);}
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
export function workflowStore(init,pool){
 async function sync(){await init();const source=new Map();const [rows]=await pool.execute('SELECT body FROM ku_enquiries');for(const row of rows){const s=JSON.parse(row.body);if(s.documentType||s.kind!=='rental'||s.acquisition==='mixed'||s.acquisition==='proposal')continue;const r=workflowRecord(s);source.set(r.id,r);await pool.execute('INSERT IGNORE INTO ku_workflow(id,body) VALUES (?,?)',[r.id,JSON.stringify(r)]);}return source;}
 async function records(){const source=await sync();const [rows]=await pool.execute('SELECT body FROM ku_workflow');return rows.map(row=>{const r=JSON.parse(row.body),original=source.get(r.id);return r.deliveryMode?r:{...r,deliveryMode:original?.deliveryMode||'undecided',deliveryAddress:original?.deliveryAddress||'',pickupTime:r.pickupTime||'',returnTime:r.returnTime||''};});}
 return {
 workflowRecords:records,
 async workflowSlots(dates,exclude){const all=await records();return Object.fromEntries(dates.map(date=>[date,availableSlots(all,date,exclude)]));},
 async pruneWorkflow(now){await init();const c=await pool.getConnection();try{await c.beginTransaction();
 await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');
 for(const row of rows){const r=JSON.parse(row.body);if(!workflowExpired(r,now))continue;
 for(const id of new Set([r.id,...(r.history||[]).map(h=>h.id)])){
 await c.execute('DELETE FROM ku_enquiry_mail WHERE submission_id=?',[id]);
 await c.execute('DELETE FROM ku_enquiries WHERE id=?',[id]);
 await c.execute('DELETE FROM ku_submissions WHERE id=?',[id]);
 }
 await c.execute('DELETE FROM ku_workflow WHERE id=?',[r.id]);
 }await c.commit();}catch(error){await c.rollback();throw error;}finally{c.release();}},
 async workflowAvailability(products,start,end){const all=await records();return products.map(p=>({...p,unavailable:(p.unavailable||0)+reservedQuantity(all,p.id,start,end)}));},
 async changeWorkflow(id,input,action,products){await sync();const c=await pool.getConnection();try{await c.beginTransaction();
 // All reservations and catalog stock edits serialize on this row.
 const [[catalog]]=await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');products=JSON.parse(catalog.body);const [[site]]=await c.execute('SELECT body FROM ku_site_settings WHERE id=1');configureSiteSettings(JSON.parse(site.body));
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');const all=rows.map(r=>JSON.parse(r.body)),current=all.find(r=>r.id===id);if(!current)fail('Henvendelsen finnes ikke.',404);if(input.revision!==current.revision)fail('Henvendelsen er endret. Last inn på nytt.');
 let next=action==='cancel'?{...current,status:'cancelled',appointments:[],closedAt:current.closedAt||new Date().toISOString(),reserved:false,requirements:[]}:action==='accept'?{...current}:editWorkflow(current,input,products);
 if(action==='accept'){if(!['new','offered','accepted'].includes(current.status))fail('Skriftlig aksept kan ikke registreres for et avsluttet eller bekreftet leieforhold.');if(current.status==='accepted'){await c.commit();return current;}next.status='accepted';next.acceptedAt=new Date().toISOString();next.acceptanceSource='admin';next.acceptedOfferId=current.history.filter(h=>h.type==='offer').at(-1)?.id||null;}
 let preparedTerms;
 if(['offer','confirmation'].includes(action)){
 preparedTerms=action==='offer'?rentalTermsSnapshot(JSON.parse(site.body)):current.history.filter(h=>h.type==='confirmation').at(-1)?.document?.rentalTerms||current.history.filter(h=>h.type==='offer').at(-1)?.document?.rentalTerms||rentalTermsSnapshot(JSON.parse(site.body));
 for(const h of current.history.filter(h=>h.type===action)){const [[job]]=await c.execute('SELECT status FROM ku_enquiry_mail WHERE submission_id=? AND channel=\'customer\' FOR UPDATE',[h.id]);if(job?.status==='sending')fail('Forrige dokument sendes nå. Vent til sendingen er ferdig.');await c.execute("UPDATE ku_enquiry_mail SET status='superseded' WHERE submission_id=? AND status IN ('pending','failed','uncertain')",[h.id]);}
 validateSend(next);if(input.previewDigest!==documentDigest({...next,rentalTermsSha256:preparedTerms.sha256}))fail('Tilbudet er endret. Åpne forhåndsvisningen på nytt.');if(action==='confirmation'&&current.status!=='accepted'&&current.status!=='confirmed')fail('Registrer kundens skriftlige aksept først.');
 if(action==='offer'&&current.status==='confirmed')fail('En bekreftet bestilling må endres med en ny ordrebekreftelse.');
 next.status=action==='offer'?'offered':'confirmed';if(action==='confirmation')next.reserved=input.reserve===true;
 }
 if(action==='confirmation')next.appointments=validateConfirmationTransport(next,all);
 if(action==='confirmation'&&next.reserved){next.requirements=checkReservation(next,products,all);next.reservation={start:next.deliveryDate,end:next.pickupDate};}else if(!next.reserved){next.requirements=[];next.reservation=null;}
 next.revision++;next.updatedAt=new Date().toISOString();
 if(['offer','confirmation'].includes(action)){
 const version=current.history.filter(h=>h.type===action).length+1;if(action==='confirmation'&&version>1&&!next.changeReason)fail('Beskriv endringen i den oppdaterte ordrebekreftelsen.',400);const messageId=randomUUID(),copy={...next,history:[]},snapshot={id:messageId,email:next.email,kind:'rental',receivedAt:next.updatedAt,documentType:action,version,workflow:copy,lines:copy.lines};
 snapshot.rentalTerms=preparedTerms;
 if(action==='offer'){const token=randomBytes(32).toString('base64url');next.offerAcceptance={hash:tokenHash(token),offerId:messageId,expiresAt:Date.now()+14*86400000};snapshot.acceptUrl='https://konseptuell.no/aksepter-tilbud.html?token='+token;}
 next.history=[...current.history,{id:messageId,type:action,at:next.updatedAt,document:snapshot}];
 await c.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[messageId,'workflow',JSON.stringify(snapshot),Date.now()]);await c.execute('INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,\'customer\',?)',[messageId,Date.now()]);
 }
 if(action==='cancel')for(const h of current.history){const [[job]]=await c.execute('SELECT status FROM ku_enquiry_mail WHERE submission_id=? AND channel=\'customer\' FOR UPDATE',[h.id]);if(job?.status==='sending')fail('E-posten sendes nå. Vent til sendestatus er avklart før avbestilling.');await c.execute("UPDATE ku_enquiry_mail SET status='cancelled' WHERE submission_id=? AND status IN ('pending','failed','uncertain')",[h.id]);}
 await c.execute('UPDATE ku_workflow SET body=? WHERE id=?',[JSON.stringify(next),id]);await c.commit();return next;
 }catch(e){await c.rollback();throw e;}finally{c.release();}},
 async offerAcceptance(token,accept=false,selections={}){
 if(typeof token!=='string'||!/^[-_a-zA-Z0-9]{43}$/.test(token))fail('Tilbudslenken er ugyldig.',404);
 await init();const c=await pool.getConnection();try{await c.beginTransaction();
 await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');
 const all=rows.map(row=>JSON.parse(row.body)),r=all.find(r=>r.offerAcceptance?.hash===tokenHash(token));
 if(!r)fail('Tilbudslenken er ugyldig eller erstattet av et nyere tilbud.',404);
 const offer=r.history.filter(h=>h.type==='offer').at(-1);
 if(!offer||offer.id!==r.offerAcceptance.offerId||r.status==='cancelled')fail('Tilbudet er ikke lenger tilgjengelig. Kontakt oss for et oppdatert tilbud.');
 const accepted=r.acceptedOfferId===offer.id&&['accepted','confirmed'].includes(r.status);
 if(!accepted&&(r.offerAcceptance.expiresAt<Date.now()||r.status!=='offered'))fail('Tilbudet kan ikke aksepteres nå. Kontakt oss for et oppdatert tilbud.');
 const offered=offer.document.workflow;
 if(accept&&!accepted){
 const scheduled={...offered,id:r.id,appointments:r.appointments,pickupTime:selections.pickupTime||offered.pickupTime||'',returnTime:selections.returnTime||offered.returnTime||''};
 const appointments=scheduleAppointments(scheduled,all);r.appointments=appointments;for(const key of ['pickupTime','returnTime'])r[key]=scheduled[key];
 r.status='accepted';r.acceptedAt=new Date().toISOString();r.acceptanceSource='customer';r.acceptedOfferId=offer.id;r.updatedAt=r.acceptedAt;r.revision++;
 const id=randomUUID(),snapshot={id,email:r.email,kind:'rental',documentType:'acceptance',receivedAt:r.acceptedAt,workflow:{...offer.document.workflow,pickupTime:r.pickupTime,returnTime:r.returnTime,acceptedAt:r.acceptedAt,history:[]},lines:offer.document.lines};
 r.history.push({id,type:'acceptance',at:r.acceptedAt,document:snapshot});
 await c.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[id,'workflow',JSON.stringify(snapshot),Date.now()]);
 await c.execute("INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,'internal',?)",[id,Date.now()]);
 await c.execute('UPDATE ku_workflow SET body=? WHERE id=?',[JSON.stringify(r),r.id]);
 }
 await c.commit();return {accepted:accepted||accept,rentalTerms:offer.document.rentalTerms||null,slots:customerVisits(offered).map(v=>({...v,times:availableSlots(all,v.date,r.id)})),html:workflowEmail({...offer.document,workflow:{...offered,...((accepted||accept)?{pickupTime:r.pickupTime,returnTime:r.returnTime}:{} )},acceptUrl:null}).html};
 }catch(error){await c.rollback();throw error;}finally{c.release();}
 },
 async workflowPreview(id,input,products,type){await init();const [[site]]=await pool.execute('SELECT body FROM ku_site_settings WHERE id=1');configureSiteSettings(JSON.parse(site.body));const all=await records(),current=all.find(r=>r.id===id);if(!current)fail('Henvendelsen finnes ikke.',404);const r=editWorkflow(current,input,products);let warning='';try{validateSend(r);if(type==='confirmation')validateConfirmationTransport(r,all);}catch(error){warning=error.message;}const rentalTerms=type==='offer'?rentalTermsSnapshot(JSON.parse(site.body)):current.history.filter(h=>h.type==='confirmation').at(-1)?.document?.rentalTerms||current.history.filter(h=>h.type==='offer').at(-1)?.document?.rentalTerms||rentalTermsSnapshot(JSON.parse(site.body));return {canSend:!warning,warning,rentalTerms,...workflowEmail({workflow:r,lines:r.lines,rentalTerms,documentType:type,version:current.history.filter(h=>h.type===type).length+1}),previewDigest:documentDigest({...r,rentalTermsSha256:rentalTerms.sha256})};}
 };
}
