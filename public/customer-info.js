import {customerInformationPages} from './customer-information-content.js?v=content20261107';
import {readInitialCatalog} from './catalog-card-markup.js?v=sitefirst20261106';
import {mountMobileRentalDates} from './mobile-rental-dates.js?v=period20261028e';
import {mountStorageNotice} from './storage-notice.js?v=launch20261024';
mountStorageNotice();
import {configureSiteSettings,getSiteSettings} from './site-settings.js?v=content20261107';
import {getTermsVersions} from './terms-versions.js?v=content20261107';
const initialSettings=readInitialCatalog(document)?.settings;
if(initialSettings)configureSiteSettings(initialSettings);else try{const response=await fetch('/api/site-settings',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(response.ok)configureSiteSettings((await response.json()).settings);}catch{}
import {requiresTwoPeople,rentalDeliveryCapacity} from './delivery-model.js?v=content20261107';
// Shared customer information for purchase, rental and information pages.
export const rentalTermsVersion=getTermsVersions().rental;
export const termsVersion=getTermsVersions().purchase;
const purchaseTermsAcceptance=(inRentalCart=false)=>`<label class="check-label customer-acceptance"${inRentalCart?' id="purchaseTermsLabel" hidden style="display:none!important"':''}><input required ${inRentalCart?'disabled id="purchaseTermsAccepted" ':''}type="checkbox" name="termsAccepted" value="${termsVersion}"><span>Jeg har lest og godtar <a href="/kundeinfo.html#kjopsvilkar" target="_blank" rel="noopener">kjøpsvilkårene</a>. Kjøpsforespørselen er uforpliktende frem til jeg godkjenner ordrebekreftelsen.</span></label>`;
const pages=customerInformationPages();
const legal=document.getElementById('customerInfo');
if(legal&&!document.querySelector('main>.customer-links a[href="#leiebetingelser"]'))document.querySelector('main>.customer-links')?.insertAdjacentHTML('afterbegin','<a href="#leiebetingelser">Leiebetingelser</a>');
if(legal){const render=()=>{const key=location.hash.slice(1)||'kjopsvilkar',page=pages[key]||pages.kjopsvilkar;document.title=page[0]+' · Konseptuell';if(legal.dataset.page!==key){legal.innerHTML='<h1>'+page[0]+'</h1>'+page[1];legal.dataset.page=key;}};render();addEventListener('hashchange',()=>{render();scrollTo({top:0,left:0,behavior:'instant'});});}
const footer=document.querySelector('footer');
if(footer){const links=document.createElement('nav');links.className='customer-links';links.setAttribute('aria-label','Vilkår og personvern');links.innerHTML='<a href="/kundeinfo.html#leiebetingelser">Leiebetingelser</a><a href="/kundeinfo.html#kjopsvilkar">Kjøpsvilkår</a><a href="/kundeinfo.html#personvern">Personvern</a><a href="/kundeinfo.html#informasjonskapsler">Informasjonskapsler</a>';footer.append(links);}
function completeAddress(form){return ['address','postalCode','postalCity'].map(name=>form.querySelector('[name="'+name+'"]')?.value.trim()||'').filter(Boolean).join(', ');}
function mountAddressFields(form){
 const address=form.querySelector('[name="address"]'),choice=form.querySelector('[name="shipping"], [name="delivery"]');
 address.closest('label').firstChild.textContent='Gateadresse og husnummer *';address.autocomplete='address-line1';address.maxLength=200;
 address.closest('label').insertAdjacentHTML('afterend','<div class="two"><label>Postnummer *<input required name="postalCode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" title="Oppgi et norsk postnummer med fire siffer"></label><label>Poststed *<input required name="postalCity" autocomplete="address-level2" maxlength="100"></label></div>');
 choice.closest('label').before(address.closest('label'),form.querySelector('[name="postalCode"]').closest('.two'));
 const fields=['address','postalCode','postalCity'].map(name=>form.querySelector('[name="'+name+'"]'));
 for(const input of fields)input.required=true;
 address.closest('label').insertAdjacentHTML('beforebegin','<p class="hint">Adressen brukes som fakturainformasjon og kreves også ved egen henting.</p>');
 // Preserve the complete address in existing enquiry/order exports.
 form.addEventListener('formdata',event=>{event.formData.set('address',completeAddress(form));event.formData.delete('postalCode');event.formData.delete('postalCity');});
}
const saleForm=document.getElementById('saleRequestForm');
if(saleForm){const address=saleForm.querySelector('[name="address"]');address.closest('label').insertAdjacentHTML('beforebegin','<label>Levering eller henting *<select required name="shipping" aria-describedby="shippingHelp"><option value="">Velg leveringsmåte</option><option value="Ønsker levering">Ønsker levering</option><option value="Henter selv etter avtale">Henter selv etter avtale</option></select></label><p id="shippingHelp" class="hint">Fraktpris og eventuell montering bekreftes før du godkjenner ordrebekreftelsen. Hentested og tidspunkt avtales med oss.</p>');saleForm.querySelector('#saleExport').insertAdjacentHTML('beforebegin',`${purchaseTermsAcceptance()}<p class="hint">Les om behandling av opplysninger i <a href="/kundeinfo.html#personvern" target="_blank" rel="noopener">personvernerklæringen</a>.</p>`);}
if(saleForm)mountAddressFields(saleForm);
const rentalForm=document.getElementById('requestForm');
if(rentalForm){rentalForm.querySelector('[type="submit"]').insertAdjacentHTML('beforebegin',`<label class="check-label customer-acceptance" id="rentalTermsLabel"><input required type="checkbox" id="rentalTermsAccepted" name="rentalTermsAccepted" value="${rentalTermsVersion}"><span>Jeg har lest <a href="/kundeinfo.html#leiebetingelser" target="_blank" rel="noopener">leiebetingelsene</a> og er kjent med at de gjelder dersom jeg senere inngår en leieavtale. Innsending av forespørselen er uforpliktende.</span></label>${purchaseTermsAcceptance(true)}<p class="hint" id="rentalPaymentNote"><span data-payment-copy>Leieperioden forhåndsbetales via Vipps. Du kan hente på lageret i Segelckes vei 15, 2010 Strømmen, eller avtale transport.</span> Les <a href="/kundeinfo.html#personvern" target="_blank" rel="noopener">personvernerklæringen</a>.</p>`);mountRentalDelivery(rentalForm);}

// Route results stay in memory; only Konseptuell's own price is included in exports.
var deliveryQuote=null,deliverySelection={basket:{},products:[]};
// Assigned during mounting above; do not reset the provider after the mount.
var deliverySummaryProvider;
export function rentalDeliverySummary(){return deliverySummaryProvider?.()||{total:null,included:false,label:'Transport avklares i tilbudet'};}
export function rentalDeliveryReceipt(){return deliveryQuote?.receipt||'';}
export function rentalDeliveryExport(){
 if(document.querySelector('#requestForm [name="delivery"]:checked')?.value==='Henter og returnerer selv')return [deliverySelection?.acquisition==='purchase'?'Frakt: 0 kr – egen henting etter avtale på Segelckes vei 15, 2010 Strømmen.':'Frakt: 0 kr – egen henting og retur på Segelckes vei 15, 2010 Strømmen.'];
 if(deliveryQuote?.included)return ['Levering og henting inkludert i fastprisen.'];
 if(!deliveryQuote||deliveryQuote.manual)return ['Frakt: Avklares i tilbudet.'];
 return [`Veiledende frakt inkl. mva.: ${deliveryQuote.total} kr. Endelig frakt bekreftes i tilbudet.`];
}
function mountRentalDelivery(form){
 const select=form.querySelector('[name="delivery"]'),address=form.querySelector('[name="address"]');
 const choices=[['Henter og returnerer selv','Jeg henter og returnerer selv',0],['Ønsker levering og henting','Levering og henting etter leieperioden',2],['Kun levering – jeg returnerer selv','Kun levering – jeg returnerer selv',1],['Kun henting – jeg henter selv','Jeg henter selv – dere henter ved leieslutt',1],['Avklares senere','Transport avklares i tilbudet',null]];
 select.innerHTML=choices.map(([value,label])=>'<option>'+value+'</option>').join('');mountAddressFields(form);
 const group=document.createElement('fieldset');group.className='rental-options';group.innerHTML='<legend>Levering eller henting *</legend><div class="addon-choices">'+choices.map(([value,label,visits],i)=>'<label class="addon-choice"><input type="radio" name="delivery" value="'+value+'" '+(i===0?'checked':'')+'><span style="flex:1">'+label+'</span><strong data-delivery-price="'+i+'" style="white-space:nowrap;font-size:12px">'+(visits===0?'0 kr':visits===null?'Avklares':'Adresse kreves')+'</strong></label>').join('')+'</div><p class="hint">Prisene inkluderer mva.</p><div role="status" aria-live="polite"></div>';
 select.closest('label').replaceWith(group);
 const addressNotice=document.createElement('p');addressNotice.className='hint';addressNotice.textContent='Komplett adresse brukes automatisk til fraktberegning via Google Maps.';addressNotice.id='rentalAddressPrivacy';address.setAttribute('aria-describedby',addressNotice.id);address.closest('label').after(addressNotice);
 const result=group.querySelector('[role="status"]'),dialog=form.closest('dialog');let enabled=false,revision=0,timer,controller,offer=null,pendingKey='',wasLocked=false,previousChoice=choices[0][0],retryAfter=0;
 // Autofill can update the whole address while the customer is still editing their name.
 const contactNames=new Set(['name','email','phone','company','address','postalCode','postalCity']);
 const editingContact=()=>matchMedia('(max-width:640px)').matches&&form.contains(document.activeElement)&&contactNames.has(document.activeElement.name);
 let deferredDelivery=false;
 const selected=()=>choices.find(([value])=>value===group.querySelector('[name="delivery"]:checked')?.value)||choices[0];
 const addressKey=()=>completeAddress(form).normalize('NFKC').trim().toLocaleLowerCase('nb-NO').replace(/[\s,]+/g,' ');
 const ready=()=>address.value.trim().length>=3&&/^[0-9]{4}$/.test(form.querySelector('[name="postalCode"]').value)&&form.querySelector('[name="postalCity"]').value.trim().length>=2;
 const money=n=>new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:0}).format(n);
 const purchaseOnly=()=>deliverySelection?.acquisition==='purchase';
 const capacity=()=>rentalDeliveryCapacity(deliverySelection?.basket||{},deliverySelection?.products||[],deliverySelection?.customRequest===true);
 const updated=()=>document.dispatchEvent?.(new Event('rental-delivery-updated'));
 deliverySummaryProvider=()=>{
  const load=capacity(),choice=selected(),unknown=label=>({total:null,included:false,label});
  // Mirror the effective choice even when mobile contact editing defers DOM updates.
  if(purchaseOnly())return choice[0]===choices[2][0]?unknown('Ønsker levering'):{total:0,included:false,label:'Henter selv etter avtale'};
  if(load.includedOnly)return {total:0,included:true,label:'Levering og henting inkludert i fastprisen'};
  if(load.manual)return unknown('Transport avklares i tilbudet');
  const currentChoice=wasLocked?(choices.find(([value])=>value===previousChoice)||choices[0]):choice;
  if(currentChoice[2]===0)return {total:0,included:false,label:currentChoice[1]};
  if(currentChoice[2]===null)return unknown(currentChoice[1]);
  if(!ready()||offer?.key!==addressKey()||!(offer.until>Date.now())||offer.manual)return unknown(currentChoice[1]);
  const crew=requiresTwoPeople(deliverySelection?.basket||{},deliverySelection?.products||[])?'twoPeople':'onePerson',rate=offer.prices?.[crew],total=rate*currentChoice[2];
  return Number.isFinite(rate)&&rate>=0&&Number.isFinite(total)?{total,included:false,label:currentChoice[1]}:unknown(currentChoice[1]);
 };
 const render=()=>{
  try{
  if(editingContact()){deferredDelivery=true;return;}
  deferredDelivery=false;
  const load=capacity();
  let includedNote=group.querySelector('.rental-included-note');if(!includedNote){includedNote=document.createElement('p');includedNote.className='hint rental-included-note';group.querySelector('legend').after(includedNote);}includedNote.textContent=Object.keys(deliverySelection?.basket||{}).some(id=>deliverySelection.products.find(p=>p.id===id)?.deliveryIncluded)&&!load.includedOnly?'Varer og tjenester merket med inkludert transport leveres og hentes uten ekstra frakt. Transportvalget og eventuell fraktpris nedenfor gjelder bare øvrige produkter.':'';includedNote.hidden=!includedNote.textContent;
  if(purchaseOnly()){
   const choice=selected()[0];if(![choices[0][0],choices[2][0]].includes(choice))group.querySelector('[name=delivery]').checked=true;
   for(const [i,[value]] of choices.entries()){const radio=group.querySelectorAll('[name=delivery]')[i],label=radio.closest('label'),visible=i===0||i===2;radio.disabled=!visible;label.hidden=!visible;label.style.display=visible?'':'none';label.querySelector('span').textContent=i===0?'Henter selv etter avtale':i===2?'Ønsker levering':choices[i][1];group.querySelector('[data-delivery-price="'+i+'"]').textContent=i===0?'0 kr':'Avklares';}
   wasLocked=false;deliveryQuote=selected()[2]===0?null:{manual:true};includedNote.hidden=true;addressNotice.hidden=true;result.textContent='Leveringsdato og eventuell fraktpris bekreftes i ordrebekreftelsen.';return;
  }
  for(const [i,choice] of choices.entries()){const radio=group.querySelectorAll('[name=delivery]')[i];radio.disabled=false;radio.closest('label').querySelector('span').textContent=choice[1];}
  if(load.includedOnly){for(const radio of group.querySelectorAll('[name=delivery]')){radio.checked=radio.value==='Ønsker levering og henting';radio.closest('label').hidden=!radio.checked;radio.closest('label').style.display=radio.checked?'':'none';}group.querySelector('[data-delivery-price="1"]').textContent='Inkludert';deliveryQuote={manual:false,total:0,included:true};addressNotice.hidden=true;result.textContent='Levering og henting er inkludert i prisen.';return;}
  if(load.manual&&!wasLocked)previousChoice=selected()[0];
  for(const radio of group.querySelectorAll('[name="delivery"]')){
   if(load.manual)radio.checked=radio.value==='Avklares senere';
   else if(wasLocked)radio.checked=radio.value===previousChoice;
   radio.disabled=load.manual&&radio.value!=='Avklares senere';radio.closest('label').hidden=radio.disabled;radio.closest('label').style.display=radio.disabled?'none':'';
  }
  wasLocked=load.manual;
  for(const name of ['address','postalCode','postalCity'])form.querySelector('[name="'+name+'"]').required=true;
  const current=offer?.key===addressKey()&&offer.until>Date.now()?offer:null,crew=requiresTwoPeople(deliverySelection?.basket||{},deliverySelection?.products||[])?2:1;
  for(const [i,choice] of choices.entries())group.querySelector('[data-delivery-price="'+i+'"]').textContent=choice[2]===0?'0 kr':choice[2]===null?'Avklares':load.manual?'Avklares':current&&!current.manual?money(current.prices[crew===2?'twoPeople':'onePerson']*choice[2]):current?.manual?'Avklares':ready()?'Avklares':'Adresse kreves';
  const choice=selected();deliveryQuote=choice[2]>0&&load.manual?{manual:true,reason:load.reason}:choice[2]>0&&current?{manual:current.manual,receipt:current.receipt,total:current.manual?undefined:current.prices[crew===2?'twoPeople':'onePerson']*choice[2]}:null;
  addressNotice.hidden=load.manual;
  if(load.manual){result.textContent=load.reason==='custom'?'Ved tilpasset forespørsel avklares transport og pris i tilbudet.':load.reason==='capacity'?'Forespørselen krever utvidet transport. Frakt med ekstern transportør prises i tilbudet.':'Transportpris bekreftes i tilbudet.';return;}
  if(!ready()){result.textContent='Fyll inn komplett adresse for transportpris. Egen henting og retur er gratis.';return;}
  if(current){result.innerHTML=(current.manual?'Transport over '+getSiteSettings().delivery.maxMinutes+' minutter fra lageret avtales særskilt. ':'')+'<span translate="no" style="font:400 13px sans-serif;color:#1f1f1f;white-space:nowrap">Google Maps</span> · <a href="/kundeinfo.html#personvern" target="_blank" rel="noopener">Personvern</a>';return;}
  result.textContent=pendingKey===addressKey()?'Beregner transportpris …':'Transportpris avklares i tilbudet.';
  }finally{updated();}
 };
 const schedule=()=>{
  clearTimeout(timer);
  if(editingContact()){deferredDelivery=true;updated();return;}const key=addressKey();if(offer?.key!==key)offer=null;
  if(pendingKey&&pendingKey!==key){revision++;controller?.abort();pendingKey='';}
  if(purchaseOnly()||capacity().includedOnly||capacity().manual||!Object.keys(deliverySelection?.basket||{}).length){if(pendingKey){revision++;controller?.abort();pendingKey='';}render();return;}
  render();if(!enabled||!ready()||!dialog?.open||Date.now()<retryAfter||(offer?.key===key&&offer.until>Date.now())||pendingKey===key)return;
  result.textContent='Beregner transportpris …';timer=setTimeout(calculate,1800);
 };
 async function calculate(){
  if(purchaseOnly()||!enabled||!ready()||!dialog?.open||capacity().includedOnly||capacity().manual||!Object.keys(deliverySelection?.basket||{}).length||Date.now()<retryAfter)return;const key=addressKey(),current=++revision;pendingKey=key;controller=new AbortController();render();
  try{const response=await fetch('/api/delivery-estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address:completeAddress(form),visits:1,basket:deliverySelection.basket,customRequest:deliverySelection.customRequest===true}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});const quote=await response.json();if(current!==revision)return;if(!response.ok){retryAfter=Date.now()+(response.status===429?60000:30000);throw Error(quote.error||'Transportpris avklares i tilbudet.');}
   if(!quote.manual&&(!Number.isFinite(quote.prices?.onePerson)||!Number.isFinite(quote.prices?.twoPeople)))throw Error('Transportpris avklares i tilbudet.');
   offer={key,until:Date.now()+300000,manual:quote.manual,prices:quote.prices,receipt:quote.receipt};pendingKey='';render();
  }catch(error){if(current!==revision||error.name==='AbortError')return;pendingKey='';offer=null;retryAfter=Math.max(retryAfter,Date.now()+30000);render();result.textContent=error.name==='TimeoutError'?'Fraktberegningen tok for lang tid. Frakt avklares i tilbudet.':error.message||'Transportpris avklares i tilbudet.';}
 }
 form.addEventListener('focusout',()=>{if(deferredDelivery)requestAnimationFrame(()=>{if(!editingContact())schedule();});});
 document.addEventListener('rental-delivery-selection',event=>{deliverySelection=event.detail;schedule();});
 form.addEventListener('input',event=>{if(['address','postalCode','postalCity'].includes(event.target.name))schedule();});form.addEventListener('change',event=>{if(['delivery','address','postalCode','postalCity'].includes(event.target.name))schedule();});
 dialog?.addEventListener('close',()=>{clearTimeout(timer);controller?.abort();revision++;pendingKey='';deliveryQuote=null;updated();});if(dialog)new MutationObserver(()=>{if(dialog.open)schedule();}).observe(dialog,{attributes:true,attributeFilter:['open']});
 render();fetch('/api/delivery-estimate',{signal:AbortSignal.timeout(8000)}).then(r=>r.ok?r.json():null).then(data=>{enabled=data?.enabled===true;schedule();}).catch(()=>render());
}

