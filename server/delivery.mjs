export const warehouse='Segelckes vei 15, 2010 Strømmen, Norge';
export const deliveryRates=Object.freeze({basePerVisit:790,perKm:20,vatIncluded:true});
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function deliveryPrice(roundTripMeters,visits){
 if(!Number.isFinite(roundTripMeters)||roundTripMeters<0||roundTripMeters>300000||![1,2].includes(visits))fail('Denne transporten må prises i tilbudet.');
 const drivenKm=Math.round(roundTripMeters*visits/100)/10;
 return {visits,drivenKm,base:deliveryRates.basePerVisit*visits,distancePrice:Math.round(roundTripMeters*visits/1000*deliveryRates.perKm),total:Math.round(deliveryRates.basePerVisit*visits+roundTripMeters*visits/1000*deliveryRates.perKm),vatIncluded:true,estimated:true};
}
export function createDeliveryEstimator(env,fetcher=fetch){
 const key=env.GOOGLE_MAPS_API_KEY?.trim(),buckets=new Map();let windowStart=Date.now(),calls=0;
 return {enabled:!!key,async estimate(input,client='shared'){
  if(!key)fail('Frakt beregnes i tilbudet. Du kan sende forespørselen uten fraktestimat.',503);
  if(!input||typeof input.address!=='string'||input.address.length<8||input.address.length>300||!/[0-9]{4}/.test(input.address)||/[\r\n\x00-\x1f]/.test(input.address)||![1,2].includes(input.visits))fail('Oppgi gateadresse, postnummer og sted.');
  const now=Date.now();if(now-windowStart>=3600000){windowStart=now;calls=0;buckets.clear();}
  const attempts=buckets.get(client)||0;
  if(calls>=200||attempts>=20)fail('For mange fraktberegninger. Vi kan beregne frakten i tilbudet.',429);
  calls++;if(buckets.size<1000||buckets.has(client))buckets.set(client,attempts+1);
  let response;try{response=await fetcher('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.distanceMeters,routes.legs.distanceMeters'},body:JSON.stringify({origin:{address:warehouse},destination:{address:warehouse},intermediates:[{address:input.address.trim()+', Norge'}],travelMode:'DRIVE',routingPreference:'TRAFFIC_UNAWARE',computeAlternativeRoutes:false,languageCode:'nb-NO',units:'METRIC'}),signal:AbortSignal.timeout(10000)});}catch{fail('Kunne ikke beregne kjøreruten nå. Frakt avklares i tilbudet.',503);}
  if(!response.ok)fail('Kunne ikke beregne kjøreruten nå. Frakt avklares i tilbudet.',503);
  let data;try{data=await response.json();}catch{fail('Kunne ikke lese kjøreruten. Frakt avklares i tilbudet.',503);}
  const route=data.routes?.[0];if(!route||!Array.isArray(route.legs)||route.legs.length!==2||route.legs.some(leg=>!Number.isFinite(leg.distanceMeters)||leg.distanceMeters<0))fail('Fant ikke en sikker kjørerute. Kontroller adressen, eller be om frakt i tilbudet.',422);
  const meters=route.legs.reduce((sum,leg)=>sum+leg.distanceMeters,0);
  if(!Number.isFinite(route.distanceMeters)||Math.abs(meters-route.distanceMeters)>10)fail('Frakt må avklares i tilbudet.',422);
  return {...deliveryPrice(meters,input.visits),rates:deliveryRates,warehouse};
 }};
}
