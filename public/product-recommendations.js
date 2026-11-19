import {priceMarkup} from './price-display-model.js?v=vatdefault20261116';
import {isRentedOut,rentalSeriesRentedOut,rentalStatusBadge} from './rental-status.js?v=rented20261029b';
import {sofaCardConfiguration} from './sofa-card-model.js?v=longrent20261026';
import {recommendProducts} from './recommendation-model.js?v=fest20261114';
import {saleUnitPrice} from './sales-model.js?v=fest20261114';
import {moduleCardImage,sofaCardArt} from './module-card-image.js?v=sofaframes20261025';
const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=priceMarkup;
export function recommendationContent(current,products,mode,context,link){
 const chosen=recommendProducts(current,products,mode,context);if(!chosen.length)return '';
 return '<h2 id="recommendationsTitle">'+(mode==='rent'?'Se lignende alternativer':'Du vil kanskje også like')+'</h2>'+(mode==='rent'?'<p class="rental-alternative-intro">Er ønsket produkt opptatt i leieperioden? Disse kan være gode alternativer. Vi bekrefter tilgjengelighet i tilbudet.</p>':'')+'<div class="recommendation-grid">'+chosen.map(p=>{const name=p.moduleSeries||p.name,modules=products.filter(x=>x.moduleSeries===p.moduleSeries),sofa=mode==='rent'&&p.moduleSeries&&p.category!=='Utemøbler',pictured=sofa?sofaCardConfiguration(modules):null;const image=mode==='rent'&&p.moduleSeries?moduleCardImage(modules):p.image;const unit=mode==='buy'?saleUnitPrice(p):sofa?pictured?.price??null:p.priceOnRequest?null:p.price;const label=mode==='rent'&&!context.prisbruk?'Velg bruk for å se leiepris':sofa&&!pictured?'Velg oppsett for å se leiepris':unit===null?'Pris på forespørsel':(p.moduleSeries&&!sofa?'Fra ':'')+money(unit)+(mode==='rent'?' / døgn':'');return `<article class="recommendation-card"><a class="recommendation-photo" href="${html(link(p.id))}" aria-label="Se ${html(name)}${mode==='rent'&&(p.moduleSeries?rentalSeriesRentedOut(modules):isRentedOut(p))?' – utleid nå':''}">${mode==='rent'?rentalStatusBadge(p.moduleSeries?rentalSeriesRentedOut(modules):isRentedOut(p)):''}${mode==='rent'&&sofaCardArt({...p,image})||`<img src="${html(image)}" alt="${html(name)}" loading="lazy">`}</a><h3><a href="${html(link(p.id))}">${html(name)}</a></h3><p class="recommendation-material">${html(sofa?pictured?'Oppsettet på bildet: '+pictured.count+' moduler':'Tilpass sofaoppsettet':p.material)}</p>${sofa&&pictured?'<p class="rate-caption">Leiepris for sofaen som vist, uten tilvalg.</p>':''}<p class="recommendation-price">${label}</p><small>${mode==='buy'?'Inkl. mva. · Nytt produkt':context.prisbruk?'Inkl. mva. · For valgt bruk':'Leie'}</small><a class="button dark" href="${html(link(p.id))}">${p.moduleSeries?'Bygg ditt oppsett':'Se produkt og velg antall'} <svg class="icon-arrow-up-right" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg></a></article>`;}).join('')+'</div>';
}

export function recommendationRenderKey(content){let hash=2166136261;for(let i=0;i<content.length;i++)hash=Math.imul(hash^content.charCodeAt(i),16777619);return (hash>>>0).toString(16);}
export function recommendationSection(current,products,mode,context,link){
 const content=recommendationContent(current,products,mode,context,link);
 return '<section id="productRecommendations" class="product-recommendations" aria-labelledby="recommendationsTitle" data-recommendation-render="'+recommendationRenderKey(content)+'"'+(content?'':' hidden')+'>'+content+'</section>';
}
export function renderRecommendations(host,current,products,mode,context,link){
 let section=host.querySelector('#productRecommendations');if(!section){section=document.createElement('section');section.id='productRecommendations';section.className='product-recommendations';section.setAttribute('aria-labelledby','recommendationsTitle');host.append(section);}
 const content=recommendationContent(current,products,mode,context,link),key=recommendationRenderKey(content);section.hidden=!content;
 // Retain initial links, image requests, focus and VAT-adjusted text when the
 // underlying recommendations have not changed during application startup.
 if(section.getAttribute?.('data-recommendation-render')===key)return;
 section.innerHTML=content;section.setAttribute?.('data-recommendation-render',key);
}
