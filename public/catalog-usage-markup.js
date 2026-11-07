import {catalogUsageLabel} from './catalog-usage-model.js?v=jul20261107';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Identical first-paint and client fallback markup for every rental catalogue.
export function catalogUsageMarkup(state={}){
 return `<h3 id="catalogUsageHeading">Hva skal du bruke møblene til?</h3><button type="button" id="catalogUsageButton" aria-haspopup="dialog" aria-controls="catalogUsageDialog" aria-describedby="catalogUsageHelp"><span data-usage-label>${escape(catalogUsageLabel(state))}</span><span aria-hidden="true">⌄</span></button><p id="catalogUsageHelp">Utvalg og leiepriser tilpasses bruksområdet. Alle priser inkluderer mva.</p>`;
}
