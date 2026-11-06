import {productOverview} from './product-overview.mjs';
import {rentalScopeMarkup} from '../public/rental-scope-markup.js';
import {rentalUsageLabels} from '../public/rental-usage-model.js';
import {safeCatalogReturn} from '../public/product-page-model.js';
import {responsiveImageAttributes} from '../public/media-image.js';
import {detailImageSizes} from '../public/product-image-loading.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function productFirstPaint(html,model,products,settings){
 if(!model.product||model.status!==200)return html;
 const p=model.product;
 const returnTo=safeCatalogReturn(model.productReturn,model.buy?'buy':'rent','https://konseptuell.no');
 const mobile=(scope,confirmed)=>'<div class="mobile-catalog-usage mobile-catalog-only"><span id="mobileCatalogUsageLabel">'+(confirmed?rentalUsageLabels[scope]:'Velg bruk for å se leiepriser')+'</span><button type="button" id="mobileChangeUsage" aria-haspopup="dialog">'+(confirmed?'Endre':'Velg bruk')+'</button></div>';
 const scopeContents=(scope,confirmed)=>mobile(scope,confirmed)+'<div class="product-pricing-desktop">'+rentalScopeMarkup(scope,confirmed)+'</div>';
 // Move the controls out of the hidden catalogue before the browser paints.
 html=html.replace(/<div class="mobile-catalog-usage mobile-catalog-only">[\s\S]*?<\/button><\/div>/,'').replace('<div id="catalogPricingScope" class="rental-pricing-scope"></div>','');
 const initial=model.productUsage||{scope:'messe',confirmed:false};
 const scope=model.buy?'':'<div id="catalogPricingScope" class="rental-pricing-scope product-pricing-scope">'+scopeContents(initial.scope,initial.confirmed)+'</div>'+['standard','messe'].map(key=>'<template id="initialScope-'+key+'">'+scopeContents(key,true)+'</template>').join('');
 const host='<div id="productPageHost"><nav class="product-breadcrumbs" aria-label="Brødsmuler"><a href="/">Hjem</a> / <a class="product-page-back" href="'+escape(returnTo)+'">← Tilbake til utvalget</a></nav>'+scope+'<p id="productPageStatus" role="status" hidden></p>'+productOverview(model,products,settings)+'</div><script src="/product-shell-bootstrap.js?v=sitefirst20261106"></script>';
 html=html.replace('</head>','<link rel="preload" as="script" href="/product-shell-bootstrap.js?v=sitefirst20261106"></head>').replace('<main>',()=>'<main>'+host);

 // Modular configurations can select a different composition in the browser.
 // Do not preload an unrelated single-module image for these pages.
 if(p.image&&!p.moduleSeries&&!p.wallGroup){
  const responsive=responsiveImageAttributes(p.image,detailImageSizes).replace('srcset=','imagesrcset=').replace('sizes=','imagesizes=');
  html=html.replace('</head>',()=>'<link rel="preload" as="image" href="'+escape(p.image)+'" '+responsive+' fetchpriority="high"></head>');
 }
 const data=JSON.stringify({products,settings,...(typeof model.productCanAdmin==='boolean'?{canAdmin:model.productCanAdmin}:{})}).replace(/</g,'\\u003c');
 return html.replace('</main>',()=>'</main><script type="application/json" id="initialProductCatalog">'+data+'</script>');
}
