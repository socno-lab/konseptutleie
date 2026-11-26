import {productPageUrl} from './product-page-model.js?v=launch20261024';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Render the same linked layout that installProductLinks keeps in the browser.
// Product photos and titles are the actions; the old inline CTA has no final row.
export function rentalCardLinks(markup,product,context){
 const href=id=>escape(productPageUrl(id,'rent'));
 markup=markup.replace(/<button\b([^>]*)>[\s\S]*?<\/button>/g,(button,attrs)=>/\bclass="[^"]*\b(?:add|module-build-button)\b/.test(attrs)?'':button);
 markup=markup.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/g,(button,attrs,content)=>{
  const target=attrs.match(/\bdata-(?:detail|rental-colour)="([^"]*)"/);
  if(!target&&!/\bdata-(?:build|wall)=/.test(attrs))return button;
  return '<a'+attrs.replace(/\s(?:type|aria-pressed)="[^"]*"/g,'')+' href="'+href(target?.[1]||product.id)+'" data-product-link data-rental-catalog-link>'+content+'</a>';
 });
 markup=markup.replace(/<article([^>]*)>/,(_,attrs)=>'<article'+(/class="/.test(attrs)?attrs.replace('class="','class="catalog-product-card '):attrs+' class="catalog-product-card"')+'>');
 return markup.replace(/<h3>([\s\S]*?)<\/h3>/,(_,title)=>'<h3><a class="catalog-card-link" data-product-link href="'+href(product.id)+'">'+title+'</a></h3>');
}
