import {priceDisplayKey,priceDefaultKey,readPriceMode,savePriceMode,saveDefaultPriceMode,priceParts,displayedPrice,formatPrice,taxDisplayText} from './price-display-model.js?v=vatdefault20261116';
import {pricePickerContent} from './price-display-markup.js?v=picker20261119';

function mountPriceDisplay(){
 const local=()=>{try{return window.localStorage;}catch{return null;}},session=()=>{try{return window.sessionStorage;}catch{return null;}};
 const url=new URL(location.href);
 let savedPurpose;try{savedPurpose=session()?.getItem('konsept-purpose-v1');}catch{}
 let mode=saveDefaultPriceMode({purpose:url.searchParams.get('bruk')||savedPurpose,scope:url.searchParams.get('prisbruk')},local(),session());
 let explicitMode=null;
 const labels=new WeakMap();
 // Only price captions and pricing components: never customer fields, legal terms,
 // product names/descriptions, structured data or the underlying form values.
 const taxScopes=['#catalogUsageDialog>.hint','.rate-caption','.cart-period-price','.cart-common-info','.package-cart-total','.sale-detail-price','.sale-price','.sale-card>small','.sale-catalog-heading>.hint','.recommendation-card small','.business-purchase-summary','#selectionPrices','#saleSummary','#saleModuleTotal','#couponTotals','#catalogUsageHelp','#catalogPricingScope','.catalog-usage-tariff','.catalog-usage-impact','#detailContent [data-detail-addon-price]','#detailContent [data-detail-addon-buyout]','#detailContent .addon-description','#moduleSummary','#moduleTotal','.rental-options>.hint','.addon-choices small','#moduleSummary .hint','.catalog-usage-impact','.enquiry-submit-summary-note'].join(',');
 function picker(){
  const group=document.createElement('div');group.className='price-display-picker';group.setAttribute('role','group');group.setAttribute('aria-label','Vis priser');
  group.innerHTML=pricePickerContent(mode);
  return group;
 }
 function atHost(host){if(host&&!host.querySelector(':scope > .price-display-picker'))host.append(picker());}
 function before(target,key){if(!target||document.querySelector('[data-price-location="'+key+'"]'))return;const group=picker();group.dataset.priceLocation=key;target.before(group);}
 function refresh(){
  observer.disconnect();
  document.documentElement.dataset.priceMode=mode;
  // During parsing, only update existing text and attributes. Mount fallback controls once the
  // body is complete so the parser cannot append content after those controls.
  if(document.readyState!=='loading'){
  const usage=document.getElementById('catalogUsage');
  if(usage){usage.classList.add('has-price-display');atHost(usage);}
  else atHost(document.getElementById('catalogPricingScope'));
  before(document.getElementById('cartPricingScope'),'rental-cart');
  const cartHeading=document.querySelector('body.enquiry-page #cart .drawer-head'),cartPicker=document.querySelector('[data-price-location="rental-cart"]');
  if(cartHeading&&cartPicker&&cartPicker.parentElement!==cartHeading)cartHeading.append(cartPicker);
  before(document.getElementById('saleCartItems'),'purchase-cart');
  before(document.getElementById('saleCategories')?.closest('.catalog-tools'),'purchase-catalog');
  before(document.getElementById('saleDetailContent'),'purchase-product');
  const help=document.getElementById('catalogUsageHelp');
  if(help&&!help.querySelector('.mobile-price-switch')){
   const button=document.createElement('button');button.type='button';button.className='mobile-price-switch';help.append(' ',button);
  }
  }
  for(const button of document.querySelectorAll('.mobile-price-switch')){
   const text=mode==='incl'?'Vis priser ekskl. mva.':'Vis priser inkl. mva.';
   if(document.readyState==='loading'){
    // Keep the parser's text node; wait for the complete label if HTML arrives in chunks.
    const node=button.childNodes[0];
    if(node?.nodeType===Node.TEXT_NODE&&/^Vis priser (?:inkl|ekskl)\. mva\.$/.test(node.data)&&node.data!==text)node.data=text;
   }else if(button.textContent!==text)button.textContent=text;
  }
  // Existing server-rendered buttons receive the saved mode before first paint.
  for(const button of document.querySelectorAll('button[data-price-mode]')){
   const pressed=String(button.dataset.priceMode===mode);if(button.getAttribute('aria-pressed')!==pressed)button.setAttribute('aria-pressed',pressed);
  }
  for(const node of document.querySelectorAll('[data-price-gross]')){
   const gross=Number(node.dataset.priceGross);if(!Number.isFinite(gross))continue;
   const fixed=node.dataset.priceFixed;
   const value=fixed==='gross'?gross:fixed==='net'?priceParts(gross).net:fixed==='vat'?priceParts(gross).vat:displayedPrice(gross,mode);
   const text=formatPrice(value);if(node.textContent!==text)node.textContent=text;
  }
  for(const scope of document.querySelectorAll(taxScopes)){
   const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let node;
   while((node=walker.nextNode())){
    if(node.parentElement.closest('.price-display-picker,.mobile-price-switch,[data-price-gross],[data-price-fixed],input,textarea,select,script,style'))continue;
    const last=labels.get(node),original=last&&node.data===last.shown?last.original:last&&document.readyState==='loading'&&node.data.startsWith(last.shown)?last.original+node.data.slice(last.shown.length):node.data;
    const shown=taxDisplayText(original,mode);if(shown!==node.data)node.data=shown;labels.set(node,{original,shown});
   }
  }
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
 }
 const observer=new MutationObserver(refresh);
 document.addEventListener('click',event=>{
  const mobileSwitch=event.target.closest('.mobile-price-switch');
  if(mobileSwitch){explicitMode=mode=savePriceMode(mode==='incl'?'excl':'incl',local(),session());refresh();return;}
  const button=event.target.closest('button[data-price-mode]');if(!button)return;
  explicitMode=mode=savePriceMode(button.dataset.priceMode,local(),session());refresh();
 });
 document.addEventListener('rental-price-display-context',event=>{const automatic=saveDefaultPriceMode(event.detail||{},local(),session());mode=explicitMode||automatic;refresh();});
 window.addEventListener('storage',event=>{if([priceDisplayKey,priceDefaultKey,null].includes(event.key)){if(event.key!==priceDefaultKey)explicitMode=null;try{session()?.removeItem(event.key||priceDisplayKey);}catch{}mode=explicitMode||readPriceMode(local(),session());refresh();}});
 window.addEventListener('pageshow',()=>{mode=explicitMode||readPriceMode(local(),session());refresh();});
 document.addEventListener('DOMContentLoaded',refresh,{once:true});
 refresh();
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 mountPriceDisplay();
}
