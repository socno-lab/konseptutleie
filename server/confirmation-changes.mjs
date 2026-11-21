export function confirmationChanges(previous,current){
 if(!previous)return null;
 const used=new Set(),rows=(current.lines||[]).map(line=>{
 let index=(previous.lines||[]).findIndex((old,i)=>!used.has(i)&&old.key!=null&&old.key===line.key);
 if(index<0)index=(previous.lines||[]).findIndex((old,i)=>!used.has(i)&&old.id===line.id);
 if(index<0)return [{label:'Ny',text:''}];
 used.add(index);const old=previous.lines[index],changes=[];
 if(old.id!==line.id)changes.push({label:'Byttet vare',text:'Erstatter '+old.name});
 if(old.quantity!==line.quantity)changes.push({label:'Endret antall',text:`${old.quantity} → ${line.quantity} stk.`});
 return changes;
 });
 return {removalDisplay:'rows',rows,removed:(previous.lines||[]).filter((_,i)=>!used.has(i)).map(l=>({id:l.id,name:l.name,quantity:l.quantity,...(l.image?{image:l.image}:{}),...(l.isAddon?{isAddon:true}:{})}))};
}
export async function lastSentConfirmation(record,db){
 for(const h of [...(record.history||[])].reverse().filter(h=>h.type==='confirmation')){
 if(h.sentAt)return h.document?.workflow||null;
 const [[job]]=await db.execute("SELECT status FROM ku_enquiry_mail WHERE submission_id=? AND channel='customer' FOR UPDATE",[h.id]);
 if(job?.status==='sent')return h.document?.workflow||null;
 }return null;
}
