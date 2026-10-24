import {saleEstimate,saleModuleError} from '../public/sales-model.js';
import {normalizeBasket,rentalEstimate} from '../public/catalog-model.js';
import {rentalRateSets} from '../public/rental-pricing-model.js';
import {parseDateOnly,osloToday,validateRentalPeriod} from '../public/rental-dates.js';
const fail=message=>{throw Object.assign(Error(message),{status:400});};
export function validateDiscountCodes(input){
 if(!Array.isArray(input)||input.length>200)fail('Maks 200 rabattkoder.');
 const seen=new Set();return input.map(raw=>{
  if(!raw||typeof raw!=='object')fail('Ugyldig rabattkode.');
  const code=typeof raw.code==='string'?raw.code.trim().toUpperCase():'';
  if(!/^[A-Z0-9_-]{3,40}$/.test(code)||seen.has(code))fail('Bruk en unik kode med 3–40 bokstaver, tall, bindestrek eller understrek.');seen.add(code);
  if(!Number.isFinite(raw.percent)||raw.percent<1||raw.percent>100||Math.abs(Math.round(raw.percent*100)-raw.percent*100)>1e-7)fail('Rabatt må være 1–100 prosent, med maks to desimaler.');
  if(typeof raw.active!=='boolean'||!['rent','buy','both'].includes(raw.scope))fail('Velg status og hva rabattkoden gjelder.');
  const expires=raw.expires??'',note=raw.note??'';
  if(typeof expires!=='string'||expires&&parseDateOnly(expires)===null)fail('Ugyldig utløpsdato.');
  if(typeof note!=='string'||note.length>200)fail('Intern merknad kan ha maks 200 tegn.');
  return {code,percent:raw.percent,active:raw.active,scope:raw.scope,expires,note:note.trim()};
 });
}
export function discountQuote(input,products,codes,now=new Date()){
 if(!input||!['rent','buy'].includes(input.mode)||typeof input.code!=='string'||input.code.length>40)fail('Ugyldig rabattkode.');
 const code=input.code.trim().toUpperCase(),today=osloToday(now),coupon=codes.find(c=>c.code===code&&c.active&&(!c.expires||c.expires>=today)&&(c.scope==='both'||c.scope===input.mode));
 if(!coupon)fail('Rabattkoden er ugyldig, utløpt eller gjelder ikke dette valget.');
 const raw=input.basket;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length>500||Object.values(raw).some(q=>!Number.isInteger(q)||q<1||q>99))fail('Ugyldig produktvalg.');
 let quote;
 if(input.mode==='buy'){
  quote=saleEstimate(raw,products);if(Object.keys(raw).length!==Object.keys(quote.basket).length)fail('Et produkt kan ikke kjøpes lenger. Oppdater utvalget.');
  const error=saleModuleError(quote.basket,products);if(error)fail(error);
 }else{
  const active=products.filter(p=>p.active&&!p.deletedAt).map(p=>({...p,...rentalRateSets(p,products)[input.scope==='messe'?'messe':'standard']})),basket=normalizeBasket(raw,active);
  if(Object.keys(raw).length!==Object.keys(basket).length||Object.keys(raw).some(id=>raw[id]!==basket[id]))fail('Beholdningen er endret. Oppdater utvalget.');
  validateRentalPeriod(input.start,input.end,{now});
  quote=rentalEstimate(basket,active,input.start,input.end);
 }
 if(!Object.keys(raw).length||!quote.knownSubtotal)fail('Legg til prisede produkter og velg eventuell leieperiode først.');
 const subtotal=quote.knownSubtotal,discount=Math.round(subtotal*coupon.percent)/100;
 return {code,percent:coupon.percent,mode:input.mode,subtotal,discount,total:Math.round((subtotal-discount)*100)/100,hasUnpriced:quote.hasUnpriced};
}
