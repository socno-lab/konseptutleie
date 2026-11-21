import {defaultTransportDates} from './admin/transport-dates.js?v=adminprices20261121';
import {parseDateOnly,addDateDays} from './rental-dates.js?v=launch20261024';
export function plannedTransportDates({start='',end='',scope='standard',mode='delivery',deliveryDate='',pickupDate=''}={}){
 const weekdays=defaultTransportDates(start,end),event=scope==='messe';
 return {deliveryDate:deliveryDate||(event&&['delivery','deliveryOnly'].includes(mode)?start:weekdays.deliveryDate),pickupDate:pickupDate||(event&&['delivery','collectionOnly'].includes(mode)?end:weekdays.pickupDate)};
}
export function transportWeekdayPolicy(options){const dates=plannedTransportDates(options),keys=options.mode==='pickup'?[]:options.mode==='deliveryOnly'?['deliveryDate']:options.mode==='collectionOnly'?['pickupDate']:['deliveryDate','pickupDate'];const missing=keys.some(k=>parseDateOnly(dates[k])===null),weekend=keys.some(k=>{const n=parseDateOnly(dates[k]);return n!==null&&[0,6].includes(new Date(n).getUTCDay());});return {...dates,manual:missing||weekend,weekend,reason:weekend?'weekend':missing?'dates':null};}

const isWeekend=value=>[0,6].includes(new Date(parseDateOnly(value)).getUTCDay());
export function transportDateLimits({start,end,scope='standard'}){
 if(parseDateOnly(start)===null||parseDateOnly(end)===null)return null;
 let first=addDateDays(start,-1),last=addDateDays(end,1);while(isWeekend(first))first=addDateDays(first,-1);while(isWeekend(last))last=addDateDays(last,1);
 return {deliveryDate:{min:first,max:start},pickupDate:{min:end,max:last}};
}
export function transportDateError(options){
 const limits=transportDateLimits(options);if(!limits)return '';
 const dates=plannedTransportDates(options);
 for(const key of ['deliveryDate','pickupDate']){const value=dates[key];if(parseDateOnly(value)===null)return 'Velg gyldige transportdatoer.';if(value<limits[key].min||value>limits[key].max)return 'Levering må være mellom nærmeste virkedag før leieperioden og første leiedag. Henting må være mellom siste leiedag og nærmeste virkedag etter. Større avvik avtales i kommentarfeltet.';}
 return '';
}
