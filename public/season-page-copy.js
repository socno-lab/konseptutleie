// Shared presentation copy for the Fest og sesong landing page.
export const seasonDescription='Borddekking, styling, møbler og dekor til konfirmasjon, bryllup og fest. Tilpassede tjenester prises etter tilbud. Levering på Østlandet og henting på Strømmen.';
export function seasonPageCopy(page){
 if(page.id!=='bryllup'||page.area!=='fest')return page;
 const faq=[...page.faq];
 const answers=[
  {question:'Hvordan prises borddekking, styling og tilpassede oppsett?',answer:'Pris gis i et uforpliktende tilbud ut fra anledningen, antall gjester, ønsket innhold og omfang. Tilgjengelighet og eventuell transport bekreftes før du godkjenner avtalen.'},
  {question:'Har enkeltproduktene fastpris?',answer:'Ja. Enkeltprodukter med oppgitt pris har faste leiesatser for valgt bruk og periode. Velg bruksområde, antall, eventuelle tilvalg og datoer for å beregne leiesummen på nett før du sender forespørselen.'},
  {question:'Hvor leverer dere til selskap og fest?',answer:'Vi leverer ferdig monterte møbler, servise og dekor i Oslo, Lillestrøm og på hele Østlandet. Ved større oppdrag kan vi levere til nesten hele Norge etter avtale. Du kan også hente og returnere selv i Segelckes vei 15, 2010 Strømmen etter avtale. Transport prises separat i tilbudet.'},
  {question:'Må servise og glass vaskes før retur?',answer:'Ja. Servise, bestikk og glass skal returneres vasket.'}
 ];
 for(const entry of answers){const index=faq.findIndex(q=>q.question===entry.question);if(index<0)faq.push(entry);else faq[index]=entry;}
 return {...page,intro:[page.intro,'Vi setter sammen borddekking, møbler og dekor til konfirmasjon, dåp, bryllup, jubileum, sommerfest, hagefest, julebord og andre feiringer. Pris gis i et uforpliktende tilbud, tilpasset anledningen, antall gjester og ønsket omfang.'].filter(Boolean).join(' '),note:'Borddekking, styling og tilpassede oppsett prises etter tilbud. Enkeltprodukter med oppgitt pris har faste leiesatser.',text:'Vi leverer ferdig monterte møbler, servise og dekor i Oslo, Lillestrøm og på hele Østlandet. Henting og retur på Strømmen kan avtales. Transport avklares i tilbudet.',sections:page.sections.map(s=>s.heading==='Temafest og feiring'?{...s,text:'Fra konfirmasjon, dåp og bryllup til jubileum, sommerfest, hagefest og julebord. Vi tilpasser styling, møbler og dekor til feiringen og gir pris etter tilbud.'}:s.category==='Enkeltprodukter'?{...s,text:'Velg enkeltmøbler, servise og dekor selv. Enkeltprodukter med oppgitt pris har faste leiesatser. Velg bruk, antall og datoer for å beregne leiesummen på nett.'}:s),faq};
}
