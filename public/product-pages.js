import {renderRecommendations} from './product-recommendations.js?v=rentalalternatives1';
import {productPagePaths,productPageUrl,safeCatalogReturn} from './product-page-model.js?v=productpages2';
export const isProductPage=Object.values(productPagePaths).includes(location.pathname);
const primaryIds=new Set(['detail','modules','wall','saleDetail']);
let host,recommendationSource,selectedRecommendation;
function pageHost(){
 if(host)return host;
 document.body.classList.add('product-page');document.body.classList.remove('catalog-page','occasion-page','home-page');host=document.createElement('div');host.id='productPageHost';
 const back=document.createElement('a');back.className='product-page-back';back.textContent='← Tilbake til utvalget';back.href=catalogReturn();host.append(back);
 const scope=document.getElementById('catalogPricingScope');if(scope)host.append(scope);
 const status=document.createElement('p');status.id='productPageStatus';status.setAttribute('role','status');status.textContent='Laster produkt …';host.append(status);document.querySelector('main').prepend(host);return host;
}
export function catalogReturn(){const mode=location.pathname===productPagePaths.buy?'buy':'rent';return safeCatalogReturn(new URL(location.href).searchParams.get('retur'),mode,location.origin);}
export function productLink(id,mode='rent',context={}){
 return productPageUrl(id,mode,{...context,origin:location.origin,returnTo:isProductPage?(location.pathname===productPagePaths[mode]?catalogReturn():context.returnTo||(mode==='buy'?'/kjop.html':'/utvalg.html')):context.returnTo||location.pathname+location.search+location.hash});
}
export function navigateProduct(id,mode,context={}){
 if(!isProductPage){try{sessionStorage.setItem('konsept-scroll:'+location.pathname+location.search+location.hash,String(scrollY));}catch{}}
 location.assign(productLink(id,mode,context));
}
export function selectPageProduct(p,mode,context={}){
 if(!isProductPage)return;
 selectedRecommendation=p;
 const url=new URL(location.href);url.searchParams.set('produkt',p.id);for(const key of ['bruk','prisbruk','oppsett'])if(Object.hasOwn(context,key)){if(context[key])url.searchParams.set(key,context[key]);else url.searchParams.delete(key);}history.replaceState(null,'',url.pathname+url.search);
 document.title=(p.moduleSeries||p.name)+' · '+(mode==='buy'?'Kjøpe':'Leie')+' · Konseptuell';
 const description=document.querySelector('meta[name="description"]')||document.head.appendChild(document.createElement('meta'));description.name='description';description.content=[p.moduleSeries||p.name,p.material,mode==='buy'?'Bestill nytt produkt. Send en uforpliktende kjøpsforespørsel.':'Velg antall og send en uforpliktende leieforespørsel.'].filter(Boolean).join(' · ');
 refreshPageRecommendations();
}
function arrangeProduct(root,sale){
 const flow=sale?root:root.querySelector('.product-scroll');if(!flow||flow.querySelector(':scope>.product-page-media'))return;
 const intro=flow.querySelector(sale?'.sale-product-intro':'.product-intro');if(!intro)return;
 const media=document.createElement('div');media.className='product-page-media';const info=document.createElement('div');info.className='product-page-information';
 const copy=[...intro.children].find(x=>!x.matches('.sale-image-stage,.product-art,.product-image-stage'));if(copy)info.append(copy);
 media.append(intro);for(const selector of ['.sale-gallery','.product-gallery','#productPhotoCaption']){const gallery=flow.querySelector(selector);if(gallery)media.append(gallery);}
 for(const child of [...flow.children])info.append(child);if(!sale){const switcher=info.querySelector(':scope>.mode-switch');if(switcher)info.append(switcher);}flow.append(media,info);
}
export function showSurface(node,label=''){
 if(!isProductPage||!primaryIds.has(node.id)){if(!node.open)node.showModal();return node;}
 const target=pageHost();let section=node;
 if(node.tagName==='DIALOG'){
  section=document.createElement('section');for(const attr of node.attributes)if(!['open','role','aria-modal'].includes(attr.name))section.setAttribute(attr.name,attr.value);
  section.classList.add('product-page-surface');section.append(...node.childNodes);node.replaceWith(section);target.insertBefore(section,target.querySelector('#productRecommendations'));
 }
 for(const other of target.querySelectorAll('.product-page-surface')){other.hidden=other!==section;other.open=other===section;}
 section.hidden=false;section.open=true;
 for(const button of section.querySelectorAll('[data-close="'+section.id+'"]'))button.hidden=true;
 if(section.id==='saleDetail')arrangeProduct(section.querySelector('#saleDetailContent'),true);
 if(section.id==='detail')arrangeProduct(section.querySelector('#detailContent'),false);
 if(section.id==='modules'){const actions=section.querySelector('.module-actions'),controls=section.querySelector('.module-controls');if(actions&&controls){controls.append(actions);const heading=section.querySelector('.module-heading');if(heading)controls.prepend(heading);}}
 let heading=section.querySelector('h1,h2');if(heading?.tagName==='H2'){const h1=document.createElement('h1');for(const attr of heading.attributes)h1.setAttribute(attr.name,attr.value);h1.append(...heading.childNodes);heading.replaceWith(h1);heading=h1;}
 if(label&&heading&&['modules','wall'].includes(section.id))heading.textContent=label;
 document.getElementById('productPageStatus').hidden=true;
 refreshPageRecommendations();
 return section;
}
export function refreshPageRecommendations(){if(!isProductPage||!host||!selectedRecommendation||!recommendationSource)return;const {mode,getProducts,getContext}=recommendationSource;const context=getContext();renderRecommendations(host,selectedRecommendation,getProducts(),mode,context,id=>productLink(id,mode,{...context,oppsett:''}));}
export function closeSurface(node){if(node?.tagName==='DIALOG')node.close();}
export function productPageError(message){if(!isProductPage)return;const target=pageHost();const status=target.querySelector('#productPageStatus');status.hidden=false;status.textContent=message;}
export function restoreCatalogPosition(){if(isProductPage)return;try{const saved=sessionStorage.getItem('konsept-scroll:'+location.pathname+location.search+location.hash);if(saved!==null)requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo({top:Number(saved)||0,behavior:'instant'})));}catch{}}
export function installProductLinks(mode,getProducts,getContext=()=>({})){
 if(isProductPage){recommendationSource={mode,getProducts,getContext};pageHost();return;}
 let queued=false;
 const scan=()=>{queued=false;const products=getProducts();if(!products.length)return;
  for(const button of document.querySelectorAll('button[data-product],button[data-detail],button[data-build],button[data-rental-colour]')){
   if(button.closest('dialog,.product-page-surface'))continue;
   const id=button.dataset.product||button.dataset.detail||button.dataset.rentalColour||products.find(p=>p.moduleSeries===button.dataset.build)?.id;if(!products.some(p=>p.id===id))continue;
   const link=document.createElement('a');for(const attr of button.attributes)if(!['type','aria-pressed'].includes(attr.name))link.setAttribute(attr.name,attr.value);link.href=productLink(id,mode,getContext());link.dataset.productLink='';link.append(...button.childNodes);button.replaceWith(link);
  }
 };
 new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(scan);}}).observe(document.body,{subtree:true,childList:true});
 document.addEventListener('click',e=>{if(e.target.closest('a[data-product-link]')){try{sessionStorage.setItem('konsept-scroll:'+location.pathname+location.search+location.hash,String(scrollY));}catch{}e.stopPropagation();}},true);scan();
}
