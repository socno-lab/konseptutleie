import {rentalModuleInitialState,rentalModuleSurface,rentalWallSurface} from '../public/rental-builder-options.js?v=choicesfirst20261119';
import {rentalProductOptions} from '../public/rental-product-options.js?v=choicesfirst20261119';
import {purchaseProductOptionsMarkup,purchaseModuleState} from '../public/purchase-product-options.js?v=choicesfirst20261119';
import {productPageUrl} from '../public/product-page-model.js';
import {applyRentalScope} from '../public/rental-pricing-model.js?v=fest20261114';
import {productPeriodMarkup} from '../public/product-period-markup.js';
import {responsiveImageAttributes} from '../public/media-image.js';
import {modulePhotoPreview} from '../public/module-photo-preview.js';
import {moduleStartCandidates} from '../public/module-builder-settings.js';
import {modulePreset,moduleConfiguration} from '../public/catalog-model.js';
import {sofaCardConfiguration} from '../public/sofa-card-model.js';
import {frameSketch,presetFrames} from '../public/wall-model.js';
import {productIllustrationText} from '../public/product-illustration.js';
import {kiDisclosure,isKiPhoto} from '../public/image-provenance.js?v=fest20261114';
import {productSummary,productUnitPrice} from '../public/product-summary.js?v=vat20261115b';
import {detailImageAttributes} from '../public/product-image-loading.js';
import {getSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=fest20261114';
import {rentalStatusBadge,isRentedOut} from '../public/rental-status.js';
import {salesEnabled} from '../public/sales-model.js?v=fest20261114';
import {initialProductCarousel} from '../public/product-carousel-markup.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function productOverview(model,products,settings){
 const p=model.product,buy=model.buy,usage=model.productUsage||{scope:'messe',confirmed:false};
 const scoped=scope=>({...p,...(p.rentalRates?.[scope]||{})});
 const previous=getSiteSettings();configureSiteSettings(settings);
 try{
  const rentalProducts=applyRentalScope((products.some(x=>x.id===p.id)?products:[...products,p]).filter(x=>x.rentalEnabled!==false),usage.scope),rentalContext={products:rentalProducts,purpose:model.productPurpose,rentalScope:usage.scope,rentalScopeConfirmed:usage.confirmed};
  if(!buy&&p.moduleSeries)return rentalModuleSurface(rentalContext,rentalModuleInitialState(p.moduleSeries,rentalProducts));
  if(!buy&&p.wallGroup)return rentalWallSurface(rentalContext,p.id);
  const photos=[p.image,...(p.gallery||[])].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);
  const special=!!(p.moduleSeries||p.wallGroup),source=special?'':p.image;
  let configuration='';
  if(p.moduleSeries){
   const modules=products.filter(x=>x.moduleSeries===p.moduleSeries&&x.active&&!x.deletedAt&&(!buy||salesEnabled(x)));
   const fallback=modulePreset(modules,...(modules.every(x=>x.moduleRole==='middle')?[0,2]:[2,0]));
   const selection=buy?Object.fromEntries(modules.map(x=>[x.id,x.moduleRequired?1:x.id===p.id?1:0])):moduleStartCandidates(modules,sofaCardConfiguration(modules)?.selection,fallback).find(value=>value&&moduleConfiguration(p.moduleSeries,value,{},products).valid)||{};
   configuration=(buy?purchaseModuleState(p,products).previewHtml:modulePhotoPreview(modules,selection)).replace(/<button\b[\s\S]*?<\/button>/g,'');
   if(!buy)configuration=configuration.replaceAll('Valgt oppsett','Startoppsett');
  }else if(p.wallGroup)configuration=frameSketch(p.wallFrames?.length?p.wallFrames:presetFrames('gallery'),'Skisse: '+p.name);
  const carousel=photos.length>1?initialProductCarousel(buy&&p.moduleSeries?'Valgt oppsett':'1 / '+photos.length):'';
  const media=source?'<div class="initial-product-image'+(photos.length>1?' has-gallery':'')+'"><img data-initial-product-photo src="'+esc(source)+'" '+detailImageAttributes(source)+' alt="'+esc(p.name)+'">'+(!buy?rentalStatusBadge(isRentedOut(p)):'')+carousel+'</div>':buy&&p.moduleSeries?'<div class="initial-product-image initial-sale-module sale-image-stage'+(photos.length>1?' has-gallery':'')+'"><div class="sale-module-preview">'+configuration+'</div>'+carousel+'</div>':special?'<div class="initial-product-image initial-product-configuration">'+configuration+'</div>':'<div class="initial-product-image"></div>';
  const text=buy?'':productIllustrationText(p,products),ki=!buy&&isKiPhoto(p.image);
  const caption=text||ki?'<p class="illustration-note"><strong>'+esc(ki?kiDisclosure:'Bildet viser et eksempel')+'</strong>'+(text?'<span>'+esc(text)+'</span>':'')+'</p>':'';
  const gallery=(!special||buy&&p.moduleSeries)&&(buy?photos.length>0:photos.length>1)?'<div class="'+(buy?'sale-gallery':'product-gallery')+'" data-initial-gallery'+(buy?'':' role="group" aria-label="Produktbilder"')+'>'+photos.map((src,i)=>(buy?'':'<div class="gallery-item">')+'<button type="button" '+(buy?'data-photo="'+esc(src)+'" aria-label="Vis produktbilde"':'data-product-photo="'+esc(src)+'" aria-label="Vis bilde '+(i+1)+' av '+esc(p.name)+'" aria-pressed="'+(i===0)+'"')+'><img src="'+esc(src)+'" '+responsiveImageAttributes(src,'68px')+' alt="" loading="'+(i<8?'eager':'lazy')+'" decoding="async"></button>'+(buy?'':'</div>')).join('')+'</div>':'';
  const rentalOptions=(scope,confirmed)=>rentalProductOptions({products:applyRentalScope(products.filter(x=>x.rentalEnabled!==false),scope),purpose:model.productPurpose,rentalScope:scope,rentalScopeConfirmed:confirmed}).productOptions({...p,...(p.rentalRates?.[scope]||{})},{initial:true});
  const form=buy?purchaseProductOptionsMarkup(p,products,{initial:true,rentalHref:p.rentalEnabled===false?'':productPageUrl(p.id,'rent')}):special?'':rentalOptions(usage.scope,usage.confirmed);
  const period=buy||special?'':'<section class="rental-options" data-product-rental-period aria-label="Leieperiode for produktet">'+productPeriodMarkup()+'</section>';
  const options={buy,confirmed:usage.confirmed,purpose:model.productPurpose,category:model.productCategory};
  const summary=productSummary(buy?p:scoped(usage.scope),products,options);
  const prices=buy?'':['standard','messe'].map(scope=>'<template id="initialProductPrice-'+scope+'">'+productUnitPrice(scoped(scope),{confirmed:true})+'</template>').join('');
  return '<section id="initialProductOverview" class="'+(buy?'sale-dialog':'product-mode product-scroll')+'" data-product-id="'+esc(p.id)+'" aria-label="Produktinformasjon"><div class="product-page-media">'+media+gallery+caption+'</div><div class="product-page-information">'+summary+period+'<div data-initial-product-options inert>'+form+'</div></div></section>'+prices+(!buy&&!special?['standard','messe'].map(scope=>'<template id="initialProductOptions-'+scope+'">'+rentalOptions(scope,true)+'</template>').join(''):'');
 }finally{configureSiteSettings(previous);}
}
