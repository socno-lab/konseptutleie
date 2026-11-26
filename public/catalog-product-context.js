// Keep the catalogue context in this browser entry while the product URL is shareable.
import {productPagePaths,safeCatalogReturn} from './product-page-model.js?v=launch20261024';

export function catalogProductContext(win,referrer){
 const url=new URL(win.location.href);
 if(!Object.values(productPagePaths).includes(url.pathname)||url.searchParams.has('retur'))return url;
 const mode=url.pathname===productPagePaths.buy?'buy':'rent';
 let source=win.history?.state?.catalogSource||referrer;
 if(!source)return url;
 try{
  const saved=win.sessionStorage.getItem('konsept-last-catalog');
  if(saved&&saved.split('#')[0]===source.split('#')[0])source=saved;
 }catch{}
 const catalog=new URL(source,url);
 if(catalog.origin!==url.origin||!['/','/utvalg.html','/kjop.html','/anledning.html'].includes(catalog.pathname))return url;
 url.searchParams.set('retur',safeCatalogReturn(source,mode,url.origin));
 for(const key of ['bruk','prisbruk']){
  if(!url.searchParams.has(key)&&catalog.searchParams.has(key))url.searchParams.set(key,catalog.searchParams.get(key));
 }
 return url;
}
