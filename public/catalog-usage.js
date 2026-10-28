import {purposes} from './rental-purpose-model.js?v=launch20261024';
import {rentalUsageLabels,rentalUsageDescriptions,rentalUsageExplanation} from './rental-usage-model.js?v=longrent20261026';
import {proposedCatalogUsage,catalogUsageLabel} from './catalog-usage-model.js?v=usage20261028a';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Stage choices locally: nothing changes in the catalogue or basket until Apply.
export function mountCatalogUsage(host,{state,apply,impact=()=>''}){
 if(!host)return null;
 host.className='catalog-usage';
 host.innerHTML='<h3 id="catalogUsageHeading">Hva skal du bruke møblene til?</h3><button type="button" id="catalogUsageButton" aria-haspopup="dialog" aria-controls="catalogUsageDialog" aria-describedby="catalogUsageHelp"><span data-usage-label></span><span aria-hidden="true">⌄</span></button><p id="catalogUsageHelp">Utvalg og leiepriser tilpasses bruksområdet. Alle priser inkluderer mva.</p>';
 const button=host.querySelector('button'),dialog=document.createElement('dialog');
 dialog.id='catalogUsageDialog';dialog.className='catalog-usage-dialog';dialog.setAttribute('aria-labelledby','catalogUsageTitle');
 dialog.innerHTML='<div class="catalog-usage-heading"><h2 id="catalogUsageTitle">Hva skal du bruke møblene til?</h2><button type="button" class="close" data-usage-close aria-label="Lukk valg av bruksområde">✕</button></div><p class="hint">'+rentalUsageExplanation+' Boligfoto og visning har egne leiepriser. Arrangementer og annen bruk har samme prismodell.</p><div class="catalog-usage-purposes" role="group" aria-label="Velg bruksområde">'+purposes.map(p=>'<button type="button" data-catalog-purpose="'+p.id+'" aria-pressed="false">'+escape(p.label)+'</button>').join('')+'</div><div data-usage-basis></div><div class="catalog-usage-impact" data-usage-impact role="status" hidden></div><p class="hint">Alle leiepriser inkluderer mva. Transport, tilgjengelighet og endelig tilbud bekreftes separat.</p><div class="catalog-usage-actions"><button type="button" class="button button-outline" data-usage-close>Avbryt</button><button type="button" class="button dark" data-usage-apply>Bruk valget</button></div>';
 document.body.append(dialog);
 let draft,afterApply=null;
 const proposed=()=>proposedCatalogUsage({...state(),purpose:draft.purpose,scope:draft.scope});
 function renderDraft(){
  const next=proposed();
  for(const option of dialog.querySelectorAll('[data-catalog-purpose]'))option.setAttribute('aria-pressed',String(option.dataset.catalogPurpose===draft.purpose));
  dialog.querySelector('[data-usage-basis]').innerHTML=draft.purpose==='alle'?'<fieldset class="catalog-usage-basis"><legend>Leiepriser for</legend><p class="hint">«Vis alle» viser hele utvalget. Velg hva møblene skal brukes til, slik at leieprisene blir riktige.</p><div class="rental-usage-options">'+Object.entries(rentalUsageLabels).map(([scope,label])=>'<button type="button" data-catalog-scope="'+scope+'" aria-pressed="'+(next.confirmed&&next.scope===scope)+'"><strong>'+label+'</strong><span>'+rentalUsageDescriptions[scope]+'</span></button>').join('')+'</div></fieldset>':'<p class="catalog-usage-tariff">Leiepriser for: <strong>'+rentalUsageLabels[next.scope]+'</strong></p>';
  const messages=[...next.messages];
  const notice=dialog.querySelector('[data-usage-impact]');
  notice.hidden=!messages.length;notice.innerHTML=messages.map(message=>'<p>'+escape(message)+'</p>').join('')+(next.confirmed?impact(next):'');
  const submit=dialog.querySelector('[data-usage-apply]');submit.disabled=!next.confirmed;submit.textContent=next.requiresConfirmation?'Bekreft og oppdater':'Bruk valget';
 }
 function open(action=null){const current=state();draft={purpose:current.currentPurpose,scope:current.confirmed?current.currentScope:null};afterApply=action;renderDraft();if(!dialog.open)dialog.showModal();}
 button.onclick=()=>open();
 dialog.addEventListener('click',event=>{
  if(event.target.closest('[data-usage-close]')){dialog.close();return;}
  const purpose=event.target.closest('[data-catalog-purpose]');if(purpose){draft.purpose=purpose.dataset.catalogPurpose;renderDraft();return;}
  const scope=event.target.closest('[data-catalog-scope]');if(scope){draft.scope=scope.dataset.catalogScope;renderDraft();return;}
  if(event.target.closest('[data-usage-apply]')){const next=proposed();if(!next.confirmed)return;const callback=afterApply;apply(next);dialog.close();callback?.();}
 });
 dialog.addEventListener('close',()=>{afterApply=null;button.focus({preventScroll:true});});
 const render=()=>{const current=state();button.querySelector('[data-usage-label]').textContent=catalogUsageLabel({purpose:current.currentPurpose,scope:current.currentScope,confirmed:current.confirmed});};
 render();return {render,open,host,button};
}
