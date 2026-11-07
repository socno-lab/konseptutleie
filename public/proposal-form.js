import {submitEnquiry} from './submission-ui.js?v=proposal20261105b';
const form=document.getElementById('proposalForm'),main=document.getElementById('proposalMain'),status=document.getElementById('proposalStatus');
const draftKey='konsept-proposal-draft-v1',fields=['customRequest','period','place','budget','name','email','phone','company'];
const read=(storage,key,fallback)=>{try{return JSON.parse(storage.getItem(key)||'null')||fallback;}catch{return fallback;}};
const basket=read(localStorage,'konsept-cart-v1',{}),count=basket&&typeof basket==='object'&&!Array.isArray(basket)?Object.values(basket).filter(q=>Number.isInteger(q)&&q>0).reduce((a,b)=>a+b,0):0;
if(count){location.replace('/foresporsel.html');}else{
 const custom=read(sessionStorage,'konsept-custom-request-v1',{}),rent=read(sessionStorage,'konsept-enquiry-draft-rent',{}),draft=read(sessionStorage,draftKey,null);
 const initial=draft||{...Object.fromEntries(['name','email','phone','company'].map(key=>[key,rent[key]||''])),customRequest:custom.text||'',period:rent.start&&rent.end?rent.start+' – '+rent.end:''};
 for(const key of fields)if(typeof initial[key]==='string')form.elements.namedItem(key).value=initial[key];
 // A free-form enquiry is separate from the product basket, including old drafts.
 try{sessionStorage.setItem('konsept-custom-request-v1',JSON.stringify({active:false,text:typeof custom.text==='string'?custom.text:''}));}catch{}
 const badge=document.getElementById('count');if(badge)badge.textContent='0';
 document.getElementById('openCart')?.addEventListener('click',()=>main.scrollIntoView({behavior:'smooth'}));
 const occasionNames={produksjon:'Foto, film og reklame',messe:'Messe og stand',event:'Event og selskap',bedrift:'Bedrift',fest:'Bryllup og fest',jul:'Jul og sesong',boligsalg:'Boligfoto og visning'};
 const occasion=document.createElement('input');occasion.type='hidden';occasion.name='occasion';occasion.value=occasionNames[new URL(location.href).searchParams.get('bruk')]||'';form.append(occasion);
 const saveDraft=()=>{const value=Object.fromEntries(fields.map(key=>[key,form.elements.namedItem(key).value]));try{sessionStorage.setItem(draftKey,JSON.stringify(value));}catch{}};
 form.addEventListener('input',saveDraft);window.addEventListener('pagehide',saveDraft);
 let busy=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const need=form.elements.namedItem('customRequest'),place=form.elements.namedItem('place');
  for(const field of [need,place]){field.setCustomValidity(field.value.trim()?'':'Fyll ut dette feltet.');if(!field.reportValidity())return;}
  busy=true;const button=form.querySelector('[type="submit"]');button.disabled=true;main.setAttribute('aria-busy','true');status.textContent='Sender forespørselen …';
  try{
   const result=await submitEnquiry(form,{kind:'rental',basket:{},customRequest:true,requestType:'proposal'});
   if(result.receipt?.acquisition!=='proposal')throw Error('Kunne ikke bekrefte forespørselen. Kontakt post@konseptuell.no.');
   try{sessionStorage.removeItem(draftKey);sessionStorage.removeItem('konsept-custom-request-v1');}catch{}
   window.removeEventListener('pagehide',saveDraft);form.removeEventListener('input',saveDraft);
   const email=form.elements.namedItem('email').value;
   main.replaceChildren();main.classList.add('proposal-confirmation');
   const add=(tag,text,parent=main)=>{const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;};
   add('p','FORESPØRSEL MOTTATT').className='eyebrow';const title=add('h1','Takk for forespørselen din!');title.tabIndex=-1;
   add('p','Forespørselen er registrert. En kopi sendes til '+email+'. Vi svarer normalt innen én virkedag.');
   add('p','Referanse: '+result.reference).className='hint';add('h2','Dette har du sendt inn');
   const list=add('dl','');for(const [label,value] of result.receipt.facts||[]){add('dt',label,list);add('dd',value,list);}
   add('p','Vi tar kontakt for å avklare behovet og sette sammen et forslag. Pris og tilgjengelighet avklares i tilbudet. Forespørselen er uforpliktende, og du skal ikke betale noe nå.');
   const back=add('a','Se produkter');back.className='button dark';back.href='/utvalg.html?bruk=alle';document.title='Forespørsel mottatt | Konseptuell';title.focus();window.scrollTo({top:0});
  }catch(error){status.textContent=error.message.replace('Kurven er beholdt','Opplysningene er beholdt');saveDraft();}finally{busy=false;button.disabled=false;main.removeAttribute('aria-busy');}
 });
 for(const field of [form.elements.namedItem('customRequest'),form.elements.namedItem('place')])field.addEventListener('input',()=>field.setCustomValidity(''));
}
