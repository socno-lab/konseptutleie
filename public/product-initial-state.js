import {configureSiteSettings} from './site-settings.js?v=fest20261114';
import {normalizeBasket} from './catalog-model.js?v=longrent20261026';
import {restoreSofas,migrateSofas} from './sofa-model.js?v=longrent20261026';
import {readPurposeState} from './rental-purpose-model.js?v=fest20261114';
import {rentalUsageState,rentalUsageLabels} from './rental-usage-model.js?v=fest20261114';
import {applyRentalScope,scopeForOccasion} from './rental-pricing-model.js?v=fest20261114';
import {rentalScopeMarkup,rentalPurposeLabel} from './rental-scope-markup.js?v=purposeinline20261122';
import {configureBusinessPackages,cleanBusinessChoices} from './business-purchase-model.js';
import {salesEnabled,cleanSaleBasket} from './sales-model.js?v=fest20261114';
import {restoreSaleSetups} from './sale-sofa-model.js?v=fest20261114';
import {readSavedRentalPeriod} from './rental-period-display.js?v=choicesfirst20261119';
import {parseDateOnly} from './rental-dates.js?v=launch20261024';
import {rentalProductOptions} from './rental-product-options.js?v=choicesfirst20261119';
import {rentalModuleInitialState,rentalModuleSurface,rentalWallSurface} from './rental-builder-options.js?v=choicesfirst20261119';
import {purchaseInitialSelection,purchaseModuleState,purchaseProductOptionsMarkup} from './purchase-product-options.js?v=choicesfirst20261119';
import {renderRecommendations} from './product-recommendations.js?v=choicesfirst20261119';
import {productSummary} from './product-summary.js?v=vat20261115b';
import {productPageUrl,safeCatalogReturn} from './product-page-model.js?v=launch20261024';

const savedText=(storage,key)=>{try{return storage?.getItem(key);}catch{return null;}};
const savedJSON=(storage,key,fallback)=>{try{return JSON.parse(savedText(storage,key)||'null')??fallback;}catch{return fallback;}};
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};

// The same restoration and validation functions as the live application.
// This only reads existing browser choices; it never writes a basket or submits.
export function initialProductState(data,href,{localStorage,sessionStorage}={}){
 configureSiteSettings(data.settings);
 const url=new URL(href),buy=url.pathname==='/kjopsprodukt.html',id=url.searchParams.get('produkt'),editingId=url.searchParams.get('oppsett')||'';
 const period=readSavedRentalPeriod(sessionStorage);
 if(buy){
  const products=data.products.filter(p=>p.active&&!p.deletedAt&&salesEnabled(p));
  const basket=cleanSaleBasket(record(savedJSON(localStorage,'konsept-sale-cart-v1',{})),products);
  const setups=restoreSaleSetups(basket,savedJSON(localStorage,'konsept-sale-sofas-v1',[]),products),product=products.find(p=>p.id===id);
  return {buy,product,products,period,editingId,selection:product?purchaseInitialSelection(product,products,editingId?(setups.find(s=>s.id===editingId)?.selection||{}):null):{}};
 }
 const purposeState=readPurposeState(href,savedText(sessionStorage,'konsept-purpose-v1')||'alle');
 const draft=record(savedJSON(sessionStorage,'konsept-enquiry-draft-rent',{}));
 const occasion=draft.occasionConfirmed===true&&data.occasionChoices?.includes(draft.occasion)?draft.occasion:'';
 const usage=occasion?{scope:scopeForOccasion(occasion),confirmed:true}:rentalUsageState({purpose:purposeState.purpose,explicit:url.searchParams.get('prisbruk'),saved:savedText(localStorage,'konsept-rental-scope-v1')});
 const products=applyRentalScope(data.products.filter(p=>p.rentalEnabled!==false),usage.scope);
 const basket=normalizeBasket(record(savedJSON(localStorage,'konsept-cart-v1',{})),products);
 const rawSetups=savedJSON(localStorage,'konsept-sofas-v1',null);
 const setups=Array.isArray(rawSetups)?rawSetups.filter(s=>s&&typeof s.id==='string'&&typeof s.series==='string'&&s.selection&&typeof s.selection==='object'&&!Array.isArray(s.selection)&&Object.values(s.selection).every(q=>Number.isInteger(q)&&q>0&&q<=99)).slice(0,50):null;
 const restored=setups===null?migrateSofas(basket,products,record(savedJSON(localStorage,'konsept-cart-links-v1',{}))):restoreSofas(basket,setups,products);
 configureBusinessPackages(products);
 const businessChoices=cleanBusinessChoices(record(savedJSON(localStorage,'konsept-business-choices-v1',{})));
 // renderCart removes choices for packages that did not survive basket restoration.
 for(const id of Object.keys(businessChoices))if(!restored.cart[id])delete businessChoices[id];
 const product=products.find(p=>p.active&&!p.deletedAt&&p.id===id);
 return {buy,product,products,period,editingId,setups:restored.setups,context:{products,cart:restored.cart,purpose:purposeState.purpose,rentalScope:usage.scope,rentalScopeConfirmed:usage.confirmed,businessChoices,days:period.days,mode:businessChoices[id]||'rent'},category:purposeState.category};
}

