import {parseDateOnly} from '../rental-dates.js?v=launch20261024';
const kr=n=>new Intl.NumberFormat('nb-NO',{style:'currency',currency:'NOK'}).format(n);
const longDate=(s,weekday=false)=>parseDateOnly(s)!==null?new Intl.DateTimeFormat('nb-NO',{timeZone:'UTC',day:'numeric',month:'long',...(weekday?{weekday:'long'}:{})}).format(new Date(s+'T12:00:00Z')):'Ikke avtalt';
export function workflowCopy(r){
 const alternatives=r.lines.filter(l=>l.originalId&&l.originalId!==l.id);
 const alternativeText=alternatives.map(l=>{const saving=l.originalQuantity===l.quantity&&l.originalTotal!=null&&l.total!=null?l.originalTotal-l.total:0;return (l.originalMissing?`Av ${l.originalName} har vi dessverre ikke ønsket antall tilgjengelig. Vi kan imidlertid tilby ${l.name}, ${l.quantity} stk., som alternativ.`:`Vi tilbyr ${l.name} (${l.quantity} stk.) som alternativ til ${l.originalName}.`)+(saving>0?` Dette alternativet er også ${kr(saving)} rimeligere enn det du opprinnelig valgte.`:'');});
 const availabilityText=r.lines.every(l=>['ok','alternative'].includes(l.review))?(alternatives.some(l=>l.originalMissing)?`Vi har gått gjennom ønskelisten din og kan bekrefte at vi har de øvrige produktene tilgjengelig, med ${alternatives.filter(l=>l.originalMissing).length===1?'ett unntak':'noen unntak'}.`:alternatives.length?'':'Vi har gått gjennom ønskelisten din og kan bekrefte at vi har alle produktene tilgjengelig.') :'';

 const period=r.start?.slice(0,7)===r.end?.slice(0,7)?`${Number(r.start?.slice(8))}.–${longDate(r.end)}`:`${longDate(r.start)}–${longDate(r.end)}`;
 const intro=!r.intro||r.intro==='Takk for forespørselen. Her er vårt tilbud.'?`Takk for hyggelig forespørsel om leie av møbler i perioden ${period}.`:r.intro;
 const day=s=>new Date(s+'T12:00:00Z').getUTCDay(),diff=(a,b)=>(Date.parse(b)-Date.parse(a))/86400000;
 const weekend=day(r.start)===6&&day(r.end)===0&&diff(r.start,r.end)===1&&day(r.deliveryDate)===5&&diff(r.deliveryDate,r.start)===1&&day(r.pickupDate)===1&&diff(r.end,r.pickupDate)===1;
 const logistics=r.logistics||`Vi utfører levering og henting på hverdager innenfor tidsrommet 08.00–12.00.\n\n${weekend?`Siden du ønsker å leie møblene i helgen ${period}, vil levering derfor skje ${longDate(r.deliveryDate,true)} og henting ${longDate(r.pickupDate,true)}. Dette medfører ingen ekstra kostnader, så du får disponere møblene gjennom hele helgen til samme pris.\n\n`:''}Vi ber om at du sørger for at vi har tilgang til boligen for både levering og henting innenfor det oppgitte tidsrommet.`;
 const payment=!r.payment||r.payment==='Faktura sendes på e-post med 7 dagers betalingsfrist.'?'Faktura sendes på e-post i forbindelse med levering, med 7 dagers betalingsfrist.':r.payment;
 return {confirmationIntro:r.confirmationIntro||`Takk for bestillingen. Vi bekrefter herved leie av møbler i perioden ${period}, i henhold til avtalt tilbud og oversikten nedenfor.`,intro:!r.intro||r.intro==='Takk for forespørselen. Her er vårt tilbud.'?[intro,availabilityText,...alternativeText].filter(Boolean).join('\n\n'):intro,logistics,payment};
}
