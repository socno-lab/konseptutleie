// Customer navigation groups the existing catalog assignments without changing admin data.
import {matchesPurpose as matchesCatalogPurpose,prioritizePackages} from './purpose-model.js?v=purpose1';
export {prioritizePackages};
export const purposes=[
 {id:'boligsalg',label:'Boligfoto og visning'},
 {id:'messe',label:'Messe, stand og event'},
 {id:'bedrift',label:'Bedrift'},
 {id:'alle',label:'Vis alle'}
];
export const validPurpose=value=>value==='event'?'messe':purposes.some(p=>p.id===value)?value:'alle';
const businessCategories=new Set(['Sofaer','Modulsofaer','Stoler','Bord','Hyller','Tepper','Kunstige planter','Kunstige blomster','Dekor']);
const businessPackages=new Set(['obj_8f62b216c40348b29d42b4c7b9c0c6a0','obj_b71d8247647e4575965649ddfa802485']);
export function matchesPurpose(product,value){
 const purpose=validPurpose(value);
 if(purpose==='alle')return true;
 if(purpose==='boligsalg')return matchesCatalogPurpose(product,purpose);
 const shared=matchesCatalogPurpose(product,'messe')||matchesCatalogPurpose(product,'event');
 if(purpose==='messe')return shared;
 return shared&&(product.isPackage?businessPackages.has(product.id):businessCategories.has(product.category));
}
export function readPurposeState(url,saved='alle'){const u=new URL(url);return {purpose:validPurpose(u.searchParams.has('bruk')?u.searchParams.get('bruk'):saved),category:u.searchParams.get('kategori')||'Alle',query:u.searchParams.get('sok')||''};}
export function purposeUrl(url,state){const u=new URL(url);u.searchParams.set('bruk',validPurpose(state.purpose));if(state.category&&state.category!=='Alle')u.searchParams.set('kategori',state.category);else u.searchParams.delete('kategori');if(state.query)u.searchParams.set('sok',state.query);else u.searchParams.delete('sok');return u.pathname+u.search+u.hash;}
