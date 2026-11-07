import {renderHeaderTools} from './header-tools.mjs';
import {renderArrowIcons} from './arrow-icons.mjs';
import {renderMobileNavigation} from './mobile-navigation.mjs';
import {storefrontFontHref} from './storefront-font.mjs';
import {mkdir,rename,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const publicHtmlNames=['index.html','utvalg.html','anledning.html','kjop.html','leieprodukt.html','kjopsprodukt.html','kundeinfo.html'];
export async function prepareHtmlTemplates(base=root){
 // Hostinger serves existing public/*.html before Node. Keep dynamic templates outside that static root.
 const templates=path.join(base,'server','templates');await mkdir(templates,{recursive:true});
 for(const name of publicHtmlNames){try{await rename(path.join(base,'public',name),path.join(templates,name));}catch(error){if(error.code!=='ENOENT')throw error;await readFile(path.join(templates,name));}}
}
const styleVersions=new Map();
async function styleVersion(base){
 if(!styleVersions.has(base))styleVersions.set(base,readFile(path.join(base,'public','style.css')).then(css=>createHash('sha256').update(css).digest('hex').slice(0,12)).catch(error=>{styleVersions.delete(base);if(error.code!=='ENOENT')throw error;return ''; }));
 return styleVersions.get(base);
}
export async function readHtmlTemplate(name,base=root){
 if(!publicHtmlNames.includes(name))throw Error('Ukjent HTML-mal.');
 let html;try{html=await readFile(path.join(base,'server','templates',name),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;html=await readFile(path.join(base,'public',name),'utf8');}
 html=renderArrowIcons(renderHeaderTools(renderMobileNavigation(html)));
 html=html.replace('</head>','<link rel="icon" href="/favicon.ico?v=brand20261105" sizes="any"><link rel="icon" type="image/png" href="/favicon.png?v=brand20261105" sizes="96x96"><link rel="icon" type="image/svg+xml" href="/favicon.svg?v=brand20261105"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=brand20261105" sizes="180x180"></head>');
 // Occasion is an explicit form choice, never inferred from the catalogue category.
 html=html.replace(/(<select\b[^>]*\bid="occasion"[^>]*>)([\s\S]*?)(<\/select>)/g,(_,open,options,close)=>open+'<option value="" selected disabled>Velg anledning</option>'+options.replace(/\sselected(?:="[^"]*")?/g,'').replace('<option>Boligsalg</option>','<option>Boligfoto og visning</option>')+close);
 // Bootstrap and shared customer-information scripts must use this release's module URLs.
 html=html.replace(/(<script\b[^>]*\bsrc=["'])(\/[^"'?]+\.js)(?:\?[^"']*)?(["'])/g,(_,start,file,end)=>start+file+'?v='+ (["/admin/admin.js", "/admin/landing-settings.js", "/admin/page-editor.js", "/admin/recommendations.js", "/admin/settings.js", "/app.js", "/catalog-order-model.js", "/catalog-subcategories.js", "/catalog-usage-markup.js", "/catalog-usage-model.js", "/catalog-usage.js", "/content-page.js", "/customer-info.js", "/customer-information-content.js", "/decor-examples.js", "/delivery-model.js", "/header-catalog-model.js", "/header-tools.js", "/home-occasions.js", "/home-sections.js", "/image-provenance.js", "/image-viewer.js", "/messe-landing.js", "/mobile-navigation.js", "/occasion-landing-view.js", "/page-model.js", "/page-validation.js", "/product-pages.js", "/product-recommendations.js", "/product-summary.js", "/product-variants.js", "/production-landing.js", "/recommendation-model.js", "/rental-catalog-view.js", "/rental-pricing-model.js", "/rental-purpose-model.js", "/rental-scope-markup.js", "/rental-usage-model.js", "/sale-catalog-view.js", "/sale-sofa-model.js", "/sales-model.js", "/shop.js", "/site-settings.js", "/storefront-feedback.js", "/terms-versions.js"].includes(file)?'stock20261107':["/admin/admin.js", "/admin/landing-settings.js", "/admin/recommendations.js", "/admin/settings.js", "/app.js", "/catalog-order-model.js", "/catalog-subcategories.js", "/catalog-usage-markup.js", "/catalog-usage-model.js", "/catalog-usage.js", "/customer-info.js", "/customer-information-content.js", "/decor-examples.js", "/delivery-model.js", "/header-catalog-model.js", "/header-tools.js", "/home-occasions.js", "/home-sections.js", "/image-provenance.js", "/image-viewer.js", "/landing-content.js", "/messe-landing.js", "/mobile-navigation.js", "/occasion-landing-view.js", "/product-pages.js", "/product-recommendations.js", "/product-summary.js", "/product-variants.js", "/production-landing.js", "/recommendation-model.js", "/rental-catalog-view.js", "/rental-pricing-model.js", "/rental-purpose-model.js", "/rental-scope-markup.js", "/rental-usage-model.js", "/sale-catalog-view.js", "/sale-sofa-model.js", "/sales-model.js", "/shop.js", "/site-settings.js", "/storefront-feedback.js", "/terms-versions.js"].includes(file)?'content20261107':file==='/icons.js'?'enquirypage20261025b':'launch20261024')+end);
 html=html.replace('/product-pages.css?v=sofastandard20261025b','/product-pages.css?v=sitefirst20261106');
 html=html.replace('/catalog-usage.css?v=usage20261028c','/catalog-usage.css?v=filters20261105');
 // The approved Latin font arrives with a blocking stylesheet, before first paint.
 html=html.replace('</head>','<link rel="stylesheet" href="'+storefrontFontHref+'"></head>');
 // Read the existing saved basket during parsing, before the header paints.
 // Catalogue validation remains the responsibility of the application modules.
 if(/<span id="(?:count|saleCount)">/.test(html))html=html.replace('</head>','<script src="/cart-badge-bootstrap.js?v=cartfirstpaint20261026"></script></head>');
 html=html.replace('</head>','<link rel="stylesheet" href="/header-tools.css?v=cartcurrent20261027"><script type="module" src="/header-tools.js?v=stock20261107"></script><script type="module" src="/mobile-navigation.js?v=stock20261107"></script><link rel="stylesheet" href="/cart-addons.css?v=cartselect20261025"><link rel="stylesheet" href="/service-detail.css?v=pricinghint20261024"></head>');
 if(name==='leieprodukt.html')html=html.replace('</head>','<link rel="stylesheet" href="/product-pricing-scope.css?v=productscope20261025"></head>');
 if(['index.html','utvalg.html','anledning.html','leieprodukt.html'].includes(name))html=html.replace('</head>','<link rel="stylesheet" href="/rental-status.css?v=rented20261029b"></head>');
 const version=await styleVersion(base);
 return version?html.replace(/(href=["']\/style\.css)(?:\?[^"']*)?(["'])/g,'$1?v='+version+'$2'):html;
}
