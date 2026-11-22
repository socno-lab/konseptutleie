import {plannedTransportDates} from './transport-weekdays.js?v=purposemodal20261122';
import {parseDateOnly,addDateDays} from './rental-dates.js?v=launch20261024';
export function weekendRentalEnd(options){
 const {start,end}=options,n=parseDateOnly(start);if(n===null||start!==end)return end;
 const day=new Date(n).getUTCDay();if(![0,6].includes(day))return end;
 const dates=plannedTransportDates(options),friday=addDateDays(start,day===6?-1:-2),monday=addDateDays(start,day===6?2:1);
 return dates.deliveryDate<=friday&&dates.pickupDate>=monday?addDateDays(end,1):end;
}

// Event day hire in a weekend requires delivery and collection that same day.
export function weekendDayDeliveryRequired({start,end,scope}={}){
 const day=parseDateOnly(start);return scope==='messe'&&start===end&&day!==null&&[0,6].includes(new Date(day).getUTCDay());
}
