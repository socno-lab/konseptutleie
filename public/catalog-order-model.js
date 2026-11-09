import {prioritizePackages} from './rental-purpose-model.js?v=optionimages20261108';
import {sortByPurposeOrder} from './purpose-order-model.js?v=production20261107';

// isPackage describes a ready-made catalogue card, not every underlying product
// with components. Beds and tableware can therefore retain their normal place.
export function orderRentalCards(cards,purpose,category){
 if(!Array.isArray(cards))throw TypeError('Produktkort må være en liste.');
 const baseline=category==='Alle'
  ?[...cards.filter(card=>!card.isPackage),...cards.filter(card=>card.isPackage)]
  :purpose==='fest'&&category==='Pakker'?[...cards]:prioritizePackages(cards);
 // Explicit admin priorities and the Christmas fallback keep their precedence.
 const ordered=sortByPurposeOrder(baseline,purpose);
 // Messe visitors see the ready-made starting points before individual furniture.
 return purpose==='messe'&&category==='Alle'
  ? [...ordered.filter(card=>card.isPackage),...ordered.filter(card=>!card.isPackage)]
  : ordered;
}
