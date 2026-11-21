import {parseDateOnly} from '../rental-dates.js?v=launch20261024';
export const adminDateKeys=['start','end','deliveryDate','pickupDate'];
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Text entry has one visible value; native date-input segment state is never submitted.
export function parseAdminDate(value){
 if(typeof value!=='string')return null;
 const text=value.trim().replace(/\s+/g,'');if(!text)return '';
 const local=text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/),iso=local?`${local[3]}-${local[2].padStart(2,'0')}-${local[1].padStart(2,'0')}`:text;
 return parseDateOnly(iso)===null?null:iso;
}
export function displayAdminDate(value){const iso=parseAdminDate(value||'');return iso?iso.split('-').reverse().join('.'):'';}
export function readAdminDateField(field){return parseAdminDate(field.value)||'';}
export function setAdminDateField(field,value){const iso=parseAdminDate(value||'')||'';field.value=displayAdminDate(iso);field.setCustomValidity('');const picker=field.parentElement?.querySelector('.admin-date-picker');if(picker)picker.value=iso;}
export function adminDateFieldMarkup(id,label,value){const iso=parseAdminDate(value||'')||'';return `<label>${escape(label)}<span class="admin-date-field"><input class="admin-date-value" id="${escape(id)}" data-date-label="${escape(label)}" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="20" placeholder="dd.mm.åååå" value="${escape(displayAdminDate(iso))}"><svg class="admin-date-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="16" rx="1"></rect><path d="M8 3v4m8-4v4M4 10h16"></path></svg><input class="admin-date-picker" type="date" value="${escape(iso)}" aria-label="Velg dato for ${escape(label)}"></span></label>`;}
export function collectAdminDates(root,requirePeriod=false){
 const dates={};for(const key of adminDateKeys){const field=root.querySelector('#'+key),value=parseAdminDate(field.value);field.setCustomValidity(value===null?'Skriv en gyldig dato som dd.mm.åååå.':requirePeriod&&['start','end'].includes(key)&&!value?'Velg leieperioden før du lagrer.':'');if(!field.reportValidity())throw Error('Kontroller '+(field.dataset.dateLabel||key)+'.');dates[key]=value||'';}
 if(dates.start&&dates.end&&dates.end<dates.start){const field=root.querySelector('#end');field.setCustomValidity('Leie til kan ikke være før Leie fra.');field.reportValidity();throw Error('Kontroller leieperioden.');}
 return dates;
}
export function bindAdminDateFields(root){
 for(const picker of root.querySelectorAll('.admin-date-picker')){
  picker.addEventListener('click',()=>{try{picker.showPicker?.();}catch{/* The browser's normal calendar remains available. */}});
  picker.addEventListener('change',()=>{const text=picker.parentElement.querySelector('.admin-date-value');setAdminDateField(text,picker.value);text.dispatchEvent(new Event('change',{bubbles:true}));});
 }
 for(const text of root.querySelectorAll('.admin-date-value')){
  text.addEventListener('input',()=>text.setCustomValidity(''));
  text.addEventListener('blur',()=>{const value=parseAdminDate(text.value);if(value!==null)setAdminDateField(text,value);});
 }
}
