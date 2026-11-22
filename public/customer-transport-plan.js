import {plannedTransportDates} from './transport-weekdays.js?v=transportgroup20261122';
import {parseDateOnly} from './rental-dates.js?v=launch20261024';
const weekend=value=>{const day=parseDateOnly(value);return day!==null&&[0,6].includes(new Date(day).getUTCDay());};
export function customerTransportPlan(options){
 const event=options.scope==='messe',deliveryRequired=event&&weekend(options.start),collectionRequired=event&&weekend(options.end);
 const allowedModes=['pickup','delivery','deliveryOnly','collectionOnly','undecided'].filter(mode=>(!deliveryRequired||['delivery','deliveryOnly'].includes(mode))&&(!collectionRequired||['delivery','collectionOnly'].includes(mode)));
 return {...plannedTransportDates({...options,deliveryDate:'',pickupDate:''}),allowedModes,deliveryRequired,collectionRequired};
}
export function customerTransportError(options){
 const plan=customerTransportPlan(options);if(options.mode==='undecided'&&plan.allowedModes.includes('undecided'))return '';
 if(!plan.allowedModes.includes(options.mode))return 'Valgt transportalternativ er ikke tilgjengelig for leieperioden. Helgebesøk utføres av oss eller vår transportør.';
 if(['deliveryDate','pickupDate'].some(key=>options[key]&&options[key]!==plan[key]))return 'Transportdatoene må følge de foreslåtte datoene. Skriv ønskede avvik i kommentarfeltet, så avtaler vi dem i tilbudet.';
 return '';
}
