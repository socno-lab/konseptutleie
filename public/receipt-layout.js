// Shared ordering for customer email, internal email and the on-screen receipt.
export function receiptEntries(lines){
 const buckets=new Map();for(const l of lines){const key=l.group?.id||'';if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(l);}
 const entries=[];
 for(const bucket of buckets.values()){const group=bucket[0]?.group;if(group)entries.push({type:'group',group});const remaining=[...bucket];
  while(remaining.length){const ready=l=>!l.addonFor?.some(parent=>remaining.some(p=>p.id===parent.id));let index=remaining.findIndex(l=>l.addonFor?.length&&ready(l));if(index<0)index=remaining.findIndex(ready);entries.push({type:'line',line:remaining.splice(index<0?0:index,1)[0]});}
  if(group)entries.push({type:'subtotal',group,total:bucket.some(l=>l.total===null)?null:Math.round(bucket.reduce((n,l)=>n+l.total,0)*100)/100});
 }
 return entries;
}
