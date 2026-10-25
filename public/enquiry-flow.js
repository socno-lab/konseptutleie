const allowed=new Set(['start','end','occasion','name','email','phone','company','address','postalCode','postalCity','notes','delivery','shipping','stylist','stylingNotes','customRequest']);
export function mountEnquiryFlow({cartId,formId,mode}){
 const cart=document.getElementById(cartId),form=document.getElementById(formId),page=location.pathname==='/foresporsel.html',key='konsept-enquiry-draft-'+mode;
 if(!cart||!form)return {open(){},update(){},clearDraft(){},restoredField:()=>false};
 const css=document.createElement('link');css.rel='stylesheet';css.href='/enquiry-page.css?v=submitprice20261025c';if(!document.querySelector('link[href="'+css.href.replace(location.origin,'')+'"]'))document.head.append(css);
 let saved={};try{const value=JSON.parse(sessionStorage.getItem(key)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))saved=value;}catch{}
 let confirmedOccasion=mode==='rent'&&saved.occasionConfirmed===true&&typeof saved.occasion==='string'&&saved.occasion.trim()?saved.occasion:'';
 const restored=new Set();
 for(const field of form.elements){if(!allowed.has(field.name))continue;if(mode==='rent'&&field.name==='occasion'&&!confirmedOccasion){field.value='';continue;}const value=saved[field.name];if(field.type==='checkbox'){if(typeof value!=='boolean')continue;field.checked=value;}else{if(typeof value!=='string')continue;if(field.type==='radio')field.checked=field.value===value;else field.value=value;}restored.add(field.name);}
 for(const field of form.elements)if(restored.has(field.name))field.dispatchEvent(new Event('change',{bubbles:true}));
 const store=event=>{if(mode==='rent'&&event?.type==='change'&&event.target?.name==='occasion')confirmedOccasion=event.target.value.trim()?event.target.value:'';const draft={};for(const field of form.elements)if(allowed.has(field.name)&&(field.type!=='radio'||field.checked))draft[field.name]=field.type==='checkbox'?field.checked:field.value;if(mode==='rent'){draft.occasionConfirmed=!!confirmedOccasion&&draft.occasion===confirmedOccasion;if(!draft.occasionConfirmed)draft.occasion='';}try{sessionStorage.setItem(key,JSON.stringify(draft));}catch{}};
 form.addEventListener('input',store);form.addEventListener('change',store);window.addEventListener('pagehide',store);
 const checkoutUrl='/foresporsel.html'+(mode==='buy'?'?type=kjop':'');
 const preview=document.createElement('section');preview.className='enquiry-preview-content';preview.setAttribute('aria-label','Kort oversikt over forespørselen');
 const list=document.createElement('div'),note=document.createElement('p'),next=document.createElement('a');note.className='hint';note.textContent='Se hele innholdet, tilpass valgene og fyll inn opplysningene på neste side.';next.className='button dark';next.href=checkoutUrl;next.textContent='Se og fullfør forespørselen ↗';preview.append(list,note,next);
 let period;
 if(page){
  document.body.classList.remove('catalog-page','home-page','occasion-page','buy-page');document.body.classList.add('enquiry-page');const host=document.getElementById('enquiryPage');cart.hidden=true;
  const back=document.createElement('a');back.href=mode==='buy'?'/kjop.html':'/utvalg.html?bruk=alle';back.className='text-button enquiry-back';back.textContent='← Fortsett å se produkter';host.append(back,cart);cart.classList.add('enquiry-full');
  const heading=cart.querySelector('h2');if(heading){const h1=document.createElement('h1');h1.id=heading.id;h1.textContent=mode==='buy'?'Din kjøpsforespørsel':heading.textContent;heading.replaceWith(h1);}
  for(const close of cart.querySelectorAll('[data-close="'+cartId+'"]'))close.hidden=true;
  cart.addEventListener('cancel',event=>event.preventDefault());cart.show();cart.tabIndex=-1;cart.focus({preventScroll:true});requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
  if(mode==='rent'){period=document.createElement('button');period.type='button';period.className='enquiry-period-link text-button';period.addEventListener('click',()=>{document.getElementById('rentalDates')?.scrollIntoView({behavior:'smooth',block:'start'});const target=document.querySelector('#rentalDates .rental-date-trigger,#rentalDates input:not([type=hidden])');target?.focus({preventScroll:true});});cart.querySelector('.drawer-head')?.after(period);}
 }else{cart.classList.add('enquiry-preview');cart.append(preview);}
 let pending=false;
 function update(){
  if(period){const start=form.elements.namedItem('start')?.value,end=form.elements.namedItem('end')?.value,dates=start&&end?start.split('-').reverse().join('.')+' – '+end.split('-').reverse().join('.'):'Velg datoer';period.textContent='Leieperiode: '+dates+(start&&end?' · Endre':'');period.hidden=document.getElementById('rentalDates')?.hidden??true;}
  if(page)return;
  const rows=[];
  for(const group of cart.querySelectorAll('.package-cart-card')){const name=group.querySelector('h3')?.textContent,quantity=group.querySelector('.package-cart-count output')?.textContent||'1';if(name)rows.push({name,quantity});}
  for(const item of cart.querySelectorAll('#moduleCartSummary .cart-sofa-row,#saleCartItems .cart-sofa-row,.cart-product-group>.cart-item:not(.cart-addon),#saleCartItems>.sale-row')){const name=item.querySelector('h3,h4,strong')?.textContent;if(name)rows.push({name,quantity:item.querySelector('.quantity span,.sale-quantity input')?.value||item.querySelector('.quantity span')?.textContent||'1'});}
  // Purchase rows use their existing DOM label; no duplicated pricing or basket state.
  if(mode==='buy'&&!rows.length)for(const item of cart.querySelectorAll('#saleCartItems>div')){const name=item.querySelector('h3,strong')?.textContent;if(name)rows.push({name,quantity:item.querySelector('input[type=number]')?.value||'1'});}
  if(document.getElementById('customRequestItem')?.hidden===false)rows.push({name:'Tilpasset forespørsel',quantity:'1'});
  list.replaceChildren();for(const row of rows.slice(0,6)){const p=document.createElement('p');p.className='enquiry-preview-row';p.textContent=row.quantity+' × '+row.name;list.append(p);}if(rows.length>6){const p=document.createElement('p');p.textContent='+ '+(rows.length-6)+' flere valg';list.append(p);}if(!rows.length){const p=document.createElement('p');p.textContent='Forespørselen din er tom. Du kan velge produkter eller beskrive hva du trenger på neste side.';list.append(p);}
 }
 const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;update();});});
 // Observe only source rows, never the preview we render ourselves.
 for(const id of mode==='buy'?['saleCartItems']:['cartItems','moduleCartSummary']){const node=document.getElementById(id);if(node)observer.observe(node,{childList:true,subtree:true,characterData:true});}
 update();
 return {update,restoredField:name=>restored.has(name),ready(){if(page){cart.hidden=false;document.getElementById('enquiryLoading')?.remove();}},fail(){if(page){const loading=document.getElementById('enquiryLoading');if(loading){loading.textContent='Kunne ikke laste forespørselen. ';const retry=document.createElement('button');retry.type='button';retry.className='text-button';retry.textContent='Prøv igjen';retry.onclick=()=>location.reload();loading.append(retry);}}},open(){store();if(!page){location.assign(checkoutUrl);return;}update();if(!cart.open)cart.show();window.scrollTo({top:0,behavior:'smooth'});},clearDraft(){try{sessionStorage.removeItem(key);}catch{}restored.clear();window.removeEventListener('pagehide',store);form.removeEventListener('input',store);form.removeEventListener('change',store);}};
}
