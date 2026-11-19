const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The first view reserves the same row and artwork as the live gallery.
export function productCarouselContent(label=''){
 return '<button type="button" aria-label="Forrige produktbilde"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><span class="product-image-count" aria-live="polite">'+escape(label)+'</span><button type="button" aria-label="Neste produktbilde"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button>';
}
export function initialProductCarousel(label){return '<div class="product-image-controls" data-initial-image-controls inert aria-hidden="true">'+productCarouselContent(label)+'</div>';}
