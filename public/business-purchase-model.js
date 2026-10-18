// Purchase is offered by quote for these business furnishing packages only.
export const businessPackageIds=new Set(['obj_8f62b216c40348b29d42b4c7b9c0c6a0','obj_b71d8247647e4575965649ddfa802485','obj_a6ca0b4ab5d94e0b811e2fddf13b13b9']);
export const acquisitionLabels={rent:'Leie',buy:'Kjøpe',try:'Leie først, vurdere kjøp senere'};
export const acquisitionMode=value=>Object.hasOwn(acquisitionLabels,value)?value:'rent';
export function cleanBusinessChoices(value){if(!value||typeof value!=='object'||Array.isArray(value))return {};return Object.fromEntries(Object.entries(value).filter(([id,mode])=>businessPackageIds.has(id)&&Object.hasOwn(acquisitionLabels,mode)));}
export function splitAcquisitionBasket(basket,choices){const rental={},purchase={};for(const [id,q] of Object.entries(basket)){(businessPackageIds.has(id)&&choices[id]==='buy'?purchase:rental)[id]=q;}return {rental,purchase};}
