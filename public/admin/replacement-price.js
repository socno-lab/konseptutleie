// Customer price protection applies to replacements caused by missing stock.
// Use the agreed document, falling back to the original requested line.
export function shortageReplacementPrice(record,line,total){
 if(!line.originalMissing||!Number.isFinite(total))return total;
 const histories=record.history||[],confirmation=[...histories].reverse().find(h=>h.type==='confirmation'&&h.document?.workflow),offer=histories.find(h=>h.type==='offer'&&h.id===record.acceptedOfferId&&h.document?.workflow),document=(confirmation||offer)?.document?.workflow;
 if(document&&['start','end','scope'].some(k=>document[k]!==record[k]))return total;
 const source=(document?.lines||record.lines||[]).find(l=>l.key===line.key);
 if(!source)return total;
 const id=document?source.id:source.originalId||source.id,quantity=document?source.quantity:source.originalQuantity??source.quantity,amount=document?source.total:source.originalTotal??source.total;
 if(id===line.id||!Number.isFinite(amount)||!quantity)return total;
 return Math.min(total,Math.round(amount/quantity*line.quantity*100)/100);
}
