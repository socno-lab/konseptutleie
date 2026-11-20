import {parseDateOnly,osloToday} from '../public/rental-dates.js';
import {customerVisits} from '../public/admin/transport-model.js';
const fail=message=>{throw Object.assign(Error(message),{status:409});};
export const pickupSlots=Array.from({length:32},(_,i)=>`${String(8+Math.floor(i/4)).padStart(2,'0')}:${String(i%4*15).padStart(2,'0')}`);
export function availableSlots(records,date,exclude,now=new Date()){
 const time=parseDateOnly(date);if(time===null||[0,6].includes(new Date(time).getUTCDay())||date<osloToday(now))return [];
 const currentTime=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Oslo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now);
 const occupied=new Set(records.filter(r=>r.id!==exclude&&r.status!=='cancelled').flatMap(r=>r.appointments||[]).filter(a=>a.date===date).map(a=>a.time));
 return pickupSlots.filter(t=>!occupied.has(t)&&(date!==osloToday(now)||t>currentTime));
}
export function scheduleAppointments(r,records,{required=true,now=new Date()}={}){
 const visits=customerVisits(r),result=[];
 for(const visit of visits){const time=r[visit.field];if(!time){if(required)fail('Velg klokkeslett for uthenting og retur på Strømmen.');continue;}if(!(r.appointments||[]).some(a=>a.date===visit.date&&a.time===time)&&!availableSlots(records,visit.date,r.id,now).includes(time))fail('Valgt hente- eller returtid er opptatt eller utenfor hverdager 08.00–15.45. Velg en annen tid.');result.push({date:visit.date,time,kind:visit.field});}
 if(result.length===2&&result[0].date===result[1].date&&result[1].time<=result[0].time)fail('Returtid må være etter hentetid.');
 return result;
}
