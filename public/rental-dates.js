// Date-only rental values use calendar days; Oslo is the business timezone.
export const MAX_RENTAL_DAYS=365;
const DAY=86400000;
const osloFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'});
export function parseDateOnly(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000-'))return null;
 const time=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===value?time:null;
}
export function osloToday(now=new Date()){
 const parts=Object.fromEntries(osloFormat.formatToParts(now).map(part=>[part.type,part.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
export function addDateDays(value,count){
 const time=parseDateOnly(value);if(time===null||!Number.isInteger(count))return '';
 const next=new Date(time+count*DAY);return Number.isFinite(next.getTime())?next.toISOString().slice(0,10):'';
}
export function rentalDayCount(start,end){
 const first=parseDateOnly(start),last=parseDateOnly(end);
 return first!==null&&last!==null&&last>=first?(last-first)/DAY+1:null;
}
export function validateRentalPeriod(start,end,{now=new Date(),today=osloToday(now),required=true}={}){
 const fail=message=>{throw Object.assign(Error(message),{status:400});};
 if(!required&&!start&&!end)return {start:'',end:'',days:null};
 const days=rentalDayCount(start,end);
 if(days===null||parseDateOnly(today)===null)fail('Velg en gyldig fra-dato og til-dato.');
 if(start<today)fail('Fra-dato kan ikke være før dagens dato. Velg leieperiode på nytt.');
 if(days>MAX_RENTAL_DAYS)fail('Leieperioden kan være maksimalt '+MAX_RENTAL_DAYS+' dager, inkludert fra- og til-dato.');
 return {start,end,days};
}
