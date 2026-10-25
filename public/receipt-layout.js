// Shared ordering for customer email, internal email and the on-screen receipt.
export function receiptGroupLabel(group){return group.type==='sofa'?group.name:group.name+' · '+group.quantity+(group.quantity===1?' pakke':' pakker');}
export function receiptEntries(lines){
 const buckets=new Map();for(const l of lines){const key=l.group?.id||'';if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(l);}
 const entries=[];
 for(const bucket of buckets.values()){const group=bucket[0]?.group;if(group)entries.push({type:'group',group});const remaining=[...bucket];
  while(remaining.length){const ready=l=>!l.addonFor?.some(parent=>remaining.some(p=>p.id===parent.id));let index=remaining.findIndex(l=>l.addonFor?.length&&ready(l));if(index<0)index=remaining.findIndex(ready);entries.push({type:'line',line:remaining.splice(index<0?0:index,1)[0]});}
 }
 return entries;
}

// Older saved receipts may contain generated addon text in the facts as well.
export function receiptFacts(facts=[]){
 return facts.filter(([label,value])=>!(/^Ønsker til (Tekstilpakke|Dekorpakke)\b/i.test(label)&&/^\d+ sett: Stylistens (valg|sammensetning)\b/i.test(value)&&!/(?:dyne|enkel|dobbel)/i.test(value)));
}
export function deliveryReceiptLine(delivery){
 if(!delivery)return null;
 return {id:'receipt-transport',name:'Transport',image:'/assets/transport-truck.png',quantity:1,basis:delivery.label||'Transport avklares i tilbudet',total:delivery.total??null,transport:true};
}

// Transport is included in the heading only when its amount is known.
export function receiptTotalLabel(receipt){
 const mode=['rental','purchase','mixed'].includes(receipt.acquisition)?receipt.acquisition:receipt.kind==='purchase'?'purchase':'rental';
 const label=mode==='purchase'?'Beregnet kjøpesum':mode==='mixed'?'Beregnet sum for leie og kjøp':'Beregnet leiesum';
 const delivery=receipt.delivery,known=Number.isFinite(delivery?.total)&&delivery.total>=0;
 const transported=known&&(delivery.total>0||/inkludert|ønsker levering|kun levering|kun henting/i.test(delivery.label||''));
 return label+(transported?' inkl. transport':'');
}
