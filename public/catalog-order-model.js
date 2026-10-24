import {prioritizePackages} from './rental-purpose-model.js?v=launch20261024';
import {sortByPurposeOrder} from './purpose-order-model.js?v=catalogcontrols20261024a';

// isPackage describes a ready-made catalogue card, not every underlying product
// with components. Beds and tableware can therefore retain their normal place.
export function orderRentalCards(cards,purpose,category){
 if(!Array.isArray(cards))throw TypeError('Produktkort må være en liste.');
 const baseline=category==='Alle'
  ?[...cards.filter(card=>!card.isPackage),...cards.filter(card=>card.isPackage)]
  :purpose==='fest'&&category==='Pakker'?[...cards]:prioritizePackages(cards);
 // Explicit admin priorities and the Christmas fallback keep their precedence.
 return sortByPurposeOrder(baseline,purpose);
}
