// Offline fixtures only. No SMTP transport and no real customer addresses.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import {createEnquirySnapshot} from '../server/enquiry-snapshot.mjs';
import {validateSubmission} from '../server/submissions.mjs';
import {enquiryEmail} from '../server/enquiry-email.mjs';
const out=path.resolve(process.argv[2]||'../../outputs/email-previews');await mkdir(out,{recursive:true});
const products=[{id:'sofa',active:true,stock:10,unavailable:0,category:'Sofaer',name:'Eksempelsofa med ekstra langt produktnavn – lys beige, natur eik og mykt tekstil',price:500,weekPrice:1200,monthPrice:2000,rentalPricingMode:'manual',saleEnabled:true,salePrice:6490},{id:'addon',active:true,stock:10,unavailable:0,category:'Tilvalg',isService:true,name:'Tekstilpakke til sofa',rentalPricingMode:'period',price:400}];
const base={id:'e1a289b6-c470-4125-8000-123456789abc',name:'Emilie Eksempel',email:'emilie@example.invalid',terms:'2026-10-22-2',basket:{sofa:1},details:{}};
const rental={...base,kind:'rental',basket:{sofa:1,addon:1},details:{start:'2026-11-01',end:'2026-12-01',delivery:'Ønsker levering og henting',occasion:'Messe, stand og event',address:'Eksempelveien 12, 1470 Eksempelsted',phone:'00000000',company:'Eksempel AS',notes:'Vi ønsker møblene samlet i en lounge. Ring ved ankomst.'}};
const purchase={...base,id:'e1a289b6-c470-4125-8000-123456789abd',kind:'purchase',basket:{sofa:2},details:{delivery:'Henter selv etter avtale'}};
const logo=await readFile(new URL('../public/assets/konseptuell-leie-og-kjop-logo.png',import.meta.url));
const mime=nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'});
for(const [kind,input] of [['leie',rental],['kjop',purchase]]){
 const snapshot=createEnquirySnapshot(validateSubmission(input,products),input,products,{verifyDelivery:()=>({total:2380})});
 for(const audience of ['customer','internal']){
  const message=enquiryEmail(snapshot,audience),name=kind+'-'+audience;
  await writeFile(path.join(out,name+'.html'),message.html.replace('cid:konseptuell-logo','data:image/png;base64,'+logo.toString('base64')));
  await writeFile(path.join(out,name+'.txt'),message.text);
  const result=await mime.sendMail({...message,from:'Konseptuell <post@konseptuell.no>',to:audience==='customer'?input.email:'internal@example.invalid',attachments:[{filename:'konseptuell-logo.png',content:logo,cid:'konseptuell-logo'}]});
  await writeFile(path.join(out,name+'.eml'),result.message);
 }
}
await writeFile(path.join(out,'index.html'),'<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>E-postforhåndsvisning</title><body style="font:16px/1.6 Arial;background:#f6f4ee;color:#2d332a;padding:24px"><h1>E-postbekreftelser</h1><p>Fiktive data. Ingen e-post er sendt.</p>'+['leie','kjop'].map(kind=>'<h2>'+kind+'</h2>'+['customer','internal'].map(role=>'<p><a href="'+kind+'-'+role+'.html">'+(role==='customer'?'Kundebekreftelse':'Intern e-post')+'</a> · <a href="'+kind+'-'+role+'.eml">Last ned .eml</a></p>').join('')).join('')+'</body></html>');
console.log('Offline HTML, tekst og MIME-forhåndsvisninger: '+out);
