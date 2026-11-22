import {defaultTransportDates} from '../transport-weekdays.js?v=transportgroup20261122';
export {defaultTransportDates};

// Keep explicit transport dates when lease dates change; only move automatic defaults.
export function transportDatesAfterPeriodChange(previous,next){
 const before=defaultTransportDates(previous.start,previous.end),after=defaultTransportDates(next.start,next.end);
 return Object.fromEntries(['deliveryDate','pickupDate'].map(key=>[key,!next[key]||next[key]===before[key]?after[key]:next[key]]));
}
