import {catalogRefinementsMarkup} from '../public/catalog-refinements.js?v=refine20261119';
import {rentalCatalogView} from '../public/rental-catalog-view.js?v=refine20261119';
import {renderCatalogCard} from '../public/catalog-card-markup.js';
import {applyRentalScope} from '../public/rental-pricing-model.js?v=fest20261114';
import {getSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=fest20261114';
import {countedSubcategoryButtons as subcategoryButtons} from '../public/catalog-filter-count.js?v=counts20261118';
import {rentalSubcategoryCounts} from '../public/catalog-filters.js';
import {renderArrowIcons} from './arrow-icons.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function catalogFirstPaint(html,model,catalogProducts,settings){
 const previous=getSiteSettings();configureSiteSettings(settings);
 try{
  const products=applyRentalScope(catalogProducts.filter(p=>p.rentalEnabled!==false),model.catalogUsage.scope);
  let filter=model.catalogCategory==='Modulsofaer'?'Sofaer':model.catalogCategory;
  if(!['Alle','Enkeltprodukter'].includes(filter)&&!settings.categories.some(c=>c.id===filter))filter='Alle';
  if(model.catalogUsage.purpose==='boligsalg'&&filter==='Pakker')filter='Enkeltprodukter';
  const view=rentalCatalogView({products,settings,purpose:model.catalogUsage.purpose,filter,tableFilter:model.catalogCategory==='Modulsofaer'?'Modulsofaer':model.catalogSubcategory,query:model.catalogQuery,rentalScopeConfirmed:model.catalogUsage.confirmed,refinement:model.catalogRefinement});
  html=html.replace(/(<p id="purposeResults"[^>]*>)[\s\S]*?<\/p>/,(_,open)=>open+escape(view.desktopCount)+'</p>');
  html=html.replace(/(<p id="mobileCatalogResults"[^>]*>)[\s\S]*?<\/p>/,(_,open)=>open+escape(view.mobileCount)+'</p>');
  const subcategories='<div id="rentalTableTypes" class="catalog-subcategories" role="group" aria-label="Underkategorier"'+(view.types.length?'':' hidden')+'>'+subcategoryButtons(view.types,view.tableFilter,filter,rentalSubcategoryCounts(products,settings,model.catalogUsage.purpose,filter,model.catalogQuery,view.types,model.catalogRefinement))+'</div>';
  html=html.replace('<p id="mobileCatalogResults"',()=>subcategories+catalogRefinementsMarkup({state:model.catalogRefinement,products:view.scoped.filter(p=>!p.addonOnly),confirmed:model.catalogUsage.confirmed})+'<p id="mobileCatalogResults"');
  html=html.replace('<aside class="catalog-request"','<aside hidden class="catalog-request"');
  if(filter==='Dekor'){html=html.replace(/(<p id="mobileCatalogResults"[^>]*>)[\s\S]*?<\/p>/,'$1</p>');}
  if(!view.count&&filter!=='Dekor')html=html.replace('id="empty" class="catalog-empty" hidden','id="empty" class="catalog-empty"');
  const first=view.orderedCards.slice(0,view.tailHtml?23:24).map(renderCatalogCard).join('')+view.tailHtml;
  html=html.replace('<div id="products" class="products"></div>',()=>'<div id="products" class="products">'+renderArrowIcons(first)+'</div>');
  html=html.replace(/(<p id="catalogStatus"[^>]*>)[\s\S]*?<\/p>/,'$1</p>');
  // Public snapshot only: same sanitized data used by /api/catalog, never admin rows.
  const data=JSON.stringify({products:catalogProducts,settings}).replace(/</g,'\\u003c');
  html=html.replace('</main>',()=>'</main><script type="application/json" id="initialRentalCatalog">'+data+'</script>');
  return html;
 }finally{configureSiteSettings(previous);}
}
