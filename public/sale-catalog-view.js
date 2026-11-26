import {normalizeRefinement,matchesColor,sortSaleProducts,writeRefinement} from './catalog-refinement-model.js?v=compactsort20261119b';
import {priceMarkup} from './price-display-model.js?v=vatdefault20261116';
import {dimensionSearchText} from './product-dimensions.js?v=optionimages20261108';
import {productPageUrl} from './product-page-model.js?v=launch20261024';
import {purchaseProductText} from './purchase-copy.js?v=copy20261028';
import {responsiveImageAttributes} from './media-image.js?v=launch20261024';
import {categoryLabel,getSiteSettings} from './site-settings.js?v=fest20261114';
import {productSubcategory,availableSubcategories} from './catalog-subcategories.js?v=fest20261114';
import {variantFields} from './product-variants.js?v=fest20261114';
import {salesEnabled,saleUnitPrice,deliveryText,groupedSaleCards,saleColours,saleSwatchColour} from './sales-model.js?v=fest20261114';
import {renderCatalogCard} from './catalog-card-markup.js?v=motif20261126';
const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=priceMarkup,price=p=>saleUnitPrice(p)===null?'Pris på forespørsel':money(saleUnitPrice(p));
import {filterCountMarkup,countedSubcategoryButtons as subcategoryButtons} from './catalog-filter-count.js?v=counts20261118';
export function saleCatalogView({products,category='',tableFilter='',query='',refinement={}}={}){
 const refinements=normalizeRefinement(refinement);
 products=products.filter(p=>p.active&&!p.deletedAt&&salesEnabled(p));
 const categories=getSiteSettings().categories.map(c=>c.id).filter(c=>products.some(p=>p.category===c));
 if(!categories.includes(category))category='';
 const types=availableSubcategories(products,category);if(!types.includes(tableFilter))tableFilter='';
 const search=query.toLocaleLowerCase('nb');
 const searched=products.filter(p=>matchesColor(p,refinements.color)&&(p.name+' '+p.material+' '+dimensionSearchText(p)+' '+p.moduleSeries).toLocaleLowerCase('nb').includes(search));
 const choices=(category,tableFilter='')=>groupedSaleCards(searched.filter(p=>(!category||p.category===category)&&(!tableFilter||productSubcategory(p,category)===tableFilter)),refinements.color?products.filter(p=>matchesColor(p,refinements.color)):products);
 const shown=sortSaleProducts(choices(category,tableFilter),refinements);
 const counts=Object.fromEntries(['',...types].map(type=>[type,choices(category,type).length]));
 const params=new URLSearchParams();for(const [key,value] of Object.entries({kategori:category,underkategori:tableFilter,sok:query}))if(value)params.set(key,value);
 writeRefinement(params,refinements,{sale:true});
 const returnTo='/kjop.html'+(params.size?'?'+params:'');
 const categoryHtml=['',...categories].map(c=>`<button type="button"${c===category?' class="active"':''} data-sale-category="${html(c)}" aria-pressed="${c===category}">${c?html(categoryLabel(c)):'Alle'}${filterCountMarkup(choices(c).length)}</button>`).join('');
 return {category,tableFilter,query,search,shown,types,categoryHtml,subcategoryHtml:subcategoryButtons(types,tableFilter,category,counts),status:shown.length+' produkter · nye varer på bestilling',tailHtml:shown.length?'':'<div class="catalog-empty sale-empty"><h3>Fant du ikke det du trenger?</h3><p>Prøv færre filtre, eller fortell oss hva du ser etter. Vi hjelper deg å finne en løsning.</p><div class="catalog-empty-actions"><button type="button" class="button button-outline" data-sale-reset>Nullstill filtre</button><a class="button dark" href="/tilpasset-foresporsel.html">Fortell oss hva du trenger ↗</a></div></div>',renderItem:(p,index)=>renderSaleCard(p,index,products,returnTo)};
}
export function renderSaleCard(p,index,products,returnTo='/kjop.html'){return renderCatalogCard({product:p,render:()=>saleCardLinks(`<article class="sale-card"><button class="sale-photo" data-product="${p.id}" aria-label="Se ${html(p.name)}">${p.image?`<img src="${html(p.image)}" ${responsiveImageAttributes(p.image,'(max-width:640px) 50vw, (max-width:1000px) 33vw, 25vw')} alt="${html(p.name)}" loading="lazy" decoding="async">`:html(p.name)}${p.moduleSeries?`<span class="sale-kind">${p.category==='Utemøbler'?'UTEMODULER':'MODULSOFA'}</span>`:''}</button><h3>${html(p.moduleSeries||(p.category==='Belysning'&&saleColours(p,products).length>1?variantFields(p).variantGroup:p.name))}</h3><div class="sale-card-info">${saleColourSwatches(p,products)}${p.moduleSeries?`<p class="sale-module-note">${products.some(x=>x.moduleSeries===p.moduleSeries&&x.moduleRequired)?'Grunnsofa med begge ender · velg midtmoduler i tillegg':'Velg moduler og bygg ditt oppsett'}</p>`:''}<p>${html(purchaseProductText(p.material))}</p></div><button type="button" class="button dark" data-product="${p.id}">${p.moduleSeries?'Bygg ditt oppsett':'Se produkt og velg antall'} ↗</button><p class="sale-price">${p.moduleSeries?'Fra ':''}${price(p)}</p><small>Inkl. mva. · Nytt produkt · ${html(deliveryText(p))}</small></article>`,p,returnTo)},index);}
export function saleColourSwatches(p,products,detail=false){const colours=saleColours(p,products);if(colours.length<2)return '';return `<div class="sale-colour-options"><p>Finnes i ${colours.length} farger${detail?' · Valgt: '+html(variantFields(p).variantLabel):''}</p><div class="sale-swatches" role="group" aria-label="Velg farge">${colours.map(c=>`<button type="button" class="sale-swatch" data-product="${c.id}" style="--swatch:${saleSwatchColour(c)}" title="${html(variantFields(c).variantLabel)}" aria-label="Velg farge ${html(variantFields(c).variantLabel)}" ${detail?'aria-pressed="'+(p.id===c.id)+'"':''}><span class="sr-only">${html(variantFields(c).variantLabel)}</span></button>`).join('')}</div></div>`;}

// Deliver the final linked card immediately, including its five-row grid layout.
// The browser link enhancer then only binds behavior; it need not remove a CTA row.
function saleCardLinks(markup,p,returnTo){
 const href=id=>html(productPageUrl(id,'buy'));
 markup=markup.replace(/<button type="button" class="button dark"[^>]*>[\s\S]*?<\/button>/,'');
 markup=markup.replace(/<button([^>]*data-product="([^"]+)"[^>]*)>([\s\S]*?)<\/button>/g,(_,attrs,id,content)=>'<a'+attrs.replace(/ type="[^"]*"| aria-pressed="[^"]*"/g,'')+' href="'+href(id)+'" data-product-link>'+content+'</a>');
 markup=markup.replace('class="sale-card"','class="sale-card catalog-product-card"');
 return markup.replace(/<h3>([\s\S]*?)<\/h3>/,(_,title)=>'<h3><a class="catalog-card-link" data-product-link href="'+href(p.id)+'">'+title+'</a></h3>');
}
