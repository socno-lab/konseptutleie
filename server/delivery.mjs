export const warehouse='Segelckes vei 15, 2010 Strømmen, Norge';
import {deliveryRates,deliveryPrice,requiresTwoPeople} from '../public/delivery-model.js';
export {deliveryRates,deliveryPrice,requiresTwoPeople};
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function createDeliveryEstimator(env,fetcher=fetch){
 const key=env.GOOGLE_MAPS_API_KEY?.trim(),buckets=new Map();let windowStart=Date.now(),calls=0;
 return {enabled:!!key,async estimate(input,client='shared',products=[]){
  if(!key)fail('Frakt beregnes i tilbudet. Du kan sende forespørselen uten fraktestimat.',503);
  if(!input||typeof input.address!=='string'||input.address.length<8||input.address.length>300||!/[0-9]{4}/.test(input.address)||/[\r\n\x00-\x1f]/.test(input.address)||![1,2].includes(input.visits))fail('Oppgi gateadresse, postnummer og sted.');
  const basket=input.basket||{};if(!basket||typeof basket!=='object'||Array.isArray(basket)||Object.keys(basket).length>500||Object.entries(basket).some(([id,q])=>!Number.isInteger(q)||q<1||q>99||!products.some(p=>p.id===id&&p.active&&!p.deletedAt&&p.rentalEnabled!==false)))fail('Produktutvalget er endret. Oppdater siden før du beregner frakt.');
  const twoPeople=input.twoPeople===true||requiresTwoPeople(basket,products);
  const now=Date.now();if(now-windowStart>=3600000){windowStart=now;calls=0;buckets.clear();}
  const attempts=buckets.get(client)||0;
  if(calls>=200||attempts>=20)fail('For mange fraktberegninger. Vi kan beregne frakten i tilbudet.',429);
  calls++;if(buckets.size<1000||buckets.has(client))buckets.set(client,attempts+1);
  let response;try{response=await fetcher('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.legs.duration'},body:JSON.stringify({origin:{address:warehouse},destination:{address:warehouse},intermediates:[{address:input.address.trim()+', Norge'}],travelMode:'DRIVE',routingPreference:'TRAFFIC_UNAWARE',computeAlternativeRoutes:false,languageCode:'nb-NO',units:'METRIC'}),signal:AbortSignal.timeout(10000)});}catch{fail('Kunne ikke beregne kjøreruten nå. Frakt avklares i tilbudet.',503);}
  if(!response.ok)fail('Kunne ikke beregne kjøreruten nå. Frakt avklares i tilbudet.',503);
  let data;try{data=await response.json();}catch{fail('Kunne ikke lese kjøreruten. Frakt avklares i tilbudet.',503);}
  const route=data.routes?.[0];if(!route||!Array.isArray(route.legs)||route.legs.length!==2)fail('Fant ikke en sikker kjørerute. Kontroller adressen, eller be om frakt i tilbudet.',422);
  const durations=route.legs.map(leg=>typeof leg.duration==='string'&&/^\d+(?:\.\d{1,9})?s$/.test(leg.duration)?Number(leg.duration.slice(0,-1)):NaN);
  if(durations.some(n=>!Number.isFinite(n)||n<0))fail('Fant ikke beregnet kjøretid. Frakt avklares i tilbudet.',422);
  return {...deliveryPrice(durations[0],input.visits,twoPeople),rates:deliveryRates,warehouse};
 }};
}
