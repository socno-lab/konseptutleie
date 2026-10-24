export const purposeOrderScopes=Object.freeze(['boligsalg','messe','bedrift','fest','jul','alle']);
const validPriority=value=>Number.isInteger(value)&&value>=-9999&&value<=9999;
const isRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));

// An absent entry follows the existing catalog order; zero is an explicit priority.
export function validatePurposeOrder(value){
 if(value===undefined)return {};
 if(!isRecord(value))throw Error('Ugyldig sortering per bruksområde.');
 const result={};
 for(const [scope,priority] of Object.entries(value)){
  if(!purposeOrderScopes.includes(scope)||!validPriority(priority))throw Error('Ugyldig sortering per bruksområde: '+scope);
  result[scope]=priority;
 }
 return result;
}

function productsForCard(card){
 if(Array.isArray(card?.products))return card.products;
 return card?.product?[card.product]:[card];
}

function priorityForProduct(product,purpose){
 const order=product?.purposeOrder;
 return isRecord(order)&&Object.hasOwn(order,purpose)&&validPriority(order[purpose])?order[purpose]:undefined;
}

function isChristmasOffering(product){
 return product?.offeringType==='service'&&product.serviceGroup==='Klart til jul'||
  !!product?.isPackage&&/^Klart til jul(?:\s*[–-]\s*\d+\s*cm)?$/.test(product.name||'');
}

// Apply after the established package/group ordering and after filtering by purpose.
// A grouped card uses its lowest explicit member priority. Supply only visible members
// through .products or the selector when a series contains different purpose scopes.
export function sortByPurposeOrder(cards,purpose,{productsForCard:selectProducts=productsForCard}={}){
 if(!Array.isArray(cards))throw TypeError('Produktkort må være en liste.');
 const scope=purpose==='event'?'messe':purpose;
 if(!purposeOrderScopes.includes(scope))return [...cards];
 return cards.map((card,index)=>{
  const selected=selectProducts(card);
  const products=Array.isArray(selected)?selected:selected?[selected]:[];
  const explicit=products.map(product=>priorityForProduct(product,scope)).filter(value=>value!==undefined);
  const priority=explicit.length?Math.min(...explicit):undefined;
  const fallback=scope==='jul'&&priority===undefined&&products.some(isChristmasOffering);
  return {card,index,tier:priority!==undefined?0:fallback?1:2,priority:priority??0};
 }).sort((a,b)=>a.tier-b.tier||a.priority-b.priority||a.index-b.index).map(entry=>entry.card);
}
