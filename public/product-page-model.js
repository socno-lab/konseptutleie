export const productPagePaths={buy:'/kjopsprodukt.html',rent:'/leieprodukt.html'};
export function safeCatalogReturn(value,mode='rent',origin='https://konseptuell.invalid'){
 const fallback=mode==='buy'?'/kjop.html':'/utvalg.html';
 try{const url=new URL(value||fallback,origin);if(url.origin!==new URL(origin).origin||!['/','/kjop.html','/utvalg.html','/anledning.html'].includes(url.pathname))return fallback;url.searchParams.delete('produkt');return url.pathname+url.search+url.hash;}catch{return fallback;}
}
export function productPageUrl(id,mode='rent',context={}){
 const url=new URL(productPagePaths[mode]||productPagePaths.rent,'https://konseptuell.invalid');url.searchParams.set('produkt',String(id));
 if(context.returnTo)url.searchParams.set('retur',safeCatalogReturn(context.returnTo,mode,context.origin));
 for(const key of ['bruk','prisbruk','oppsett'])if(context[key])url.searchParams.set(key,context[key]);
 return url.pathname+url.search;
}
