import {addonRequirementError,normalizeAddOnBasket} from './addon-model.js';
export function demand(product,quantity=1){return product.isPackage?(product.components||[]).map(c=>({id:c.id,quantity:c.quantity*quantity})):[{id:product.id,quantity}];}
export function remaining(id,basket,products){const p=products.find(p=>p.id===id);if(!p||!p.active)return 0;if(p.isService)return Math.max(0,99-(basket[id]||0));const used={};for(const [key,q] of Object.entries(basket)){const item=products.find(x=>x.id===key);if(item)for(const d of demand(item,q))used[d.id]=(used[d.id]||0)+d.quantity;}const requirements=demand(p);if(!requirements.length)return 0;return Math.max(0,Math.min(99-(basket[id]||0),...requirements.map(d=>{const item=products.find(x=>x.id===d.id);return item&&item.active?Math.floor((Math.max(0,item.stock-item.unavailable)-(used[d.id]||0))/d.quantity):0;})));}
export function normalizeBasket(basket,products){const out={};for(const p of products){const requested=Number(basket[p.id]);if(Number.isInteger(requested)&&requested>0){const q=Math.min(requested,remaining(p.id,out,products));if(q>0)out[p.id]=q;}}return normalizeAddOnBasket(out,products);}
export function rentalDays(start,end){if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return null;const a=Date.parse(start+'T00:00:00Z'),b=Date.parse(end+'T00:00:00Z');return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?Math.round((b-a)/86400000)+1:null;}
export function rentalEstimate(basket,products,start,end){const days=rentalDays(start,end);const chosen=products.filter(p=>basket[p.id]);const daily=chosen.reduce((sum,p)=>sum+(p.priceOnRequest?0:basket[p.id]*p.price),0);const lines=days===null?[]:chosen.map(p=>({id:p.id,name:p.name,quantity:basket[p.id],plan:p.priceOnRequest?null:ratePlan(p,days)}));const hasUnpriced=chosen.some(p=>p.priceOnRequest);const knownSubtotal=days===null?null:Math.round(lines.reduce((sum,line)=>sum+(line.plan?line.quantity*line.plan.total:0),0)*100)/100;const total=hasUnpriced?null:knownSubtotal;return {days,daily,total,lines,hasUnpriced,knownSubtotal,saving:days===null?0:Math.round((daily*days-knownSubtotal)*100)/100};}

export function ratePlan(product,days){
 if(!Number.isInteger(days)||days<1)return null;
 const rates=[{days:1,price:product.price,label:'døgn'},{days:7,price:product.weekPrice??product.price*5,label:'uke'},{days:30,price:product.monthPrice??product.price*15,label:'måned'}];
 const cost=new Float64Array(days+1),coverage=new Int32Array(days+1),choice=new Uint8Array(days+1);
 for(let d=1;d<=days;d++){cost[d]=Infinity;for(let i=0;i<rates.length;i++){const r=rates[i],previous=Math.max(0,d-r.days),candidate=cost[previous]+Math.round(r.price*100),covered=coverage[previous]+r.days;if(candidate<cost[d]||(candidate===cost[d]&&covered<coverage[d])){cost[d]=candidate;coverage[d]=covered;choice[d]=i;}}}
 const counts=[0,0,0];for(let d=days;d>0;){const i=choice[d];counts[i]++;d=Math.max(0,d-rates[i].days);}
 const breakdown=counts.map((count,i)=>({count,...rates[i]})).filter(x=>x.count>0).reverse();return {total:cost[days]/100,coveredDays:coverage[days],saving:Math.round((product.price*days-cost[days]/100)*100)/100,breakdown};
}
export function planText(plan){return plan.breakdown.map(r=>`${r.count} ${r.label}${r.count>1?(r.label==='uke'?'r':r.label==='måned'?'er':''):''}`).join(' + ');}
export function moduleConfiguration(series,selection,basket,products){const modules=products.filter(p=>p.moduleSeries===series&&!p.isPackage&&p.active);const base={...basket};for(const p of modules)delete base[p.id];const chosen=modules.filter(p=>Number(selection[p.id])>0);let valid=chosen.length>0;for(const p of modules){const q=selection[p.id]??0;if(!Number.isInteger(q)||q<0||q>remaining(p.id,base,products))valid=false;}return {valid,modules,base,priceOnRequest:chosen.some(p=>p.priceOnRequest),count:chosen.reduce((n,p)=>n+selection[p.id],0),widthKnown:chosen.length>0&&chosen.every(p=>p.moduleWidth>0),width:Math.round(chosen.reduce((n,p)=>n+selection[p.id]*p.moduleWidth,0)*10)/10,price:chosen.reduce((n,p)=>n+selection[p.id]*p.price,0),weekPrice:chosen.reduce((n,p)=>n+selection[p.id]*(p.weekPrice??p.price*5),0),monthPrice:chosen.reduce((n,p)=>n+selection[p.id]*(p.monthPrice??p.price*15),0)};}
export function modulePreset(modules,ends,middles){const result={};const end=modules.find(p=>p.moduleRole==='end'),left=modules.find(p=>p.moduleRole==='left'),right=modules.find(p=>p.moduleRole==='right'),middle=modules.find(p=>p.moduleRole==='middle');if(ends){if(end)result[end.id]=ends;else if(ends===2&&left&&right){result[left.id]=1;result[right.id]=1;}else return null;}if(middles){if(!middle)return null;result[middle.id]=middles;}return result;}

export function selectionDraft(basket,products,id,quantity,extraId='',extraQuantity=0){
 const p=products.find(x=>x.id===id&&x.active);if(!p||p.addonOnly||!Number.isInteger(quantity)||quantity<1)return null;
 const draft={...basket};
 if(p.isPackage)for(const c of p.components||[]){const base=products.find(x=>x.id===c.id);if(base?.type==='sofa'&&draft[c.id]){draft[c.id]=Math.max(0,draft[c.id]-c.quantity*quantity);if(!draft[c.id])delete draft[c.id];}}
 if(quantity>remaining(id,draft,products))return null;draft[id]=(draft[id]||0)+quantity;
 if(extraId){if(!p.relatedAddOns?.includes(extraId)||!Number.isInteger(extraQuantity)||extraQuantity<1||extraQuantity>remaining(extraId,draft,products))return null;draft[extraId]=(draft[extraId]||0)+extraQuantity;}
 return addonRequirementError(draft,products)?null:draft;
}

export function groupedCart(basket,products,links={}){
 const chosen=products.filter(p=>basket[p.id]),parents=new Map();
 for(const p of chosen){const explicit=chosen.find(x=>x.id===links[p.id]?.parentId&&x.relatedAddOns?.includes(p.id));const candidates=chosen.filter(x=>x.id!==p.id&&x.relatedAddOns?.includes(p.id));const parent=explicit||(candidates.length===1?candidates[0]:null);if(parent)parents.set(p.id,parent.id);}
 const groups=chosen.filter(p=>!parents.has(p.id)).map(p=>({product:p,children:chosen.filter(x=>parents.get(x.id)===p.id)}));
 const shown=new Set(groups.flatMap(g=>[g.product.id,...g.children.map(x=>x.id)]));for(const p of chosen)if(!shown.has(p.id))groups.push({product:p,children:[]});return groups;
}