// Scoped to enquiry drawers: Safari must not zoom when editing contact fields.
if(rentalForm||saleForm){
 const style=document.createElement('style');style.textContent='@media(max-width:640px){#cart input:not([type=checkbox]):not([type=radio]),#cart select,#cart textarea,#saleCart input:not([type=checkbox]):not([type=radio]),#saleCart select,#saleCart textarea{font-size:16px}#cart,#saleCart{overflow-anchor:none;scroll-behavior:auto}}';document.head.append(style);
 for(const form of [rentalForm,saleForm].filter(Boolean)){
  const dialog=form.closest('dialog');
  // Safari may pan an overflow dialog to an autofilled address below the active name field.
  // Only repair an off-screen active field after editing/keyboard resize, never during ordinary scrolling.
  const keepContactVisible=()=>{
   const field=document.activeElement;if(!dialog?.open||!matchMedia('(max-width:640px)').matches||!form.contains(field)||!['name','email','phone','company','address','postalCode','postalCity'].includes(field.name))return;
   const box=field.getBoundingClientRect(),frame=dialog.getBoundingClientRect(),view=window.visualViewport,top=Math.max(frame.top,view?.offsetTop||0)+16,bottom=Math.min(frame.bottom,(view?.offsetTop||0)+(view?.height||innerHeight))-16;
   if(box.top<top)dialog.scrollTop+=box.top-top;else if(box.bottom>bottom)dialog.scrollTop+=box.bottom-bottom;
  };
  let focusRepair;const afterContactEdit=event=>{if(!['name','email','phone','company','address','postalCode','postalCity'].includes(event.target.name))return;requestAnimationFrame(keepContactVisible);clearTimeout(focusRepair);focusRepair=setTimeout(keepContactVisible,250);};
  form.addEventListener('input',afterContactEdit);form.addEventListener('change',afterContactEdit);window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(keepContactVisible));
  dialog?.addEventListener('close',()=>clearTimeout(focusRepair));dialog?.addEventListener('touchmove',()=>clearTimeout(focusRepair),{passive:true});dialog?.addEventListener('wheel',()=>clearTimeout(focusRepair),{passive:true});
  const fields=[...form.querySelectorAll('input,select,textarea')].filter(field=>!['hidden','checkbox','radio'].includes(field.type));
  for(const field of fields)if(field.tagName==='INPUT'&&!['date','number'].includes(field.type))field.enterKeyHint='next';
  form.addEventListener('keydown',event=>{
   if(event.key!=='Enter'||event.isComposing||['start','end'].includes(event.target.id)||!matchMedia('(max-width:640px)').matches||event.target.tagName!=='INPUT'||['date','number','checkbox','radio'].includes(event.target.type))return;
   const next=fields.slice(fields.indexOf(event.target)+1).find(field=>!field.disabled&&field.getClientRects().length);
   if(next){event.preventDefault();next.focus();}
  });
 }
 if(rentalForm)mountMobileRentalDates(rentalForm);
}

