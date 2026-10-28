import {purposes,validPurpose} from './rental-purpose-model.js?v=launch20261024';
import {scopeForPurpose,scopeForOccasion} from './rental-pricing-model.js?v=longrent20261026';
import {rentalUsageLabels} from './rental-usage-model.js?v=longrent20261026';

const validScope=value=>value==='standard'||value==='messe'?value:null;

// A proposal is inert: callers show its consequences before changing saved state.
// «Vis alle» is an assortment choice and must never invent a rental price basis.
export function proposedCatalogUsage({purpose='alle',scope,currentScope,confirmed=false,occasion='',hasItems=false}={}){
 const nextPurpose=validPurpose(purpose);
 const previousScope=validScope(currentScope);
 const nextScope=nextPurpose==='alle'
  ? validScope(scope)||(confirmed?previousScope:null)
  : scopeForPurpose(nextPurpose);
 const nextConfirmed=nextScope!==null;
 const scopeChanged=nextConfirmed&&previousScope!==null&&nextScope!==previousScope;
 const occasionConflict=nextConfirmed&&Boolean(occasion)&&scopeForOccasion(occasion)!==nextScope;
 const messages=[];
 if(!nextConfirmed)messages.push('Velg prisgrunnlag før leieprisene vises.');
 if(hasItems&&scopeChanged)messages.push(`Leieprisene for varene i forespørselen beregnes på nytt for ${rentalUsageLabels[nextScope].toLocaleLowerCase('nb-NO')}.`);
 if(hasItems)messages.push('Produkter, antall, tilvalg og leieperiode i forespørselen beholdes. Noen av varene kan være utenfor utvalget du velger å se.');
 if(occasionConflict)messages.push('Anledningen i forespørselen samsvarer ikke med det nye prisgrunnlaget. Den tømmes, slik at du kan velge en passende anledning.');
 return {purpose:nextPurpose,scope:nextScope,confirmed:nextConfirmed,scopeChanged,occasionConflict,requiresConfirmation:occasionConflict||Boolean(hasItems&&scopeChanged),messages};
}

export function catalogUsageLabel({purpose='alle',scope,confirmed=false}={}){
 const normalized=validPurpose(purpose);
 const label=purposes.find(item=>item.id===normalized).label;
 if(normalized!=='alle'&&confirmed&&scope===scopeForPurpose(normalized))return label;
 const basis=confirmed&&validScope(scope)?rentalUsageLabels[scope]:'Velg prisgrunnlag';
 return `${label} · Leiepriser: ${basis}`;
}
