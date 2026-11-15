import {priceDisplayKey,readPriceMode,savePriceMode,priceParts,displayedPrice,formatPrice,taxDisplayText} from './price-display-model.js?v=vat20261115b';

function mountPriceDisplay(){
 const local=()=>{try{return window.localStorage;}catch{return null;}},session=()=>{try{return window.sessionStorage;}catch{return null;}};
 let mode=readPriceMode(local(),session());
 const labels=new WeakMap();
 let pickerId=0;
 // Only price captions and pricing components: never customer fields, legal terms,
 // product names/descriptions, structured data or the underlying form values.
 const taxScopes=['.rate-caption','.cart-period-price','.cart-common-info','.package-cart-total','.sale-detail-price','.sale-price','.sale-card>small','.sale-catalog-heading>.hint','.recommendation-card small','.business-purchase-summary','#selectionPrices','#saleSummary','#saleModuleTotal','#couponTotals','#catalogUsageHelp','#catalogPricingScope','.catalog-usage-tariff','.catalog-usage-impact','#detailContent [data-detail-addon-price]','#detailContent [data-detail-addon-buyout]','#detailContent .addon-description','#moduleSummary','#moduleTotal','.rental-options>.hint','.addon-choices small','#moduleSummary .hint','.catalog-usage-impact','.enquiry-submit-summary-note'].join(',');
 function picker(){
  const group=document.createElement('div');group.className='price-display-picker';group.setAttribute('role','group');group.setAttribute('aria-label','Vis priser');
  const optionsId='price-display-options-'+(++pickerId);
  group.innerHTML='<span>Vis priser</span><button type="button" class="price-display-toggle" aria-expanded="false" aria-controls="'+optionsId+'">Vis priser</button><div id="'+optionsId+'" class="price-display-options"><button type="button" data-price-mode="incl">Inkl. mva.</button><button type="button" data-price-mode="excl">Ekskl. mva.</button></div>';
  return group;
 }
 function atHost(host){if(host&&!host.querySelector(':scope > .price-display-picker'))host.append(picker());}
 function before(target,key){if(!target||document.querySelector('[data-price-location="'+key+'"]'))return;const group=picker();group.dataset.priceLocation=key;target.before(group);}
 function refresh(){
  observer.disconnect();
  document.documentElement.dataset.priceMode=mode;
  const usage=document.getElementById('catalogUsage');
  if(usage){usage.classList.add('has-price-display');atHost(usage);}
  else atHost(document.getElementById('catalogPricingScope'));
  before(document.getElementById('cartPricingScope'),'rental-cart');
  before(document.getElementById('saleCartItems'),'purchase-cart');
  before(document.getElementById('saleCategories')?.closest('.catalog-tools'),'purchase-catalog');
  before(document.getElementById('saleDetailContent'),'purchase-product');
  atHost(document.querySelector('.footer-meta'));
  for(const button of document.querySelectorAll('button[data-price-mode]'))button.setAttribute('aria-pressed',String(button.dataset.priceMode===mode));
  for(const node of document.querySelectorAll('[data-price-gross]')){
   const gross=Number(node.dataset.priceGross);if(!Number.isFinite(gross))continue;
   const fixed=node.dataset.priceFixed;
   const value=fixed==='gross'?gross:fixed==='net'?priceParts(gross).net:fixed==='vat'?priceParts(gross).vat:displayedPrice(gross,mode);
   const text=formatPrice(value);if(node.textContent!==text)node.textContent=text;
  }
  for(const scope of document.querySelectorAll(taxScopes)){
   const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT);let node;
   while((node=walker.nextNode())){
    if(node.parentElement.closest('.price-display-picker,[data-price-gross],[data-price-fixed],input,textarea,select,script,style'))continue;
    const last=labels.get(node),original=last&&node.data===last.shown?last.original:node.data;
    const shown=taxDisplayText(original,mode);if(shown!==node.data)node.data=shown;labels.set(node,{original,shown});
   }
  }
  observer.observe(document.body,{childList:true,subtree:true,characterData:true});
 }
 const observer=new MutationObserver(refresh);
 function closePickers(except=null){
  for(const toggle of document.querySelectorAll('.price-display-toggle[aria-expanded="true"]'))if(toggle!==except){toggle.setAttribute('aria-expanded','false');toggle.parentElement.classList.remove('is-open');}
 }
 document.addEventListener('click',event=>{
  const toggle=event.target.closest('.price-display-toggle');
  if(toggle){const open=toggle.getAttribute('aria-expanded')!=='true';closePickers();toggle.setAttribute('aria-expanded',String(open));toggle.parentElement.classList.toggle('is-open',open);return;}
  const button=event.target.closest('button[data-price-mode]');
  if(button){mode=savePriceMode(button.dataset.priceMode,local(),session());const trigger=button.closest('.price-display-picker')?.querySelector('.price-display-toggle');closePickers();refresh();if(trigger&&matchMedia('(max-width:640px)').matches)trigger.focus();return;}
  if(!event.target.closest('.price-display-picker'))closePickers();
 });
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const toggle=document.querySelector('.price-display-toggle[aria-expanded="true"]');
  if(toggle){closePickers();toggle.focus();event.preventDefault();}
 });
 window.addEventListener('storage',event=>{if(event.key===priceDisplayKey||event.key===null){try{session()?.removeItem(priceDisplayKey);}catch{}mode=readPriceMode(local(),session());refresh();}});
 window.addEventListener('pageshow',()=>{mode=readPriceMode(local(),session());refresh();});
 refresh();
}
if(typeof document!=='undefined'&&typeof window!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountPriceDisplay,{once:true});else mountPriceDisplay();
}
