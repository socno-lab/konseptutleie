// Open enquiries share the durable queue and limits, but contain no order or pricing.
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export function createProposalSnapshot(value,input,now=new Date()){
 if(value.kind!=='rental'||value.requestType!=='proposal'||!value.customRequest||Object.keys(input.basket||{}).length)fail('Et kort skjema kan ikke inneholde produkter. Bruk produktforespørselen.');
 for(const key of ['businessChoices','cartLinks'])if(input[key]&&Object.keys(input[key]).length)fail('Kontroller forespørselen.');
 for(const key of ['packageGroups','rentalSofas','purchaseSofas'])if(input[key]&&(!Array.isArray(input[key])||input[key].length))fail('Kontroller forespørselen.');
 const details=input.details;if(!details||typeof details!=='object'||Array.isArray(details))fail('Kontroller forespørselen.');
 const text=(key,max,required=false)=>{const s=details[key]??'';if(typeof s!=='string'||s.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s)||required&&!s.trim())fail('Kontroller '+key+' i skjemaet.');return s.trim();};
 const need=text('customRequest',3000,true),place=text('place',300,true),period=text('period',300),budget=text('budget',200),phone=text('phone',40),company=text('company',150),occasion=text('occasion',100);
 if(phone&&!/[0-9]/.test(phone))fail('Oppgi et gyldig telefonnummer, eller la feltet stå tomt.');
 const facts=[['Hva trenger du?',need],['Dato eller periode',period||'Ikke bestemt ennå'],['Sted',place],['Budsjett',budget],['Anledning',occasion]].filter(([,v])=>v);
 return {id:value.id,kind:'rental',acquisition:'proposal',requestType:'proposal',name:value.name,email:value.email,phone,company,terms:'',receivedAt:now.toISOString(),address:'',comment:'',facts,lines:[],delivery:null,discount:null,total:null,vatIncluded:true};
}
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function proposalEmail(request,audience='customer'){
 const internal=audience==='internal',title=internal?'Ny tilpasset forespørsel':'Takk for forespørselen din!';
 const intro=internal?'En ny åpen forespørsel er registrert. Følg opp behov, tidspunkt og sted før dere utarbeider et forslag.':`Hei ${request.name.split(/\s+/)[0]},\n\nVi har mottatt forespørselen din. Vi svarer normalt innen én virkedag og hjelper deg å finne en løsning som passer.`;
 const next='Vi tar kontakt for å avklare behovet og sette sammen et forslag. Pris og tilgjengelighet avklares i tilbudet. Forespørselen er uforpliktende, og du skal ikke betale noe nå.';
 const facts=[['Navn',request.name],['E-post',request.email],['Telefon',request.phone],['Firma',request.company],...request.facts].filter(([,v])=>v);
 const text=['KONSEPTUELL – TILPASSET FORESPØRSEL',title,'',intro,'','Referanse: '+request.id,'','Dette har du sendt inn',...facts.map(([k,v])=>k+': '+v),'','Hva skjer videre?',next,'','Du kan svare på denne e-posten hvis du vil legge til eller endre noe.','',...(internal?['Mottatt: '+request.receivedAt,'Administrasjon: https://konseptuell.no/admin','']:[]),'Vennlig hilsen','Konseptuell','konseptuell.no'].join('\n');
 const p=s=>'<p style="margin:0 0 18px;font-size:15px;line-height:1.7;">'+escape(s).replace(/\n/g,'<br>')+'</p>';
 const html=`<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f6f4ee;color:#2d332a;font-family:Arial,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:#ffffff;"><tr><td style="padding:32px 24px;"><img src="cid:konseptuell-logo" alt="Konseptuell – leie og kjøp" width="200" style="display:block;width:200px;max-width:100%;height:auto;"><h1 style="font-size:26px;font-weight:400;line-height:1.25;margin:32px 0 20px;">${escape(title)}</h1>${p(intro)}${p('Referanse: '+request.id)}<h2 style="font-size:18px;font-weight:400;">Dette har du sendt inn</h2>${facts.map(([label,value])=>p(label+'\n'+value)).join('')}<h2 style="font-size:18px;font-weight:400;">Hva skjer videre?</h2>${p(next)}${p('Du kan svare på denne e-posten hvis du vil legge til eller endre noe.')}${p('Vennlig hilsen\nKonseptuell')}${internal?p('Mottatt: '+request.receivedAt)+p('Administrasjon: https://konseptuell.no/admin'):''}</td></tr></table></td></tr></table></body></html>`;
 return {subject:(internal?'Ny tilpasset forespørsel':'Vi har mottatt forespørselen din')+' · '+request.id,text,html};
}
