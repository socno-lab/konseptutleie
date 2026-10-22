const submissions=new WeakMap();
export async function submitEnquiry(form,{kind,basket,customRequest=false,lines}){
 const fields=Object.fromEntries(new FormData(form)),payload={kind,name:fields.name||'',email:fields.email||'',terms:fields.termsAccepted||fields.rentalTermsAccepted||'',website:fields.website||'',basket,customRequest,text:lines.join('\n')};
 const signature=JSON.stringify(payload).replace(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/g,'[tidspunkt]');
 let record=submissions.get(form);if(!record||record.signature!==signature){record={signature,id:crypto.randomUUID(),payload};submissions.set(form,record);}
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
 if(notice)notice.textContent='Forespørselen sendes til post@konseptuell.no. Du får bekreftelse her når sendingen er mottatt av e-postserveren. Vi følger opp med tilbud eller ordrebekreftelse på e-post. Innsendingen er uforpliktende.';
 const button=form.querySelector('[type="submit"], #saleExport');if(button)button.textContent=form.id==='requestForm'?'Send tilbudsforespørsel ↗':'Send bestillingsforespørsel ↗';
}
