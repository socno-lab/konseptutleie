import {parseDateOnly,addDateDays} from '../rental-dates.js?v=launch20261024';

// Weekend rental boundaries use the preceding Friday and following Monday for transport.
export function defaultTransportDates(start,end){
 const first=parseDateOnly(start),last=parseDateOnly(end);
 const startDay=first===null?null:new Date(first).getUTCDay(),endDay=last===null?null:new Date(last).getUTCDay();
 return {deliveryDate:startDay===6?addDateDays(start,-1):startDay===0?addDateDays(start,-2):start||'',pickupDate:endDay===6?addDateDays(end,2):endDay===0?addDateDays(end,1):end||''};
}

// Keep explicit transport dates when lease dates change; only move automatic defaults.
export function transportDatesAfterPeriodChange(previous,next){
 const before=defaultTransportDates(previous.start,previous.end),after=defaultTransportDates(next.start,next.end);
 return Object.fromEntries(['deliveryDate','pickupDate'].map(key=>[key,!next[key]||next[key]===before[key]?after[key]:next[key]]));
}
