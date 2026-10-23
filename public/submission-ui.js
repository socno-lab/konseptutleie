const submissions=new WeakMap();
export async function submitEnquiry(form,{kind,basket,customRequest=false,lines,businessChoices={},packageGroups=[],cartLinks={},purchaseSofas=[],deliveryToken='',discountCode=''}){
 const fields=Object.fromEntries(new FormData(form)),payload={kind,name:fields.name||'',email:fields.email||'',terms:fields.termsAccepted||fields.rentalTermsAccepted||'',website:fields.website||'',basket,purchaseSofas,customRequest,businessChoices,packageGroups,cartLinks,details:{phone:fields.phone||'',company:fields.company||'',address:fields.address||'',notes:fields.notes||'',occasion:fields.occasion||'',delivery:fields.delivery||fields.shipping||'',start:fields.start||'',end:fields.end||'',stylist:fields.stylist||'',stylingNotes:fields.stylingNotes||'',customRequest:fields.customRequest||'',deliveryToken,discountCode}};
 const signature=JSON.stringify({...payload,details:{...payload.details,deliveryToken:''}}).replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/g,'[tidspunkt]');
 let record=submissions.get(form);if(!record||record.signature!==signature){const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(signature)))].map(b=>b.toString(16).padStart(2,'0')).join('');let saved;try{saved=JSON.parse(sessionStorage.getItem('konsept-enquiry-'+kind)||'null');}catch{}record={signature,id:saved?.digest===digest?saved.id:crypto.randomUUID(),payload};try{sessionStorage.setItem('konsept-enquiry-'+kind,JSON.stringify({digest,id:record.id}));}catch{}submissions.set(form,record);}
 if(record.result)return record.result;
 if(record.busy)throw Error('Forespørselen sendes allerede. Vent på bekreftelsen.');
 record.busy=true;
 try{
  const response=await fetch('/api/submissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...record.payload,id:record.id}),signal:AbortSignal.timeout(25000)});
  const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Sendingen kunne ikke bekreftes. Kontakt post@konseptuell.no.');
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
export function showEnquiryConfirmation({reference,kind,email}){
 const main=document.createElement('main');
 main.style.cssText='max-width:720px;margin:clamp(24px,8vw,80px) auto;padding:24px;box-sizing:border-box;overflow-wrap:anywhere';
 const logo=document.createElement('a');logo.href='/';logo.textContent='KONSEPTUELL';logo.style.cssText='font-family:Georgia,serif;font-size:28px;color:inherit;text-decoration:none';main.append(logo);
 const label=document.createElement('p');label.className='eyebrow';label.style.marginTop='48px';label.textContent='FORESPØRSEL MOTTATT';main.append(label);
 const heading=document.createElement('h1');heading.textContent='Takk for forespørselen din!';heading.style.cssText='font-size:clamp(30px,6vw,48px);line-height:1.15;outline:none';main.append(heading);
 const add=(text)=>{const p=document.createElement('p');p.textContent=text;p.style.lineHeight='1.7';main.append(p);};
 add('Din '+(kind==='purchase'?'kjøpsforespørsel':'leieforespørsel')+' er sendt inn og registrert.');
 add('Referanse: '+reference);
 const info=document.createElement('div');info.style.cssText='background:#ecefe5;padding:20px;margin:24px 0;line-height:1.7';info.textContent='En kopi av forespørselen sendes til '+email+'. Sjekk gjerne søppelpost hvis du ikke finner e-posten.';main.append(info);
 const next=document.createElement('h2');next.textContent='Hva skjer videre?';main.append(next);
 add('Vi sjekker tilgjengelighet og kommer tilbake med en avklaring. Når vi har avklart at vi kan levere, sender vi en egen bekreftelse med leveringsinformasjon og betalingslenke til Vipps.');
 add('Forespørselen er uforpliktende. Varene og leveringstidspunktet er foreløpig ikke bekreftet. Du skal ikke betale noe nå.');
 add('Handlekurven er tømt. Har du spørsmål, kan du svare på e-postbekreftelsen og oppgi referansen.');
 const link=document.createElement('a');link.className='button dark';link.href=kind==='purchase'?'/kjop.html':'/utvalg.html?bruk=alle#utvalg';link.textContent='Tilbake til produktene';main.append(link);
 document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
 document.body.style.cssText='margin:0;overflow:auto;position:static;width:auto;height:auto';document.documentElement.style.overflow='auto';
 document.body.className='enquiry-confirmation-page';document.body.replaceChildren(main);document.title='Forespørsel mottatt · Konseptuell';heading.tabIndex=-1;heading.focus();window.scrollTo(0,0);requestAnimationFrame(()=>window.scrollTo(0,0));
}
