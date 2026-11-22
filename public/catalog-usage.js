import {catalogUsageMarkup} from './catalog-usage-markup.js?v=mobilefirst20261119';
import {purposes} from './rental-purpose-model.js?v=fest20261114';
import {rentalUsageLabels,rentalUsageDescriptions,rentalUsageExplanation} from './rental-usage-model.js?v=fest20261114';
import {proposedCatalogUsage,catalogUsageLabel} from './catalog-usage-model.js?v=purpose20261122';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Stage choices locally: nothing changes in the catalogue or basket until Apply.
export function mountCatalogUsage(host,{state,apply,impact=()=>''}){
 if(!host)return null;
 host.classList.add('catalog-usage','has-price-display');
 if(!host.querySelector('#catalogUsageButton')){
  const current=state();
  host.innerHTML=catalogUsageMarkup({purpose:current.currentPurpose,scope:current.currentScope,confirmed:current.confirmed});
 }
 const button=host.querySelector('#catalogUsageButton'),dialog=document.createElement('dialog');
 dialog.id='catalogUsageDialog';dialog.className='catalog-usage-dialog';dialog.setAttribute('aria-labelledby','catalogUsageTitle');
 dialog.innerHTML='<div class="catalog-usage-heading"><h2 id="catalogUsageTitle">Hva skal du bruke møblene til?</h2><button type="button" class="close" data-usage-close aria-label="Lukk valg av bruksområde">✕</button></div><p class="hint">Velg bruksområdet som passer. Utvalg og leiepriser tilpasses automatisk.</p><div class="catalog-usage-purposes" role="group" aria-label="Velg bruksområde">'+purposes.filter(p=>p.id!=='alle').map(p=>'<button type="button" data-catalog-purpose="'+p.id+'" aria-pressed="false">'+escape(p.label)+'</button>').join('')+'</div><div data-usage-basis></div><div class="catalog-usage-impact" data-usage-impact role="status" hidden></div><p class="hint">Alle leiepriser inkluderer mva. Transport, tilgjengelighet og endelig tilbud bekreftes separat.</p><div class="catalog-usage-actions"><button type="button" class="button button-outline" data-usage-close>Avbryt</button><button type="button" class="button dark" data-usage-apply>Bekreft</button></div>';
 document.body.append(dialog);
 let draft,afterApply=null;
 const proposed=()=>proposedCatalogUsage({...state(),purpose:draft.purpose,scope:draft.scope});
 function renderDraft(){
  const next=proposed();
  for(const option of dialog.querySelectorAll('[data-catalog-purpose]'))option.setAttribute('aria-pressed',String(option.dataset.catalogPurpose===draft.purpose));
  dialog.querySelector('[data-usage-basis]').innerHTML='';
  const messages=[...next.messages];
  const notice=dialog.querySelector('[data-usage-impact]');
  notice.hidden=!messages.length;notice.innerHTML=messages.map(message=>'<p>'+escape(message)+'</p>').join('')+(next.confirmed?impact(next):'');
  const submit=dialog.querySelector('[data-usage-apply]');submit.disabled=!next.confirmed||draft.purpose==='alle';submit.textContent='Bekreft';
 }
 function open(action=null){const current=state();draft={purpose:current.currentPurpose,scope:current.confirmed?current.currentScope:null};afterApply=action;renderDraft();if(!dialog.open)dialog.showModal();}
 button.onclick=()=>open();
 dialog.addEventListener('click',event=>{
  if(event.target.closest('[data-usage-close]')){dialog.close();return;}
  const purpose=event.target.closest('[data-catalog-purpose]');if(purpose){draft.purpose=purpose.dataset.catalogPurpose;renderDraft();return;}
  const scope=event.target.closest('[data-catalog-scope]');if(scope){draft.scope=scope.dataset.catalogScope;renderDraft();return;}
  if(event.target.closest('[data-usage-apply]')){const next=proposed();if(!next.confirmed||draft.purpose==='alle')return;const callback=afterApply;apply(next);dialog.close();callback?.();}
 });
 dialog.addEventListener('close',()=>{afterApply=null;button.focus({preventScroll:true});});
 const render=()=>{const current=state();button.querySelector('[data-usage-label]').textContent=catalogUsageLabel({purpose:current.currentPurpose,scope:current.currentScope,confirmed:current.confirmed});};
 render();return {render,open,host,button};
}
