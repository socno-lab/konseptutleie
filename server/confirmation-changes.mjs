export function confirmationChanges(previous,current){
 if(!previous)return null;
 const summary=[],used=new Set(),rows=(current.lines||[]).map(line=>{
 let index=(previous.lines||[]).findIndex((old,i)=>!used.has(i)&&old.key!=null&&old.key===line.key);
 if(index<0)index=(previous.lines||[]).findIndex((old,i)=>!used.has(i)&&old.id===line.id);
 if(index<0){summary.push(`Vi har lagt til ${line.name} (${line.quantity} stk.).`);return [{label:'Ny',text:''}];}
 used.add(index);const old=previous.lines[index],changes=[];
 if(old.id!==line.id)summary.push(`Vi har byttet ${old.name} med ${line.name} (${line.quantity} stk.).`);
 if(old.id===line.id&&old.quantity!==line.quantity)summary.push(`Antallet av ${line.name} er endret fra ${old.quantity} til ${line.quantity} stk.`);
 if(old.id===line.id&&old.quantity===line.quantity&&old.total!==line.total)summary.push(`Leieprisen for ${line.name} er endret.`);
 if(old.id!==line.id)changes.push({label:'Byttet vare',text:'Erstatter '+old.name});
 if(old.quantity!==line.quantity)changes.push({label:'Endret antall',text:`${old.quantity} → ${line.quantity} stk.`});
 return changes;
 });
 const removed=(previous.lines||[]).filter((_,i)=>!used.has(i)).map(l=>({id:l.id,name:l.name,quantity:l.quantity,...(l.image?{image:l.image}:{}),...(l.isAddon?{isAddon:true}:{})}));
 for(const l of removed)summary.push(`${l.name} (${l.quantity} stk.) er fjernet.`);
 const date=v=>v?v.split('-').reverse().join('.'):'ikke avtalt';
 if(previous.start!==current.start||previous.end!==current.end)summary.push(`Leieperioden er endret til ${date(current.start)}–${date(current.end)}.`);
 for(const [key,label]of [['deliveryDate','Levering/uthenting'],['pickupDate','Henting/retur']])if(previous[key]!==current[key])summary.push(`${label} er endret til ${date(current[key])}.`);
 for(const [key,label]of [['deliveryAddress','Leverings-/henteadresse'],['deliveryMode','Leveringsmåte'],['transport','Transportpris'],['discount','Rabatt'],['pickupTime','Tidspunkt for uthenting'],['returnTime','Tidspunkt for retur'],['scope','Prisgrunnlag'],['payment','Betalingsvilkår'],['logistics','Praktiske avtaler'],['confirmationIntro','Innledning']])if((previous[key]??'')!==(current[key]??''))summary.push(`${label} er endret.`);
 const otherItemsUnchanged=removed.length>0&&(current.lines||[]).length>0&&rows.every(c=>!c.length)&&(current.lines||[]).every(l=>(previous.lines||[]).some(old=>old.id===l.id&&old.quantity===l.quantity&&old.total===l.total));
 return {removalDisplay:'rows',rows,removed,summary:summary.length?'Vi har oppdatert bestillingen: '+summary.join(' ')+(otherItemsUnchanged?' Øvrige varer er uendret.':''):''};
}
export async function lastSentConfirmation(record,db){
 for(const h of [...(record.history||[])].reverse().filter(h=>h.type==='confirmation')){
 if(h.sentAt)return h.document?.workflow||null;
 const [[job]]=await db.execute("SELECT status FROM ku_enquiry_mail WHERE submission_id=? AND channel='customer' FOR UPDATE",[h.id]);
 if(job?.status==='sent')return h.document?.workflow||null;
 }return null;
}
