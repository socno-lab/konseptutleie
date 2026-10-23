// A single calendar makes the from/to hand-off reliable on mobile Safari,
// which cannot consistently open a second native picker from a change event.
export function mountMobileRentalDates(form){
 const start=form.querySelector('#start'),end=form.querySelector('#end');if(!start||!end)return;
 const mobile=matchMedia('(max-width:640px)');
 const calendar=document.createElement('dialog');calendar.className='rental-date-picker';calendar.setAttribute('aria-labelledby','rentalDateHeading');
 calendar.innerHTML='<header><h2 id="rentalDateHeading"></h2><button type="button" data-date-close aria-label="Lukk datovelger">×</button></header><nav aria-label="Velg måned"><button type="button" data-date-month="-1" aria-label="Forrige måned">‹</button><strong id="rentalDateMonth" aria-live="polite"></strong><button type="button" data-date-month="1" aria-label="Neste måned">›</button></nav><div class="date-weekdays" aria-hidden="true"><span>Ma</span><span>Ti</span><span>On</span><span>To</span><span>Fr</span><span>Lø</span><span>Sø</span></div><div class="date-days"></div><p class="hint">Velg datoen i kalenderen.</p>';
 document.body.append(calendar);
 const style=document.createElement('style');style.textContent='.rental-date-picker{width:350px;max-width:calc(100vw - 24px);padding:20px;background:var(--paper);color:var(--ink);border:1px solid var(--line)}.rental-date-picker::backdrop{background:#2d332a88}.rental-date-picker header{height:auto;margin:0 0 16px;display:flex;justify-content:space-between;border:0;gap:12px}.rental-date-picker h2{font-size:24px;letter-spacing:-.5px;margin:0}.rental-date-picker button{font:inherit;min-height:40px;border:1px solid var(--line);background:transparent;color:inherit}.rental-date-picker header button{width:40px;font-size:24px}.rental-date-picker nav{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px}.rental-date-picker nav button{width:40px;font-size:24px}.rental-date-picker nav strong{font-size:16px}.date-weekdays,.date-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center}.date-weekdays{font-size:12px;margin-bottom:6px}.date-days button{padding:4px;min-width:0;font-size:16px}.date-days button[aria-pressed=true]{background:var(--olive);color:white}.rental-date-picker .hint{margin:14px 0 0}';document.head.append(style);
 let target=start,month=new Date();
 const iso=date=>date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
 function render(){
  calendar.querySelector('h2').textContent=target===start?'Velg fra-dato':'Velg til-dato';
  calendar.querySelector('#rentalDateMonth').textContent=month.toLocaleDateString('nb-NO',{month:'long',year:'numeric'});
  const grid=calendar.querySelector('.date-days');grid.replaceChildren();const first=new Date(month.getFullYear(),month.getMonth(),1),offset=(first.getDay()+6)%7,last=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  for(let i=0;i<offset;i++)grid.append(document.createElement('span'));
  for(let day=1;day<=last;day++){const date=new Date(month.getFullYear(),month.getMonth(),day),value=iso(date),button=document.createElement('button');button.type='button';button.dataset.date=value;button.textContent=day;button.disabled=!!target.min&&value<target.min;button.setAttribute('aria-label',date.toLocaleDateString('nb-NO',{day:'numeric',month:'long',year:'numeric'}));button.setAttribute('aria-pressed',String(target.value===value));grid.append(button);}
 }
 function open(field){target=field;const value=field.value||field.min||iso(new Date());month=new Date(value+'T12:00:00');month.setDate(1);render();if(!calendar.open)calendar.showModal();calendar.querySelector('[data-date]:not(:disabled)')?.focus({preventScroll:true});}
 function sync(){for(const field of [start,end]){const value=field.value;field.type=mobile.matches?'text':'date';field.value=value;field.readOnly=mobile.matches;field.inputMode=mobile.matches?'none':'';if(mobile.matches){field.setAttribute('role','button');field.setAttribute('aria-haspopup','dialog');}else{field.removeAttribute('role');field.removeAttribute('aria-haspopup');}}if(!mobile.matches&&calendar.open)calendar.close();}sync();mobile.addEventListener('change',sync);
 for(const field of [start,end]){field.addEventListener('click',event=>{if(mobile.matches){event.preventDefault();open(field);}});field.addEventListener('keydown',event=>{if(mobile.matches&&['Enter',' '].includes(event.key)){event.preventDefault();open(field);}});}
 form.addEventListener('submit',event=>{if(!mobile.matches)return;const missing=[start,end].find(field=>!field.disabled&&field.required&&!field.value);if(missing){event.preventDefault();event.stopImmediatePropagation();open(missing);}},true);
 calendar.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.hasAttribute('data-date-close')){calendar.close();return;}if(button.dataset.dateMonth){month.setMonth(month.getMonth()+Number(button.dataset.dateMonth));render();return;}if(!button.dataset.date)return;
  const field=target;field.value=button.dataset.date;
  if(field===start){end.min=start.value;if(end.value&&end.value<start.value)end.value='';}
  field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));
  if(field===start)open(end);else{calendar.close();end.focus({preventScroll:true});}
 });
}
