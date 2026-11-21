import {warehouseAddress,customerVisits} from './transport-model.js';
import {parseDateOnly} from '../rental-dates.js?v=launch20261024';
const kr=n=>new Intl.NumberFormat('nb-NO',{maximumFractionDigits:2}).format(n)+' kr';
const longDate=(s,weekday=false)=>parseDateOnly(s)!==null?new Intl.DateTimeFormat('nb-NO',{timeZone:'UTC',day:'numeric',month:'long',...(weekday?{weekday:'long'}:{})}).format(new Date(s+'T12:00:00Z')):'Ikke avtalt';
const legacyShortageIntro='Vi har gått gjennom ønskelisten din. Ett eller flere av produktene er dessverre ikke tilgjengelige i ønsket antall. Vi har foreslått alternativer i oversikten nedenfor.';
const offerPeriod=r=>parseDateOnly(r.start)===null||parseDateOnly(r.end)===null?'som avtales':r.start?.slice(0,7)===r.end?.slice(0,7)?`${Number(r.start?.slice(8))}.–${longDate(r.end)}`:`${longDate(r.start)}–${longDate(r.end)}`;
const alternativeParagraphs=alternatives=>alternatives.map(l=>{const saving=l.originalQuantity===l.quantity&&l.originalTotal!=null&&l.total!=null?l.originalTotal-l.total:0;return (l.originalMissing?`Av ${l.originalName.replace(/, natur$/i,'')} har vi dessverre ikke ønsket antall tilgjengelig. Som alternativ kan vi tilby ${l.name} (${l.quantity} stk.).`:`Vi tilbyr ${l.name} (${l.quantity} stk.) som alternativ til ${l.originalName}.`)+(saving>0?` Dette alternativet er også ${kr(saving)} rimeligere enn det du opprinnelig valgte.`:'');});
export function isLegacyGeneratedOfferIntro(r,value=r.intro){
 if(typeof value!=='string'||!value.trim())return false;
 const normalize=text=>text.trim().replace(/\s+/g,' '),sources=[r,...(r.history||[]).filter(h=>h.type==='offer').map(h=>h.document?.workflow).filter(Boolean)];
 return sources.some(source=>{const alternatives=(source.lines||[]).filter(l=>l.originalId&&l.originalId!==l.id);if(!alternatives.some(l=>l.originalMissing))return false;const candidate=[`Takk for hyggelig forespørsel om leie av møbler i perioden ${offerPeriod(source)}.`,legacyShortageIntro,...alternativeParagraphs(alternatives)].join('\n\n');return normalize(candidate)===normalize(value);});
}
export function workflowCopy(r){
 const alternatives=r.lines.filter(l=>l.originalId&&l.originalId!==l.id);
 const alternativeText=alternativeParagraphs(alternatives);
 const shortages=alternatives.filter(l=>l.originalMissing);
 const checked=r.lines.length>0&&r.lines.every(l=>['ok','alternative'].includes(l.review)||(l.review==='missing'&&l.originalMissing&&l.originalId&&l.originalId!==l.id));
 const availabilityText=shortages.length?(checked&&r.lines.length>shortages.length?`Vi har gått gjennom ønskelisten din og kan bekrefte at vi har alle produktene tilgjengelig, ${shortages.length===1?'med ett lite unntak':'med noen få unntak'}.`:legacyShortageIntro):checked&&!alternatives.length?'Vi har gått gjennom ønskelisten din og kan bekrefte at vi har alle produktene tilgjengelig.':'';

 const period=offerPeriod(r);
 const intro=!r.intro||r.intro==='Takk for forespørselen. Her er vårt tilbud.'?`Takk for hyggelig forespørsel om leie av møbler i perioden ${period}.`:r.intro;
 const day=s=>new Date(s+'T12:00:00Z').getUTCDay(),diff=(a,b)=>(Date.parse(b)-Date.parse(a))/86400000;
 const weekend=day(r.start)===6&&day(r.end)===0&&diff(r.start,r.end)===1&&day(r.deliveryDate)===5&&diff(r.deliveryDate,r.start)===1&&day(r.pickupDate)===1&&diff(r.end,r.pickupDate)===1;
 const logistics=r.logistics||((r.deliveryMode==='pickup')?`Møblene hentes og returneres av kunden på ${warehouseAddress}. ${r.pickupTime&&r.returnTime?'Avtalte klokkeslett fremgår av oversikten ovenfor.':'Velg ledig hente- og returtid når du aksepterer tilbudet.'} Tidsbestilling er på hverdager mellom 08.00 og 15.45.`:customerVisits(r).length?`Vi utfører ${r.deliveryMode==='deliveryOnly'?'levering':'henting'} på hverdager innenfor tidsrommet 08.00–12.00. ${r.deliveryMode==='deliveryOnly'?'Kunden returnerer':'Kunden henter'} selv på ${warehouseAddress}, til valgt tidspunkt mellom 08.00 og 15.45.`:`Vi utfører levering og henting på hverdager innenfor tidsrommet 08.00–12.00.\n\n${weekend?`Siden du ønsker å leie møblene i helgen ${period}, vil levering derfor skje ${longDate(r.deliveryDate,true)} og henting ${longDate(r.pickupDate,true)}. Dette medfører ingen ekstra kostnader, så du får disponere møblene gjennom hele helgen til samme pris.\n\n`:''}Vi ber om at du sørger for at vi har tilgang til boligen for både levering og henting innenfor det oppgitte tidsrommet.`);
 const payment=!r.payment||['Faktura sendes på e-post med 7 dagers betalingsfrist.','Faktura sendes på e-post i forbindelse med levering, med 7 dagers betalingsfrist.'].includes(r.payment)?`Faktura sendes på e-post i forbindelse med ${r.deliveryMode==='pickup'?'uthenting':'levering'}, med 7 dagers betalingsfrist.`:r.payment;
 return {confirmationIntro:r.confirmationIntro||`Takk for bestillingen. Vi bekrefter herved leie av møbler i perioden ${period}, i henhold til avtalt tilbud og oversikten nedenfor.`,intro:!r.intro||r.intro==='Takk for forespørselen. Her er vårt tilbud.'?[intro,availabilityText,...alternativeText].filter(Boolean).join('\n\n'):intro,logistics,payment};
}
