import {confirmedRental} from './rental-reminders.mjs';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function invoiceReminderEvents(record,now=Date.now()){
 const doc=confirmedRental(record);if(!doc?.workflow?.deliveryDate)return [];
 const parts=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
 const date=`${parts.year}-${parts.month}-${parts.day}`;if(Number(parts.hour)<8||doc.workflow.deliveryDate!==date)return [];
 return [{key:'invoice-'+date,phase:'invoice',internal:true,date,label:'Fakturapåminnelse',confirmationId:doc.id}];
}
export function invoiceReminderEmail(snapshot){
 const r=snapshot.workflow,date=v=>v?v.split('-').reverse().join('.'):'Ikke avtalt';
 const rental=r.lines.some(l=>l.total==null)?null:r.lines.reduce((sum,l)=>sum+l.total,0),total=rental==null||r.transport==null?null:rental+r.transport-(r.discount||0);
 const amount=total==null?'Avklares i avtalen':new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK'}).format(total);
 const pickup=['pickup','collectionOnly'].includes(r.deliveryMode),title='Kontroller at faktura er sendt',url='https://konseptuell.no/admin/enquiries.html?id='+encodeURIComponent(r.id);
 const details=[`Kunde: ${snapshot.email}`,`Referanse: ${r.id}`,`${pickup?'Uthenting':'Levering'}: ${date(r.deliveryDate)}`,`Leieperiode: ${date(r.start)} – ${date(r.end)}`,`Avtalt totalsum inkl. mva.: ${amount}`];
 const text=[title,'Dette er en intern påminnelse om å kontrollere at faktura er sendt i regnskapssystemet for leieforholdet nedenfor.',...details,'Påminnelsen sier ikke om faktura allerede er sendt. Fakturering håndteres kun i regnskapssystemet.','Åpne leieforhold – husk faktura: '+url].join('\n\n');
 const html=`<!doctype html><html lang="nb"><body style="margin:0;padding:20px 8px;font:14px/1.65 Arial,sans-serif;color:#50564b;background:#f4f2eb"><table role="presentation" style="max-width:680px;width:100%;margin:auto;border-collapse:collapse"><tr><td style="padding:0 0 20px;text-align:center"><img src="${escape(snapshot.logoSrc||'https://konseptuell.no/assets/konseptuell-leie-og-kjop-logo.png')}" width="320" alt="Konseptuell" style="width:320px;max-width:85%;height:auto"></td></tr><tr><td style="background:#fff;padding:28px 24px;border-radius:0 0 18px 18px"><h1 style="font:700 26px/1.3 Arial,sans-serif;color:#30352b">${title}</h1><p>Dette er en intern påminnelse om å kontrollere at faktura er sendt i regnskapssystemet for leieforholdet nedenfor.</p><p>${details.map(escape).join('<br>')}</p><p style="margin:24px 0"><a href="${escape(url)}" style="display:inline-block;padding:14px 24px;background:#414b38;color:#fff;text-decoration:none">Åpne leieforhold – husk faktura</a></p><p>Påminnelsen sier ikke om faktura allerede er sendt. Fakturering håndteres kun i regnskapssystemet.</p></td></tr></table></body></html>`;
 return {subject:`Fakturapåminnelse · ${date(r.deliveryDate)} · ${r.id}`,text,html};
}
