import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalReminderEvents,rentalReminderEmail} from '../server/rental-reminders.mjs';
import {rentalTermsSnapshot} from '../server/rental-terms-pdf.mjs';
const time='2026-12-03T09:00:00Z';
const rental=(mode='delivery')=>({id:'rental',email:'test@example.invalid',deliveryDate:'2026-12-04',pickupDate:'2026-12-07',start:'2026-12-05',end:'2026-12-06',deliveryMode:mode,deliveryAddress:'Testveien 1',pickupTime:'09.15',returnTime:'15.45',lines:[],intro:'',logistics:''});
const record=(mode='delivery')=>({status:'confirmed',history:[{type:'confirmation',document:{id:'confirmation',workflow:rental(mode),rentalTerms:rentalTermsSnapshot()}}]});
test('reminders are due at 10 Oslo time on the preceding calendar day, including weekends and DST',()=>{
 const r=record();assert.equal(rentalReminderEvents(r,Date.parse('2026-12-03T08:59:59Z')).length,0);assert.equal(rentalReminderEvents(r,Date.parse(time)).length,1);
 assert.equal(rentalReminderEvents(r,Date.parse('2026-12-03T22:59:00Z')).length,1);assert.equal(rentalReminderEvents(r,Date.parse('2026-12-03T23:00:00Z')).length,0);
 const summer=record();summer.history[0].document.workflow.deliveryDate='2027-07-02';assert.equal(rentalReminderEvents(summer,Date.parse('2027-07-01T07:59:00Z')).length,0);assert.equal(rentalReminderEvents(summer,Date.parse('2027-07-01T08:00:00Z')).length,1);
 assert.equal(rentalReminderEvents(r,Date.parse('2026-12-06T09:00:00Z'))[0].label,'Henting');
});
test('all four transport modes use the agreed location and appropriate pickup or return appointment',()=>{
 for(const [mode,first,last]of [['delivery','Levering','Henting'],['pickup','Selvhenting','Retur på lageret'],['deliveryOnly','Levering','Retur på lageret'],['collectionOnly','Selvhenting','Henting']]){
 const r=record(mode),a=rentalReminderEvents(r,Date.parse(time))[0],b=rentalReminderEvents(r,Date.parse('2026-12-06T09:00Z'))[0];assert.equal(a.label,first);assert.equal(b.label,last);
 for(const e of[a,b]){assert.equal(e.address,e.self?'Segelckes vei 15, 2010 Strømmen':'Testveien 1');assert.equal(e.time,e.self?(e.phase==='outbound'?'09.15':'15.45'):'08.00–12.00');}
 }
});
test('draft dates never replace confirmed dates, closed/unconfirmed orders do not send, custom arrangements are preserved',()=>{
 const r={...record(),deliveryDate:'2027-01-01'};assert.equal(rentalReminderEvents(r,Date.parse(time))[0].date,'2026-12-04');
 for(const status of ['new','offered','accepted','cancelled','completed'])assert.deepEqual(rentalReminderEvents({...r,status},Date.parse(time)),[]);
 assert.deepEqual(rentalReminderEvents({...r,returnedAt:time},Date.parse(time)),[]);
 r.history[0].document.workflow.logistics='Levering mellom 14.00 og 16.00 etter avtale.';const e=rentalReminderEvents(r,Date.parse(time))[0];assert.equal(e.time,'Se avtalt tidsrom nedenfor');assert.match(e.logistics,/14.00 og 16.00/);
 const mail=rentalReminderEmail({workflow:r.history[0].document.workflow,reminder:e});assert.match(mail.text,/14.00 og 16.00/);assert.doesNotMatch(mail.text,/08.00–12.00/);
});
test('reminder keys ignore product-only changes but follow changes to dates, intervals and address',()=>{
 const r=record(),key=rentalReminderEvents(r,Date.parse(time))[0].key;
 r.history[0].document.workflow.lines=[{name:'Ny stol'}];assert.equal(rentalReminderEvents(r,Date.parse(time))[0].key,key);
 r.history[0].document.workflow.deliveryAddress='Annen adresse';assert.notEqual(rentalReminderEvents(r,Date.parse(time))[0].key,key);
});
test('reminder email escapes data, uses the logo and does not impose new terms on an older contract',()=>{
 const r=record(),w=r.history[0].document.workflow;w.deliveryAddress='<script>bad</script>';const e=rentalReminderEvents(r,Date.parse(time))[0];
 const mail=rentalReminderEmail({workflow:w,reminder:e,logoSrc:'cid:konseptuell-logo'});assert.match(mail.html,/cid:konseptuell-logo/);assert.match(mail.html,/&lt;script&gt;/);assert.doesNotMatch(mail.html,/<script>/);assert.match(mail.text,/Ny kjøring etter bomtur/);
 const old=rentalReminderEmail({workflow:w,reminder:{...e,terms:{html:'Opprinnelige vilkår'}}});assert.doesNotMatch(old.text,/faktureres i tillegg|ekstra leie beregnes/);assert.match(old.text,/Avtalte leiebetingelser gjelder/);
});

test('same-day rental has distinct outbound and return reminders; purchases and missing addresses are excluded',()=>{
 const r=record();r.history[0].document.workflow.pickupDate='2026-12-04';const events=rentalReminderEvents(r,Date.parse(time));assert.equal(events.length,2);assert.notEqual(events[0].key,events[1].key);
 assert.deepEqual(rentalReminderEvents({...r,kind:'purchase'},Date.parse(time)),[]);r.history[0].document.workflow.deliveryAddress='';assert.deepEqual(rentalReminderEvents(r,Date.parse(time)),[]);
});

test('delivery and collection reminders only describe the relevant visit and omit generic two-visit logistics',()=>{const x=record();for(const [now,expected,other]of [[time,'leveringsadressen','henteadressen'],['2026-12-06T09:00Z','henteadressen','leveringsadressen']]){const event=rentalReminderEvents(x,Date.parse(now))[0],mail=rentalReminderEmail({workflow:x.history[0].document.workflow,reminder:event});assert.match(mail.text,new RegExp(expected));assert.doesNotMatch(mail.text,new RegExp(other));assert.doesNotMatch(mail.text,/Vi utfører levering og henting|tilgang til boligen for både/);}});
