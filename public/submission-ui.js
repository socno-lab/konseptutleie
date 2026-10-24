import {receiptEntries} from './receipt-layout.js?v=packageitems20261023';
const submissions=new WeakMap();
export async function submitEnquiry(form,{kind,basket,customRequest=false,lines,businessChoices={},packageGroups=[],cartLinks={},purchaseSofas=[],deliveryToken='',discountCode=''}){
 const fields=Object.fromEntries(new FormData(form)),payload={kind,name:fields.name||'',email:fields.email||'',terms:fields.termsAccepted||fields.rentalTermsAccepted||'',website:fields.website||'',basket,purchaseSofas,customRequest,businessChoices,packageGroups,cartLinks,details:{phone:fields.phone||'',company:fields.company||'',address:fields.address||'',notes:fields.notes||'',occasion:fields.occasion||'',delivery:fields.delivery||fields.shipping||'',start:fields.start||'',end:fields.end||'',stylist:fields.stylist||'',stylingNotes:fields.stylingNotes||'',customRequest:fields.customRequest||'',deliveryToken,discountCode}};
 const signature=JSON.stringify({...payload,details:{...payload.details,deliveryToken:''}}).replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/g,'[tidspunkt]');
 let record=submissions.get(form);if(!record||record.signature!==signature){const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature)))].map(b=>b.toString(16).padStart(2,'0')).join('');let saved;try{saved=JSON.parse(sessionStorage.getItem('konsept-enquiry-'+kind)||'null');}catch{}record={signature,id:saved?.digest===digest?saved.id:crypto.randomUUID(),payload};try{sessionStorage.setItem('konsept-enquiry-'+kind,JSON.stringify({digest,id:record.id}));}catch{}submissions.set(form,record);}
 if(record.result)return record.result;
 if(record.busy)throw Error('Forespørselen sendes allerede. Vent på bekreftelsen.');
 record.busy=true;
 try{
  let result;
  const body=JSON.stringify({...record.payload,id:record.id});
  for(let attempt=0;attempt<2;attempt++){
   const response=await fetch('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body,signal:AbortSignal.timeout(25000)});
   const text=await response.text();
   try{result=JSON.parse(text);}catch{
    // A hosting restart/proxy can return HTML or no body. Reuse the same id,
    // so a registered request is recovered without sending duplicate mail.
    if(attempt===0&&(response.ok||[502,503,504].includes(response.status)))continue;
    throw Error('Serveren ga ikke en gyldig bekreftelse (HTTP '+response.status+'). Kurven er beholdt. Prøv igjen; samme referanse brukes for å unngå dobbel innsending. Referanse: '+record.id);
   }
   if(!response.ok||!result?.ok)throw Error(result?.error||'Sendingen kunne ikke bekreftes. Kontakt post@konseptuell.no med referanse '+record.id+'.');
   break;
  }
  record.result=result;return result;
 }catch(error){if(error.name==='TimeoutError')throw Error('Sendingen tok for lang tid. Kontakt post@konseptuell.no med referanse '+record.id+' før du sender på nytt.');throw error;}finally{record.busy=false;}
}
for(const form of document.querySelectorAll('#requestForm, #saleRequestForm')){
 const trap=document.createElement('input');trap.type='text';trap.name='website';trap.tabIndex=-1;trap.autocomplete='off';trap.hidden=true;trap.setAttribute('aria-hidden','true');form.append(trap);
 const notice=form.querySelector('.demo-info')||[...form.querySelectorAll('p')].find(p=>p.textContent.includes('Prototypen laster ned'));
 if(notice)notice.textContent='Du får en mottaksbekreftelse på e-post når forespørselen er registrert. Vi følger opp med en avklaring før endelig bekreftelse og betalingslenke. Innsendingen er uforpliktende.';
 const button=form.querySelector('[type="submit"], #saleExport');if(button)button.textContent=form.id==='requestForm'?'Send leieforespørsel ↗':'Send bestillingsforespørsel ↗';
}

