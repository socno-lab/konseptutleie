import {productRecommendationsFirstPaint} from './product-recommendations-first-paint.mjs';
import {productOverview} from './product-overview.mjs';
import {rentalScopeMarkup,rentalPurposeLabel} from '../public/rental-scope-markup.js?v=purposeinline20261122';
import {rentalUsageLabels} from '../public/rental-usage-model.js?v=fest20261114';
import {safeCatalogReturn} from '../public/product-page-model.js';
import {responsiveImageAttributes} from '../public/media-image.js';
import {detailImageSizes} from '../public/product-image-loading.js';
import {pricePickerContent} from '../public/price-display-markup.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function productFirstPaint(html,model,products,settings){
 if(!model.product||model.status!==200)return html;
 const p=model.product;
 const occasionSelect=html.match(/<select\b[^>]*\bid="occasion"[^>]*>([\s\S]*?)<\/select>/)?.[1]||'';
 const decodeOption=value=>value.replace(/<[^>]*>/g,'').replace(/&(?:amp|quot|#39|lt|gt);/g,entity=>({'&amp;':'&','&quot;':'"','&#39;':"'",'&lt;':'<','&gt;':'>'}[entity])).trim();
 const occasionChoices=[...occasionSelect.matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)].map(([,attrs,label])=>decodeOption(attrs.match(/\bvalue="([^"]*)"/)?.[1]??label));
 const data=JSON.stringify({products,settings,occasionChoices,...(typeof model.productCanAdmin==='boolean'?{canAdmin:model.productCanAdmin}:{})}).replace(/</g,'\\u003c');
 const snapshot='<script type="application/json" id="initialProductCatalog">'+data+'</script>';
 // The first response owns the builder's real IDs; runtime adopts that surface.
 if(!model.buy&&(p.moduleSeries||p.wallGroup)){const id=p.moduleSeries?'modules':'wall';html=html.replace(new RegExp('<dialog id="'+id+'"[\\s\\S]*?<\\/dialog>'),'');}
 const returnTo=safeCatalogReturn(model.productReturn,model.buy?'buy':'rent','https://konseptuell.no');
 const mobile=(scope,confirmed)=>'<div class="mobile-catalog-usage mobile-catalog-only"><span id="mobileCatalogUsageLabel">'+(confirmed?rentalPurposeLabel(model.productPurpose,scope):'Velg formål for å se leiepriser')+'</span><button type="button" id="mobileChangeUsage" aria-haspopup="dialog">'+(confirmed?'Endre formål':'Velg formål')+'</button></div>';
 const scopeContents=(scope,confirmed)=>mobile(scope,confirmed)+'<div class="product-pricing-desktop">'+rentalScopeMarkup(scope,confirmed,model.productPurpose)+'</div>';
 // Move the controls out of the hidden catalogue before the browser paints.
 html=html.replace(/<div class="mobile-catalog-usage mobile-catalog-only">[\s\S]*?<\/button><\/div>/,'').replace('<div id="catalogPricingScope" class="rental-pricing-scope"></div>','');
 const initial=model.productUsage||{scope:'messe',confirmed:false};
 const scope=model.buy?'':'<div id="catalogPricingScope" class="rental-pricing-scope product-pricing-scope">'+scopeContents(initial.scope,initial.confirmed)+'</div>'+['standard','messe'].map(key=>'<template id="initialScope-'+key+'">'+scopeContents(key,true)+'</template>').join('');
 // Keep the purchase picker outside the temporary overview: the live controller
 // finds it by location and leaves it in place when that overview is replaced.
 const picker=model.buy?'<div class="price-display-picker" role="group" aria-label="Vis priser" data-price-location="purchase-product">'+pricePickerContent()+'</div>':'';
 const host='<div id="productPageHost"><nav class="product-breadcrumbs" aria-label="Brødsmuler"><a href="/">Hjem</a> / <a class="product-page-back" href="'+escape(returnTo)+'">← Tilbake til utvalget</a></nav>'+scope+picker+'<p id="productPageStatus" role="status" hidden></p>'+productOverview(model,products,settings)+productRecommendationsFirstPaint(model,products,settings)+'</div><script src="/product-shell-bootstrap.js?v=choicesfirst20261119"></script><span data-initial-product-ready hidden></span>';
 html=html.replace('</head>','<link rel="preload" as="script" href="/product-shell-bootstrap.js?v=choicesfirst20261119"></head>').replace('<main>',()=>'<main>'+snapshot+host);

 // Modular configurations can select a different composition in the browser.
 // Do not preload an unrelated single-module image for these pages.
 if(p.image&&!p.moduleSeries&&!p.wallGroup){
  const responsive=responsiveImageAttributes(p.image,detailImageSizes).replace('srcset=','imagesrcset=').replace('sizes=','imagesizes=');
  html=html.replace('</head>',()=>'<link rel="preload" as="image" href="'+escape(p.image)+'" '+responsive+' fetchpriority="high"></head>');
 }
 return html;
}
