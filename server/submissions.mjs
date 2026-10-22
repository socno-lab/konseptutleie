import {rentalModuleRequirementError} from '../public/sofa-layout.js';
import {salesEnabled} from '../public/sales-model.js';
import {createEnquirySnapshot,requestDetails} from './enquiry-snapshot.mjs';
import {enquiryEmail} from './enquiry-email.mjs';
import {readFile} from 'node:fs/promises';
import nodemailer from 'nodemailer';
import {createHash} from 'node:crypto';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const mailbox='post@konseptuell.no';
export function validateSubmission(input,products){
 if(!input||!['rental','purchase'].includes(input.kind)||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(input.id||''))throw fail('Last inn skjemaet på nytt.');
 const clean=(key,max,required=false)=>{const v=input[key]??'';if(typeof v!=='string'||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)||(required&&!v.trim()))throw fail('Kontroller '+key+' i skjemaet.');return v.trim();};
 const name=clean('name',100,true),email=clean('email',200,true),terms=clean('terms',100,true);clean('text',60000);
 if(/[\r\n]/.test(name+email+terms)||! /^[^\s<>@,;:]+@[^\s<>@,;:]+\.[^\s<>@,;:]+$/.test(email))throw fail('Oppgi en gyldig e-postadresse.');
 if(!/^2026-\d\d-\d\d/.test(terms))throw fail('Godta gjeldende vilkår før innsending.');
 if(input.website)throw fail('Kunne ikke sende skjemaet.');
 if(!input.basket||typeof input.basket!=='object'||Array.isArray(input.basket)||Object.keys(input.basket).length>150)throw fail('Kontroller produktutvalget.');
 for(const [id,q] of Object.entries(input.basket)){const p=products.find(p=>p.id===id&&p.active&&!p.deletedAt);if(!p||input.kind==='purchase'&&!salesEnabled(p)||input.kind==='rental'&&p.rentalEnabled===false||!Number.isInteger(q)||q<1||q>99)throw fail('Et produkt er endret. Last inn siden på nytt og kontroller utvalget.');}
 if(!Object.keys(input.basket).length&&(input.kind!=='rental'||input.customRequest!==true))throw fail('Velg produkter eller en tilpasset forespørsel.');
 if(input.kind==='rental'){const requirement=rentalModuleRequirementError(input.basket,products);if(requirement)throw fail(requirement);}
 return {id:input.id,kind:input.kind,name,email,terms,customRequest:input.customRequest===true};
}
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export function submissionFingerprint(input){const {text,id,website,...stable}=input;if(stable.details)stable.details={...stable.details,deliveryToken:''};return createHash('sha256').update(JSON.stringify(canonical(stable))).digest('hex');}
// Explicit SMTP rejection or failure before DATA is safe to retry. Lost DATA acknowledgements are not.
export const retryableMailError=error=>Number(error.responseCode)>=400||['CONN','EHLO','HELO','STARTTLS','AUTH','MAIL FROM','RCPT TO'].some(command=>String(error.command||'').startsWith(command))||['ECONNECTION','EDNS','EAUTH'].includes(error.code)&&error.command!=='DATA';
export function createSubmissionSender(env,store,sendOverride){
 const host=env.SMTP_HOST||'smtp.hostinger.com',port=Number(env.SMTP_PORT||465),user=env.SMTP_USER||mailbox;
 const enabled=Boolean(store.enabled&&env.SMTP_PASS&&user===mailbox&&[465,587].includes(port));
 const transport=enabled&&!sendOverride?nodemailer.createTransport({host,port,secure:port===465,requireTLS:true,auth:{user,pass:env.SMTP_PASS},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true}):null;
 const send=sendOverride||((message)=>transport.sendMail(message));let active=0,draining=false,lastPruned=0;
 let logo;const logoBytes=()=>logo??=readFile(new URL('../public/assets/konseptuell-leie-og-kjop-logo.png',import.meta.url));
 async function flush(){
  if(!enabled||draining)return;draining=true;
  try{
   if(Date.now()-lastPruned>3600000){await store.pruneEnquiries(Date.now());lastPruned=Date.now();}
   for(const job of await store.pendingEnquiryMail(Date.now())){
    if(!await store.claimEnquiryMail(job.id,job.channel,Date.now()))continue;
    const internal=job.channel==='internal',to=internal?mailbox:job.snapshot.email;
    let status='uncertain';
    try{
     const message=enquiryEmail(job.snapshot,job.channel),result=await send({...message,from:{name:'Konseptuell',address:mailbox},to,replyTo:internal?{name:job.snapshot.name,address:job.snapshot.email}:{name:'Konseptuell',address:mailbox},messageId:`<${job.id}.${job.channel}@konseptuell.no>`,attachments:[{filename:'konseptuell-logo.png',content:await logoBytes(),cid:'konseptuell-logo',contentType:'image/png',contentDisposition:'inline'}],disableFileAccess:true,disableUrlAccess:true});
     status=result.accepted?.some(address=>String(address).toLowerCase()===to.toLowerCase())?'sent':'pending';
    }catch(error){status=retryableMailError(error)?'pending':'uncertain';console.error('E-post '+job.channel+' '+job.id+': '+String(error.code||'SMTP').replace(/[^A-Z0-9_]/gi,''));}
    await store.finishEnquiryMail(job.id,job.channel,status,Date.now());
   }
  }catch(error){console.error('E-postkø: '+String(error.code||'STORE').replace(/[^A-Z0-9_]/gi,''));}finally{draining=false;}
 }
 return {enabled,flush,async submit(input,products,client,context={}){
  if(!enabled)throw fail('E-postsending er ikke aktivert ennå. Kontakt post@konseptuell.no. Utvalget ditt er beholdt.',503);
  if(active>=2)throw fail('Mange sender samtidig. Vent litt før du prøver igjen.',429);
  active++;
  try{
   // Read the persisted snapshot before repricing a repeat request. Never rebuild sent mail from a changed catalog.
   if(!input||!/^[a-f0-9-]{36}$/.test(input.id||'')||input.website)throw fail('Last inn skjemaet på nytt.');
   const fingerprint=submissionFingerprint(input),existing=await store.readEnquiry(input.id);
   if(existing){
    if(existing.legacy||existing.fingerprint!==fingerprint)throw fail('Referansen er allerede brukt. Kontakt post@konseptuell.no før du sender på nytt.',409);
    void flush();return {ok:true,reference:input.id};
   }
   const value=validateSubmission(input,products);requestDetails(input);
   const codes=store.readDiscountCodes?(await store.readDiscountCodes()).codes:[];
   const snapshot=createEnquirySnapshot(value,input,products,{codes,verifyDelivery:context.verifyDelivery});
   const claim=await store.reserveEnquiry(value.id,fingerprint,snapshot,client,Date.now());
   if(claim.limited)throw fail('For mange innsendinger. Vent 15 minutter eller kontakt post@konseptuell.no.',429);
   if(claim.conflict)throw fail('Denne referansen er allerede brukt av en annen forespørsel.',409);
   void flush();return {ok:true,reference:value.id};
  }finally{active--;}
 },close(){transport?.close();}};
}
