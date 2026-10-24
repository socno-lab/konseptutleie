import {inheritsPackageAddons,packageAddonChoices} from './package-addon-model.js?v=launch20261024';
import {remaining,ratePlan} from './catalog-model.js?v=launch20261024';
import {addonRequirementError} from './addon-model.js?v=launch20261024';
const count=q=>Number.isInteger(q)&&q>0&&q<=9999;
export const editablePackage=p=>!!p?.isPackage&&!p.isProposal&&!!p.components?.length;
const add=(basket,id,q)=>{if(q)basket[id]=(basket[id]||0)+q;};
const subtract=(basket,selection)=>{const out={...basket};for(const [id,q] of Object.entries(selection)){out[id]=Math.max(0,(out[id]||0)-q);if(!out[id])delete out[id];}return out;};
export function validPackageBasket(basket,products){if(addonRequirementError(basket,products))return false;return Object.entries(basket).every(([id,q])=>{const base={...basket};delete base[id];return count(q)&&q<=remaining(id,base,products);});}
// Claims annotate quantities already present in the real basket; they never add stock demand.
export function packageCartView(basket,products,saved=[],links={}){
 let loose={...basket};const groups=[],seen=new Set();
 for(const raw of Array.isArray(saved)?saved.slice(0,100):[]){
  if(!raw||typeof raw.id!=='string'||!raw.id.startsWith('custom:')||seen.has(raw.id)||typeof raw.packageId!=='string'||!raw.selection||Array.isArray(raw.selection)||typeof raw.selection!=='object')continue;
  const selection={};for(const [id,q] of Object.entries(raw.selection)){const p=products.find(p=>p.id===id&&p.active&&!p.isPackage);const n=p&&count(q)?Math.min(q,loose[id]||0):0;if(n)selection[id]=n;}
  if(!Object.keys(selection).length)continue;seen.add(raw.id);loose=subtract(loose,selection);
  const product=products.find(p=>p.id===raw.packageId);groups.push({id:raw.id,packageId:raw.packageId,name:product?.name||String(raw.name||'Pakke').slice(0,120),quantity:count(raw.quantity)?raw.quantity:1,selection,custom:true,acquisition:raw.acquisition==='try'?'try':'rent',product});
 }
 for(const p of products.filter(p=>editablePackage(p)&&basket[p.id])){
  const q=basket[p.id],selection={},extras={};for(const c of p.components)add(selection,c.id,c.quantity*q);
  for(const [id,link] of Object.entries(links)){const x=products.find(x=>x.id===id);if((link?.parentId===p.id||link?.packageAllocations?.[p.id])&&p.relatedAddOns?.includes(id)&&loose[id])extras[id]=Math.min(loose[id],link.packageAllocations&&typeof link.packageAllocations==='object'?Math.max(0,Number.isInteger(link.packageAllocations[p.id])?link.packageAllocations[p.id]:0):Number.isInteger(link.packageQuantity)?Math.max(0,link.packageQuantity):x?.category==='Styling'&&x.isService?1:q);}
  loose=subtract(loose,extras);delete loose[p.id];groups.push({id:'fixed:'+p.id,packageId:p.id,name:p.name,quantity:q,selection,extras,custom:false,product:p});
 }
 return {groups,loose,saved:groups.filter(g=>g.custom).map(({id,packageId,name,quantity,selection,acquisition})=>({id,packageId,name,quantity,selection,acquisition}))};
}
export function changePackageItem(basket,products,saved,groupId,itemId,quantity,links={}){
 if(!Number.isInteger(quantity)||quantity<0||quantity>99)return null;
 const view=packageCartView(basket,products,saved,links),group=view.groups.find(g=>g.id===groupId);if(!group||group.product?.packageEditable===false||!Object.hasOwn(group.selection,itemId)&&!Object.hasOwn(group.extras||{},itemId))return null;
 const selection={...group.selection};for(const [id,q] of Object.entries(group.extras||{}))add(selection,id,q);
 let draft=group.custom?subtract(basket,selection):subtract(basket,{[group.packageId]:group.quantity,...group.extras});
 if(quantity)selection[itemId]=quantity;else delete selection[itemId];
 if(inheritsPackageAddons(group.product,products)){const optional=new Set(packageAddonChoices(group.product,products).map(c=>c.id)),main=Object.fromEntries(Object.entries(selection).filter(([id])=>!optional.has(id))),limits=new Map(packageAddonChoices(group.product,products,main).map(c=>[c.id,c.quantity]));for(const id of optional)if((selection[id]||0)>(limits.get(id)||0))return null;}
 for(const [id,q] of Object.entries(selection))add(draft,id,q);
 if(!validPackageBasket(draft,products))return null;
 const next=view.saved.filter(g=>g.id!==group.id);if(Object.keys(selection).length)next.push({id:group.custom?group.id:'custom:'+group.packageId,packageId:group.packageId,name:group.name,quantity:group.quantity,acquisition:group.acquisition,selection});
 // A second edited batch of the same package joins its existing customised group.
 const merged=[];for(const g of next){const existing=merged.find(x=>x.id===g.id);if(existing){existing.quantity+=g.quantity;for(const [id,q] of Object.entries(g.selection))add(existing.selection,id,q);}else merged.push({...g,selection:{...g.selection}});}
 return {basket:draft,groups:merged};
}
export function removePackageGroup(basket,products,saved,groupId,links={}){
 const view=packageCartView(basket,products,saved,links),g=view.groups.find(g=>g.id===groupId);if(!g)return null;
 const draft=subtract(basket,g.custom?g.selection:{[g.packageId]:g.quantity,...g.extras});if(!validPackageBasket(draft,products))return null;
 return {basket:draft,groups:view.saved.filter(x=>x.id!==g.id)};
}
export function packageGroupRates(group,products){
 const lines=group.custom?Object.entries(group.selection).map(([id,q])=>({p:products.find(p=>p.id===id),q})):[{p:group.product,q:group.quantity}];
 return {priceOnRequest:lines.some(x=>!x.p||x.p.priceOnRequest),...Object.fromEntries(['price','weekPrice','monthPrice'].map(key=>[key,lines.reduce((n,{p,q})=>n+(p?.[key]||0)*q,0)]))};
}
export function packageGroupPeriodTotal(group,products,days){
 const lines=group.custom?Object.entries(group.selection):[[group.packageId,group.quantity]];
 if(!Number.isInteger(days)||days<1)return null;let sum=0;for(const [id,q] of lines){const p=products.find(p=>p.id===id);if(!p||p.priceOnRequest)return null;const plan=ratePlan(p,days,products);if(!plan)return null;sum+=plan.total*q;}return Math.round(sum*100)/100;
}
