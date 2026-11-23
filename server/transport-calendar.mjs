import {randomUUID} from 'node:crypto';
import {addDateDays,parseDateOnly} from '../public/rental-dates.js';
import {customerVisits,warehouseAddress} from '../public/admin/transport-model.js';

export const calendarRecipient='post@konseptboligstyling.no';
const organizer='post@konseptuell.no';
const osloHour=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',hour:'2-digit',hourCycle:'h23'});
const stamp=time=>new Date(time).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
const textValue=value=>String(value).replace(/\\/g,'\\\\').replace(/\r\n|\n|\r/g,'\\n').replace(/([,;])/g,'\\$1');

// RFC 5545 limits physical lines by octets. Keep multibyte names intact.
function fold(line){
 let result='',bytes=0;
 for(const char of line){
  const size=Buffer.byteLength(char);
  if(bytes+size>75){result+='\r\n ';bytes=1;}
  result+=char;bytes+=size;
 }
 return result;
}

function visits(r,customer){
 const self=customerVisits(r);
 return ['outbound','return'].flatMap(phase=>{
  const first=phase==='outbound',date=first?r.deliveryDate:r.pickupDate;
  if(parseDateOnly(date)===null)return [];
  const field=first?'pickupTime':'returnTime',warehouse=self.some(v=>v.field===field);
  const title=warehouse?(first?'Kunden henter på lageret':'Kunden returnerer på lageret'):(first?'Utkjøring':'Henting hos kunden');
  return [{phase,date,time:warehouse?r[field]||'':'',title:title+' – '+customer,location:warehouse?warehouseAddress:(!first&&r.pickupAddress)||r.deliveryAddress||'',logistics:r.logistics||''}];
 });
}

// Called inside the workflow transaction. Only previously scheduled visits are cancelled.
export async function queueTransportCalendar(connection,record,history,now,cancel=false){
 const previous=record.history.filter(h=>h.calendarVisits).at(-1);
 let next=[];
 if(!cancel){
  const [[source]]=await connection.execute('SELECT body FROM ku_enquiries WHERE id=?',[record.id]);
  const contact=source?JSON.parse(source.body):{};
  next=visits(history.document.workflow,contact.company||contact.name||record.email);
 }
 const previousVisits=previous?.calendarVisits||[];
 const jobs=[];
 for(const phase of ['outbound','return']){
  const old=previousVisits.find(v=>v.event.phase===phase),event=next.find(v=>v.phase===phase);
  if(event&&JSON.stringify(old?.event)===JSON.stringify(event)){jobs.push(old);continue;}
  if(!event&&!old)continue;
  if(old)await connection.execute("UPDATE ku_enquiry_mail SET status='superseded' WHERE submission_id=? AND status IN ('pending','failed','uncertain')",[old.job]);
  const id=randomUUID(),sequence=(old?.sequence??-1)+1;
  const snapshot={id,kind:'rental',documentType:'transport_calendar',reference:record.id,event:event||old.event,method:event?'REQUEST':'CANCEL',sequence,receivedAt:new Date(now).toISOString()};
  await connection.execute('INSERT INTO ku_enquiries(id,fingerprint,body,created_at) VALUES (?,?,?,?)',[id,'workflow',JSON.stringify(snapshot),now]);
  await connection.execute("INSERT INTO ku_enquiry_mail(submission_id,channel,next_at) VALUES (?,'internal',?)",[id,now]);
  (history.calendarJobIds??=[]).push(id);
  if(event)jobs.push({event,job:id,sequence});
 }
 history.calendarVisits=jobs;
}

export function transportCalendarMail(s){
 const e=s.event,method=s.method,cancelled=method==='CANCEL';
 const detail=[e.time?'Kl. '+e.time:'Tidspunkt avtales',e.logistics,'Ordre '+s.reference].filter(Boolean).join('\n');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Konseptuell//Transport//NB','METHOD:'+method,'BEGIN:VEVENT',
  'UID:'+s.reference+'.'+e.phase+'@konseptuell.no','SEQUENCE:'+s.sequence,'DTSTAMP:'+stamp(s.receivedAt)];
 if(e.time){
  // Warehouse appointments are daytime slots in Oslo; observing local noon
  // gives the applicable UTC offset on that date, including summer time.
  const noon=Date.parse(e.date+'T12:00:00Z'),offset=Number(osloHour.format(noon))-12;
  const start=Date.parse(e.date+'T'+e.time+':00Z')-offset*3600000;
  lines.push('DTSTART:'+stamp(start),'DTEND:'+stamp(start+15*60000),'TRANSP:OPAQUE');
 }else lines.push('DTSTART;VALUE=DATE:'+e.date.replaceAll('-',''),'DTEND;VALUE=DATE:'+addDateDays(e.date,1).replaceAll('-',''),'TRANSP:TRANSPARENT');
 lines.push('ORGANIZER;CN=Konseptuell:mailto:'+organizer,'ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=FALSE:mailto:'+calendarRecipient,
  'SUMMARY:'+textValue(e.title),'LOCATION:'+textValue(e.location),'DESCRIPTION:'+textValue(detail),'STATUS:'+(cancelled?'CANCELLED':'CONFIRMED'),'END:VEVENT','END:VCALENDAR');
 return {subject:(cancelled?'Avlyst · ':'')+e.title+' · '+e.date,text:[e.title,e.date,e.location,detail].join('\n'),icalEvent:{filename:'transport.ics',method,content:lines.map(fold).join('\r\n')+'\r\n'}};
}
