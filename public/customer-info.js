import {customerTransportPlan} from './customer-transport-plan.js?v=transportaudit20261122';
import {weekendRentalEnd,weekendDayDeliveryRequired,weekendCollectionRequired,weekendPeriodDeliveryRequired} from './weekend-rental.js?v=weekendboth20261122';
import {informationBoxMarkup} from './information-box.js?v=transportnote20261122';
import {plannedTransportDates,transportWeekdayPolicy,transportDateLimits,transportDateError} from './transport-weekdays.js?v=transportgroup20261122';
import {scopeForOccasion} from './rental-pricing-model.js?v=fest20261114';
import {customerFooterLinksMarkup} from './footer-links-markup.js?v=loadstable20261119';
import {priceMarkup} from './price-display-model.js?v=vatdefault20261116';
import {customerInformationPages} from './customer-information-content.js?v=focusstable20261122';
import {readInitialCatalog} from './catalog-card-markup.js?v=choicesfirst20261119';
import {mountMobileRentalDates} from './mobile-rental-dates.js?v=enquiryoverview20261122';
import {mountStorageNotice} from './storage-notice.js?v=launch20261024';
mountStorageNotice();
import {configureSiteSettings,getSiteSettings} from './site-settings.js?v=fest20261114';
import {getTermsVersions} from './terms-versions.js?v=purposemodal20261122';
const initialSettings=readInitialCatalog(document)?.settings;
if(initialSettings)configureSiteSettings(initialSettings);else try{const response=await fetch('/api/site-settings',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(response.ok)configureSiteSettings((await response.json()).settings);}catch{}
import {requiresTwoPeople,rentalDeliveryCapacity} from './delivery-model.js?v=fest20261114';
// Shared customer information for purchase, rental and information pages.
export const rentalTermsVersion=getTermsVersions().rental;
export const termsVersion=getTermsVersions().purchase;
const purchaseTermsAcceptance=(inRentalCart=false)=>`<label class="check-label customer-acceptance"${inRentalCart?' id="purchaseTermsLabel" hidden style="display:none!important"':''}><input required ${inRentalCart?'disabled id="purchaseTermsAccepted" ':''}type="checkbox" name="termsAccepted" value="${termsVersion}"><span>Jeg har lest og godtar <a href="/kundeinfo.html#kjopsvilkar" target="_blank" rel="noopener">kjøpsvilkårene</a>. Kjøpsforespørselen er uforpliktende frem til jeg godkjenner ordrebekreftelsen.</span></label>`;
const pages=customerInformationPages();
const legal=document.getElementById('customerInfo');
if(legal&&!document.querySelector('main>.customer-links a[href="#leiebetingelser"]'))document.querySelector('main>.customer-links')?.insertAdjacentHTML('afterbegin','<a href="#leiebetingelser">Leiebetingelser</a>');
if(legal){const render=()=>{const key=location.hash.slice(1)||'kjopsvilkar',page=pages[key]||pages.kjopsvilkar;document.title=page[0]+' · Konseptuell';if(legal.dataset.page!==key){legal.innerHTML='<h1>'+page[0]+'</h1>'+page[1];legal.dataset.page=key;}};render();addEventListener('hashchange',()=>{render();scrollTo({top:0,left:0,behavior:'instant'});});}
const footer=document.querySelector('footer');
if(footer&&!footer.querySelector(':scope > .customer-links'))footer.insertAdjacentHTML('beforeend',customerFooterLinksMarkup);
function completeAddress(form){return ['address','postalCode','postalCity'].map(name=>form.querySelector('[name="'+name+'"]')?.value.trim()||'').filter(Boolean).join(', ');}
function mountAddressFields(form){
 const address=form.querySelector('[name="address"]'),choice=form.querySelector('[name="shipping"], [name="delivery"]');
 address.closest('label').firstChild.textContent='Gateadresse og husnummer *';address.autocomplete='address-line1';address.maxLength=200;
 address.closest('label').insertAdjacentHTML('afterend','<div class="two"><label>Postnummer *<input required name="postalCode" autocomplete="postal-code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" title="Oppgi et norsk postnummer med fire siffer"></label><label>Poststed *<input required name="postalCity" autocomplete="address-level2" maxlength="100"></label></div>');
 choice.closest('label').before(address.closest('label'),form.querySelector('[name="postalCode"]').closest('.two'));
 const fields=['address','postalCode','postalCity'].map(name=>form.querySelector('[name="'+name+'"]'));
 for(const input of fields)input.required=true;
 address.closest('label').insertAdjacentHTML('beforebegin','<p class="hint">Adressen brukes som fakturainformasjon og kreves også ved egen henting.</p>');
 if(form.id==='requestForm'){
  const alternatives=document.createElement('div');
  alternatives.innerHTML=['delivery','pickup'].map(leg=>{
   const title=leg==='delivery'?'leveringsadresse':'henteadresse';
   return '<label class="check-label"><input name="'+leg+'Override" type="checkbox"> Bruk en annen '+title+' enn fakturaadressen</label><label hidden>'+title[0].toUpperCase()+title.slice(1)+' (gateadresse, postnummer og poststed)<input disabled name="'+leg+'Address" maxlength="300" placeholder="Eksempelgata 1, 0123 Oslo"></label>';
  }).join('');
  choice.closest('label').before(alternatives);
 }
 // Preserve the complete address in existing enquiry/order exports.
 form.addEventListener('formdata',event=>{event.formData.set('address',completeAddress(form));event.formData.delete('postalCode');event.formData.delete('postalCity');});
}
const saleForm=document.getElementById('saleRequestForm');
if(saleForm){const address=saleForm.querySelector('[name="address"]');address.closest('label').insertAdjacentHTML('beforebegin','<label>Levering eller henting *<select required name="shipping" aria-describedby="shippingHelp"><option value="">Velg leveringsmåte</option><option value="Ønsker levering">Ønsker levering</option><option value="Henter selv etter avtale">Henter selv etter avtale</option></select></label><p id="shippingHelp" class="hint">Fraktpris og eventuell montering bekreftes før du godkjenner ordrebekreftelsen. Hentested og tidspunkt avtales med oss.</p>');saleForm.querySelector('#saleExport').insertAdjacentHTML('beforebegin',`${purchaseTermsAcceptance()}<p class="hint">Les om behandling av opplysninger i <a href="/kundeinfo.html#personvern" target="_blank" rel="noopener">personvernerklæringen</a>.</p>`);}
if(saleForm)mountAddressFields(saleForm);
const rentalForm=document.getElementById('requestForm');
if(rentalForm){rentalForm.querySelector('[type="submit"]').insertAdjacentHTML('beforebegin',`<label class="check-label customer-acceptance" id="rentalTermsLabel"><input required type="checkbox" id="rentalTermsAccepted" name="rentalTermsAccepted" value="${rentalTermsVersion}"><span>Jeg har lest <a href="/kundeinfo.html#leiebetingelser" target="_blank" rel="noopener">leiebetingelsene</a> og er kjent med at de gjelder dersom jeg senere inngår en leieavtale. Innsending av forespørselen er uforpliktende.</span></label>${purchaseTermsAcceptance(true)}<p class="hint" id="rentalPaymentNote"><span data-payment-copy>Leieperioden forhåndsbetales via Vipps. Bedrifter kan be om faktura etter avtale. Du kan hente på lageret i Segelckes vei 15, 2010 Strømmen, eller avtale transport.</span> Les <a href="/kundeinfo.html#personvern" target="_blank" rel="noopener">personvernerklæringen</a>.</p>`);mountRentalDelivery(rentalForm);}

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
 const choices=[
  ['Henter og returnerer selv','Jeg henter og returnerer selv',0,'Du henter og returnerer møblene på lageret vårt.'],
  ['Ønsker levering og henting','Levering og henting',2,'Vi leverer møblene og henter dem hos deg ved leieslutt.'],
  ['Kun levering – jeg returnerer selv','Kun levering',1,'Vi leverer møblene hos deg. Du returnerer dem på lageret.'],
  ['Kun henting – jeg henter selv','Vi henter ved leieslutt',1,'Du henter på lageret. Vi henter møblene hos deg ved leieslutt.'],
  ['Avklares senere','Transport avklares i tilbudet',null,'Vi avklarer transportløsning og pris i tilbudet.'],
 ];
 const routeCredit='<small class="route-credit">Kjøretid beregnet med <span translate="no">Google Maps</span></small>';
 const caption=(title,description='',hasRoute=false)=>
  '<span class="transport-choice-name">'+title+'</span>'+
  (description?'<span class="transport-choice-description">'+description+'</span>':'')+
  (hasRoute?routeCredit:'');
 select.innerHTML=choices.map(([value])=>'<option>'+value+'</option>').join('');mountAddressFields(form);
 const group=document.createElement('fieldset');
 group.className='rental-options';
 group.innerHTML='<legend>Levering eller henting *</legend><div class="addon-choices">'+choices.map(([value,title,visits,description],i)=>
  '<div class="rental-delivery-choice"><label class="addon-choice"><input type="radio" name="delivery" value="'+value+'" '+(i===0?'checked':'')+'>'+
  '<span class="transport-choice-copy">'+caption(title,description)+'</span>'+
  '<strong data-delivery-price="'+i+'">'+(visits===0?'0 kr':visits===null?'Avklares':'Adresse kreves')+'</strong></label></div>'
 ).join('')+'</div><p class="hint">Prisene inkluderer mva.</p><div role="status" aria-live="polite"></div>';
 select.closest('label').replaceWith(group);
 const transportFields=document.createElement('div');transportFields.className='rental-transport-dates';transportFields.innerHTML='<label><span data-transport-label="deliveryDate">Ønsket leveringsdato</span><strong data-transport-value="deliveryDate"></strong><input hidden type="date" name="deliveryDate"></label><label><span data-transport-label="pickupDate">Ønsket hentedato</span><strong data-transport-value="pickupDate"></strong><input hidden type="date" name="pickupDate"></label>';group.append(transportFields);
 const pickupTimeNote=document.createElement('p');pickupTimeNote.className='hint';pickupTimeNote.textContent='Tidspunkt for uthenting på lageret avtales i tilbudet.';pickupTimeNote.hidden=true;transportFields.after(pickupTimeNote);
 const weekdayNotice=document.createElement('section');weekdayNotice.className='transport-note';weekdayNotice.hidden=true;transportFields.after(weekdayNotice);
 const transportInput=name=>transportFields.querySelector('[name="'+name+'"]');let previousTransportDefaults={},previousTransportMode;
 const transportMode=(value=selected()[0])=>({'Henter og returnerer selv':'pickup','Kun levering – jeg returnerer selv':'deliveryOnly','Kun henting – jeg henter selv':'collectionOnly','Avklares senere':'undecided'})[value]||'delivery';
 const dateOptions=(mode=transportMode())=>({start:form.elements.namedItem('start')?.value||'',end:form.elements.namedItem('end')?.value||'',scope:scopeForOccasion(form.elements.namedItem('occasion')?.value||''),mode});
 const transportPolicy=(mode=transportMode())=>{const options=dateOptions(mode);for(const key of ['deliveryDate','pickupDate']){const value=transportInput(key).value;if(value&&value!==previousTransportDefaults[key])options[key]=value;}return transportWeekdayPolicy(options);};
 // A route tariff is shared by the paid alternatives, but only weekday visits qualify.
 const routeOptions=()=>{const plan=customerTransportPlan(dateOptions());for(const mode of plan.allowedModes){if(!['delivery','deliveryOnly','collectionOnly'].includes(mode))continue;const policy=transportPolicy(mode);if(!policy.manual)return {...dateOptions(mode),deliveryDate:policy.deliveryDate,pickupDate:policy.pickupDate};}return null;};
 let previousDayChoice=null;
 const syncWeekendChoice=()=>{if(purchaseOnly()||capacity().includedOnly)return false;const plan=customerTransportPlan(dateOptions());const restricted=plan.deliveryRequired||plan.collectionRequired;if(restricted){if(previousDayChoice===null)previousDayChoice=selected()[0];if(!plan.allowedModes.includes(transportMode())){const next=plan.allowedModes.includes('collectionOnly')&&transportMode()==='pickup'?'collectionOnly':plan.allowedModes.includes('deliveryOnly')&&transportMode()==='pickup'?'deliveryOnly':'delivery';for(const radio of group.querySelectorAll('[name=delivery]'))radio.checked=transportMode(radio.value)===next;}}else if(previousDayChoice!==null){for(const radio of group.querySelectorAll('[name=delivery]'))radio.checked=radio.value===previousDayChoice;previousDayChoice=null;}return restricted;};
 const weekdayName=new Intl.DateTimeFormat('nb-NO',{weekday:'long',timeZone:'UTC'});
 const transportTimingText=(mode,dates)=>{
  const visits=[];
  if(mode==='delivery'||mode==='deliveryOnly')visits.push(['levering',dates.deliveryDate]);
  if(mode==='delivery'||mode==='collectionOnly')visits.push(['henting',dates.pickupDate]);
  const weekdays=[],weekends=[];
  for(const [visit,value] of visits){
   if(!value)continue;
   const date=new Date(value+'T12:00:00Z');
   const group=[0,6].includes(date.getUTCDay())?weekends:weekdays;
   group.push({visit,day:weekdayName.format(date)});
  }
  const timing=[];
  if(weekdays.length){
   const label=weekdays.map(({visit,day})=>visit+(weekends.length?' '+day:'')).join(' og ');
   timing.push(label[0].toUpperCase()+label.slice(1)+' skjer normalt kl. 08.00–12.00'+(weekends.length?'':' på hverdager')+'.');
  }
  if(weekends.length){
   const label=weekends.map(({visit,day})=>visit+(visits.length>1&&weekends.length===1?' '+day:'')).join(' og ');
   timing.push('Tidspunkt for '+label+' avtales i tilbudet.');
  }
  const warehouseTiming={
   pickup:'Tidspunkt for henting og retur på lageret velger du når du aksepterer tilbudet.',
   collectionOnly:'Tidspunkt for uthenting på lageret velger du når du aksepterer tilbudet.',
   deliveryOnly:'Tidspunkt for retur på lageret velger du når du aksepterer tilbudet.'
  }[mode];
  if(warehouseTiming)timing.push(warehouseTiming);
  if(weekdays.length||warehouseTiming)timing.push('Helligdager og ønskede avvik avtales i tilbudet.');
  return timing.join(' ');
 };
 const weekendTransportText=options=>{
  const price='Transportprisen beregnes individuelt og bekreftes i tilbudet.';
  if(weekendDayDeliveryRequired(options)){
   return 'Éndagsleie i helgen tilbys kun med levering og henting samme dag, utført av oss eller vår transportør. Vi vurderer tilgjengeligheten. '+price;
  }
  if(weekendPeriodDeliveryRequired(options)){
   return 'Leie i helgen tilbys kun med levering og henting utført av oss eller vår transportør. Vi vurderer tilgjengeligheten. '+price;
  }
  if(weekendCollectionRequired(options)){
   const warehouse=options.mode==='collectionOnly'?' Lageret tar kun imot egen retur på hverdager.':'';
   return 'Leieperioden slutter i helgen. Henting hos deg utføres av oss eller vår transportør siste leiedag.'+warehouse+' '+price;
  }
  if(customerTransportPlan(options).deliveryRequired){
   const warehouse=options.mode==='deliveryOnly'?' Egen uthenting på lageret er kun mulig på hverdager.':'';
   return 'Leieperioden starter i helgen. Levering på første leiedag utføres av oss eller vår transportør.'+warehouse+' '+price;
  }
  return 'Du har valgt levering eller henting i helgen. Vi vurderer tilgjengeligheten. '+price;
 };
 const syncTransportDates=()=>{const dayHire=syncWeekendChoice(),mode=transportMode(),selfCollection=mode==='collectionOnly',selfPickup=mode==='pickup',defaults=plannedTransportDates(dateOptions());for(const key of ['deliveryDate','pickupDate']){const field=transportInput(key);const hiddenEndpoint=mode==='pickup'||mode==='collectionOnly'&&key==='deliveryDate'||mode==='deliveryOnly'&&key==='pickupDate';field.value=defaults[key];field.readOnly=true;const value=transportFields.querySelector('[data-transport-value="'+key+'"]');if(value)value.textContent=field.value?new Intl.DateTimeFormat('nb-NO',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(field.value+'T12:00:00Z')):'Avklares i tilbudet';}previousTransportDefaults=defaults;previousTransportMode=mode;const limits=transportDateLimits(dateOptions()),error=transportDateError({...dateOptions(),deliveryDate:transportInput('deliveryDate').value,pickupDate:transportInput('pickupDate').value});for(const key of ['deliveryDate','pickupDate']){const field=transportInput(key);field.min=limits?.[key].min||'';field.max=limits?.[key].max||'';field.setCustomValidity(error);}transportFields.hidden=purchaseOnly()||selected()[2]===null;transportInput('deliveryDate').closest('label').hidden=false;for(const key of ['deliveryDate','pickupDate']){const label=transportFields.querySelector('[data-transport-label="'+key+'"]');if(label)label.textContent=key==='deliveryDate'?((selfCollection||selfPickup)?'Henting på vårt lager':'Levering hos deg'):((selfPickup||mode==='deliveryOnly')?'Retur på vårt lager':'Henting hos deg');}pickupTimeNote.textContent=transportTimingText(mode,defaults);pickupTimeNote.hidden=transportFields.hidden||!pickupTimeNote.textContent;transportInput('pickupDate').closest('label').hidden=false;
  const options=dateOptions();
  const showShift=options.start&&options.end&&options.scope==='standard'&&!transportFields.hidden;
  const startMoved=showShift&&defaults.deliveryDate!==options.start;
  const endMoved=showShift&&defaults.pickupDate!==options.end;
  const minimum=weekendRentalEnd({...options,...defaults})!==options.end;
  weekdayNotice.hidden=!(startMoved||endMoved||minimum);
  if(weekdayNotice.hidden)return;
  if(minimum&&options.scope!=='standard'){
   weekdayNotice.innerHTML=informationBoxMarkup('Helgeleie – minimum to døgn','Når du disponerer møblene fra fredag til mandag, beregnes minimum to døgns leie. Vi tilbyr også éndagsleie i helgen med levering og henting samme dag. Da vurderer vi tilgjengeligheten og beregner transportprisen individuelt i tilbudet.','i');
   return;
  }
  const format=value=>new Intl.DateTimeFormat('nb-NO',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
  const delivery=format(defaults.deliveryDate),pickup=format(defaults.pickupDate);
  let heading,explanation;
  if(selfPickup){
   heading=startMoved?'Henting og retur på hverdager':'Retur på hverdager';
   const visits=[startMoved&&'uthenting '+delivery,endMoved&&'retur '+pickup].filter(Boolean);
   const hours='Henting og retur på lageret skjer på hverdager kl. 08.00–15.45. ';
   explanation=hours+(startMoved?'For leieperioden din foreslår vi derfor '+visits.join(' og ')+'.':'Siden leieperioden slutter i helgen, blir retur '+pickup+'.');
  }else if(mode==='deliveryOnly'){
   heading='Levering og retur på hverdager';
   const reasons=[startMoved&&'Vi leverer mandag til fredag',endMoved&&'lageret tar imot retur på hverdager'].filter(Boolean);
   const reason=reasons.join(', og ');
   const visits=[startMoved&&'levering '+delivery,endMoved&&'egen retur til lageret '+pickup].filter(Boolean);
   explanation=reason[0].toUpperCase()+reason.slice(1)+'. Derfor foreslår vi '+visits.join(' og ')+'.';
  }else if(selfCollection){
   heading=startMoved?'Uthenting og henting på hverdager':'Henting på hverdager';
   const reasons=[startMoved&&'Uthenting på lageret skjer på hverdager',endMoved&&'vi henter mandag til fredag'].filter(Boolean);
   const reason=reasons.join(', og ');
   const visits=[startMoved&&'uthenting på lageret '+delivery,endMoved&&'henting hos deg '+pickup].filter(Boolean);
   explanation=reason[0].toUpperCase()+reason.slice(1)+'. Derfor foreslår vi '+visits.join(' og ')+'.';
  }else{
   heading='Levering og henting på hverdager';
   explanation='Vi leverer og henter mandag til fredag. Derfor foreslår vi levering '+delivery+' og henting '+pickup+'.';
  }
  const cost=minimum
   ?' Siden leiedagen faller i helgen, disponerer du møblene fra fredag til mandag. Det beregnes minimum to døgns leie, uten ekstra leiekostnad for tilpasningen til hverdager.'
   :((startMoved&&endMoved&&mode==='deliveryOnly')?' Disse tilpasningene gir ingen ekstra leiekostnad.':' Denne tilpasningen gir ingen ekstra leiekostnad.')+' Leieprisen beregnes fortsatt for ønsket leieperiode.';
  weekdayNotice.innerHTML=informationBoxMarkup(minimum?'Helgeleie – minimum to døgn':heading,explanation+cost+' Endelig avtale bekreftes i tilbudet.','i');
 };

 const addressNotice=document.createElement('p');addressNotice.className='hint';addressNotice.textContent='Fakturaadressen brukes også til transport med mindre du oppgir en annen adresse. Kjøretiden beregnes med Google Maps.';addressNotice.id='rentalAddressPrivacy';address.setAttribute('aria-describedby',addressNotice.id);address.closest('label').after(addressNotice);
 const result=group.querySelector('[role="status"]'),dialog=form.closest('dialog');let enabled=null,revision=0,timer,controller,pendingKey='',wasLocked=false,previousChoice=choices[0][0],retryAfter=0;
 // Autofill can update the whole address while the customer is still editing their name.
 const contactNames=new Set(['name','email','phone','company','address','postalCode','postalCity']);
 const editingContact=()=>matchMedia('(max-width:640px)').matches&&form.contains(document.activeElement)&&contactNames.has(document.activeElement.name);
 let deferredDelivery=false;
 const selected=()=>choices.find(([value])=>value===group.querySelector('[name="delivery"]:checked')?.value)||choices[0];
 const legs=['delivery','pickup'];
 const fieldFor=name=>form.elements.namedItem(name);
 const choiceLegs=choice=>choice===choices[1]?legs:choice===choices[2]?['delivery']:choice===choices[3]?['pickup']:[];
 const overrideFor=leg=>{
  const active=choiceLegs(selected());
  if(active.includes(leg)&&fieldFor(leg+'Override')?.checked)return leg;
  if(leg==='pickup'&&active.length===2&&fieldFor('deliveryOverride')?.checked)return 'delivery';
  return '';
 };
 const addressFor=leg=>{
  const override=overrideFor(leg);
  return override?fieldFor(override+'Address').value.trim():completeAddress(form);
 };
 const complete=value=>/^.{3,},?\s+[0-9]{4}\b[\s,]+\S.{1,}$/u.test(value);
 const pickupField=fieldFor('pickupAddress');
 let pickupDetails,pickupSummary,pickupEdit,pickupHome;
 if(pickupField){
  pickupHome=pickupField.closest('label').parentElement;
  pickupDetails=document.createElement('div');
  pickupDetails.innerHTML='<span class="hint"></span> <button type="button" class="text-button">Endre henteadresse</button>';
  pickupSummary=pickupDetails.querySelector('span');
  pickupEdit=pickupDetails.querySelector('button');
  pickupEdit.addEventListener('click',()=>{
   const toggle=fieldFor('pickupOverride');
   toggle.checked=!toggle.checked;
   toggle.dispatchEvent(new Event('change',{bubbles:true}));
   if(toggle.checked)pickupField.focus();
  });
  form.addEventListener('formdata',event=>{
   for(const leg of legs){
    if(!purchaseOnly()&&choiceLegs(selected()).includes(leg))event.formData.set(leg+'Address',addressFor(leg));
    else event.formData.delete(leg+'Address');
   }
  });
 }
 const syncAddresses=()=>{
  const activeLegs=purchaseOnly()?[]:choiceLegs(selected());
  const both=activeLegs.length===2;
  if(pickupDetails){
   pickupDetails.hidden=!both;
   const parent=both?pickupDetails:pickupHome,label=pickupField.closest('label');
   if(label.parentElement!==parent)parent.append(label);
   pickupSummary.textContent=both&&complete(addressFor('pickup'))?'Henteadresse: '+addressFor('pickup'):'';
   pickupEdit.textContent=fieldFor('pickupOverride').checked?'Bruk samme adresse som ved levering':'Endre henteadresse';
   pickupEdit.setAttribute('aria-expanded',String(fieldFor('pickupOverride').checked));
  }
  for(const leg of legs){
   const field=fieldFor(leg+'Address');
   if(!field)continue;
   const toggle=fieldFor(leg+'Override'),relevant=activeLegs.includes(leg);
   toggle.closest('label').hidden=!relevant||(leg==='pickup'&&both);
   const editing=relevant&&toggle.checked;
   field.closest('label').hidden=!editing;field.disabled=!editing;field.required=editing;
   field.setCustomValidity(editing&&!complete(field.value.trim())?'Oppgi gateadresse, postnummer og poststed.':'');
  }
 };
 const addressKey=()=>JSON.stringify(legs.map(addressFor));
 const readyFor=leg=>overrideFor(leg)?complete(addressFor(leg)):billingReady();
 const ready=()=>legs.some(readyFor);
 const billingReady=()=>address.value.trim().length>=3&&/^[0-9]{4}$/.test(form.querySelector('[name="postalCode"]').value)&&form.querySelector('[name="postalCity"]').value.trim().length>=2;
 const tariffs=new Map();
 const routeKey=address=>address.normalize('NFKC').trim().toLocaleLowerCase('nb-NO').replace(/[\s,]+/g,' ');
 const cached=address=>{
  const key=routeKey(address),entry=tariffs.get(key);
  if(entry?.until>Date.now())return entry.quote;
  tariffs.delete(key);
  return null;
 };
 const quoteFor=(choice,crew)=>{
  const routes=choiceLegs(choice).map(leg=>readyFor(leg)&&cached(addressFor(leg)));
  if(!routes.length||routes.some(route=>!route))return null;
  if(routes.some(route=>route.manual))return {manual:true};
  const total=routes.reduce((sum,route)=>sum+route.prices[crew],0);
  const receipt=routes.length===1||addressFor(legs[0])===addressFor(legs[1])?routes[0].receipt:JSON.stringify(routes.map(route=>route.receipt));
  return {manual:false,total,receipt};
 };
 const money=n=>new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:0}).format(n);
 const purchaseOnly=()=>deliverySelection?.acquisition==='purchase';
 const capacity=()=>rentalDeliveryCapacity(deliverySelection?.basket||{},deliverySelection?.products||[],deliverySelection?.customRequest===true);
 const updated=()=>document.dispatchEvent?.(new Event('rental-delivery-updated'));
 const preserveChoiceHeight=()=>{const labels=[...group.querySelectorAll('[name=delivery]')].map(radio=>radio.closest('label'));const height=Math.max(0,...labels.filter(label=>!label.hidden&&!String(label.className).includes('has-route-credit')).map(label=>label.getBoundingClientRect?.().height||0));if(height)for(const label of labels)label.style.minHeight=height+'px';};
 const choiceDetails=document.createElement('div');choiceDetails.className='rental-delivery-details';choiceDetails.append(transportFields,weekdayNotice,result,pickupTimeNote);if(pickupDetails)transportFields.after(pickupDetails);let detailsAnchor=null;
 const placeChoiceDetails=()=>{const anchor=group.querySelector('[name="delivery"]:checked')?.closest('label');if(anchor&&anchor!==detailsAnchor){anchor.after(choiceDetails);detailsAnchor=anchor;}};
 deliverySummaryProvider=()=>{
  const load=capacity(),choice=selected(),unknown=label=>({total:null,included:false,label});
  // Mirror the effective choice even when mobile contact editing defers DOM updates.
  if(purchaseOnly())return choice[0]===choices[2][0]?unknown('Ønsker levering'):{total:0,included:false,label:'Henter selv etter avtale'};
  if(load.includedOnly)return {total:0,included:true,label:'Levering og henting inkludert i fastprisen'};
  if(load.manual&&choice[2]>0)return {...unknown('Transport avklares i tilbudet'),status:'manual'};
  const currentChoice=wasLocked?(choices.find(([value])=>value===previousChoice)||choices[0]):choice;
  if(currentChoice[2]===0)return {total:0,included:false,label:currentChoice[1]};
  if(currentChoice[2]===null)return unknown(currentChoice[1]);
  const policy=transportPolicy();
  if(policy.manual)return {...unknown('Transport må beregnes i tilbudet'),status:policy.reason==='dates'?'dates':'manual'};
  const crew=requiresTwoPeople(deliverySelection?.basket||{},deliverySelection?.products||[])?'twoPeople':'onePerson';
  const quote=quoteFor(currentChoice,crew);
  if(Number.isFinite(quote?.total))return {total:quote.total,included:false,label:currentChoice[1]};
  const pending=unknown(currentChoice[1]);
  if(quote?.manual||enabled===false||Date.now()<retryAfter)return {...pending,status:'manual'};
  const missing=choiceLegs(currentChoice).find(leg=>!readyFor(leg));
  if(missing){
   const override=overrideFor(missing);
   const field=override?override+'Address':address.value.trim().length<3?'address':!/^\d{4}$/.test(fieldFor('postalCode').value)?'postalCode':'postalCity';
   return {...pending,status:'address',addressField:field};
  }
  return {...pending,status:'calculating'};
 };
 const render=()=>{
  try{
  syncTransportDates();const load=capacity();
  if(editingContact()&&!choices.some(([value,,visits])=>visits>0&&transportPolicy(transportMode(value)).manual)){deferredDelivery=true;return;}
  deferredDelivery=false;preserveChoiceHeight();result.className='';for(const radio of group.querySelectorAll('[name=delivery]'))radio.closest('label').className='addon-choice';
  let includedNote=group.querySelector('.rental-included-note');if(!includedNote){includedNote=document.createElement('p');includedNote.className='hint rental-included-note';group.querySelector('legend').after(includedNote);}includedNote.textContent=Object.keys(deliverySelection?.basket||{}).some(id=>deliverySelection.products.find(p=>p.id===id)?.deliveryIncluded)&&!load.includedOnly?'Varer og tjenester merket med inkludert transport leveres og hentes uten ekstra frakt. Transportvalget og eventuell fraktpris nedenfor gjelder bare øvrige produkter.':'';includedNote.hidden=!includedNote.textContent;
  if(purchaseOnly()){
   const choice=selected()[0];if(![choices[0][0],choices[2][0]].includes(choice))group.querySelector('[name=delivery]').checked=true;
   for(const [i,[value]] of choices.entries()){const radio=group.querySelectorAll('[name=delivery]')[i],label=radio.closest('label'),visible=i===0||i===2;radio.disabled=!visible;label.hidden=!visible;label.style.display=visible?'':'none';label.querySelector('span').innerHTML=caption(i===0?'Henter selv etter avtale':i===2?'Ønsker levering':choices[i][1]);group.querySelector('[data-delivery-price="'+i+'"]').innerHTML=i===0?'0 kr':'Avklares';}
   wasLocked=false;deliveryQuote=selected()[2]===0?null:{manual:true};includedNote.hidden=true;addressNotice.hidden=true;result.textContent='Leveringsdato og eventuell fraktpris bekreftes i ordrebekreftelsen.';return;
  }
  for(const [i,choice] of choices.entries()){const radio=group.querySelectorAll('[name=delivery]')[i];radio.disabled=false;radio.closest('label').querySelector('span').innerHTML=caption(choice[1],choice[3]);}
  if(load.includedOnly){for(const radio of group.querySelectorAll('[name=delivery]')){radio.checked=radio.value==='Ønsker levering og henting';radio.closest('label').hidden=!radio.checked;radio.closest('label').style.display=radio.checked?'':'none';}syncTransportDates();group.querySelector('[data-delivery-price="1"]').textContent='Inkludert';deliveryQuote={manual:false,total:0,included:true};addressNotice.hidden=true;result.textContent='Levering og henting er inkludert i prisen.';return;}
  wasLocked=false;
  if(!load.includedOnly){const plan=customerTransportPlan(dateOptions());for(const radio of group.querySelectorAll('[name=delivery]')){radio.disabled=!plan.allowedModes.includes(transportMode(radio.value));const label=radio.closest('label');label.hidden=false;label.style.display='';if(radio.disabled)label.className='addon-choice is-unavailable';}}
  for(const name of ['address','postalCode','postalCity'])form.querySelector('[name="'+name+'"]').required=true;
  const crew=requiresTwoPeople(deliverySelection?.basket||{},deliverySelection?.products||[])?'twoPeople':'onePerson';
  for(const [i,choice] of choices.entries()){
   const current=quoteFor(choice,crew);
   group.querySelector('[data-delivery-price="'+i+'"]').innerHTML=choice[2]===0?'0 kr':choice[2]===null?'Avklares':load.manual?'Avklares':transportPolicy(transportMode(choice[0])).manual?'Må beregnes':current&&!current.manual?priceMarkup(current.total):current?.manual?'Må beregnes':choiceLegs(choice).every(readyFor)?(enabled===false||Date.now()<retryAfter?'Avklares i tilbudet':'Beregner …'):'Adresse kreves';
  }
  const choice=selected(),current=quoteFor(choice,crew);
  deliveryQuote=choice[2]>0&&transportPolicy().manual?{manual:true,reason:transportPolicy().reason}:choice[2]>0&&load.manual?{manual:true,reason:load.reason}:current;
  addressNotice.hidden=load.manual;
  if(load.manual&&selected()[2]===0){result.className='transport-note';result.innerHTML=informationBoxMarkup('Selvhenting og retur','Du henter og returnerer selv. Sørg for egnet kjøretøy og tilstrekkelig kapasitet til hele utvalget. Datoer og praktiske forhold bekreftes i tilbudet.','i');return;}
  if(load.manual){result.className='transport-note transport-note-warning';result.innerHTML=informationBoxMarkup('Transportprisen må beregnes',load.reason==='custom'?'Ved tilpasset forespørsel avklares transport og pris i tilbudet.':load.reason==='capacity'?'Forespørselen krever utvidet transport. Frakt med ekstern transportør prises i tilbudet.':'Transportpris bekreftes i tilbudet.');return;}
  if(choice[2]>0&&transportPolicy().manual){
   if(transportPolicy().weekend){
    result.className='transport-note transport-note-warning';
    result.innerHTML=informationBoxMarkup('Transport i helgen prises individuelt',weekendTransportText(dateOptions()));
   }else result.textContent='Velg transportdatoer for å se pris. Fast transportpris gjelder hverdager.';
   return;
  }
  if(choice[2]>0&&current?.manual){result.className='transport-note transport-note-warning';result.innerHTML=informationBoxMarkup('Transportprisen må beregnes','Transport til denne adressen beregnes individuelt og bekreftes i tilbudet.');return;}
  if(!ready()){result.textContent='';return;}
  if(current){result.textContent='';if(choice[2]>0){const radio=group.querySelector('[name="delivery"]:checked'),label=radio.closest('label');label.className='addon-choice has-route-credit';label.querySelector('span').innerHTML=caption(choice[1],choice[3],true);}return;}
  result.textContent=selected()[2]>0&&ready()&&enabled!==false&&Date.now()>=retryAfter?'Beregner transportpris …':selected()[2]===0?'':'Transportpris avklares i tilbudet.';
  }finally{syncAddresses();placeChoiceDetails();updated();}
 };
 const schedule=()=>{
  clearTimeout(timer);syncTransportDates();syncAddresses();const key=addressKey();
  if(pendingKey&&pendingKey!==key){revision++;controller?.abort();pendingKey='';}
  if(purchaseOnly()||!routeOptions()||capacity().includedOnly||capacity().manual||!Object.keys(deliverySelection?.basket||{}).length){if(pendingKey){revision++;controller?.abort();pendingKey='';}render();return;}
  if(editingContact()){deferredDelivery=true;updated();}else render();
  if(!enabled||!ready()||!dialog?.open||Date.now()<retryAfter||legs.filter(readyFor).every(leg=>cached(addressFor(leg)))||pendingKey===key)return;
  if(selected()[2]>0&&!transportPolicy().manual&&!editingContact())result.textContent='Beregner transportpris …';timer=setTimeout(calculate,1800);
 };
 async function calculate(){
  const options=routeOptions();if(!options||purchaseOnly()||!enabled||!ready()||!dialog?.open||capacity().includedOnly||capacity().manual||!Object.keys(deliverySelection?.basket||{}).length||Date.now()<retryAfter)return;const key=addressKey(),current=++revision;pendingKey=key;controller=new AbortController();render();
  try{
   const addresses=legs.filter(readyFor).map(addressFor).filter(address=>!cached(address));
   const results=await Promise.allSettled([...new Set(addresses)].map(async address=>{
    const response=await fetch('/api/delivery-estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,visits:1,...options,basket:deliverySelection.basket,customRequest:deliverySelection.customRequest===true}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});
    const quote=await response.json();
    if(!response.ok){if(response.status===429)retryAfter=Date.now()+60000;throw Error(quote.error||'Transportpris avklares i tilbudet.');}
    if(!quote.manual&&(!Number.isFinite(quote.prices?.onePerson)||!Number.isFinite(quote.prices?.twoPeople)))throw Error('Transportpris avklares i tilbudet.');
    if(current===revision)tariffs.set(routeKey(address),{quote,until:Date.now()+300000});
    return quote;
   }));
   if(current!==revision)return;
   const failure=results.find(result=>result.status==='rejected');
   if(failure)throw failure.reason;
   pendingKey='';render();
  }catch(error){if(current!==revision||error.name==='AbortError')return;pendingKey='';retryAfter=Math.max(retryAfter,Date.now()+30000);render();result.textContent=error.name==='TimeoutError'?'Fraktberegningen tok for lang tid. Frakt avklares i tilbudet.':error.message||'Transportpris avklares i tilbudet.';}
 }
 form.addEventListener('focusout',()=>{if(deferredDelivery)requestAnimationFrame(()=>{if(!editingContact())schedule();});});
 document.addEventListener('rental-delivery-selection',event=>{deliverySelection=event.detail;schedule();});
 form.addEventListener('input',event=>{if(['deliveryOverride','pickupOverride','deliveryAddress','pickupAddress','address','postalCode','postalCity','start','end','occasion','deliveryDate','pickupDate'].includes(event.target.name))schedule();});form.addEventListener('change',event=>{if(['delivery','deliveryOverride','pickupOverride','deliveryAddress','pickupAddress','address','postalCode','postalCity','start','end','occasion','deliveryDate','pickupDate'].includes(event.target.name))schedule();});
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
   if(event.key!=='Enter'||event.isComposing||['start','end'].includes(event.target.id)||(!matchMedia('(max-width:640px)').matches&&event.target.name!=='postalCity')||event.target.tagName!=='INPUT'||['date','number','checkbox','radio'].includes(event.target.type))return;
   // The transport radios are not text fields, but must be the next stop after the address.
   // Focus the current available choice without selecting or changing a delivery method.
   const transport=event.target.name==='postalCity'?[...form.querySelectorAll('input[name="delivery"],select[name="shipping"]')].filter(field=>!field.disabled&&field.getClientRects().length):[];
   const next=transport.find(field=>field.checked)||transport[0]||fields.slice(fields.indexOf(event.target)+1).find(field=>!field.disabled&&field.getClientRects().length);
   if(next){event.preventDefault();next.focus();}
  });
 }
 if(rentalForm)mountMobileRentalDates(rentalForm);
}

