export const enquiryTabs=[['new','Nye henvendelser'],['accepted','Godkjente tilbud'],['active','Aktive leieforhold'],['expired','Leieperiode utløpt'],['closed','Avsluttet leieforhold']];
export const osloToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function enquiryGroup(record,today=osloToday()){
 if(['cancelled','completed'].includes(record.status))return 'closed';
 if(record.status==='confirmed'){const confirmed=record.history?.filter(h=>h.type==='confirmation').at(-1)?.document?.workflow;return (confirmed?.end||record.end||record.reservation?.end||record.pickupDate)<today?'expired':'active';}
 return record.status==='accepted'?'accepted':'new';
}
export function closedLabel(record){return record.status==='cancelled'&&!record.history?.some(h=>h.type==='confirmation')?'Avsluttet uten bestilling':'Avsluttet leieforhold';}
