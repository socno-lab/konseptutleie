import {cartThumbnail} from './cart-thumbnail.js?v=producticons20261023';
import {modulePhotoPreview} from './module-photo-preview.js?v=admincontrol20261022';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function sofaCartRow({setup,index,modules,count,width,widthKnown,priceText,textile='',purchase=false}){
 // Same thumbnail component and dimensions as every ordinary cart product.
 const picture=modulePhotoPreview(modules,setup.selection).replace(/<figcaption>[\s\S]*?<\/figcaption>/g,'').replace(/<button[\s\S]*?<\/button>/g,'').replace(/<figure\b/g,'<span').replace(/<\/figure>/g,'</span>');
 const prefix=purchase?'sale-sofa':'sofa',label='Sofa '+(index+1),name=setup.series+' · '+label;
 return `<div class="cart-item cart-sofa-row" role="group" aria-label="${escape(name)}"><div class="thumb">${cartThumbnail(null,picture)}</div><div class="item-copy sale-row-copy"><h3>${escape(name)}</h3><p class="cart-sofa-dimensions">${count} moduler${widthKnown?' · ca. '+new Intl.NumberFormat('nb-NO').format(width)+' cm bred':''}</p><p class="cart-sofa-prices">${escape(priceText)}</p>${textile?`<p class="cart-sofa-extra">${escape(textile)}</p>`:''}<div class="cart-line-actions">${[['edit','Endre'],['copy','Dupliser'],['remove','Fjern']].map(([action,text])=>`<button type="button" class="cart-line-action" data-${prefix}-${action}="${escape(setup.id)}" aria-label="${text} ${escape(label.toLocaleLowerCase('nb-NO'))}">${text}</button>`).join('')}</div></div></div>`;
}