// Keep ordinary cart rows readable beside their fixed image field on phones.
if(rentalForm||saleForm){const style=document.createElement('style');style.textContent='@media(max-width:640px){#cart .cart-item:not(.cart-sofa-row):not(.cart-addon){display:grid;grid-template-columns:var(--cart-image-size) minmax(0,1fr);align-items:start;column-gap:var(--cart-image-gap);row-gap:8px}#cart .cart-item:not(.cart-sofa-row):not(.cart-addon)>.thumb{grid-column:1;grid-row:1 / span 2}#cart .cart-item:not(.cart-sofa-row):not(.cart-addon)>.item-copy{grid-column:2;grid-row:1}#cart .cart-item:not(.cart-sofa-row):not(.cart-addon)>.quantity{grid-column:2;grid-row:2;justify-self:start}}';document.head.append(style);}

// Package rows must allocate the same width as the shared thumbnail component.
if(rentalForm){const style=document.createElement('style');style.textContent='#cart .package-cart-line{grid-template-columns:var(--cart-image-size) minmax(0,1fr) auto;column-gap:var(--cart-image-gap);align-items:start}#cart .package-cart-copy{min-width:0;overflow-wrap:anywhere}#cart .package-cart-line>.cart-thumbnail{grid-column:1;grid-row:1}#cart .package-cart-line>.package-cart-copy{grid-column:2;grid-row:1}#cart .package-cart-line>.quantity{grid-column:3;grid-row:1}#cart .package-cart-addon>.cart-thumbnail{display:none}#cart .package-cart-addon{grid-template-columns:minmax(0,1fr) auto}#cart .package-cart-addon>.package-cart-copy{grid-column:1}#cart .package-cart-addon>.quantity{grid-column:2}@media(max-width:640px){#cart .package-cart-line{grid-template-columns:var(--cart-image-size) minmax(0,1fr);row-gap:10px}#cart .package-cart-line>.cart-thumbnail{grid-row:1 / span 2}#cart .package-cart-line>.quantity{grid-column:2;grid-row:2;justify-self:start;margin-top:0}#cart .package-cart-addon{grid-template-columns:minmax(0,1fr)}#cart .package-cart-addon>.package-cart-copy,#cart .package-cart-addon>.quantity{grid-column:1}#cart .package-cart-copy h4{overflow-wrap:anywhere}}';document.head.append(style);}

