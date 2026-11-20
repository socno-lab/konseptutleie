import {configureSiteSettings} from '../public/site-settings.js?v=fest20261114';
import {randomUUID} from 'node:crypto';
import {documentDigest,workflowRecord,editWorkflow,checkReservation,validateSend,workflowEmail,reservedQuantity} from './enquiry-workflow.mjs';
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
export function workflowStore(init,pool){
 async function sync(){await init();const [rows]=await pool.execute('SELECT body FROM ku_enquiries');for(const row of rows){const s=JSON.parse(row.body);if(s.documentType||s.kind!=='rental'||s.acquisition==='mixed'||s.acquisition==='proposal')continue;const r=workflowRecord(s);await pool.execute('INSERT IGNORE INTO ku_workflow(id,body) VALUES (?,?)',[r.id,JSON.stringify(r)]);}}
 async function records(){await sync();const [rows]=await pool.execute('SELECT body FROM ku_workflow');return rows.map(r=>JSON.parse(r.body));}
 return {
 workflowRecords:records,
 async workflowAvailability(products,start,end){const all=await records();return products.map(p=>({...p,unavailable:(p.unavailable||0)+reservedQuantity(all,p.id,start,end)}));},
 async changeWorkflow(id,input,action,products){await sync();const c=await pool.getConnection();try{await c.beginTransaction();
 // All reservations and catalog stock edits serialize on this row.
 const [[catalog]]=await c.execute('SELECT body FROM ku_catalog WHERE id=1 FOR UPDATE');products=JSON.parse(catalog.body);const [[site]]=await c.execute('SELECT body FROM ku_site_settings WHERE id=1');configureSiteSettings(JSON.parse(site.body));
 const [rows]=await c.execute('SELECT body FROM ku_workflow FOR UPDATE');const all=rows.map(r=>JSON.parse(r.body)),current=all.find(r=>r.id===id);if(!current)fail('Henvendelsen finnes ikke.',404);if(input.revision!==current.revision)fail('Henvendelsen er endret. Last inn på nytt.');
 let next=action==='cancel'?{...current,status:'cancelled',reserved:false,requirements:[]}:editWorkflow(current,input,products);
 if(action==='accept'){if(current.status!=='offered')fail('Kundens aksept kan registreres etter et utsendt tilbud.');if(!current.history.some(h=>h.type==='offer'))fail('Send tilbud før du registrerer aksept.');next.status='accepted';}
 if(['offer','confirmation'].includes(action)){
 for(const h of current.history.filter(h=>h.type===action)){const [[job]]=await c.execute('SELECT status FROM ku_enquiry_mail WHERE submission_id=? AND channel=\'customer\' FOR UPDATE',[h.id]);if(job?.status==='sending')fail('Forrige dokument sendes nå. Vent til sendingen er ferdig.');await c.execute("UPDATE ku_enquiry_mail SET status='superseded' WHERE submission_id=? AND status IN ('pending','failed','uncertain')",[h.id]);}
 validateSend(next);if(input.previewDigest!==documentDigest(next))fail('Tilbudet er endret. Åpne forhåndsvisningen på nytt.');if(action==='confirmation'&&current.status!=='accepted'&&current.status!=='confirmed')fail('Registrer kundens skriftlige aksept først.');
 if(action==='offer'&&current.status==='confirmed')fail('En bekreftet bestilling må endres med en ny ordrebekreftelse.');
 next.status=action==='offer'?'offered':'confirmed';if(action==='confirmation')next.reserved=input.reserve===true;
 }
 if(action==='confirmation'&&next.reserved){next.requirements=checkReservation(next,products,all);next.reservation={start:next.deliveryDate,end:next.pickupDate};}else if(!next.reserved){next.requirements=[];next.reservation=null;}
 next.revision++;next.updatedAt=new Date().toISOString();
 if(['offer','confirmation'].includes(action)){
 const version=current.history.filter(h=>h.type===action).length+1;if(action==='confirmation'&&version>1&&!next.changeReason)fail('Beskriv endringen i den oppdaterte ordrebekreftelsen.',400);const messageId=randomUUID(),copy={...next,history:[]},snapshot={id:messageId,email:next.email,kind:'rental',receivedAt:next.updatedAt,documentType:action,version,workflow:copy,lines:copy.lines};
 next.history=[...current.history,{id:messageId,type:action,at:next.updatedAt,document:snapshot}];
 await c.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[messageId,'workflow',JSON.stringify(snapshot),Date.now()]);await c.execute('INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,\'customer\',?)',[messageId,Date.now()]);
 }
 if(action==='cancel')for(const h of current.history){const [[job]]=await c.execute('SELECT status FROM ku_enquiry_mail WHERE submission_id=? AND channel=\'customer\' FOR UPDATE',[h.id]);if(job?.status==='sending')fail('E-posten sendes nå. Vent til sendestatus er avklart før avbestilling.');await c.execute("UPDATE ku_enquiry_mail SET status='cancelled' WHERE submission_id=? AND status IN ('pending','failed','uncertain')",[h.id]);}
 await c.execute('UPDATE ku_workflow SET body=? WHERE id=?',[JSON.stringify(next),id]);await c.commit();return next;
 }catch(e){await c.rollback();throw e;}finally{c.release();}},
 async workflowPreview(id,input,products,type){const current=(await records()).find(r=>r.id===id);if(!current)fail('Henvendelsen finnes ikke.',404);const r=editWorkflow(current,input,products);validateSend(r);return {...workflowEmail({workflow:r,lines:r.lines,documentType:type,version:current.history.filter(h=>h.type===type).length+1}),previewDigest:documentDigest(r)};}
 };
}
