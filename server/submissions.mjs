import {rentalModuleRequirementError} from '../public/sofa-layout.js';
import {salesEnabled} from '../public/sales-model.js';
import nodemailer from 'nodemailer';
import {createHash} from 'node:crypto';
const fail=(message,status=400)=>Object.assign(Error(message),{status});
const mailbox='post@konseptuell.no';
export function validateSubmission(input,products){
 if(!input||!['rental','purchase'].includes(input.kind)||!/^[a-f0-9-]{36}$/.test(input.id||''))throw fail('Last inn skjemaet på nytt.');
 const clean=(key,max,required=false)=>{const v=input[key];if(typeof v!=='string'||v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)||(required&&!v.trim()))throw fail('Kontroller '+key+' i skjemaet.');return v.trim();};
 const name=clean('name',100,true),email=clean('email',200,true),text=clean('text',60000,true),terms=clean('terms',100,true);
 if(/[\r\n]/.test(name+email+terms)||! /^[^\s<>@,;:]+@[^\s<>@,;:]+\.[^\s<>@,;:]+$/.test(email))throw fail('Oppgi en gyldig e-postadresse.');
 if(!/^2026-\d\d-\d\d/.test(terms))throw fail('Godta gjeldende vilkår før innsending.');
 if(input.website)throw fail('Kunne ikke sende skjemaet.');
 if(!input.basket||typeof input.basket!=='object'||Array.isArray(input.basket)||Object.keys(input.basket).length>150)throw fail('Kontroller produktutvalget.');
 const lines=[];for(const [id,q] of Object.entries(input.basket)){const p=products.find(p=>p.id===id&&p.active&&!p.deletedAt);if(!p||input.kind==='purchase'&&!salesEnabled(p)||!Number.isInteger(q)||q<1||q>999)throw fail('Et produkt er endret. Last inn siden på nytt og kontroller utvalget.');lines.push(`${q} × ${p.name} [${id}]`);}
 if(!lines.length&&(input.kind!=='rental'||input.customRequest!==true))throw fail('Velg produkter eller en tilpasset forespørsel.');
 if(input.kind==='rental'){const requirement=rentalModuleRequirementError(input.basket,products);if(requirement)throw fail(requirement);}
 return {id:input.id,kind:input.kind,name,email,text,terms,lines};
}
export function createSubmissionSender(env,store,sendOverride){
 const host=env.SMTP_HOST||'smtp.hostinger.com',port=Number(env.SMTP_PORT||465),user=env.SMTP_USER||mailbox;
 const enabled=Boolean(store.enabled&&env.SMTP_PASS&&user===mailbox&&[465,587].includes(port));
 const transport=enabled&&!sendOverride?nodemailer.createTransport({host,port,secure:port===465,requireTLS:true,auth:{user,pass:env.SMTP_PASS},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:15000,disableFileAccess:true,disableUrlAccess:true}):null;
 const send=sendOverride||((message)=>transport.sendMail(message));
 let active=0;
 return {enabled,async submit(input,products,client){
  if(!enabled)throw fail('E-postsending er ikke aktivert ennå. Kontakt post@konseptuell.no. Utvalget ditt er beholdt.',503);
  const value=validateSubmission(input,products),fingerprint=createHash('sha256').update(JSON.stringify(value)).digest('hex');
  if(active>=2)throw fail('Mange sender samtidig. Vent litt før du prøver igjen.',429);
  active++;
  try{
   const claim=await store.reserveSubmission(value.id,fingerprint,client,Date.now());
   if(claim==='sent')return {ok:true,reference:value.id};
   if(claim==='limited')throw fail('For mange innsendinger. Vent 15 minutter eller kontakt post@konseptuell.no.',429);
   if(claim!=='new')throw fail('Denne forespørselen er allerede under behandling. Kontakt post@konseptuell.no og oppgi referansen '+value.id+' før du sender på nytt.',409);
   const text=['KONSEPTUELL – '+(value.kind==='purchase'?'KJØPSFORESPØRSEL':'LEIEFORESPØRSEL'),`Referanse: ${value.id}`,`Mottatt: ${new Date().toISOString()}`,`Navn: ${value.name}`,`E-post: ${value.email}`,`Vilkårsversjon oppgitt av kunden: ${value.terms}`,'','PRODUKTER (kontrollert mot katalogen)',...value.lines,'','KUNDENS ØNSKER OG VEILEDENDE BEREGNING','Opplysninger og priser nedenfor kommer fra kundens skjema. Kontroller priser, rabatter, datoer, transport og lager før tilbud/ordrebekreftelse. Dette er ikke en bindende avtale.','',value.text,'','Før avtale: Send endelig tilbud/ordrebekreftelse med samlet pris, datoer, gjeldende vilkår og angrerettskjema. Ved oppstart før angrefristen: innhent særskilt uttrykkelig anmodning. Send betalingslenke fra Vipps etter avtalt prosess.'].join('\n');
   try{
    const result=await send({from:{name:'Konseptuell',address:mailbox},to:mailbox,replyTo:{name:value.name,address:value.email},subject:(value.kind==='purchase'?'Kjøpsforespørsel':'Leieforespørsel')+' · '+value.id.slice(0,8),messageId:`<${value.id}@konseptuell.no>`,text,disableFileAccess:true,disableUrlAccess:true});
    if(!result.accepted?.some(address=>String(address).toLowerCase()===mailbox))throw Error('Recipient not accepted');
   }catch(error){await store.completeSubmission(value.id,'uncertain');console.error('E-postsending: '+String(error.code||'SMTP').replace(/[^A-Z0-9_]/gi,''));throw fail('Sendingen kunne ikke bekreftes. Kontakt post@konseptuell.no og oppgi referansen '+value.id+'. Utvalget ditt er beholdt.',503);}
   await store.completeSubmission(value.id,'sent');return {ok:true,reference:value.id};
  }finally{active--;}
 }};
}