if(rentalForm){
 const style=document.createElement('style');
 style.textContent=`
  #requestForm .rental-delivery-choice{
   border:1px solid var(--line);
   border-radius:8px;
   background:#fff;
  }
  #requestForm .rental-delivery-choice > .addon-choice{
   display:grid;
   grid-template-columns:18px minmax(0,1fr) auto;
   align-content:center;
   gap:3px 10px;
   box-sizing:border-box;
   margin:0;
   min-height:68px;
   padding:9px 12px;
   border:0;
   border-radius:inherit;
   background:transparent;
  }
  #requestForm .rental-delivery-choice > .addon-choice > input[type=radio]{
   grid-column:1;
   grid-row:1;
   width:18px;
   height:18px;
   padding:0;
   margin:0;
  }
  #requestForm .transport-choice-copy{display:contents}
  #requestForm .transport-choice-name{grid-column:2;grid-row:1;font-size:14px;font-weight:600}
  #requestForm [data-delivery-price]{grid-column:3;grid-row:1;font-size:14px;text-align:right}
  #requestForm .transport-choice-description{grid-column:2/-1;color:var(--muted);font-size:12px;line-height:1.45}
  #requestForm .route-credit{grid-column:2/-1;display:block;font-size:10px;line-height:1.4;font-weight:400;margin:0}
  #requestForm .route-credit span{display:inline;font:400 13px/1 sans-serif;color:#1f1f1f;white-space:nowrap}
  #requestForm .rental-options .addon-choice.is-unavailable{opacity:.45;cursor:not-allowed}
  #requestForm .rental-options .addon-choice.is-unavailable input{cursor:not-allowed}
  #requestForm .rental-delivery-choice:has(> .addon-choice[hidden]){display:none}
  #requestForm .rental-delivery-choice:has(> .addon-choice input:checked){
   background:#eef0e7;
   border-color:var(--olive);
  }
  #requestForm .rental-delivery-details{
   display:grid;
   gap:8px;
   min-width:0;
   margin:0 12px;
   padding:8px 0 12px;
   border-top:1px solid var(--line);
   font:400 13px/1.5 "DM Sans",sans-serif;
  }
  #requestForm .rental-delivery-details:not(:has(> :not([hidden], :empty))),
  #requestForm .rental-delivery-details > [hidden],
  #requestForm .rental-delivery-details > [role=status]:empty{display:none}
  #requestForm .rental-delivery-details > .transport-note{
   display:grid;
   grid-template-columns:15px minmax(0,1fr);
   align-items:start;
   gap:8px;
   padding-top:8px;
   border-top:1px solid var(--line);
   color:var(--muted);
   font-size:12px;
   overflow-wrap:anywhere;
  }
  #requestForm .transport-note .information-box-icon{
   display:grid;
   place-items:center;
   width:14px;
   height:14px;
   margin-top:2px;
   border:1px solid currentColor;
   border-radius:50%;
   line-height:1;
   font-weight:600;
   font-size:10px;
  }
  #requestForm .transport-note-warning .information-box-icon{color:#78621f}
  #requestForm .transport-note strong{color:var(--ink);font-weight:600}
  #requestForm .transport-note p{margin:0}
  #requestForm .transport-note:has(> div > strong){row-gap:2px}
  #requestForm .transport-note:has(> div > strong) > div{display:contents}
  #requestForm .transport-note strong + p{grid-column:1/-1;margin-top:0}
  #requestForm .rental-transport-dates > label{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0;padding:6px 0;font-size:13px;line-height:1.5}
  #requestForm .rental-transport-dates > label + label{border-top:1px solid var(--line)}
  #requestForm .rental-transport-dates > label > span{min-width:0}
  #requestForm .rental-transport-dates strong{flex-shrink:0;font-size:13px;font-weight:600;white-space:nowrap}
  #requestForm label[hidden],#requestForm .rental-delivery-details > [hidden],
  #requestForm .rental-transport-dates input[hidden]{display:none!important}
  #requestForm .rental-delivery-details > .hint{margin:0;font-size:12px;line-height:1.6}
  @media(min-width:641px){
   #requestForm .rental-transport-dates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
   #requestForm .rental-transport-dates > label{display:grid;justify-content:start;gap:2px;padding:2px 12px 2px 0}
   #requestForm .rental-transport-dates > label + label{border-top:0;border-left:1px solid var(--line);padding-left:14px}
   #requestForm .rental-transport-dates > label > span{color:var(--muted);font-size:12px}
   #requestForm .rental-transport-dates strong{font-size:16px}
  }
  @media(max-width:640px){
   #requestForm .rental-delivery-choice > .addon-choice{min-height:64px;padding:9px 10px}
   #requestForm .rental-delivery-details{margin-inline:10px}
   #requestForm [data-delivery-price]{font-size:13px}
  }
  @media(max-width:360px){#requestForm .rental-transport-dates > label{flex-wrap:wrap;gap:4px 12px}}
 `;
 document.head.append(style);
}
