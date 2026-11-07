// Owned capacity only; date availability and basket quantities are separate.
export function rentalOwnedCount(p,products=[],seen=new Set()){
 if(!p||p.rentalEnabled===false||p.isService||p.isProposal )return 0;
 if(!p.isPackage)return Number.isInteger(p.stock)&&p.stock>0?p.stock:0;
 if(seen.has(p.id))return 0;
 if(!p.components?.length)return Number.isInteger(p.stock)&&p.stock>0?p.stock:0;
 const next=new Set(seen).add(p.id),required=new Map();
 for(const c of p.components){if(!Number.isFinite(c.quantity)||c.quantity<=0)return 0;required.set(c.id,(required.get(c.id)||0)+c.quantity);}
 const counts=[];
 for(const [id,q] of required){const item=products.find(x=>x.id===id);if(!item||item.active===false||item.deletedAt)return 0;if(item.isService)continue;counts.push(Math.floor(rentalOwnedCount(item,products,next)/q));}
 return counts.length?Math.min(...counts):0;
}
export function rentalStockText(p,{detail=false,variantLabel="",products=[],series=false}={}){
 if(!p||p.rentalEnabled===false)return "";
 if(p.isService||p.isProposal||(p.isPackage&&p.components?.length&&p.components.every(c=>products.find(x=>x.id===c.id)?.isService)))return "Tilpasses etter behov";
 const n=series&&p.moduleSeries?products.filter(x=>x.moduleSeries===p.moduleSeries&&x.active!==false&&!x.deletedAt).reduce((sum,x)=>sum+rentalOwnedCount(x,products),0):rentalOwnedCount(p,products);
 if(!n)return "Tilgjengelighet avklares";
 const unit=series&&p.moduleSeries?(n===1?'modul':'moduler'):p.isPackage?(n===1?'pakke':'pakker'):'stk.';
 return detail?`Vi har ${n} ${unit}. Antall tilgjengelig for ønsket periode avklares i tilbudet.`:`${n} ${unit} til utleie${variantLabel?' · '+variantLabel:''}`;
}
export function rentalStockMarkup(p,options={}){const text=rentalStockText(p,options),escaped=text.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));return !text?'':options.detail?'<p class="hint rental-stock">'+escaped+'</p>':'<span class="rental-stock-strip">'+escaped+'</span>';}
