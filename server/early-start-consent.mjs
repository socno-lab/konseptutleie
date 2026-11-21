export const earlyStartConsentText='Jeg ber om at leien og eventuell levering starter før angrefristen på 14 dager er utløpt. Jeg forstår at dersom jeg benytter angreretten etter oppstart, må jeg betale forholdsmessig for det som er levert, og at angreretten bortfaller når tjenesten er fullt levert.';
const day=86400000;
const iso=d=>d.toISOString().slice(0,10);
function easter(year){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),date=(h+l-7*m+114)%31+1;return Date.UTC(year,month-1,date);}
export function earlyStartRequirement(record,now=new Date()){
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now),start=record.deliveryDate||record.start;
 const deadline=new Date(Date.parse(today)+14*day);
 const isHoliday=date=>{const year=date.getUTCFullYear(),sunday=easter(year);
 const holidays=new Set([`${year}-01-01`,`${year}-05-01`,`${year}-05-17`,`${year}-12-25`,`${year}-12-26`,...[-3,-2,0,1,39,49,50].map(offset=>iso(new Date(sunday+offset*day)))]);
 return holidays.has(iso(date));};
 while([0,6].includes(deadline.getUTCDay())||isHoliday(deadline))deadline.setUTCDate(deadline.getUTCDate()+1);
 return {required:record.customerType!=='business'&&!!start&&start>=today&&start<=iso(deadline),text:earlyStartConsentText,start,deadline:iso(deadline)};
}
export function consentSummary(consent){return consent?`Tidlig oppstart fra ${consent.deliveryDate}, godkjent ${consent.at}: ${consent.text}`:'';}
