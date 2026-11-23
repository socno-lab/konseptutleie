import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {transportCalendarMail,queueTransportCalendar,calendarRecipient} from '../server/transport-calendar.mjs';
import {createSubmissionSender} from '../server/submissions.mjs';

test('all four transport modes use actual dates, locations and warehouse times',async()=>{
 for(const mode of ['pickup','delivery','deliveryOnly','collectionOnly']){
  const r={id:'order',email:'kunde@example.invalid',deliveryMode:mode,deliveryAddress:'Leveringsveien',pickupAddress:'Henteveien',deliveryDate:'2027-03-26',pickupDate:'2027-03-30',pickupTime:'08:30',returnTime:'12:45'};
  const h={document:{workflow:r}},messages=[];
  await queueTransportCalendar({async execute(sql,args){
   if(sql.startsWith('SELECT'))return [[{body:JSON.stringify({name:'Testkunde'})}]];
   if(sql.startsWith('INSERT INTO ku_enquiries'))messages.push(JSON.parse(args[2]));
  }},{...r,history:[h]},h,0);
  assert.equal(messages.length,2);
  for(const [i,s] of messages.entries()){
   const local=i?['pickup','deliveryOnly'].includes(mode):['pickup','collectionOnly'].includes(mode);
   const message=transportCalendarMail(s),ics=message.icalEvent.content;
   assert.match(ics,/ORGANIZER;CN=Konseptuell:mailto:post@konseptuell.no/);
   assert.ok(ics.includes('mailto:'+calendarRecipient));
   assert.ok(message.subject.includes('Testkunde'));
   if(local){assert.ok(ics.includes(i?'DTSTART:20270330T104500Z':'DTSTART:20270326T073000Z'));assert.ok(s.event.location.includes('Strømmen'));}
   else{assert.ok(ics.includes('TRANSP:TRANSPARENT'));assert.equal(s.event.location,i?'Henteveien':'Leveringsveien');}
  }
 }
});

test('SMTP delivers an Outlook meeting request to the internal recipient with no customer copy',async()=>{
 const s={documentType:'transport_calendar',method:'REQUEST',reference:'abc',sequence:0,receivedAt:'2026-11-23T10:00:00Z',event:{title:'Utkjøring – Æ'.repeat(9),location:'A, B',date:'2026-12-01',logistics:'A\nB'}};
 let message,status;
 const store={enabled:true,pendingEnquiryMail:async()=>[{id:'job',channel:'internal',snapshot:s}],claimEnquiryMail:async()=>true,finishEnquiryMail:async(id,channel,value)=>{status=value;}};
 const sender=createSubmissionSender({SMTP_PASS:'fake'},store,async mail=>{message=mail;return {accepted:[mail.to]};});
 await sender.flush();
 assert.equal(status,'sent');assert.equal(message.to,'post@konseptboligstyling.no');assert.equal(message.from.address,'post@konseptuell.no');
 assert.ok(message.icalEvent.content.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
 const mime=await nodemailer.createTransport({streamTransport:true,buffer:true}).sendMail(message);
 assert.match(mime.message.toString(),/text\/calendar;[^\r\n]*method=REQUEST/i);
});
