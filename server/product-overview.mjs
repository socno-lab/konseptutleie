import {productPeriodMarkup} from '../public/product-period-markup.js';
import {responsiveImageAttributes} from '../public/media-image.js';
import {modulePhotoPreview} from '../public/module-photo-preview.js';
import {moduleStartCandidates} from '../public/module-builder-settings.js';
import {modulePreset,moduleConfiguration} from '../public/catalog-model.js';
import {sofaCardConfiguration} from '../public/sofa-card-model.js';
import {frameSketch,presetFrames} from '../public/wall-model.js';
import {productIllustrationText} from '../public/product-illustration.js';
import {kiDisclosure,isKiPhoto} from '../public/image-provenance.js?v=optionimages20261108';
import {productSummary,productUnitPrice} from '../public/product-summary.js?v=optionimages20261108';
import {detailImageAttributes} from '../public/product-image-loading.js';
import {getSiteSettings,configureSiteSettings} from '../public/site-settings.js?v=optionimages20261108';
import {rentalStatusBadge,isRentedOut} from '../public/rental-status.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function productOverview(model,products,settings){
 const p=model.product,buy=model.buy,usage=model.productUsage||{scope:'messe',confirmed:false};
 const scoped=scope=>({...p,...(p.rentalRates?.[scope]||{})});
 const previous=getSiteSettings();configureSiteSettings(settings);
 try{
  const photos=[p.image,...(p.gallery||[])].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i);
  const special=!!(p.moduleSeries||p.wallGroup),source=special?'':p.image;
  let configuration='';
  if(p.moduleSeries){
   const modules=products.filter(x=>x.moduleSeries===p.moduleSeries&&x.active&&!x.deletedAt);
   const fallback=modulePreset(modules,...(modules.every(x=>x.moduleRole==='middle')?[0,2]:[2,0]));
   const selection=buy?Object.fromEntries(modules.map(x=>[x.id,x.moduleRequired?1:x.id===p.id?1:0])):moduleStartCandidates(modules,sofaCardConfiguration(modules)?.selection,fallback).find(value=>value&&moduleConfiguration(p.moduleSeries,value,{},products).valid)||{};
   configuration=modulePhotoPreview(modules,selection).replaceAll('Valgt oppsett','Startoppsett').replace(/<button\b[\s\S]*?<\/button>/g,'');
  }else if(p.wallGroup)configuration=frameSketch(p.wallFrames?.length?p.wallFrames:presetFrames('gallery'),'Skisse: '+p.name);
  const media=source?'<div class="initial-product-image'+(photos.length>1?' has-gallery':'')+'"><img data-initial-product-photo src="'+esc(source)+'" '+detailImageAttributes(source)+' alt="'+esc(p.name)+'">'+(!buy?rentalStatusBadge(isRentedOut(p)):'')+(photos.length>1?'<div class="initial-gallery-count" aria-hidden="true">1 / '+photos.length+'</div>':'')+'</div>':special?'<div class="initial-product-image initial-product-configuration">'+configuration+'</div>':'<div class="initial-product-image"></div>';
  const text=buy?'':productIllustrationText(p,products),ki=!buy&&isKiPhoto(p.image);
  const caption=text||ki?'<p class="illustration-note"><strong>'+esc(ki?kiDisclosure:'Bildet viser et eksempel')+'</strong>'+(text?'<span>'+esc(text)+'</span>':'')+'</p>':'';
  const gallery=!special&&(buy?photos.length>0:photos.length>1)?'<div class="'+(buy?'sale-gallery':'product-gallery')+'" data-initial-gallery'+(buy?'':' role="group" aria-label="Produktbilder"')+'>'+photos.map((src,i)=>(buy?'':'<div class="gallery-item">')+'<button type="button" '+(buy?'data-photo="'+esc(src)+'" aria-label="Vis produktbilde"':'data-product-photo="'+esc(src)+'" aria-label="Vis bilde '+(i+1)+' av '+esc(p.name)+'" aria-pressed="'+(i===0)+'"')+'><img src="'+esc(src)+'" '+responsiveImageAttributes(src,'68px')+' alt="" loading="'+(i<8?'eager':'lazy')+'" decoding="async"></button>'+(buy?'':'</div>')).join('')+'</div>':'';
  const period=buy||special?'':'<section class="rental-options" data-product-rental-period aria-label="Leieperiode for produktet">'+productPeriodMarkup()+'</section>';
  const options={buy,confirmed:usage.confirmed,purpose:model.productPurpose,category:model.productCategory};
  const summary=productSummary(buy?p:scoped(usage.scope),products,options);
  const prices=buy?'':['standard','messe'].map(scope=>'<template id="initialProductPrice-'+scope+'">'+productUnitPrice(scoped(scope),{confirmed:true})+'</template>').join('');
  return '<section id="initialProductOverview" data-product-id="'+esc(p.id)+'" aria-label="Produktinformasjon"><div class="product-page-media">'+media+gallery+caption+'</div><div class="product-page-information">'+summary+period+'<p class="hint" role="status">Gjør valg klare …</p></div></section>'+prices;
 }finally{configureSiteSettings(previous);}
}
