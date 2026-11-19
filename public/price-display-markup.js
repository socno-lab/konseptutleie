// Shared inner markup for the server-rendered picker and runtime fallbacks.
export function pricePickerContent(mode='incl'){
 return '<span>Vis priser</span><div class="price-display-options"><button type="button" data-price-mode="incl" aria-pressed="'+(mode!=='excl')+'">Inkl. mva.</button><button type="button" data-price-mode="excl" aria-pressed="'+(mode==='excl')+'">Ekskl. mva.</button></div>';
}
