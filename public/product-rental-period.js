import {validateRentalPeriod} from './rental-dates.js?v=launch20261024';

export function productPeriodState(start,end,options={}) {
 if(!start&&!end)return {days:null,message:'Velg leieperiode for å se beregnet leiesum.'};
 try{return {...validateRentalPeriod(start,end,options),message:''};}
 catch(error){return {days:null,message:error.message};}
}
export function periodChangeNotice(start,end,previousStart,previousEnd,hasRentalItems) {
 return hasRentalItems&&(start!==previousStart||end!==previousEnd)?'Felles leieperiode: Endringen gjelder alle leievarer i forespørselen. Beregnede leiesummer oppdateres for alle varene.':'';
}
// Reuse the request form's existing authoritative fields and range picker.
// No second date state, pricing engine, or product-specific period is introduced.
export function mountProductRentalPeriod(host,{before=null,isPurchase=()=>false}={}) {
 if(!host)return;
 let section=host.querySelector('[data-product-rental-period]');
 if(!section){
  section=document.createElement('section');section.dataset.productRentalPeriod='';section.className='rental-options';section.setAttribute('aria-label','Leieperiode for produktet');
  section.innerHTML='<h3>Leieperiode</h3><div class="two"><label>Fra dato<button type="button" class="rental-date-trigger" data-period-field="start" aria-haspopup="dialog"></button></label><label>Til dato<button type="button" class="rental-date-trigger" data-period-field="end" aria-haspopup="dialog"></button></label></div><p class="hint" data-period-message role="status"></p><p class="hint">Samme periode brukes for alle leievarer i forespørselen. Tilgjengelighet og endelig tilbud må bekreftes; datovalget er ikke en reservasjon.</p>';
  if(before)before.before(section);else host.append(section);
  section.addEventListener('click',event=>{const button=event.target.closest('[data-period-field]');if(!button)return;const field=document.getElementById(button.dataset.periodField);if(field){field.disabled=false;field.click();}});
 }
 section.hidden=isPurchase();
 const start=document.getElementById('start')?.value||'',end=document.getElementById('end')?.value||'',state=productPeriodState(start,end);
 for(const name of ['start','end']){const value=name==='start'?start:end;const button=section.querySelector('[data-period-field="'+name+'"]');button.textContent=value?value.split('-').reverse().join('.'):'Velg dato';button.dataset.selected=String(!!value);button.setAttribute('aria-label',(name==='start'?'Fra dato: ':'Til dato: ')+button.textContent);}
 section.querySelector('[data-period-message]').textContent=state.message;
 return section;
}
