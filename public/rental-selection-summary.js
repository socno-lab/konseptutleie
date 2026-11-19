import {priceMarkup} from './price-display-model.js?v=vatdefault20261116';
import {ratePlan} from './catalog-model.js?v=longrent20261026';
const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function textileUnit(p){return /tekstilpakke/i.test(p.name||'')?(/lenestol/i.test(p.name)?'stol':'sofa'):'';}
export function decorUnit(p){return /^Dekorpakke til /i.test(p.name||'')?(/hylle/i.test(p.name)?'hylle':'bord'):'';}
export function addonUnit(p){return textileUnit(p)||decorUnit(p)||(/^Vase med kunstige blomster/i.test(p.name||'')?'vase':'');}
export function textilePriceLabel(p){return priceMarkup(p.price)+' per '+addonUnit(p)+' / påbegynte 30 dager · inkl. mva.';}
export function addonPrice(p){if(addonUnit(p)&&p.rentalPricingMode==='period'&&!p.priceOnRequest)return textilePriceLabel(p);if(p.rentalPricingMode==='period'&&!p.priceOnRequest)return '+ '+priceMarkup(p.price)+' per pakke inntil 30 dager · inkl. mva. Ny pris per påbegynte 30 dager.';return p.priceOnRequest?'Pris på forespørsel':`+${priceMarkup(p.price)}/døgn per pakke`;}
export function rentalSelectionSummaryMarkup(quote,extras,{days=null,products=[],confirmed=false}={}){
 const rentalScopeConfirmed=confirmed;
 let rental='';
  rental='<p class="selection-total-label">'+(days?'Beregnet leiesum for dette produktet'+(quote.hasExtras?' med tilvalg':''):quote.hasExtras?'Valgte tilvalg':'Beregnet leiesum for dette produktet')+'</p>';
  if(!rentalScopeConfirmed)rental+='<p class="rental-price-pending">Velg bruk for å se leiepris</p>';
  else {
   for(const [id,count] of Object.entries(extras||{}).filter(([,q])=>q>0)){
    const extra=products.find(p=>p.id===id);if(!extra)continue;
    const plan=extra.priceOnRequest?null:ratePlan(extra,1,products);
    const label=!plan?'Pris på forespørsel':extra.rentalPricingMode==='period'?priceMarkup(plan.total*count)+' per påbegynte 30 dager':extra.rentalPricingMode==='fixed'?priceMarkup(plan.total*count)+' · fastpris':addonPrice(extra);
    rental+='<p class="hint">'+count+' × '+html(extra.name)+'<br>'+label+'</p>';
   }
   if(days)rental+=quote.selectedTotal!==null?'<div class="rental-period-price"><span>Valgt leieperiode · '+days+' døgn</span><strong>'+priceMarkup(quote.selectedTotal)+'</strong></div>':'<p class="hint">Samlet pris avklares i tilbudet. Valgte produkter eller tilvalg omfatter pris på forespørsel.</p>';
   else rental+='<p class="hint">Velg leieperiode over for å se beregnet leiesum. Produktets døgn-, uke- og månedspriser over er uten tilvalg.</p>';
   rental+='<p class="rate-caption">Inkl. mva.'+(quote.hasPeriodExtras?' Tilvalg belastes én gang per påbegynte 30 dager, uansett antall leiedøgn i perioden.':'')+' Transport kommer i tillegg der den ikke er inkludert. Tilgjengelighet bekreftes i tilbudet.</p>';
  }
 return rental;
}
