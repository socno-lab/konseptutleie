// Periods can be projected before modules run. They do not change a card's
// identity; tariff data and every other part of its markup still do.
export function stableRentalPeriodMarkup(markup){
 return markup.replace(/<(div|p)\b[^>]*\bdata-rental-period="([^"]*)"[^>]*>[\s\S]*?<\/\1>/g,(_,tag,data)=>'<'+tag+' data-rental-period="'+data+'"></'+tag+'>');
}
export function syncRentalPeriodSlots(existing,incoming){
 const old=[...existing.querySelectorAll('[data-rental-period]')],next=[...incoming.querySelectorAll('[data-rental-period]')];
 for(let i=0;i<next.length;i++){
  if(!old[i])continue;
  if(old[i].className!==next[i].className)old[i].className=next[i].className;
  if(old[i].hidden!==next[i].hidden)old[i].hidden=next[i].hidden;
  if(old[i].innerHTML!==next[i].innerHTML)old[i].innerHTML=next[i].innerHTML;
 }
}
