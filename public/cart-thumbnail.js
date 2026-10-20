const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cartThumbnail(product){
 return `<span class="cart-thumbnail" aria-hidden="true">${product?.image?`<img src="${escape(product.image)}" alt="" width="72" height="72" loading="lazy" decoding="async">`:'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="7" width="30" height="26" rx="2"/><circle cx="14" cy="15" r="3"/><path d="m6 29 9-9 7 6 6-6 7 8"/></svg>'}</span>`;
}
