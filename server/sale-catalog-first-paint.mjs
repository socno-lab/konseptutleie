import {catalogRefinementsMarkup} from '../public/catalog-refinements.js?v=compactsort20261119b';
import {saleCatalogView} from '../public/sale-catalog-view.js?v=choicesfirst20261119';
import {getSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=fest20261114';
import {renderArrowIcons} from './arrow-icons.mjs';
import {pricePickerContent} from '../public/price-display-markup.js';
import {catalogPaginationMarkup} from '../public/catalog-pagination.js?v=choicesfirst20261119';
import {salesEnabled} from '../public/sales-model.js?v=fest20261114';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function saleCatalogFirstPaint(html,model,products,settings){
 const previous=getSiteSettings();configureSiteSettings(settings);
 try{
  const view=saleCatalogView({products,category:model.saleCategory,tableFilter:model.saleSubcategory,query:model.saleQuery,refinement:model.catalogRefinement});
  const saleProducts=products.filter(p=>p.active&&!p.deletedAt&&salesEnabled(p));
  html=html.replace('<div class="catalog-tools">',()=>'<div class="price-display-picker" role="group" aria-label="Vis priser" data-price-location="purchase-catalog">'+pricePickerContent()+'</div><div class="catalog-tools">');
  html=html.replace(/(<div[^>]*id="saleCategories"[^>]*>)[\s\S]*?<\/div>/,(_,open)=>open+view.categoryHtml+'</div>');
  html=html.replace('<input id="saleSearch"',()=>'<input value="'+escape(view.query)+'" id="saleSearch"');
  html=html.replace(/<p id="saleStatus"[^>]*>[\s\S]*?<\/p>/,()=>'<div id="saleTableTypes" class="catalog-subcategories" role="group" aria-label="Underkategorier"'+(view.types.length?'':' hidden')+'>'+view.subcategoryHtml+'</div><div class="catalog-sort-row"><p id="saleStatus" class="sale-status" role="status">'+escape(view.status)+'</p>'+catalogRefinementsMarkup({state:model.catalogRefinement,products:saleProducts,sale:true})+'</div>');
  html=html.replace('<div class="sale-grid" id="saleProducts"></div>',()=>'<div class="sale-grid" id="saleProducts">'+renderArrowIcons(view.shown.slice(0,24).map(view.renderItem).join(''))+view.tailHtml+'</div>'+catalogPaginationMarkup({id:'saleProducts',total:view.shown.length,visibleCount:Math.min(24,view.shown.length)}));
  const snapshot=JSON.stringify({products,settings,...(typeof model.saleCanAdmin==='boolean'?{canAdmin:model.saleCanAdmin}:{})}).replace(/</g,'\\u003c');
  return html.replace('</main>',()=>'</main><script type="application/json" id="initialSaleCatalog">'+snapshot+'</script>');
 }finally{configureSiteSettings(previous);}
}
