// Keep the catalog introduction aligned with its purpose, including client-side switches.
export const decorHeading='Dekor til møbelleveranser og styling';
export function catalogIntroHtml(purpose='alle',category=''){
 if(category==='Dekor')return 'Fortell oss om anledningen og uttrykket du ønsker. En stylist setter sammen et forslag til dekor som passer møblene og rommet.';
 return purpose==='boligsalg'
  ? 'Fra ett møbel til et helhetlig uttrykk.<br>Finn det du mangler til boligfoto og visning.'
  : 'Fra ett barbord til en hel lounge.<br>Velg møblene, så tar vi detaljene sammen.';
}
