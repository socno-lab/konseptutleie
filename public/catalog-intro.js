// Keep the catalog introduction aligned with its purpose, including client-side switches.
export function catalogIntroHtml(purpose='alle'){
 return purpose==='boligsalg'
  ? 'Fra ett møbel til et helhetlig uttrykk.<br>Finn det du mangler til boligfoto og visning.'
  : 'Fra ett barbord til en hel lounge.<br>Velg møblene, så tar vi detaljene sammen.';
}
