import {mediaUsage} from './images.mjs';
const fail=message=>{throw Object.assign(Error(message),{status:409});};
export function planTrashPurge(catalog,images,input){
 if(input.confirmation!=='SLETT')throw Object.assign(Error('Skriv SLETT for å bekrefte permanent sletting.'),{status:400});
 const {productIds,mediaUrls}=input;
 if(!Array.isArray(productIds)||!Array.isArray(mediaUrls)||productIds.length>500||mediaUrls.length>3000||productIds.some(id=>typeof id!=='string')||mediaUrls.some(url=>typeof url!=='string')||new Set(productIds).size!==productIds.length||new Set(mediaUrls).size!==mediaUrls.length||!productIds.length&&!mediaUrls.length)throw Object.assign(Error('Ugyldig utvalg for sletting.'),{status:400});
 const removing=new Set(productIds),products=catalog.products.filter(p=>!removing.has(p.id));
 for(const id of productIds){const item=catalog.products.find(p=>p.id===id);if(!item?.deletedAt)fail('Bare produkter som ligger i papirkurven kan slettes permanent. Last inn på nytt.');const owners=products.filter(p=>p.components?.some(c=>c.id===id)||p.relatedAddOns?.includes(id)||p.relatedPackages?.includes(id));if(owners.length)fail(item.name+' er koblet til '+owners.map(p=>p.name+(p.deletedAt?' (i papirkurven)':'')).join(', ')+'. Fjern koblingen, eller slett de koblede oppføringene sammen.');}
 for(const url of mediaUrls){const image=images.find(m=>m.url===url);if(!image?.deletedAt)fail('Bare bilder som ligger i papirkurven kan slettes permanent. Last inn på nytt.');const uses=mediaUsage(image,products);if(uses.length)fail('Bildet '+image.name+' brukes av '+uses.map(p=>p.name).join(', ')+'. Fjern bildet fra produktene først.');}
 return {products,mediaUrls};
}
