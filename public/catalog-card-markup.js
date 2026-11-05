import {frameCatalogMarkup} from './catalog-image-framing.js?v=frames20261105';
import {favoriteCardButton} from './card-favorite-markup.js?v=hearts20261105';
// Stable key survives arrow icons, favorite controls and product-link hydration.
export function renderCatalogCard(card,index){
 let markup=frameCatalogMarkup(card.render(),card.product);
 markup=markup.replace(/<article([^>]*)>/,(_,attrs)=>'<article'+(/class="/.test(attrs)?attrs.replace('class="','class="has-card-favorite '):attrs+' class="has-card-favorite"')+'>');
 markup=markup.replace(/<\/article>$/,()=>favoriteCardButton(card.product?.name||'')+'</article>');
 if(index<4)markup=markup.replace(/loading="lazy"/g,'loading="eager"');
 if(index===0)markup=markup.replace(/<img\b/,'<img fetchpriority="high"');
 let hash=2166136261;for(let i=0;i<markup.length;i++)hash=Math.imul(hash^markup.charCodeAt(i),16777619);
 return markup.replace('<article','<article data-catalog-render="'+(hash>>>0).toString(16)+'"');
}
export function readInitialCatalog(doc){
 const node=doc.getElementById('initialRentalCatalog');if(!node)return null;
 try{const data=JSON.parse(node.textContent);return Array.isArray(data.products)&&data.settings?data:null;}catch{return null;}
}
