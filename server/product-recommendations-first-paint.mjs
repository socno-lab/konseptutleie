import {recommendationSection} from '../public/product-recommendations.js?v=choicesfirst20261119';
import {applyRentalScope} from '../public/rental-pricing-model.js?v=fest20261114';
import {getSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=fest20261114';
import {productPageUrl,safeCatalogReturn} from '../public/product-page-model.js?v=launch20261024';
import {salesEnabled} from '../public/sales-model.js?v=fest20261114';

export function productRecommendationsFirstPaint(model,products,settings){
 const previous=getSiteSettings();configureSiteSettings(settings);
 try{
  const mode=model.buy?'buy':'rent',usage=model.productUsage||{scope:'messe',confirmed:false};
  const items=model.buy?products.filter(p=>p.active&&!p.deletedAt&&salesEnabled(p)):applyRentalScope(products.filter(p=>p.rentalEnabled!==false),usage.scope);
  const current=items.find(p=>!model.buy&&model.product.moduleSeries?p.moduleSeries===model.product.moduleSeries:p.id===model.product.id)||model.product;
  const context={...(!model.buy?{bruk:model.productPurpose||'alle',prisbruk:usage.confirmed?usage.scope:'',basket:{}}:{}),returnTo:safeCatalogReturn(model.productReturn,mode,'https://konseptuell.no')};
  return recommendationSection(current,items,mode,context,id=>productPageUrl(id,mode,context));
 }finally{configureSiteSettings(previous);}
}
