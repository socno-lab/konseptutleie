// Review the existing form and basket DOM; never maintain a second basket or price.
const page=location.pathname;
if(page==='/foresporsel.html'||page==='/tilpasset-foresporsel.html'){
 const form=document.querySelector('#requestForm,#saleRequestForm,#proposalForm');
 if(form){
  const sale=form.id==='saleRequestForm',proposal=form.id==='proposalForm';
  const submit=form.querySelector('[type=submit],#saleExport');
  const review=document.createElement('section');review.className='enquiry-review';review.setAttribute('aria-label','Kontroller før du sender');
  if(!proposal)submit.before(review);
  const errors=new Map();let errorId=0;
  function clear(field){const node=errors.get(field);if(!node)return;field.removeAttribute('aria-invalid');const described=(field.getAttribute('aria-describedby')||'').split(' ').filter(id=>id&&id!==node.id);if(described.length)field.setAttribute('aria-describedby',described.join(' '));else field.removeAttribute('aria-describedby');node.remove();errors.delete(field);}
  function mark(field){if(!field.willValidate||field.validity.valid)return;let node=errors.get(field);if(!node){node=document.createElement('span');node.className='enquiry-field-error';node.id='enquiry-field-error-'+(++errorId);field.after(node);errors.set(field,node);field.setAttribute('aria-describedby',[field.getAttribute('aria-describedby'),node.id].filter(Boolean).join(' '));}field.setAttribute('aria-invalid','true');node.textContent=field.validity.valueMissing?(field.type==='checkbox'?'Du må krysse av her før du sender.':'Fyll ut dette feltet.'):(field.type==='email'&&field.validity.typeMismatch?'Skriv en gyldig e-postadresse, for eksempel navn@firma.no.':field.validationMessage);}
  form.addEventListener('invalid',event=>mark(event.target),true);
  function change(event){if(errors.has(event.target)){if(event.target.validity.valid)clear(event.target);else mark(event.target);}schedule();}
  form.addEventListener('input',change);form.addEventListener('change',change);
  function value(name){const field=form.elements.namedItem(name);return field?.value?.trim()||'';}
  function go(target){if(!target)return;target.scrollIntoView({behavior:'smooth',block:'center'});const focus=target.matches('input,select,textarea,button')?target:target.querySelector('input[type=number]:not(:disabled),.quantity button:not(:disabled),.sale-quantity button:not(:disabled)')||target.querySelector('input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)');if(focus)focus.focus({preventScroll:true});else{target.tabIndex=-1;target.focus({preventScroll:true});}}
  function node(tag,text,parent=review){const n=document.createElement(tag);n.textContent=text;parent.append(n);return n;}
  function edit(label,target,parent=review){const button=node('button','Endre',parent);button.setAttribute('aria-label',label);button.type='button';button.className='text-button';button.onclick=()=>go(target);}
  function fact(label,text,target){const row=node('div','');row.className='enquiry-review-row';const copy=node('p','',row);node('strong',label+': ',copy);copy.append(document.createTextNode(text||'Ikke oppgitt'));if(target)edit('Endre '+label.toLocaleLowerCase('nb'),target,row);}
  function render(){
   if(proposal||!form.isConnected)return;review.replaceChildren();node('h3','Kontroller før du sender');
   if(proposal){fact('Behov',value('customRequest'),form.elements.namedItem('customRequest'));fact('Periode',value('period'),form.elements.namedItem('period'));fact('Sted',value('place'),form.elements.namedItem('place'));if(value('budget'))fact('Budsjett',value('budget'),form.elements.namedItem('budget'));}
   else{
    const cart=document.getElementById(sale?'saleCart':'cart'),rows=[];
    for(const group of cart.querySelectorAll('.package-cart-card')){const name=group.querySelector('h3')?.textContent,q=group.querySelector('.package-cart-count output')?.textContent||'1';if(name)rows.push(q+' × '+name);}
    for(const item of cart.querySelectorAll('#moduleCartSummary .cart-sofa-row,#saleCartItems .cart-sofa-row,.cart-product-group>.cart-item:not(.cart-addon),#saleCartItems>.sale-row')){const name=item.querySelector('h3,h4,strong')?.textContent,q=item.querySelector('.quantity span,.sale-quantity input');if(name)rows.push((q?.value||q?.textContent||'1')+' × '+name);}
    if(rows.length){const group=node('div','');group.className='enquiry-review-row';const list=node('ul','',group);for(const row of rows)node('li',row,list);edit('Se og endre produkter, antall og tilvalg',document.getElementById(sale?'saleCartItems':'cartItems'),group);}
    if(value('customRequest'))fact('Tilpasset forespørsel',value('customRequest'),form.elements.namedItem('customRequest'));
    if(!sale){const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.split('-').reverse().join('.'):s;fact('Leieperiode',value('start')&&value('end')?date(value('start'))+' – '+date(value('end')):'Ikke valgt',document.getElementById('rentalDates'));}
    else if(value('deliveryDate'))fact('Ønsket levering',value('deliveryDate'),form.elements.namedItem('deliveryDate'));
    const delivery=form.elements.namedItem(sale?'shipping':'delivery');fact('Levering eller henting',value(sale?'shipping':'delivery'),delivery?.length?delivery[0].closest('fieldset')||delivery[0].parentElement:delivery);
   }
   node('p','Du kan rette valgene over uten å starte på nytt. Innsendingen er uforpliktende.').className='hint';
  }
  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;render();});}
  const observer=new MutationObserver(schedule);for(const id of ['cartItems','moduleCartSummary','saleCartItems']){const source=document.getElementById(id);if(source)observer.observe(source,{childList:true,subtree:true,characterData:true});}
  schedule();window.addEventListener('pageshow',schedule);
 }
}
