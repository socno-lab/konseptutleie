import {createHmac,randomBytes} from 'node:crypto';
import {deliveryRates,deliveryPrice,requiresTwoPeople,rentalDeliveryCapacity} from '../public/delivery-model.js';
export const warehouse='Segelckes vei 15, 2010 Strømmen, Norge';
export {deliveryRates,deliveryPrice,requiresTwoPeople,rentalDeliveryCapacity};
export const deliveryCallLimits=Object.freeze([{name:'minute',ms:60000,max:10},{name:'hour',ms:3600000,max:100},{name:'day',ms:86400000,max:500}]);
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const limited=()=>fail('Fraktberegning er midlertidig begrenset. Frakten avklares i tilbudet.',429);
export function createDeliveryEstimator(env,fetcher=fetch,options={}){
 const key=env.GOOGLE_MAPS_API_KEY?.trim(),buckets=new Map(),usage=new Map(),quotes=new Map(),pending=new Map(),salt=randomBytes(32),clock=options.now||Date.now;
 let active=0;
 const remember=(id,value)=>{if(quotes.size>=500)quotes.delete(quotes.keys().next().value);quotes.set(id,value);};
 async function tariff(address,id,client){
  const now=clock(),cached=quotes.get(id);
  if(cached&&cached.until>now){if(cached.error)fail(cached.error,cached.status);return cached.tariff;}
  if(pending.has(id))return pending.get(id);
  if(active>=4)limited();
  if(buckets.size>1000)for(const [name,bucket] of buckets)if(bucket.until<=now)buckets.delete(name);
  const bucket=buckets.get(client),attempts=bucket?.until>now?bucket.count:0;
  if(attempts>=20||(!bucket&&buckets.size>=1000))limited();
  for(const limit of deliveryCallLimits){const item=usage.get(limit.name);if(item?.period===Math.floor(now/limit.ms)&&item.count>=limit.max)limited();}
  for(const limit of deliveryCallLimits){const period=Math.floor(now/limit.ms),item=usage.get(limit.name);usage.set(limit.name,{period,count:item?.period===period?item.count+1:1});}
  buckets.set(client,{count:attempts+1,until:bucket?.until>now?bucket.until:now+3600000});active++;
  const work=Promise.resolve().then(async()=>{
   try{
    if(options.reserve&&!(await options.reserve(now)))limited();
    let response;try{response=await fetcher('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'routes.legs.duration'},body:JSON.stringify({origin:{address:warehouse},destination:{address:warehouse},intermediates:[{address:address+', Norge'}],travelMode:'DRIVE',routingPreference:'TRAFFIC_UNAWARE',computeAlternativeRoutes:false,languageCode:'nb-NO',units:'METRIC'}),signal:AbortSignal.timeout(10000)});}catch{fail('Kunne ikke beregne kjøreruten nå. Frakt avklares i tilbudet.',503);}
    if(!response.ok)fail('Kunne ikke beregne kjøreruten nå. Frakt avklares i tilbudet.',503);
    let data;try{data=await response.json();}catch{fail('Kunne ikke lese kjøreruten. Frakt avklares i tilbudet.',503);}
    const route=data.routes?.[0];if(!route||!Array.isArray(route.legs)||route.legs.length!==2)fail('Fant ikke en sikker kjørerute. Kontroller adressen, eller be om frakt i tilbudet.',422);
    const durations=route.legs.map(leg=>typeof leg.duration==='string'&&/^\d+(?:\.\d{1,9})?s$/.test(leg.duration)?Number(leg.duration.slice(0,-1)):NaN);
    if(durations.some(n=>!Number.isFinite(n)||n<0))fail('Fant ikke beregnet kjøretid. Frakt avklares i tilbudet.',422);
    const one=deliveryPrice(durations[0],1),two=deliveryPrice(durations[0],1,true);
    // Cache only our own price offer, never Google route data, duration or addresses.
    const result={manual:one.manual,prices:one.manual?null:{onePerson:one.total,twoPeople:two.total}};
    remember(id,{until:clock()+600000,tariff:result});return result;
   }catch(error){remember(id,{until:clock()+30000,error:error.status?error.message:'Frakt avklares i tilbudet.',status:error.status||503});if(!error.status)fail('Frakt avklares i tilbudet.',503);throw error;
   }finally{active--;pending.delete(id);}
  });pending.set(id,work);return work;
 }
 return {enabled:!!key,async estimate(input,client='shared',products=[]){
  if(!input||typeof input.address!=='string'||input.address.length<8||input.address.length>300||!/[0-9]{4}/.test(input.address)||/[\r\n\x00-\x1f]/.test(input.address)||![1,2].includes(input.visits))fail('Oppgi gateadresse, postnummer og sted.');
  const basket=input.basket||{};if(!basket||typeof basket!=='object'||Array.isArray(basket)||Object.keys(basket).length>500||Object.entries(basket).some(([id,q])=>!Number.isInteger(q)||q<1||q>99||!products.some(p=>p.id===id&&p.active&&!p.deletedAt&&p.rentalEnabled!==false)))fail('Produktutvalget er endret. Oppdater siden før du beregner frakt.');
  const capacity=rentalDeliveryCapacity(basket,products);
  if(capacity.manual)return {manual:true,reason:capacity.reason,capacity,prices:null,crew:requiresTwoPeople(basket,products)?2:1,visits:input.visits,estimated:true,vatIncluded:true};
  if(!key)fail('Frakt beregnes i tilbudet. Du kan sende forespørselen uten fraktestimat.',503);
  const address=input.address.normalize('NFKC').trim().replace(/[\s,]+/g,' '),id=createHmac('sha256',salt).update(address.toLocaleLowerCase('nb-NO')).digest('hex');
  const offer=await tariff(address,id,client),crew=requiresTwoPeople(basket,products)?2:1,perVisit=offer.manual?undefined:offer.prices[crew===2?'twoPeople':'onePerson'];
  return {...offer,crew,visits:input.visits,...(offer.manual?{}:{perVisit,total:perVisit*input.visits}),vatIncluded:true,estimated:true,rates:deliveryRates,warehouse};
 }};
}
