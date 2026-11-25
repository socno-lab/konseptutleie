const allowed=new Set(['start','end','deliveryDate','pickupDate','occasion','name','email','phone','company','address','postalCode','postalCity','deliveryOverride','pickupOverride','deliveryAddress','pickupAddress','notes','delivery','shipping','stylist','stylingNotes','customRequest']);
export function mountEnquiryFlow({cartId,formId,mode}){
 const cart=document.getElementById(cartId),form=document.getElementById(formId),page=location.pathname==='/foresporsel.html',key='konsept-enquiry-draft-'+mode;
 if(!cart||!form)return {open(){},update(){},clearDraft(){},restoredField:()=>false};
 const css=document.createElement('link');css.rel='stylesheet';css.href='/enquiry-page.css?v=focusstable20261122';if(!document.querySelector('link[href="'+css.href.replace(location.origin,'')+'"]'))document.head.append(css);
 let saved={};try{const value=JSON.parse(sessionStorage.getItem(key)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
 if(mode==='rent')try{const period=JSON.parse(localStorage.getItem('konsept-rental-period-v1')||'{}');for(const name of ['start','end'])if(!saved[name]&&typeof period[name]==='string')saved[name]=period[name];}catch{}
 let confirmedOccasion=mode==='rent'&&saved.occasionConfirmed===true&&typeof saved.occasion==='string'&&saved.occasion.trim()?saved.occasion:'';
 const restored=new Set();
 for(const field of form.elements){if(!allowed.has(field.name))continue;if(mode==='rent'&&field.name==='occasion'&&!confirmedOccasion){field.value='';continue;}const value=saved[field.name];if(field.type==='checkbox'){if(typeof value!=='boolean')continue;field.checked=value;}else{if(typeof value!=='string')continue;if(field.type==='radio')field.checked=field.value===value;else field.value=value;}restored.add(field.name);}
 for(const field of form.elements)if(restored.has(field.name))field.dispatchEvent(new Event('change',{bubbles:true}));
 const store=event=>{if(mode==='rent'&&event?.type==='change'&&event.target?.name==='occasion')confirmedOccasion=event.target.value.trim()?event.target.value:'';const draft={};for(const field of form.elements)if(allowed.has(field.name)&&(field.type!=='radio'||field.checked))draft[field.name]=field.type==='checkbox'?field.checked:field.value;if(mode==='rent'){draft.occasionConfirmed=!!confirmedOccasion&&draft.occasion===confirmedOccasion;if(!draft.occasionConfirmed)draft.occasion='';}try{sessionStorage.setItem(key,JSON.stringify(draft));}catch{}if(mode==='rent')try{localStorage.setItem('konsept-rental-period-v1',JSON.stringify({start:draft.start||'',end:draft.end||''}));}catch{}};
 const storeOwned=event=>{if(event.target.form===form)store(event);};document.addEventListener('input',storeOwned);document.addEventListener('change',storeOwned);window.addEventListener('pagehide',store);
 const checkoutUrl='/foresporsel.html'+(mode==='buy'?'?type=kjop':'');
 const preview=document.createElement('section');preview.className='enquiry-preview-content';preview.setAttribute('aria-label','Kort oversikt over forespørselen');
 const list=document.createElement('div'),note=document.createElement('p'),next=document.createElement('a');note.className='hint';note.textContent='Se hele innholdet, tilpass valgene og fyll inn opplysningene på neste side.';next.className='button dark';next.href=checkoutUrl;next.textContent='Se og fullfør forespørselen ↗';preview.append(list);
 if(!page&&mode==='rent'){
  const more=document.createElement('a');more.href='/utvalg.html';more.className='text-button';more.textContent='+ Legg til flere produkter';preview.append(more);
 }
 let period,periodValue,periodButton;
 preview.append(note,next);
 if(page){
  document.body.classList.remove('catalog-page','home-page','occasion-page','buy-page');document.body.classList.add('enquiry-page');const host=document.getElementById('enquiryPage');cart.hidden=true;
  const back=document.createElement('a');back.href=mode==='buy'?'/kjop.html':'/utvalg.html';back.className='text-button enquiry-back';back.textContent=mode==='rent'?'← Se flere produkter':'← Fortsett å se produkter';host.append(back,cart);cart.classList.add('enquiry-full');
  const heading=cart.querySelector('h2');if(heading){const h1=document.createElement('h1');h1.id=heading.id;h1.textContent=mode==='buy'?'Din kjøpsforespørsel':heading.textContent;heading.replaceWith(h1);}
  for(const close of cart.querySelectorAll('[data-close="'+cartId+'"]'))close.hidden=true;
  cart.addEventListener('cancel',event=>event.preventDefault());cart.show();cart.tabIndex=-1;if(performance.getEntriesByType('navigation')[0]?.type==='navigate')requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
  if(mode==='rent'){
   const overview=document.createElement('section');
   overview.className='enquiry-overview';
   overview.setAttribute('aria-label','Leieperiode og formål');
   period=document.createElement('div');
   period.className='enquiry-overview-period';
   period.innerHTML='<button type="button" class="enquiry-setting" aria-label="Endre leieperiode" aria-haspopup="dialog"><svg class="enquiry-setting-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v5m8-5v5"/></svg><span><span class="enquiry-overview-label">Leieperiode</span><strong aria-live="polite"></strong></span><span class="enquiry-setting-action" aria-hidden="true">Endre</span></button>';
   periodValue=period.querySelector('strong');
   periodButton=period.querySelector('button');
   periodButton.addEventListener('click',event=>form.dispatchEvent(new CustomEvent('rental-period-edit',{detail:{opener:periodButton,pointer:event.detail>0}})));
   const intro=cart.querySelector('.quote-cart-note');
   intro.textContent='Du får et samlet tilbud før du bestemmer deg.';
   const assurance=document.createElement('span');
   assurance.className='enquiry-assurance';
   assurance.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>Helt uforpliktende';
   cart.querySelector('.drawer-head')?.append(assurance);
   const offerNote=document.createElement('p');
   offerNote.className='enquiry-offer-note';
   offerNote.textContent='Pris og tilgjengelighet bekreftes i tilbudet.';
   intro.after(overview,offerNote);
   overview.append(period,document.getElementById('cartPricingScope'));
   const productsHeading=document.getElementById('customRequestProductsHeading');
   const productsToolbar=document.createElement('div');
   productsToolbar.className='enquiry-products-toolbar';
   productsHeading.before(productsToolbar);
   const count=document.createElement('span');
   count.id='enquiryProductCount';
   count.className='enquiry-product-count';
   count.setAttribute('aria-live','polite');
   productsToolbar.append(productsHeading,count);
   cart.querySelector('.drawer-head .eyebrow')?.remove();
  }
 }else{cart.classList.add('enquiry-preview');cart.append(preview);}
 let pending=false;
 const periodFormat=new Intl.DateTimeFormat('nb-NO',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
 function update(){
  if(period){
   const start=new Date(form.elements.namedItem('start')?.value),end=new Date(form.elements.namedItem('end')?.value);
   const selected=Number.isFinite(+start)&&Number.isFinite(+end)&&start<=end;
   const dates=selected?periodFormat.formatRange(start,end):'Velg datoer';
   if(periodValue.textContent!==dates)periodValue.textContent=dates;
   periodButton.setAttribute('aria-label',selected?'Endre leieperiode':'Velg leieperiode');
   period.hidden=document.getElementById('rentalDates')?.hidden??true;
  }
  if(page)return;
  const rows=[];
  for(const group of cart.querySelectorAll('.package-cart-card')){const name=group.querySelector('h3')?.textContent,quantity=group.querySelector('.package-cart-count output')?.textContent||'1';if(name)rows.push({name,quantity});}
  for(const item of cart.querySelectorAll('#moduleCartSummary .cart-sofa-row,#saleCartItems .cart-sofa-row,.cart-product-group>.cart-item:not(.cart-addon),#saleCartItems>.sale-row')){const name=item.querySelector('h3,h4,strong')?.textContent;if(name)rows.push({name,quantity:item.querySelector('.quantity span,.sale-quantity input')?.value||item.querySelector('.quantity span')?.textContent||'1'});}
  // Purchase rows use their existing DOM label; no duplicated pricing or basket state.
  if(mode==='buy'&&!rows.length)for(const item of cart.querySelectorAll('#saleCartItems>div')){const name=item.querySelector('h3,strong')?.textContent;if(name)rows.push({name,quantity:item.querySelector('input[type=number]')?.value||'1'});}
  if(document.getElementById('customRequestItem')?.hidden===false)rows.unshift({name:'Din tilpassede forespørsel',quantity:'1'});
  list.replaceChildren();for(const row of rows.slice(0,6)){const p=document.createElement('p');p.className='enquiry-preview-row';p.textContent=row.quantity+' × '+row.name;list.append(p);}if(rows.length>6){const p=document.createElement('p');p.textContent='+ '+(rows.length-6)+' flere valg';list.append(p);}if(!rows.length){const p=document.createElement('p');p.textContent='Forespørselen din er tom. Du kan velge produkter eller beskrive hva du trenger på neste side.';list.append(p);}
 }
 const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;update();});});
 // Observe only source rows, never the preview we render ourselves.
 for(const id of mode==='buy'?['saleCartItems']:['cartItems','moduleCartSummary']){const node=document.getElementById(id);if(node)observer.observe(node,{childList:true,subtree:true,characterData:true});}
 update();
 return {update,restoredField:name=>restored.has(name),ready(){if(page){cart.hidden=false;document.getElementById('enquiryLoading')?.remove();}},fail(){if(page){const loading=document.getElementById('enquiryLoading');if(loading){loading.textContent='Kunne ikke laste forespørselen. ';const retry=document.createElement('button');retry.type='button';retry.className='text-button';retry.textContent='Prøv igjen';retry.onclick=()=>location.reload();loading.append(retry);}}},open(){store();if(!page){location.assign(checkoutUrl);return;}update();if(!cart.open)cart.show();window.scrollTo({top:0,behavior:'smooth'});},clearDraft(){if(mode==='rent')try{localStorage.removeItem('konsept-rental-period-v1');}catch{}try{sessionStorage.removeItem(key);}catch{}restored.clear();window.removeEventListener('pagehide',store);document.removeEventListener('input',storeOwned);document.removeEventListener('change',storeOwned);}};
}
