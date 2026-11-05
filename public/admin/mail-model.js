export const mailLabels={pending:'Venter / forsøkes igjen',sending:'Sender',sent:'Sendt',uncertain:'Usikkert – avklar først',failed:'Mislyktes etter fem forsøk'};
export const needsAttention=row=>['failed','uncertain'].includes(row.status);
export function groupMail(messages,{query='',status='all'}={}){
 const groups=new Map();
 for(const row of messages){if(!groups.has(row.reference))groups.set(row.reference,{reference:row.reference,receivedAt:Number(row.receivedAt),channels:{}});groups.get(row.reference).channels[row.channel]=row;}
 return [...groups.values()].filter(g=>g.reference.toLowerCase().includes(query.trim().toLowerCase())&&(status==='all'||Object.values(g.channels).some(r=>status==='attention'?needsAttention(r):r.status===status)))
 .sort((a,b)=>Number(Object.values(b.channels).some(needsAttention))-Number(Object.values(a.channels).some(needsAttention))||b.receivedAt-a.receivedAt||a.reference.localeCompare(b.reference));
}
