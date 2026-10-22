const submissions=new WeakMap();
export async function submitEnquiry(form,{kind,basket,customRequest=false,lines,businessChoices={},packageGroups=[],cartLinks={},deliveryToken='',discountCode=''}){
 const fields=Object.fromEntries(new FormData(form)),payload={kind,name:fields.name||'',email:fields.email||'',terms:fields.termsAccepted||fields.rentalTermsAccepted||'',website:fields.website||'',basket,customRequest,businessChoices,packageGroups,cartLinks,details:{phone:fields.phone||'',company:fields.company||'',address:fields.address||'',notes:fields.notes||'',occasion:fields.occasion||'',delivery:fields.delivery||fields.shipping||'',start:fields.start||'',end:fields.end||'',stylist:fields.stylist||'',stylingNotes:fields.stylingNotes||'',customRequest:fields.customRequest||'',deliveryToken,discountCode}};
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