// Keep ordinary cart rows readable beside their fixed image field on phones.
if(rentalForm||saleForm){const style=document.createElement('style');style.textContent='@media(max-width:640px){#cart .cart-item:not(.cart-sofa-row):not(.cart-addon){display:grid;grid-template-columns:var(--cart-image-size) minmax(0,1fr);align-items:start;column-gap:var(--cart-image-gap);row-gap:8px}#cart .cart-item:not(.cart-sofa-row):not(.cart-addon)>.thumb{grid-column:1;grid-row:1 / span 2}#cart .cart-item:not(.cart-sofa-row):not(.cart-addon)>.item-copy{grid-column:2;grid-row:1}#cart .cart-item:not(.cart-sofa-row):not(.cart-addon)>.quantity{grid-column:2;grid-row:2;justify-self:start}}';document.head.append(style);}

// Package rows must allocate the same width as the shared thumbnail component.
if(rentalForm){const style=document.createElement('style');style.textContent='#cart .package-cart-line{grid-template-columns:var(--cart-image-size) minmax(0,1fr) auto;column-gap:var(--cart-image-gap);align-items:start}#cart .package-cart-copy{min-width:0;overflow-wrap:anywhere}#cart .package-cart-line>.cart-thumbnail{grid-column:1;grid-row:1}#cart .package-cart-line>.package-cart-copy{grid-column:2;grid-row:1}#cart .package-cart-line>.quantity{grid-column:3;grid-row:1}#cart .package-cart-addon>.cart-thumbnail{display:none}#cart .package-cart-addon{grid-template-columns:minmax(0,1fr) auto}#cart .package-cart-addon>.package-cart-copy{grid-column:1}#cart .package-cart-addon>.quantity{grid-column:2}@media(max-width:640px){#cart .package-cart-line{grid-template-columns:var(--cart-image-size) minmax(0,1fr);row-gap:10px}#cart .package-cart-line>.cart-thumbnail{grid-row:1 / span 2}#cart .package-cart-line>.quantity{grid-column:2;grid-row:2;justify-self:start;margin-top:0}#cart .package-cart-addon{grid-template-columns:minmax(0,1fr)}#cart .package-cart-addon>.package-cart-copy,#cart .package-cart-addon>.quantity{grid-column:1}#cart .package-cart-copy h4{overflow-wrap:anywhere}}';document.head.append(style);}
