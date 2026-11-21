const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function activityDate(value){const d=new Date(value);if(!value||!Number.isFinite(+d))return 'Tidspunkt ikke registrert';const p=Object.fromEntries(new Intl.DateTimeFormat('nb-NO',{timeZone:'Europe/Oslo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));return `${p.day}.${p.month}.${p.year} kl. ${p.hour}:${p.minute}`;}
export function enquiryActivity(r,mail=[]){
 const events=[],add=(key,title,at,actor='',extra={})=>{if(at)events.push({key,title,at,actor,...extra});};
 add('received','Henvendelse mottatt',r.receivedAt);add('started','Tilbud påbegynt',r.offerStartedAt,'Administrasjon');
 add('accepted','Tilbud akseptert',r.acceptedAt,r.acceptanceSource==='customer'?'Kunden':'Administrasjon');
 add('returned','Retur bekreftet',r.returnedAt,'Administrasjon');
 if(r.status==='cancelled')add('closed',r.customerReply?.action==='decline'?'Tilbud avslått':r.history?.some(h=>h.type==='confirmation')?'Leieforhold avbestilt':'Henvendelse avsluttet',r.closedAt,r.customerReply?.action==='decline'?'Kunden':'Administrasjon');
 const statusLabels={pending:'Venter i e-postkø',sending:'Sender',failed:'Sending mislyktes',uncertain:'Usikker sendestatus',superseded:'Erstattet før sending',cancelled:'Sending stoppet'};
 (r.history||[]).forEach((h,index)=>{
 const internal=['acceptance','offer_response'].includes(h.type),job=mail.find(m=>m.reference===h.id&&m.channel===(internal?'internal':'customer'));
 const sent=!!h.sentAt||job?.status==='sent';
 const name=h.type==='offer'?'Tilbud':h.type==='confirmation'?'Ordrebekreftelse':h.type==='return'?'Takke-e-post':h.type==='reminder'?'Påminnelse om '+(h.document?.reminder?.label?.toLowerCase()||'leie'):h.type==='acceptance'?'Varsel om kundens aksept':'Kundens svar';
 add(h.id,name+(sent?' sendt':' registrert'),h.sentAt||h.at,'',{index,document:true,sent,status:sent?(h.sentAt?'Sendt':'Sendt · sendetidspunkt ikke registrert'):(statusLabels[job?.status]||'Sendestatus ikke tilgjengelig'),type:h.type});
 });
 return events.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
}
export function enquiryProgress(r,mail=[],now=Date.now()){
 const events=enquiryActivity(r,mail),has=type=>events.some(e=>e.type===type&&e.sent);
 const done=[!!r.receivedAt,!!r.offerStartedAt,has('offer'),!!r.acceptedAt,has('confirmation'),!!r.returnedAt];
 const last=done.lastIndexOf(true),current=Math.min(5,last+1);
 const outcome=r.status==='cancelled'?(r.customerReply?.action==='decline'?'Tilbud avslått':r.history?.some(h=>h.type==='confirmation')?'Avbestilt':'Henvendelse avsluttet'):r.status==='changes_requested'?'Kunden ber om endring':r.status==='offered'&&r.offerAcceptance?.expiresAt<now?'Tilbud utløpt':'';
 return {done,current,outcome};
}
export function activityMarkup(r,mail){return `<details class="activity-history" open><summary>Aktivitet og dokumenter</summary><ol>${enquiryActivity(r,mail).map(e=>`<li><span class="activity-icon" aria-hidden="true">${e.document?'✉':'•'}</span><div>${e.document?`<button type="button" class="text-button" data-history="${e.index}">${esc(e.title)}</button>`:`<strong>${esc(e.title)}</strong>`}<small>${esc(activityDate(e.at))}${e.actor?' · '+esc(e.actor):''}</small>${e.status?`<small>${esc(e.status)}</small>`:''}</div></li>`).join('')}</ol></details>`;}
export function progressMarkup(r,mail){const p=enquiryProgress(r,mail),titles=['Henvendelse mottatt','Tilbud utarbeides','Tilbud sendt','Tilbud akseptert','Ordrebekreftelse sendt','Levering / retur fullført'];return `<div class="enquiry-progress"><ol aria-label="Fremdrift">${titles.map((title,i)=>`<li class="${p.done[i]?'done':!p.outcome&&i===p.current?'current':'future'}" ${!p.outcome&&i===p.current?'aria-current="step"':''}><span aria-hidden="true">${p.done[i]?'✓':i+1}</span>${title}</li>`).join('')}</ol>${p.outcome?`<p class="progress-outcome">${esc(p.outcome)}</p>`:''}</div>`;}
