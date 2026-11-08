import {dimensionsMarkup} from './product-dimensions.js?v=fest20261108b';
import {rentalStockMarkup} from './rental-stock.js?v=stockcount20261108';
import {saleUnitPrice} from './sales-model.js?v=fest20261108b';
import {purchaseProductText} from './purchase-copy.js?v=copy20261028';
import {isServiceOffering} from './service-model.js?v=launch20261024';
import {isTablewareRental} from './catalog-model.js?v=longrent20261026';
import {categoryLabel} from './site-settings.js?v=fest20261108b';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('nb-NO').format(n)+' kr';
export const isCustomProduct=p=>!!p?.isPackage&&p.components?.length>0;
export function productUnitPrice(p,{buy=false,confirmed=true}={}){
 if(p.moduleSeries)return '<p class="hint">Velg oppsett for å se samlet pris.</p>';
 if(buy){const price=saleUnitPrice(p);return '<p class="sale-detail-price">'+(price===null?'Pris på forespørsel':new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK',maximumFractionDigits:2}).format(price))+' <small>inkl. mva.</small></p>';}
 if(!confirmed)return '<p class="rental-price-pending">Velg bruk for å se leiepris</p>';
 if(p.priceOnRequest||!Number.isFinite(p.price)||p.price<=0)return '<p class="quote-only"><strong>Pris på forespørsel</strong><small>Du får et samlet, uforpliktende tilbud.</small></p>';
 const unit=p.isProposal?'per person':p.isPackage?'per pakke':'per enhet';
 if(['fixed','period'].includes(p.rentalPricingMode))return '<p class="cart-period-price"><strong>'+money(p.price)+(p.rentalPricingMode==='fixed'?' · fastpris':' / påbegynte 30 dager')+'</strong><span>'+esc(p.rentalPricingMode==='fixed'?(p.servicePeriod||'For sesongen'):unit)+' · inkl. mva.</span></p>';
 return '<div class="rate-grid">'+[['Døgn',p.price],['Uke · 7 døgn',p.weekPrice??p.price*5],[p.stylingContinuation?'Første 30 dager':'Måned · 30 døgn',p.monthPrice??p.price*15]].map(([label,value])=>'<div><span>'+label+'</span><strong>'+money(value)+'</strong></div>').join('')+'</div><p class="rate-caption">'+(p.stylingContinuation?'Etter 30 dager: halv pris på videre leie.<br>':'')+'Leiepriser '+unit+', uten tilvalg, inkl. mva.</p>';
}
export function productSummary(p,products,{buy=false,confirmed=true,purpose='alle',category='Alle'}={}){
 const service=isServiceOffering(p),tableware=!buy&&isTablewareRental(p,products),bed=p.id==='obj_41926e1953e546398f78ac60eeaf68a3'||p.isPackage&&p.components?.some(c=>c.id==='obj_41926e1953e546398f78ac60eeaf68a3');
 const custom=!buy&&isCustomProduct(p)&&p.components.every(c=>products.find(x=>x.id===c.id)?.isService===true);
 const eyebrow=buy?'KJØPE · '+(p.moduleSeries?'MODULSOFA':'NYTT PRODUKT'):(bed?'Senger':tableware?(category==='Pakker'&&purpose==='fest'?'Ferdige pakker':'Servise'):service?'Tjeneste':p.isPackage?'Ferdige pakker':categoryLabel(p.category))+' · '+(service?'LEVERES ETTER AVTALE':p.isExample===false?'UTLEIEPRODUKT':'EKSEMPELPRODUKT');
 return '<div data-product-summary="'+esc(p.id)+'"><p class="eyebrow">'+esc(eyebrow)+'</p><h1'+(buy?' id="saleDetailTitle"':'')+'>'+esc(p.moduleSeries||(tableware?'Servisepakke – sett sammen per person':p.name))+'</h1><p'+(buy?'':' class="product-measures"')+'>'+esc(p.moduleSeries?'Sett sammen modulene til ønsket størrelse og oppsett.':buy?purchaseProductText(p.material):p.material)+'</p>'+dimensionsMarkup(p)+(!buy?rentalStockMarkup(p,{detail:true,products}):'')+(custom?'<p>'+esc(p.description)+'</p>':'')+'<div data-product-unit-price>'+productUnitPrice(p,{buy,confirmed})+'</div></div>';
}
