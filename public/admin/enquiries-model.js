export const enquiryTabs=[['new','Nye henvendelser'],['accepted','Godkjente tilbud'],['active','Aktive leieforhold'],['closed','Avsluttet leieforhold']];
export const osloToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function enquiryGroup(record,today=osloToday()){
 if(record.status==='cancelled')return 'closed';
 if(record.status==='confirmed')return (record.reservation?.end||record.pickupDate||record.end)<today?'closed':'active';
 return record.status==='accepted'?'accepted':'new';
}
export function closedLabel(record){return record.status==='cancelled'&&!record.history?.some(h=>h.type==='confirmation')?'Avsluttet uten bestilling':'Avsluttet leieforhold';}
