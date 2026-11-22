import {purposes,validPurpose} from './rental-purpose-model.js?v=fest20261114';
export function purposeForOccasion(value){return purposes.find(p=>p.label===value)?.id||({'Boligsalg':'boligsalg','Messe og stand':'messe','Event og selskap':'messe','Leie over tid':'bedrift'})[value]||'alle';}
export function rentalPurposeLabel(purpose,scope){return purposes.find(p=>p.id===validPurpose(purpose)&&p.id!=='alle')?.label||(scope==='standard'?'Boligfoto og visning':'Velg formål');}
export function purposeButtons(purpose){return '<div class="rental-usage-options" role="group" aria-label="Velg formål">'+purposes.filter(p=>p.id!=='alle').map(p=>`<button type="button" data-rental-purpose-choice="${p.id}" aria-pressed="${purpose===p.id}"><strong>${p.label}</strong></button>`).join('')+'</div>';}
export function rentalScopeMarkup(scope,confirmed,purpose=scope==='standard'?'boligsalg':'alle'){
 const buttons=purposeButtons(purpose);
 return confirmed?`<div class="rental-purpose-inline"><p class="rental-selected-usage">Formål: <strong>${rentalPurposeLabel(purpose,scope)}</strong></p><details><summary>Endre formål</summary>${buttons}</details></div>`:`<h3>Hva skal du bruke møblene til?</h3><p>Velg formål for å se leiepriser.</p>${buttons}`;
}
