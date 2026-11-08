import {saleCatalogView} from '../public/sale-catalog-view.js?v=optionimages20261108';
import {getSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=optionimages20261108';
import {renderArrowIcons} from './arrow-icons.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function saleCatalogFirstPaint(html,model,products,settings){
 const previous=getSiteSettings();configureSiteSettings(settings);
 try{
  const view=saleCatalogView({products,category:model.saleCategory,tableFilter:model.saleSubcategory,query:model.saleQuery});
  html=html.replace(/(<div[^>]*id="saleCategories"[^>]*>)[\s\S]*?<\/div>/,(_,open)=>open+view.categoryHtml+'</div>');
  html=html.replace('<input id="saleSearch"',()=>'<input value="'+escape(view.query)+'" id="saleSearch"');
  html=html.replace(/<p id="saleStatus"[^>]*>[\s\S]*?<\/p>/,()=>'<div id="saleTableTypes" class="catalog-subcategories" role="group" aria-label="Underkategorier"'+(view.types.length?'':' hidden')+'>'+view.subcategoryHtml+'</div><p id="saleStatus" class="sale-status" role="status">'+escape(view.status)+'</p>');
  html=html.replace('<div class="sale-grid" id="saleProducts"></div>',()=>'<div class="sale-grid" id="saleProducts">'+renderArrowIcons(view.shown.slice(0,24).map(view.renderItem).join(''))+view.tailHtml+'</div>');
  const snapshot=JSON.stringify({products,settings,...(typeof model.saleCanAdmin==='boolean'?{canAdmin:model.saleCanAdmin}:{})}).replace(/</g,'\\u003c');
  return html.replace('</main>',()=>'</main><script type="application/json" id="initialSaleCatalog">'+snapshot+'</script>');
 }finally{configureSiteSettings(previous);}
}
