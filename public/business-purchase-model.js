// Only explicitly designated business packages offer purchase or purchase after rental.
export const defaultBusinessPackageIds=new Set(['obj_8f62b216c40348b29d42b4c7b9c0c6a0','obj_b71d8247647e4575965649ddfa802485','obj_a6ca0b4ab5d94e0b811e2fddf13b13b9']);
export const businessPackageIds=new Set(defaultBusinessPackageIds);
export function businessPurchaseEnabled(p){return !!p?.isPackage&&(p.businessPurchase??defaultBusinessPackageIds.has(p.id))===true;}
export function configureBusinessPackages(products){businessPackageIds.clear();for(const p of products)if(businessPurchaseEnabled(p))businessPackageIds.add(p.id);}
export const acquisitionLabels={rent:'Kun leie',buy:'Kjøpe',try:'Leie med kjøpsmulighet etter leieperioden'};
export const acquisitionMode=value=>Object.hasOwn(acquisitionLabels,value)?value:'rent';
export function cleanBusinessChoices(value){if(!value||typeof value!=='object'||Array.isArray(value))return {};return Object.fromEntries(Object.entries(value).filter(([id,mode])=>businessPackageIds.has(id)&&Object.hasOwn(acquisitionLabels,mode)));}
export function splitAcquisitionBasket(basket,choices){const rental={},purchase={};for(const [id,q] of Object.entries(basket)){(businessPackageIds.has(id)&&choices[id]==='buy'?purchase:rental)[id]=q;}return {rental,purchase};}
export function packagePurchasePrice(p,quantity=1){return businessPurchaseEnabled(p)&&typeof p.purchasePrice==='number'&&Number.isFinite(p.purchasePrice)&&p.purchasePrice>0?Math.round(p.purchasePrice*quantity*100)/100:null;}