// The server has persisted the enquiry before this screen replaces the form.
export function showEnquiryConfirmation({reference,kind,email,receipt}){
 const main=document.createElement('main');
 main.style.cssText='max-width:720px;margin:clamp(24px,8vw,80px) auto;padding:24px;box-sizing:border-box;overflow-wrap:anywhere';
 const logo=document.createElement('a');logo.href='/';logo.textContent='KONSEPTUELL';logo.style.cssText='font-family:Georgia,serif;font-size:28px;color:inherit;text-decoration:none';main.append(logo);
 const label=document.createElement('p');label.className='eyebrow';label.style.marginTop='48px';label.textContent='FORESPØRSEL MOTTATT';main.append(label);
 const heading=document.createElement('h1');heading.textContent='Takk for forespørselen din!';heading.style.cssText='font-size:clamp(30px,6vw,48px);line-height:1.15;outline:none';main.append(heading);
 const add=(text)=>{const p=document.createElement('p');p.textContent=text;p.style.lineHeight='1.7';main.append(p);};
 add('Din '+(kind==='purchase'?'kjøpsforespørsel':'leieforespørsel')+' er sendt inn og registrert.');
 add('Referanse: '+reference);
 const info=document.createElement('div');info.style.cssText='background:#ecefe5;padding:20px;margin:24px 0;line-height:1.7';info.textContent='En kopi av forespørselen sendes til '+email+'. Sjekk gjerne søppelpost hvis du ikke finner e-posten.';main.append(info);
 if(receipt)main.append(enquiryReceipt(receipt));
 const next=document.createElement('h2');next.textContent='Hva skjer videre?';main.append(next);
 add('Vi sjekker tilgjengelighet og kommer tilbake med en avklaring. Når vi har avklart at vi kan levere, sender vi en egen bekreftelse med leveringsinformasjon og betalingslenke til Vipps.');
 add('Forespørselen er uforpliktende. Varene og leveringstidspunktet er foreløpig ikke bekreftet. Du skal ikke betale noe nå.');
 add('Handlekurven er tømt. Har du spørsmål, kan du svare på e-postbekreftelsen og oppgi referansen.');
 const link=document.createElement('a');link.className='button dark';link.href=kind==='purchase'?'/kjop.html':'/utvalg.html?bruk=alle#utvalg';link.textContent='Tilbake til produktene';main.append(link);
 document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
 document.body.style.cssText='margin:0;overflow:auto;position:static;width:auto;height:auto';document.documentElement.style.overflow='auto';
 document.body.className='enquiry-confirmation-page';document.body.replaceChildren(main);document.title='Forespørsel mottatt · Konseptuell';heading.tabIndex=-1;heading.focus();window.scrollTo(0,0);requestAnimationFrame(()=>window.scrollTo(0,0));
}

// Render only the server-confirmed snapshot, using textContent for customer content.
export function enquiryReceipt(receipt){
 const section=document.createElement('section');section.style.cssText='margin:28px 0;min-width:0';
 const node=(tag,text,parent=section)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;};
 const money=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(n)+' kr';
 node('h2','Dette har du sendt inn');
 const period=receipt.facts?.find(([label])=>label==='Ønsket leieperiode')?.[1];
 if(period){const box=node('div','');box.style.cssText='background:#ecefe5;padding:16px;margin:16px 0;border-left:3px solid #414b38';node('small','ØNSKET LEIEPERIODE',box);node('strong',period.replace(/(\d{4})-(\d{2})-(\d{2})/g,'$3.$2.$1').replace(/ til /g,' – '),box).style.cssText='display:block;margin-top:6px';}
 const entries=receiptEntries(receipt.lines||[]);
 for(const entry of entries){if(entry.type==='group'){node('h3',entry.group.name+' · '+entry.group.quantity+(entry.group.quantity===1?' pakke':' pakker'));continue;}if(entry.type==='subtotal'){node('p','Delsum '+entry.group.name+': '+(entry.total===null?'Avklares':money(entry.total))).style.fontWeight='bold';continue;}const line=entry.line;const row=node('div','');row.style.cssText='display:flex;gap:14px;padding:16px 0;border-bottom:1px solid #d9dbcf;align-items:flex-start;min-width:0';if(line.addonFor?.length)row.style.cssText+=';padding:8px 0;gap:14px;font-size:13px';
 if(typeof line.image==='string'&&/^\/(assets|media)\//.test(line.image)&&!line.image.includes('..')){const img=document.createElement('img');img.src=line.image;img.alt=line.name;img.width=line.addonFor?.length?24:56;img.height=img.width;img.style.cssText='width:'+img.width+'px;height:'+img.height+'px;flex-shrink:0;object-fit:contain;background:transparent';const imageBox=document.createElement('span');imageBox.style.cssText='display:flex;justify-content:center;width:56px;min-width:56px';imageBox.append(img);row.append(imageBox);}
 const copy=node('div','',row);copy.style.cssText='flex:1;min-width:0;overflow-wrap:anywhere';node('strong',(line.addonFor?.length?'+ ':'')+line.name,copy).style.cssText='display:block;'+(line.addonFor?.length?'font-size:13px;font-weight:500':'');node('div',line.quantity+' stk. · '+line.basis,copy).style.cssText='font-size:13px;line-height:1.6';if(line.contents?.length)node('small',line.contents.join('; '),copy);node('div',line.total===null?'Pris på forespørsel':money(line.total),copy).style.marginTop='6px';}
 if(receipt.discount)node('p','Rabatt ('+receipt.discount.code+'): −'+money(receipt.discount.discount));
 if(receipt.delivery?.total!==null&&receipt.delivery?.total!==undefined)node('p','Transport: '+money(receipt.delivery.total));
 node('strong',receipt.total===null?'Samlet pris avklares i tilbudet.':'Foreløpig total: '+money(receipt.total)).style.cssText='display:block;margin:20px 0 8px';
 node('small',receipt.vatIncluded?'Alle priser er inkludert mva.':'Alle priser er ekskludert mva.');
 for(const [label,value] of [...(receipt.facts||[]).filter(([label])=>label!=='Ønsket leieperiode'),['Leveringsmåte',receipt.delivery?.label],['Adresse',receipt.address],['Din kommentar',receipt.comment]])if(value){const p=node('p','');node('strong',label,p);node('span',value,p).style.cssText='display:block;white-space:pre-line;line-height:1.7';}
 return section;
}
