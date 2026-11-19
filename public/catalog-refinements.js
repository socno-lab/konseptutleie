import {normalizeRefinement,availableColors} from './catalog-refinement-model.js?v=refine20261119';
const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const periods=[['day','Døgn'],['week','Uke · 7 døgn'],['month','Måned · 30 døgn']];
const option=(value,label,selected)=>'<option value="'+html(value)+'"'+(value===selected?' selected':'')+'>'+html(label)+'</option>';
export function refinementHint(state,{sale=false,confirmed=true}={}){
 if(!sale&&!confirmed)return 'Velg bruksområde for å sammenligne leiepriser.';
 if(state.sort==='default')return '';
 return sale?'Sorterer etter kjøpsprisen som vises på kortet. Pris på forespørsel vises sist.':'Sammenligner '+({day:'døgnpris',week:'ukepris for 7 døgn',month:'månedspris for 30 døgn'}[state.period])+'. Prisene gjelder innholdet på hvert kort. Priser som ikke kan sammenlignes, vises sist.';
}
export function catalogRefinementsMarkup({state={},products=[],sale=false,confirmed=true}={}){
 state=normalizeRefinement(state);const id=sale?'saleRefinements':'rentalRefinements',hint=refinementHint(state,{sale,confirmed});
 return '<div id="'+id+'" class="catalog-refinements" role="group" aria-label="Farge og sortering"><label>Farge<select data-refinement="color">'+option('','Alle farger',state.color)+availableColors(products,state.color).map(c=>option(c.id,c.label,state.color)).join('')+'</select></label><label>Sorter etter<select data-refinement="sort"'+(!sale&&!confirmed?' disabled':'')+'>'+[['default','Anbefalt rekkefølge'],['price-asc','Pris: lav til høy'],['price-desc','Pris: høy til lav']].map(([value,label])=>option(value,label,state.sort)).join('')+'</select></label>'+(!sale?'<label data-refinement-period'+(state.sort==='default'?' hidden':'')+'>Sammenlign leieperiode<select data-refinement="period"'+(!confirmed?' disabled':'')+'>'+periods.map(([value,label])=>option(value,label,state.period)).join('')+'</select></label>':'')+'<p class="hint catalog-refinement-hint" role="status"'+(hint?'':' hidden')+'>'+html(hint)+'</p></div>';
}
// Keep the controls themselves mounted so keyboard focus survives filtering.
export function mountCatalogRefinements(anchor,options,onChange){
 if(!anchor)return;const doc=anchor.ownerDocument,id=options.sale?'saleRefinements':'rentalRefinements';let host=doc.getElementById(id);
 if(!host){anchor.insertAdjacentHTML('afterend',catalogRefinementsMarkup(options));host=doc.getElementById(id);}
 const state=normalizeRefinement(options.state),color=host.querySelector('[data-refinement="color"]');
 const choices=option('','Alle farger',state.color)+availableColors(options.products||[],state.color).map(c=>option(c.id,c.label,state.color)).join('');
 if(color.innerHTML!==choices)color.innerHTML=choices;
 for(const field of host.querySelectorAll('[data-refinement]')){field.value=state[field.dataset.refinement];if(field.dataset.refinement!=='color')field.disabled=!options.sale&&!options.confirmed;}
 const period=host.querySelector('[data-refinement-period]');if(period)period.hidden=state.sort==='default';
 const hint=host.querySelector('.catalog-refinement-hint'),text=refinementHint(state,options);hint.textContent=text;hint.hidden=!text;
 host.onchange=event=>{const key=event.target.dataset.refinement;if(!key)return;onChange(normalizeRefinement({...state,[key]:event.target.value}));};
}
