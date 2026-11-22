import {catalogUsageLabel} from './catalog-usage-model.js?v=purposeinline20261122';
import {defaultPriceMode} from './price-display-model.js?v=vatdefault20261116';
import {pricePickerContent} from './price-display-markup.js?v=picker20261119';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Identical first-paint and client fallback markup for every rental catalogue.
export function catalogUsageMarkup(state={}){
 const mode=defaultPriceMode(state)||'incl';
 return `<h3 id="catalogUsageHeading">Hva skal du bruke møblene til?</h3><button type="button" id="catalogUsageButton" aria-haspopup="dialog" aria-controls="catalogUsageDialog" aria-describedby="catalogUsageHelp"><span data-usage-label>${escape(catalogUsageLabel(state))}</span><span aria-hidden="true">⌄</span></button><p id="catalogUsageHelp">Utvalg og leiepriser tilpasses bruksområdet. Alle priser inkluderer mva. <button type="button" class="mobile-price-switch">${mode==='incl'?'Vis priser ekskl. mva.':'Vis priser inkl. mva.'}</button></p><div class="price-display-picker" role="group" aria-label="Vis priser">${pricePickerContent(mode)}</div>`;
}
