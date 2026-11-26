import {frameCatalogMarkup} from './catalog-image-framing.js?v=motif20261126';
import {favoriteCardButton} from './card-favorite-markup.js?v=hearts20261105';
import {stableRentalPeriodMarkup} from './rental-period-slots.js?v=choicesfirst20261119';
// Stable key survives arrow icons, favorite controls and product-link hydration.
export function renderCatalogCard(card,index){
 let markup=frameCatalogMarkup(card.render(),card.product);
 markup=markup.replace(/<article([^>]*)>/,(_,attrs)=>'<article'+(/class="/.test(attrs)?attrs.replace('class="','class="has-card-favorite '):attrs+' class="has-card-favorite"')+'>');
 markup=markup.replace(/<\/article>$/,()=>favoriteCardButton(card.product?.name||'')+'</article>');
 if(index<4)markup=markup.replace(/loading="lazy"/g,'loading="eager"');
 if(index===0)markup=markup.replace(/<img\b/,'<img fetchpriority="high"');
 const identity=stableRentalPeriodMarkup(markup);
 let hash=2166136261;for(let i=0;i<identity.length;i++)hash=Math.imul(hash^identity.charCodeAt(i),16777619);
 return markup.replace('<article','<article data-catalog-render="'+(hash>>>0).toString(16)+'"');
}
export function readInitialCatalog(doc){
 const node=doc.getElementById('initialRentalCatalog')||doc.getElementById('initialSaleCatalog')||doc.getElementById('initialProductCatalog')||doc.getElementById('initialSiteCatalog');if(!node)return null;
 try{const data=JSON.parse(node.textContent);return Array.isArray(data.products)&&data.settings?data:null;}catch{return null;}
}
