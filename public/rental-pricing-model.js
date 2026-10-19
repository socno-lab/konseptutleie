// All reference prices and resulting rents include VAT. Acquisition cost stays private.
export const rentalFactors = {price: 0.07, weekPrice: 0.20, monthPrice: 0.35};
export const eventFactor = 1.5;
const keys = Object.keys(rentalFactors);
export const roundRental = value => Math.ceil((value - 1e-8) / 10) * 10;
export function rentalPricingMode(p) {
  if (p.rentalPricingMode) return p.rentalPricingMode;
  return !p.isPackage && !p.isService && !p.wallGroup && p.purchaseUnitPrice > 0 ? 'retail' : 'manual';
}
export function retailRentalRates(reference, scope = 'standard') {
  if (!Number.isFinite(reference) || reference <= 0) return {price: 0, weekPrice: 0, monthPrice: 0, priceOnRequest: true};
  const multiplier = scope === 'messe' ? eventFactor : 1;
  return {...Object.fromEntries(keys.map(key => [key, roundRental(reference * rentalFactors[key] * multiplier)])), priceOnRequest: false};
}
export function resolvedRentalRates(p, products = [], scope = 'standard') {
  const mode = rentalPricingMode(p);
  if (mode === 'retail') return retailRentalRates(p.purchaseUnitPrice, scope);
  if (mode === 'components') {
    const parts = (p.components || []).map(c => ({quantity: c.quantity, product: products.find(x => x.id === c.id && !x.isPackage && !x.deletedAt)}));
    if (!parts.length || parts.some(c => !c.product)) return retailRentalRates(null);
    const priced = parts.map(c => ({quantity: c.quantity, rates: resolvedRentalRates(c.product, products, scope)}));
    if (priced.some(c => c.rates.priceOnRequest)) return retailRentalRates(null);
    return {...Object.fromEntries(keys.map(key => [key, Math.round(priced.reduce((n, c) => n + c.quantity * c.rates[key], 0) * 100) / 100])), priceOnRequest: false};
  }
  const factor = scope === 'messe' && !p.isService && !p.isProposal ? eventFactor : 1;
  return {price: factor === 1 ? p.price : roundRental(p.price * factor), weekPrice: factor === 1 ? p.weekPrice : roundRental(p.weekPrice * factor), monthPrice: factor === 1 ? p.monthPrice : roundRental(p.monthPrice * factor), priceOnRequest: !!p.priceOnRequest};
}
export function rentalRateSets(p, products = []) {
  return {standard: resolvedRentalRates(p, products), messe: resolvedRentalRates(p, products, 'messe')};
}
export function applyRentalScope(products, scope) {
  return products.map(p => ({...p, ...(p.rentalRates?.[scope === 'messe' ? 'messe' : 'standard'] || {})}));
}
export function scopeForOccasion(value) {
  return ['Boligsalg', 'Boligfoto og visning'].includes(value) ? 'standard' : 'messe';
}
export function scopeForPurpose(purpose) {
  return purpose === 'boligsalg' ? 'standard' : 'messe';
}
