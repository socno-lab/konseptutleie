import {scopeForPurpose} from './rental-pricing-model.js?v=launch20261024';
export const rentalUsageLabels={standard:'Boligfoto og visning',messe:'Arrangementer og annen bruk'};
export const rentalUsageDescriptions={standard:'Til styling av bolig før fotografering og visning.',messe:'Til selskap, messe, arbeidsplassen eller daglig bruk.'};
export const rentalUsageExplanation='Prisen tar hensyn til bruk og forventet slitasje.';
export function rentalUsageState({purpose='alle',explicit,saved}={}){
 if(purpose!=='alle')return {scope:scopeForPurpose(purpose),confirmed:true};
 const scope=[explicit,saved].find(x=>x==='standard'||x==='messe');
 return {scope:scope||'messe',confirmed:Boolean(scope)};
}