function projectPeriod(doc,period,purchase){
 for(const section of doc.querySelectorAll('[data-product-rental-period]')){
  section.hidden=purchase;
  for(const name of ['start','end']){
   const button=section.querySelector('[data-period-field="'+name+'"]'),value=period[name];
   if(button){const selected=parseDateOnly(value)!==null;button.textContent=selected?value.split('-').reverse().join('.'):'Velg dato';button.dataset.selected=String(selected);button.setAttribute('aria-label',(name==='start'?'Fra dato: ':'Til dato: ')+button.textContent);}
  }
  const message=section.querySelector('[data-period-message]');if(message)message.textContent=period.message;
 }
}

export function projectInitialProduct(doc,href,storage){
 const dataNode=doc.getElementById('initialProductCatalog'),host=doc.getElementById('productPageHost');
 if(!dataNode||!host||!doc.querySelector('[data-initial-product-ready]'))return false;
 const state=initialProductState(JSON.parse(dataNode.textContent),href,storage),{product:p,products,buy,period}=state;if(!p)return true;
 const options=host.querySelector('[data-initial-product-options]');
 if(buy){
  if(options)options.innerHTML=purchaseProductOptionsMarkup(p,products,{initial:true,selection:state.selection,editing:!!state.editingId,rentalHref:productPageUrl(p.id,'rent',{returnTo:'/utvalg.html'})});
  if(p.moduleSeries){const preview=host.querySelector('.sale-module-preview');if(preview)preview.innerHTML=purchaseModuleState(p,products,state.selection).previewHtml;}
 }else{
  const context=state.context;
  const scope=host.querySelector('#catalogPricingScope');
  if(scope){const confirmed=context.rentalScopeConfirmed,label=confirmed?rentalPurposeLabel(context.purpose,context.rentalScope):'Velg formål for å se leiepriser';scope.innerHTML='<div class="mobile-catalog-usage mobile-catalog-only"><span id="mobileCatalogUsageLabel">'+label+'</span><button type="button" id="mobileChangeUsage" aria-haspopup="dialog">'+(confirmed?'Endre formål':'Velg formål')+'</button></div><div class="product-pricing-desktop">'+rentalScopeMarkup(context.rentalScope,confirmed,context.purpose)+'</div>';}
  if(p.moduleSeries){
   const old=host.querySelector('[data-initial-builder="modules"]');
   if(old)old.outerHTML=rentalModuleSurface(context,rentalModuleInitialState(p.moduleSeries,products,{cart:context.cart,setups:state.setups,editingId:state.editingId}));
  }else if(p.wallGroup){
   const old=host.querySelector('[data-initial-builder="wall"]');if(old)old.outerHTML=rentalWallSurface(context,p.id);
  }else if(options){
   options.innerHTML=rentalProductOptions(context).productOptions(p,{initial:true});
   const summary=host.querySelector('[data-product-summary]');if(summary)summary.outerHTML=productSummary(p,products,{confirmed:context.rentalScopeConfirmed,purpose:context.purpose,category:state.category});
  }
  projectPeriod(doc,period,context.mode==='buy');
 }
 const mode=buy?'buy':'rent',context=buy?{}:{bruk:state.context.purpose,prisbruk:state.context.rentalScopeConfirmed?state.context.rentalScope:'',basket:state.context.cart};
 const returnTo=safeCatalogReturn(new URL(href).searchParams.get('retur'),mode,new URL(href).origin);
 const current=!buy&&p.moduleSeries?products.find(x=>x.moduleSeries===p.moduleSeries)||p:p;
 renderRecommendations(host,current,products,mode,context,id=>productPageUrl(id,mode,{...context,returnTo}));
 return true;
}

export function mountInitialProductState(doc,win){
 let done=false,observer;const storage={};for(const key of ['localStorage','sessionStorage'])try{storage[key]=win[key];}catch{}
 const project=()=>{
  if(done||win.konseptProductClientReady){observer?.disconnect();return;}
  try{done=projectInitialProduct(doc,win.location.href,storage);}catch{done=true;}
  if(done)observer?.disconnect();
 };
 observer=new win.MutationObserver(project);observer.observe(doc.documentElement,{childList:true,subtree:true});
 doc.addEventListener('DOMContentLoaded',()=>{project();observer.disconnect();},{once:true});project();
 return {disconnect:()=>observer.disconnect()};
}
if(typeof document!=='undefined'&&typeof window!=='undefined')mountInitialProductState(document,window);
