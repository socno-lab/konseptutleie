import {defaultTransportDates} from './admin/transport-dates.js?v=adminprices20261121';
import {parseDateOnly} from './rental-dates.js?v=launch20261024';
export function plannedTransportDates({start='',end='',scope='standard',mode='delivery',deliveryDate='',pickupDate=''}={}){
 const weekdays=defaultTransportDates(start,end),event=scope==='messe';
 return {deliveryDate:deliveryDate||(event&&['delivery','deliveryOnly'].includes(mode)?start:weekdays.deliveryDate),pickupDate:pickupDate||(event&&['delivery','collectionOnly'].includes(mode)?end:weekdays.pickupDate)};
}
export function transportWeekdayPolicy(options){const dates=plannedTransportDates(options),keys=options.mode==='pickup'?[]:options.mode==='deliveryOnly'?['deliveryDate']:options.mode==='collectionOnly'?['pickupDate']:['deliveryDate','pickupDate'];const missing=keys.some(k=>parseDateOnly(dates[k])===null),weekend=keys.some(k=>{const n=parseDateOnly(dates[k]);return n!==null&&[0,6].includes(new Date(n).getUTCDay());});return {...dates,manual:missing||weekend,weekend,reason:weekend?'weekend':missing?'dates':null};}
