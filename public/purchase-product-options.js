import {priceMarkup} from './price-display-model.js?v=vatdefault20261116';
import {saleColourSwatches} from './sale-catalog-view.js?v=choicesfirst20261119';
import {salesEnabled,saleUnitPrice,saleEstimate,saleTermsForProduct,saleColours} from './sales-model.js?v=fest20261114';
import {purchaseProductText} from './purchase-copy.js?v=copy20261028';
import {sofaLayoutError,moduleQuantityLimit} from './sofa-layout.js?v=launch20261024';
import {modulePhotoPreview} from './module-photo-preview.js?v=lagoon20261025';
import {productPageUrl} from './product-page-model.js?v=launch20261024';

const html=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const saleProducts=products=>products.filter(p=>p.active&&!p.deletedAt&&salesEnabled(p));
const price=p=>saleUnitPrice(p)===null?'Pris på forespørsel':priceMarkup(saleUnitPrice(p));

export function saleQuantityControl(name,value,min,attributes,max=99){
 return `<div class="sale-quantity" role="group" aria-label="Antall ${html(name)}"><button type="button" data-sale-step="-1" aria-label="Færre ${html(name)}" ${value<=min?'disabled':''}>−</button><input type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${value}" aria-label="Antall ${html(name)}" ${attributes}><button type="button" data-sale-step="1" aria-label="Flere ${html(name)}" ${value>=max?'disabled':''}>+</button></div>`;
}

export function purchaseInitialSelection(p,products,savedSelection=null){
 if(!p?.moduleSeries)return {};
 return Object.fromEntries(saleProducts(products).filter(x=>x.moduleSeries===p.moduleSeries).map(x=>[x.id,savedSelection===null?(x.moduleRequired?1:x.id===p.id?1:0):(savedSelection[x.id]||0)]));
}

// These are the same catalogue calculations used while editing the live form.
export function purchaseModuleState(p,products,selection=purchaseInitialSelection(p,products)){
 const available=saleProducts(products),modules=available.filter(x=>p?.moduleSeries&&x.moduleSeries===p.moduleSeries);
 const selected=Object.fromEntries(modules.filter(x=>Number(selection?.[x.id])>0).map(x=>[x.id,Number(selection[x.id])]));
 const layoutError=sofaLayoutError(modules,selected),quote=saleEstimate(selected,available);
 const width=modules.reduce((n,x)=>n+(x.moduleWidth||0)*(selected[x.id]||0),0);
 const limits=Object.fromEntries(modules.map(x=>[x.id,moduleQuantityLimit(modules,selected,x)]));
 return {modules,selection:selected,limits,layoutError,quote,width,previewHtml:layoutError?'<p class="module-photo-empty">'+html(layoutError)+'</p>':modulePhotoPreview(modules,selected),totalHtml:'Oppsett: '+priceMarkup(quote.knownSubtotal)+' inkl. mva.'+(quote.hasUnpriced?' + produkter på forespørsel':'')+(width?' · ca. '+width+' cm bred':'')};
}

// Initial controls have their final classes, prices and values, but no IDs or
// action attributes that can collide with the live detail form during handoff.
function initialOptions(markup){
 return '<div data-initial-purchase-options inert>'+markup.replace(/\bid="([^"]+)"/g,(_,id)=>'id="initial-'+id+'"').replace(/\bdata-(?:sale-step|module|add-series|add|product)=/g,name=>name.replace('data-','data-initial-'))+'</div>';
}

export function purchaseProductOptionsMarkup(p,products,{selection,editing=false,rentalHref,initial=false}={}){
 const available=saleProducts(products),modules=p.moduleSeries?available.filter(x=>x.moduleSeries===p.moduleSeries):[];
 const related=available.filter(x=>p.variantGroup&&x.variantGroup===p.variantGroup&&x.id!==p.id);
 const state=modules.length?purchaseModuleState(p,available,selection??purchaseInitialSelection(p,available)):null;
 const variants=saleColours(p,available).length>1?saleColourSwatches(p,available,true):related.length?`<label>Andre farger / varianter<select id="saleVariant"><option value="${html(p.id)}">${html(p.variantLabel||p.name)}</option>${related.map(x=>`<option value="${html(x.id)}">${html(x.variantLabel||x.name)}</option>`).join('')}</select></label>`:'';
 const choices=modules.length?`<div class="sale-module"><div class="sale-module-controls"><h3>Bygg ${html(p.moduleSeries)}</h3><p>${modules.some(m=>m.moduleRequired)?'Grunnsofaen omfatter begge endene. Velg eventuelle midtmoduler i tillegg.':'Velg modulene du ønsker.'}</p>${modules.map(m=>`<div class="sale-module-row"><span>${html(m.name)} · ${price(m)}</span>${saleQuantityControl(m.name,state.selection[m.id]||0,m.moduleRequired?1:0,`data-module="${html(m.id)}"`,state.limits[m.id])}</div>`).join('')}<p id="saleModuleTotal" class="sale-module-total">${state.totalHtml}</p><button type="button" class="button dark" data-add-series="${html(p.moduleSeries)}"${state.layoutError?' disabled':''}>${editing?'Lagre endringer':'Legg oppsett i handlekurv'}</button></div></div>`:`<div class="sale-actions"><div class="sale-quantity-field"><span>Antall</span>${saleQuantityControl(p.name,1,1,'id="saleQuantity"')}</div><button type="button" class="button dark" data-add="${html(p.id)}">Legg i handlekurv</button></div>`;
 const rentLink=rentalHref??productPageUrl(p.id,'rent',{returnTo:'/utvalg.html'});
 const markup=variants+choices+`<p id="saleDetailStatus" role="status">${html(state?.layoutError||'')}</p><details class="sale-product-info"><summary>Produktinformasjon og levering</summary><p>${html(purchaseProductText(p.description))}</p><p>${html(saleTermsForProduct(p))}</p></details><p class="sale-product-switch">${p.rentalEnabled!==false?`<a class="text-button" href="${html(rentLink)}">Dette produktet kan også leies ↗</a>`:''}</p>`;
 return initial?initialOptions(markup):markup;
}
