// Editorial status only. Inventory, prices and requested dates stay independent.
const rentable = product => product && product.active !== false && !product.deletedAt && product.rentalEnabled !== false;
export const isRentedOut = product => rentable(product) && product.rentalRentedOut === true;

// Interchangeable sizes/colours must not label available alternatives as rented.
export function rentalGroupRentedOut(products) {
 const members = products.filter(rentable);
 return members.length > 0 && members.every(isRentedOut);
}

export function rentalSeriesRentedOut(products, selection) {
 const members = products.filter(rentable);
 const selected = selection && members.filter(product => selection[product.id] > 0);
 if (selected?.length) return selected.some(isRentedOut);
 const required = members.filter(product => product.moduleRequired);
 return required.length ? required.some(isRentedOut) : rentalGroupRentedOut(members);
}

export const rentalStatusBadge = rented => rented ? '<strong class="rental-status-badge" title="Utleid nå. Tilgjengelighet for ønsket periode må bekreftes.">UTLEID</strong>' : '';
export const rentalStatusNotice = rented => rented ? '<p class="rental-status-notice">Utleid nå. Tilgjengelighet for ønsket leieperiode må bekreftes i tilbudet.</p>' : '';
