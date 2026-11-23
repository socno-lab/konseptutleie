import {createHash} from 'node:crypto';
import {parseDateOnly} from '../public/rental-dates.js';
import {warehouseAddress} from '../public/admin/transport-model.js';
import {workflowCopy} from '../public/admin/offer-copy.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=now=>Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now)).map(p=>[p.type,p.value]));
export const confirmedRental=r=>(!r.kind||r.kind==='rental')&&r.status==='confirmed'&&!r.returnedAt?r.history?.filter(h=>h.type==='confirmation').at(-1)?.document:null;
export function rentalReminderEvents(record,now=Date.now()){
 const document=confirmedRental(record);if(!document)return [];
 const r=document.workflow;if(!r||!['delivery','pickup','deliveryOnly','collectionOnly'].includes(r.deliveryMode))return [];
 const local=clock(now),today=`${local.year}-${local.month}-${local.day}`;
 if(Number(local.hour)<10)return [];
 return ['outbound','return'].flatMap(phase=>{
  const first=phase==='outbound',date=first?r.deliveryDate:r.pickupDate;
  if(parseDateOnly(date)===null)return [];
  const before=new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);if(before!==today)return [];
  const self=first?['pickup','collectionOnly'].includes(r.deliveryMode):['pickup','deliveryOnly'].includes(r.deliveryMode);
  const label=self?(first?'Selvhenting':'Retur på lageret'):(first?'Levering':'Henting');
  const time=self?(first?r.pickupTime:r.returnTime)||'Tidspunkt må avtales – kontakt oss':r.logistics?'Se avtalt tidsrom nedenfor':'08.00–12.00';
  const address=self?warehouseAddress:(!first&&r.pickupAddress)||r.deliveryAddress;
  if(!address)return [];
  const logistics=workflowCopy(r).logistics;
  const key=createHash('sha256').update(JSON.stringify({phase,date,label,time,address,logistics})).digest('hex');
  return [{key,phase,date,label,time,address,self,logistics,confirmationId:document.id,terms:document.rentalTerms}];
 });
}
export function rentalReminderEmail(snapshot){
 const r=snapshot.workflow,event=snapshot.reminder,date=event.date.split('-').reverse().join('.');
 const title=`Påminnelse om ${event.label.toLowerCase()} i morgen`;
 const responsibility=event.self?(event.phase==='outbound'?'Møt til avtalt hentetid og ta med egnet kjøretøy.':'Sørg for at alle varene med tilbehør returneres rengjort til avtalt tid.'):(event.phase==='outbound'?'Sørg for at vi har tilgang til leveringsadressen og kan levere møblene innenfor tidsrommet ovenfor.':'Sørg for at alle møblene med tilbehør er klare, og at vi har tilgang til henteadressen innenfor tidsrommet ovenfor.');
 // A reminder cannot introduce new financial terms into an older agreement.
 const newTerms=event.terms?.html?.includes('Ny kjøring etter bomtur');
 const transportCharges=(event.phase==='outbound'?'Avtalt leiepris gjelder også dersom vi ikke får levert fordi du ikke gir tilgang innenfor avtalt tidsrom.':'Dersom vi ikke får hentet fordi du ikke gir tilgang eller har gjort varene klare, kan ekstra leie beregnes etter normale satser og avtalt prisgrunnlag.')+` Ny kjøring etter bomtur ved ${event.phase==='outbound'?'leveringen':'hentingen'} som du er ansvarlig for, faktureres i tillegg. Pris avklares før ny kjøring.`;
 const charges=!newTerms?'Avtalte leiebetingelser gjelder.':event.self?(event.phase==='outbound'?'Avtalt leiepris gjelder også dersom du ikke møter til selvhenting, når varene har vært reservert og klare.':'Ved forsinket retur som du er ansvarlig for, kan ekstra leie beregnes etter normale satser og avtalt prisgrunnlag. Vi bruker ikke dobbel leie.'):transportCharges;
 const details=[`Dato: ${date}`,`Tid: ${event.time}`,`Adresse: ${event.address}`].join('\n');
 const defaultLogistics=workflowCopy({...r,lines:r.lines||[],logistics:''}).logistics;
 const customLogistics=r.logistics?.trim()&&r.logistics.trim()!==defaultLogistics.trim()?r.logistics:'';
 const paragraphs=['Hei!',`Dette er en påminnelse om avtalt ${event.label.toLowerCase()} i morgen.`,details,responsibility,...(!event.self&&customLogistics?[customLogistics]:[]),charges,'Trenger du å endre avtalen? Svar på denne e-posten eller ring 922 46 713 så snart som mulig.','Med vennlig hilsen\nKonseptuell\npost@konseptuell.no\n922 46 713',`Referanse: ${r.id}`];
 const text=[title,...paragraphs].join('\n\n');
 const html=`<!doctype html><html lang="nb"><body style="margin:0;padding:20px 8px;font:14px/1.65 Arial,sans-serif;color:#50564b;background:#f4f2eb"><table role="presentation" style="max-width:680px;width:100%;margin:auto;border-collapse:collapse"><tr><td style="padding:0 0 20px;text-align:center"><img src="${escape(snapshot.logoSrc||'https://konseptuell.no/assets/konseptuell-leie-og-kjop-logo.png')}" width="320" alt="Konseptuell" style="width:320px;max-width:85%;height:auto"></td></tr><tr><td style="background:#fff;padding:28px 24px;border-radius:0 0 18px 18px"><h1 style="font:700 26px/1.3 Arial,sans-serif;color:#30352b;margin:0 0 24px">${escape(title)}</h1>${paragraphs.map(p=>`<p>${escape(p).replace(/\n/g,'<br>')}</p>`).join('')}</td></tr></table></body></html>`;
 return {subject:`${title} · ${date} · Konseptuell · ${r.id}`,text,html};
}
