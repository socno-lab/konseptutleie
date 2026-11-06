import {responsiveImageAttributes} from '../public/media-image.js';
import {detailImageSizes} from '../public/product-image-loading.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function productFirstPaint(html,model,products,settings){
 if(!model.product||model.status!==200)return html;
 const p=model.product;
 // Modular configurations can select a different composition in the browser.
 // Do not preload an unrelated single-module image for these pages.
 if(p.image&&!p.moduleSeries&&!p.wallGroup){
  const responsive=responsiveImageAttributes(p.image,detailImageSizes).replace('srcset=','imagesrcset=').replace('sizes=','imagesizes=');
  html=html.replace('</head>',()=>'<link rel="preload" as="image" href="'+escape(p.image)+'" '+responsive+' fetchpriority="high"></head>');
 }
 const data=JSON.stringify({products,settings,...(typeof model.productCanAdmin==='boolean'?{canAdmin:model.productCanAdmin}:{})}).replace(/</g,'\\u003c');
 return html.replace('</main>',()=>'</main><script type="application/json" id="initialProductCatalog">'+data+'</script>');
}
