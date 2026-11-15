// Presentation only: catalogue, basket, quotes and submitted amounts remain gross.
export const priceDisplayKey='konsept-price-display-v1';
export const validPriceMode=value=>value==='excl'?'excl':'incl';
const round=value=>Math.round((value+Number.EPSILON)*100)/100;
export function priceParts(gross){const net=round(gross/1.25);return {gross,net,vat:round(gross-net)};}
export function displayedPrice(gross,mode='incl'){return mode==='excl'?priceParts(gross).net:gross;}
export function formatPrice(value){return (value<0?'−':'')+new Intl.NumberFormat('nb-NO',{minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(Math.abs(value))+'\u00a0kr';}
// The exact gross value survives repeated mode changes and later re-rendering.
export function priceMarkup(gross){return Number.isFinite(gross)?'<span data-price-gross="'+gross+'">'+formatPrice(gross)+'</span>':'Pris på forespørsel';}
export function readPriceMode(local,session){
 try{const fallback=session?.getItem(priceDisplayKey);if(fallback==='incl'||fallback==='excl')return fallback;}catch{}
 try{return validPriceMode(local?.getItem(priceDisplayKey));}catch{return 'incl';}
}
export function savePriceMode(mode,local,session){
 const value=validPriceMode(mode);
 try{if(local){local.setItem(priceDisplayKey,value);try{session?.removeItem(priceDisplayKey);}catch{}return value;}}catch{}
 try{session?.setItem(priceDisplayKey,value);}catch{}return value;
}
export function taxDisplayText(text,mode){
 if(mode!=='excl')return text;
 return text.replace(/inkl\. mva\./gi,word=>word[0]==='I'?'Ekskl. mva.':'ekskl. mva.')
  .replace(/inkluderer valgt bruk og mva\./g,'inkluderer valgt bruk, ekskl. mva.')
  .replace(/inkluderer mva\./g,'er ekskl. mva.');
}

