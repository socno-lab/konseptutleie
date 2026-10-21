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
