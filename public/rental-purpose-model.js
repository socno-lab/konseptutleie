// Customer navigation groups the existing catalog assignments without changing admin data.
import {matchesPurpose as matchesCatalogPurpose,prioritizePackages} from './purpose-model.js?v=purpose1';
export {prioritizePackages};
export const purposes=[
 {id:'boligsalg',label:'Boligfoto og visning'},
 {id:'messe',label:'Messe, stand og event'},
 {id:'bedrift',label:'Bedrift'},
 {id:'fest',label:'Bryllup og fest'},
 {id:'jul',label:'Jul og sesong'},
 {id:'alle',label:'Vis alle'}
];
export const validPurpose=value=>value==='event'?'messe':purposes.some(p=>p.id===value)?value:'alle';
const businessCategories=new Set(['Sofaer','Modulsofaer','Stoler','Bord','Hyller','Tepper','Kunstige planter','Kunstige blomster','Dekor']);
const businessPackages=new Set(['obj_8f62b216c40348b29d42b4c7b9c0c6a0','obj_b71d8247647e4575965649ddfa802485']);
const occasionPackages=new Set(['obj_b3af6675a38744e0bc567acc3c547849','obj_3aaf7f39d05041b5a68f0f51bb66f705','obj_f3e152bb768e4178a82fd39136efc0ae','obj_8278a918ddb64adf9f521db17a55fe88','obj_82cd3d7f152a41c3b6d6b5f04a4352f7']);
export function matchesPurpose(product,value){
 const purpose=validPurpose(value);
 if(purpose==='alle')return true;
 if(product.id==='obj_a6ca0b4ab5d94e0b811e2fddf13b13b9')return purpose==='bedrift';
 if(purpose==='bedrift'&&product.isPackage&&product.businessPurchase===true)return true;
 if(purpose==='boligsalg')return matchesCatalogPurpose(product,purpose);
 if(purpose==='fest')return matchesCatalogPurpose(product,'event')&&!['obj_e5808483ea4f4c5cbad08a5a6bb33f53','obj_b71d8247647e4575965649ddfa802485','obj_8f62b216c40348b29d42b4c7b9c0c6a0'].includes(product.id);
 if(purpose==='jul')return product.isPackage?occasionPackages.has(product.id):matchesCatalogPurpose(product,'event')&&['Dekor','Kunstige planter','Kunstige blomster'].includes(product.category);
 const shared=matchesCatalogPurpose(product,'messe')||matchesCatalogPurpose(product,'event');
 if(purpose==='messe')return shared&&!occasionPackages.has(product.id);
 return shared&&(product.isPackage?businessPackages.has(product.id):businessCategories.has(product.category));
}
export function readPurposeState(url,saved='alle'){const u=new URL(url);return {purpose:validPurpose(u.searchParams.has('bruk')?u.searchParams.get('bruk'):saved),category:u.searchParams.get('kategori')||'Alle',query:u.searchParams.get('sok')||''};}
export function purposeUrl(url,state){const u=new URL(url);u.searchParams.set('bruk',validPurpose(state.purpose));if(state.category&&state.category!=='Alle')u.searchParams.set('kategori',state.category);else u.searchParams.delete('kategori');if(state.query)u.searchParams.set('sok',state.query);else u.searchParams.delete('sok');return u.pathname+u.search+u.hash;}
