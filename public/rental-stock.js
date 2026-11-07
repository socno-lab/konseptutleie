// Total owned stock, never date availability or remaining basket capacity.
export function rentalStockText(p,{detail=false,variantLabel=""}={}){
 const n=Number(p?.stock);
 if(!p||p.rentalEnabled===false||p.isPackage||p.isService||p.isProposal||p.moduleSeries||!Number.isInteger(n)||n<2)return '';
 return detail?`Vi har ${n} stk. Antall tilgjengelig for ønsket periode avklares i tilbudet.`:`${n} stk. til utleie${variantLabel?" · "+variantLabel:""}`;
}
export function rentalStockMarkup(p,options){const text=rentalStockText(p,options);return text?'<p class="hint rental-stock">'+text.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'</p>':'';}
