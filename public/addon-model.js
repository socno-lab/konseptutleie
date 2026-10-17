const bedId='obj_41926e1953e546398f78ac60eeaf68a3';
const bedding={obj_18f70f2aa07b4ee897f06e27d21274e7:1,obj_6d5d9d47eb1c46a282ee369da8928c35:2};
export function addonFields(p){const units=bedding[p.id];return {addonOnly:p.addonOnly??(!!units||p.id==='obj_1cd92777d68c44ddbc1fe0f9dc72b032'),requiredProductId:p.requiredProductId??(units?bedId:''),requiredProductQuantity:p.requiredProductQuantity??(units||0)};}
function quantities(basket,products){const counts={};for(const [id,q] of Object.entries(basket)){const p=products.find(x=>x.id===id);if(!p)continue;for(const c of p.isPackage?p.components||[]:[{id,quantity:1}])counts[c.id]=(counts[c.id]||0)+q*c.quantity;}return counts;}
export function addonRequirementError(basket,products){const counts=quantities(basket,products),needed={};for(const p of products){if(!p.requiredProductId||!counts[p.id])continue;needed[p.requiredProductId]=(needed[p.requiredProductId]||0)+counts[p.id]*p.requiredProductQuantity;}
 for(const [id,count] of Object.entries(needed))if((counts[id]||0)<count){const base=products.find(p=>p.id===id);return 'Tilvalgene krever '+count+' × '+(base?.name||'tilhørende produkt')+'. Øk antall hovedprodukter eller reduser tilvalgene.';}return '';}
export function normalizeAddOnBasket(basket,products){const out={...basket};if(!addonRequirementError(out,products))return out;
 // Keep furniture and fixed packages; trim optional add-ons that exceed their base products.
 for(const p of products.filter(p=>p.requiredProductId&&!p.isPackage)){if(!out[p.id])continue;const requested=out[p.id];delete out[p.id];for(let q=requested;q>0;q--){const draft={...out,[p.id]:q};if(!addonRequirementError(draft,products)){out[p.id]=q;break;}}}
 // Invalid fixed packages cannot be repaired by changing their internal contents.
 for(const p of products.filter(p=>p.isPackage))while(out[p.id]&&addonRequirementError(out,products)){if(--out[p.id]===0)delete out[p.id];}
 return out;}
export function cartChange(basket,products,id,quantity){const draft={...basket};if(quantity>0)draft[id]=quantity;else delete draft[id];return addonRequirementError(draft,products)?null:draft;}
