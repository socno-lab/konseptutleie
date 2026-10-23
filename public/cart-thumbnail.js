const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function productPlaceholder(product={}){
 const name=String(product.name||'').toLowerCase();
 const shape=(product.placeholderIcon==='tree'||product.placeholderIcon!=='pillow'&&product.placeholderIcon!=='decor'&&product.placeholderIcon!=='service'&&/juletre|klart til jul|julepynt/.test(name))?'<path d="m20 4 8 11h-4l8 11H8l8-11h-4Z"/><path d="M20 26v9m-6 0h12"/><circle cx="19" cy="16" r="1"/><circle cx="23" cy="22" r="1"/>':(product.placeholderIcon==='pillow'||product.placeholderIcon!=='decor'&&product.placeholderIcon!=='service'&&/tekstil|pute|pledd/.test(name))?'<path d="M8 8q12 4 24 0-4 12 0 24-12-4-24 0 4-12 0-24Z"/><path d="M12 12q8 2 16 0m-16 16q8-2 16 0"/>':(product.placeholderIcon==='decor'||product.placeholderIcon!=='service'&&/dekor|blomst|vase/.test(name))?'<path d="M15 19h10l3 14H12Zm5 0V7m0 7q-10 0-10-7 10 0 10 7Zm0-3q10 0 10-7-10 0-10 7Z"/>':'<rect x="8" y="8" width="24" height="24" rx="2"/><path d="M8 16h24m-16-8v24"/>';
 return `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;
}
export function cartThumbnail(product,content=''){
 return `<span class="cart-thumbnail" aria-hidden="true">${content|| (product?.image?`<img src="${escape(product.image)}" alt="" width="72" height="72" loading="lazy" decoding="async">`:productPlaceholder(product))}</span>`;
}
