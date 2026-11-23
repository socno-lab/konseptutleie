import {queueTransportCalendar} from './transport-calendar.mjs';
import {invoiceReminderEvents} from './invoice-reminder.mjs';
import {confirmationChanges,confirmationBaseline} from './confirmation-changes.mjs';
import {canConfirmReturn} from '../public/admin/return-eligibility.js';
import {osloToday} from '../public/admin/enquiries-model.js';
import {earlyStartRequirement} from './early-start-consent.mjs';
import {rentalTermsSnapshot} from './rental-terms-pdf.mjs';
import {availableSlots,scheduleAppointments} from './pickup-schedule.mjs';
import {customerVisits} from '../public/admin/transport-model.js';
import {rentalReminderEvents} from './rental-reminders.mjs';
import {configureSiteSettings} from '../public/site-settings.js?v=fest20261114';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {documentDigest,workflowRecord,rentalWorkflowSource,editWorkflow,checkReservation,validateSend,workflowEmail,reservedQuantity,workflowExpired} from './enquiry-workflow.mjs';
const tokenHash=token=>createHash('sha256').update(token).digest('hex');
function validateConfirmationTransport(r,all){if(r.deliveryMode&&r.deliveryMode!=='pickup'&&!r.deliveryAddress)fail('Fyll inn leverings-/henteadresse før ordrebekreftelse.',400);if(r.deliveryMode==='undecided')fail('Velg leveringsmåte før ordrebekreftelse.',400);return scheduleAppointments(r,all);}
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
export function workflowStore(init,pool,{today=osloToday}={}){
 async function sync(){await init();const source=new Map();const [rows]=await pool.execute('SELECT body FROM ku_enquiries');for(const row of rows){const s=JSON.parse(row.body);if(!rentalWorkflowSource(s))continue;const r=workflowRecord(s);source.set(r.id,r);await pool.execute('INSERT IGNORE INTO ku_workflow(id,body) VALUES (?,?)',[r.id,JSON.stringify(r)]);}return source;}
 async function records(){const source=await sync();const [rows]=await pool.execute('SELECT body FROM ku_workflow');return rows.map(row=>{const r=JSON.parse(row.body),original=source.get(r.id);r.customerType=r.customerType||original?.customerType||'consumer';r.lines=r.lines.map(l=>{const old=original?.lines.find(x=>x.id===l.originalId&&x.key===l.key);return {...l,...(l.originalTotal==null&&old?.total!=null?{originalTotal:old.total,originalQuantity:old.quantity}:{})};});return r.deliveryMode?r:{...r,deliveryMode:original?.deliveryMode||'undecided',deliveryAddress:original?.deliveryAddress||'',pickupTime:r.pickupTime||'',returnTime:r.returnTime||''};});}
 return {
 workflowRecords:records,
 async recordWorkflowMailSent(id,now,channel){await init();const c=await pool.getConnection();try{await c.beginTransaction();await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');if(channel){
 const [result]=await c.execute("UPDATE ku_enquiry_mail SET status='sent',next_at=?,lease_until=0 WHERE submission_id=? AND channel=? AND status='sending'",[now+300000,id,channel]);
 if(!result.affectedRows){await c.commit();return;}
 }
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');for(const row of rows){const r=JSON.parse(row.body),h=r.history.find(h=>h.id===id);if(h&&!h.sentAt){if(h.type==='confirmation'&&r.status==='confirmed')await queueTransportCalendar(c,r,h,now);h.sentAt=new Date(now).toISOString();r.revision++;await c.execute('UPDATE ku_workflow SET body=? WHERE id=?',[JSON.stringify(r),r.id]);break;}}await c.commit();}catch(error){await c.rollback();throw error;}finally{c.release();}},
 async queueWorkflowReminders(now=Date.now()){
 await init();const c=await pool.getConnection();try{await c.beginTransaction();
 await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');let queued=0;
 for(const row of rows){const r=JSON.parse(row.body),events=[...rentalReminderEvents(r,now),...invoiceReminderEvents(r,now)];let changed=false;
 for(const event of events){const previous=r.history.filter(h=>['reminder','invoice_reminder'].includes(h.type)&&h.document?.reminder?.key===event.key).at(-1);if(previous){const [[job]]=await c.execute("SELECT status FROM ku_enquiry_mail WHERE submission_id=? AND channel=? FOR UPDATE",[previous.id,event.internal?'internal':'customer']);if(!job||!['cancelled','superseded'].includes(job.status))continue;}
 const id=randomUUID(),confirmation=r.history.filter(h=>h.type==='confirmation').at(-1).document;
 const snapshot={id,email:r.email,kind:'rental',documentType:event.internal?'invoice_reminder':'reminder',receivedAt:new Date(now).toISOString(),workflow:{...confirmation.workflow,history:[]},reminder:event,lines:[]};
 await c.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[id,'workflow',JSON.stringify(snapshot),now]);
 await c.execute("INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,?,?)",[id,event.internal?'internal':'customer',now]);
 r.history.push({id,type:event.internal?'invoice_reminder':'reminder',at:snapshot.receivedAt,document:snapshot});changed=true;queued++;
 }if(changed){r.revision++;await c.execute('UPDATE ku_workflow SET body=? WHERE id=?',[JSON.stringify(r),r.id]);}
 }await c.commit();return queued;
 }catch(error){await c.rollback();throw error;}finally{c.release();}
 },
 async claimWorkflowReminder(id,snapshot,now){
 await init();const c=await pool.getConnection();try{await c.beginTransaction();
 await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');
 const r=rows.map(row=>JSON.parse(row.body)).find(r=>r.id===snapshot.workflow.id);
 const valid=r&&r.history.some(h=>h.id===id&&['reminder','invoice_reminder'].includes(h.type))&&[...rentalReminderEvents(r,now),...invoiceReminderEvents(r,now)].some(event=>event.key===snapshot.reminder.key&&(!event.internal||event.confirmationId===snapshot.reminder.confirmationId));
 if(!valid){await c.execute("UPDATE ku_enquiry_mail SET status='cancelled' WHERE submission_id=? AND status IN ('pending','failed','uncertain')",[id]);await c.commit();return false;}
 const [result]=await c.execute("UPDATE ku_enquiry_mail SET status='sending',attempts=attempts+1,lease_until=? WHERE submission_id=? AND channel=? AND status='pending' AND attempts<5 AND next_at<=?",[now+120000,id,snapshot.reminder.internal?'internal':'customer',now]);
 await c.commit();return result.affectedRows===1;
 }catch(error){await c.rollback();throw error;}finally{c.release();}
 },
 async queueRentalReturnTest(email){
 if(typeof email!=='string'||email.length>200||!/^([^\s<>,;:"\\@]+)@([a-z0-9.-]+)\.([a-z]{2,})$/i.test(email))fail('Oppgi en gyldig testadresse.',400);
 await init();const c=await pool.getConnection();try{await c.beginTransaction();const id=randomUUID(),snapshot={id,email,kind:'rental',documentType:'return',test:true,receivedAt:new Date().toISOString(),workflow:{id:'TEST – ingen kundeordre'},lines:[]};
 await c.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[id,'workflow',JSON.stringify(snapshot),Date.now()]);await c.execute("INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,'customer',?)",[id,Date.now()]);await c.commit();return {reference:id};}catch(error){await c.rollback();throw error;}finally{c.release();}
 },
 async workflowSlots(dates,exclude){const all=await records();return Object.fromEntries(dates.map(date=>[date,availableSlots(all,date,exclude)]));},
 async pruneWorkflow(now){await init();const c=await pool.getConnection();try{await c.beginTransaction();
 await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');
 for(const row of rows){const r=JSON.parse(row.body);if(!workflowExpired(r,now))continue;
 for(const id of new Set([r.id,...(r.history||[]).flatMap(h=>[h.id,...(h.calendarJobIds||[])])])){
 await c.execute('DELETE FROM ku_enquiry_mail WHERE submission_id=?',[id]);
 await c.execute('DELETE FROM ku_enquiries WHERE id=?',[id]);
 await c.execute('DELETE FROM ku_submissions WHERE id=?',[id]);
 }
 await c.execute('DELETE FROM ku_workflow WHERE id=?',[r.id]);
 }await c.commit();}catch(error){await c.rollback();throw error;}finally{c.release();}},
 async workflowAvailability(products,start,end){const all=await records();return products.map(p=>({...p,unavailable:(p.unavailable||0)+reservedQuantity(all,p.id,start,end)}));},
 async changeWorkflow(id,input,action,products){const prior=(await records()).find(r=>r.id===id);const c=await pool.getConnection();try{await c.beginTransaction();
 // All reservations and catalog stock edits serialize on this row.
 const [[catalog]]=await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');products=JSON.parse(catalog.body);const [[site]]=await c.execute('SELECT body FROM ku_site_settings WHERE id=1');configureSiteSettings(JSON.parse(site.body));
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');const all=rows.map(r=>JSON.parse(r.body)),current=all.find(r=>r.id===id);if(!current)fail('Henvendelsen finnes ikke.',404);if(input.revision!==current.revision)fail('Henvendelsen er endret. Last inn på nytt.');
 if(prior)current.lines=current.lines.map(l=>({...l,...(l.originalTotal==null&&prior.lines.find(p=>p.key===l.key)?.originalTotal!=null?{originalTotal:prior.lines.find(p=>p.key===l.key).originalTotal,originalQuantity:prior.lines.find(p=>p.key===l.key).originalQuantity}:{})}));
 current.customerType=current.customerType||prior?.customerType||'consumer';
 if(['confirmation','cancel','complete'].includes(action))for(const h of current.history.filter(h=>['reminder','invoice_reminder'].includes(h.type))){const [[job]]=await c.execute("SELECT status FROM ku_enquiry_mail WHERE submission_id=? AND channel=? FOR UPDATE",[h.id,h.type==='invoice_reminder'?'internal':'customer']);if(job?.status==='sending')fail('En påminnelse sendes nå. Vent til sendingen er ferdig før du endrer avtalen.');if(action==='complete')await c.execute("UPDATE ku_enquiry_mail SET status='cancelled' WHERE submission_id=? AND status IN ('pending','failed','uncertain')",[h.id]);}
 if(action==='complete'&&current.status==='completed'){await c.commit();return current;}
 if(current.status==='completed')fail('Leieforholdet er avsluttet etter bekreftet retur.');
 if(action==='complete'&&current.status!=='confirmed')fail('Kun et ordrebekreftet leieforhold kan bekreftes returnert.');
 if(action==='complete'&&!canConfirmReturn(current,today()))fail('Retur kan ikke bekreftes før den bekreftede leieperioden har startet.');
 if(action==='complete'&&input.sendThanks===true&&input.previewDigest!==documentDigest(current))fail('Leieforholdet er endret. Åpne forhåndsvisningen på nytt.');
 let next=action==='complete'?{...current,status:'completed',returnedAt:new Date().toISOString(),closedAt:new Date().toISOString(),reserved:false,requirements:[],reservation:null,appointments:[],thankYouRequested:input.sendThanks===true}:action==='cancel'?{...current,status:'cancelled',appointments:[],closedAt:current.closedAt||new Date().toISOString(),reserved:false,requirements:[]}:action==='accept'?{...current}:editWorkflow(current,input,products);
 if(action==='accept'){if(!['new','offered','accepted','changes_requested'].includes(current.status))fail('Skriftlig aksept kan ikke registreres for et avsluttet eller bekreftet leieforhold.');if(current.status==='accepted'){await c.commit();return current;}next.status='accepted';next.acceptedAt=new Date().toISOString();next.acceptanceSource='admin';next.acceptedOfferId=current.history.filter(h=>h.type==='offer').at(-1)?.id||null;}

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
 if(action==='save'&&!next.offerStartedAt&&!current.history.some(h=>h.type==='offer'||h.type==='confirmation'))next.offerStartedAt=new Date().toISOString();
 next.revision++;next.updatedAt=new Date().toISOString();
 if(['offer','confirmation'].includes(action)){
 const version=current.history.filter(h=>h.type===action).length+1;const messageId=randomUUID(),copy={...next,history:[]},snapshot={id:messageId,email:next.email,kind:'rental',receivedAt:next.updatedAt,documentType:action,version,workflow:copy,lines:copy.lines};
 snapshot.rentalTerms=preparedTerms;
 if(action==='confirmation')snapshot.confirmationChanges=confirmationChanges(await confirmationBaseline(current,c),next);
 if(action==='offer'){const token=randomBytes(32).toString('base64url');next.offerAcceptance={hash:tokenHash(token),offerId:messageId,expiresAt:Date.now()+14*86400000};snapshot.acceptUrl='https://konseptuell.no/aksepter-tilbud.html?token='+token;}
 next.history=[...current.history,{id:messageId,type:action,at:next.updatedAt,document:snapshot}];
 await c.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[messageId,'workflow',JSON.stringify(snapshot),Date.now()]);await c.execute('INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,\'customer\',?)',[messageId,Date.now()]);
 }
 if(action==='complete'&&input.sendThanks===true){
 const messageId=randomUUID(),snapshot={id:messageId,email:next.email,kind:'rental',receivedAt:next.updatedAt,documentType:'return',workflow:{...next,history:[]},lines:[]};
 next.history=[...current.history,{id:messageId,type:'return',at:next.updatedAt,document:snapshot}];
 await c.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[messageId,'workflow',JSON.stringify(snapshot),Date.now()]);
 await c.execute("INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,'customer',?)",[messageId,Date.now()]);
 }
 if(action==='cancel')for(const h of current.history){const [[job]]=await c.execute('SELECT status FROM ku_enquiry_mail WHERE submission_id=? AND channel=\'customer\' FOR UPDATE',[h.id]);if(job?.status==='sending')fail('E-posten sendes nå. Vent til sendestatus er avklart før avbestilling.');await c.execute("UPDATE ku_enquiry_mail SET status='cancelled' WHERE submission_id=? AND status IN ('pending','failed','uncertain')",[h.id]);}
 if(action==='cancel'&&current.status==='confirmed'){const issued=next.history.filter(h=>h.calendarVisits?.length).at(-1);if(issued)await queueTransportCalendar(c,next,issued,Date.now(),true);}
 await c.execute('UPDATE ku_workflow SET body=? WHERE id=?',[JSON.stringify(next),id]);await c.commit();return next;
 }catch(e){await c.rollback();throw e;}finally{c.release();}},
 async offerAcceptance(token,accept=false,selections={}){
 const decision=selections.decision||'accept',message=selections.message||'';if(!['accept','decline','change'].includes(decision)||typeof message!=='string'||message.length>3000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(message))fail('Kontroller svaret og meldingen.');if(accept&&decision==='change'&&!message.trim())fail('Beskriv endringen du ønsker.');
 if(typeof token!=='string'||!/^[-_a-zA-Z0-9]{43}$/.test(token))fail('Tilbudslenken er ugyldig.',404);
 await init();const c=await pool.getConnection();try{await c.beginTransaction();
 await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');
 const all=rows.map(row=>JSON.parse(row.body)),r=all.find(r=>r.offerAcceptance?.hash===tokenHash(token));
 if(!r)fail('Tilbudslenken er ugyldig eller erstattet av et nyere tilbud.',404);
 const reply=r.customerReply?.offerId===r.offerAcceptance.offerId?r.customerReply:null;
 const offer=r.history.filter(h=>h.type==='offer').at(-1);
 if(!offer||offer.id!==r.offerAcceptance.offerId||(r.status==='cancelled'&&reply?.action!=='decline'))fail('Tilbudet er ikke lenger tilgjengelig. Kontakt oss for et oppdatert tilbud.');
 const accepted=r.acceptedOfferId===offer.id&&['accepted','confirmed','completed'].includes(r.status);
 if(!accepted&&!reply&&(r.offerAcceptance.expiresAt<Date.now()||r.status!=='offered'))fail('Tilbudet kan ikke aksepteres nå. Kontakt oss for et oppdatert tilbud.');
 const offered=offer.document.workflow,earlyStart=earlyStartRequirement({...offered,customerType:offered.customerType||r.customerType});
 if(accept&&!accepted&&reply&&reply.action!==decision)fail('Du har allerede svart på dette tilbudet. Kontakt oss hvis du vil endre svaret.');
 if(accept&&!accepted&&!reply){
 const scheduled={...offered,id:r.id,appointments:r.appointments,pickupTime:selections.pickupTime||offered.pickupTime||'',returnTime:selections.returnTime||offered.returnTime||''};
 if(decision==='accept'){if(earlyStart.required&&selections.earlyStartConsent!==true)fail('Godkjenn særskilt at leien starter før angrefristen er utløpt.',400);r.earlyStartConsent=earlyStart.required?{at:new Date().toISOString(),text:earlyStart.text,deliveryDate:earlyStart.start,offerId:offer.id}:null;const appointments=scheduleAppointments(scheduled,all);r.appointments=appointments;for(const key of ['pickupTime','returnTime'])r[key]=scheduled[key];}
 r.status=decision==='accept'?'accepted':decision==='decline'?'cancelled':'changes_requested';if(decision==='decline'){r.closedAt=new Date().toISOString();r.reserved=false;r.requirements=[];r.reservation=null;r.appointments=[];}r.customerReply={action:decision,offerId:offer.id,at:new Date().toISOString()};r.acceptedAt=decision==='accept'?new Date().toISOString():null;r.acceptanceSource='customer';r.acceptedOfferId=decision==='accept'?offer.id:null;r.updatedAt=r.customerReply.at;r.revision++;
 const id=randomUUID(),snapshot={id,email:r.email,kind:'rental',documentType:decision==='accept'?'acceptance':'offer_response',customerMessage:message.trim(),responseDecision:decision,receivedAt:r.updatedAt,workflow:{...offer.document.workflow,pickupTime:r.pickupTime,returnTime:r.returnTime,acceptedAt:r.acceptedAt,earlyStartConsent:r.earlyStartConsent,history:[]},lines:offer.document.lines};
 const {customerMessage,...historyDocument}=snapshot;r.history.push({id,type:decision==='accept'?'acceptance':'offer_response',at:r.updatedAt,document:historyDocument});
 await c.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[id,'workflow',JSON.stringify(snapshot),Date.now()]);
 await c.execute("INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,'internal',?)",[id,Date.now()]);
 if(decision==='accept'&&r.earlyStartConsent)await c.execute("INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,'customer',?)",[id,Date.now()]);
 await c.execute('UPDATE ku_workflow SET body=? WHERE id=?',[JSON.stringify(r),r.id]);
 }
 await c.commit();return {earlyStart,accepted:accepted||(accept&&decision==='accept'),response:accepted?'accept':r.customerReply?.offerId===offer.id?r.customerReply.action:null,rentalTerms:offer.document.rentalTerms||null,slots:customerVisits(offered).map(v=>({...v,times:availableSlots(all,v.date,r.id)})),html:workflowEmail({...offer.document,workflow:{...offered,...((accepted||accept)?{pickupTime:r.pickupTime,returnTime:r.returnTime}:{} )},acceptUrl:null}).html};
 }catch(error){await c.rollback();throw error;}finally{c.release();}
 },
 async workflowPreview(id,input,products,type){await init();const [[site]]=await pool.execute('SELECT body FROM ku_site_settings WHERE id=1');configureSiteSettings(JSON.parse(site.body));const all=await records(),current=all.find(r=>r.id===id);if(!current)fail('Henvendelsen finnes ikke.',404);if(type==='return'){if(!canConfirmReturn(current,today()))fail('Retur kan ikke bekreftes før den bekreftede leieperioden har startet.');if(current.status!=='confirmed')fail('Kun et ordrebekreftet leieforhold kan bekreftes returnert.');if(input.revision!==current.revision)fail('Henvendelsen er endret. Last inn på nytt.');return {canSend:true,warning:'Alle varene bekreftes returnert/hentet, reservasjonen frigis og denne e-posten sendes til kunden.',...workflowEmail({workflow:current,documentType:'return'}),previewDigest:documentDigest(current)};}const r=editWorkflow(current,input,products);let warning='';try{validateSend(r);if(type==='confirmation')validateConfirmationTransport(r,all);}catch(error){warning=error.message;}const rentalTerms=type==='offer'?rentalTermsSnapshot(JSON.parse(site.body)):current.history.filter(h=>h.type==='confirmation').at(-1)?.document?.rentalTerms||current.history.filter(h=>h.type==='offer').at(-1)?.document?.rentalTerms||rentalTermsSnapshot(JSON.parse(site.body));const changes=type==='confirmation'?confirmationChanges(await confirmationBaseline(current,pool),r):null;return {canSend:!warning,warning,rentalTerms,...workflowEmail({confirmationChanges:changes,workflow:r,lines:r.lines,rentalTerms,documentType:type,version:current.history.filter(h=>h.type===type).length+1}),previewDigest:documentDigest({...r,rentalTermsSha256:rentalTerms.sha256})};}
 };
}
