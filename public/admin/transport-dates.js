import {parseDateOnly,addDateDays} from '../rental-dates.js?v=launch20261024';

// Weekend rental boundaries use the preceding Friday and following Monday for transport.
export function defaultTransportDates(start,end){
 const first=parseDateOnly(start),last=parseDateOnly(end);
 const startDay=first===null?null:new Date(first).getUTCDay(),endDay=last===null?null:new Date(last).getUTCDay();
 return {deliveryDate:startDay===6?addDateDays(start,-1):startDay===0?addDateDays(start,-2):start||'',pickupDate:endDay===6?addDateDays(end,2):endDay===0?addDateDays(end,1):end||''};
}
