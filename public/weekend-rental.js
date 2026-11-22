import {plannedTransportDates} from './transport-weekdays.js?v=purposeinline20261122';
import {parseDateOnly,addDateDays} from './rental-dates.js?v=launch20261024';
export function weekendRentalEnd(options){
 const {start,end}=options,n=parseDateOnly(start);if(n===null||start!==end)return end;
 const day=new Date(n).getUTCDay();if(![0,6].includes(day))return end;
 const dates=plannedTransportDates(options),friday=addDateDays(start,day===6?-1:-2),monday=addDateDays(start,day===6?2:1);
 return dates.deliveryDate<=friday&&dates.pickupDate>=monday?addDateDays(end,1):end;
}
