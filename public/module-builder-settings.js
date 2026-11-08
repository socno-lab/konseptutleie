// Rental defaults and requirements are independent of stock and purchase rules.
export const requiredModuleQuantity=p=>p.rentalRequiredQuantity??(p.moduleRequired?1:0);
export function configuredModuleStart(modules){
 const explicit=modules.some(p=>p.rentalStartQuantity!=null);
 if(explicit)return Object.fromEntries(modules.map(p=>[p.id,Math.max(p.rentalStartQuantity??0,requiredModuleQuantity(p))]));
 if(modules.some(p=>/Copacabana/i.test(p.moduleSeries||'')))return Object.fromEntries(modules.map(p=>[p.id,p.moduleRole==='middle'?1:0]));
 return null;
}
export function moduleStartCandidates(modules,pictured,fallback){
 const configured=configuredModuleStart(modules);
 const required=Object.fromEntries(modules.map(p=>[p.id,requiredModuleQuantity(p)]));
 return configured?[configured,required]:[pictured,fallback,required];
}
