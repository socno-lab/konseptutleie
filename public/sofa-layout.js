// Limits apply to one sofa setup, not to aggregate rental stock or the cart.
const count=(selection,p)=>Math.max(0,Number(selection[p.id])||0);
export function sofaLayoutError(modules,selection){
 let left=0,right=0,universal=0;
 for(const p of modules){const q=count(selection,p);if(p.moduleRole==='base'){left+=q;right+=q;}else if(p.moduleRole==='left')left+=q;else if(p.moduleRole==='right')right+=q;else if(p.moduleRole==='end')universal+=q;}
 if(left>1)return 'Én sofa kan ha maks én venstre endemodul.';
 if(right>1)return 'Én sofa kan ha maks én høyre endemodul.';
 if(left+right+universal>2)return 'Én sofa kan ha maks to endemoduler – én på hver side.';
 return '';
}
export function moduleQuantityLimit(modules,selection,p){
 if(!['base','left','right','end'].includes(p.moduleRole))return 99;
 const rest={...selection,[p.id]:0};
 let limit=0;for(let q=1;q<=2;q++){if(sofaLayoutError(modules,{...rest,[p.id]:q}))break;limit=q;}
 return limit;
}
// Preserve surplus modules as ordinary cart items when reopening an older setup.
export function fitSofaEnds(modules,selection){
 const result={...selection};
 for(const p of [...modules].sort((a,b)=>(a.moduleRole==='base'?-1:0)-(b.moduleRole==='base'?-1:0))){
  if(['base','left','right','end'].includes(p.moduleRole))result[p.id]=Math.min(count(selection,p),moduleQuantityLimit(modules,result,p));
 }
 for(const id of Object.keys(result))if(!result[id])delete result[id];
 return result;
}

// Rental minimum applies to modules together, never to textile/decor add-ons.
export function moduleRentalMinimum(modules){return Math.max(1,...modules.filter(p=>p.active&&!p.deletedAt&&p.rentalEnabled!==false).map(p=>Number.isInteger(p.rentalModuleMinimum)?p.rentalModuleMinimum:1));}
export function rentalModuleRequirementError(basket,products){
 const totals=new Map(),series=new Map();
 for(const p of products)if(p.active&&!p.deletedAt&&p.moduleSeries){const list=series.get(p.moduleSeries)||[];list.push(p);series.set(p.moduleSeries,list);}
 const add=(p,q)=>{if(p?.moduleSeries&&p.rentalEnabled!==false)totals.set(p.moduleSeries,(totals.get(p.moduleSeries)||0)+q*(p.moduleRole==='base'?2:1));};
 for(const [id,q] of Object.entries(basket)){const p=products.find(p=>p.id===id);if(!p||!Number.isInteger(q)||q<1)continue;if(p.isPackage)for(const c of p.components||[])add(products.find(p=>p.id===c.id),q*c.quantity);else add(p,q);}
 for(const [name,count] of totals){const min=moduleRentalMinimum(series.get(name)||[]);if(count<min)return `${name}: Velg minst ${min} moduler totalt fra samme serie.`;}
 return '';
}
