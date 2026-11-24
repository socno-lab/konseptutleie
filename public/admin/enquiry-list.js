import {activityDate} from './enquiry-activity.js?v=lagerark20261124';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')?v.split('-').reverse().join('.'):'';
export function enquiryListStatus(r,mail=[],now=Date.now()){
 if(r.status==='completed')return 'Returnert / hentet';
 if(r.status==='cancelled')return r.customerReply?.action==='decline'?'Tilbud avslått':r.history?.some(h=>h.type==='confirmation')?'Avbestilt':'Avsluttet';
 if(r.status==='changes_requested')return 'Endring ønsket';
 if(r.status==='offered'&&r.offerAcceptance?.expiresAt<now)return 'Tilbud utløpt';
 const type=r.status==='confirmed'?'confirmation':r.status==='offered'?'offer':null;
 if(type){const h=r.history?.filter(h=>h.type===type).at(-1),job=mail.find(m=>m.reference===h?.id&&m.channel==='customer'),name=type==='offer'?'Tilbud':'Ordrebekreftelse';
 if(h?.sentAt||job?.status==='sent')return type==='confirmation'?'Ordrebekreftelse sendt':'Tilbud sendt';
 return name+(job?.status==='failed'?' · sendefeil':job?.status==='uncertain'?' · usikker sending':job?.status==='sending'?' sendes':job?.status==='pending'?' i kø':' registrert');}
 if(r.status==='accepted')return 'Tilbud akseptert';
 return r.offerStartedAt?'Tilbud utarbeides':'Ny henvendelse';
}
export function enquiryListSummary(r){
 const lines=(r.lines||[]).filter(l=>Number.isInteger(l.quantity)&&l.quantity>0),types=new Set(lines.map(l=>l.id)).size,total=lines.reduce((n,l)=>n+l.quantity,0);
 const products=types?`${types} ${types===1?'produkttype':'produkttyper'} · ${total} stk. totalt`:'Ingen produkter valgt';
 const period=r.start&&r.end?`${date(r.start)} – ${date(r.end)}`:r.start?`Fra ${date(r.start)} · sluttdato avklares`:r.end?`Til ${date(r.end)} · startdato avklares`:'Periode ikke avklart';
 return {products,period,address:r.deliveryMode==='pickup'?'':r.deliveryAddress||''};
}
export function enquiryListRow(r,tab,mail=[]){const s=enquiryListSummary(r);return `<a class="enquiry-item" href="/admin/enquiries.html?id=${encodeURIComponent(r.id)}&tab=${encodeURIComponent(tab)}"><div class="enquiry-list-main"><strong>${esc(r.email)}</strong>${s.address?`<small class="enquiry-list-address">${esc(s.address)}</small>`:''}<small>${r.requestType==='proposal'?'Få et forslag · ':''}${esc(s.products)}</small></div><div class="enquiry-list-state"><span class="enquiry-list-badge">${esc(enquiryListStatus(r,mail))}</span></div><div class="enquiry-list-period"><span>${esc(s.period)}</span><small>Mottatt ${esc(activityDate(r.receivedAt))}</small></div><span class="enquiry-list-arrow" aria-hidden="true">→</span></a>`;}
