// Presentation only: catalogue, basket, quotes and submitted amounts remain gross.
export const priceDisplayKey='konsept-price-display-v1';
export const priceDefaultKey='konsept-price-default-v1';
export function defaultPriceMode({purpose,occasion,scope}={}){
 if(purpose&&purpose!=='alle')return ['messe','event','bedrift','produksjon'].includes(purpose)?'excl':'incl';
 if(occasion)return ['Bedrift','Messe og stand','Foto, film og reklame'].includes(occasion)?'excl':'incl';
 return scope==='standard'?'incl':null;
}
export const validPriceMode=value=>value==='excl'?'excl':'incl';
const round=value=>Math.round((value+Number.EPSILON)*100)/100;
export function priceParts(gross){const net=round(gross/1.25);return {gross,net,vat:round(gross-net)};}
export function displayedPrice(gross,mode='incl'){return mode==='excl'?priceParts(gross).net:gross;}
export function formatPrice(value){return (value<0?'−':'')+new Intl.NumberFormat('nb-NO',{minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:2}).format(Math.abs(value))+'\u00a0kr';}
// The exact gross value survives repeated mode changes and later re-rendering.
export function priceMarkup(gross){return Number.isFinite(gross)?'<span data-price-gross="'+gross+'">'+formatPrice(gross)+'</span>':'Pris på forespørsel';}
function storedMode(key,local,session){
 for(const storage of [session,local])try{const value=storage?.getItem(key);if(value==='incl'||value==='excl')return value;}catch{}
 return null;
}
export function readPriceMode(local,session){
 return storedMode(priceDisplayKey,local,session)||storedMode(priceDefaultKey,local,session)||'incl';
}
export function saveDefaultPriceMode(context,local,session){
 const mode=defaultPriceMode(context);if(mode)saveMode(priceDefaultKey,mode,local,session);
 return storedMode(priceDisplayKey,local,session)||mode||storedMode(priceDefaultKey,local,session)||'incl';
}
export function savePriceMode(mode,local,session){return saveMode(priceDisplayKey,mode,local,session);}
function saveMode(key,mode,local,session){
 const value=validPriceMode(mode);
 try{if(local){local.setItem(key,value);try{session?.removeItem(key);}catch{}return value;}}catch{}
 try{session?.setItem(key,value);}catch{}return value;
}
export function taxDisplayText(text,mode){
 if(mode!=='excl')return text;
 return text.replace(/inkl\. mva\./gi,word=>word[0]==='I'?'Ekskl. mva.':'ekskl. mva.')
  .replace(/inkluderer valgt bruk og mva\./g,'inkluderer valgt bruk, ekskl. mva.')
  .replace(/inkluderer mva\./g,'er ekskl. mva.');
}

