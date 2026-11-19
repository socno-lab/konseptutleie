import {normalizeRefinement,availableColors} from './catalog-refinement-model.js?v=compactsort20261119b';
const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const option=(value,label,selected)=>'<option value="'+html(value)+'"'+(value===selected?' selected':'')+'>'+html(label)+'</option>';
const selectedValue=state=>state.color?'color:'+state.color:state.sort;
export function refinementHint(state,{sale=false,confirmed=true}={}){
 if(state.color)return 'Viser produkter i valgt farge.';
 if(!sale&&!confirmed)return 'Velg bruksområde for å sammenligne leiepriser.';
 if(state.sort==='default')return '';
 return sale?'Sorterer etter kjøpsprisen som vises på kortet. Pris på forespørsel vises sist.':'Sammenligner '+({day:'døgnpris',week:'ukepris for 7 døgn',month:'månedspris for 30 døgn'}[state.period])+'. Prisene gjelder innholdet på hvert kort. Priser som ikke kan sammenlignes, vises sist.';
}
function choicesMarkup(state,{products=[],sale=false,confirmed=true}={}){
 const selected=selectedValue(state),disabled=!sale&&!confirmed;
 return option('default','Sorter etter',selected)+'<optgroup label="Pris"'+(disabled?' disabled':'')+'>'+option('price-asc','Pris: lav til høy',selected)+option('price-desc','Pris: høy til lav',selected)+'</optgroup><optgroup label="Farge">'+availableColors(products,state.color).map(c=>option('color:'+c.id,c.label,selected)).join('')+'</optgroup>';
}
export function catalogRefinementsMarkup(options={}){
 const state=normalizeRefinement(options.state),id=options.sale?'saleRefinements':'rentalRefinements';
 return '<div id="'+id+'" class="catalog-refinements"><label><span class="sr-only">Sorter etter</span><select data-refinement="choice" aria-describedby="'+id+'Hint">'+choicesMarkup(state,options)+'</select></label><span id="'+id+'Hint" class="sr-only catalog-refinement-hint" role="status">'+html(refinementHint(state,options))+'</span></div>';
}
// Keep the control mounted so keyboard focus survives filtering and sorting.
export function mountCatalogRefinements(anchor,options,onChange){
 if(!anchor)return;const doc=anchor.ownerDocument,id=options.sale?'saleRefinements':'rentalRefinements';let host=doc.getElementById(id);
 if(!host){const row=doc.createElement('div');row.className='catalog-sort-row';anchor.before(row);row.append(anchor);if(!options.sale&&row.nextElementSibling?.matches('.sample-note'))row.append(row.nextElementSibling);row.insertAdjacentHTML('beforeend',catalogRefinementsMarkup(options));host=doc.getElementById(id);}
 const state=normalizeRefinement(options.state),select=host.querySelector('[data-refinement="choice"]'),choices=choicesMarkup(state,options);
 if(select.innerHTML!==choices)select.innerHTML=choices;select.value=selectedValue(state);
 host.querySelector('.catalog-refinement-hint').textContent=refinementHint(state,options);
 host.onchange=event=>{if(event.target!==select)return;const value=select.value;onChange(normalizeRefinement(value.startsWith('color:')?{color:value.slice(6)}:{sort:value,period:'day'}));};
}
